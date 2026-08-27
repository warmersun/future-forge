/**
 * Optional Clerk learner-account identity.
 * Off unless both publishable + secret keys are set. Missing tokens never
 * block play; invalid tokens are only rejected on GET /api/me and
 * POST /api/me/import, POST /api/me/runs.
 */

import { AsyncLocalStorage } from "node:async_hooks";
import { normalizeClerkUserId } from "./clerk-id.mjs";
import { CLOUD_PORTAL_ORIGIN } from "../cloud/portal-origin.js";
import { isGameSessionToken, verifyGameSessionToken } from "./game-session.mjs";

export { normalizeClerkUserId };

/** @typedef {{ enabled: boolean, publishableKey: string, secretKey: string }} ClerkKeys */
/** @typedef {{
 *   enabled: boolean,
 *   signedIn: boolean,
 *   userId: string|null,
 *   sessionId: string|null,
 *   missingToken?: boolean,
 *   invalidToken?: boolean,
 * }} ClerkIdentity */

const DEFAULT_AUTHORIZED_PARTIES = [
  "http://127.0.0.1:8765",
  "http://localhost:8765",
  "https://warmersun.com",
  CLOUD_PORTAL_ORIGIN,
];

/** @type {AsyncLocalStorage<{ userId?: string|null, sessionId?: string|null }>} */
const clerkAls = new AsyncLocalStorage();

/**
 * Compact JWT shape (three base64url segments, header starts with eyJ).
 * Used so Clerk session tokens are not mistaken for FF_API_SECRET / admin Bearer.
 * @param {unknown} token
 */
export function isJwtShaped(token) {
  if (typeof token !== "string") return false;
  const t = token.trim();
  return /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(t);
}

/**
 * @param {import('node:http').IncomingMessage|{ headers?: Record<string, unknown> }} req
 * @returns {string}
 */
export function extractBearerToken(req) {
  const auth = req?.headers?.authorization;
  if (typeof auth !== "string") return "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : "";
}

/**
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} [env]
 * @returns {ClerkKeys}
 */
export function clerkKeysFromEnv(env = process.env) {
  const publishableKey = String(
    env.CLERK_PUBLISHABLE_KEY || env.FF_CLERK_PUBLISHABLE_KEY || ""
  ).trim();
  const secretKey = String(
    env.CLERK_SECRET_KEY || env.FF_CLERK_SECRET_KEY || ""
  ).trim();
  return {
    enabled: Boolean(publishableKey && secretKey),
    publishableKey,
    secretKey,
  };
}

/**
 * Svix signing secret. Clerk Dashboard / `env pull` use
 * CLERK_WEBHOOK_SIGNING_SECRET; this repo's Render env is CLERK_WEBHOOK_SECRET.
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} [env]
 */
export function clerkWebhookSecretFromEnv(env = process.env) {
  return String(
    env.CLERK_WEBHOOK_SECRET || env.CLERK_WEBHOOK_SIGNING_SECRET || ""
  ).trim();
}

/**
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} [env]
 * @returns {string[]}
 */
export function authorizedPartiesFromEnv(env = process.env) {
  const raw = String(
    env.CLERK_AUTHORIZED_PARTIES || env.FF_CLERK_AUTHORIZED_PARTIES || ""
  ).trim();
  if (!raw) return [...DEFAULT_AUTHORIZED_PARTIES];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Public health fragment — never includes the secret key.
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} [env]
 */
export function publicClerkConfig(env = process.env) {
  const keys = clerkKeysFromEnv(env);
  if (!keys.enabled) return { enabled: false };
  return { enabled: true, publishableKey: keys.publishableKey };
}

/**
 * @param {{ userId?: string|null, sessionId?: string|null }} identity
 * @param {() => (any|Promise<any>)} fn
 */
export function runWithClerkIdentity(identity, fn) {
  return clerkAls.run(identity || {}, fn);
}

/** @returns {string|null} */
export function clerkUserIdFromContext() {
  return normalizeClerkUserId(clerkAls.getStore()?.userId);
}

/**
 * @param {import('node:http').IncomingMessage} req
 * @param {object} [opts]
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} [opts.env]
 * @param {(token: string, keys: ClerkKeys) => Promise<{ sub?: string, sid?: string, userId?: string, sessionId?: string }|null>} [opts.verify]
 * @returns {Promise<ClerkIdentity>}
 */
export async function authenticateClerkRequest(req, opts = {}) {
  const env = opts.env || process.env;
  const keys = clerkKeysFromEnv(env);
  if (!keys.enabled) {
    return {
      enabled: false,
      signedIn: false,
      userId: null,
      sessionId: null,
    };
  }

  const token = extractBearerToken(req);
  if (!token) {
    return {
      enabled: true,
      signedIn: false,
      userId: null,
      sessionId: null,
      missingToken: true,
    };
  }
  if (!isJwtShaped(token)) {
    return {
      enabled: true,
      signedIn: false,
      userId: null,
      sessionId: null,
      invalidToken: true,
    };
  }

  if (isGameSessionToken(token)) {
    try {
      const payload = verifyGameSessionToken(token, env);
      const userId = normalizeClerkUserId(payload?.sub);
      const sessionId = normalizeClerkUserId(payload?.sid);
      if (!userId) {
        return {
          enabled: true,
          signedIn: false,
          userId: null,
          sessionId: null,
          invalidToken: true,
        };
      }
      return {
        enabled: true,
        signedIn: true,
        userId,
        sessionId,
      };
    } catch {
      return {
        enabled: true,
        signedIn: false,
        userId: null,
        sessionId: null,
        invalidToken: true,
      };
    }
  }

  try {
    const payload = opts.verify
      ? await opts.verify(token, keys)
      : await defaultVerify(token, keys, env);
    const userId = normalizeClerkUserId(payload?.sub || payload?.userId);
    const sessionId = normalizeClerkUserId(payload?.sid || payload?.sessionId);
    if (!userId) {
      return {
        enabled: true,
        signedIn: false,
        userId: null,
        sessionId: null,
        invalidToken: true,
      };
    }
    return {
      enabled: true,
      signedIn: true,
      userId,
      sessionId,
    };
  } catch {
    return {
      enabled: true,
      signedIn: false,
      userId: null,
      sessionId: null,
      invalidToken: true,
    };
  }
}

/**
 * @param {string} token
 * @param {ClerkKeys} keys
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} env
 */
async function defaultVerify(token, keys, env) {
  const { verifyToken } = await import("@clerk/backend");
  return verifyToken(token, {
    secretKey: keys.secretKey,
    authorizedParties: authorizedPartiesFromEnv(env),
  });
}

const CLERK_PROVIDER_LABELS = {
  oauth_google: "Google",
  google: "Google",
  oauth_x: "X",
  x: "X",
  oauth_twitter: "X",
  twitter: "X",
  oauth_github: "GitHub",
  github: "GitHub",
};

/**
 * @param {unknown} provider
 */
export function clerkProviderLabel(provider) {
  const raw = String(provider || "")
    .trim()
    .toLowerCase();
  if (!raw) return "";
  if (CLERK_PROVIDER_LABELS[raw]) return CLERK_PROVIDER_LABELS[raw];
  const stripped = raw.replace(/^oauth_/, "");
  if (CLERK_PROVIDER_LABELS[stripped]) return CLERK_PROVIDER_LABELS[stripped];
  return stripped
    .split(/[_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Owner-only sign-in identity. Never legal names. Null if no usable email.
 * @param {object|null|undefined} user Clerk user from Backend API
 * @returns {{ email: string, providers: string[] }|null}
 */
export function summarizeClerkLogin(user) {
  if (!user || typeof user !== "object") return null;
  const emails = Array.isArray(user.emailAddresses) ? user.emailAddresses : [];
  const primaryId = user.primaryEmailAddressId;
  const primary =
    emails.find((e) => e && e.id === primaryId) || user.primaryEmailAddress || null;
  const email = String(
    primary?.emailAddress || emails[0]?.emailAddress || ""
  ).trim();
  if (!email || !email.includes("@")) return null;
  const accounts = Array.isArray(user.externalAccounts) ? user.externalAccounts : [];
  const providers = [];
  const seen = new Set();
  for (const acc of accounts) {
    const label = clerkProviderLabel(acc?.provider);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    providers.push(label);
  }
  return { email, providers };
}

/**
 * Live Clerk lookup for GET /api/me/profile. Fail soft (returns null).
 * @param {string} userId
 * @param {object} [opts]
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} [opts.env]
 * @param {(id: string) => Promise<object>} [opts.getUser]
 */
export async function fetchClerkLoginSummary(userId, opts = {}) {
  const uid = normalizeClerkUserId(userId);
  const keys = clerkKeysFromEnv(opts.env || process.env);
  if (!uid || !keys.enabled) return null;
  try {
    const getUser =
      opts.getUser ||
      (async (id) => {
        const { createClerkClient } = await import("@clerk/backend");
        const client = createClerkClient({ secretKey: keys.secretKey });
        return client.users.getUser(id);
      });
    return summarizeClerkLogin(await getUser(uid));
  } catch {
    return null;
  }
}

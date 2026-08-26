/**
 * Cost / abuse policy for expensive AI HTTP endpoints and WS action floods.
 * Rooms have their own AI quotas (ai_jobs.js); this covers solo REST + generic WS.
 */

import { RateLimiter } from "./rate-limit.mjs";
import { extractBearerToken, isJwtShaped } from "./clerk-auth.mjs";

/** @typedef {{ limit: number, windowMs: number }} Window */

/**
 * Defaults tuned for LAN / small Funnel sessions, not multi-tenant SaaS.
 * Override with env: FF_RATE_CO_INVENT=60, etc. (hits per window).
 */
export const DEFAULT_COST_WINDOWS = {
  /** Solo co-inventor text */
  "co-invent": { limit: 40, windowMs: 60_000 },
  /** Imagine / vision */
  vision: { limit: 20, windowMs: 60_000 },
  /** Market news illustrations */
  "market-image": { limit: 20, windowMs: 60_000 },
  /** Idea-card thumbnails */
  "idea-image": { limit: 20, windowMs: 60_000 },
  /** Cloud TTS */
  tts: { limit: 30, windowMs: 60_000 },
  /** Global AI spend gate (all of the above share this) */
  "ai-global": { limit: 80, windowMs: 60_000 },
  /** Room create (also limited inside RoomManager) */
  "room-create": { limit: 5, windowMs: 60 * 60 * 1000 },
  /** Room join attempts */
  "room-join": { limit: 20, windowMs: 60_000 },
  /** WS auth attempts */
  "ws-auth": { limit: 20, windowMs: 60_000 },
  /** WS game actions per player */
  "ws-action": { limit: 40, windowMs: 2_000 },
  /** WS request_ai (room still has quotas; this is flood control) */
  "ws-request-ai": { limit: 10, windowMs: 60_000 },
};

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {Record<string, Window>}
 */
export function costWindowsFromEnv(env = process.env) {
  const base = { ...DEFAULT_COST_WINDOWS };
  const map = {
    FF_RATE_CO_INVENT: "co-invent",
    FF_RATE_VISION: "vision",
    FF_RATE_MARKET_IMAGE: "market-image",
    FF_RATE_IDEA_IMAGE: "idea-image",
    FF_RATE_TTS: "tts",
    FF_RATE_AI_GLOBAL: "ai-global",
    FF_RATE_WS_ACTION: "ws-action",
  };
  for (const [envKey, policyKey] of Object.entries(map)) {
    const n = Number(env[envKey]);
    if (Number.isFinite(n) && n > 0) {
      base[policyKey] = { ...base[policyKey], limit: Math.floor(n) };
    }
  }
  return base;
}

export class CostPolicy {
  /**
   * @param {object} [opts]
   * @param {RateLimiter} [opts.limiter]
   * @param {Record<string, Window>} [opts.windows]
   * @param {boolean} [opts.enabled] set false to disable (tests / emergency)
   */
  constructor(opts = {}) {
    this.limiter = opts.limiter || new RateLimiter();
    this.windows = opts.windows || costWindowsFromEnv();
    this.enabled = opts.enabled !== false;
  }

  /**
   * @param {string} name policy key
   * @param {string} ip client ip
   * @returns {{ ok: true } | { ok: false, status: 429, error: string, policy: string }}
   */
  allow(name, ip) {
    if (!this.enabled) return { ok: true };
    const w = this.windows[name];
    if (!w) return { ok: true };
    const key = `${name}:${ip || "unknown"}`;
    if (!this.limiter.check(key, w.limit, w.windowMs)) {
      return { ok: false, status: 429, error: "rate_limited", policy: name };
    }
    return { ok: true };
  }

  /**
   * Solo AI routes: per-route + global AI budget.
   * @param {'co-invent'|'vision'|'market-image'|'idea-image'|'tts'} route
   * @param {string} ip
   */
  allowExpensive(route, ip) {
    const a = this.allow(route, ip);
    if (!a.ok) return a;
    return this.allow("ai-global", ip);
  }
}

/**
 * Optional shared secret for public exposure (Funnel / VPS).
 * When FF_API_SECRET is set, expensive POST routes require:
 *   X-FF-Secret: <secret>  or  Authorization: Bearer <secret>  or body.apiSecret
 * JWT-shaped Bearer tokens (Clerk sessions) are ignored here — use X-FF-Secret
 * when Clerk learner accounts are also enabled.
 * Loopback is always allowed without the secret.
 *
 * @param {import('node:http').IncomingMessage} req
 * @param {object|null|undefined} body
 * @param {object} [opts]
 * @param {string} [opts.secret]
 * @param {boolean} [opts.isLoopback]
 * @returns {{ ok: true } | { ok: false, status: number, error: string }}
 */
export function checkApiSecret(req, body, opts = {}) {
  const secret = opts.secret != null ? String(opts.secret) : String(process.env.FF_API_SECRET || "").trim();
  if (!secret) return { ok: true };
  if (opts.isLoopback) return { ok: true };

  const authTok = extractBearerToken(req);
  let presented = "";
  if (authTok && !isJwtShaped(authTok)) presented = authTok;
  if (!presented && typeof req.headers?.["x-ff-secret"] === "string") {
    presented = req.headers["x-ff-secret"].trim();
  }
  if (!presented && body && typeof body.apiSecret === "string") {
    presented = body.apiSecret.trim();
  }
  if (presented && presented === secret) return { ok: true };
  return { ok: false, status: 401, error: "api_secret_required" };
}

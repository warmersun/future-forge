// Neon Function Cloud API slice. Its public URL is intentionally unauthenticated
// for health/device start/status; the device code is a short-lived bearer secret.
import { createHash, randomBytes } from "node:crypto";
import pg from "pg";
import { attachDatabasePool } from "@neon/functions";
import { verifyToken } from "@clerk/backend";
import { authorizedPartiesFromEnv, isJwtShaped } from "../../js/server/clerk-auth.mjs";
import { isGameSessionToken, mintGameSessionToken, verifyGameSessionToken } from "../../js/server/game-session.mjs";
import { normalizeClerkUserId } from "../../js/server/clerk-id.mjs";
import { createAccountRoutes } from "./account-routes.mjs";
import { createPlayerRoutes } from "./player-routes.mjs";
import { createQuestWriteRoutes } from "./quest-write-routes.mjs";
import { createPublicRoutes } from "./public-routes.mjs";
import { createBillingRoutes } from "./billing-routes.mjs";

const CODE_RE = /^[A-Za-z0-9_-]{24}$/;
const MAX_BODY_BYTES = 1024;
const SIMPLE_METHODS = new Map([
  ["/api/health", "GET"], ["/api/me", "GET"],
  ["/api/device/start", "POST"], ["/api/device/complete", "POST"], ["/api/device/status", "GET"],
  ["/api/me/runs", "GET, POST"], ["/api/me/runs/start", "POST"], ["/api/me/runs/share", "POST"],
  ["/api/me/import", "POST"], ["/api/me/pins", "GET, PUT"],
  ["/api/me/run-state", "GET, PUT"], ["/api/me/profile", "GET, PUT"],
  ["/api/me/achievements", "GET"], ["/api/me/cards", "GET"], ["/api/report", "POST"],
]);
function allowedMethods(path) {
  if (SIMPLE_METHODS.has(path)) return SIMPLE_METHODS.get(path);
  if (/^\/api\/me\/cards\/[^/]+\/collect$/.test(path)) return "POST";
  if (/^\/api\/me\/quests\/[^/]+\/score$/.test(path)) return "POST";
  if (/^\/api\/me\/quests\/[^/]+\/still$/.test(path)) return "PUT";
  return null;
}

function validOrigin(value) {
  try {
    const url = new URL(value);
    if (url.origin !== value || url.username || url.password) return null;
    if (url.protocol === "https:") return value;
    if (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)) return value;
  } catch { /* invalid origin */ }
  return null;
}

function portalUiBase(value) {
  try {
    const url = new URL(String(value || "").trim());
    if (url.username || url.password || url.search || url.hash) return null;
    if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) return null;
    return `${url.origin}${url.pathname.replace(/\/$/, "")}`;
  } catch { return null; }
}

function originsFromEnv(env) {
  const list = [
    "http://127.0.0.1:8765", "http://localhost:8765",
    "http://127.0.0.1:8766", "http://localhost:8766",
    "https://ff.warmersun.com", "https://cloud.warmersun.com", "https://warmersun.com",
    env.FF_PUBLIC_ORIGIN,
    ...(env.FF_GAME_DEVICE_ORIGINS || "").split(","),
    ...(env.FF_CLOUD_CORS_ORIGINS || "").split(","),
  ];
  return new Set(list.map((s) => validOrigin(String(s || "").trim())).filter(Boolean));
}

function response(body, status = 200, cors = {}) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", Vary: "Origin", ...cors },
  });
}

function digest(code) {
  return createHash("sha256").update(code).digest("hex");
}

function bearer(request) {
  const match = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i);
  return match?.[1] || "";
}

async function readCode(request) {
  // Guard both declared and actual size, including chunked requests.
  const length = Number(request.headers.get("content-length"));
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) throw new Error("body_too_large");
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new Error("bad_body");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("bad_body");
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new Error("body_too_large");
    }
    chunks.push(Buffer.from(value));
  }
  const text = Buffer.concat(chunks).toString("utf8");
  const body = JSON.parse(text);
  return typeof body?.code === "string" ? body.code : "";
}

/** Dependency injection keeps handler tests offline; production uses the injected branch DATABASE_URL. */
export function createCloudApi({ env = process.env, db, verifyClerk, verifySignedWebhook,
  getUserBillingSubscription, loadCatalog, generateCode } = {}) {
  const allowedOrigins = originsFromEnv(env);
  const portalBase = portalUiBase(env.FF_PORTAL_UI_URL || env.FF_PUBLIC_ORIGIN);
  const apiOrigin = validOrigin(String(env.FF_PUBLIC_ORIGIN || "").trim());
  let pool;
  const database = () => {
    if (db) return db;
    if (!env.DATABASE_URL) return null;
    if (!pool) {
      pool = new pg.Pool({ connectionString: env.DATABASE_URL, max: 5, ssl: { rejectUnauthorized: true } });
      attachDatabasePool(pool);
    }
    return pool;
  };
  const clerkOn = Boolean((env.CLERK_SECRET_KEY || env.FF_CLERK_SECRET_KEY) &&
    (env.CLERK_PUBLISHABLE_KEY || env.FF_CLERK_PUBLISHABLE_KEY));
  const clerk = clerkOn
    ? { enabled: true, publishableKey: env.CLERK_PUBLISHABLE_KEY || env.FF_CLERK_PUBLISHABLE_KEY }
    : { enabled: false };
  const verify = verifyClerk || ((token) => verifyToken(token, {
    secretKey: env.CLERK_SECRET_KEY || env.FF_CLERK_SECRET_KEY,
    authorizedParties: authorizedPartiesFromEnv(env),
  }));
  let routes;
  function handlers() {
    if (!routes) {
      const cx = database();
      routes = {
        account: createAccountRoutes({ db: cx, env, getUserBillingSubscription }),
        player: createPlayerRoutes({ db: cx }),
        quest: createQuestWriteRoutes({ db: cx, env, loadCatalog }),
        public: createPublicRoutes({ db: cx, env, verifyClerk: verify, loadCatalog }),
        billing: createBillingRoutes({ db: cx, env, verifyClerk: verify,
          verifySignedWebhook, getUserBillingSubscription }),
      };
    }
    return routes;
  }
  function withCors(result, origin) {
    if (!origin || !result) return result;
    const headers = new Headers(result.headers);
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
    return new Response(result.body, { status: result.status, headers });
  }

  async function fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const origin = request.headers.get("origin");
    if (origin && !path.startsWith("/card/") && !allowedOrigins.has(origin))
      return response({ ok: false, error: "origin_forbidden" }, 403);
    const cors = origin ? { "Access-Control-Allow-Origin": origin } : {};
    if (request.method === "OPTIONS") {
      if (path === "/api/quests" || path.startsWith("/api/quests/") ||
        path.startsWith("/api/u/") || path === "/api/board" || path.startsWith("/api/board/"))
        return handlers().public.fetch(request);
      if (["/api/me/ai/reserve", "/api/internal/ai/reserve", "/api/me/ai/settle", "/api/webhooks/clerk"].includes(path))
        return handlers().billing.fetch(request);
      const methods = allowedMethods(path);
      if (!methods) return response({ ok: false, error: "not_found" }, 404, cors);
      return new Response(null, {
        status: 204,
        headers: {
          ...cors, Vary: "Origin", "Cache-Control": "no-store",
          "Access-Control-Allow-Methods": `${methods}, OPTIONS`,
          "Access-Control-Allow-Headers": "Authorization, Content-Type",
          "Access-Control-Max-Age": "600",
        },
      });
    }
    if (path.startsWith("/card/") || path === "/api/quests" || path.startsWith("/api/quests/") ||
      path.startsWith("/api/u/") || path === "/api/board" || path.startsWith("/api/board/"))
      return handlers().public.fetch(request);
    if (["/api/me/ai/reserve", "/api/internal/ai/reserve", "/api/me/ai/settle", "/api/webhooks/clerk"].includes(path))
      return handlers().billing.fetch(request);
    if (path === "/api/report" || /^\/api\/me\/quests\/[^/]+\/(score|still)$/.test(path))
      return withCors(await handlers().quest.fetch(request, await requestIdentity(request)), origin);
    if (path === "/api/me" || path === "/api/me/cards" || /^\/api\/me\/cards\/[^/]+\/collect$/.test(path))
      return withCors(await handlers().account.fetch(request, await requestIdentity(request)), origin);
    if (path.startsWith("/api/me/")) {
      const result = await handlers().player.fetch(request, await requestIdentity(request));
      return result ? withCors(result, origin) : response({ ok: false, error: "not_found" }, 404, cors);
    }
    const methods = SIMPLE_METHODS.get(path);
    if (!methods) return response({ ok: false, error: "not_found" }, 404, cors);
    if (methods !== request.method) return Response.json(
      { ok: false, error: "method_not_allowed" },
      { status: 405, headers: { ...cors, Allow: methods, Vary: "Origin", "Cache-Control": "no-store" } }
    );
    if (path === "/api/health") {
      const cx = database();
      if (!cx) return response({ ok: false, service: "portal", clerk, apiOrigin, db: { enabled: false } }, 503, cors);
      try {
        await cx.query("SELECT 1");
        return response({ ok: true, service: "portal", clerk, apiOrigin, db: { enabled: true } }, 200, cors);
      } catch {
        return response({ ok: false, service: "portal", clerk, apiOrigin, db: { enabled: false } }, 503, cors);
      }
    }
    if (!clerkOn) return response({ ok: false, error: "clerk_off" }, 503, cors);

    const cx = database();
    if (!cx) return response({ ok: false, error: "db_unavailable" }, 503, cors);
    try {
      if (path === "/api/device/start") {
        if (!portalBase) {
          return response({ ok: false, error: "portal_origin_unconfigured" }, 503, cors);
        }
        const code = generateCode ? generateCode() : randomBytes(18).toString("base64url");
        if (!CODE_RE.test(code)) throw new Error("invalid_generated_code");
        await cx.query("DELETE FROM device_handshakes WHERE expires_at <= now()");
        await cx.query(
          "INSERT INTO device_handshakes (code_hash, expires_at) VALUES ($1, now() + interval '5 minutes')",
          [digest(code)]
        );
        return response({ ok: true, code, signInUrl: `${portalBase}/signin?device=${encodeURIComponent(code)}` }, 200, cors);
      }
      let code;
      try {
        code = path === "/api/device/status" ? url.searchParams.get("code") : await readCode(request);
      } catch (error) {
        return response({ ok: false, error: error.message === "body_too_large" ? "payload_too_large" : "bad_body" },
          error.message === "body_too_large" ? 413 : 400, cors);
      }
      if (!CODE_RE.test(code || "")) return response({ ok: false, error: "invalid" }, 400, cors);
      const codeHash = digest(code);
      if (path === "/api/device/complete") {
        const identity = await authenticatedIdentity(bearer(request));
        if (!identity) return response({ ok: false, error: "sign_in_required" }, 401, cors);
        const token = mintGameSessionToken(identity, env);
        if (!token) return response({ ok: false, error: "session_mint_failed" }, 503, cors);
        const bound = await cx.query(
          "UPDATE device_handshakes SET session_token = $2 WHERE code_hash = $1 AND expires_at > now() AND session_token IS NULL RETURNING code_hash",
          [codeHash, token]
        );
        if (bound.rows.length) return response({ ok: true }, 200, cors);
        const existing = await cx.query(
          "SELECT session_token IS NOT NULL AS bound FROM device_handshakes WHERE code_hash = $1 AND expires_at > now()",
          [codeHash]
        );
        return response({ ok: false, error: existing.rows.length ? "already_bound" : "unknown" }, 400, cors);
      }
      // Atomically consume a completed code. Concurrent polls cannot each receive a token.
      const taken = await cx.query(
        "DELETE FROM device_handshakes WHERE code_hash = $1 AND expires_at > now() AND session_token IS NOT NULL RETURNING session_token",
        [codeHash]
      );
      if (taken.rows.length) return response({ ok: true, pending: false, token: taken.rows[0].session_token }, 200, cors);
      const pending = await cx.query(
        "SELECT 1 FROM device_handshakes WHERE code_hash = $1 AND expires_at > now()",
        [codeHash]
      );
      return pending.rows.length
        ? response({ ok: true, pending: true }, 200, cors)
        : response({ ok: false, error: "unknown" }, 404, cors);
    } catch {
      // Never echo DB exceptions, connection strings, session tokens or Clerk keys.
      return response({ ok: false, error: "db_unavailable" }, 503, cors);
    }
  }

  async function authenticatedIdentity(token) {
    // A minted game token must not authorize completion or impersonate a Clerk session.
    if (!isJwtShaped(token) || isGameSessionToken(token)) return null;
    try {
      const claims = await verify(token);
      const userId = normalizeClerkUserId(claims?.sub);
      if (!userId) return null;
      return { userId, sessionId: normalizeClerkUserId(claims?.sid) };
    } catch { return null; }
  }
  async function requestIdentity(request) {
    const token = bearer(request);
    const base = { enabled: clerkOn, signedIn: false, userId: null, sessionId: null };
    if (!clerkOn) return base;
    if (!token) return { ...base, missingToken: true };
    if (!isJwtShaped(token)) return { ...base, invalidToken: true };
    try {
      const claims = isGameSessionToken(token) ? verifyGameSessionToken(token, env) : await verify(token);
      const userId = normalizeClerkUserId(claims?.sub);
      if (!userId) return { ...base, invalidToken: true };
      return { ...base, signedIn: true, userId, sessionId: normalizeClerkUserId(claims?.sid) };
    } catch { return { ...base, invalidToken: true }; }
  }
  return { fetch };
}

export default createCloudApi();

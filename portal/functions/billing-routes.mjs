// Staged Neon Function slice: quota and Clerk webhook routes only. Do not expose
// this module at the legacy portal URL until the schema and route cutover are ready.
import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import pg from "pg";
import { attachDatabasePool } from "@neon/functions";
import { createClerkClient, verifyToken } from "@clerk/backend";
import { verifyWebhook } from "@clerk/backend/webhooks";
import { authorizedPartiesFromEnv, clerkWebhookSecretFromEnv, isJwtShaped } from "../../js/server/clerk-auth.mjs";
import { normalizeClerkUserId } from "../../js/server/clerk-id.mjs";
import { isGameSessionToken, verifyGameSessionToken } from "../../js/server/game-session.mjs";
import {
  budgetMicroFromEnv, chargeMicro, holdMicroFor, isQuotaKind, monthPeriodStart,
  planSlugsFromEnv, quotaRatesFromEnv, settleMicroFor, signQuotaGrant,
  subscriptionEntitled, textMaxOutFromEnv, verifyQuotaGrant,
  voiceConnectedMinuteMicro, voiceMaxMsFromEnv,
  SUBSCRIPTION_REQUIRED_MESSAGE, QUOTA_SPENT_MESSAGE, QUOTA_UNAVAILABLE_MESSAGE,
} from "../../js/server/ai-quota.mjs";
import { clerkTimeIso, entitledPlanSlug, planClerkBillingEvent, planClerkUserEvent, rowFromClerkBillingSubscription } from "../../js/server/clerk-webhooks.mjs";
import { cloudCorsOriginsFromEnv, cloudOriginAllowed } from "../../js/cloud/portal-origin.js";

const ROUTES = new Set(["/api/me/ai/reserve", "/api/internal/ai/reserve", "/api/me/ai/settle", "/api/webhooks/clerk"]);
const BODY_LIMIT = 8_000;
const WEBHOOK_LIMIT = 256_000;
const ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

const points = (n) => Math.max(0, Math.floor(Number(n) || 0));

function equal(a, b) {
  const x = Buffer.from(String(a || ""));
  const y = Buffer.from(String(b || ""));
  return x.length > 0 && x.length === y.length && timingSafeEqual(x, y);
}
function bearer(req) {
  return req.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1] || "";
}
async function boundedBody(req, max) {
  const length = req.headers.get("content-length");
  if (length != null && (!/^\d+$/.test(length) || Number(length) > max)) throw new Error("payload_too_large");
  const reader = req.body?.getReader();
  if (!reader) throw new Error("bad_body");
  let size = 0;
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      throw new Error("payload_too_large");
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks).toString("utf8");
}
async function jsonBody(req) {
  if (!/^application\/json(?:\s*;|\s*$)/i.test(req.headers.get("content-type") || "")) throw new Error("bad_body");
  const parsed = JSON.parse(await boundedBody(req, BODY_LIMIT));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("bad_body");
  return parsed;
}
function subscribeUrl(env) {
  const origin = String(env.FF_PORTAL_UI_URL || env.FF_PUBLIC_ORIGIN || "https://cloud.warmersun.com").trim().replace(/\/$/, "");
  return `${origin}/subscribe`;
}
async function transaction(pool, work) {
  const cx = await pool.connect();
  try {
    await cx.query("BEGIN");
    const value = await work(cx);
    await cx.query("COMMIT");
    return value;
  } catch (e) {
    try { await cx.query("ROLLBACK"); } catch { /* original failure wins */ }
    throw e;
  } finally { cx.release(); }
}

/** Injectable dependencies allow offline tests; the default export is a Neon fetch handler. */
export function createBillingRoutes({ env = process.env, db, verifyClerk, verifySignedWebhook, getUserBillingSubscription } = {}) {
  let pool;
  function database() {
    if (db) return db;
    if (!env.DATABASE_URL) return null;
    if (!pool) {
      pool = new pg.Pool({ connectionString: env.DATABASE_URL, max: 5, ssl: { rejectUnauthorized: true } });
      attachDatabasePool(pool);
    }
    return pool;
  }
  const jwtVerifier = verifyClerk || ((token) => verifyToken(token, {
    secretKey: env.CLERK_SECRET_KEY || env.FF_CLERK_SECRET_KEY,
    authorizedParties: authorizedPartiesFromEnv(env),
  }));
  const webhookVerifier = verifySignedWebhook || ((headers, rawBody, signingSecret) =>
    verifyWebhook(new Request("https://clerk-webhook.invalid/", { method: "POST", headers, body: rawBody }), { signingSecret }));
  const loadBilling = getUserBillingSubscription || ((userId) =>
    createClerkClient({ secretKey: env.CLERK_SECRET_KEY || env.FF_CLERK_SECRET_KEY })
      .billing.getUserBillingSubscription(userId));
  const allowedOrigins = cloudCorsOriginsFromEnv(env);
  async function identity(req) {
    const token = bearer(req);
    if (!isJwtShaped(token)) return null;
    try {
      const claims = isGameSessionToken(token) ? verifyGameSessionToken(token, env)
        : (env.CLERK_SECRET_KEY || env.FF_CLERK_SECRET_KEY) ? await jwtVerifier(token) : null;
      return normalizeClerkUserId(claims?.sub);
    } catch { return null; }
  }
  async function grantKey(cx) {
    const existing = await cx.query("SELECT secret FROM quota_grant_key WHERE id = 1");
    return existing.rows[0]?.secret || null; // Never silently mint a grant key on this route.
  }
  async function reserve(cx, userId, body) {
    if (!isQuotaKind(body.kind)) return { ok: false, status: 400, error: "bad_kind" };
    // Match webhook reconciliation: payer advisory lock, then subscription row.
    // Reversing these locks can deadlock a reserve against a cancellation.
    await cx.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [userId]);
    const sub = (await cx.query(
      "SELECT plan_slug, status, period_start, period_end FROM subscriptions WHERE clerk_user_id = $1 FOR SHARE", [userId]
    )).rows[0];
    if (!subscriptionEntitled({ status: sub?.status, planSlug: sub?.plan_slug, periodEnd: sub?.period_end, allowedSlugs: planSlugsFromEnv(env) })) {
      return { ok: false, status: 402, error: "subscription_required", message: SUBSCRIPTION_REQUIRED_MESSAGE };
    }
    const start = sub.period_start ? new Date(sub.period_start).toISOString() : monthPeriodStart();
    // The payer lock also serializes stale cleanup and settlement across periods.
    const stale = await cx.query(
      `UPDATE ai_quota_reservations SET settled = true, settled_points = held_points
       WHERE clerk_user_id = $1 AND settled = false AND created_at < now() - interval '2 hours'
       RETURNING period_start, held_points`, [userId]
    );
    for (const row of stale.rows) await cx.query(
      `UPDATE ai_usage_period SET spent_points = spent_points + $3,
        held_points = GREATEST(0, held_points - $3)
       WHERE clerk_user_id = $1 AND period_start = $2`, [userId, row.period_start, points(row.held_points)]
    );
    await cx.query(
      `DELETE FROM ai_quota_reservations WHERE clerk_user_id = $1 AND settled = true
       AND created_at < now() - interval '1 day'`, [userId]
    );
    await cx.query(
      `INSERT INTO ai_usage_period (clerk_user_id, period_start, spent_points, held_points)
       VALUES ($1, $2, 0, 0) ON CONFLICT (clerk_user_id, period_start) DO NOTHING`, [userId, start]
    );
    const ledger = (await cx.query(
      `SELECT spent_points, held_points FROM ai_usage_period
       WHERE clerk_user_id = $1 AND period_start = $2 FOR UPDATE`, [userId, start]
    )).rows[0];
    if (!ledger) throw new Error("ledger_missing");
    const remaining = Math.max(0, budgetMicroFromEnv(env) - points(ledger.spent_points) - points(ledger.held_points));
    const rates = quotaRatesFromEnv(env);
    const hold = points(holdMicroFor(body.kind, {
      remainingMicro: remaining, chars: body.chars, inputTokens: body.inputTokens,
      rates, env, maxVoiceMs: voiceMaxMsFromEnv(env),
    }));
    if (!Number.isSafeInteger(hold) || hold > remaining) return {
      ok: false, status: 429, error: "quota_spent", message: QUOTA_SPENT_MESSAGE, remainingMicro: remaining,
    };
    const reservationId = randomUUID();
    const settleToken = randomBytes(32).toString("base64url");
    await cx.query("UPDATE ai_usage_period SET held_points = held_points + $3 WHERE clerk_user_id = $1 AND period_start = $2", [userId, start, hold]);
    await cx.query(
      `INSERT INTO ai_quota_reservations (id, clerk_user_id, period_start, kind, held_points, settle_token)
       VALUES ($1, $2, $3, $4, $5, $6)`, [reservationId, userId, start, body.kind, hold, settleToken]
    );
    return { ok: true, reservationId, settleToken, userId, holdMicro: hold,
      remainingMicro: remaining - hold, maxOutputTokens: body.kind === "text" ? textMaxOutFromEnv(env) : 0,
      minuteMicro: body.kind === "voice" ? voiceConnectedMinuteMicro(rates) : 0 };
  }
  async function settle(cx, body) {
    if (typeof body.reservationId !== "string" || !ID_RE.test(body.reservationId)) return { ok: false, status: 400, error: "bad_settle" };
    const userId = normalizeClerkUserId(body.userId);
    if (!userId || typeof body.settleToken !== "string") return { ok: false, status: 403, error: "quota_forbidden" };
    await cx.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [userId]);
    const row = (await cx.query(
      `SELECT clerk_user_id, period_start, kind, held_points, settled, settled_points, settle_token
       FROM ai_quota_reservations WHERE id = $1 FOR UPDATE`, [body.reservationId]
    )).rows[0];
    if (!row) return { ok: false, status: 404, error: "not_found" };
    if (row.clerk_user_id !== userId || !equal(row.settle_token, body.settleToken)) return { ok: false, status: 403, error: "quota_forbidden" };
    if (row.settled) return { ok: true, idempotent: true, actualMicro: points(row.settled_points) };
    const ledger = (await cx.query(
      `SELECT spent_points, held_points FROM ai_usage_period
       WHERE clerk_user_id = $1 AND period_start = $2 FOR UPDATE`, [userId, row.period_start]
    )).rows[0];
    if (!ledger) throw new Error("ledger_missing");
    const actual = settleMicroFor(row.kind, body, quotaRatesFromEnv(env));
    const charged = chargeMicro({ actualMicro: actual, heldMicro: points(row.held_points),
      budgetMicro: budgetMicroFromEnv(env), spentMicro: points(ledger.spent_points), heldTotalMicro: points(ledger.held_points) });
    await cx.query(
      `UPDATE ai_usage_period SET spent_points = spent_points + $3,
       held_points = GREATEST(0, held_points - $4)
       WHERE clerk_user_id = $1 AND period_start = $2`, [userId, row.period_start, charged, points(row.held_points)]
    );
    await cx.query("UPDATE ai_quota_reservations SET settled = true, settled_points = $2 WHERE id = $1", [body.reservationId, charged]);
    return { ok: true, actualMicro: charged };
  }
  async function applyWebhook(cx, evt, eventId) {
    // The unique insert and mutation commit together. A retry after rollback can apply.
    const inserted = await cx.query(
      `INSERT INTO clerk_webhook_events (event_id) VALUES ($1)
       ON CONFLICT (event_id) DO NOTHING RETURNING event_id`, [eventId]
    );
    if (!inserted.rows.length) return { ok: true, idempotent: true };
    const billing = planClerkBillingEvent(evt, { env });
    if (String(evt.type || "").startsWith("subscription")) {
      if (!billing.ok) return { ok: false, status: 400, error: billing.error };
      if (billing.action === "upsert_subscription") {
        // Webhook timestamps and item period boundaries are not a reliable
        // ordering key. Serialize by payer, then read Clerk's current state.
        // Never apply a stale event snapshot or treat a failed read as canceled.
        await cx.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [billing.userId]);
        if (!(env.CLERK_SECRET_KEY || env.FF_CLERK_SECRET_KEY)) throw new Error("clerk_unavailable");
        const snapshot = await loadBilling(billing.userId);
        if (!snapshot || !Array.isArray(snapshot.subscriptionItems)) throw new Error("billing_snapshot_unavailable");
        const active = rowFromClerkBillingSubscription(snapshot, { env });
        // Preserve Clerk's paid-until-period-end cancellation semantics; an
        // empty/free/ended snapshot is unentitled, regardless of event payload.
        const canceled = !active && snapshot.subscriptionItems.find((item) =>
          Boolean(item?.plan?.slug) && !["free_user", "free_org"].includes(String(item.plan.slug)) &&
          String(item?.status || "").toLowerCase() === "canceled" &&
          clerkTimeIso(item?.periodEnd ?? item?.period_end));
        const paid = active || (canceled ? {
          planSlug: entitledPlanSlug(canceled.plan.slug, env),
          status: "canceled", periodStart: clerkTimeIso(canceled.periodStart ?? canceled.period_start),
          periodEnd: clerkTimeIso(canceled.periodEnd ?? canceled.period_end),
        } : null);
        await cx.query("INSERT INTO users (clerk_user_id) VALUES ($1) ON CONFLICT (clerk_user_id) DO NOTHING", [billing.userId]);
        await cx.query(
          `INSERT INTO subscriptions (clerk_user_id, plan_slug, status, period_start, period_end)
           VALUES ($1,$2,$3,$4,$5) ON CONFLICT (clerk_user_id) DO UPDATE SET
           plan_slug = EXCLUDED.plan_slug, status = EXCLUDED.status,
           period_start = EXCLUDED.period_start, period_end = EXCLUDED.period_end, updated_at = now()`,
          [billing.userId, paid?.planSlug ?? null, paid?.status ?? "inactive", paid?.periodStart ?? null, paid?.periodEnd ?? null]
        );
      }
      return { ok: true, action: billing.action };
    }
    if (!String(evt.type || "").startsWith("user.")) return { ok: true, action: "ignore" };
    const user = planClerkUserEvent(evt);
    if (!user.ok) return { ok: false, status: 400, error: user.error };
    if (user.action === "delete") await cx.query("DELETE FROM users WHERE clerk_user_id = $1", [user.userId]);
    if (user.action === "ensure" || user.action === "touch") {
      await cx.query(
        `INSERT INTO users (clerk_user_id) VALUES ($1)
         ON CONFLICT (clerk_user_id) DO UPDATE SET last_seen_at = now()`, [user.userId]
      );
      if (user.username) await cx.query(
        `UPDATE users SET username = $2 WHERE clerk_user_id = $1
         AND (username IS NULL OR BTRIM(username) = '')
         AND NOT EXISTS (SELECT 1 FROM users other WHERE other.username = $2 AND other.clerk_user_id <> $1)`,
        [user.userId, user.username]
      );
      for (const code of user.codes || []) await cx.query(
        `INSERT INTO achievements (clerk_user_id, code) VALUES ($1,$2)
         ON CONFLICT (clerk_user_id, code) DO NOTHING`, [user.userId, code]
      );
    }
    return { ok: true, action: user.action };
  }
  async function fetch(req) {
    const path = new URL(req.url).pathname;
    const browser = path === "/api/me/ai/reserve";
    const origin = req.headers.get("origin");
    const permitted = browser && origin && cloudOriginAllowed(origin, env, allowedOrigins);
    const cors = permitted ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : { Vary: "Origin" };
    const result = (body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store", ...cors } });
    const failure = (error, status, message) => result({ ok: false, error, ...(message ? { message } : {}) }, status);
    if (!ROUTES.has(path)) return failure("not_found", 404);
    if (origin && !permitted) return failure("origin_forbidden", 403);
    if (req.method === "OPTIONS" && browser) return new Response(null, { status: 204, headers: {
      ...cors, "Cache-Control": "no-store", "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
    } });
    if (req.method !== "POST") return Response.json({ ok: false, error: "method_not_allowed" }, { status: 405, headers: { ...cors, Allow: "POST", "Cache-Control": "no-store" } });
    const cx = database();
    if (!cx) return failure("quota_unavailable", 503);
    if (path === "/api/webhooks/clerk") {
      const signingSecret = clerkWebhookSecretFromEnv(env);
      if (!signingSecret) return failure("webhooks_off", 404);
      let raw;
      try { raw = await boundedBody(req, WEBHOOK_LIMIT); }
      catch (e) { return failure(e.message === "payload_too_large" ? "payload_too_large" : "bad_body", e.message === "payload_too_large" ? 413 : 400); }
      let evt;
      try { evt = await webhookVerifier(req.headers, raw, signingSecret); }
      catch { return failure("invalid_signature", 401); }
      // Clerk's verifier returns type/data without an event id; the verified
      // Svix message id comes from the signed header set.
      const eventId = String(req.headers.get("svix-id") || evt?.id || "");
      if (!ID_RE.test(eventId)) return failure("invalid_webhook", 400);
      try {
        const applied = await transaction(cx, async (client) => {
          const value = await applyWebhook(client, evt, eventId);
          if (!value.ok) throw Object.assign(new Error(value.error), { response: value });
          return value;
        });
        return result(applied);
      } catch (e) { return e.response ? result({ ok: false, error: e.response.error }, e.response.status) : failure("webhook_failed", 503); }
    }
    const internal = path === "/api/internal/ai/reserve";
    const settling = path === "/api/me/ai/settle";
    const shared = equal(req.headers.get("x-ff-secret"), env.FF_API_SECRET);
    if ((internal || settling) && !shared) return failure("quota_unavailable", 503);
    let userId = null;
    if (!internal && !settling) {
      userId = await identity(req);
      if (!userId) return failure("subscription_required", 402, SUBSCRIPTION_REQUIRED_MESSAGE);
    }
    let body;
    try { body = await jsonBody(req); }
    catch (e) { return failure(e.message === "payload_too_large" ? "payload_too_large" : "bad_body", e.message === "payload_too_large" ? 413 : 400); }
    try {
      if (internal) {
        userId = normalizeClerkUserId(body.userId);
        if (!userId) return failure("quota_forbidden", 403);
        const key = await grantKey(cx);
        if (!key || verifyQuotaGrant(body.quotaGrant, key) !== userId) return failure("quota_forbidden", 403);
      }
      const data = settling ? await transaction(cx, (client) => settle(client, body))
        : await transaction(cx, (client) => reserve(client, userId, body));
      if (data.ok) data.subscribeUrl = subscribeUrl(env);
      return result(data, data.ok ? 200 : data.status || 503);
    } catch { return failure("quota_unavailable", 503, QUOTA_UNAVAILABLE_MESSAGE); }
  }
  return { fetch };
}

export default createBillingRoutes();

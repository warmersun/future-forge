// Account slice for Neon Functions. The caller MUST verify Clerk before passing
// identity; this module never treats headers, query strings or bodies as identity.
// Not wired into cloud-api.mjs until the parent can route verified identities.
import { randomBytes } from "node:crypto";
import { createClerkClient } from "@clerk/backend";
import { normalizeClerkUserId } from "../../js/server/clerk-id.mjs";
import { cloudWriteGate } from "../../js/server/cloud-save.mjs";
import { parseCollectPath, publicCardDto, collectHttpResult } from "../../js/server/collector-cards.mjs";
import { planSlugsFromEnv, signQuotaGrant, subscriptionEntitled, subscriptionView } from "../../js/server/ai-quota.mjs";
import { subscribeUrlFromEnv } from "../../js/server/cloud-quota.mjs";
import { rowFromClerkBillingSubscription } from "../../js/server/clerk-webhooks.mjs";
import { portalPublicOrigin } from "../../js/cloud/portal-origin.js";

const MAX_COLLECT_BODY = 1024; // This POST takes no input; consume only a bounded body.
const reply = (body, status = 200, headers = {}) => Response.json(body, {
  status, headers: { "Cache-Control": "no-store", ...headers },
});

async function discardBounded(request) {
  const declared = request.headers.get("content-length");
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > MAX_COLLECT_BODY)) return false;
  const reader = request.body?.getReader();
  if (!reader) return true;
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return true;
    size += value.byteLength;
    if (size > MAX_COLLECT_BODY) {
      await reader.cancel();
      return false;
    }
  }
}

/** db is a pg Pool-like interface. identity is supplied ONLY by a verified caller. */
export function createAccountRoutes({ db, env = process.env, getUserBillingSubscription } = {}) {
  const publicOrigin = portalPublicOrigin(env);
  const allowedSlugs = planSlugsFromEnv(env);
  const loadBilling = getUserBillingSubscription || (async (userId) => {
    const secretKey = env.CLERK_SECRET_KEY || env.FF_CLERK_SECRET_KEY;
    if (!secretKey) return null;
    return createClerkClient({ secretKey }).billing.getUserBillingSubscription(userId);
  });
  async function grantFor(uid) {
    const existing = await db.query("SELECT secret FROM quota_grant_key WHERE id = 1");
    let secret = existing.rows[0]?.secret;
    if (!secret) {
      const candidate = randomBytes(32).toString("base64url");
      await db.query("INSERT INTO quota_grant_key (id, secret) VALUES (1, $1) ON CONFLICT (id) DO NOTHING", [candidate]);
      secret = (await db.query("SELECT secret FROM quota_grant_key WHERE id = 1")).rows[0]?.secret;
    }
    return secret ? signQuotaGrant(uid, String(secret)) || null : null;
  }
  async function me(uid, identity) {
    // DB failures are individually tolerated by the legacy /api/me response.
    let solvedIds = [];
    try {
      solvedIds = (await db.query("SELECT quest_id FROM solved_quests WHERE clerk_user_id = $1 ORDER BY first_solved_at ASC", [uid]))
        .rows.map((row) => String(row.quest_id));
    } catch { /* legacy returns an empty solvedIds list */ }
    let quotaGrant = null;
    try { quotaGrant = await grantFor(uid); } catch { /* legacy returns null */ }
    let sub = null;
    try { sub = (await db.query("SELECT clerk_user_id, plan_slug, status, period_start, period_end FROM subscriptions WHERE clerk_user_id = $1", [uid])).rows[0] || null; }
    catch { /* legacy returns an unentitled subscription view */ }
    if (!subscriptionEntitled({ status: sub?.status, planSlug: sub?.plan_slug, periodEnd: sub?.period_end, allowedSlugs })) {
      let cx;
      try {
        cx = await db.connect();
        await cx.query("BEGIN");
        // Share the webhook's lock BEFORE fetching provider state. A snapshot
        // fetched outside it could resurrect a subscription after cancellation.
        await cx.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [uid]);
        sub = (await cx.query("SELECT clerk_user_id, plan_slug, status, period_start, period_end FROM subscriptions WHERE clerk_user_id = $1", [uid])).rows[0] || null;
        let refreshed = sub;
        if (!subscriptionEntitled({ status: sub?.status, planSlug: sub?.plan_slug, periodEnd: sub?.period_end, allowedSlugs })) {
          const fresh = rowFromClerkBillingSubscription(await loadBilling(uid), { env });
          if (fresh) {
            // Always bind the verified identity, never provider identity fields.
            await cx.query("INSERT INTO users (clerk_user_id) VALUES ($1) ON CONFLICT (clerk_user_id) DO UPDATE SET last_seen_at = now()", [uid]);
            await cx.query(`INSERT INTO subscriptions (clerk_user_id, plan_slug, status, period_start, period_end, updated_at)
              VALUES ($1,$2,$3,$4,$5,now()) ON CONFLICT (clerk_user_id) DO UPDATE SET
              plan_slug = EXCLUDED.plan_slug, status = EXCLUDED.status, period_start = EXCLUDED.period_start,
              period_end = EXCLUDED.period_end, updated_at = now()`,
            [uid, fresh.planSlug || null, String(fresh.status || "active"), fresh.periodStart || null, fresh.periodEnd || null]);
            refreshed = (await cx.query("SELECT clerk_user_id, plan_slug, status, period_start, period_end FROM subscriptions WHERE clerk_user_id = $1", [uid])).rows[0] || null;
          }
        }
        await cx.query("COMMIT");
        sub = refreshed;
      } catch {
        // Preserve the last committed DB view; never disclose provider/DB errors.
        if (cx) try { await cx.query("ROLLBACK"); } catch { /* original failure wins */ }
      } finally { cx?.release(); }
    }
    return reply({
      ok: true, signedIn: true, clerk: true, userId: uid, sessionId: identity.sessionId ?? null,
      db: true, solvedIds, quotaGrant,
      subscription: subscriptionView(sub, { subscribeUrl: subscribeUrlFromEnv(env), allowedSlugs, env }),
    });
  }
  return {
    async fetch(request, identity) {
      const path = new URL(request.url).pathname;
      const collect = parseCollectPath(path);
      if (path !== "/api/me" && path !== "/api/me/cards" && !collect) return null;
      const method = collect ? "POST" : "GET";
      if (request.method !== method) return reply({ ok: false, error: "method_not_allowed" }, 405, { Allow: method });
      if (collect?.invalid) return reply({ ok: false, error: "not_found" }, 404);
      // Missing identity is not evidence that Clerk is disabled: fail closed.
      const ident = identity ?? { enabled: true, signedIn: false, missingToken: true };
      if (path === "/api/me") {
        if (ident.enabled === false) return reply({ ok: true, signedIn: false, clerk: false, db: false });
        if (ident.missingToken) return reply({ ok: true, signedIn: false, clerk: true, db: Boolean(db) });
        const uid = normalizeClerkUserId(ident.userId);
        if (ident.invalidToken || !ident.signedIn || !uid || uid !== ident.userId)
          return reply({ ok: false, error: "invalid_token", clerk: true }, 401);
        // Unlike the legacy server, fail closed when DB is not configured; a
        // successful signed-in /api/me without quota/subscription is unsafe.
        if (!db) return reply({ ok: false, error: "db_unavailable" }, 503);
        return me(uid, ident);
      }
      const gate = cloudWriteGate(ident, { dbEnabled: Boolean(db) });
      const uid = normalizeClerkUserId(gate.userId);
      if (ident.invalidToken || !gate.ok || !uid || uid !== gate.userId) {
        const rejected = ident.invalidToken || gate.ok
          ? { status: 401, error: "invalid_token" } : gate;
        const denied = collect ? collectHttpResult(rejected, null)
          : { status: rejected.status, body: { ok: false, error: rejected.error } };
        return reply({ ...denied.body, clerk: ident.enabled !== false }, denied.status);
      }
      try {
        if (collect && !(await discardBounded(request))) return reply({ ok: false, error: "payload_too_large" }, 413);
        if (!collect) {
          const rows = (await db.query(`SELECT c.id, c.tech_id, c.title, c.description, c.updated_at, u.collected_at
            FROM user_collector_cards u JOIN collector_cards c ON c.id = u.card_id
            WHERE u.clerk_user_id = $1 AND c.published = true ORDER BY u.collected_at DESC`, [uid])).rows;
          return reply({ ok: true, cards: rows.map((row) => publicCardDto(row, publicOrigin)) });
        }
        const card = (await db.query(`SELECT id, tech_id, title, description, body, links, content_type, byte_len, published, updated_at
          FROM collector_cards WHERE id = $1 AND published = true`, [collect.id])).rows[0];
        if (!card) {
          const missing = collectHttpResult(gate, null);
          return reply(missing.body, missing.status);
        }
        await db.query("INSERT INTO users (clerk_user_id) VALUES ($1) ON CONFLICT (clerk_user_id) DO UPDATE SET last_seen_at = now()", [uid]);
        const saved = await db.query(`INSERT INTO user_collector_cards (clerk_user_id, card_id)
          VALUES ($1, $2)
          ON CONFLICT (clerk_user_id, card_id) DO NOTHING
          RETURNING collected_at`, [uid, collect.id]);
        const result = collectHttpResult(gate, card, { already: saved.rowCount === 0 });
        return reply({ ...result.body, card: publicCardDto(card, publicOrigin) }, result.status);
      } catch {
        return reply({ ok: false, error: collect ? "collect_failed" : "cards_failed" }, 500);
      }
    },
  };
}

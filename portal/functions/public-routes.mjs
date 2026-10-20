// Public portal read slice for Neon Functions. No game routes or server startup.
// Exported fetch(Request) is deployable separately; createPublicRoutes injects offline dependencies.
import pg from "pg";
import { attachDatabasePool } from "@neon/functions";
import { verifyToken } from "@clerk/backend";
import { authorizedPartiesFromEnv, isJwtShaped } from "../../js/server/clerk-auth.mjs";
import { isGameSessionToken, verifyGameSessionToken } from "../../js/server/game-session.mjs";
import { normalizeClerkUserId } from "../../js/server/clerk-id.mjs";
import { isPortalApiPath } from "../../js/server/portal-api-paths.mjs";
import { applyCatalogGate, catalogCard, questReadDecision } from "../../js/server/cloud-gate.mjs";
import { fetchObjectQuestCatalog, questsBucketFromEnv, questsObjectPrefixFromEnv } from "../../js/server/quest-object-storage.mjs";
import { fetchRemoteQuestCatalog, DEFAULT_QUESTS_REMOTE_URL } from "../../js/quests-remote.mjs";
import { sanitizeUsername, publicInventorPage } from "../../js/server/profile.mjs";
import { portfolioFromTechIdLists, publicPortfolio } from "../../js/sim/portfolio.js";
import { rankPlayers, rankBoard, attachBoardExtras, questHasLeaderboard } from "../../js/server/quest-board.mjs";
import { planSlugsFromEnv, subscriptionEntitled } from "../../js/server/ai-quota.mjs";
import { parseCardPath, renderCollectorCardPage, collectorImageHeaders } from "../../js/server/collector-cards.mjs";
import { renderCollectorCardShare, SHARE_RENDER_VERSION } from "../../js/server/collector-card-share.mjs";
import { cloudCorsOriginsFromEnv, cloudOriginAllowed, validPortalCorsOrigin } from "../../js/cloud/portal-origin.js";

const SCORE_SELECT = `SELECT q.clerk_user_id, q.quest_id, q.run_id, q.year_reached, q.start_year,
  q.stars, q.waits, q.place, q.stack, q.pathway_text,
  NULLIF(BTRIM(u.display_name), '') AS profile_display_name
  FROM quest_scores q LEFT JOIN users u ON u.clerk_user_id = q.clerk_user_id`;
const json = (body, status = 200, headers = {}) => Response.json(body, {
  status, headers: { "Cache-Control": "no-store", ...headers },
});

function scoreRow(row) {
  const chosen = row.profile_display_name || null;
  return {
    clerkUserId: row.clerk_user_id, questId: row.quest_id, runId: row.run_id,
    yearReached: row.year_reached, startYear: row.start_year,
    stars: row.stars, waits: row.waits, displayName: chosen || "Inventor",
    hasDisplayName: Boolean(chosen), place: row.place,
    stack: Array.isArray(row.stack) ? row.stack : [], pathwayText: row.pathway_text || "",
  };
}
function decodeSegment(raw) {
  try { return decodeURIComponent(raw); } catch { return null; }
}
function cardMissing() {
  return new Response("<!DOCTYPE html><title>Card not found</title><p>This collector card is not available.</p>", {
    status: 404, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export function createPublicRoutes({ env = process.env, db, verifyClerk, loadCatalog, renderShare = renderCollectorCardShare } = {}) {
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
  const clerkOn = Boolean((env.CLERK_SECRET_KEY || env.FF_CLERK_SECRET_KEY) &&
    (env.CLERK_PUBLISHABLE_KEY || env.FF_CLERK_PUBLISHABLE_KEY));
  const publishableKey = env.CLERK_PUBLISHABLE_KEY || env.FF_CLERK_PUBLISHABLE_KEY;
  const verify = verifyClerk || ((token) => verifyToken(token, {
    secretKey: env.CLERK_SECRET_KEY || env.FF_CLERK_SECRET_KEY,
    authorizedParties: authorizedPartiesFromEnv(env),
  }));
  const allowedOrigins = cloudCorsOriginsFromEnv(env);
  const publicOrigin = validPortalCorsOrigin(String(env.FF_PUBLIC_ORIGIN || "").replace(/\/$/, ""))
    ? String(env.FF_PUBLIC_ORIGIN).replace(/\/$/, "") : "https://cloud.warmersun.com";
  async function identity(request) {
    const token = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
    const ident = { enabled: clerkOn, signedIn: false };
    if (!clerkOn || !token || !isJwtShaped(token)) return ident;
    try {
      // The game exchanges Clerk's short-lived token for a signed portal session.
      // Route it through the same HMAC/expiry checks as the legacy portal, never Clerk verification.
      const claims = isGameSessionToken(token) ? verifyGameSessionToken(token, env) : await verify(token);
      const userId = normalizeClerkUserId(claims?.sub);
      return userId ? { ...ident, signedIn: true, userId } : ident;
    } catch { return ident; }
  }
  async function catalog(force) {
    if (loadCatalog) return loadCatalog({ force });
    // Functions have no legacy QUESTS_DIR to scan. The private bucket must hold
    // the complete official catalog; do not merge/fall back to the public site.
    const bucket = questsBucketFromEnv(env);
    if (bucket) return fetchObjectQuestCatalog({ bucket, prefix: questsObjectPrefixFromEnv(env), force });
    const configured = env.FF_QUESTS_REMOTE_URL;
    const remoteUrl = configured === undefined ? DEFAULT_QUESTS_REMOTE_URL : String(configured).trim();
    return fetchRemoteQuestCatalog(remoteUrl && !/^(0|off|false)$/i.test(remoteUrl) ? remoteUrl : null,
      { force, tryFallbacks: false });
  }
  async function entitled(ident, cx) {
    if (!ident.signedIn || !cx) return false;
    try {
      const got = await cx.query("SELECT status, plan_slug, period_end FROM subscriptions WHERE clerk_user_id = $1", [ident.userId]);
      const sub = got.rows[0];
      return subscriptionEntitled({ status: sub?.status, planSlug: sub?.plan_slug,
        periodEnd: sub?.period_end, allowedSlugs: planSlugsFromEnv(env) });
    } catch { return false; }
  }
  async function handle(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const origin = request.headers.get("origin");
    // Collector images are public and carry wildcard CORS on the legacy portal.
    if (origin && !path.startsWith("/card/") && !cloudOriginAllowed(origin, env, allowedOrigins))
      return json({ ok: false, error: "origin_forbidden" }, 403);
    const cors = origin ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {};
    const reply = (body, status = 200) => json(body, status, cors);
    // No broad OPTIONS acceptance for paths not owned by this slice.
    const owned = path === "/api/quests" || path.startsWith("/api/quests/") ||
      path.startsWith("/api/u/") || path === "/api/board" || path.startsWith("/api/board/") ||
      path.startsWith("/card/");
    if (!owned || (path.startsWith("/api/") && !isPortalApiPath(path)))
      return reply({ ok: false, error: "not_found", service: "portal" }, 404);
    const isCard = path.startsWith("/card/");
    if (request.method === "OPTIONS" && !isCard) return new Response(null, { status: 204,
      headers: { ...cors, "Cache-Control": "no-store", "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type" } });
    if (request.method !== "GET" && !(isCard && request.method === "HEAD"))
      return json({ ok: false, error: "method_not_allowed" }, 405, { ...cors, Allow: isCard ? "GET, HEAD" : "GET" });
    if (isCard) {
      const parsed = parseCardPath(path);
      if (!parsed || parsed.invalid) return cardMissing();
      const cx = database();
      if (!cx) return reply({ ok: false, error: "db_unavailable" }, 503);
      try {
        if (parsed.image || parsed.share) {
          const got = await cx.query(`SELECT image, content_type, tech_id, updated_at FROM collector_cards
            WHERE id = $1 AND published = true AND image IS NOT NULL AND byte_len > 0`, [parsed.id]);
          const img = got.rows[0];
          if (!img?.image) return reply({ ok: false, error: "not_found" }, 404);
          const bytes = parsed.share ? await renderShare({ id: parsed.id, techId: img.tech_id,
            bytes: img.image, updatedAt: img.updated_at }) : Buffer.from(img.image);
          const stamp = img.updated_at ? new Date(img.updated_at).toISOString() : parsed.id;
          const etag = parsed.share ? `W/"share-v${SHARE_RENDER_VERSION}-${stamp}"` : `W/"${stamp}"`;
          if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304,
            headers: { ETag: etag, "Cache-Control": "public, max-age=86400" } });
          return new Response(request.method === "HEAD" ? null : bytes, { status: 200,
            headers: collectorImageHeaders(bytes.length, { contentType: parsed.share ? "image/jpeg" : img.content_type || "image/jpeg", etag }) });
        }
        const got = await cx.query(`SELECT id, tech_id, title, description, body, links, content_type, byte_len, published, updated_at
          FROM collector_cards WHERE id = $1 AND published = true`, [parsed.id]);
        if (!got.rows[0]) return cardMissing();
        const r = got.rows[0];
        const html = renderCollectorCardPage({ id: r.id, techId: r.tech_id, title: r.title,
          description: r.description, body: r.body, links: r.links }, {
          origin: publicOrigin, portalUiUrl: env.FF_PORTAL_UI_URL, publishableKey, clerkEnabled: clerkOn,
          collectNow: url.searchParams.get("collect") === "1",
        });
        return new Response(request.method === "HEAD" ? null : html, { status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8", "Content-Length": String(Buffer.byteLength(html)), "Cache-Control": "no-store" } });
      } catch { return reply({ ok: false, error: "card_failed" }, 500); }
    }
    if (path === "/api/quests" || path.startsWith("/api/quests/")) {
      try {
        const ident = await identity(request);
        const remote = await catalog(url.searchParams.get("refresh") === "1");
        // A failed private catalog must not fall back to a public catalog or claim an empty success.
        if (!remote?.ok) return reply({ ok: false, error: "quests_scan_failed" }, 503);
        const cx = database();
        const paid = await entitled(ident, cx);
        const quests = remote.quests || [];
        const rawId = url.searchParams.get("id") || (path !== "/api/quests/" && path.startsWith("/api/quests/")
          ? decodeSegment(path.slice("/api/quests/".length)) : "");
        if (rawId === null) return reply({ ok: false, error: "not_found" }, 404);
        const id = String(rawId || "").trim();
        if (id) {
          const tile = quests.find((q) => q.id === id);
          if (!tile) return reply({ ok: false, error: "not_found", id }, 404);
          const decision = questReadDecision(tile, ident, { entitled: paid });
          if (!decision.allow) return reply({ ok: false, error: decision.error, id,
            tile: catalogCard(tile), ...(decision.status === 402 ? { subscribeUrl: "https://warmersun.com/portal/subscribe" } : {}) }, decision.status);
          return reply({ ok: true, tile });
        }
        const gated = quests.map((q) => applyCatalogGate(q, ident, { entitled: paid }));
        // No local filesystem catalog exists in this Function. Preserve the legacy
        // response shape while serving only bucket/remote entries through the gate.
        return reply({ ok: true, dir: null, remoteUrl: remote.url, remoteOk: remote.ok,
          remoteCached: Boolean(remote.cached), local: [], remote: gated, count: quests.length,
          quests: gated, errors: remote.errors || [] });
      } catch (error) {
        // Only the error class/code belongs in logs; SDK errors may contain credentials or object URLs.
        console.error("[quest catalog]", error?.name || "Error", error?.code || "unknown");
        return reply({ ok: false, error: "quests_scan_failed" }, 500);
      }
    }
    const cx = database();
    if (!cx) return reply({ ok: false, error: "db_unavailable" }, 503);
    if (path.startsWith("/api/u/")) {
      const slug = sanitizeUsername(decodeSegment(path.slice(7)));
      if (!slug) return reply({ ok: false, error: "not_found" }, 404);
      try {
        const got = await cx.query(`SELECT clerk_user_id, username, display_name, bio, is_public
          FROM users WHERE username = $1 AND is_public = true`, [slug]);
        const r = got.rows[0];
        if (!r) return reply({ ok: false, error: "not_found" }, 404);
        let lists = [];
        try {
          const result = await cx.query(`SELECT tech_ids FROM runs WHERE clerk_user_id = $1
            AND outcome IN ('hold','partial') ORDER BY ended_at ASC NULLS LAST`, [r.clerk_user_id]);
          lists = result.rows.map((v) => Array.isArray(v.tech_ids) ? v.tech_ids.map(String) : []);
        } catch { /* portfolio is optional on the legacy route */ }
        const holds = await cx.query(`SELECT quest_id, place, year_reached, kind FROM runs
          WHERE clerk_user_id = $1 AND share = true AND outcome IN ('hold','partial')
          ORDER BY ended_at DESC NULLS LAST LIMIT 8`, [r.clerk_user_id]);
        const profile = publicInventorPage({ clerkUserId: r.clerk_user_id, username: r.username,
          displayName: r.display_name, bio: r.bio, isPublic: r.is_public }, holds.rows,
          publicPortfolio(portfolioFromTechIdLists(lists)));
        return reply({ ok: true, profile });
      } catch { return reply({ ok: false, error: "profile_failed" }, 500); }
    }
    if (path === "/api/board" || path === "/api/board/") {
      try {
        const ident = await identity(request);
        const got = await cx.query(SCORE_SELECT);
        return reply({ ok: true, ...rankPlayers(got.rows.map(scoreRow), { userId: ident.signedIn ? ident.userId : null }) });
      } catch { return reply({ ok: false, error: "board_failed" }, 500); }
    }
    const m = /^\/api\/board\/([^/]+)(?:\/still\/([^/]+))?$/.exec(path);
    const qid = m ? decodeSegment(m[1]) : null;
    const stillUser = m?.[2] ? decodeSegment(m[2]) : null;
    if (!qid || !questHasLeaderboard(qid)) return reply({ ok: false, error: "no_board" }, 404);
    try {
      if (m[2]) {
        const uid = normalizeClerkUserId(stillUser);
        if (!uid) return reply({ ok: false, error: "no_still" }, 404);
        const got = await cx.query(`SELECT bytes, content_type FROM quest_stills
          WHERE quest_id = $1 AND clerk_user_id = $2`, [qid, uid]);
        const still = got.rows[0];
        if (!still?.bytes) return reply({ ok: false, error: "no_still" }, 404);
        return new Response(still.bytes, { status: 200, headers: { "Content-Type": still.content_type || "image/jpeg" } });
      }
      const ident = await identity(request);
      const [scores, stills] = await Promise.all([
        cx.query(`${SCORE_SELECT} WHERE q.quest_id = $1`, [qid]),
        cx.query("SELECT clerk_user_id FROM quest_stills WHERE quest_id = $1", [qid]),
      ]);
      const rows = scores.rows.map(scoreRow);
      const board = attachBoardExtras(rankBoard(rows, { userId: ident.signedIn ? ident.userId : null }),
        stills.rows.map((r) => r.clerk_user_id), rows);
      return reply({ ok: true, questId: qid, top: board.top, you: board.you });
    } catch { return reply({ ok: false, error: "board_failed" }, 500); }
  }
  return { fetch: handle };
}

export default createPublicRoutes();

// Quest leaderboard writes and public report for a Neon Request/Response caller.
// The caller verifies Clerk and supplies identity; never derive identity from headers.
import pg from "pg";
import { attachDatabasePool } from "@neon/functions";
import { normalizeClerkUserId } from "../../js/server/clerk-id.mjs";
import { cloudWriteGate } from "../../js/server/cloud-save.mjs";
import { chosenDisplayName, parseReportBody } from "../../js/server/profile.mjs";
import {
  parseQuestScoreBody, bindQuestScoreFromRun, isBetterScore, rankBoard,
  questHasLeaderboard, STILL_MAX_BYTES, STILL_TOP_K,
} from "../../js/server/quest-board.mjs";
import { fetchObjectQuestCatalog, questsBucketFromEnv, questsObjectPrefixFromEnv } from "../../js/server/quest-object-storage.mjs";
import { fetchRemoteQuestCatalog, DEFAULT_QUESTS_REMOTE_URL } from "../../js/quests-remote.mjs";

const SCORE_SELECT = `SELECT q.clerk_user_id, q.quest_id, q.run_id, q.year_reached, q.start_year,
  q.stars, q.waits, q.place, q.stack, q.pathway_text,
  NULLIF(BTRIM(u.display_name), '') AS profile_display_name
  FROM quest_scores q LEFT JOIN users u ON u.clerk_user_id = q.clerk_user_id
  WHERE q.quest_id = $1`;
const TOP_SELECT = `SELECT clerk_user_id FROM quest_scores WHERE quest_id = $1
  ORDER BY (COALESCE(stars, 0)::double precision /
    GREATEST(1, COALESCE(year_reached, 0) - COALESCE(start_year, year_reached, 0))) DESC NULLS LAST,
    waits ASC NULLS LAST, submitted_at ASC LIMIT $2`;
const reply = (body, status = 200) => Response.json(body, {
  status, headers: { "Cache-Control": "no-store" },
});
function scoreRow(row) {
  const chosen = row.profile_display_name || null;
  return {
    clerkUserId: row.clerk_user_id, questId: row.quest_id, runId: row.run_id,
    yearReached: row.year_reached, startYear: row.start_year, stars: row.stars,
    waits: row.waits, displayName: chosen || "Inventor", hasDisplayName: Boolean(chosen),
    place: row.place, stack: Array.isArray(row.stack) ? row.stack : [], pathwayText: row.pathway_text || "",
  };
}
async function boundedBytes(request, max) {
  const declared = request.headers.get("content-length");
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > max)) {
    throw Object.assign(new Error("payload_too_large"), { status: 413 });
  }
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  let size = 0;
  const chunks = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      throw Object.assign(new Error("payload_too_large"), { status: 413 });
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}
async function jsonBody(request, max) {
  const raw = (await boundedBytes(request, max)).toString("utf8");
  if (!raw) return {};
  try { return JSON.parse(raw); }
  catch { throw Object.assign(new Error("invalid_json"), { status: 400 }); }
}
async function transaction(db, work) {
  const cx = await db.connect();
  try {
    await cx.query("BEGIN");
    const value = await work(cx);
    await cx.query("COMMIT");
    return value;
  } catch (e) {
    try { await cx.query("ROLLBACK"); } catch { /* original error wins */ }
    throw e;
  } finally { cx.release(); }
}
async function topIds(cx, questId) {
  return (await cx.query(TOP_SELECT, [questId, STILL_TOP_K])).rows.map((r) => r.clerk_user_id);
}
async function evict(cx, questId, keep) {
  if (keep.length) await cx.query(
    "DELETE FROM quest_stills WHERE quest_id = $1 AND NOT (clerk_user_id = ANY($2::text[]))", [questId, keep]);
  else await cx.query("DELETE FROM quest_stills WHERE quest_id = $1", [questId]);
}

/** db is a pg Pool-like object; identity is a verified caller result. */
export function createQuestWriteRoutes({ db, env = process.env, loadCatalog, fetchImpl, readObjectText, logger = console } = {}) {
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
  async function catalog() {
    if (loadCatalog) return loadCatalog();
    // Match public reads: a configured private bucket is authoritative, even
    // when it fails. Never merge it with or fall back to the public catalog.
    const bucket = questsBucketFromEnv(env);
    if (bucket) return fetchObjectQuestCatalog({
      bucket, prefix: questsObjectPrefixFromEnv(env), readText: readObjectText,
    });
    const configured = env.FF_QUESTS_REMOTE_URL;
    const remoteUrl = configured === undefined ? DEFAULT_QUESTS_REMOTE_URL : String(configured).trim();
    return fetchRemoteQuestCatalog(remoteUrl && !/^(0|off|false)$/i.test(remoteUrl) ? remoteUrl : null,
      { tryFallbacks: false, fetchImpl });
  }
  async function catalogYear(questId) {
    try {
      const loaded = await catalog();
      // Remote helpers may return stale cached quests on failure, including
      // another URL's catalog. Those are not authoritative for this source.
      if (loaded?.ok === false) return null;
      // A missing catalog must not license a client-supplied start year.
      const tile = loaded?.quests?.find((q) => q.id === questId);
      return tile?.mission?.startYear ?? tile?.startYear ?? null;
    } catch { return null; }
  }
  return {
    async fetch(request, identity) {
      const path = new URL(request.url).pathname;
      const m = /^\/api\/me\/quests\/([^/]+)\/(score|still)$/.exec(path);
      const report = path === "/api/report";
      if (!m && !report) return null;
      const method = report ? "POST" : m[2] === "score" ? "POST" : "PUT";
      if (request.method !== method) return reply({ ok: false, error: "method_not_allowed", service: "portal" }, 405);
      if (report) {
        try {
          const parsed = parseReportBody(await jsonBody(request, 4_000));
          if (!parsed.ok) return reply({ ok: false, error: parsed.error }, 400);
          logger.warn("[cloud report]", parsed.username || parsed.questId, parsed.reason.slice(0, 80));
          return reply({ ok: true });
        } catch (e) { return reply({ ok: false, error: "report_failed" }, e?.status || 500); }
      }
      let questId;
      try { questId = decodeURIComponent(m[1]); }
      catch { return null; }
      const cx = database();
      const gate = cloudWriteGate(identity ?? { enabled: true, missingToken: true }, { dbEnabled: Boolean(cx) });
      const uid = normalizeClerkUserId(gate.userId);
      if (!gate.ok || !uid || uid !== gate.userId) return reply({
        ok: false, error: gate.ok ? "invalid_token" : gate.error, clerk: identity?.enabled !== false,
      }, gate.ok ? 401 : gate.status);
      const failure = m[2] === "score" ? "score_failed" : "still_failed";
      if (m[2] === "still" && !questHasLeaderboard(questId)) return reply({ ok: false, error: "no_board" }, 400);
      try {
        if (m[2] === "score") {
          const parsed = parseQuestScoreBody(await jsonBody(request, 16_000), questId);
          if (!parsed.ok) return reply({ ok: false, error: parsed.error }, 400);
          const owned = (await cx.query(`SELECT quest_id, outcome, year_reached, stars, waits, place
            FROM runs WHERE id = $1::uuid AND clerk_user_id = $2`, [parsed.row.runId, uid])).rows[0];
          const bound = bindQuestScoreFromRun(parsed, owned, { startYear: await catalogYear(questId) });
          if (!bound.ok) return reply({ ok: false, error: bound.error }, 400);
          const profile = (await cx.query("SELECT display_name FROM users WHERE clerk_user_id = $1", [uid])).rows[0];
          const displayName = chosenDisplayName(profile);
          if (!displayName) return reply({ ok: false, error: "display_name_required" }, 400);
          const result = await transaction(cx, async (tx) => {
            // Serialize mutations to a quest so rank-based still eviction is consistent.
            await tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`quest-stills:${questId}`]);
            await tx.query(`INSERT INTO users (clerk_user_id) VALUES ($1)
              ON CONFLICT (clerk_user_id) DO UPDATE SET last_seen_at = now()`, [uid]);
            const prev = (await tx.query(`SELECT year_reached, start_year, stars, waits FROM quest_scores
              WHERE clerk_user_id = $1 AND quest_id = $2 FOR UPDATE`, [uid, questId])).rows[0];
            const stored = !prev || isBetterScore(bound.row, prev);
            if (stored) await tx.query(`INSERT INTO quest_scores
              (clerk_user_id, quest_id, run_id, year_reached, start_year, stars, waits,
               display_name, place, stack, pathway_text)
              VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
              ON CONFLICT (clerk_user_id, quest_id) DO UPDATE SET
                run_id = EXCLUDED.run_id, year_reached = EXCLUDED.year_reached,
                start_year = EXCLUDED.start_year, stars = EXCLUDED.stars,
                waits = EXCLUDED.waits, display_name = EXCLUDED.display_name,
                place = EXCLUDED.place, stack = EXCLUDED.stack,
                pathway_text = EXCLUDED.pathway_text, submitted_at = now()`,
              [uid, questId, bound.row.runId, bound.row.yearReached, bound.row.startYear,
                bound.row.stars, bound.row.waits, displayName, bound.row.place,
                bound.row.stack, bound.row.pathwayText]);
            const keep = await topIds(tx, questId);
            await evict(tx, questId, keep);
            const rows = (await tx.query(SCORE_SELECT, [questId])).rows.map(scoreRow);
            return { stored, kept: !stored, rank: rankBoard(rows, { userId: uid }).you?.rank || null,
              inTopStills: keep.includes(uid) };
          });
          return reply({ ok: true, ...result });
        }
        const buf = await boundedBytes(request, STILL_MAX_BYTES);
        if (!buf.length) return reply({ ok: false, error: "empty_still" }, 400);
        const result = await transaction(cx, async (tx) => {
          await tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`quest-stills:${questId}`]);
          const keep = await topIds(tx, questId);
          if (!keep.includes(uid)) return { ok: true, stored: false, reason: "not_top" };
          const ctype = (request.headers.get("content-type") || "image/jpeg").split(";")[0].trim().slice(0, 80) || "image/jpeg";
          await tx.query(`INSERT INTO quest_stills (quest_id, clerk_user_id, bytes, content_type, byte_len)
            VALUES ($1,$2,$3,$4,$5) ON CONFLICT (quest_id, clerk_user_id) DO UPDATE SET
              bytes = EXCLUDED.bytes, content_type = EXCLUDED.content_type, byte_len = EXCLUDED.byte_len`,
            [questId, uid, buf, ctype, buf.length]);
          await evict(tx, questId, keep);
          return { ok: true, stored: true };
        });
        return reply(result);
      } catch (e) {
        logger.warn(`[quest ${m[2]}]`, e?.message || e);
        return reply({ ok: false, error: failure }, e?.status || 500);
      }
    },
  };
}

export default createQuestWriteRoutes();

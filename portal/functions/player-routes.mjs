// Authenticated player-data slice for Neon Functions. The caller MUST verify
// Clerk and pass the resulting identity separately; request headers are never
// interpreted as identity here. Return null for paths this slice does not own.
import { normalizeClerkUserId } from "../../js/server/clerk-id.mjs";
import { cloudWriteGate, parseImportBody, sanitizeLastRun } from "../../js/server/cloud-save.mjs";
import { parseRunsQuery, parseStartBody, publicRunRow } from "../../js/server/quest-log.mjs";
import { parseShareBody, parseProfilePatch, profileNeedsDisplayName } from "../../js/server/profile.mjs";
import { sanitizePinList } from "../../js/server/pins.mjs";
import { parseRunStateBody, RUN_STATE_MAX_BYTES } from "../../js/server/run-state.mjs";
import { achievementCatalog, publicAchievement, awardForRun } from "../../js/server/achievements.mjs";
import { computeStreak, sanitizeTimeZone } from "../../js/server/streaks.mjs";
import { portfolioFromTechIdLists, publicPortfolio } from "../../js/sim/portfolio.js";

const routes = new Map([
  ["/api/me/import", ["POST", 32_000]],
  ["/api/me/runs", ["GET", "POST", 16_000]],
  ["/api/me/runs/start", ["POST", 8_000]],
  ["/api/me/runs/share", ["POST", 4_000]],
  ["/api/me/pins", ["GET", "PUT", 48_000]],
  ["/api/me/run-state", ["GET", "PUT", RUN_STATE_MAX_BYTES]],
  ["/api/me/profile", ["GET", "PUT", 8_000]],
  ["/api/me/achievements", ["GET"]],
]);
const RUN_SELECT = `SELECT id, quest_id, kind, outcome, stars, year_reached, waits, place,
  tech_ids, started_at, ended_at, imported, created_at FROM runs WHERE clerk_user_id = $1`;
const PROFILE_SELECT = `SELECT clerk_user_id, username, display_name, bio, is_public, hide_email, time_zone
  FROM users WHERE clerk_user_id = $1`;

function reply(body, status = 200, headers = {}) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}
function profile(row) {
  return row ? {
    clerkUserId: row.clerk_user_id, username: row.username || null,
    displayName: row.display_name || null, bio: row.bio || "",
    isPublic: Boolean(row.is_public), hideEmail: row.hide_email !== false,
    timeZone: row.time_zone || null,
  } : null;
}
async function getProfile(db, uid) {
  return profile((await db.query(PROFILE_SELECT, [uid])).rows[0]);
}
async function portfolio(db, uid) {
  const rows = (await db.query(`SELECT tech_ids FROM runs WHERE clerk_user_id = $1
    AND outcome IN ('hold','partial') ORDER BY ended_at ASC NULLS LAST`, [uid])).rows;
  return publicPortfolio(portfolioFromTechIdLists(rows.map((r) => Array.isArray(r.tech_ids) ? r.tech_ids.map(String) : [])));
}
async function ensureUser(db, uid) {
  await db.query(`INSERT INTO users (clerk_user_id) VALUES ($1)
    ON CONFLICT (clerk_user_id) DO UPDATE SET last_seen_at = now()`, [uid]);
}
async function transaction(db, fn) {
  const cx = await db.connect();
  try {
    await cx.query("BEGIN");
    const result = await fn(cx);
    await cx.query("COMMIT");
    return result;
  } catch (e) {
    try { await cx.query("ROLLBACK"); } catch { /* preserve original failure */ }
    throw e;
  } finally { cx.release(); }
}
async function readJson(request, max) {
  const declared = request.headers.get("content-length");
  if (declared !== null && Number(declared) > max) throw Object.assign(new Error("large"), { status: 413 });
  if (!/^application\/json(?:\s*;|\s*$)/i.test(request.headers.get("content-type") || "")) {
    throw Object.assign(new Error("json_required"), { status: 400 });
  }
  const reader = request.body?.getReader();
  if (!reader) return {};
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      throw Object.assign(new Error("large"), { status: 413 });
    }
    chunks.push(Buffer.from(value));
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); }
  catch { throw Object.assign(new Error("invalid_json"), { status: 400 }); }
}
async function putRunRow(cx, uid, run, imported) {
  let row;
  if (!imported && run.id) {
    const updated = await cx.query(`UPDATE runs SET quest_id = $3, kind = $4, outcome = $5,
      stars = $6, year_reached = $7, waits = $8, place = $9, tech_ids = $10, ended_at = now()
      WHERE id = $1::uuid AND clerk_user_id = $2 RETURNING id`,
      [run.id, uid, run.questId, run.kind, run.outcome, run.stars, run.yearReached, run.waits, run.place, run.techIds]);
    row = updated.rows[0];
  }
  if (!row) {
    const inserted = await cx.query(`INSERT INTO runs
      (clerk_user_id, quest_id, kind, outcome, stars, year_reached, waits, place, imported, started_at, tech_ids)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,now(),$10) RETURNING id`,
      [uid, run.questId, run.kind, run.outcome, run.stars, run.yearReached, run.waits, run.place, imported, run.techIds]);
    row = inserted.rows[0];
  }
  if (run.outcome === "hold" || run.outcome === "partial") {
    await cx.query(`INSERT INTO solved_quests (clerk_user_id, quest_id, source)
      VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`, [uid, run.questId, imported ? "import" : "play"]);
  }
  return row?.id || null;
}
async function awardBasic(cx, uid, run, runId) {
  // Only deterministic run-derived awards. Catalog/sponsor, toolkit, founding and
  // streak awards need separate parity wiring; never trust client award claims.
  const have = (await cx.query("SELECT code FROM achievements WHERE clerk_user_id = $1", [uid])).rows.map((r) => r.code);
  const codes = awardForRun(run, { already: have });
  if (codes.length) await cx.query(`INSERT INTO achievements (clerk_user_id, code, run_id)
    SELECT $1, x, $3::uuid FROM unnest($2::text[]) AS x ON CONFLICT DO NOTHING`, [uid, codes, runId]);
  return codes.map((c) => publicAchievement(c)).filter(Boolean);
}

/** db is a pg Pool-like object; identity must be a *verified* parent result. */
export function createPlayerRoutes({ db } = {}) {
  return {
    async fetch(request, identity) {
      const path = new URL(request.url).pathname;
      const spec = routes.get(path);
      if (!spec) return null;
      const methods = spec.filter((x) => typeof x === "string");
      if (!methods.includes(request.method)) return reply({ ok: false, error: "method_not_allowed" }, 405, { Allow: methods.join(", ") });
      const gate = cloudWriteGate(identity ?? { enabled: true, missingToken: true }, { dbEnabled: Boolean(db) });
      const uid = normalizeClerkUserId(gate.userId);
      if (!gate.ok || !uid || uid !== gate.userId) {
        return reply({ ok: false, error: gate.ok ? "invalid_token" : gate.error, clerk: identity?.enabled !== false }, gate.ok ? 401 : gate.status);
      }
      try {
        const url = new URL(request.url);
        const body = methods.length && !["GET"].includes(request.method) ? await readJson(request, spec.find((x) => typeof x === "number")) : null;
        if (path === "/api/me/runs" && request.method === "GET") {
          const { kind, outcome, limit } = parseRunsQuery(url.searchParams);
          const args = [uid];
          let sql = RUN_SELECT;
          if (kind) { args.push(kind); sql += ` AND kind = $${args.length}`; }
          if (outcome) { args.push(outcome); sql += ` AND outcome = $${args.length}`; }
          args.push(limit);
          const rows = (await db.query(sql + ` ORDER BY COALESCE(ended_at, started_at, created_at) DESC LIMIT $${args.length}`, args)).rows;
          return reply({ ok: true, runs: rows.map(publicRunRow).filter(Boolean) });
        }
        if (path === "/api/me/runs/start") {
          const run = parseStartBody(body);
          if (!run) return reply({ ok: false, error: "invalid_run" }, 400);
          const id = await transaction(db, async (cx) => {
            await ensureUser(cx, uid);
            return (await cx.query(`INSERT INTO runs (clerk_user_id, quest_id, kind, outcome, place, started_at, imported)
              VALUES ($1,$2,$3,NULL,$4,now(),false) RETURNING id`, [uid, run.questId, run.kind, run.place])).rows[0]?.id || null;
          });
          return reply({ ok: true, stored: true, id });
        }
        if (path === "/api/me/runs" && request.method === "POST") {
          const run = sanitizeLastRun(body?.run || body);
          if (!run) return reply({ ok: false, error: "invalid_run" }, 400);
          const result = await transaction(db, async (cx) => {
            await ensureUser(cx, uid);
            const id = await putRunRow(cx, uid, run, false);
            return { id, unlocked: await awardBasic(cx, uid, run, id) };
          });
          return reply({ ok: true, stored: true, id: result.id, questId: run.questId, unlocked: result.unlocked });
        }
        if (path === "/api/me/import") {
          const parsed = parseImportBody(body);
          const result = await transaction(db, async (cx) => {
            await ensureUser(cx, uid);
            const inserted = parsed.solvedIds.length ? (await cx.query(`INSERT INTO solved_quests (clerk_user_id, quest_id, source)
              SELECT $1, x, 'import' FROM unnest($2::text[]) AS x ON CONFLICT DO NOTHING`, [uid, parsed.solvedIds])).rowCount || 0 : 0;
            const count = (await cx.query("SELECT COUNT(*)::int AS n FROM runs WHERE clerk_user_id = $1", [uid])).rows[0]?.n || 0;
            const lastRunStored = Boolean(parsed.lastRun && Number(count) === 0);
            const lastRunId = lastRunStored ? await putRunRow(cx, uid, parsed.lastRun, true) : null;
            const unlocked = lastRunStored ? await awardBasic(cx, uid, parsed.lastRun, lastRunId) : [];
            const solvedIds = (await cx.query("SELECT quest_id FROM solved_quests WHERE clerk_user_id = $1 ORDER BY first_solved_at ASC", [uid])).rows.map((r) => String(r.quest_id));
            return { inserted, total: solvedIds.length, lastRunStored, lastRunId, solvedIds, unlocked };
          });
          return reply({ ok: true, ...result });
        }
        if (path === "/api/me/runs/share") {
          const parsed = parseShareBody(body);
          if (!parsed.ok) return reply({ ok: false, error: parsed.error }, 400);
          const r = await db.query("UPDATE runs SET share = $3 WHERE id = $1::uuid AND clerk_user_id = $2 RETURNING id", [parsed.runId, uid, parsed.share]);
          return reply({ ok: true, stored: Boolean(r.rowCount) });
        }
        if (path === "/api/me/pins") {
          if (request.method === "GET") {
            const rows = (await db.query(`SELECT slot, mission_id, global_id, title, place, global_title, pinned_at, snapshot
              FROM pins WHERE clerk_user_id = $1 ORDER BY slot ASC`, [uid])).rows;
            return reply({ ok: true, pins: rows.map((r) => ({ missionId: r.mission_id, globalId: r.global_id, title: r.title,
              place: r.place, globalTitle: r.global_title, pinnedAt: r.pinned_at, missionSnapshot: r.snapshot })) });
          }
          const pins = sanitizePinList(body);
          await transaction(db, async (cx) => {
            await ensureUser(cx, uid);
            await cx.query("DELETE FROM pins WHERE clerk_user_id = $1", [uid]);
            for (const [index, p] of pins.entries()) await cx.query(`INSERT INTO pins
              (clerk_user_id, slot, mission_id, global_id, title, place, global_title, snapshot)
              VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`, [uid, index + 1, p.missionId, p.globalId, p.title, p.place, p.globalTitle,
                p.missionSnapshot ? JSON.stringify(p.missionSnapshot) : null]);
          });
          return reply({ ok: true, pins });
        }
        if (path === "/api/me/run-state") {
          if (request.method === "GET") {
            const r = (await db.query(`SELECT run_id, quest_id, year_reached, tutor, board, play, chats, updated_at
              FROM run_state WHERE clerk_user_id = $1`, [uid])).rows[0];
            return reply({ ok: true, state: r ? { runId: r.run_id, questId: r.quest_id, year: r.year_reached,
              tutor: Boolean(r.tutor), board: r.board, play: r.play || null, chats: r.chats || null, updatedAt: r.updated_at } : null });
          }
          const parsed = parseRunStateBody(body);
          if (!parsed.ok) return reply({ ok: false, error: parsed.error }, 400);
          await transaction(db, async (cx) => {
            await ensureUser(cx, uid);
            const s = parsed.state;
            await cx.query(`INSERT INTO run_state (clerk_user_id, run_id, quest_id, year_reached, tutor, board, play, chats)
              VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb)
              ON CONFLICT (clerk_user_id) DO UPDATE SET run_id = EXCLUDED.run_id,
              quest_id = EXCLUDED.quest_id, year_reached = EXCLUDED.year_reached,
              tutor = EXCLUDED.tutor, board = EXCLUDED.board, play = EXCLUDED.play,
              chats = EXCLUDED.chats, updated_at = now()`, [uid, s.runId, s.questId, s.year,
                Boolean(s.tutor), s.board ? JSON.stringify(s.board) : null, s.play ? JSON.stringify(s.play) : null,
                s.chats ? JSON.stringify(s.chats) : null]);
          });
          return reply({ ok: true });
        }
        if (path === "/api/me/profile") {
          let p;
          if (request.method === "PUT") {
            const parsed = parseProfilePatch(body);
            if (!parsed.ok) return reply({ ok: false, error: parsed.error }, 400);
            await transaction(db, async (cx) => {
              await ensureUser(cx, uid);
              const columns = { username: "username", displayName: "display_name", bio: "bio", isPublic: "is_public", hideEmail: "hide_email", timeZone: "time_zone" };
              const pairs = Object.entries(parsed.patch);
              if (pairs.length) await cx.query(`UPDATE users SET ${pairs.map(([k], i) => `${columns[k]} = $${i + 2}`).join(", ")}, last_seen_at = now()
                WHERE clerk_user_id = $1`, [uid, ...pairs.map(([, v]) => v)]);
            });
          }
          p = await getProfile(db, uid) || { isPublic: false, username: null, displayName: null };
          let data = publicPortfolio(null);
          try { data = await portfolio(db, uid); } catch { /* profile remains readable */ }
          return reply({ ok: true, profile: p, portfolio: data, needsDisplayName: profileNeedsDisplayName(p) });
        }
        if (path === "/api/me/achievements") {
          const rows = (await db.query(`SELECT code, run_id, unlocked_at FROM achievements
            WHERE clerk_user_id = $1 ORDER BY unlocked_at ASC`, [uid])).rows;
          const achievements = rows.map((r) => publicAchievement(String(r.code), r.unlocked_at)).filter(Boolean);
          let streak = computeStreak([], "UTC");
          try {
            const p = await getProfile(db, uid);
            let zone = p?.timeZone || null;
            if (!zone) {
              const hinted = sanitizeTimeZone(url.searchParams.get("tz"));
              if (hinted) {
                await db.query("UPDATE users SET time_zone = $2, last_seen_at = now() WHERE clerk_user_id = $1", [uid, hinted]);
                zone = hinted;
              }
            }
            const ended = (await db.query(`SELECT ended_at FROM runs WHERE clerk_user_id = $1
              AND outcome IN ('hold','partial') AND ended_at IS NOT NULL
              ORDER BY ended_at DESC LIMIT 2000`, [uid])).rows.map((r) => r.ended_at).filter(Boolean);
            streak = computeStreak(ended, zone);
          } catch { /* badges still return */ }
          return reply({ ok: true, achievements, catalog: achievementCatalog(achievements.map((a) => a.code)), streak });
        }
      } catch (e) {
        const failure = path.includes("run-state") ? "run_state_failed" : path.includes("pins") ? "pins_failed" : path.includes("profile") ? "profile_failed" : path.includes("achievements") ? "achievements_failed" : path.includes("share") ? "share_failed" : path.includes("import") ? "import_failed" : path.includes("start") || path === "/api/me/runs" && request.method === "POST" ? "run_failed" : "runs_failed";
        if (e?.code === "23505" && path === "/api/me/profile") return reply({ ok: false, error: "username_taken" }, 409);
        if (e?.status === 413) return reply({ ok: false, error: failure }, 413);
        if (e?.status === 400) return reply({ ok: false, error: path === "/api/me/import" ? "invalid_json" : failure }, 400);
        return reply({ ok: false, error: failure }, 500);
      }
      return reply({ ok: false, error: "not_found" }, 404);
    },
  };
}

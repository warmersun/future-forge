/**
 * Optional Neon Postgres for Warmer Sun Cloud.
 * Off unless DATABASE_URL is set. No ORM — pg Pool + .sql files.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { normalizeClerkUserId } from "./clerk-auth.mjs";
import {
  sanitizeSolvedIds,
  sanitizeLastRun,
  shouldStoreLastRun,
} from "./cloud-save.mjs";
import { parseStartBody, publicRunRow } from "./quest-log.mjs";

const { Pool, Client } = pg;

const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "db");

const SKIPPED = {
  skipped: true,
  inserted: 0,
  total: 0,
  lastRunStored: false,
  solvedIds: [],
};

/** @type {pg.Pool|null} */
let pool = null;

/**
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} [env]
 */
export function databaseUrl(env = process.env) {
  return String(env.DATABASE_URL || "").trim();
}

/**
 * Unpooled host for DDL when set; else the pooler URL.
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} [env]
 */
export function migrateUrl(env = process.env) {
  return String(env.DATABASE_URL_UNPOOLED || env.DATABASE_URL || "").trim();
}

/**
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} [env]
 */
export function dbEnabled(env = process.env) {
  return Boolean(databaseUrl(env));
}

/**
 * Public health fragment — never the URL.
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} [env]
 */
export function publicDbConfig(env = process.env) {
  return { enabled: dbEnabled(env) };
}

function poolConfig(url) {
  return {
    connectionString: url,
    max: 5,
    ssl: { rejectUnauthorized: true },
  };
}

/**
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} [env]
 * @returns {pg.Pool|null}
 */
export function getPool(env = process.env) {
  const url = databaseUrl(env);
  if (!url) return null;
  if (!pool) pool = new Pool(poolConfig(url));
  return pool;
}

/** Close the singleton pool (tests / shutdown). */
export async function closePool() {
  if (!pool) return;
  const p = pool;
  pool = null;
  await p.end();
}

/**
 * Apply pending js/server/db/*.sql files.
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} [env]
 */
export async function migrate(env = process.env) {
  const url = migrateUrl(env);
  if (!url) return { skipped: true, applied: [] };

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const client = new Client(poolConfig(url));
  await client.connect();
  const applied = [];
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    const done = await client.query("SELECT filename FROM schema_migrations");
    const have = new Set(done.rows.map((r) => r.filename));
    for (const filename of files) {
      if (have.has(filename)) continue;
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, filename), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [
          filename,
        ]);
        await client.query("COMMIT");
        applied.push(filename);
      } catch (e) {
        try {
          await client.query("ROLLBACK");
        } catch {
          /* ignore */
        }
        throw e;
      }
    }
  } finally {
    await client.end();
  }
  return { skipped: false, applied };
}

/**
 * @param {string} clerkUserId
 * @param {pg.Pool|pg.PoolClient} [cx]
 */
export async function ensureUser(clerkUserId, cx) {
  const id = normalizeClerkUserId(clerkUserId);
  if (!id) throw Object.assign(new Error("invalid_user"), { status: 401 });
  const db = cx || getPool();
  if (!db) return { skipped: true };
  await db.query(
    `INSERT INTO users (clerk_user_id) VALUES ($1)
     ON CONFLICT (clerk_user_id) DO UPDATE SET last_seen_at = now()`,
    [id]
  );
  return { skipped: false, clerkUserId: id };
}

/**
 * @param {string} clerkUserId
 * @returns {Promise<string[]>}
 */
export async function listSolvedIds(clerkUserId) {
  const id = normalizeClerkUserId(clerkUserId);
  const db = getPool();
  if (!db || !id) return [];
  const r = await db.query(
    "SELECT quest_id FROM solved_quests WHERE clerk_user_id = $1 ORDER BY first_solved_at ASC",
    [id]
  );
  return r.rows.map((row) => String(row.quest_id));
}

/**
 * Union local solved ids into Neon. lastRun is stored only if the user has no runs.
 * @param {{ clerkUserId: string, solvedIds?: unknown, lastRun?: unknown }} input
 */
export async function importProgress(input) {
  const db = getPool();
  if (!db) return { ...SKIPPED };
  const clerkUserId = normalizeClerkUserId(input?.clerkUserId);
  if (!clerkUserId) throw Object.assign(new Error("invalid_user"), { status: 401 });
  const solvedIds = sanitizeSolvedIds(input?.solvedIds);
  const lastRun = sanitizeLastRun(input?.lastRun);

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await ensureUser(clerkUserId, client);

    let inserted = 0;
    if (solvedIds.length) {
      const ins = await client.query(
        `INSERT INTO solved_quests (clerk_user_id, quest_id, source)
         SELECT $1, x, 'import'
         FROM unnest($2::text[]) AS x
         ON CONFLICT DO NOTHING`,
        [clerkUserId, solvedIds]
      );
      inserted = ins.rowCount || 0;
    }

    const countR = await client.query(
      "SELECT COUNT(*)::int AS n FROM runs WHERE clerk_user_id = $1",
      [clerkUserId]
    );
    const existingRuns = countR.rows[0]?.n || 0;
    let lastRunStored = false;
    let lastRunId = null;
    if (shouldStoreLastRun(existingRuns, lastRun)) {
      const row = await insertRunRow(client, clerkUserId, lastRun, { imported: true });
      lastRunStored = true;
      lastRunId = row.id || null;
    }

    const solvedR = await client.query(
      "SELECT quest_id FROM solved_quests WHERE clerk_user_id = $1 ORDER BY first_solved_at ASC",
      [clerkUserId]
    );
    await client.query("COMMIT");
    const solvedIdsOut = solvedR.rows.map((row) => String(row.quest_id));
    return {
      skipped: false,
      inserted,
      total: solvedIdsOut.length,
      lastRunStored,
      lastRunId,
      solvedIds: solvedIdsOut,
    };
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    throw e;
  } finally {
    client.release();
  }
}

/**
 * @param {{ clerkUserId: string, run?: unknown }} input
 */
export async function insertRun(input) {
  const db = getPool();
  if (!db) return { ...SKIPPED, stored: false };
  const clerkUserId = normalizeClerkUserId(input?.clerkUserId);
  if (!clerkUserId) throw Object.assign(new Error("invalid_user"), { status: 401 });
  const run = sanitizeLastRun(input?.run);
  if (!run) {
    throw Object.assign(new Error("invalid_run"), { status: 400 });
  }
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await ensureUser(clerkUserId, client);
    let row;
    if (run.id) {
      const upd = await client.query(
        `UPDATE runs SET
           quest_id = $3, kind = $4, outcome = $5, stars = $6, year_reached = $7,
           waits = $8, place = $9, tech_ids = $10, ended_at = now()
         WHERE id = $1::uuid AND clerk_user_id = $2
         RETURNING id`,
        [
          run.id,
          clerkUserId,
          run.questId,
          run.kind,
          run.outcome,
          run.stars,
          run.yearReached,
          run.waits,
          run.place,
          run.techIds || [],
        ]
      );
      if (upd.rowCount) {
        row = { id: upd.rows[0].id };
        if (run.outcome === "hold" || run.outcome === "partial") {
          await client.query(
            `INSERT INTO solved_quests (clerk_user_id, quest_id, source)
             VALUES ($1, $2, 'play')
             ON CONFLICT DO NOTHING`,
            [clerkUserId, run.questId]
          );
        }
      }
    }
    if (!row) row = await insertRunRow(client, clerkUserId, run, { imported: false });
    await client.query("COMMIT");
    return { skipped: false, stored: true, id: row.id, questId: run.questId };
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    throw e;
  } finally {
    client.release();
  }
}

/**
 * @param {pg.PoolClient} client
 * @param {string} clerkUserId
 * @param {NonNullable<ReturnType<typeof sanitizeLastRun>>} run
 * @param {{ imported?: boolean }} [opts]
 */
async function insertRunRow(client, clerkUserId, run, opts = {}) {
  const r = await client.query(
    `INSERT INTO runs (
       clerk_user_id, quest_id, kind, outcome, stars, year_reached, waits, place, imported,
       started_at, tech_ids
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, now(), $10)
     RETURNING id`,
    [
      clerkUserId,
      run.questId,
      run.kind,
      run.outcome,
      run.stars,
      run.yearReached,
      run.waits,
      run.place,
      Boolean(opts.imported),
      Array.isArray(run.techIds) ? run.techIds : [],
    ]
  );
  if (run.outcome === "hold" || run.outcome === "partial") {
    await client.query(
      `INSERT INTO solved_quests (clerk_user_id, quest_id, source)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [clerkUserId, run.questId, opts.imported ? "import" : "play"]
    );
  }
  return { id: r.rows[0]?.id || null };
}

/**
 * @param {{ clerkUserId: string, kind?: string|null, outcome?: string|null, limit?: number }} input
 */
export async function listRuns(input) {
  const db = getPool();
  if (!db) return { skipped: true, runs: [] };
  const clerkUserId = normalizeClerkUserId(input?.clerkUserId);
  if (!clerkUserId) return { skipped: false, runs: [] };
  const limit = Math.min(100, Math.max(1, Number(input?.limit) || 50));
  const params = [clerkUserId];
  let sql = `SELECT id, quest_id, kind, outcome, stars, year_reached, waits, place,
                    tech_ids, started_at, ended_at, imported, created_at
             FROM runs WHERE clerk_user_id = $1`;
  if (input?.kind) {
    params.push(input.kind);
    sql += ` AND kind = $${params.length}`;
  }
  if (input?.outcome) {
    params.push(input.outcome);
    sql += ` AND outcome = $${params.length}`;
  }
  params.push(limit);
  sql += ` ORDER BY COALESCE(ended_at, started_at, created_at) DESC LIMIT $${params.length}`;
  const r = await db.query(sql, params);
  return { skipped: false, runs: r.rows.map(publicRunRow).filter(Boolean) };
}

/**
 * @param {{ clerkUserId: string, questId?: unknown, kind?: unknown, place?: unknown }} input
 */
export async function startRun(input) {
  const db = getPool();
  if (!db) return { ...SKIPPED, stored: false, id: null };
  const clerkUserId = normalizeClerkUserId(input?.clerkUserId);
  if (!clerkUserId) throw Object.assign(new Error("invalid_user"), { status: 401 });
  const parsed = parseStartBody(input);
  if (!parsed) throw Object.assign(new Error("invalid_run"), { status: 400 });
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await ensureUser(clerkUserId, client);
    const r = await client.query(
      `INSERT INTO runs (clerk_user_id, quest_id, kind, outcome, place, started_at, imported)
       VALUES ($1,$2,$3,NULL,$4, now(), false)
       RETURNING id`,
      [clerkUserId, parsed.questId, parsed.kind, parsed.place]
    );
    await client.query("COMMIT");
    return { skipped: false, stored: true, id: r.rows[0]?.id || null, questId: parsed.questId };
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    throw e;
  } finally {
    client.release();
  }
}

/**
 * @param {string} clerkUserId
 * @param {string} runId
 */
export async function getRunForUser(clerkUserId, runId) {
  const db = getPool();
  const uid = normalizeClerkUserId(clerkUserId);
  if (!db || !uid || !runId) return null;
    const r = await db.query(
      `SELECT id, quest_id, kind, outcome, stars, year_reached, waits, place FROM runs
     WHERE id = $1::uuid AND clerk_user_id = $2`,
      [runId, uid]
    );
  return r.rows[0] || null;
}

/**
 * @param {string} clerkUserId
 */
export async function deleteUser(clerkUserId) {
  const db = getPool();
  const uid = normalizeClerkUserId(clerkUserId);
  if (!db || !uid) return { deleted: false };
  const r = await db.query("DELETE FROM users WHERE clerk_user_id = $1", [uid]);
  return { deleted: (r.rowCount || 0) > 0 };
}

export async function countUsers() {
  const db = getPool();
  if (!db) return 0;
  const r = await db.query("SELECT COUNT(*)::int AS n FROM users");
  return r.rows[0]?.n || 0;
}

export async function listAchievements(clerkUserId) {
  const db = getPool();
  const uid = normalizeClerkUserId(clerkUserId);
  if (!db || !uid) return [];
  const r = await db.query(
    `SELECT code, run_id, unlocked_at FROM achievements
     WHERE clerk_user_id = $1 ORDER BY unlocked_at ASC`,
    [uid]
  );
  return r.rows.map((row) => ({
    code: String(row.code),
    runId: row.run_id,
    unlockedAt: row.unlocked_at,
  }));
}

/**
 * @param {string} clerkUserId
 * @param {string[]} codes
 * @param {string|null} [runId]
 */
export async function insertAchievements(clerkUserId, codes, runId = null) {
  const db = getPool();
  const uid = normalizeClerkUserId(clerkUserId);
  const list = (codes || []).filter(Boolean);
  if (!db || !uid || !list.length) return { inserted: 0 };
  const r = await db.query(
    `INSERT INTO achievements (clerk_user_id, code, run_id)
     SELECT $1, x, $3
     FROM unnest($2::text[]) AS x
     ON CONFLICT DO NOTHING`,
    [uid, list, runId]
  );
  return { inserted: r.rowCount || 0 };
}

function profileRow(row) {
  if (!row) return null;
  return {
    clerkUserId: row.clerk_user_id,
    username: row.username || null,
    displayName: row.display_name || null,
    bio: row.bio || "",
    isPublic: Boolean(row.is_public),
    hideEmail: row.hide_email !== false,
  };
}

export async function getProfileByUserId(clerkUserId) {
  const db = getPool();
  const uid = normalizeClerkUserId(clerkUserId);
  if (!db || !uid) return null;
  const r = await db.query(
    `SELECT clerk_user_id, username, display_name, bio, is_public, hide_email
     FROM users WHERE clerk_user_id = $1`,
    [uid]
  );
  return profileRow(r.rows[0]);
}

export async function getProfileByUsername(username) {
  const db = getPool();
  if (!db || !username) return null;
  const r = await db.query(
    `SELECT clerk_user_id, username, display_name, bio, is_public, hide_email
     FROM users WHERE username = $1`,
    [String(username)]
  );
  return profileRow(r.rows[0]);
}

export async function updateProfile(clerkUserId, patch) {
  const db = getPool();
  const uid = normalizeClerkUserId(clerkUserId);
  if (!db || !uid) return { skipped: true };
  await ensureUser(uid);
  const fields = [];
  const params = [];
  const add = (col, val) => {
    params.push(val);
    fields.push(`${col} = $${params.length}`);
  };
  if ("username" in patch) add("username", patch.username);
  if ("displayName" in patch) add("display_name", patch.displayName);
  if ("bio" in patch) add("bio", patch.bio);
  if ("isPublic" in patch) add("is_public", Boolean(patch.isPublic));
  if ("hideEmail" in patch) add("hide_email", Boolean(patch.hideEmail));
  if (!fields.length) return { skipped: false, profile: await getProfileByUserId(uid) };
  params.push(uid);
  await db.query(
    `UPDATE users SET ${fields.join(", ")}, last_seen_at = now() WHERE clerk_user_id = $${params.length}`,
    params
  );
  return { skipped: false, profile: await getProfileByUserId(uid) };
}

export async function listSharedHolds(clerkUserId) {
  const db = getPool();
  const uid = normalizeClerkUserId(clerkUserId);
  if (!db || !uid) return [];
  const r = await db.query(
    `SELECT quest_id, place, year_reached, kind FROM runs
     WHERE clerk_user_id = $1 AND share = true
       AND outcome IN ('hold','partial')
     ORDER BY ended_at DESC NULLS LAST LIMIT 8`,
    [uid]
  );
  return r.rows.map((row) => ({
    questId: row.quest_id,
    place: row.place,
    yearReached: row.year_reached,
    kind: row.kind,
  }));
}

export async function setRunShare(clerkUserId, runId, share) {
  const db = getPool();
  const uid = normalizeClerkUserId(clerkUserId);
  if (!db || !uid || !runId) return { stored: false };
  const r = await db.query(
    `UPDATE runs SET share = $3 WHERE id = $1::uuid AND clerk_user_id = $2 RETURNING id`,
    [runId, uid, Boolean(share)]
  );
  return { stored: Boolean(r.rowCount) };
}

/**
 * @param {string} clerkUserId
 * @param {string} day YYYY-MM-DD
 */
export async function getAiHits(clerkUserId, day) {
  const db = getPool();
  const uid = normalizeClerkUserId(clerkUserId);
  if (!db || !uid || !day) return 0;
  const r = await db.query(
    `SELECT hits FROM ai_usage_daily WHERE clerk_user_id = $1 AND day = $2::date`,
    [uid, day]
  );
  return r.rows[0]?.hits || 0;
}

/**
 * @param {string} clerkUserId
 * @param {string} day
 */
export async function incrementAiHits(clerkUserId, day) {
  const db = getPool();
  const uid = normalizeClerkUserId(clerkUserId);
  if (!db || !uid || !day) return { skipped: true, hits: 0 };
  await ensureUser(uid);
  const r = await db.query(
    `INSERT INTO ai_usage_daily (clerk_user_id, day, hits) VALUES ($1, $2::date, 1)
     ON CONFLICT (clerk_user_id, day) DO UPDATE SET hits = ai_usage_daily.hits + 1
     RETURNING hits`,
    [uid, day]
  );
  return { skipped: false, hits: r.rows[0]?.hits || 1 };
}

export async function listPins(clerkUserId) {
  const db = getPool();
  const uid = normalizeClerkUserId(clerkUserId);
  if (!db || !uid) return [];
  const r = await db.query(
    `SELECT slot, mission_id, global_id, title, place, global_title, pinned_at, snapshot
     FROM pins WHERE clerk_user_id = $1 ORDER BY slot ASC`,
    [uid]
  );
  return r.rows.map((row) => ({
    missionId: row.mission_id,
    globalId: row.global_id,
    title: row.title,
    place: row.place,
    globalTitle: row.global_title,
    pinnedAt: row.pinned_at,
    missionSnapshot: row.snapshot,
  }));
}

export async function replacePins(clerkUserId, pins) {
  const db = getPool();
  const uid = normalizeClerkUserId(clerkUserId);
  if (!db || !uid) return { skipped: true, pins: [] };
  const list = Array.isArray(pins) ? pins.slice(0, 3) : [];
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await ensureUser(uid, client);
    await client.query("DELETE FROM pins WHERE clerk_user_id = $1", [uid]);
    let slot = 1;
    for (const p of list) {
      await client.query(
        `INSERT INTO pins (clerk_user_id, slot, mission_id, global_id, title, place, global_title, snapshot)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
        [
          uid,
          slot++,
          p.missionId,
          p.globalId,
          p.title,
          p.place,
          p.globalTitle,
          p.missionSnapshot ? JSON.stringify(p.missionSnapshot) : null,
        ]
      );
    }
    await client.query("COMMIT");
    return { skipped: false, pins: list };
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    throw e;
  } finally {
    client.release();
  }
}

export async function getRunState(clerkUserId) {
  const db = getPool();
  const uid = normalizeClerkUserId(clerkUserId);
  if (!db || !uid) return null;
  const r = await db.query(
    `SELECT run_id, quest_id, year_reached, tutor, board, play, chats, updated_at
     FROM run_state WHERE clerk_user_id = $1`,
    [uid]
  );
  const row = r.rows[0];
  if (!row) return null;
  return {
    runId: row.run_id,
    questId: row.quest_id,
    year: row.year_reached,
    tutor: Boolean(row.tutor),
    board: row.board,
    play: row.play || null,
    chats: row.chats || null,
    updatedAt: row.updated_at,
  };
}

function mapQuestScoreRow(row) {
  return {
    clerkUserId: row.clerk_user_id,
    questId: row.quest_id,
    runId: row.run_id,
    yearReached: row.year_reached,
    startYear: row.start_year,
    stars: row.stars,
    waits: row.waits,
    displayName: row.display_name,
    place: row.place,
    stack: Array.isArray(row.stack) ? row.stack : [],
    pathwayText: row.pathway_text || "",
  };
}

/**
 * @param {string} questId
 */
export async function listQuestScores(questId) {
  const db = getPool();
  if (!db || !questId) return { skipped: true, rows: [] };
  const r = await db.query(
    `SELECT clerk_user_id, quest_id, run_id, year_reached, start_year, stars, waits,
            display_name, place, stack, pathway_text
     FROM quest_scores WHERE quest_id = $1`,
    [String(questId)]
  );
  return { skipped: false, rows: r.rows.map(mapQuestScoreRow) };
}

export async function listAllQuestScores() {
  const db = getPool();
  if (!db) return { skipped: true, rows: [] };
  const r = await db.query(
    `SELECT clerk_user_id, quest_id, run_id, year_reached, start_year, stars, waits,
            display_name, place, stack, pathway_text
     FROM quest_scores`
  );
  return { skipped: false, rows: r.rows.map(mapQuestScoreRow) };
}

/**
 * Best score per user per quest. `betterFn(next, prev)` true → replace.
 */
export async function upsertQuestScore(input, betterFn) {
  const db = getPool();
  if (!db) return { skipped: true, stored: false };
  const clerkUserId = normalizeClerkUserId(input?.clerkUserId);
  if (!clerkUserId) throw Object.assign(new Error("invalid_user"), { status: 401 });
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await ensureUser(clerkUserId, client);
    const prev = await client.query(
      `SELECT year_reached, start_year, stars, waits FROM quest_scores
       WHERE clerk_user_id = $1 AND quest_id = $2`,
      [clerkUserId, input.questId]
    );
    const existing = prev.rows[0]
      ? {
          yearReached: prev.rows[0].year_reached,
          startYear: prev.rows[0].start_year,
          stars: prev.rows[0].stars,
          waits: prev.rows[0].waits,
        }
      : null;
    const next = {
      yearReached: input.yearReached,
      startYear: input.startYear,
      stars: input.stars,
      waits: input.waits,
    };
    if (existing && typeof betterFn === "function" && !betterFn(next, existing)) {
      await client.query("COMMIT");
      return { skipped: false, stored: false, kept: true };
    }
    await client.query(
      `INSERT INTO quest_scores (
         clerk_user_id, quest_id, run_id, year_reached, start_year, stars, waits,
         display_name, place, stack, pathway_text
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (clerk_user_id, quest_id) DO UPDATE SET
         run_id = EXCLUDED.run_id,
         year_reached = EXCLUDED.year_reached,
         start_year = EXCLUDED.start_year,
         stars = EXCLUDED.stars,
         waits = EXCLUDED.waits,
         display_name = EXCLUDED.display_name,
         place = EXCLUDED.place,
         stack = EXCLUDED.stack,
         pathway_text = EXCLUDED.pathway_text,
         submitted_at = now()`,
      [
        clerkUserId,
        input.questId,
        input.runId,
        input.yearReached,
        input.startYear,
        input.stars,
        input.waits,
        input.displayName,
        input.place || "",
        input.stack || [],
        input.pathwayText || "",
      ]
    );
    await client.query("COMMIT");
    return { skipped: false, stored: true };
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Clerk ids currently holding a still for this quest.
 * @param {string} questId
 */
export async function listQuestStillUserIds(questId) {
  const db = getPool();
  if (!db || !questId) return [];
  const r = await db.query(
    `SELECT clerk_user_id FROM quest_stills WHERE quest_id = $1`,
    [String(questId)]
  );
  return r.rows.map((row) => row.clerk_user_id);
}

/**
 * Ranked clerk ids for a quest (best first).
 * @param {string} questId
 * @param {number} [limit]
 */
export async function listQuestScoreUserIdsRanked(questId, limit = 3) {
  const db = getPool();
  if (!db || !questId) return [];
  const n = Math.min(50, Math.max(1, Number(limit) || 3));
  const r = await db.query(
    `SELECT clerk_user_id FROM quest_scores
     WHERE quest_id = $1
     ORDER BY (
       COALESCE(stars, 0)::double precision
       / GREATEST(1, COALESCE(year_reached, 0) - COALESCE(start_year, year_reached, 0))
     ) DESC NULLS LAST,
     waits ASC NULLS LAST,
     submitted_at ASC
     LIMIT $2`,
    [String(questId), n]
  );
  return r.rows.map((row) => row.clerk_user_id);
}

async function withUnpooledClient(fn) {
  const url = migrateUrl();
  if (!url) return { skipped: true };
  const client = new Client(poolConfig(url));
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

/**
 * Store a still only for a user currently in the top K (caller checks).
 */
export async function putQuestStill(questId, clerkUserId, bytes, contentType = "image/jpeg") {
  const uid = normalizeClerkUserId(clerkUserId);
  const qid = String(questId || "");
  const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes || []);
  if (!uid || !qid || !buf.length) return { skipped: true, stored: false };
  return withUnpooledClient(async (client) => {
    await client.query(
      `INSERT INTO quest_stills (quest_id, clerk_user_id, bytes, content_type, byte_len)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (quest_id, clerk_user_id) DO UPDATE SET
         bytes = EXCLUDED.bytes,
         content_type = EXCLUDED.content_type,
         byte_len = EXCLUDED.byte_len`,
      [qid, uid, buf, String(contentType || "image/jpeg").slice(0, 80), buf.length]
    );
    return { skipped: false, stored: true };
  });
}

export async function getQuestStill(questId, clerkUserId) {
  const uid = normalizeClerkUserId(clerkUserId);
  const qid = String(questId || "");
  if (!uid || !qid) return null;
  const got = await withUnpooledClient(async (client) => {
    const r = await client.query(
      `SELECT bytes, content_type FROM quest_stills
       WHERE quest_id = $1 AND clerk_user_id = $2`,
      [qid, uid]
    );
    return r.rows[0] || null;
  });
  if (!got || got.skipped) return null;
  return { bytes: got.bytes, contentType: got.content_type || "image/jpeg" };
}

export async function deleteQuestStillsOutside(questId, keepUserIds) {
  const qid = String(questId || "");
  if (!qid) return { skipped: true };
  const keep = (keepUserIds || []).map((id) => normalizeClerkUserId(id)).filter(Boolean);
  return withUnpooledClient(async (client) => {
    if (!keep.length) {
      await client.query(`DELETE FROM quest_stills WHERE quest_id = $1`, [qid]);
      return { skipped: false };
    }
    await client.query(
      `DELETE FROM quest_stills WHERE quest_id = $1 AND NOT (clerk_user_id = ANY($2::text[]))`,
      [qid, keep]
    );
    return { skipped: false };
  });
}

export async function deleteQuestStill(questId, clerkUserId) {
  const uid = normalizeClerkUserId(clerkUserId);
  const qid = String(questId || "");
  if (!uid || !qid) return { skipped: true };
  const db = getPool();
  if (!db) return { skipped: true };
  await db.query(
    `DELETE FROM quest_stills WHERE quest_id = $1 AND clerk_user_id = $2`,
    [qid, uid]
  );
  return { skipped: false };
}

export async function putRunState(clerkUserId, state) {
  const db = getPool();
  const uid = normalizeClerkUserId(clerkUserId);
  if (!db || !uid) return { skipped: true };
  await ensureUser(uid);
  await db.query(
    `INSERT INTO run_state (clerk_user_id, run_id, quest_id, year_reached, tutor, board, play, chats)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb)
     ON CONFLICT (clerk_user_id) DO UPDATE SET
       run_id = EXCLUDED.run_id,
       quest_id = EXCLUDED.quest_id,
       year_reached = EXCLUDED.year_reached,
       tutor = EXCLUDED.tutor,
       board = EXCLUDED.board,
       play = EXCLUDED.play,
       chats = EXCLUDED.chats,
       updated_at = now()`,
    [
      uid,
      state.runId,
      state.questId,
      state.year,
      Boolean(state.tutor),
      state.board ? JSON.stringify(state.board) : null,
      state.play ? JSON.stringify(state.play) : null,
      state.chats ? JSON.stringify(state.chats) : null,
    ]
  );
  return { skipped: false, stored: true };
}

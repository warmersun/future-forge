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
    if (shouldStoreLastRun(existingRuns, lastRun)) {
      await insertRunRow(client, clerkUserId, lastRun, { imported: true });
      lastRunStored = true;
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
    `SELECT id, quest_id, kind, outcome FROM runs
     WHERE id = $1::uuid AND clerk_user_id = $2`,
    [runId, uid]
  );
  return r.rows[0] || null;
}

/**
 * @param {string} period
 */
export async function listDailyScores(period) {
  const db = getPool();
  if (!db || !period) return { skipped: true, rows: [] };
  const r = await db.query(
    `SELECT clerk_user_id, period, quest_id, run_id, year_reached, stars, waits, display_name
     FROM daily_scores WHERE period = $1`,
    [String(period)]
  );
  return {
    skipped: false,
    rows: r.rows.map((row) => ({
      clerkUserId: row.clerk_user_id,
      period: row.period,
      questId: row.quest_id,
      runId: row.run_id,
      yearReached: row.year_reached,
      stars: row.stars,
      waits: row.waits,
      displayName: row.display_name,
    })),
  };
}

/**
 * Keep the best score per user per period.
 * @param {object} input
 * @param {(next: object, prev: object|null) => boolean} betterFn
 */
export async function upsertDailyScore(input, betterFn) {
  const db = getPool();
  if (!db) return { skipped: true, stored: false };
  const clerkUserId = normalizeClerkUserId(input?.clerkUserId);
  if (!clerkUserId) throw Object.assign(new Error("invalid_user"), { status: 401 });
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await ensureUser(clerkUserId, client);
    const prev = await client.query(
      `SELECT year_reached, stars, waits FROM daily_scores
       WHERE clerk_user_id = $1 AND period = $2`,
      [clerkUserId, input.period]
    );
    const existing = prev.rows[0]
      ? {
          yearReached: prev.rows[0].year_reached,
          stars: prev.rows[0].stars,
          waits: prev.rows[0].waits,
        }
      : null;
    const next = {
      yearReached: input.yearReached,
      stars: input.stars,
      waits: input.waits,
    };
    if (existing && typeof betterFn === "function" && !betterFn(next, existing)) {
      await client.query("COMMIT");
      return { skipped: false, stored: false, kept: true };
    }
    await client.query(
      `INSERT INTO daily_scores (
         clerk_user_id, period, quest_id, run_id, year_reached, stars, waits, display_name
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (clerk_user_id, period) DO UPDATE SET
         quest_id = EXCLUDED.quest_id,
         run_id = EXCLUDED.run_id,
         year_reached = EXCLUDED.year_reached,
         stars = EXCLUDED.stars,
         waits = EXCLUDED.waits,
         display_name = EXCLUDED.display_name,
         submitted_at = now()`,
      [
        clerkUserId,
        input.period,
        input.questId,
        input.runId,
        input.yearReached,
        input.stars,
        input.waits,
        input.displayName,
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
 * @param {string} clerkUserId
 */
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

/**
 * @param {string} clerkUserId
 * @returns {Promise<string[]>}
 */
export async function listUserDailyPeriods(clerkUserId) {
  const db = getPool();
  const uid = normalizeClerkUserId(clerkUserId);
  if (!db || !uid) return [];
  const r = await db.query(
    `SELECT period FROM daily_scores WHERE clerk_user_id = $1`,
    [uid]
  );
  return r.rows.map((row) => String(row.period));
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

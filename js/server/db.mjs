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
    const row = await insertRunRow(client, clerkUserId, run, { imported: false });
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
       clerk_user_id, quest_id, kind, outcome, stars, year_reached, waits, place, imported
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
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

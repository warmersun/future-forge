// Optional integration checks. Run only against a disposable local database:
// FF_TEST_POSTGRES_URL=postgresql://postgres@127.0.0.1:<port>/portal_review_test node --test portal/functions/billing-postgres.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import pg from "pg";
import { createBillingRoutes } from "./billing-routes.mjs";
import { createAccountRoutes } from "./account-routes.mjs";

const connectionString = process.env.FF_TEST_POSTGRES_URL;
const options = { skip: !connectionString, timeout: 15000 };
const env = {
  CLERK_SECRET_KEY: "fixture-clerk-secret", CLERK_PUBLISHABLE_KEY: "pk_test_fixture",
  CLERK_WEBHOOK_SECRET: "whsec_fixture", FF_API_SECRET: "fixture-server-secret",
  FF_CLOUD_AI_BUDGET: "100", FF_QUOTA_IMAGE: "1", FF_CLOUD_PLAN_SLUGS: "cloud",
};
const uid = "user_postgres_fixture";
const period = "2026-01-01T00:00:00.000Z";
const future = "2099-01-01T00:00:00.000Z";

test("local Postgres test URLs reject query overrides without connecting", () => {
  for (const suffix of ["?host=remote.example.test", "?options=-c%20search_path%3Dpublic", "?database=production", "#fragment"]) {
    assert.throws(() => localDatabaseConfig(`postgresql://postgres@127.0.0.1:5432/portal_review_test${suffix}`));
  }
  assert.throws(() => localDatabaseConfig("postgresql://postgres@remote.example.test/portal_review_test"));
  assert.throws(() => localDatabaseConfig("postgresql://postgres@127.0.0.1/production"));
  const config = localDatabaseConfig("postgresql://postgres@localhost:5432/portal_review_test");
  assert.equal(config.host, "127.0.0.1");
  assert.equal(config.database, "portal_review_test");
  assert.equal(Object.hasOwn(config, "connectionString"), false);
  const client = new pg.Client({ ...config, options: "-c search_path=isolated_test" });
  assert.equal(client.connectionParameters.host, "127.0.0.1");
  assert.equal(client.connectionParameters.options, "-c search_path=isolated_test");
});

function gate() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}
function localDatabaseConfig(value) {
  const url = new URL(value);
  assert.ok(["postgres:", "postgresql:"].includes(url.protocol), "test URL must use Postgres");
  assert.equal(url.search, "", "test URL must not override connection settings");
  assert.equal(url.hash, "", "test URL must not contain fragments");
  assert.ok(["127.0.0.1", "localhost"].includes(url.hostname), "test database must be local");
  assert.equal(url.pathname, "/portal_review_test", "test database must be disposable portal_review_test");
  // Never pass the URL on to pg: its query parser can override host/options.
  return { host: "127.0.0.1", port: Number(url.port || 5432),
    user: decodeURIComponent(url.username || "postgres"), password: decodeURIComponent(url.password),
    database: "portal_review_test", ssl: false };
}
async function fixture(t) {
  const config = localDatabaseConfig(connectionString);
  const schema = `portal_test_${randomUUID().replaceAll("-", "")}`;
  const admin = new pg.Pool({ ...config, max: 1, options: "-c statement_timeout=5000" });
  await admin.query(`CREATE SCHEMA ${schema}`);
  const pool = new pg.Pool({ ...config, max: 6, options: `-c search_path=${schema} -c statement_timeout=5000` });
  t.after(async () => {
    await pool.end();
    try { await admin.query(`DROP SCHEMA ${schema} CASCADE`); } finally { await admin.end(); }
  });
  for (const name of ["001_users_solved_runs.sql", "015_cloud_subscription.sql", "016_quota_settle_guard.sql", "staging/020_clerk_webhook_events.sql"]) {
    await pool.query(await readFile(new URL(`../../js/server/db/${name}`, import.meta.url), "utf8"));
  }
  await pool.query("INSERT INTO users (clerk_user_id) VALUES ($1)", [uid]);
  return pool;
}
function observed(pool, onQuery, onConnect = () => {}) {
  return {
    query: (...args) => pool.query(...args),
    async connect() {
      const client = await pool.connect();
      onConnect((await client.query("SELECT pg_backend_pid() AS pid")).rows[0].pid);
      return { release: () => client.release(), query(sql, args) {
        const result = client.query(sql, args);
        onQuery(sql);
        return result;
      } };
    },
  };
}
function webhook(db, loadBilling) {
  return createBillingRoutes({ env, db, getUserBillingSubscription: loadBilling,
    verifySignedWebhook: async () => ({ type: "subscriptionItem.ended", data: { payer: { user_id: uid } } }) });
}
function webhookRequest() {
  return new Request("https://api.example/api/webhooks/clerk", { method: "POST",
    headers: { "Content-Type": "application/json", "svix-id": `msg_${randomUUID()}` }, body: "{}" });
}

test("Postgres: concurrent webhook and reserve do not invert row/advisory locks", options, async (t) => {
  const pool = await fixture(t);
  await pool.query("INSERT INTO subscriptions (clerk_user_id, plan_slug, status, period_start, period_end) VALUES ($1,'cloud','active',$2,$3)", [uid, period, future]);
  const providerEntered = gate(), releaseProvider = gate(), reserveLockAttempted = gate();
  const billing = webhook(pool, async () => { providerEntered.resolve(); await releaseProvider.promise; return { subscriptionItems: [] }; });
  const reservation = createBillingRoutes({ env,
    db: observed(pool, (sql) => { if (sql.includes("pg_advisory_xact_lock")) reserveLockAttempted.resolve(); }),
    verifyClerk: async () => ({ sub: uid }),
  });
  const delivery = billing.fetch(webhookRequest());
  let reserve;
  try {
    await providerEntered.promise;
    reserve = reservation.fetch(new Request("https://api.example/api/me/ai/reserve", { method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer eyJfixture.payload.signature" }, body: JSON.stringify({ kind: "image" }) }));
    await reserveLockAttempted.promise;
  } finally { releaseProvider.resolve(); }
  const [delivered, denied] = await Promise.all([delivery, reserve]);
  assert.equal(delivered.status, 200, await delivered.text());
  assert.equal(denied.status, 402, await denied.text());
  assert.equal((await pool.query("SELECT status FROM subscriptions WHERE clerk_user_id=$1", [uid])).rows[0].status, "inactive");
});

test("Postgres: account refresh holds payer lock before reading Clerk; later cancellation wins", options, async (t) => {
  const pool = await fixture(t);
  const providerEntered = gate(), releaseProvider = gate(), webhookLockAttempted = gate();
  let accountPid;
  const account = createAccountRoutes({ env,
    db: observed(pool, () => {}, (pid) => { accountPid = pid; }),
    getUserBillingSubscription: async () => {
      providerEntered.resolve();
      await releaseProvider.promise;
      return { subscriptionItems: [{ plan: { slug: "cloud" }, status: "active", periodStart: Date.parse(period), periodEnd: Date.parse(future) }] };
    },
  });
  const billing = webhook(observed(pool, (sql) => {
    if (sql.includes("pg_advisory_xact_lock")) webhookLockAttempted.resolve();
  }), async () => ({ subscriptionItems: [] }));
  const refresh = account.fetch(new Request("https://api.example/api/me"), { enabled: true, signedIn: true, userId: uid });
  let delivery;
  try {
    await providerEntered.promise;
    const locks = await pool.query("SELECT 1 FROM pg_locks WHERE pid=$1 AND locktype='advisory' AND granted", [accountPid || 0]);
    assert.equal(locks.rows.length, 1, "account refresh must lock before fetching its billing snapshot");
    delivery = billing.fetch(webhookRequest());
    await webhookLockAttempted.promise;
  } finally { releaseProvider.resolve(); }
  const [refreshed, delivered] = await Promise.all([refresh, delivery]);
  assert.equal(refreshed.status, 200, await refreshed.text());
  assert.equal(delivered.status, 200, await delivered.text());
  assert.equal((await pool.query("SELECT status FROM subscriptions WHERE clerk_user_id=$1", [uid])).rows[0].status, "inactive");
});

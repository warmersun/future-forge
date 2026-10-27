import test from "node:test";
import assert from "node:assert/strict";
import { createAccountRoutes } from "./account-routes.mjs";
import { createBillingRoutes } from "./billing-routes.mjs";
import { verifyQuotaGrant } from "../../js/server/ai-quota.mjs";

const ID = "11111111-2222-4333-8444-555555555555";
const uid = "user_123";
const other = "user_456";
const signed = { enabled: true, signedIn: true, userId: uid, sessionId: "sess_123" };
const env = { FF_PUBLIC_ORIGIN: "https://cloud.warmersun.com", FF_CLOUD_PLAN_SLUGS: "cloud,pro" };
const req = (path, method = "GET", options = {}) => new Request(`https://neon.example${path}`, { method, ...options });
async function result(handler, request, identity) {
  const response = await handler.fetch(request, identity);
  return { status: response.status, headers: response.headers, body: await response.json() };
}
function mockDb({ subscription = null, cards = [], collected = [], published = null, secret = "private-key", fail = null } = {}) {
  const queries = [];
  let sub = subscription;
  let key = secret;
  const owners = new Set(collected.map((row) => `${uid}:${row.id}`));
  return {
    queries,
    async connect() {
      const previous = sub;
      return {
        query: async (sql, params) => {
          if (["BEGIN", "COMMIT", "ROLLBACK"].includes(sql) || sql.includes("pg_advisory_xact_lock")) {
            queries.push({ sql, params: params || [] });
            if (fail && sql.includes(fail)) throw new Error("private transaction failure detail");
            if (sql === "ROLLBACK") sub = previous;
            return { rows: [] };
          }
          return this.query(sql, params);
        },
        release() { queries.push({ sql: "RELEASE", params: [] }); },
      };
    },
    async query(sql, params = []) {
      queries.push({ sql, params });
      if (fail && sql.includes(fail)) throw new Error("private failure detail");
      if (sql.includes("FROM solved_quests")) return { rows: [{ quest_id: "a" }, { quest_id: "b" }] };
      if (sql.startsWith("SELECT secret FROM quota_grant_key")) return { rows: key ? [{ secret: key }] : [] };
      if (sql.startsWith("INSERT INTO quota_grant_key")) { key = params[0]; return { rows: [], rowCount: 1 }; }
      if (sql.includes("FROM subscriptions")) return { rows: sub ? [sub] : [] };
      if (sql.startsWith("INSERT INTO subscriptions")) {
        sub = { plan_slug: params[1], status: params[2], period_start: params[3], period_end: params[4] };
        return { rows: [], rowCount: 1 };
      }
      if (sql.startsWith("INSERT INTO users")) return { rows: [], rowCount: 1 };
      if (sql.includes("FROM user_collector_cards u")) return { rows: collected };
      if (sql.includes("FROM collector_cards WHERE id = $1")) return { rows: published ? [published] : [] };
      if (sql.startsWith("INSERT INTO user_collector_cards")) {
        const card = published && params[1] === published.id && published.published;
        const owner = `${params[0]}:${params[1]}`;
        if (!card || owners.has(owner)) return { rows: [], rowCount: 0 };
        owners.add(owner);
        return { rows: [{ collected_at: "2026-10-01" }], rowCount: 1 };
      }
      if (sql.startsWith("SELECT 1 FROM collector_cards")) return { rows: published?.published ? [{ '?column?': 1 }] : [] };
      throw new Error(`unexpected query: ${sql}`);
    },
  };
}

const published = { id: ID, tech_id: "synthetic-tech", title: "Card", description: "Description", published: true, source: "operator-secret", image: Buffer.from("secret-image") };

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

// Connections run concurrently. Only pg_advisory_xact_lock serializes them;
// writes become visible at COMMIT, so whole-transaction serialization cannot
// accidentally hide a missing lock in the account handler.
function concurrentSubscriptionDb(onLock) {
  const base = mockDb();
  let tail = Promise.resolve();
  let attempts = 0;
  let releases = 0;
  return {
    ...base,
    get releases() { return releases; },
    async connect() {
      let unlock;
      let pending = [];
      return {
        async query(sql, params = []) {
          if (sql.includes("pg_advisory_xact_lock")) {
            assert.deepEqual(params, [uid]);
            const previous = tail;
            tail = new Promise((done) => { unlock = done; });
            onLock(++attempts);
            await previous;
          } else if (sql === "COMMIT") {
            for (const [write, args] of pending) await base.query(write, args);
            pending = [];
          } else if (sql === "ROLLBACK") pending = [];
          else if (sql.includes("INSERT INTO clerk_webhook_events")) return { rows: [{ event_id: params[0] }] };
          else if (sql.startsWith("INSERT INTO subscriptions")) pending.push([sql, params]);
          else if (sql.includes("FROM subscriptions") && pending.length) {
            const args = pending.at(-1)[1];
            return { rows: [{ plan_slug: args[1], status: args[2], period_start: args[3], period_end: args[4] }] };
          } else if (sql !== "BEGIN") return base.query(sql, params);
          return { rows: [] };
        },
        release() { releases++; unlock?.(); },
      };
    },
  };
}

const paidSnapshot = { subscriptionItems: [{ plan: { slug: "pro" }, status: "active", periodEnd: 4_000_000_000_000 }] };
const billingEnv = { ...env, CLERK_SECRET_KEY: "offline-fixture", CLERK_WEBHOOK_SECRET: "offline-fixture" };
function cancellation(db, getUserBillingSubscription) {
  const webhook = createBillingRoutes({ env: billingEnv, db, getUserBillingSubscription,
    verifySignedWebhook: async () => ({ id: "evt_race", type: "subscriptionItem.canceled", data: { payer: { user_id: uid } } }),
  });
  return webhook.fetch(req("/api/webhooks/clerk", "POST", { body: "{}" }));
}

test("delayed account snapshot cannot overwrite a newer cancellation webhook", { timeout: 2000 }, async () => {
  const providerStarted = deferred(), releaseSnapshot = deferred(), webhookWaiting = deferred();
  let accountFetching = false;
  const db = concurrentSubscriptionDb(() => { if (accountFetching) webhookWaiting.resolve(); });
  let webhookReads = 0;
  const account = createAccountRoutes({ env, db, getUserBillingSubscription: async () => {
    accountFetching = true;
    providerStarted.resolve();
    await releaseSnapshot.promise;
    return paidSnapshot;
  } });
  const pendingAccount = result(account, req("/api/me"), signed);
  await providerStarted.promise;
  const pendingWebhook = cancellation(db, async () => { webhookReads++; return { subscriptionItems: [] }; });
  await webhookWaiting.promise;
  await new Promise((done) => setImmediate(done));
  try { assert.equal(webhookReads, 0, "webhook must wait until account snapshot commits"); }
  finally { releaseSnapshot.resolve(); }
  const [accountResponse, webhookResponse] = await Promise.all([pendingAccount, pendingWebhook]);
  assert.equal(accountResponse.status, 200);
  assert.equal(webhookResponse.status, 200);
  const stored = (await db.query("SELECT * FROM subscriptions WHERE clerk_user_id = $1", [uid])).rows[0];
  assert.equal(stored.status, "inactive");
  assert.equal(stored.plan_slug, null);
  assert.equal(db.releases, 2);
});

test("account re-reads cancellation committed while waiting for the webhook lock", { timeout: 2000 }, async () => {
  const providerStarted = deferred(), releaseWebhook = deferred(), accountWaiting = deferred();
  const db = concurrentSubscriptionDb((attempt) => { if (attempt === 2) accountWaiting.resolve(); });
  const pendingWebhook = cancellation(db, async () => {
    providerStarted.resolve();
    await releaseWebhook.promise;
    return { subscriptionItems: [] };
  });
  await providerStarted.promise;
  let accountReads = 0;
  const account = createAccountRoutes({ env, db, getUserBillingSubscription: async () => { accountReads++; return null; } });
  const pendingAccount = result(account, req("/api/me"), signed);
  try {
    assert.equal(await Promise.race([accountWaiting.promise.then(() => "waiting"), pendingAccount.then(() => "finished")]), "waiting");
    assert.equal(accountReads, 0);
  } finally { releaseWebhook.resolve(); }
  assert.equal((await pendingWebhook).status, 200);
  const response = await pendingAccount;
  assert.equal(response.body.subscription.status, "inactive");
  assert.equal(response.body.subscription.entitled, false);
  assert.equal(accountReads, 1);
  assert.equal(db.releases, 2);
});

test("account skips provider refresh when webhook made the locked DB row entitled", { timeout: 2000 }, async () => {
  const providerStarted = deferred(), releaseWebhook = deferred(), accountWaiting = deferred();
  const db = concurrentSubscriptionDb((attempt) => { if (attempt === 2) accountWaiting.resolve(); });
  const pendingWebhook = cancellation(db, async () => {
    providerStarted.resolve();
    await releaseWebhook.promise;
    return paidSnapshot;
  });
  await providerStarted.promise;
  let accountReads = 0;
  const account = createAccountRoutes({ env, db, getUserBillingSubscription: async () => { accountReads++; return null; } });
  const pendingAccount = result(account, req("/api/me"), signed);
  try {
    assert.equal(await Promise.race([accountWaiting.promise.then(() => "waiting"), pendingAccount.then(() => "finished")]), "waiting");
  } finally { releaseWebhook.resolve(); }
  assert.equal((await pendingWebhook).status, 200);
  assert.equal((await pendingAccount).body.subscription.entitled, true);
  assert.equal(accountReads, 0);
  assert.equal(db.releases, 2);
});

test("/api/me unsigned, disabled, invalid, and signed-in DB unavailable contracts", async () => {
  const handler = createAccountRoutes({ env });
  assert.deepEqual(await result(handler, req("/api/me"), { enabled: false }),
    { status: 200, headers: (await handler.fetch(req("/api/me"), { enabled: false })).headers, body: { ok: true, signedIn: false, clerk: false, db: false } });
  assert.deepEqual((await result(handler, req("/api/me?probe=1"), { enabled: true, missingToken: true })).body,
    { ok: true, signedIn: false, clerk: true, db: false });
  assert.deepEqual(await result(handler, req("/api/me"), { enabled: true, invalidToken: true }),
    { status: 401, headers: (await handler.fetch(req("/api/me"), { enabled: true, invalidToken: true })).headers, body: { ok: false, error: "invalid_token", clerk: true } });
  assert.deepEqual((await result(handler, req("/api/me"), signed)),
    { status: 503, headers: (await handler.fetch(req("/api/me"), signed)).headers, body: { ok: false, error: "db_unavailable" } });
  assert.equal((await result(handler, req("/api/me"))).body.signedIn, false);
});

test("signed /api/me reproduces solved IDs, grant and subscription view without secret leakage", async () => {
  const sub = { plan_slug: "cloud", status: "active", period_end: "2999-01-01" };
  const db = mockDb({ subscription: sub });
  const handler = createAccountRoutes({ env, db });
  const { status, body } = await result(handler, req(`/api/me?userId=${other}`, "GET", { headers: { "x-user-id": other } }), signed);
  assert.equal(status, 200);
  assert.deepEqual(Object.keys(body), ["ok", "signedIn", "clerk", "userId", "sessionId", "db", "solvedIds", "quotaGrant", "subscription"]);
  assert.deepEqual({ ...body, quotaGrant: null }, { ok: true, signedIn: true, clerk: true, userId: uid,
    sessionId: "sess_123", db: true, solvedIds: ["a", "b"], quotaGrant: null,
    subscription: { entitled: true, content: true, planSlug: "cloud", status: "active", subscribeUrl: "https://cloud.warmersun.com/subscribe" } });
  assert.equal(verifyQuotaGrant(body.quotaGrant, "private-key"), uid);
  assert.doesNotMatch(JSON.stringify(body), /private-key|operator-secret|secret-image/);
  assert(db.queries.filter((q) => q.params.includes(uid)).length > 0);
  assert(db.queries.every((q) => !q.params.includes(other)));
});

test("content plan unlocks paid content and not hosted AI", async () => {
  const db = mockDb({ subscription: { plan_slug: "content", status: "active", period_end: "2999-01-01" } });
  const handler = createAccountRoutes({
    env,
    db,
    getUserBillingSubscription: async () => ({
      subscriptionItems: [{ plan: { slug: "content" }, status: "active", periodStart: 1_700_000_000_000, periodEnd: 4_000_000_000_000 }],
    }),
  });
  const body = (await result(handler, req("/api/me"), signed)).body;
  assert.deepEqual(body.subscription, {
    entitled: false, content: true, planSlug: "content", status: "active",
    subscribeUrl: "https://cloud.warmersun.com/subscribe",
  });
  assert.equal(db.queries.some((q) => q.sql.startsWith("INSERT INTO subscriptions") && q.params[1] === "content"), true);
  assert.equal(db.queries.some((q) => q.params.includes("cloud") && q.sql.startsWith("INSERT INTO subscriptions")), false);
});

test("quota key is generated once and signed grant uses persisted key", async () => {
  const db = mockDb({ secret: null });
  const handler = createAccountRoutes({ env, db, getUserBillingSubscription: async () => null });
  const body = (await result(handler, req("/api/me"), signed)).body;
  const key = db.queries.find((q) => q.sql.startsWith("INSERT INTO quota_grant_key")).params[0];
  assert.equal(verifyQuotaGrant(body.quotaGrant, key), uid);
  assert(!JSON.stringify(body).includes(key));
  await result(handler, req("/api/me"), signed);
  assert.equal(db.queries.filter((q) => q.sql.startsWith("INSERT INTO quota_grant_key")).length, 1);
});

test("missing/expired subscription refreshes paid Clerk billing row and reads it back", async () => {
  const db = mockDb({ subscription: { plan_slug: "cloud", status: "canceled", period_end: "2020-01-01" } });
  let calls = 0;
  const handler = createAccountRoutes({ env, db, getUserBillingSubscription: async (id) => {
    assert.equal(id, uid); calls++;
    const begin = db.queries.findIndex((q) => q.sql === "BEGIN");
    const lock = db.queries.findIndex((q) => q.sql.includes("pg_advisory_xact_lock"));
    assert(begin >= 0 && lock > begin, "provider fetch must run inside the payer transaction lock");
    assert.deepEqual(db.queries[lock].params, [uid]);
    assert(db.queries.slice(lock + 1).some((q) => q.sql.includes("FROM subscriptions")), "re-read subscription after acquiring lock");
    return { subscriptionItems: [{ plan: { slug: "pro" }, status: "active", periodStart: 1_700_000_000_000, periodEnd: 4_000_000_000_000 }] };
  } });
  const body = (await result(handler, req("/api/me"), signed)).body;
  assert.deepEqual(body.subscription, { entitled: true, content: true, planSlug: "pro", status: "active", subscribeUrl: "https://cloud.warmersun.com/subscribe" });
  assert.equal(calls, 1);
  assert(db.queries.some((q) => q.sql === "COMMIT"));
  assert(db.queries.some((q) => q.sql === "RELEASE"));
  assert(db.queries.some((q) => q.sql.startsWith("INSERT INTO subscriptions") && q.params[0] === uid));
  await result(handler, req("/api/me"), signed);
  assert.equal(calls, 1);
});

test("partial account read failures keep legacy field defaults and billing refresh failure retains sub", async (t) => {
  const warning = t.mock.method(console, "warn", () => {});
  const db = mockDb({ fail: "FROM solved_quests", subscription: { plan_slug: "free_user", status: "active" } });
  const handler = createAccountRoutes({ env, db, getUserBillingSubscription: async () => { throw Error("secret-error"); } });
  const { body } = await result(handler, req("/api/me"), signed);
  assert.deepEqual(body.solvedIds, []);
  assert.equal(body.subscription.entitled, false);
  assert.equal(body.subscription.planSlug, "free_user");
  assert(db.queries.some((q) => q.sql === "ROLLBACK"));
  assert.equal(db.queries.at(-1).sql, "RELEASE");
  assert.equal(warning.mock.callCount(), 0, "provider error details must not reach logs");
  assert.doesNotMatch(JSON.stringify(body), /secret-error|private failure/);
});

test("failed refresh writes or commit roll back and never return uncommitted entitlement", async () => {
  for (const fail of ["INSERT INTO subscriptions", "COMMIT"]) {
    const db = mockDb({ fail, subscription: { plan_slug: "cloud", status: "inactive" } });
    const handler = createAccountRoutes({ env, db, getUserBillingSubscription: async () => paidSnapshot });
    const response = await result(handler, req("/api/me"), signed);
    assert.equal(response.status, 200);
    assert.equal(response.body.subscription.entitled, false);
    assert.equal(response.body.subscription.status, "inactive");
    assert(db.queries.some((q) => q.sql === "ROLLBACK"));
    assert.equal(db.queries.at(-1).sql, "RELEASE");
    assert.equal((await db.query("SELECT * FROM subscriptions WHERE clerk_user_id = $1", [uid])).rows[0].status, "inactive");
    assert.doesNotMatch(JSON.stringify(response.body), /private.*failure/);
  }
});

test("quota and subscription query failures never disclose errors or fabricate entitlements", async () => {
  const db = mockDb({ fail: "FROM subscriptions" });
  const body = (await result(createAccountRoutes({ env, db, getUserBillingSubscription: async () => null }), req("/api/me"), signed)).body;
  assert.equal(body.signedIn, true);
  assert.equal(body.subscription.entitled, false);
  assert.equal(body.subscription.planSlug, null);
  assert.equal(verifyQuotaGrant(body.quotaGrant, "private-key"), uid);
  assert(!JSON.stringify(body).includes("private failure detail"));
  const noKey = mockDb({ fail: "FROM quota_grant_key", subscription: { plan_slug: "cloud", status: "active" } });
  const withoutGrant = (await result(createAccountRoutes({ env, db: noKey }), req("/api/me"), signed)).body;
  assert.equal(withoutGrant.quotaGrant, null);
  assert.equal(withoutGrant.subscription.entitled, true);
});

test("cards list gates identity and uses published per-owner DTO, not private fields", async () => {
  const db = mockDb({ collected: [{ ...published, collected_at: "2026-10-01" }] });
  const handler = createAccountRoutes({ env, db });
  assert.deepEqual((await result(handler, req("/api/me/cards"), { enabled: false })).body,
    { ok: false, error: "clerk_disabled", clerk: false });
  assert.deepEqual((await result(handler, req("/api/me/cards"), { enabled: true, missingToken: true })).body,
    { ok: false, error: "sign_in_required", clerk: true });
  assert.deepEqual((await result(handler, req("/api/me/cards"), { enabled: true, invalidToken: true })).body,
    { ok: false, error: "invalid_token", clerk: true });
  const { body } = await result(handler, req(`/api/me/cards?userId=${other}`, "GET", { headers: { "x-user-id": other } }), signed);
  assert.equal(body.ok, true);
  assert.equal(body.cards.length, 1);
  assert.deepEqual(Object.keys(body.cards[0]), ["id", "techId", "techName", "title", "description", "imagePath", "imageUrl", "collectedAt"]);
  assert.equal(body.cards[0].imageUrl, `https://cloud.warmersun.com/card/${ID}/image`);
  assert.equal(body.cards[0].collectedAt, "2026-10-01");
  assert(!JSON.stringify(body).includes("operator-secret"));
  assert.deepEqual(db.queries.at(-1).params, [uid]);
});

test("collect validates ID, bounds stream, never writes for unpublished, is idempotent", async () => {
  const db = mockDb({ published });
  const handler = createAccountRoutes({ env, db });
  const path = `/api/me/cards/${ID}/collect`;
  assert.equal((await result(handler, req("/api/me/cards/bad/collect", "POST"), signed)).status, 404);
  assert.equal((await result(handler, req(path, "POST", { body: "x".repeat(1025), duplex: "half" }), signed)).status, 413);
  const oversized = new ReadableStream({ start(c) { c.enqueue(new Uint8Array(600)); c.enqueue(new Uint8Array(600)); c.close(); } });
  assert.equal((await result(handler, req(path, "POST", { body: oversized, duplex: "half" }), signed)).status, 413);
  assert.equal(db.queries.length, 0);
  const first = await result(handler, req(path, "POST", { headers: { "x-user-id": other } }), signed);
  assert.equal(first.status, 200);
  assert.deepEqual({ ok: first.body.ok, collected: first.body.collected, already: first.body.already }, { ok: true, collected: true, already: false });
  assert.deepEqual(Object.keys(first.body.card), ["id", "techId", "techName", "title", "description", "imagePath", "imageUrl", "collectedAt"]);
  assert.equal(first.body.card.collectedAt, null);
  assert(!JSON.stringify(first.body).includes("operator-secret"));
  const insert = db.queries.find((q) => q.sql.startsWith("INSERT INTO user_collector_cards"));
  assert.match(insert.sql, /VALUES \(\$1, \$2\)/);
  assert.match(insert.sql, /ON CONFLICT \(clerk_user_id, card_id\) DO NOTHING/);
  assert.deepEqual(insert.params, [uid, ID]);
  const second = await result(handler, req(path, "POST"), signed);
  assert.equal(second.body.already, true);
  assert(db.queries.filter((q) => q.sql.startsWith("INSERT INTO user_collector_cards")).every((q) => q.params[0] === uid));
  const missing = createAccountRoutes({ env, db: mockDb() });
  assert.deepEqual((await result(missing, req(path, "POST"), signed)).body, { ok: false, error: "not_found" });
});

test("collect denies unsigned callers and DB outage before any write", async () => {
  const db = mockDb({ published });
  const handler = createAccountRoutes({ env, db });
  const path = `/api/me/cards/${ID}/collect`;
  assert.deepEqual(await result(handler, req(path, "POST"), { enabled: true, missingToken: true }), {
    status: 401, headers: (await handler.fetch(req(path, "POST"), { enabled: true, missingToken: true })).headers,
    body: { ok: false, error: "sign_in_required", clerk: true },
  });
  assert.equal((await result(createAccountRoutes({ env }), req(path, "POST"), signed)).status, 503);
  assert.equal(db.queries.length, 0);
});

test("collect query failures do not echo DB errors or write a different user's card", async () => {
  const db = mockDb({ published, fail: "INSERT INTO user_collector_cards" });
  const { body, status } = await result(createAccountRoutes({ env, db }), req(`/api/me/cards/${ID}/collect`, "POST"), signed);
  assert.equal(status, 500);
  assert.deepEqual(body, { ok: false, error: "collect_failed" });
  assert(db.queries.every((q) => !q.params.includes(other)));
});

test("unsupported paths return null; wrong methods 405; query errors are sanitized", async () => {
  const db = mockDb({ fail: "FROM user_collector_cards u" });
  const handler = createAccountRoutes({ env, db });
  assert.equal(await handler.fetch(req("/api/me/runs"), signed), null);
  const wrong = await result(handler, req("/api/me/cards", "POST"), signed);
  assert.equal(wrong.status, 405);
  assert.equal(wrong.headers.get("allow"), "GET");
  assert.deepEqual(await result(handler, req("/api/me/cards"), signed), {
    status: 500, headers: (await handler.fetch(req("/api/me/cards"), signed)).headers,
    body: { ok: false, error: "cards_failed" },
  });
});

test("account routes reject inconsistent upstream identity and bound declared bodies", async () => {
  const db = mockDb({ published });
  const api = createAccountRoutes({ env, db });
  const path = `/api/me/cards/${ID}/collect`;
  for (const identity of [undefined, { ...signed, invalidToken: true }, { ...signed, userId: "user_123!" }]) {
    assert.equal((await result(api, req(path, "POST"), identity)).status, 401);
  }
  assert.deepEqual((await result(api, req(path, "POST", { headers: { "Content-Length": "1025" } }), signed)).body,
    { ok: false, error: "payload_too_large" });
  assert.equal(db.queries.length, 0);
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createBillingRoutes } from "./billing-routes.mjs";
import { signQuotaGrant } from "../../js/server/ai-quota.mjs";
import { mintGameSessionToken } from "../../js/server/game-session.mjs";

const env = {
  FF_API_SECRET: "private-server-secret", CLERK_SECRET_KEY: "clerk-secret",
  FF_PUBLIC_ORIGIN: "https://cloud.warmersun.com", FF_CLOUD_AI_BUDGET: "100",
  FF_QUOTA_IMAGE: "60", CLERK_WEBHOOK_SECRET: "whsec_test",
};
const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyXzEifQ.signature";
const future = "2099-01-01T00:00:00.000Z";
const period = "2026-10-01T00:00:00.000Z";

it("standalone billing preflight accepts private-LAN origins by default, never public HTTP", async () => {
  const lan = "http://192.168.1.140:8765";
  const request = (origin, path = "/api/me/ai/reserve") => new Request(`https://cloud.warmersun.com${path}`, {
    method: "OPTIONS", headers: { Origin: origin, "Access-Control-Request-Headers": "authorization,content-type" },
  });
  for (const name of ["FF_GAME_DEVICE_ORIGINS", "FF_CLOUD_CORS_ORIGINS"]) {
    const api = createBillingRoutes({ env: { ...env, [name]: `${lan},http://public.example` } });
    const allowed = await api.fetch(request(lan));
    assert.equal(allowed.status, 204);
    assert.equal(allowed.headers.get("Access-Control-Allow-Origin"), lan);
    assert.equal(allowed.headers.get("Access-Control-Allow-Headers"), "Authorization, Content-Type");
    // Unconfigured private-LAN origins (different host/port) are allowed by default.
    for (const extraLan of ["http://192.168.1.141:8765", "http://192.168.1.140:8766"]) {
      const extra = await api.fetch(request(extraLan));
      assert.equal(extra.status, 204, extraLan);
      assert.equal(extra.headers.get("Access-Control-Allow-Origin"), extraLan);
    }
    const denied = await api.fetch(request("http://public.example"));
    assert.equal(denied.status, 403);
    assert.equal(denied.headers.get("Access-Control-Allow-Origin"), null);
    // With the LAN switch off, unconfigured LAN origins are forbidden again.
    const strict = createBillingRoutes({ env: { ...env, [name]: `${lan},http://public.example`, FF_ALLOW_LAN_ORIGINS: "0" } });
    for (const origin of ["http://192.168.1.141:8765", "http://192.168.1.140:8766", "http://public.example"]) {
      const forbidden = await strict.fetch(request(origin));
      assert.equal(forbidden.status, 403, origin);
      assert.equal(forbidden.headers.get("Access-Control-Allow-Origin"), null);
    }
    // Loopback and the explicitly listed origin keep working while LAN is off.
    for (const kept of ["http://127.0.0.1:8765", lan]) {
      const ok = await strict.fetch(request(kept));
      assert.equal(ok.status, 204, kept);
      assert.equal(ok.headers.get("Access-Control-Allow-Origin"), kept);
    }
    for (const path of ["/api/internal/ai/reserve", "/api/me/ai/settle", "/api/webhooks/clerk"]) {
      assert.equal((await api.fetch(request(lan, path))).status, 403);
    }
  }
  // Default env: private-LAN origins need no configuration.
  const allowed = await createBillingRoutes({ env }).fetch(request(lan));
  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers.get("Access-Control-Allow-Origin"), lan);
  const denied = await createBillingRoutes({ env }).fetch(request("http://public.example"));
  assert.equal(denied.status, 403);
  assert.equal(denied.headers.get("Access-Control-Allow-Origin"), null);
});

function fakeDb() {
  let data = { users: new Map(), subs: new Map(), ledger: new Map(), reservations: new Map(), events: new Set(), grant: "grant-key" };
  const billing = new Map();
  data.users.set("user_1", { username: null });
  data.subs.set("user_1", { plan_slug: "cloud", status: "active", period_start: period, period_end: future });
  let tail = Promise.resolve();
  let failNext = false;
  const log = [];
  async function query(s, sql, a = []) {
    log.push([sql, a]);
    if (failNext && sql.includes("INSERT INTO ai_quota_reservations")) { failNext = false; throw new Error("DB secret: no logging"); }
    const key = (u, p) => `${u}|${p}`;
    if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK" || sql.startsWith("SELECT pg_advisory")) return { rows: [] };
    if (sql.includes("FROM quota_grant_key")) return { rows: s.grant ? [{ secret: s.grant }] : [] };
    if (sql.includes("FROM subscriptions WHERE")) return { rows: s.subs.has(a[0]) ? [s.subs.get(a[0])] : [] };
    if (sql.includes("UPDATE ai_quota_reservations SET settled = true, settled_points = held_points")) return { rows: [] };
    if (sql.includes("DELETE FROM ai_quota_reservations WHERE clerk_user_id")) return { rows: [] };
    if (sql.includes("INSERT INTO ai_usage_period")) {
      if (!s.ledger.has(key(a[0], a[1]))) s.ledger.set(key(a[0], a[1]), { spent_points: 0, held_points: 0 });
      return { rows: [] };
    }
    if (sql.includes("SELECT spent_points, held_points FROM ai_usage_period")) {
      const row = s.ledger.get(key(a[0], a[1]));
      return { rows: row ? [{ ...row }] : [] };
    }
    if (sql.includes("UPDATE ai_usage_period SET held_points = held_points + $3")) {
      s.ledger.get(key(a[0], a[1])).held_points += a[2]; return { rows: [] };
    }
    if (sql.includes("UPDATE ai_usage_period SET spent_points = spent_points + $3")) {
      const row = s.ledger.get(key(a[0], a[1]));
      row.spent_points += a[2]; row.held_points = Math.max(0, row.held_points - (a[3] ?? a[2]));
      return { rows: [] };
    }
    if (sql.includes("INSERT INTO ai_quota_reservations")) {
      s.reservations.set(a[0], { clerk_user_id: a[1], period_start: a[2], kind: a[3], held_points: a[4], settle_token: a[5], settled: false, settled_points: null });
      return { rows: [] };
    }
    if (sql.includes("FROM ai_quota_reservations WHERE id")) {
      const row = s.reservations.get(a[0]); return { rows: row ? [{ ...row }] : [] };
    }
    if (sql.includes("UPDATE ai_quota_reservations SET settled = true, settled_points = $2")) {
      const row = s.reservations.get(a[0]); row.settled = true; row.settled_points = a[1]; return { rows: [] };
    }
    if (sql.includes("INSERT INTO clerk_webhook_events")) {
      if (s.events.has(a[0])) return { rows: [] };
      s.events.add(a[0]); return { rows: [{ event_id: a[0] }] };
    }
    if (sql.includes("INSERT INTO users")) { if (!s.users.has(a[0])) s.users.set(a[0], { username: null }); return { rows: [] }; }
    if (sql.includes("UPDATE users SET username")) {
      if (!s.users.get(a[0]).username && ![...s.users.values()].some((u) => u.username === a[1])) s.users.get(a[0]).username = a[1];
      return { rows: [] };
    }
    if (sql.includes("DELETE FROM users")) { s.users.delete(a[0]); s.subs.delete(a[0]); return { rows: [] }; }
    if (sql.includes("INSERT INTO subscriptions")) {
      s.subs.set(a[0], { plan_slug: a[1], status: a[2], period_start: a[3], period_end: a[4] }); return { rows: [] };
    }
    if (sql.includes("INSERT INTO achievements")) return { rows: [] };
    throw new Error(`Unexpected query: ${sql}`);
  }
  return {
    get data() { return data; }, billing, log,
    failInsert() { failNext = true; },
    async query(sql, a) { return query(data, sql, a); },
    async connect() {
      let unlock;
      const prev = tail;
      tail = new Promise((resolve) => { unlock = resolve; });
      await prev;
      let copy = structuredClone(data);
      return {
        async query(sql, a) {
          if (sql === "COMMIT") data = copy;
          return query(copy, sql, a);
        },
        release() { unlock(); },
      };
    },
  };
}
function app(db, overrides = {}) {
  return createBillingRoutes({ env, db, verifyClerk: async () => ({ sub: "user_1" }),
    getUserBillingSubscription: async (uid) => db.billing.get(uid),
    verifySignedWebhook: async (headers, raw, secret) => {
      assert.equal(secret, env.CLERK_WEBHOOK_SECRET);
      const expected = createHmac("sha256", secret).update(raw).digest("hex");
      if (headers.get("x-fixture-signature") !== expected) throw new Error("signature mismatch");
      return JSON.parse(raw);
    }, ...overrides });
}
function req(path, body, headers = {}, method = "POST") {
  return new Request(`https://function.example${path}`, { method, headers: { "Content-Type": "application/json", ...headers },
    ...(body === undefined ? {} : { body: typeof body === "string" ? body : JSON.stringify(body) }) });
}
async function call(api, path, body, headers = {}, method = "POST") {
  const r = await api.fetch(req(path, body, headers, method));
  return { status: r.status, body: await r.json(), headers: r.headers };
}
const auth = { Authorization: `Bearer ${jwt}` };
const internal = { "X-FF-Secret": env.FF_API_SECRET };
function signed(evt) {
  const raw = JSON.stringify(evt);
  return { raw, headers: { "x-fixture-signature": createHmac("sha256", env.CLERK_WEBHOOK_SECRET).update(raw).digest("hex") } };
}

describe("staged quota routes", () => {
  it("locks the payer before the subscription row, in the same order as webhooks", async () => {
    const db = fakeDb(), api = app(db);
    assert.equal((await call(api, "/api/me/ai/reserve", { kind: "image" }, auth)).status, 200);
    const advisory = db.log.findIndex(([sql]) => sql.includes("pg_advisory_xact_lock"));
    const subscription = db.log.findIndex(([sql]) => sql.includes("FROM subscriptions") && sql.includes("FOR SHARE"));
    assert(advisory >= 0 && advisory < subscription, "reserve must take advisory lock before FOR SHARE");
    assert.deepEqual(db.log[advisory][1], ["user_1"]);
    db.log.length = 0;
    db.billing.set("user_1", { subscriptionItems: [] });
    const event = signed({ id: "evt_lock_order", type: "subscriptionItem.canceled", data: { payer: { user_id: "user_1" } } });
    const webhook = app(db, { getUserBillingSubscription: async (id) => {
      assert(db.log.some(([sql, args]) => sql.includes("pg_advisory_xact_lock") && args[0] === id));
      assert(!db.log.some(([sql]) => sql.includes("INSERT INTO subscriptions")));
      return db.billing.get(id);
    } });
    assert.equal((await call(webhook, "/api/webhooks/clerk", event.raw, event.headers)).status, 200);
    const webhookLock = db.log.findIndex(([sql]) => sql.includes("pg_advisory_xact_lock"));
    const write = db.log.findIndex(([sql]) => sql.includes("INSERT INTO subscriptions"));
    assert(webhookLock >= 0 && webhookLock < write);
  });
  it("rejects missing secrets, invalid Clerk identity, game JWT, wrong methods and body limits", async () => {
    const db = fakeDb(); const api = app(db);
    assert.equal((await call(createBillingRoutes({ env: {}, db }), "/api/me/ai/reserve", { kind: "image" }, auth)).status, 402);
    assert.equal((await call(api, "/api/me/ai/reserve", { kind: "image" })).status, 402);
    const game = mintGameSessionToken({ userId: "user_1" }, env);
    assert.equal((await call(api, "/api/me/ai/reserve", { kind: "image" }, { Authorization: `Bearer ${game}` })).status, 200);
    assert.equal((await call(api, "/api/me/ai/reserve", { kind: "image" }, { Authorization: `Bearer ${game.slice(0, -2)}xx` })).status, 402);
    const expired = mintGameSessionToken({ userId: "user_1" }, env, { nowSec: 1, ttlSec: 1 });
    assert.equal((await call(api, "/api/me/ai/reserve", { kind: "image" }, { Authorization: `Bearer ${expired}` })).status, 402);
    const sessionEnv = { ...env, CLERK_SECRET_KEY: "", FF_PORTAL_SESSION_SECRET: "separate-game-secret" };
    const sessionOnly = createBillingRoutes({ env: sessionEnv, db, verifyClerk: async () => { throw new Error("must not verify via Clerk"); } });
    assert.equal((await call(sessionOnly, "/api/me/ai/reserve", { kind: "image" },
      { Authorization: `Bearer ${mintGameSessionToken({ userId: "user_1" }, sessionEnv)}` })).status, 429);
    assert.equal((await call(api, "/api/internal/ai/reserve", { kind: "image", userId: "user_1" })).status, 503);
    assert.equal((await call(api, "/api/me/ai/settle", { reservationId: "x" })).status, 503);
    assert.equal((await call(api, "/api/internal/ai/reserve", { kind: "image", userId: "user_1", quotaGrant: "bad" }, internal)).status, 403);
    assert.equal((await call(api, "/api/me/ai/reserve", undefined, auth, "GET")).status, 405);
    assert.equal((await call(api, "/api/me/ai/reserve", { kind: "image" }, auth)).headers.get("Access-Control-Allow-Origin"), null);
    assert.equal((await call(api, "/api/me/ai/reserve", "x".repeat(9000), auth)).status, 413);
    assert.equal((await call(api, "/api/unknown", {})).status, 404);
    assert.equal((await call(createBillingRoutes({ env }), "/api/me/ai/reserve", { kind: "image" }, auth)).status, 503);
  });
  it("handles browser preflight and echoes only permitted origins on every reserve outcome", async () => {
    const db = fakeDb(), api = app(db);
    const origin = "https://ff.warmersun.com";
    const preflight = await api.fetch(req("/api/me/ai/reserve", undefined, {
      Origin: origin, "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "authorization,content-type",
    }, "OPTIONS"));
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get("Access-Control-Allow-Origin"), origin);
    assert.equal(preflight.headers.get("Access-Control-Allow-Methods"), "POST, OPTIONS");
    assert.match(preflight.headers.get("Access-Control-Allow-Headers"), /Authorization/);
    assert.equal((await call(api, "/api/me/ai/reserve", { kind: "image" }, { ...auth, Origin: origin })).headers.get("Access-Control-Allow-Origin"), origin);
    const denied = await call(api, "/api/me/ai/reserve", {}, { Origin: origin });
    assert.equal(denied.status, 402);
    assert.equal(denied.headers.get("Access-Control-Allow-Origin"), origin);
    const evil = await call(api, "/api/me/ai/reserve", { kind: "image" }, { ...auth, Origin: "https://evil.example" });
    assert.equal(evil.status, 403);
    assert.equal(evil.headers.get("Access-Control-Allow-Origin"), null);
    assert.equal((await call(api, "/api/internal/ai/reserve", {}, { ...internal, Origin: origin })).status, 403);
    assert.equal((await call(api, "/api/webhooks/clerk", {}, { Origin: origin })).status, 403);
    assert.equal((await api.fetch(req("/api/webhooks/clerk", undefined, {}, "OPTIONS"))).status, 405);
  });
  it("atomically holds, caps, settles and retries without double charge across isolates", async () => {
    const db = fakeDb(), a = app(db), b = app(db);
    const [one, two] = await Promise.all([
      call(a, "/api/me/ai/reserve", { kind: "image" }, auth),
      call(b, "/api/me/ai/reserve", { kind: "image" }, auth),
    ]);
    assert.deepEqual([one.status, two.status].sort(), [200, 429]);
    assert.equal(db.data.ledger.get(`user_1|${period}`).held_points, 60);
    const ticket = [one, two].find((r) => r.status === 200).body;
    assert.equal(ticket.remainingMicro, 40);
    assert.equal((await call(a, "/api/me/ai/settle", { reservationId: ticket.reservationId, userId: "other", settleToken: ticket.settleToken, bill: true }, internal)).status, 403);
    assert.equal((await call(a, "/api/me/ai/settle", { reservationId: ticket.reservationId, userId: "user_1", settleToken: "bad", bill: true }, internal)).status, 403);
    const measure = { reservationId: ticket.reservationId, userId: "user_1", settleToken: ticket.settleToken, bill: true };
    const settled = await Promise.all([call(a, "/api/me/ai/settle", measure, internal), call(b, "/api/me/ai/settle", measure, internal)]);
    assert.deepEqual(settled.map((r) => r.body.idempotent || false).sort(), [false, true]);
    assert.deepEqual(db.data.ledger.get(`user_1|${period}`), { spent_points: 60, held_points: 0 });
    assert.equal((await call(a, "/api/me/ai/reserve", { kind: "image" }, auth)).status, 429);
    assert.equal((await call(a, "/api/me/ai/reserve", { kind: "other" }, auth)).status, 400);
    db.data.subs.get("user_1").status = "past_due";
    assert.equal((await call(a, "/api/me/ai/reserve", { kind: "image" }, auth)).status, 402);
  });
  it("validates internal quota grants and rolls back a failed reserve", async () => {
    const db = fakeDb(), api = app(db);
    const grant = signQuotaGrant("user_1", db.data.grant);
    assert.equal((await call(api, "/api/internal/ai/reserve", { userId: "other", quotaGrant: grant, kind: "image" }, internal)).status, 403);
    db.failInsert();
    assert.equal((await call(api, "/api/internal/ai/reserve", { userId: "user_1", quotaGrant: grant, kind: "image" }, internal)).status, 503);
    assert.equal(db.data.ledger.size, 0);
    assert.equal((await call(api, "/api/internal/ai/reserve", { userId: "user_1", quotaGrant: grant, kind: "image" }, internal)).status, 200);
    const res = (await call(api, "/api/me/ai/reserve", { kind: "text", inputTokens: 100 }, auth));
    assert.equal(res.status, 429); // max text output hold exceeds remaining 40 points
  });
});

describe("staged Clerk webhook", () => {
  it("verifies raw signed bytes; rejects unsigned, altered and oversized events without writes", async () => {
    const db = fakeDb(), api = app(db);
    const event = { id: "evt_one", type: "user.created", data: { id: "user_2", username: "maker_2", first_name: "Private" } };
    const { raw, headers } = signed(event);
    assert.equal((await call(api, "/api/webhooks/clerk", raw)).status, 401);
    assert.equal((await call(api, "/api/webhooks/clerk", `${raw} `, headers)).status, 401);
    assert.equal((await call(api, "/api/webhooks/clerk", "x".repeat(300000), headers)).status, 413);
    assert.equal(db.data.events.size, 0);
    assert.equal((await call(createBillingRoutes({ env: { ...env, CLERK_WEBHOOK_SECRET: "" }, db }), "/api/webhooks/clerk", raw, headers)).status, 404);
    assert.equal((await call(api, "/api/webhooks/clerk", raw, headers)).status, 200);
    assert.equal(db.data.users.get("user_2").username, "maker_2");
    assert.equal(JSON.stringify([...db.data.users.values()]).includes("Private"), false);
    assert.equal((await call(app(db), "/api/webhooks/clerk", raw, headers)).body.idempotent, true);
  });
  it("exercises Clerk's real Svix verifier with signed raw bytes and rejects tampering", async () => {
    const db = fakeDb();
    const secret = `whsec_${Buffer.from("offline-signing-key").toString("base64")}`;
    const real = createBillingRoutes({ env: { ...env, CLERK_WEBHOOK_SECRET: secret }, db });
    const raw = JSON.stringify({ type: "user.created", data: { id: "user_real", username: "real_maker" } });
    const id = "msg_signed_1", timestamp = Math.floor(Date.now() / 1000);
    const sig = createHmac("sha256", Buffer.from(secret.slice(6), "base64"))
      .update(`${id}.${timestamp}.${raw}`).digest("base64");
    const headers = { "svix-id": id, "svix-timestamp": String(timestamp), "svix-signature": `v1,${sig}` };
    assert.equal((await call(real, "/api/webhooks/clerk", raw, headers)).status, 200);
    assert.equal(db.data.users.get("user_real").username, "real_maker");
    assert.equal(db.data.events.has(id), true);
    assert.equal((await call(real, "/api/webhooks/clerk", `${raw} `, headers)).status, 401);
    assert.equal((await call(real, "/api/webhooks/clerk", raw, { ...headers, "svix-id": "msg_tampered" })).status, 401);
    assert.equal((await call(real, "/api/webhooks/clerk", raw, headers)).body.idempotent, true);
  });
  it("upserts paid billing and handles cancellations idempotently; invalid event rolls back", async () => {
    const db = fakeDb(), api = app(db);
    db.billing.set("user_3", { subscriptionItems: [{ plan: { slug: "paid" }, status: "active", periodStart: 1790812800000, periodEnd: 4070908800000 }] });
    const active = signed({ id: "evt_active", type: "subscription.active", data: { payer: { user_id: "user_3" }, status: "active", items: [{ plan: { slug: "paid" }, period_start: 1790812800000, period_end: 4070908800000 }] } });
    assert.equal((await call(api, "/api/webhooks/clerk", active.raw, active.headers)).body.action, "upsert_subscription");
    assert.equal(db.data.subs.get("user_3").plan_slug, "cloud");
    const cancel = signed({ id: "evt_cancel", type: "subscriptionItem.canceled", data: { payer: { user_id: "user_3" }, plan: { slug: "paid" }, status: "canceled", period_end: 4070908800000 } });
    db.billing.set("user_3", { subscriptionItems: [] });
    assert.equal((await call(api, "/api/webhooks/clerk", cancel.raw, cancel.headers)).status, 200);
    assert.equal(db.data.subs.get("user_3").status, "inactive");
    const broken = signed({ id: "evt_broken", type: "subscription.active", data: {} });
    assert.equal((await call(api, "/api/webhooks/clerk", broken.raw, broken.headers)).status, 400);
    assert.equal(db.data.events.has("evt_broken"), false);
    assert.equal((await call(api, "/api/webhooks/clerk", cancel.raw, cancel.headers)).body.idempotent, true);
    const deleted = signed({ id: "evt_deleted", type: "user.deleted", data: { id: "user_3" } });
    assert.equal((await call(api, "/api/webhooks/clerk", deleted.raw, deleted.headers)).status, 200);
    assert.equal(db.data.users.has("user_3"), false);
  });
  it("reconciles current Clerk state even when distinct signed events arrive reversed or race", async () => {
    const db = fakeDb(), first = app(db), second = app(db);
    db.billing.set("user_4", { subscriptionItems: [{ plan: { slug: "paid" }, status: "active", periodStart: 1790812800000, periodEnd: 4070908800000 }] });
    const older = signed({ id: "evt_older", type: "subscriptionItem.canceled", data: { payer: { user_id: "user_4" }, plan: { slug: "paid" }, status: "canceled" } });
    const newer = signed({ id: "evt_newer", type: "subscription.active", data: { payer: { user_id: "user_4" }, status: "active", items: [{ plan: { slug: "paid" } }] } });
    const replies = await Promise.all([
      call(first, "/api/webhooks/clerk", newer.raw, newer.headers),
      call(second, "/api/webhooks/clerk", older.raw, older.headers),
    ]);
    assert.deepEqual(replies.map((r) => r.status), [200, 200]);
    assert.equal(db.data.subs.get("user_4").status, "active");
    assert.equal(db.data.events.size, 2);
    db.billing.set("user_4", { subscriptionItems: [] });
    const latestCancel = signed({ id: "evt_latest", type: "subscriptionItem.canceled", data: { payer: { user_id: "user_4" }, status: "canceled" } });
    assert.equal((await call(first, "/api/webhooks/clerk", latestCancel.raw, latestCancel.headers)).status, 200);
    assert.equal(db.data.subs.get("user_4").status, "inactive");
    const lateActive = signed({ id: "evt_late_active", type: "subscription.active", data: { payer: { user_id: "user_4" }, status: "active" } });
    assert.equal((await call(second, "/api/webhooks/clerk", lateActive.raw, lateActive.headers)).status, 200);
    assert.equal(db.data.subs.get("user_4").status, "inactive");
  });
  it("rolls back the event id and preserves entitlement when the authoritative read fails", async () => {
    const db = fakeDb();
    const api = app(db, { getUserBillingSubscription: async () => { throw new Error("provider down"); } });
    const event = signed({ id: "evt_failed_read", type: "subscriptionItem.canceled", data: { payer: { user_id: "user_1" } } });
    assert.equal((await call(api, "/api/webhooks/clerk", event.raw, event.headers)).status, 503);
    assert.equal(db.data.events.has("evt_failed_read"), false);
    assert.equal(db.data.subs.get("user_1").status, "active");
    const recovered = app(db);
    db.billing.set("user_1", { subscriptionItems: [] });
    assert.equal((await call(recovered, "/api/webhooks/clerk", event.raw, event.headers)).status, 200);
    assert.equal(db.data.subs.get("user_1").status, "inactive");
  });
  it("stores a content plan as content and keeps cloud when both items are active", async () => {
    const db = fakeDb(), api = app(db);
    db.billing.set("user_6", { subscriptionItems: [{ plan: { slug: "content" }, status: "active", periodStart: 1790812800000, periodEnd: 4070908800000 }] });
    const content = signed({ id: "evt_content", type: "subscription.active", data: { payer: { user_id: "user_6" }, status: "active" } });
    assert.equal((await call(api, "/api/webhooks/clerk", content.raw, content.headers)).status, 200);
    assert.equal(db.data.subs.get("user_6").plan_slug, "content");
    db.billing.set("user_6", { subscriptionItems: [
      { plan: { slug: "content" }, status: "active", periodStart: 1790812800000, periodEnd: 4070908800000 },
      { plan: { slug: "cloud" }, status: "active", periodStart: 1790812800000, periodEnd: 4070908800000 },
    ] });
    const both = signed({ id: "evt_both", type: "subscription.updated", data: { payer: { user_id: "user_6" }, status: "active" } });
    assert.equal((await call(api, "/api/webhooks/clerk", both.raw, both.headers)).status, 200);
    assert.equal(db.data.subs.get("user_6").plan_slug, "cloud");
  });
  it("rejects hosted AI reserve for a content plan", async () => {
    const db = fakeDb();
    db.data.subs.set("user_1", { plan_slug: "content", status: "active", period_start: period, period_end: future });
    const denied = await call(app(db), "/api/me/ai/reserve", { kind: "image" }, auth);
    assert.equal(denied.status, 402);
    assert.equal(denied.body.error, "subscription_required");
  });
  it("preserves canceled paid-through-period entitlement from the current snapshot", async () => {
    const db = fakeDb(), api = app(db);
    db.billing.set("user_5", { subscriptionItems: [{ status: "canceled", plan: { slug: "paid" }, periodEnd: 4070908800000 }] });
    const event = signed({ id: "evt_grace", type: "subscriptionItem.canceled", data: { payer: { user_id: "user_5" } } });
    assert.equal((await call(api, "/api/webhooks/clerk", event.raw, event.headers)).status, 200);
    assert.equal(db.data.subs.get("user_5").status, "canceled");
    assert.equal(db.data.subs.get("user_5").period_end, "2099-01-01T00:00:00.000Z");
  });
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createCloudApi } from "./cloud-api.mjs";
import { mintGameSessionToken } from "../../js/server/game-session.mjs";

const env = {
  DATABASE_URL: "postgresql://not-used",
  CLERK_SECRET_KEY: "test-secret-not-for-production",
  CLERK_PUBLISHABLE_KEY: "pk_test_fixture",
  FF_PUBLIC_ORIGIN: "https://cloud.warmersun.com",
  FF_GAME_DEVICE_ORIGINS: "https://play.example",
};
const jwt = "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyXzEifQ.sig";
const code = "ABCDEFGHIJKLMNOPQRSTUVWX";

function fakeDb() {
  const rows = new Map();
  let now = 0;
  return {
    rows,
    tick(ms) { now += ms; },
    async query(sql, args = []) {
      if (sql === "SELECT 1") return { rows: [{}] };
      if (sql.startsWith("DELETE FROM device_handshakes WHERE expires_at")) {
        for (const [key, row] of rows) if (row.expires <= now) rows.delete(key);
        return { rows: [] };
      }
      const [key, token] = args;
      if (sql.startsWith("INSERT INTO device_handshakes")) {
        assert.ok(!rows.has(key));
        rows.set(key, { token: null, expires: now + 300_000 });
        return { rows: [] };
      }
      const row = rows.get(key);
      const active = row && row.expires > now;
      if (sql.startsWith("UPDATE device_handshakes")) {
        if (!active || row.token) return { rows: [] };
        row.token = token;
        return { rows: [{ code_hash: key }] };
      }
      if (sql.startsWith("DELETE FROM device_handshakes WHERE code_hash")) {
        if (!active || !row.token) return { rows: [] };
        rows.delete(key);
        return { rows: [{ session_token: row.token }] };
      }
      if (sql.startsWith("SELECT session_token IS NOT NULL")) return { rows: active ? [{ bound: !!row.token }] : [] };
      if (sql.startsWith("SELECT 1 FROM device_handshakes")) return { rows: active ? [{}] : [] };
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };
}
function request(path, method = "GET", opts = {}) {
  return new Request(`https://function.example${path}`, {
    method,
    headers: { ...(opts.body ? { "Content-Type": "application/json" } : {}), ...opts.headers },
    ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
  });
}
async function call(api, path, method = "GET", opts = {}) {
  const res = await api.fetch(request(path, method, opts));
  return { status: res.status, body: await res.json(), headers: res.headers };
}
function app(db, overrides = {}) {
  return createCloudApi({ env, db, generateCode: () => code, verifyClerk: async () => ({ sub: "user_1", sid: "sess_1" }),
    getUserBillingSubscription: async () => null, ...overrides });
}

// Tests use a SQL-shaped stand-in, never a network database. The same db is
// shared across separate handler instances to model isolate restarts.
describe("Neon Cloud API", () => {
  it("health probes DB without leaking keys or URL, and fails closed", async () => {
    const db = fakeDb();
    const good = await call(app(db), "/api/health");
    assert.equal(good.status, 200);
    assert.deepEqual(good.body, { ok: true, service: "portal", clerk: { enabled: true, publishableKey: "pk_test_fixture" }, apiOrigin: "https://cloud.warmersun.com", db: { enabled: true } });
    assert.equal(JSON.stringify(good.body).includes("secret"), false);
    assert.equal((await call(app({ query: async () => { throw new Error("DATABASE_URL=secret"); } }), "/api/health")).status, 503);
    const disabled = await call(createCloudApi({ env: {} }), "/api/device/start", "POST");
    assert.deepEqual(disabled.body, { ok: false, error: "clerk_off" });
  });

  it("persists a hashed one-time code across instances and returns signed session once", async () => {
    const db = fakeDb();
    const first = app(db);
    const started = await call(first, "/api/device/start", "POST");
    assert.equal(started.status, 200);
    assert.equal(started.body.code, code);
    assert.equal(started.body.signInUrl, `https://cloud.warmersun.com/signin?device=${code}`);
    assert.equal(db.rows.has(createHash("sha256").update(code).digest("hex")), true);
    assert.equal(db.rows.has(code), false);
    const second = app(db);
    assert.deepEqual((await call(second, `/api/device/status?code=${code}`)).body, { ok: true, pending: true });
    const auth = { Authorization: `Bearer ${jwt}` };
    assert.equal((await call(second, "/api/device/complete", "POST", { headers: auth, body: { code } })).status, 200);
    assert.deepEqual((await call(first, "/api/device/complete", "POST", { headers: auth, body: { code } })).body, { ok: false, error: "already_bound" });
    const results = await Promise.all([
      call(first, `/api/device/status?code=${code}`), call(second, `/api/device/status?code=${code}`),
    ]);
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 404]);
    const redeemed = results.find((r) => r.status === 200).body;
    assert.equal(redeemed.pending, false);
    const payload = JSON.parse(Buffer.from(redeemed.token.split(".")[1], "base64url"));
    assert.equal(payload.sub, "user_1");
    assert.equal(payload.typ, "ff_game");
    assert.equal((await call(first, `/api/device/status?code=${code}`)).status, 404);
  });

  it("uses the separate mounted portal for game-initiated sign-in", async () => {
    const mounted = app(fakeDb(), { env: { ...env, FF_PORTAL_UI_URL: "https://warmersun.com/portal/" } });
    const started = await call(mounted, "/api/device/start", "POST", { headers: { Origin: "https://warmersun.com" } });
    assert.equal(started.status, 200);
    assert.equal(started.body.signInUrl, `https://warmersun.com/portal/signin?device=${code}`);
    assert.equal(started.headers.get("Access-Control-Allow-Origin"), "https://warmersun.com");
    const invalid = app(fakeDb(), { env: { ...env, FF_PORTAL_UI_URL: "https://evil.example/portal?next=1" } });
    assert.deepEqual((await call(invalid, "/api/device/start", "POST")).body,
      { ok: false, error: "portal_origin_unconfigured" });
  });

  it("enforces expiry, body limits, signed Clerk identity, and blocks game token rebinding", async () => {
    const db = fakeDb();
    const api = app(db);
    await call(api, "/api/device/start", "POST");
    const gameJwt = mintGameSessionToken({ userId: "user_1" }, env);
    assert.equal((await call(api, "/api/device/complete", "POST", { headers: { Authorization: `Bearer ${gameJwt}` }, body: { code } })).status, 401);
    assert.equal((await call(api, "/api/device/complete", "POST", { body: { code } })).status, 401);
    assert.equal((await call(api, "/api/device/complete", "POST", { headers: { Authorization: `Bearer ${jwt}` }, body: { code: "x".repeat(2048) } })).status, 413);
    db.tick(300_000);
    assert.deepEqual((await call(api, `/api/device/status?code=${code}`)).body, { ok: false, error: "unknown" });
    assert.deepEqual((await call(api, "/api/device/complete", "POST", { headers: { Authorization: `Bearer ${jwt}` }, body: { code } })).body, { ok: false, error: "unknown" });
    const denied = app(db, { verifyClerk: async () => { throw new Error("invalid signature"); } });
    assert.equal((await call(denied, "/api/me", "GET", { headers: { Authorization: `Bearer ${jwt}` } })).status, 401);
    assert.equal((await call(denied, "/api/device/complete", "POST", { headers: { Authorization: `Bearer ${jwt}` }, body: { code } })).status, 401);
  });

  it("permits only configured origins, preflights Bearer, never grants wildcard CORS", async () => {
    const db = fakeDb();
    const api = app(db);
    const evil = await call(api, "/api/device/start", "POST", { headers: { Origin: "https://evil.example" } });
    assert.equal(evil.status, 403);
    assert.equal(evil.headers.get("Access-Control-Allow-Origin"), null);
    assert.equal(db.rows.size, 0);
    const allowed = await call(api, "/api/device/start", "POST", { headers: { Origin: "https://play.example" } });
    assert.equal(allowed.headers.get("Access-Control-Allow-Origin"), "https://play.example");
    const preflight = await api.fetch(request("/api/device/complete", "OPTIONS", { headers: { Origin: "https://play.example", "Access-Control-Request-Headers": "authorization,content-type" } }));
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get("Access-Control-Allow-Headers"), "Authorization, Content-Type");
    assert.equal((await call(api, "/api/device/start")).status, 405);
    assert.equal((await call(api, "/api/unimplemented")).status, 404);
  });

  it("/api/me returns account state for Clerk and signed game tokens, not forged headers", async () => {
    const api = app(fakeDb());
    assert.deepEqual((await call(api, "/api/me")).body, { ok: true, signedIn: false, clerk: true, db: true });
    const signed = await call(api, "/api/me", "GET", { headers: { Authorization: `Bearer ${jwt}` } });
    assert.equal(signed.status, 200);
    assert.deepEqual(signed.body.solvedIds, []);
    assert.deepEqual({ signedIn: signed.body.signedIn, userId: signed.body.userId, sessionId: signed.body.sessionId },
      { signedIn: true, userId: "user_1", sessionId: "sess_1" });
    const game = await call(api, "/api/me", "GET", { headers: { Authorization: `Bearer ${mintGameSessionToken({ userId: "user_1" }, env)}` } });
    assert.equal(game.status, 200);
    assert.equal(game.body.userId, "user_1");
    assert.equal((await call(api, "/api/me", "GET", { headers: { Authorization: "Bearer forged", "X-User-Id": "user_1" } })).status, 401);
  });

  it("wires the verified player identity and offline Clerk provider into profile reads", async () => {
    const seen = [];
    const db = {
      async query(sql, args) {
        if (sql.includes("FROM users WHERE clerk_user_id")) {
          assert.equal(args[0], "user_1");
          return { rows: [{ clerk_user_id: "user_1", display_name: "Inventor", is_public: false }] };
        }
        if (sql.includes("SELECT tech_ids FROM runs")) return { rows: [] };
        throw new Error("Unexpected profile query");
      },
    };
    const api = app(db, { getUser: async (userId) => {
      seen.push(userId);
      return { primaryEmailAddressId: "email_1", emailAddresses: [{ id: "email_1", emailAddress: "fixture@example.com" }],
        externalAccounts: [{ provider: "oauth_google" }], firstName: "Private" };
    } });
    const result = await call(api, "/api/me/profile", "GET", { headers: { Authorization: `Bearer ${jwt}` } });
    assert.equal(result.status, 200);
    assert.deepEqual(result.body.login, { email: "fixture@example.com", providers: ["Google"] });
    assert.deepEqual(seen, ["user_1"]);
    assert.equal(JSON.stringify(result.body).includes("Private"), false);
  });

  it("dispatches all owned route slices, scopes identity and preflights writes", async () => {
    const api = app(fakeDb(), { loadCatalog: async () => ({ ok: true, url: "bucket", quests: [], errors: [] }) });
    assert.deepEqual((await call(api, "/api/quests")).body.quests, []);
    assert.equal((await call(api, "/api/me/pins")).status, 401);
    assert.equal((await call(api, "/api/me/cards")).status, 401);
    assert.equal((await call(api, "/api/me/quests/q-1/score", "POST")).status, 401);
    assert.equal((await call(api, "/api/me/quests/q-1/still", "PUT")).status, 401);
    assert.equal((await call(api, "/api/me/ai/reserve", "POST", { body: { kind: "image" } })).status, 402);
    const preflight = await api.fetch(request("/api/me/quests/q-1/still", "OPTIONS", { headers: { Origin: "https://warmersun.com" } }));
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get("Access-Control-Allow-Methods"), "PUT, OPTIONS");
    assert.equal((await call(api, "/api/me/pins", "GET", { headers: { Origin: "https://evil.example" } })).status, 403);
    assert.equal((await call(api, "/api/me/unknown")).status, 404);
  });
});

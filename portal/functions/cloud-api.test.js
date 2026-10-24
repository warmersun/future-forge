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
    loadCatalog: async () => ({ ok: true, quests: [] }), getUserBillingSubscription: async () => null, ...overrides });
}

// Tests use a SQL-shaped stand-in, never a network database. The same db is
// shared across separate handler instances to model isolate restarts.
describe("Neon Cloud API", () => {
  it("permits configured and private-LAN CORS end-to-end, never public HTTP", async () => {
    const lan = "http://192.168.1.140:8765";
    const other = "http://192.168.1.141:8765";
    const publicHttp = "http://public.example";
    const routes = [["/api/health", "GET"], ["/api/device/start", "POST"],
      [`/api/device/status?code=${code}`, "GET"], ["/api/me", "GET"], ["/api/quests", "GET"],
      ["/api/health", "OPTIONS"], ["/api/device/complete", "OPTIONS"], ["/api/me", "OPTIONS"],
      ["/api/quests", "OPTIONS"], ["/api/me/ai/reserve", "OPTIONS"]];
    for (const name of ["FF_GAME_DEVICE_ORIGINS", "FF_CLOUD_CORS_ORIGINS"]) {
      const api = app(fakeDb(), { env: { ...env, [name]: `${lan},${publicHttp}` },
        loadCatalog: async () => ({ ok: true, quests: [] }) });
      for (const [path, method] of routes) {
        const res = await api.fetch(request(path, method, { headers: { Origin: lan } }));
        assert.equal(res.status, method === "OPTIONS" ? 204 : 200, `${name}: ${method} ${path}`);
        assert.equal(res.headers.get("Access-Control-Allow-Origin"), lan);
        assert.equal(res.headers.get("Access-Control-Allow-Private-Network"), null);
        if (method === "OPTIONS") assert.equal(res.headers.get("Access-Control-Allow-Headers"), "Authorization, Content-Type");
        const forbidden = await api.fetch(request(path, method, { headers: { Origin: publicHttp } }));
        assert.equal(forbidden.status, 403, `${publicHttp}: ${method} ${path}`);
        assert.equal(forbidden.headers.get("Access-Control-Allow-Origin"), null);
        assert.equal((await forbidden.json()).error, "origin_forbidden");
      }
      // Unconfigured private-LAN origins (different host/port) are allowed by default.
      for (const extraLan of [other, "http://192.168.1.140:8766"]) {
        const extraApi = app(fakeDb(), { env: { ...env, [name]: `${lan},${publicHttp}` },
          loadCatalog: async () => ({ ok: true, quests: [] }) });
        for (const [path, method] of routes) {
          const extra = await extraApi.fetch(request(path, method, { headers: { Origin: extraLan } }));
          assert.equal(extra.status, method === "OPTIONS" ? 204 : 200, `${extraLan}: ${method} ${path}`);
          assert.equal(extra.headers.get("Access-Control-Allow-Origin"), extraLan);
        }
      }
      // With the LAN switch off, unconfigured LAN origins are forbidden again,
      // while loopback and the explicitly listed origin keep working.
      const strictEnv = { ...env, [name]: `${lan},${publicHttp}`, FF_ALLOW_LAN_ORIGINS: "0" };
      for (const denied of [other, publicHttp, "http://192.168.1.140:8766"]) {
        const strict = app(fakeDb(), { env: strictEnv, loadCatalog: async () => ({ ok: true, quests: [] }) });
        for (const [path, method] of routes) {
          const deniedRes = await strict.fetch(request(path, method, { headers: { Origin: denied } }));
          assert.equal(deniedRes.status, 403, `${denied}: ${method} ${path}`);
          assert.equal(deniedRes.headers.get("Access-Control-Allow-Origin"), null);
          assert.equal((await deniedRes.json()).error, "origin_forbidden");
        }
      }
      for (const kept of ["http://127.0.0.1:8765", lan]) {
        const keptApi = app(fakeDb(), { env: strictEnv, loadCatalog: async () => ({ ok: true, quests: [] }) });
        for (const [path, method] of routes) {
          const keptRes = await keptApi.fetch(request(path, method, { headers: { Origin: kept } }));
          assert.equal(keptRes.status, method === "OPTIONS" ? 204 : 200, `${kept}: ${method} ${path}`);
          assert.equal(keptRes.headers.get("Access-Control-Allow-Origin"), kept);
        }
      }
    }
    const handoff = app(fakeDb(), { env: { ...env, FF_GAME_DEVICE_ORIGINS: lan } });
    const headers = { Origin: lan, Authorization: `Bearer ${jwt}` };
    assert.equal((await call(handoff, "/api/device/start", "POST", { headers })).status, 200);
    const complete = await call(handoff, "/api/device/complete", "POST", { headers, body: { code } });
    assert.equal(complete.status, 200);
    assert.equal(complete.headers.get("Access-Control-Allow-Origin"), lan);
    const redeemed = await call(handoff, `/api/device/status?code=${code}`, "GET", { headers });
    assert.equal(redeemed.status, 200);
    assert.equal(redeemed.body.pending, false);
    assert.equal(typeof redeemed.body.token, "string");
    const account = await call(handoff, "/api/me", "GET", { headers });
    assert.equal(account.status, 200);
    assert.equal(account.body.signedIn, true);
    assert.equal(account.headers.get("Access-Control-Allow-Origin"), lan);
    // Default env: private-LAN origins are permitted without configuration.
    const defaults = app(fakeDb());
    for (const [path, method] of routes) {
      const res = await defaults.fetch(request(path, method, { headers: { Origin: lan } }));
      assert.equal(res.status, method === "OPTIONS" ? 204 : 200, `${method} ${path}`);
      assert.equal(res.headers.get("Access-Control-Allow-Origin"), lan);
      const forbidden = await defaults.fetch(request(path, method, { headers: { Origin: publicHttp } }));
      assert.equal(forbidden.status, 403, `${publicHttp}: ${method} ${path}`);
      assert.equal(forbidden.headers.get("Access-Control-Allow-Origin"), null);
    }
    // With the switch off, the default env forbids unconfigured LAN origins.
    const strictDefaults = app(fakeDb(), { env: { ...env, FF_ALLOW_LAN_ORIGINS: "0" } });
    for (const [path, method] of routes) {
      const res = await strictDefaults.fetch(request(path, method, { headers: { Origin: lan } }));
      assert.equal(res.status, 403, `${method} ${path}`);
      assert.equal(res.headers.get("Access-Control-Allow-Origin"), null);
      const loopback = await strictDefaults.fetch(request(path, method, { headers: { Origin: "http://127.0.0.1:8765" } }));
      assert.equal(loopback.status, method === "OPTIONS" ? 204 : 200, `${method} ${path}`);
    }
  });

  it("dispatches server-selected package starts with verified identity and server billing", async () => {
    const ref = { packageId: "official-world", revision: `sha256:${"ab".repeat(32)}`, questId: "q1" };
    const calls = [];
    const runId = "11111111-1111-4111-8111-111111111111";
    let saved;
    const db = { async query(sql, args = []) {
      calls.push({ sql, args });
      if (sql.includes("FROM subscriptions")) return { rows: [] };
      if (sql.startsWith("INSERT INTO runs")) return { rows: [{ id: runId }] };
      if (sql.includes("FROM runs WHERE clerk_user_id = $1 AND id = $2::uuid")) {
        assert.deepEqual(args, ["user_1", runId]);
        return { rows: [{ id: runId, clerk_user_id: "user_1", quest_id: "q1",
          package_id: ref.packageId, package_revision: ref.revision, package_quest_id: ref.questId }] };
      }
      if (sql.startsWith("INSERT INTO run_state")) saved = { run_id: args[1], quest_id: args[2], play: JSON.parse(args[6]) };
      if (sql.includes("FROM run_state WHERE")) return { rows: saved ? [saved] : [] };
      return { rows: [] };
    }, async connect() { return { query: db.query, release() {} }; } };
    let revoked = false;
    const api = app(db, { loadCatalog: async (opts) => {
      assert.equal(opts.force, true);
      return { ok: true, quests: [{ id: "q1", packageRef: ref }] };
    }, resolvePackage: async (r, opts) => {
      assert.deepEqual(r, ref);
      assert.equal(opts.identity.userId, "user_1");
      assert.equal(opts.entitled, false);
      return revoked ? { ok: false, code: "subscription_required", status: 402 } : { ok: true, packageRef: ref,
        record: { mission: { id: "q1", title: "Official" } }, runWorld: { bank: { id: "official-bank" } } };
    } });
    const opts = { headers: { Authorization: `Bearer ${jwt}` }, body: { questId: "q1", userId: "user_forged", entitled: true } };
    const started = await call(api, "/api/me/runs/start", "POST", opts);
    assert.equal(started.status, 200);
    assert.deepEqual(started.body.packageRef, ref);
    assert.equal(calls.find((c) => c.sql.startsWith("INSERT INTO runs")).args[0], "user_1");
    assert.equal(calls.find((c) => c.sql.startsWith("INSERT INTO runs")).args[5], ref.revision);
    const progress = { headers: opts.headers, body: { questId: "q1", runId, userId: "user_forged",
      play: { mission: { id: "q1", title: "Forged" }, predictionsBank: {}, reflection: "private" } } };
    assert.equal((await call(api, "/api/me/run-state", "PUT", progress)).status, 200);
    const continued = await call(api, "/api/me/run-state", "GET", { headers: opts.headers });
    assert.equal(continued.status, 200);
    assert.equal(continued.body.state.play.mission.title, "Official");
    assert.equal(continued.body.state.play.mission.runWorld.bank.id, "official-bank");
    assert.equal(continued.body.state.play.runWorld, undefined);
    assert.equal(continued.body.state.play.predictionsBank, undefined);
    assert.equal(continued.body.state.play.reflection, "private");
    revoked = true;
    assert.equal((await call(api, "/api/me/run-state", "GET", { headers: opts.headers })).status, 402);
    assert.equal((await call(api, "/api/me/run-state", "PUT", progress)).status, 402);
    assert.equal((await call(api, "/api/me/runs/start", "POST", opts)).status, 402);
    assert.equal(calls.filter((c) => c.sql.startsWith("INSERT INTO runs")).length, 1);
  });

  it("health publishes only validated game return origins, including degraded health", async () => {
    const lan = "http://192.168.1.140:8765";
    const corsOnly = "http://10.0.0.2:9000";
    const config = { ...env, FF_GAME_DEVICE_ORIGINS: `${lan},${lan},https://play.example,http://public.example,http://user@192.168.1.141:8765,http:/10.0.0.3:9000,http://10.0.0.4:9000/path`,
      FF_CLOUD_CORS_ORIGINS: corsOnly };
    const expected = ["http://127.0.0.1:8765", "http://localhost:8765", lan, "https://play.example"];
    for (const db of [fakeDb(), { query: async () => { throw new Error("offline"); } }]) {
      const health = await call(app(db, { env: config }), "/api/health");
      assert.deepEqual(health.body.gameDeviceOrigins, expected);
      assert.equal(health.body.gameDeviceOrigins.includes(corsOnly), false);
    }
    const missing = await call(createCloudApi({ env: { FF_GAME_DEVICE_ORIGINS: lan } }), "/api/health");
    assert.equal(missing.status, 503);
    assert.deepEqual(missing.body.gameDeviceOrigins, expected.slice(0, 3));
  });

  it("health probes DB without leaking keys or URL, and fails closed", async () => {
    const db = fakeDb();
    const good = await call(app(db), "/api/health");
    assert.equal(good.status, 200);
    assert.deepEqual(good.body, { ok: true, service: "portal", clerk: { enabled: true, publishableKey: "pk_test_fixture" }, apiOrigin: "https://cloud.warmersun.com", gameDeviceOrigins: ["http://127.0.0.1:8765", "http://localhost:8765", "https://play.example"], db: { enabled: true } });
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

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createPublicRoutes } from "./public-routes.mjs";
import { mintGameSessionToken } from "../../js/server/game-session.mjs";
import { catalogFromObjectReader } from "../../js/server/quest-object-storage.mjs";

const user = "user_2y5HvnY8gQd1";
const cardId = "12345678-1234-1234-1234-123456789abc";
const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.signature";
const env = { CLERK_SECRET_KEY: "offline", CLERK_PUBLISHABLE_KEY: "pk_test_offline",
  FF_PUBLIC_ORIGIN: "https://cloud.warmersun.com" };
const tiles = [
  { id: "open", title: "Open", access: "open", mission: { secret: "public" } },
  { id: "account", title: "Account", access: "account", mission: { secret: "private" }, aiTutorContext: "hidden" },
  { id: "paid", title: "Paid", access: "paid", mission: { secret: "paid private" } },
  { id: "sponsored", title: "Sponsor", access: "paid", sponsorName: "Foundation", mission: { secret: "sponsored" } },
];
function fixture({ rows = () => [], catalog = { ok: true, url: "neon://private/catalog.json", quests: tiles, errors: [] }, overrides = {}, routeEnv = env } = {}) {
  const queries = [];
  const db = { async query(sql, params = []) { queries.push({ sql, params }); return { rows: rows(sql, params) }; } };
  let catalogCalls = 0;
  const handler = createPublicRoutes({ env: routeEnv, db,
    loadCatalog: async (opts) => { catalogCalls++; return typeof catalog === "function" ? catalog(opts) : catalog; },
    verifyClerk: async () => ({ sub: user }), ...overrides });
  const request = (path, { method = "GET", token, headers = {} } = {}) => handler.fetch(new Request(`https://cloud.warmersun.com${path}`, {
    method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
  }));
  return { request, queries, get catalogCalls() { return catalogCalls; } };
}

const body = async (response) => [response.status, await response.json()];

test("standalone public slice accepts private-LAN origins by default, never public HTTP", async () => {
  const lan = "http://192.168.1.140:8765";
  for (const name of ["FF_GAME_DEVICE_ORIGINS", "FF_CLOUD_CORS_ORIGINS"]) {
    const f = fixture({ routeEnv: { ...env, [name]: `${lan},http://public.example` } });
    for (const method of ["GET", "OPTIONS"]) {
      const allowed = await f.request("/api/quests", { method, headers: { Origin: lan } });
      assert.equal(allowed.status, method === "OPTIONS" ? 204 : 200);
      assert.equal(allowed.headers.get("Access-Control-Allow-Origin"), lan);
      // Unconfigured private-LAN origins (different host/port) are allowed by default.
      for (const extraLan of ["http://192.168.1.141:8765", "http://192.168.1.140:8766"]) {
        const extra = await f.request("/api/quests", { method, headers: { Origin: extraLan } });
        assert.equal(extra.status, method === "OPTIONS" ? 204 : 200, extraLan);
        assert.equal(extra.headers.get("Access-Control-Allow-Origin"), extraLan);
      }
      const denied = await f.request("/api/quests", { method, headers: { Origin: "http://public.example" } });
      assert.equal(denied.status, 403);
      assert.equal(denied.headers.get("Access-Control-Allow-Origin"), null);
      // With the LAN switch off, unconfigured LAN origins are forbidden again.
      const strict = fixture({ routeEnv: { ...env, [name]: `${lan},http://public.example`, FF_ALLOW_LAN_ORIGINS: "0" } });
      for (const origin of ["http://192.168.1.141:8765", "http://192.168.1.140:8766", "http://public.example"]) {
        const forbidden = await strict.request("/api/quests", { method, headers: { Origin: origin } });
        assert.equal(forbidden.status, 403, origin);
        assert.equal(forbidden.headers.get("Access-Control-Allow-Origin"), null);
      }
      // Loopback and the explicitly listed origin keep working while LAN is off.
      for (const kept of ["http://127.0.0.1:8765", lan]) {
        const ok = await strict.request("/api/quests", { method, headers: { Origin: kept } });
        assert.equal(ok.status, method === "OPTIONS" ? 204 : 200, kept);
        assert.equal(ok.headers.get("Access-Control-Allow-Origin"), kept);
      }
    }
  }
  // Default env: private-LAN origins need no configuration.
  for (const method of ["GET", "OPTIONS"]) {
    const res = await fixture().request("/api/quests", { method, headers: { Origin: lan } });
    assert.equal(res.status, method === "OPTIONS" ? 204 : 200);
    assert.equal(res.headers.get("Access-Control-Allow-Origin"), lan);
    const denied = await fixture().request("/api/quests", { method, headers: { Origin: "http://public.example" } });
    assert.equal(denied.status, 403);
    assert.equal(denied.headers.get("Access-Control-Allow-Origin"), null);
  }
});

test("private catalog lists safe cards, protects detail, and never falls back on bucket failure", async () => {
  const f = fixture();
  const [status, listing] = await body(await f.request("/api/quests?refresh=1"));
  assert.equal(status, 200);
  assert.equal(listing.count, 4);
  assert.equal(listing.dir, null);
  assert.deepEqual(listing.local, []);
  assert.equal(listing.remoteUrl, "neon://private/catalog.json");
  assert.equal(listing.quests[0].mission.secret, "public");
  assert.equal(listing.quests[1].gated, true);
  assert.equal(JSON.stringify(listing).includes('"secret":"private"'), false);
  assert.equal(JSON.stringify(listing).includes("hidden"), false);
  assert.equal(JSON.stringify(listing).includes("paid private"), false);
  assert.deepEqual(await body(await f.request("/api/quests/account")), [401, {
    ok: false, error: "sign_in_required", id: "account", tile: listing.quests[1],
  }]);
  const [payStatus, denied] = await body(await f.request("/api/quests?id=paid", { token: jwt }));
  assert.equal(payStatus, 402);
  assert.equal(denied.subscribeUrl, "https://warmersun.com/portal/subscribe");
  assert.equal(denied.tile.mission, undefined);
  const [signed, allowed] = await body(await f.request("/api/quests/account", { token: jwt }));
  assert.equal(signed, 200);
  assert.equal(allowed.tile.aiTutorContext, "hidden");
  assert.equal((await body(await f.request("/api/quests/sponsored", { token: jwt })))[0], 200);
  assert.equal((await body(await f.request("/api/quests/missing")))[0], 404);
  assert.equal((await body(await f.request("/api/quests/%XX")))[0], 404);
  assert.equal(f.catalogCalls, 7);
  const failure = fixture({ catalog: { ok: false, quests: tiles, errors: [{ error: "object_read_failed" }] } });
  assert.deepEqual(await body(await failure.request("/api/quests")), [503, { ok: false, error: "quests_scan_failed" }]);
  assert.deepEqual(await body(await failure.request("/api/quests/account", { token: jwt })),
    [503, { ok: false, error: "quests_scan_failed" }]);
});

test("paid access requires active configured plan; malformed tokens cannot authorize", async () => {
  const f = fixture({ rows: (sql) => sql.includes("FROM subscriptions") ? [{ status: "active", plan_slug: "cloud", period_end: new Date("2099-01-01") }] : [] });
  assert.equal((await body(await f.request("/api/quests/paid", { token: jwt })))[0], 200);
  assert.equal((await body(await f.request("/api/quests/paid", { token: "bad" })))[0], 401);
  assert.equal((await body(await f.request("/api/quests/paid", { token: "a.b.c" })))[0], 401);
  const notPaid = fixture({ rows: (sql) => sql.includes("FROM subscriptions") ? [{ status: "active", plan_slug: "other", period_end: new Date("2099-01-01") }] : [] });
  assert.equal((await body(await notPaid.request("/api/quests/paid", { token: jwt })))[0], 402);
});

test("signed game sessions grant account/entitled access, but forged, expired and wrong-secret tokens do not", async () => {
  let clerkCalls = 0;
  const f = fixture({
    rows: (sql) => sql.includes("FROM subscriptions") ? [{ status: "active", plan_slug: "cloud", period_end: new Date("2099-01-01") }] : [],
    overrides: { verifyClerk: async () => { clerkCalls++; return { sub: user }; } },
  });
  const signed = mintGameSessionToken({ userId: user, sessionId: "sess_offline" }, env);
  assert.ok(signed);
  const [status, listing] = await body(await f.request("/api/quests", { token: signed }));
  assert.equal(status, 200);
  assert.equal(listing.quests[1].aiTutorContext, "hidden");
  assert.equal(listing.quests[2].mission.secret, "paid private");
  assert.equal((await body(await f.request("/api/quests/paid", { token: signed })))[0], 200);
  const [boardStatus, board] = await body(await f.request("/api/board", { token: signed }));
  assert.equal(boardStatus, 200);
  assert.equal(board.kind, "players");
  assert.equal(clerkCalls, 0, "game tokens must not be passed to Clerk");

  const parts = signed.split(".");
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
  const forged = `${parts[0]}.${Buffer.from(JSON.stringify({ ...payload, sub: "user_forged" })).toString("base64url")}.${parts[2]}`;
  const expired = mintGameSessionToken({ userId: user }, env, { nowSec: 1, ttlSec: 1 });
  const otherSecret = mintGameSessionToken({ userId: user }, { ...env, FF_PORTAL_SESSION_SECRET: "another-offline-secret" });
  for (const token of [forged, expired, otherSecret]) {
    const [denied, data] = await body(await f.request("/api/quests/account", { token }));
    assert.equal(denied, 401);
    assert.equal(data.tile.mission, undefined);
  }
  assert.equal(clerkCalls, 0);
});

test("Function catalog reads only official bucket entries; no local merge or private tile leak", async () => {
  // Legacy scans QUESTS_DIR and merges it with the bucket (remote wins). An
  // isolated Function has no local folder: the bucket must contain every tile.
  const original = JSON.parse(readFileSync(new URL("../../quests/spotlight-gene-seq.json", import.meta.url), "utf8"));
  const privateTile = { ...original, access: "account", aiTutorContext: "bucket-only-secret" };
  const files = {
    "private/catalog.json": JSON.stringify({ quests: [{ id: original.id, file: "spotlight.json" }] }),
    "private/spotlight.json": JSON.stringify(privateTile),
  };
  const reads = [];
  const catalog = await catalogFromObjectReader(async (key) => {
    reads.push(key);
    if (!(key in files)) throw new Error("object_read_failed");
    return files[key];
  }, { prefix: "private", url: "neon://quests/private/catalog.json", remoteBase: "neon://quests/" });
  assert.equal(catalog.ok, true);
  assert.deepEqual(reads, ["private/catalog.json", "private/spotlight.json"]);
  assert.equal(catalog.quests.length, 1);
  const f = fixture({ catalog });
  const [status, listing] = await body(await f.request("/api/quests?refresh=1"));
  assert.equal(status, 200);
  assert.deepEqual(listing.local, []);
  assert.equal(listing.count, 1);
  assert.deepEqual(listing.remote, listing.quests);
  assert.equal(listing.quests[0].gated, true);
  assert.equal(JSON.stringify(listing).includes("bucket-only-secret"), false);
  assert.deepEqual(await body(await f.request("/api/quests/local-only")),
    [404, { ok: false, error: "not_found", id: "local-only" }]);
  const [denied, detail] = await body(await f.request(`/api/quests/${original.id}`));
  assert.equal(denied, 401);
  assert.equal(detail.tile.gated, true);
  assert.equal(JSON.stringify(detail).includes("bucket-only-secret"), false);
  const signed = mintGameSessionToken({ userId: user }, env);
  const [allowed, full] = await body(await f.request(`/api/quests/${original.id}`, { token: signed }));
  assert.equal(allowed, 200);
  assert.equal(full.tile.mission.aiTutorContext, "bucket-only-secret");
});

test("public profile only discloses opted-in users, shared holds, and safe portfolio", async () => {
  const f = fixture({ rows: (sql, params) => {
    if (sql.includes("FROM users WHERE username")) return params[0] === "alice" ? [{ clerk_user_id: user, username: "alice", display_name: "Alice", bio: "hi", is_public: true }] : [];
    if (sql.includes("SELECT tech_ids")) return [{ tech_ids: [] }];
    if (sql.includes("FROM runs") && sql.includes("share = true")) return [{ quest_id: "q1", place: "Mars", year_reached: 2040, kind: "solo" }];
    return [];
  } });
  const [status, data] = await body(await f.request("/api/u/ALICE"));
  assert.equal(status, 200);
  assert.deepEqual(data.profile.holds, [{ questId: "q1", place: "Mars", yearReached: 2040, kind: "solo" }]);
  assert.ok(data.profile.portfolio);
  assert.equal(JSON.stringify(data).includes(user), false);
  assert.deepEqual(await body(await f.request("/api/u/bob")), [404, { ok: false, error: "not_found" }]);
  assert.equal((await body(await f.request("/api/u/alice%2Fprivate")))[0], 404);
  assert.equal((await body(await f.request("/api/u/%XX")))[0], 404);
  assert.deepEqual(f.queries[0].params, ["alice"]);
});

test("global and quest boards rank chosen names, include only signed-in you, and serve stills", async () => {
  const scores = [
    { clerk_user_id: user, quest_id: "quest-1", run_id: cardId, year_reached: 2030, start_year: 2025,
      stars: 5, waits: 0, profile_display_name: "Alice", place: "Mars", stack: ["tech"], pathway_text: "Path" },
    { clerk_user_id: "user_other", quest_id: "quest-1", year_reached: 2030, start_year: 2025,
      stars: 4, waits: 1, profile_display_name: null },
  ];
  const f = fixture({ rows: (sql) => sql.includes("FROM quest_scores q") ? scores :
    sql.includes("FROM quest_stills") && sql.includes("SELECT clerk_user_id") ? [{ clerk_user_id: user }] :
    sql.includes("SELECT bytes") ? [{ bytes: Buffer.from("image"), content_type: "image/png" }] : [] });
  const [, global] = await body(await f.request("/api/board"));
  assert.equal(global.kind, "players");
  assert.equal(global.top.length, 1);
  assert.equal(global.you, null);
  const [, mine] = await body(await f.request("/api/board/quest-1", { token: jwt }));
  assert.equal(mine.top[0].pathwayText, "Path");
  assert.equal(mine.top[0].hasStill, true);
  assert.equal(mine.you.clerkUserId, user);
  const still = await f.request(`/api/board/quest-1/still/${user}`);
  assert.equal(still.status, 200);
  assert.equal(still.headers.get("content-type"), "image/png");
  assert.equal(await still.text(), "image");
  assert.deepEqual(await body(await f.request("/api/board/gen-random")), [404, { ok: false, error: "no_board" }]);
  assert.deepEqual(await body(await f.request("/api/board/quest-1/extra")), [404, { ok: false, error: "no_board" }]);
});

test("card HTML, image GET/HEAD/304, preview and unpublished/invalid cards", async () => {
  const f = fixture({ rows: (sql) => sql.includes("SELECT image") ? [{ image: Buffer.from("bytes"), content_type: "image/png", updated_at: new Date("2025-01-01") }] :
    sql.includes("FROM collector_cards") ? [{ id: cardId, tech_id: "unknown", title: "<safe>", description: "Description", body: "Body", links: [] }] : [],
    overrides: { renderShare: async () => Buffer.from("preview") } });
  const page = await f.request(`/card/${cardId}?collect=1`);
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /&lt;safe&gt;/);
  const boot = JSON.parse(html.match(/const boot = ([^\n]+);/)[1]);
  assert.equal(boot.signInUrl, "https://warmersun.com/portal/signin");
  assert.equal(boot.collectNow, true);
  const head = await f.request(`/card/${cardId}/image`, { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(head.headers.get("content-length"), "5");
  assert.equal(await head.text(), "");
  const image = await f.request(`/card/${cardId}/image`, { headers: { Origin: "https://outside.example" } });
  assert.equal(image.headers.get("access-control-allow-origin"), "*");
  assert.equal(await image.text(), "bytes");
  assert.equal((await f.request(`/card/${cardId}/image`, { headers: { "If-None-Match": image.headers.get("etag") } })).status, 304);
  const preview = await f.request(`/card/${cardId}/preview.jpg`);
  assert.equal(preview.headers.get("content-type"), "image/jpeg");
  assert.equal(await preview.text(), "preview");
  assert.equal((await f.request("/card/nope")).status, 404);
  const missing = fixture();
  assert.equal((await missing.request(`/card/${cardId}`)).status, 404);
  assert.deepEqual(await body(await missing.request(`/card/${cardId}/image`)), [404, { ok: false, error: "not_found" }]);
});

test("card HTML receives the configured portal UI URL rather than the API origin", async () => {
  const f = fixture({ routeEnv: { ...env, FF_PORTAL_UI_URL: "https://accounts.example/portal/" },
    rows: () => [{ id: cardId, tech_id: "unknown", title: "Card" }] });
  const page = await f.request(`/card/${cardId}`);
  assert.equal(page.status, 200);
  const html = await page.text();
  const boot = JSON.parse(html.match(/const boot = ([^\n]+);/)[1]);
  assert.equal(boot.signInUrl, "https://accounts.example/portal/signin");
  assert.equal(boot.returnUrl, `https://cloud.warmersun.com/card/${cardId}?collect=1`);
});

test("route allowlist, methods, CORS and DB failure stay closed", async () => {
  const f = fixture();
  assert.equal((await body(await f.request("/api/trends")))[0], 404);
  assert.equal((await body(await f.request("/api/boardx")))[0], 404);
  assert.equal((await body(await f.request("/api/quests", { method: "POST" })))[0], 405);
  assert.equal((await f.request("/api/quests", { method: "OPTIONS", headers: { Origin: "https://evil.test" } })).status, 403);
  const preflight = await f.request("/api/quests", { method: "OPTIONS", headers: { Origin: "https://cloud.warmersun.com" } });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("access-control-allow-origin"), "https://cloud.warmersun.com");
  const stagedPreflight = await f.request("/api/quests", { method: "OPTIONS", headers: { Origin: "https://warmersun.com" } });
  assert.equal(stagedPreflight.status, 204);
  assert.equal(stagedPreflight.headers.get("access-control-allow-origin"), "https://warmersun.com");
  assert.equal(stagedPreflight.headers.get("access-control-allow-headers"), "Authorization, Content-Type");
  const stagedGet = await f.request("/api/quests", { headers: { Origin: "https://warmersun.com" } });
  assert.equal(stagedGet.status, 200);
  assert.equal(stagedGet.headers.get("access-control-allow-origin"), "https://warmersun.com");
  assert.equal(stagedGet.headers.get("vary"), "Origin");
  for (const origin of ["https://evil.test", "https://warmersun.com.evil.test", "http://warmersun.com", "null"]) {
    const denied = await f.request("/api/quests", { headers: { Origin: origin } });
    assert.equal(denied.status, 403);
    assert.equal(denied.headers.get("access-control-allow-origin"), null);
  }
  const configured = fixture({ routeEnv: { ...env, FF_CLOUD_CORS_ORIGINS: "https://extra.example,https://evil.test/path,http://not-local.example" } });
  assert.equal((await configured.request("/api/quests", { headers: { Origin: "https://extra.example" } })).status, 200);
  assert.equal((await configured.request("/api/quests", { headers: { Origin: "https://evil.test" } })).status, 403);
  const down = createPublicRoutes({ env, loadCatalog: async () => ({ ok: true, quests: [] }) });
  assert.deepEqual(await body(await down.fetch(new Request("https://cloud.warmersun.com/api/board"))),
    [503, { ok: false, error: "db_unavailable" }]);
});

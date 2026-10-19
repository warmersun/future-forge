import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createQuestWriteRoutes } from "./quest-write-routes.mjs";
import { DEFAULT_QUESTS_REMOTE_URL, _resetRemoteQuestCache } from "../../js/quests-remote.mjs";
import { _resetObjectQuestCache } from "../../js/server/quest-object-storage.mjs";

const Q = "spotlight-space-farcall-ferry-2026";
const A = { enabled: true, signedIn: true, userId: "user_A" };
const B = { enabled: true, signedIn: true, userId: "user_B" };
const RUN = "11111111-1111-4111-8111-111111111111";
const uri = (action) => `https://example.test/api/me/quests/${Q}/${action}`;
function request(action, body, { method = action === "still" ? "PUT" : "POST", headers = {} } = {}) {
  return new Request(uri(action), { method,
    headers: typeof body === "object" && !(body instanceof Uint8Array) ? { "Content-Type": "application/json", ...headers } : headers,
    body: body instanceof Uint8Array ? body : typeof body === "string" ? body : JSON.stringify(body) });
}
function fakeDb() {
  const calls = [];
  const scores = new Map();
  const stills = new Map();
  const runs = new Map([[`user_A:${RUN}`, { quest_id: Q, outcome: "hold", year_reached: 2030,
    stars: 4, waits: 2, place: "Base" }]]);
  const profiles = new Map([["user_A", "Ada"], ["user_B", "Bea"]]);
  let failInsert = false;
  async function query(sql, args = []) {
    calls.push({ sql, args });
    if (["BEGIN", "COMMIT", "ROLLBACK"].includes(sql) || sql.includes("pg_advisory_xact_lock")) return { rows: [] };
    if (sql.includes("FROM runs WHERE id =")) return { rows: [runs.get(`${args[1]}:${args[0]}`)].filter(Boolean) };
    if (sql.startsWith("SELECT display_name FROM users")) return { rows: profiles.has(args[0]) ? [{ display_name: profiles.get(args[0]) }] : [] };
    if (sql.startsWith("INSERT INTO users")) return { rows: [] };
    if (sql.includes("FROM quest_scores") && sql.includes("FOR UPDATE")) {
      const r = scores.get(args[0]);
      return { rows: r ? [{ year_reached: r.year_reached, start_year: r.start_year, stars: r.stars, waits: r.waits }] : [] };
    }
    if (sql.startsWith("INSERT INTO quest_scores")) {
      if (failInsert) throw new Error("injected db error");
      scores.set(args[0], { clerk_user_id: args[0], quest_id: args[1], run_id: args[2],
        year_reached: args[3], start_year: args[4], stars: args[5], waits: args[6],
        profile_display_name: profiles.get(args[0]), place: args[8], stack: args[9], pathway_text: args[10] });
      return { rows: [] };
    }
    if (sql.startsWith("SELECT clerk_user_id FROM quest_scores")) return {
      rows: [...scores.values()].sort((a, b) => b.stars / (b.year_reached - b.start_year) - a.stars / (a.year_reached - a.start_year))
        .slice(0, args[1]).map((r) => ({ clerk_user_id: r.clerk_user_id })),
    };
    if (sql.includes("FROM quest_scores q LEFT JOIN users")) return { rows: [...scores.values()] };
    if (sql.startsWith("DELETE FROM quest_stills")) {
      for (const key of stills.keys()) if (key.startsWith(`${args[0]}:`) && !(args[1] || []).includes(key.split(":")[1])) stills.delete(key);
      return { rows: [] };
    }
    if (sql.startsWith("INSERT INTO quest_stills")) {
      stills.set(`${args[0]}:${args[1]}`, { bytes: args[2], type: args[3], length: args[4] });
      return { rows: [] };
    }
    throw new Error(`Unmodeled SQL: ${sql}`);
  }
  return { calls, scores, stills, runs, profiles, query,
    async connect() { return { query, release() { calls.push({ sql: "RELEASE" }); } }; },
    set failInsert(value) { failInsert = value; } };
}
const route = (db, opts = {}) => createQuestWriteRoutes({ db, loadCatalog: async () => ({ quests: [{ id: Q, mission: { startYear: 2026 } }] }), logger: { warn() {} }, ...opts });

describe("quest write routes", () => {
  it("only owns exact routes and methods", async () => {
    const api = route(fakeDb());
    assert.equal(await api.fetch(new Request("https://example.test/api/report/extra", { method: "POST" })), null);
    assert.equal(await api.fetch(new Request("https://example.test/api/me/quests/nope/score/extra")), null);
    const res = await api.fetch(request("score", { runId: RUN }, { method: "PUT" }), A);
    assert.equal(res.status, 405);
    assert.deepEqual(await res.json(), { ok: false, error: "method_not_allowed", service: "portal" });
  });
  it("uses verified identity, checks ownership and rejects bad inputs without writes", async () => {
    const db = fakeDb(), api = route(db);
    for (const [identity, status, error] of [[undefined, 401, "sign_in_required"],
      [{ enabled: false }, 404, "clerk_disabled"], [{ enabled: true, invalidToken: true }, 401, "invalid_token"],
      [{ ...A, userId: "bad/id" }, 401, "invalid_token"]]) {
      const res = await api.fetch(request("score", { runId: RUN }), identity);
      assert.equal(res.status, status);
      assert.equal((await res.json()).error, error);
    }
    const wrong = await api.fetch(request("score", { runId: RUN }), B);
    assert.deepEqual(await wrong.json(), { ok: false, error: "run_required" });
    for (const [body, error] of [[{}, "run_required"], [{ runId: RUN, questId: "other" }, "wrong_quest"]]) {
      assert.equal((await (await api.fetch(request("score", body), A)).json()).error, error);
    }
    assert.equal(db.scores.size, 0);
  });
  it("never treats request-supplied identity as authority and accepts partial owned runs", async () => {
    const db = fakeDb(), api = route(db);
    const body = { runId: RUN, clerkUserId: "user_B", userId: "user_B", stars: 5 };
    let res = await api.fetch(request("score", body), B);
    assert.deepEqual(await res.json(), { ok: false, error: "run_required" });
    db.runs.get(`user_A:${RUN}`).outcome = "partial";
    res = await api.fetch(request("score", body, { headers: { Authorization: "Bearer unverified" } }), A);
    assert.equal(res.status, 200);
    assert.equal(db.scores.get("user_A").clerk_user_id, "user_A");
    assert.equal(db.scores.get("user_A").stars, 4);
    assert.equal(db.scores.has("user_B"), false);
  });
  it("binds score to owned run and private catalog, retains personal best, evicts obsolete stills", async () => {
    const db = fakeDb(), api = route(db);
    db.stills.set(`${Q}:user_old`, { bytes: Buffer.of(1) });
    const submitted = { runId: RUN, stars: 5, waits: 0, yearReached: 2026, startYear: 2020,
      pathwayText: "  idea  ", stack: ["thing-a", "thing-a"], place: "Port" };
    let res = await api.fetch(request("score", submitted), A);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true, stored: true, kept: false, rank: 1, inTopStills: true });
    assert.equal(db.stills.size, 0);
    assert.equal(db.scores.get("user_A").start_year, 2026);
    assert.equal(db.scores.get("user_A").year_reached, 2030);
    assert.equal(db.scores.get("user_A").stars, 4);
    assert.equal(db.scores.get("user_A").waits, 2);
    assert.deepEqual(db.scores.get("user_A").stack, ["thing-a"]);
    assert.equal(db.scores.get("user_A").pathway_text, "idea");
    db.runs.get(`user_A:${RUN}`).stars = 2;
    res = await api.fetch(request("score", submitted), A);
    assert.deepEqual(await res.json(), { ok: true, stored: false, kept: true, rank: 1, inTopStills: true });
    assert.equal(db.scores.get("user_A").stars, 4);
    assert.equal(db.calls.filter((c) => c.sql.startsWith("INSERT INTO quest_scores")).length, 1);
  });
  it("enforces profile name, outcome, year and rolls back score failures", async () => {
    const db = fakeDb(), api = route(db);
    db.profiles.delete("user_A");
    assert.equal((await (await api.fetch(request("score", { runId: RUN }), A)).json()).error, "display_name_required");
    db.profiles.set("user_A", "Ada");
    const run = db.runs.get(`user_A:${RUN}`);
    run.outcome = "collapse";
    assert.equal((await (await api.fetch(request("score", { runId: RUN }), A)).json()).error, "hold_required");
    run.outcome = "hold"; run.year_reached = 1900;
    assert.equal((await (await api.fetch(request("score", { runId: RUN }), A)).json()).error, "impossible_year");
    run.year_reached = 2030; db.failInsert = true;
    const res = await api.fetch(request("score", { runId: RUN }), A);
    assert.equal(res.status, 500);
    assert.equal((await res.json()).error, "score_failed");
    assert(db.calls.some((c) => c.sql === "ROLLBACK"));
  });
  it("stores raw stills only for top players, preserves bytes and content type, evicts other stills", async () => {
    const db = fakeDb(), api = route(db);
    db.scores.set("user_A", { clerk_user_id: "user_A", quest_id: Q, year_reached: 2030, start_year: 2026,
      stars: 4, waits: 2, profile_display_name: "Ada" });
    const bytes = Uint8Array.of(0, 255, 1, 128);
    let res = await api.fetch(request("still", bytes, { headers: { "Content-Type": "image/png; charset=binary" } }), B);
    assert.deepEqual(await res.json(), { ok: true, stored: false, reason: "not_top" });
    assert.equal(db.stills.size, 0);
    db.stills.set(`${Q}:user_old`, {});
    res = await api.fetch(request("still", bytes, { headers: { "Content-Type": "image/png; charset=binary" } }), A);
    assert.deepEqual(await res.json(), { ok: true, stored: true });
    assert.deepEqual(db.stills.get(`${Q}:user_A`).bytes, Buffer.from(bytes));
    assert.equal(db.stills.get(`${Q}:user_A`).type, "image/png");
    assert.equal(db.stills.get(`${Q}:user_A`).length, bytes.length);
    assert.equal(db.stills.size, 1);
    res = await api.fetch(request("still", new Uint8Array()), A);
    assert.equal((await res.json()).error, "empty_still");
    assert.equal((await (await api.fetch(request("still", bytes), A)).json()).stored, true);
  });
  it("rejects a still without a board and fails closed when DB is unavailable", async () => {
    const db = fakeDb(), api = route(db);
    const noBoard = await api.fetch(new Request("https://example.test/api/me/quests/gen-climate-ab12cd/still", {
      method: "PUT", body: Uint8Array.of(1) }), A);
    assert.equal(noBoard.status, 400);
    assert.equal((await noBoard.json()).error, "no_board");
    assert.equal(db.calls.length, 0);
    const offline = createQuestWriteRoutes({ env: {} });
    const res = await offline.fetch(request("score", { runId: RUN }), A);
    assert.equal(res.status, 503);
    assert.equal((await res.json()).error, "db_unavailable");
  });
  it("uses run year as fallback, not the submitted year, when catalog cannot load", async () => {
    const db = fakeDb(), api = route(db, { loadCatalog: async () => { throw new Error("offline"); } });
    const res = await api.fetch(request("score", { runId: RUN, startYear: 2020 }), A);
    assert.equal(res.status, 200);
    assert.equal(db.scores.get("user_A").start_year, 2030);
  });
  describe("catalog source parity", () => {
    const tile = JSON.parse(readFileSync(new URL("../../test/fixtures/quests/spotlight-gene-seq.json", import.meta.url), "utf8"));
    tile.id = Q;
    tile.mission.id = Q;
    const catalogBody = JSON.stringify({ quests: [{ id: Q, file: "quest.json" }] });
    const tileBody = JSON.stringify(tile);
    beforeEach(() => {
      _resetRemoteQuestCache();
      _resetObjectQuestCache();
    });

    for (const [name, env, catalogUrl] of [
      ["explicit", { FF_QUESTS_REMOTE_URL: "  https://catalog.example.test/quests/catalog.json  " }, "https://catalog.example.test/quests/catalog.json"],
      ["default", {}, DEFAULT_QUESTS_REMOTE_URL],
    ]) {
      it(`uses the ${name} remote-only catalog year instead of inflating rank`, async () => {
        const db = fakeDb(), fetched = [];
        db.scores.set("user_B", { clerk_user_id: "user_B", quest_id: Q, year_reached: 2028,
          start_year: 2026, stars: 3, waits: 2, profile_display_name: "Bea" });
        const api = route(db, { env, loadCatalog: undefined, fetchImpl: async (url) => {
          fetched.push(url);
          if (url === catalogUrl) return new Response(catalogBody);
          if (url === new URL("quest.json", catalogUrl).href) return new Response(tileBody);
          throw new Error("unexpected_catalog_source");
        } });
        const res = await api.fetch(request("score", { runId: RUN, startYear: 2029 }), A);
        assert.equal(res.status, 200);
        assert.equal(db.scores.get("user_A").start_year, 2026);
        assert.equal((await res.json()).rank, 2);
        assert.deepEqual(fetched, [catalogUrl, new URL("quest.json", catalogUrl).href]);
      });
    }

    for (const configured of ["", "  ", "0", "OFF", "false"]) {
      it(`does not fetch a disabled remote catalog (${JSON.stringify(configured)})`, async () => {
        const db = fakeDb(), fetched = [];
        const api = route(db, { env: { FF_QUESTS_REMOTE_URL: configured }, loadCatalog: undefined,
          fetchImpl: async (url) => { fetched.push(url); throw new Error("unexpected_fetch"); } });
        const res = await api.fetch(request("score", { runId: RUN, startYear: 2020 }), A);
        assert.equal(res.status, 200);
        assert.equal(db.scores.get("user_A").start_year, 2030);
        assert.deepEqual(fetched, []);
      });
    }

    for (const fails of [false, true]) {
      it(`${fails ? "never falls back from a failed" : "prefers the"} private bucket to the public source`, async () => {
        const db = fakeDb(), read = [], fetched = [];
        const api = route(db, {
          env: { FF_QUESTS_BUCKET: "private-quests", FF_QUESTS_OBJECT_PREFIX: "/official/",
            FF_QUESTS_REMOTE_URL: "https://catalog.example.test/catalog.json" },
          loadCatalog: undefined,
          readObjectText: async (key) => {
            read.push(key);
            if (fails) throw new Error("private_unavailable");
            if (key === "official/catalog.json") return catalogBody;
            if (key === "official/quest.json") return tileBody;
            throw new Error("unexpected_object");
          },
          fetchImpl: async (url) => { fetched.push(url); return new Response(catalogBody); },
        });
        const res = await api.fetch(request("score", { runId: RUN, startYear: 2020 }), A);
        assert.equal(res.status, 200);
        assert.equal(db.scores.get("user_A").start_year, fails ? 2030 : 2026);
        assert.deepEqual(read, fails ? ["official/catalog.json"] : ["official/catalog.json", "official/quest.json"]);
        assert.deepEqual(fetched, []);
      });
    }

    it("does not use another source's cached year after an explicit remote catalog fails", async () => {
      const db = fakeDb();
      const good = route(db, { env: { FF_QUESTS_REMOTE_URL: "https://good.example.test/catalog.json" },
        loadCatalog: undefined, fetchImpl: async (url) => new Response(url.endsWith("catalog.json") ? catalogBody : tileBody) });
      assert.equal((await good.fetch(request("score", { runId: RUN }), A)).status, 200);
      assert.equal(db.scores.get("user_A").start_year, 2026);
      db.scores.clear();
      const fetched = [];
      const failed = route(db, { env: { FF_QUESTS_REMOTE_URL: "https://failed.example.test/catalog.json" },
        loadCatalog: undefined, fetchImpl: async (url) => {
          fetched.push(url);
          return new Response("unavailable", { status: 503 });
        } });
      assert.equal((await failed.fetch(request("score", { runId: RUN, startYear: 2020 }), A)).status, 200);
      assert.equal(db.scores.get("user_A").start_year, 2030);
      assert.deepEqual(fetched, ["https://failed.example.test/catalog.json"]);
    });
  });
  it("bounds streamed JSON and binary bodies before full buffering", async () => {
    const db = fakeDb(), api = route(db);
    const big = new Uint8Array(1_500_001);
    let res = await api.fetch(request("still", big), A);
    assert.equal(res.status, 413);
    assert.equal((await res.json()).error, "still_failed");
    res = await api.fetch(request("score", "x".repeat(16_001)), A);
    assert.equal(res.status, 413);
    assert.equal((await res.json()).error, "score_failed");
    assert.equal(db.calls.length, 0);
  });
  it("enforces the byte limit for chunked stills and leaves the transaction unopened", async () => {
    const db = fakeDb(), api = route(db);
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(750_000));
        controller.enqueue(new Uint8Array(750_001));
        controller.close();
      },
    });
    const res = await api.fetch(new Request(uri("still"), {
      method: "PUT", body: stream, duplex: "half",
    }), A);
    assert.equal(res.status, 413);
    assert.deepEqual(await res.json(), { ok: false, error: "still_failed" });
    assert.equal(db.calls.length, 0);
  });
  it("reports anonymously with legacy sanitizer and size limit, logging only a clipped reason", async () => {
    const db = fakeDb(), logs = [], api = route(db, { logger: { warn: (...parts) => logs.push(parts) } });
    let res = await api.fetch(new Request("https://example.test/api/report?x=1", {
      method: "POST", body: JSON.stringify({ username: "SIC", reason: "  wrong tile  ", email: "private@example.test" }) }));
    assert.deepEqual(await res.json(), { ok: true });
    assert.deepEqual(logs, [["[cloud report]", "sic", "wrong tile"]]);
    res = await api.fetch(new Request("https://example.test/api/report", { method: "POST", body: "{}" }));
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, "reason_required");
    res = await api.fetch(new Request("https://example.test/api/report", { method: "POST", body: "[" }));
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, "report_failed");
    res = await api.fetch(new Request("https://example.test/api/report", { method: "POST", body: "x".repeat(4_001) }));
    assert.equal(res.status, 413);
    assert.equal((await res.json()).error, "report_failed");
    assert.equal(db.calls.length, 0);
  });
});

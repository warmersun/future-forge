import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createPlayerRoutes } from "./player-routes.mjs";

const A = { enabled: true, signedIn: true, userId: "user_A" };
const B = { enabled: true, signedIn: true, userId: "user_B" };
const id = "11111111-1111-4111-8111-111111111111";

function fakeDb() {
  const calls = [];
  const state = { pins: new Map(), runs: new Map(), profiles: new Map(), snapshots: new Map(), solved: new Map(), achievements: new Map() };
  const query = async (sql, args = []) => {
    calls.push({ sql, args });
    const uid = args[0];
    if (["BEGIN", "COMMIT", "ROLLBACK"].includes(sql)) return { rows: [] };
    if (sql.startsWith("INSERT INTO users")) return { rows: [], rowCount: 1 };
    if (sql.startsWith("SELECT COUNT(*)")) return { rows: [{ n: (state.runs.get(uid) || []).length }] };
    if (sql.startsWith("INSERT INTO solved_quests")) {
      const before = state.solved.get(uid) || [];
      const next = Array.isArray(args[1]) ? args[1] : [args[1]];
      const inserted = next.filter((v) => !before.includes(v));
      state.solved.set(uid, [...before, ...inserted]);
      return { rows: [], rowCount: inserted.length };
    }
    if (sql.startsWith("SELECT quest_id FROM solved_quests")) return { rows: (state.solved.get(uid) || []).map((quest_id) => ({ quest_id })) };
    if (sql.startsWith("SELECT code FROM achievements")) return { rows: (state.achievements.get(uid) || []).map((code) => ({ code })) };
    if (sql.startsWith("INSERT INTO achievements")) {
      state.achievements.set(uid, [...(state.achievements.get(uid) || []), ...args[1]]);
      return { rows: [] };
    }
    if (sql.startsWith("SELECT code, run_id, unlocked_at")) return { rows: (state.achievements.get(uid) || []).map((code) => ({ code, unlocked_at: "2026-01-01" })) };
    if (sql.startsWith("SELECT ended_at FROM runs")) return { rows: [] };
    if (sql.startsWith("SELECT tech_ids FROM runs")) return { rows: [] };
    if (sql.includes("FROM runs WHERE clerk_user_id = $1")) {
      let rows = state.runs.get(uid) || [];
      if (sql.includes("AND kind = $2")) rows = rows.filter((r) => r.kind === args[1]);
      if (sql.includes("AND outcome =")) rows = rows.filter((r) => r.outcome === args[sql.includes("AND kind = $2") ? 2 : 1]);
      return { rows: rows.slice(0, args.at(-1)) };
    }
    if (sql.startsWith("INSERT INTO runs")) {
      const run = sql.includes("NULL,$4")
        ? { id, quest_id: args[1], kind: args[2], outcome: null, place: args[3] }
        : { id, quest_id: args[1], kind: args[2], outcome: args[3], stars: args[4], year_reached: args[5], waits: args[6], place: args[7], tech_ids: args[9], imported: args[8] };
      state.runs.set(uid, [...(state.runs.get(uid) || []), run]);
      return { rows: [{ id }], rowCount: 1 };
    }
    if (sql.startsWith("UPDATE runs SET quest_id")) {
      const row = (state.runs.get(args[1]) || []).find((r) => r.id === args[0]);
      if (row) Object.assign(row, { quest_id: args[2], outcome: args[4] });
      return { rows: row ? [{ id }] : [], rowCount: row ? 1 : 0 };
    }
    if (sql.startsWith("UPDATE runs SET share")) {
      const row = (state.runs.get(args[1]) || []).find((r) => r.id === args[0]);
      if (row) row.share = args[2];
      return { rows: row ? [{ id }] : [], rowCount: row ? 1 : 0 };
    }
    if (sql.startsWith("SELECT slot, mission_id")) return { rows: state.pins.get(uid) || [] };
    if (sql.startsWith("DELETE FROM pins")) { state.pins.set(uid, []); return { rows: [] }; }
    if (sql.startsWith("INSERT INTO pins")) {
      state.pins.get(uid).push({ mission_id: args[2], global_id: args[3], title: args[4], place: args[5], global_title: args[6], snapshot: args[7] ? JSON.parse(args[7]) : null, pinned_at: "2026-01-01" });
      return { rows: [] };
    }
    if (sql.startsWith("SELECT run_id, quest_id")) return { rows: state.snapshots.get(uid) ? [state.snapshots.get(uid)] : [] };
    if (sql.startsWith("INSERT INTO run_state")) {
      state.snapshots.set(uid, { run_id: args[1], quest_id: args[2], year_reached: args[3], tutor: args[4], board: args[5] && JSON.parse(args[5]), play: args[6] && JSON.parse(args[6]), chats: args[7] && JSON.parse(args[7]), updated_at: "2026-01-01" });
      return { rows: [] };
    }
    if (sql.startsWith("SELECT clerk_user_id, username")) return { rows: state.profiles.has(uid) ? [{ clerk_user_id: uid, ...state.profiles.get(uid) }] : [] };
    if (sql.startsWith("UPDATE users SET time_zone")) { state.profiles.set(uid, { ...(state.profiles.get(uid) || {}), time_zone: args[1] }); return { rows: [] }; }
    if (sql.startsWith("UPDATE users SET")) {
      const p = { ...(state.profiles.get(uid) || {}) };
      for (const col of ["username", "display_name", "bio", "is_public", "hide_email", "time_zone"]) {
        const m = sql.match(new RegExp(`${col} = \\$(\\d+)`));
        if (m) p[col] = args[Number(m[1]) - 1];
      }
      state.profiles.set(uid, p);
      return { rows: [] };
    }
    throw new Error(`Unmodeled SQL: ${sql}`);
  };
  return { calls, state, query, async connect() { return { query, release() {} }; } };
}
function req(path, method = "GET", body, headers = {}) {
  return new Request(`https://functions.example${path}`, { method, headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...headers }, ...(body !== undefined ? { body: typeof body === "string" ? body : JSON.stringify(body) } : {}) });
}
async function call(api, path, method = "GET", body, identity = A, headers = {}) {
  const r = await api.fetch(req(path, method, body, headers), identity);
  return r === null ? null : { status: r.status, body: await r.json(), headers: r.headers };
}

describe("Neon player routes (offline SQL adapter)", () => {
  it("rejects unsigned, disabled, malformed identity, wrong method, oversized and invalid bodies without DB writes", async () => {
    const db = fakeDb(), api = createPlayerRoutes({ db });
    assert.equal((await api.fetch(req("/api/me/pins"))).status, 401);
    assert.deepEqual((await call(api, "/api/me/pins", "GET", undefined, { enabled: false })).body, { ok: false, error: "clerk_disabled", clerk: false });
    assert.equal((await call(api, "/api/me/runs", "GET", undefined, { enabled: true, signedIn: true, userId: "bad id" })).status, 401);
    assert.equal((await call(api, "/api/me/runs", "DELETE")).status, 405);
    assert.equal(await call(api, "/api/device/start"), null);
    assert.equal(db.calls.length, 0);
    assert.equal((await call(api, "/api/me/import", "POST", "{" )).body.error, "invalid_json");
    assert.equal((await call(api, "/api/me/pins", "PUT", { pins: [] }, A, { "Content-Length": "49000" })).status, 413);
    assert.equal((await call(api, "/api/me/runs/start", "POST", { questId: "bad id" })).body.error, "invalid_run");
    assert.equal((await api.fetch(req("/api/me/pins", "GET", undefined, { Authorization: "Bearer forged" }))).status, 401);
    assert.equal((await api.fetch(req("/api/me/runs", "POST", { questId: "q1", outcome: "hold", userId: B.userId }, { Authorization: "Bearer forged" }))).status, 401);
    assert.equal((await call(api, "/api/me/pins", "PUT", { pins: [{ missionId: "q1", payload: "x".repeat(49_000) }] })).status, 413);
    assert.equal(db.calls.length, 0);
    assert.equal((await call(createPlayerRoutes(), "/api/me/pins")).status, 503);
  });

  it("scopes start, completion, list, share and import to verified user; ignores body userId", async () => {
    const db = fakeDb(), api = createPlayerRoutes({ db });
    assert.deepEqual((await call(api, "/api/me/runs/start", "POST", { questId: "q1", userId: B.userId })).body, { ok: true, stored: true, id });
    assert.equal((await call(api, "/api/me/runs", "GET", undefined, B)).body.runs.length, 0);
    const completed = await call(api, "/api/me/runs", "POST", { run: { id, questId: "q1", outcome: "hold", kind: "theme", userId: B.userId } });
    assert.equal(completed.body.unlocked[0].code, "held_pathway");
    assert.equal((await call(api, "/api/me/runs?kind=theme&limit=1")).body.runs[0].outcome, "hold");
    assert.deepEqual((await call(api, "/api/me/runs/share", "POST", { runId: id, share: true }, B)).body, { ok: true, stored: false });
    assert.deepEqual((await call(api, "/api/me/runs/share", "POST", { runId: id, share: true })).body, { ok: true, stored: true });
    const imported = await call(api, "/api/me/import", "POST", { userId: B.userId, solvedIds: ["q2", "q2"], lastRun: { questId: "q3", outcome: "partial" } });
    assert.equal(imported.body.inserted, 1);
    assert.equal(imported.body.lastRunStored, false);
    assert.equal((await call(api, "/api/me/import", "POST", { solvedIds: ["q9"] }, B)).body.total, 1);
    assert.ok(db.calls.filter(({ sql }) => !["BEGIN", "COMMIT", "ROLLBACK"].includes(sql)).every(({ sql, args }) => args.includes(A.userId) || args.includes(B.userId)), "all statements bind an owner");
  });

  it("roundtrips per-user pins, run-state and profile; achievements list stays private", async () => {
    const db = fakeDb(), api = createPlayerRoutes({ db });
    assert.equal((await call(api, "/api/me/pins", "PUT", { pins: [{ missionId: "q1", title: "Home", missionSnapshot: { id: "q1" } }] })).body.pins.length, 1);
    assert.equal((await call(api, "/api/me/pins", "GET")).body.pins[0].missionId, "q1");
    assert.deepEqual((await call(api, "/api/me/pins", "GET", undefined, B)).body.pins, []);
    const put = await call(api, "/api/me/run-state", "PUT", { questId: "q1", year: 2040 });
    assert.deepEqual(put.body, { ok: true });
    assert.equal((await call(api, "/api/me/run-state")).body.state.questId, "q1");
    assert.equal((await call(api, "/api/me/run-state", "GET", undefined, B)).body.state, null);
    const p = await call(api, "/api/me/profile", "PUT", { username: "inventor_a", displayName: "Inventor A", public: true });
    assert.equal(p.body.profile.displayName, "Inventor A");
    assert.equal((await call(api, "/api/me/profile", "GET", undefined, B)).body.needsDisplayName, true);
    assert.deepEqual((await call(api, "/api/me/achievements", "GET", undefined, B)).body.achievements, []);
    assert.equal((await call(api, "/api/me/achievements?tz=America%2FLos_Angeles")).body.streak.timeZone, "America/Los_Angeles");
  });

  it("does not leak DB errors, maps profile conflict, and rolls back failed transaction", async () => {
    const db = fakeDb();
    const failure = { query: async () => { throw new Error("DATABASE_URL=secret"); }, connect: db.connect };
    const response = await call(createPlayerRoutes({ db: failure }), "/api/me/pins");
    assert.deepEqual(response.body, { ok: false, error: "pins_failed" });
    assert.equal(JSON.stringify(response.body).includes("secret"), false);
    const conflict = createPlayerRoutes({ db: { query: async () => { const e = new Error("duplicate"); e.code = "23505"; throw e; }, connect: async () => ({ query: async (sql) => { if (sql === "BEGIN" || sql === "ROLLBACK") return {}; const e = new Error("duplicate"); e.code = "23505"; throw e; }, release() {} }) } });
    assert.equal((await call(conflict, "/api/me/profile", "PUT", { username: "taken" })).status, 409);
    const tx = fakeDb();
    const broken = createPlayerRoutes({ db: { ...tx, async connect() { return { query: async (sql, args) => sql.startsWith("INSERT INTO pins") ? Promise.reject(new Error("secret")) : tx.query(sql, args), release() {} }; } } });
    assert.equal((await call(broken, "/api/me/pins", "PUT", { pins: [{ missionId: "q1" }] })).status, 500);
    assert.ok(tx.calls.some(({ sql }) => sql === "ROLLBACK"));
  });
});

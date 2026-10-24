import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createPlayerRoutes as playerRoutes } from "./player-routes.mjs";
import { PORTFOLIO_CATEGORIES } from "../../js/sim/portfolio.js";
import { DEFAULT_QUESTS_REMOTE_URL, _resetRemoteQuestCache } from "../../js/quests-remote.mjs";
import { _resetObjectQuestCache } from "../../js/server/quest-object-storage.mjs";

// Never inherit credentials/catalog configuration from the test process.
const createPlayerRoutes = (opts = {}) => playerRoutes({
  env: {}, fetchImpl: async () => { throw new Error("offline_fetch_only"); }, ...opts,
});

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
    if (sql.startsWith("SELECT COUNT(*)")) return { rows: [{ n: sql.includes("FROM users") ? 1 : (state.runs.get(uid) || []).length }] };
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
    if (sql.startsWith("SELECT ended_at FROM runs")) return { rows: (state.runs.get(uid) || []).filter((r) => ["hold", "partial"].includes(r.outcome) && r.ended_at) };
    if (sql.startsWith("SELECT tech_ids FROM runs")) return { rows: (state.runs.get(uid) || []).filter((r) => ["hold", "partial"].includes(r.outcome)) };
    if (sql.includes("FROM subscriptions")) return { rows: state.subscription ? [state.subscription] : [] };
    if (sql.includes("FROM runs WHERE clerk_user_id = $1 AND id = $2::uuid")) return { rows: (state.runs.get(uid) || []).filter((r) => r.id === args[1]) };
    if (sql.includes("FROM runs WHERE clerk_user_id = $1")) {
      let rows = state.runs.get(uid) || [];
      if (sql.includes("AND kind = $2")) rows = rows.filter((r) => r.kind === args[1]);
      if (sql.includes("AND outcome =")) rows = rows.filter((r) => r.outcome === args[sql.includes("AND kind = $2") ? 2 : 1]);
      return { rows: rows.slice(0, args.at(-1)) };
    }
    if (sql.startsWith("INSERT INTO runs")) {
      const run = sql.includes("NULL,$4")
        ? {
            id,
            quest_id: args[1],
            kind: args[2],
            outcome: null,
            place: args[3],
            package_id: args[4] || null,
            package_revision: args[5] || null,
            package_quest_id: args[6] || null,
          }
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
// Separate connection-local snapshots: failed statements abort the transaction,
// rollback discards its writes, and pool reads only see committed progress.
function transactionalDb({ fail = () => false, userCount = 1 } = {}) {
  const base = fakeDb(), events = [];
  return {
    state: base.state, events,
    async query(sql, args = []) {
      events.push({ sql, args, connection: "pool" });
      if (fail(sql, "pool")) throw new Error("private DB failure");
      if (sql === "SELECT COUNT(*)::int AS n FROM users") return { rows: [{ n: userCount }] };
      return base.query(sql, args);
    },
    async connect() {
      const local = fakeDb();
      let aborted = false;
      return {
        async query(sql, args = []) {
          events.push({ sql, args, connection: "transaction" });
          if (sql === "ROLLBACK") { aborted = false; return { rows: [] }; }
          if (aborted) throw new Error("transaction aborted");
          if (fail(sql, "transaction")) { aborted = true; throw new Error("private DB failure"); }
          if (sql === "BEGIN") Object.assign(local.state, structuredClone(base.state));
          else if (sql === "COMMIT") Object.assign(base.state, structuredClone(local.state));
          else return local.query(sql, args);
          return { rows: [] };
        },
        release() { events.push({ sql: "RELEASE", connection: "transaction" }); },
      };
    },
  };
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
    assert.deepEqual((await call(api, "/api/me/runs/start", "POST", { questId: "q1", userId: B.userId })).body, { ok: true, stored: true, id, packageRef: null });
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
    assert.ok(db.calls.filter(({ sql }) => !["BEGIN", "COMMIT", "ROLLBACK", "SELECT COUNT(*)::int AS n FROM users"].includes(sql)).every(({ args }) => args.includes(A.userId) || args.includes(B.userId)), "all player statements bind an owner");
  });

  it("refuses malformed start references instead of silently starting an unbound run", async () => {
    const db = fakeDb();
    const api = createPlayerRoutes({ db });
    for (const packageRef of [{}, { packageId: " bad", revision: "latest", questId: "q1" }, null]) {
      const result = await call(api, "/api/me/runs/start", "POST", { questId: "q1", packageRef });
      assert.equal(result.status, 400);
      assert.equal(result.body.error, "invalid_run");
    }
    assert.equal(db.calls.length, 0);
  });

  it("binds a resolved package and refuses a start when resolution fails", async () => {
    const ref = {
      packageId: "kiln-ferry-test",
      revision: `sha256:${"ab".repeat(32)}`,
      questId: "q1",
    };
    const db = fakeDb();
    const api = createPlayerRoutes({
      db,
      resolvePackage: async () => ({ ok: true, packageRef: ref }),
    });
    const started = await call(api, "/api/me/runs/start", "POST", { questId: "q1", packageRef: ref });
    assert.equal(started.status, 200);
    assert.deepEqual(started.body.packageRef, ref);
    const listed = await call(api, "/api/me/runs");
    assert.equal(listed.body.runs[0].packageRef.revision, ref.revision);

    const denied = fakeDb();
    const blocked = createPlayerRoutes({
      db: denied,
      resolvePackage: async () => ({ ok: false, code: "package_reference_forbidden" }),
    });
    const failed = await call(blocked, "/api/me/runs/start", "POST", { questId: "q1", packageRef: ref });
    assert.equal(failed.status, 403);
    assert.equal(failed.body.error, "package_reference_forbidden");
    assert.equal(denied.calls.some(({ sql }) => sql.startsWith("INSERT INTO runs")), false);
  });

  it("owns official start and Continue identity, revision and current access on actual routes", async () => {
    const db = fakeDb();
    const ref = { packageId: "official-world", revision: `sha256:${"ab".repeat(32)}`, questId: "q1" };
    const next = { ...ref, revision: `sha256:${"cd".repeat(32)}` };
    let current = ref, allowed = true;
    const seen = [];
    const api = createPlayerRoutes({ db, loadCatalog: async (opts) => {
      assert.equal(opts.force, true);
      return { ok: true, quests: [{ id: "q1", packageRef: current }] };
    }, resolvePackage: async (bound, opts) => {
      seen.push({ bound, opts });
      return allowed ? { ok: true, packageRef: bound,
        record: { mission: { id: "q1", title: "SERVER" } }, runWorld: { bank: { id: "server-bank" } } }
        : { ok: false, code: "subscription_required", status: 402 };
    } });
    const start = await call(api, "/api/me/runs/start", "POST", { questId: "q1" });
    assert.deepEqual(start.body.packageRef, ref);
    assert.equal(db.state.runs.get(A.userId)[0].package_revision, ref.revision);
    const snapshot = { questId: "q1", runId: start.body.id, play: { packageRef: ref,
      mission: { id: "q1", title: "FORGED", packageRef: ref }, predictionsBank: { id: "forged" }, reflection: "my reflection" },
      chats: { tutor: [{ role: "user", content: "keep my chat" }] } };
    assert.equal((await call(api, "/api/me/run-state", "PUT", snapshot)).status, 200);
    let saved = db.state.snapshots.get(A.userId);
    assert.equal(saved.play.mission.title, undefined);
    assert.equal(saved.play.predictionsBank, undefined);
    assert.equal(saved.play.runWorld, undefined);
    assert.equal(saved.play.mission.runWorld, undefined);
    assert.deepEqual(saved.play.packageRef, ref);
    assert.equal(saved.play.reflection, "my reflection");
    assert.equal(saved.chats.tutor[0].content, "keep my chat");
    current = next;
    const continued = await call(api, "/api/me/run-state");
    assert.equal(continued.body.state.play.packageRef.revision, ref.revision);
    assert.equal(continued.body.state.play.mission.title, "SERVER");
    assert.equal(continued.body.state.play.mission.runWorld.bank.id, "server-bank");
    assert.equal(continued.body.state.play.runWorld, undefined);
    assert.equal(seen.at(-1).bound.revision, ref.revision);
    assert.equal(seen.at(-1).opts.identity.userId, A.userId);
    assert.equal(seen.at(-1).opts.entitled, false);
    assert.equal((await call(api, "/api/me/runs/start", "POST", { questId: "q1", packageRef: ref })).status, 409);
    const forged = structuredClone(snapshot); forged.play.packageRef = next;
    assert.equal((await call(api, "/api/me/run-state", "PUT", forged)).status, 409);
    assert.equal((await call(api, "/api/me/run-state", "PUT", { ...snapshot, questId: "q2" })).status, 409);
    assert.equal((await call(api, "/api/me/run-state", "PUT", snapshot, B)).status, 403);
    assert.equal((await call(api, "/api/me/run-state", "PUT", { questId: "q1", runId: id }, B)).status, 403);
    assert.equal((await call(api, "/api/me/run-state", "PUT", { ...snapshot, runId: null })).status, 403);
    allowed = false;
    assert.equal((await call(api, "/api/me/run-state")).status, 402);
    assert.equal((await call(api, "/api/me/run-state", "PUT", snapshot)).status, 402);
    assert.equal((await call(api, "/api/me/runs/start", "POST", { questId: "q1" })).status, 402);
    saved = db.state.snapshots.get(A.userId);
    saved.play.packageRef = next;
    assert.equal((await call(api, "/api/me/run-state")).status, 409);
    assert.equal(db.state.snapshots.has(B.userId), false);
    db.state.snapshots.set(B.userId, structuredClone(saved));
    assert.equal((await call(api, "/api/me/run-state", "GET", undefined, B)).status, 403);
  });

  it("roundtrips local-import identity without upgrading it to an official release", async () => {
    const db = fakeDb(), api = createPlayerRoutes({ db, resolvePackage: () => { throw new Error("must not resolve official"); } });
    const ref = { packageId: "local-world", questId: "q1", revision: `sha256:${"ab".repeat(32)}` };
    const bank = JSON.parse(readFileSync(new URL("../../test/fixtures/predictions/companion-dock-test.json", import.meta.url), "utf8"));
    const state = { questId: "q1", play: { mission: { id: "q1", source: "imported", packageRef: ref,
      predictionBankId: bank.id, runWorld: { packageRef: ref, bank, trust: "local-import", questId: "q1" } } } };
    assert.equal((await call(api, "/api/me/run-state", "PUT", state)).status, 200);
    const got = (await call(api, "/api/me/run-state")).body.state;
    assert.equal(got.play.packageRef, undefined);
    assert.equal(got.play.mission.runWorld.trust, "local-import");
    assert.equal(got.play.mission.runWorld.bank.id, bank.id);
    const broken = structuredClone(state); delete broken.play.mission.runWorld.bank;
    assert.equal((await call(api, "/api/me/run-state", "PUT", broken)).status, 400);
    assert.equal((await call(api, "/api/me/run-state")).body.state.play.mission.runWorld.bank.id, bank.id);
  });

  it("stores large official calendars as compact references and hydrates a single copy", async () => {
    const db = fakeDb();
    const ref = { packageId: "official-world", questId: "q1", revision: `sha256:${"ab".repeat(32)}` };
    const bank = { schema: "future-forge.predictions/v1", id: "unicode-bank", title: "Synthetic test calendar",
      predictions: Array.from({ length: 120 }, (_, index) => ({ id: `row-${index}`, year: 2026, kind: "prediction", claimBand: "now", headline: "Synthetic", detail: "界".repeat(650) })) };
    const api = createPlayerRoutes({ db, loadCatalog: async () => ({ ok: true, quests: [{ id: "q1", packageRef: ref }] }),
      resolvePackage: async () => ({ ok: true, packageRef: ref, record: { mission: { id: "q1", predictionBankId: bank.id } }, runWorld: { bank, packageRef: ref, trust: "official" } }) });
    const start = await call(api, "/api/me/runs/start", "POST", { questId: "q1" });
    const put = await call(api, "/api/me/run-state", "PUT", { questId: "q1", runId: start.body.id, year: 2026 });
    assert.equal(put.status, 200, JSON.stringify(put.body));
    assert.ok(Buffer.byteLength(JSON.stringify(db.state.snapshots.get(A.userId)), "utf8") < 2000);
    const get = await call(api, "/api/me/run-state");
    assert.equal(get.status, 200, JSON.stringify(get.body));
    assert.equal(get.body.state.play.runWorld, undefined);
    assert.equal(get.body.state.play.mission.runWorld.bank.predictions.length, 120);
  });

  it("enforces the final UTF-8 snapshot cap after restoring the authoritative projection on GET and PUT", async () => {
    const db = fakeDb();
    const ref = { packageId: "official-world", questId: "q1", revision: `sha256:${"ab".repeat(32)}` };
    const api = createPlayerRoutes({ db, loadCatalog: async () => ({ ok: true, quests: [{ id: "q1", packageRef: ref }] }),
      resolvePackage: async () => ({ ok: true, packageRef: ref, record: { mission: { id: "q1", title: "Authoritative" } },
        runWorld: { bank: { id: "official", detail: "界".repeat(150_000) } } }) });
    const start = await call(api, "/api/me/runs/start", "POST", { questId: "q1" });
    const state = { questId: "q1", runId: start.body.id };
    const put = await call(api, "/api/me/run-state", "PUT", state);
    assert.equal(put.status, 400);
    assert.equal(put.body.error, "too_large");
    assert.equal(db.state.snapshots.size, 0);
    db.state.snapshots.set(A.userId, { quest_id: "q1", run_id: start.body.id });
    const get = await call(api, "/api/me/run-state");
    assert.equal(get.status, 400);
    assert.equal(get.body.error, "too_large");
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

  for (const path of ["/api/me/runs", "/api/me/import"]) {
    const body = path.endsWith("import")
      ? { solvedIds: ["q-import"], lastRun: { questId: "q1", outcome: "hold" } }
      : { run: { questId: "q1", outcome: "hold" } };
    for (const failure of ["SELECT code FROM achievements", "INSERT INTO achievements", "SELECT COUNT(*)::int AS n FROM users"]) {
      it(`${path} commits progress before best-effort ${failure} failure`, async () => {
        const db = transactionalDb({ fail: (sql) => sql.startsWith(failure) });
        const result = await call(createPlayerRoutes({ db }), path, "POST", body);
        assert.equal(result.status, 200);
        assert.equal(result.body.ok, true);
        assert.deepEqual(result.body.unlocked, []);
        assert.equal(db.state.runs.get(A.userId)?.length, 1);
        assert.ok(db.state.solved.get(A.userId)?.includes("q1"));
        if (path.endsWith("import")) assert.ok(db.state.solved.get(A.userId).includes("q-import"));
        const commit = db.events.findIndex((e) => e.sql === "COMMIT");
        const award = db.events.findIndex((e) => e.sql.startsWith("SELECT code FROM achievements"));
        assert.ok(commit >= 0 && award > commit, "achievement work begins after progress COMMIT");
        assert.ok(db.events.findIndex((e) => e.sql === "RELEASE") < award, "core connection released before awards");
        assert.equal(db.events[award].connection, "pool", "awards do not use the core transaction");
        assert.equal(db.events.some((e) => e.sql === "ROLLBACK"), false);
        assert.equal(JSON.stringify(result.body).includes("private"), false);
      });
    }
    for (const failure of ["INSERT INTO solved_quests", "COMMIT"]) it(`${path} rolls back core writes and skips awards if ${failure} fails`, async () => {
      const db = transactionalDb({ fail: (sql) => sql.startsWith(failure) });
      let catalogCalls = 0;
      const result = await call(createPlayerRoutes({ db, loadCatalog: async () => { catalogCalls++; return {}; } }), path, "POST", body);
      assert.equal(result.status, 500);
      assert.equal(db.state.runs.size, 0);
      assert.equal(db.state.solved.size, 0);
      assert.ok(db.events.some((e) => e.sql === "ROLLBACK"));
      assert.equal(db.events.some((e) => e.sql.includes("achievements")), false);
      assert.equal(catalogCalls, 0);
    });
  }

  it("restores server-derived sponsored, career toolkit, founding/event and timezone streak awards without duplicates", async () => {
    const db = transactionalDb();
    const now = () => new Date("2026-10-21T00:30:00Z"); // UTC Wednesday, Tuesday in LA
    db.state.profiles.set(A.userId, { time_zone: "America/Los_Angeles" });
    db.state.runs.set(A.userId, [
      { outcome: "hold", ended_at: "2026-10-20T23:00:00Z", tech_ids: PORTFOLIO_CATEGORIES.map((c) => c.techIds[0]) },
      { outcome: "partial", ended_at: "2026-10-19T23:00:00Z" },
      { outcome: "hold", ended_at: "2026-10-18T23:00:00Z" },
    ]);
    db.state.achievements.set(B.userId, ["held_pathway", "full_toolkit"]);
    const api = createPlayerRoutes({ db, now, loadCatalog: async () => {
      assert.ok(db.state.solved.get(A.userId)?.includes("q1"), "catalog sees committed progress");
      assert.equal(db.events.at(-1).connection, "pool");
      return { byId: new Map([["q1", { mission: { sponsorName: "Sponsor" } }]]) };
    } });
    const result = await call(api, "/api/me/runs", "POST", { run: { questId: "q1", outcome: "partial", kind: "friends", techIds: ["converter"] } });
    assert.equal(result.status, 200);
    assert.deepEqual(result.body.unlocked.map((a) => a.code), ["held_pathway", "first_friends_hold", "sponsored_spotlight", "converter_dock", "full_toolkit", "founding", "invent_night_2026", "streak_3"]);
    const insert = db.events.find((e) => e.sql.startsWith("INSERT INTO achievements"));
    assert.equal(insert.args[2], id);
    assert.deepEqual((await call(api, "/api/me/runs", "POST", { questId: "q1", outcome: "partial", kind: "friends", techIds: ["converter"] })).body.unlocked, []);
    assert.deepEqual(db.state.achievements.get(B.userId), ["held_pathway", "full_toolkit"]);
  });

  it("catalog, portfolio and streak lookup failures independently preserve base/founding awards", async () => {
    for (const failure of ["catalog", "SELECT tech_ids FROM runs", "SELECT ended_at FROM runs", "SELECT clerk_user_id, username"]) {
      const db = transactionalDb({ fail: (sql) => sql.startsWith(failure) });
      const api = createPlayerRoutes({ db, now: () => new Date("2026-10-22T12:00:00Z"), loadCatalog: async () => {
        if (failure === "catalog") throw new Error("private catalog failure");
        return { quests: [{ mission: { id: "q1", sponsorName: "Sponsor" } }] };
      } });
      const result = await call(api, "/api/me/runs", "POST", { questId: "q1", outcome: "hold", sponsored: true, unlocked: ["streak_30"] });
      assert.equal(result.status, 200);
      assert.deepEqual(result.body.unlocked.map((a) => a.code), failure === "catalog"
        ? ["held_pathway", "founding"] : ["held_pathway", "sponsored_spotlight", "founding"]);
      assert.equal(db.state.runs.get(A.userId).length, 1);
    }
  });

  it("awards imported last run only when stored, with catalog parity and saved run reference", async () => {
    const db = transactionalDb();
    const api = createPlayerRoutes({ db, now: () => new Date("2026-10-22T12:00:00Z"), loadCatalog: async () => ({ quests: [{ id: "q1", sponsorName: "Sponsor" }] }) });
    const body = { lastRun: { questId: "q1", outcome: "hold" } };
    const result = await call(api, "/api/me/import", "POST", body);
    assert.equal(result.body.lastRunStored, true);
    assert.deepEqual(result.body.unlocked.map((a) => a.code), ["held_pathway", "sponsored_spotlight", "founding"]);
    assert.equal(db.events.find((e) => e.sql.startsWith("INSERT INTO achievements")).args[2], id);
    db.events.length = 0;
    const again = await call(api, "/api/me/import", "POST", body);
    assert.equal(again.body.lastRunStored, false);
    assert.deepEqual(again.body.unlocked, []);
    assert.equal(db.events.some((e) => e.sql.includes("achievements")), false);
  });

  describe("sponsorship catalog source parity", () => {
    const tile = JSON.parse(readFileSync(new URL("../../test/fixtures/quests/spotlight-gene-seq.json", import.meta.url), "utf8"));
    tile.id = tile.mission.id = "q1";
    tile.mission.sponsorName = "Catalog sponsor";
    const catalogBody = JSON.stringify({ quests: [{ id: "q1", file: "quest.json" }] });
    const tileBody = JSON.stringify(tile);
    const now = () => new Date("2026-10-22T12:00:00Z");
    beforeEach(() => {
      _resetRemoteQuestCache();
      _resetObjectQuestCache();
    });
    function assertSaved(db, result, path, sponsored) {
      assert.equal(result.status, 200);
      assert.equal(result.body.ok, true);
      assert.equal(result.body[path.endsWith("import") ? "lastRunStored" : "stored"], true);
      assert.equal(db.state.runs.get(A.userId).length, 1);
      assert.ok(db.state.solved.get(A.userId).includes("q1"));
      assert.deepEqual(result.body.unlocked.map((a) => a.code), sponsored
        ? ["held_pathway", "sponsored_spotlight", "founding"] : ["held_pathway", "founding"]);
      assert.equal(db.events.find((e) => e.sql.startsWith("INSERT INTO achievements")).args[2], id);
    }
    for (const path of ["/api/me/runs", "/api/me/import"]) {
      const body = path.endsWith("import")
        ? { lastRun: { questId: "q1", outcome: "hold", sponsored: true } }
        : { run: { questId: "q1", outcome: "hold", sponsored: true } };
      for (const [name, env, catalogUrl] of [
        ["explicit", { FF_QUESTS_REMOTE_URL: "  https://catalog.example.test/quests/catalog.json  " }, "https://catalog.example.test/quests/catalog.json"],
        ["default", {}, DEFAULT_QUESTS_REMOTE_URL],
      ]) it(`${path} awards sponsorship from the ${name} remote catalog without loadCatalog injection`, async () => {
        const db = transactionalDb(), fetched = [];
        const api = createPlayerRoutes({ db, now, env, fetchImpl: async (url) => {
          assert.ok(db.state.solved.get(A.userId)?.includes("q1"), "fetch sees committed progress");
          fetched.push(url);
          if (url === catalogUrl) return new Response(catalogBody);
          if (url === new URL("quest.json", catalogUrl).href) return new Response(tileBody);
          throw new Error("unexpected_catalog_source");
        } });
        assertSaved(db, await call(api, path, "POST", body), path, true);
        assert.deepEqual(fetched, [catalogUrl, new URL("quest.json", catalogUrl).href]);
      });

      for (const configured of ["", "  ", "0", "OFF", "false"]) {
        it(`${path} does not fetch or award sponsorship with remote disabled (${JSON.stringify(configured)})`, async () => {
          const db = transactionalDb(), fetched = [];
          const api = createPlayerRoutes({ db, now, env: { FF_QUESTS_REMOTE_URL: configured },
            fetchImpl: async (url) => { fetched.push(url); throw new Error("unexpected_fetch"); } });
          assertSaved(db, await call(api, path, "POST", body), path, false);
          assert.deepEqual(fetched, []);
        });
      }

      for (const fails of [false, true]) it(`${path} treats the ${fails ? "failed" : "available"} private bucket as authoritative`, async () => {
        const db = transactionalDb(), read = [], fetched = [];
        const api = createPlayerRoutes({ db, now,
          env: { FF_QUESTS_BUCKET: "private-quests", FF_QUESTS_OBJECT_PREFIX: "/official/",
            FF_QUESTS_REMOTE_URL: "https://catalog.example.test/catalog.json" },
          readObjectText: async (key) => {
            read.push(key);
            if (fails) throw new Error("private_unavailable");
            if (key === "official/catalog.json") return catalogBody;
            if (key === "official/quest.json") return tileBody;
            throw new Error("unexpected_object");
          },
          fetchImpl: async (url) => { fetched.push(url); return new Response(catalogBody); },
        });
        assertSaved(db, await call(api, path, "POST", body), path, !fails);
        assert.deepEqual(read, fails ? ["official/catalog.json"] : ["official/catalog.json", "official/quest.json"]);
        assert.deepEqual(fetched, []);
      });

      it(`${path} prefers injected catalogs over configured bucket and remote sources`, async () => {
        const db = transactionalDb(), reads = [], fetched = [];
        let loads = 0;
        const api = createPlayerRoutes({ db, now,
          env: { FF_QUESTS_BUCKET: "private-quests", FF_QUESTS_REMOTE_URL: "https://catalog.example.test/catalog.json" },
          loadCatalog: async () => { loads++; return { byId: new Map([["q1", tile]]) }; },
          readObjectText: async (key) => { reads.push(key); throw new Error("unexpected_object"); },
          fetchImpl: async (url) => { fetched.push(url); throw new Error("unexpected_fetch"); },
        });
        assertSaved(db, await call(api, path, "POST", body), path, true);
        assert.equal(loads, 1);
        assert.deepEqual(reads, []);
        assert.deepEqual(fetched, []);
      });

      it(`${path} rejects stale failed catalog data, including byId entries`, async () => {
        const db = transactionalDb();
        const api = createPlayerRoutes({ db, now, loadCatalog: async () => ({
          ok: false, cached: true, quests: [tile], byId: new Map([["q1", tile]]),
        }) });
        assertSaved(db, await call(api, path, "POST", body), path, false);
      });

      it(`${path} never falls back to public or stale cached sponsorship after an explicit remote fails`, async () => {
        const goodDb = transactionalDb();
        const good = createPlayerRoutes({ db: goodDb, now,
          env: { FF_QUESTS_REMOTE_URL: "https://good.example.test/catalog.json" },
          fetchImpl: async (url) => new Response(url.endsWith("catalog.json") ? catalogBody : tileBody),
        });
        assertSaved(goodDb, await call(good, path, "POST", body), path, true);
        const db = transactionalDb(), fetched = [];
        const api = createPlayerRoutes({ db, now,
          env: { FF_QUESTS_REMOTE_URL: "https://failed.example.test/catalog.json" },
          fetchImpl: async (url) => { fetched.push(url); return new Response("unavailable", { status: 503 }); },
        });
        assertSaved(db, await call(api, path, "POST", body), path, false);
        assert.deepEqual(fetched, ["https://failed.example.test/catalog.json"]);
      });
    }
  });

  it("does not trust client-sponsored/toolkit/streak claims or award failed run pathway badges", async () => {
    const db = transactionalDb();
    const api = createPlayerRoutes({ db, now: () => new Date("2026-10-22T12:00:00Z"), loadCatalog: async () => ({ quests: [{ id: "q1" }] }) });
    const result = await call(api, "/api/me/runs", "POST", { questId: "q1", outcome: "collapse", sponsored: true, streak: 30, unlocked: ["full_toolkit"], techIds: PORTFOLIO_CATEGORIES.map((c) => c.techIds[0]) });
    assert.deepEqual(result.body.unlocked.map((a) => a.code), ["founding"]);
  });

  it("honors founding threshold and UTC Friends event day; successful client sponsor claims are ignored", async () => {
    for (const [userCount, kind, date, expected] of [
      [100, "theme", "2026-10-22T12:00:00Z", ["held_pathway", "founding"]],
      [101, "theme", "2026-10-21T12:00:00Z", ["held_pathway"]],
      [101, "friends", "2026-10-22T12:00:00Z", ["held_pathway", "first_friends_hold"]],
      [101, "friends", "2026-10-21T12:00:00Z", ["held_pathway", "first_friends_hold", "invent_night_2026"]],
    ]) {
      const db = transactionalDb({ userCount });
      const api = createPlayerRoutes({ db, now: () => new Date(date), loadCatalog: async () => ({ quests: [{ id: "q1" }] }) });
      const result = await call(api, "/api/me/runs", "POST", { questId: "q1", outcome: "hold", kind, sponsored: true, streak: 30, unlocked: ["full_toolkit"] });
      assert.equal(result.status, 200);
      assert.deepEqual(result.body.unlocked.map((a) => a.code), expected);
    }
  });

  it("adds only sanitized owner login summary to GET profile via injected env/provider", async () => {
    const db = fakeDb(), seen = [];
    const env = { CLERK_PUBLISHABLE_KEY: "pk_test_offline", CLERK_SECRET_KEY: "sk_test_offline" };
    const api = createPlayerRoutes({ db, env, getUser: async (uid) => {
      seen.push(uid);
      return { id: uid, firstName: "Legal", lastName: "Name", privateMetadata: { secret: true }, primaryEmailAddressId: "primary", emailAddresses: [{ id: "other", emailAddress: "other@example.test" }, { id: "primary", emailAddress: "owner@example.test" }], externalAccounts: [{ provider: "oauth_google", accessToken: "secret" }, { provider: "google" }, { provider: "oauth_github" }] };
    } });
    const result = await call(api, "/api/me/profile?userId=user_B");
    assert.equal(result.status, 200);
    assert.deepEqual(result.body.login, { email: "owner@example.test", providers: ["Google", "GitHub"] });
    assert.deepEqual(seen, [A.userId]);
    assert.equal(JSON.stringify(result.body).includes("secret"), false);
    assert.equal(JSON.stringify(result.body).includes("Legal"), false);
    await call(api, "/api/me/profile", "PUT", { displayName: "Inventor" });
    assert.equal(seen.length, 1, "legacy login lookup is GET-only");
    await call(api, "/api/me/profile", "GET", undefined, { enabled: true, missingToken: true });
    assert.equal(seen.length, 1, "unauthenticated callers never reach provider");
    for (const getUser of [async () => { throw new Error("private provider error"); }, async () => ({ firstName: "Legal", emailAddresses: [] })]) {
      const failed = await call(createPlayerRoutes({ db, env, getUser }), "/api/me/profile");
      assert.equal(failed.status, 200);
      assert.equal("login" in failed.body, false);
      assert.ok(failed.body.portfolio);
    }
    let disabledCalls = 0;
    const disabled = await call(createPlayerRoutes({ db, getUser: async () => { disabledCalls++; return {}; } }), "/api/me/profile");
    assert.equal(disabledCalls, 0, "disabled keys must not call provider");
    assert.equal("login" in disabled.body, false);
  });
});

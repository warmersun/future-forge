import test from "node:test";
import assert from "node:assert/strict";
import { resolveStartPackageBinding, resolveRunPackageBinding, sanitizeBoundRunState, compactBoundRunState } from "./run-package-binding.mjs";
import { validatePredictionsBank } from "../sim/world-foresight.js";
import { getPool, startRun, getRunState, putRunState, closePool } from "./db.mjs";

const ref = { packageId: "official-world", revision: `sha256:${"ab".repeat(32)}`, questId: "q1" };
const next = { ...ref, revision: `sha256:${"cd".repeat(32)}` };
const id = "11111111-1111-4111-8111-111111111111";
const userId = "user_test";
const row = { id, clerk_user_id: userId, quest_id: "q1", package_id: ref.packageId, package_revision: ref.revision, package_quest_id: ref.questId };
const resolvePackage = async (r) => ({ ok: true, packageRef: r, record: { mission: { id: "q1", title: "Authoritative" } }, runWorld: { bank: { id: "official-bank" } } });

test("start binds current quest without a client reference and rejects resolver identity substitution", async () => {
  const loadCatalog = async (opts) => { assert.equal(opts.force, true); return { ok: true, quests: [{ id: "q1", packageRef: ref }] }; };
  assert.deepEqual((await resolveStartPackageBinding({ questId: "q1" }, { loadCatalog, resolvePackage })).packageRef, ref);
  assert.equal((await resolveStartPackageBinding({ questId: "q1", packageRef: ref }, { resolvePackage: async () => ({ ok: true, packageRef: next }) })).ok, false);
  assert.equal((await resolveStartPackageBinding({ questId: "q1" }, { loadCatalog: async () => ({ ok: false }) })).status, 503);
});

test("Continue rejects missing/foreign rows and mismatched refs; preserves legacy ordinary snapshots", async () => {
  const snapshot = { runId: id, questId: "q1", play: { packageRef: ref, reflection: "keep" }, chats: { tutor: [] } };
  assert.equal((await resolveRunPackageBinding(snapshot, { userId, loadRun: async () => null })).status, 403);
  assert.equal((await resolveRunPackageBinding(snapshot, { userId: "user_other", loadRun: async () => row })).status, 403);
  assert.equal((await resolveRunPackageBinding({ ...snapshot, play: { packageRef: next } }, { userId, loadRun: async () => row, resolvePackage })).ok, false);
  const got = await resolveRunPackageBinding(snapshot, { userId, loadRun: async () => row, resolvePackage });
  assert.equal(got.state.play.mission.title, "Authoritative");
  assert.equal(got.state.play.reflection, "keep");
  const legacy = { questId: "ordinary", play: { mission: { id: "ordinary" } } };
  assert.deepEqual((await resolveRunPackageBinding(legacy, {})).state, legacy);
});

test("large Unicode official worlds hydrate once and persist only references", async () => {
  const validated = validatePredictionsBank({ schema: "future-forge.predictions/v1", id: "unicode-bank", title: "Synthetic test calendar",
    predictions: Array.from({ length: 120 }, (_, index) => ({ id: `row-${index}`, year: 2026, kind: "prediction", claimBand: "now", headline: "Synthetic", detail: "界".repeat(650) })) });
  assert.equal(validated.ok, true);
  const bank = validated.bank;
  const bankBytes = Buffer.byteLength(JSON.stringify(bank), "utf8");
  assert.ok(bankBytes > 200_000 && bankBytes < 400_000, String(bankBytes));
  const checked = sanitizeBoundRunState(await resolveRunPackageBinding({ runId: id, questId: "q1", play: { reflection: "private" } }, {
    userId, loadRun: async () => row,
    resolvePackage: async (r) => ({ ok: true, packageRef: r, record: { mission: { id: "q1", predictionBankId: bank.id } }, runWorld: { bank, packageRef: r, trust: "official" } }),
  }));
  assert.equal(checked.ok, true, checked.code);
  assert.equal(checked.state.play.runWorld, undefined);
  assert.equal(checked.state.play.mission.runWorld.bank.predictions.length, 120);
  const saved = compactBoundRunState(checked);
  assert.equal(saved.play.mission.runWorld, undefined);
  assert.equal(saved.play.runWorld, undefined);
  assert.deepEqual(saved.play.packageRef, ref);
  assert.equal(saved.play.reflection, "private");
  assert.ok(Buffer.byteLength(JSON.stringify(saved), "utf8") < 2000);
});

test("legacy DB start/get/put use server binding and owner-scoped SQL without connecting", async () => {
  const previous = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "postgresql://offline.invalid/not-connected";
  const pool = getPool();
  const calls = [];
  let snapshot;
  pool.query = async (sql, args = []) => {
    calls.push({ sql, args });
    if (sql.includes("FROM run_state")) return { rows: snapshot ? [snapshot] : [] };
    if (sql.includes("FROM runs WHERE clerk_user_id = $1 AND id = $2::uuid")) return { rows: args[0] === userId && args[1] === id ? [row] : [] };
    if (sql.startsWith("INSERT INTO runs")) return { rows: [{ id }] };
    if (sql.startsWith("INSERT INTO run_state")) snapshot = { run_id: args[1], quest_id: args[2], play: JSON.parse(args[6]), chats: JSON.parse(args[7]) };
    return { rows: [] };
  };
  pool.connect = async () => ({ query: pool.query, release() {} });
  pool.end = async () => {};
  try {
    const started = await startRun({ clerkUserId: userId, questId: "q1", loadCatalog: async () => ({ ok: true, quests: [{ id: "q1", packageRef: ref }] }), resolvePackage });
    assert.deepEqual(started.packageRef, ref);
    assert.equal(calls.find((c) => c.sql.startsWith("INSERT INTO runs")).args[5], ref.revision);
    const state = { runId: id, questId: "q1", play: { packageRef: ref, mission: { title: "FORGED" }, reflection: "keep" }, chats: { tutor: [] } };
    await putRunState(userId, state, { resolvePackage });
    assert.equal(snapshot.play.mission.runWorld, undefined);
    assert.equal(snapshot.play.runWorld, undefined);
    assert.deepEqual(snapshot.play.packageRef, ref);
    assert.equal((await getRunState(userId, { resolvePackage })).play.mission.title, "Authoritative");
    await assert.rejects(putRunState("user_other", state, { resolvePackage }), { message: "run_not_owned", status: 403 });
    await assert.rejects(putRunState(userId, { ...state, play: { packageRef: next } }, { resolvePackage }), { message: "package_reference_forbidden" });
    await assert.rejects(getRunState(userId, { resolvePackage: async () => ({ ok: false, code: "subscription_required", status: 402 }) }), { message: "subscription_required", status: 402 });
    const hugeProjection = async (r) => ({ ...await resolvePackage(r), runWorld: { bank: { id: "official", detail: "界".repeat(150_000) } } });
    await assert.rejects(putRunState(userId, state, { resolvePackage: hugeProjection }), { message: "too_large", status: 400 });
    await assert.rejects(getRunState(userId, { resolvePackage: hugeProjection }), { message: "too_large", status: 400 });
    assert.deepEqual(snapshot.play.packageRef, ref);
    const ordinary = { questId: "ordinary", play: { mission: { id: "ordinary", title: "Ordinary" }, reflection: "private" } };
    await putRunState(userId, ordinary);
    assert.equal((await getRunState(userId)).play.mission.title, "Ordinary");
    await assert.rejects(putRunState(userId, { questId: "ordinary", play: { predictionsBank: {} } }), { message: "bank_invalid" });
    assert.equal((await getRunState(userId)).play.reflection, "private");
  } finally {
    await closePool();
    if (previous === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previous;
  }
});

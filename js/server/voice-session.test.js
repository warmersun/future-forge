import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createIdleGuard, createVoiceSessionStore } from "./voice-session.mjs";

describe("voice sessions", () => {
  it("creates, auths, and rejects a bad token", () => {
    let n = 0;
    const store = createVoiceSessionStore({
      maxSessions: 2,
      randomId: () => `id${++n}`,
      randomToken: () => `tok${n}`,
    });
    const r = store.create({ clientSessionId: "c1", context: { year: 2028 } });
    assert.equal(r.ok, true);
    assert.equal(store.auth("id1", "tok1")?.id, "id1");
    assert.equal(store.auth("id1", "nope"), null);
    assert.equal(store.auth("id1", "tok"), null);
  });

  it("stores a requested voice", () => {
    const store = createVoiceSessionStore({
      randomId: () => "id",
      randomToken: () => "tok",
    });
    const r = store.create({ voice: "ara" });
    assert.equal(r.ok, true);
    assert.equal(r.session.voice, "ara");
  });

  it("replaces the previous session for the same client", () => {
    let n = 0;
    const closed = [];
    const store = createVoiceSessionStore({
      maxSessions: 3,
      randomId: () => `id${++n}`,
      randomToken: () => `tok${n}`,
      onClose: (s, reason) => closed.push([s.id, reason]),
    });
    store.create({ clientSessionId: "c1" });
    const b = store.create({ clientSessionId: "c1" });
    assert.equal(b.ok, true);
    assert.equal(b.session.id, "id2");
    assert.equal(store.get("id1"), null);
    assert.equal(store.size(), 1);
    assert.deepEqual(closed[0], ["id1", "replaced"]);
  });

  it("enforces a global cap", () => {
    let n = 0;
    const store = createVoiceSessionStore({
      maxSessions: 1,
      randomId: () => `id${++n}`,
      randomToken: () => `tok${n}`,
    });
    assert.equal(store.create({ clientSessionId: "a" }).ok, true);
    const full = store.create({ clientSessionId: "b" });
    assert.equal(full.ok, false);
    assert.equal(full.status, 429);
    assert.equal(full.error, "voice_busy");
  });

  it("updates context and closes", () => {
    let n = 0;
    const store = createVoiceSessionStore({
      randomId: () => `id${++n}`,
      randomToken: () => `tok${n}`,
    });
    store.create({ clientSessionId: "c1", context: { year: 1 } });
    store.updateContext("id1", { year: 2030 });
    assert.equal(store.get("id1").context.year, 2030);
    assert.equal(store.close("id1", "hangup"), true);
    assert.equal(store.get("id1"), null);
    assert.equal(store.size(), 0);
  });

  it("keeps the bound package world when a context update forges a bank", () => {
    const revision = `sha256:${"ab".repeat(32)}`;
    const release = {
      ok: true,
      trust: "official",
      packageRef: { packageId: "kiln-ferry-test", revision, questId: "kiln-ferry-test" },
      bank: {
        id: "kiln-ferry-bank",
        title: "TEST",
        predictions: [
          {
            id: "due",
            year: 2026,
            kind: "prediction",
            headline: "server row",
            detail: "Invented.",
            claimBand: "frontier",
          },
        ],
      },
      record: {
        id: "kiln-ferry-test",
        predictionBankId: "kiln-ferry-bank",
        mission: {
          id: "kiln-ferry-test",
          startYear: 2026,
          collapseYear: 2034,
          grounding: "server grounding",
        },
      },
    };
    const store = createVoiceSessionStore({
      randomId: () => "id",
      randomToken: () => "tok",
      resolvePackage: () => release,
    });
    const created = store.create({
      context: {
        year: 2026,
        packageRef: release.packageRef,
        grounding: "forged at create",
      },
    });
    assert.equal(created.ok, true);
    assert.equal(created.session.context.grounding, "server grounding");
    const swapped = store.updateContext("id", {
      year: 2028,
      packageRef: { ...release.packageRef, revision: `sha256:${"ff".repeat(32)}` },
    });
    assert.equal(swapped.ok, false);
    assert.equal(swapped.error, "package_reference_forbidden");
    assert.equal(store.get("id").context.year, 2026);
    const updated = store.updateContext("id", {
      year: 2028,
      invention: "a loader",
      packageRef: release.packageRef,
      predictionsBank: { id: "kiln-ferry-bank", predictions: [{ id: "forged", year: 2020 }] },
      grounding: "forged on update",
    });
    assert.equal(updated.context.invention, "a loader");
    assert.equal(updated.context.grounding, "server grounding");
    assert.equal(updated.context.packageRef.revision, revision);
    assert.equal(updated.context.predictionsBank.predictions[0].id, "due");
  });
});

it("async authority pins the run/ref and rechecks current entitlement on every update", async () => {
  const { createQuestRequestAuthority } = await import("./quest-request-authority.mjs");
  const ref = { packageId: "voice", questId: "voice", revision: `sha256:${"aa".repeat(32)}` };
  const runId = "11111111-1111-4111-8111-111111111111";
  let entitled = true;
  let checks = 0;
  let releaseCheck;
  let block = false;
  const identity = { enabled: true, signedIn: true, userId: "user_owner" };
  const authority = createQuestRequestAuthority({
    loadRun: async (uid, id) => uid === identity.userId && id === runId ? { quest_id: "voice", packageRef: ref } : null,
    loadCatalog: async () => ({ ok: true, quests: [{ id: "voice", packageRef: ref }] }),
    resolvePackage: async (requested, opts) => {
      checks++;
      assert.equal(opts.identity.userId, identity.userId);
      if (block) await new Promise((resolve) => { releaseCheck = resolve; });
      return opts.entitled ? { ok: true, packageRef: requested, record: { id: "voice", mission: {
        id: "voice", startYear: 2026, collapseYear: 2034, grounding: "AUTHORED",
      } } } : { ok: false, code: "subscription_required", status: 402 };
    },
  });
  const store = createVoiceSessionStore();
  const created = await store.createAuthorized({ context: { questId: "voice", runId },
    authorizeContext: (body) => authority(body, { identity, entitled }) });
  assert.equal(created.ok, true);
  const session = created.session;
  assert.deepEqual(session.context.packageRef, ref);
  assert.equal(session.context.year, 2026);
  for (const context of [
    { runId: "22222222-2222-4222-8222-222222222222" },
    { cloudRunId: "22222222-2222-4222-8222-222222222222" },
    { questId: "another" },
    { packageRef: { ...ref, revision: `sha256:${"bb".repeat(32)}` } },
  ]) assert.equal((await store.updateAuthorizedContext(session.id, context)).status, 403);
  assert.equal(checks, 1);
  block = true;
  const pending = store.updateAuthorizedContext(session.id, { year: 2028, grounding: "FORGED", inventionHow: "player text" });
  while (!releaseCheck) await new Promise((resolve) => setImmediate(resolve));
  assert.equal(session.context.year, 2026, "unverified context must stay invisible while resolving");
  assert.equal(session.context.grounding, "AUTHORED");
  releaseCheck();
  const updated = await pending;
  assert.equal(updated.context.year, 2028);
  assert.equal(updated.context.inventionHow, "player text");
  assert.equal(updated.context.grounding, "AUTHORED");
  assert.equal(updated.context.runId, runId);
  block = false;
  entitled = false;
  assert.equal((await store.updateAuthorizedContext(session.id, { year: 2029 })).status, 402);
  assert.equal(store.get(session.id), null);
});

it("serializes socket updates with tool/reconnect rechecks without restoring stale player context", async () => {
  const store = createVoiceSessionStore();
  const seen = [];
  let release;
  let block = false;
  const created = await store.createAuthorized({ context: { questId: "voice", year: 2026 },
    authorizeContext: async (body) => {
      seen.push(body.context.year);
      if (block) { block = false; await new Promise(resolve => { release = resolve; }); }
      return { ok: true, body };
    } });
  const { id } = created.session;
  try {
    block = true;
    const first = store.updateAuthorizedContext(id, { year: 2028 });
    while (!release) await new Promise(resolve => setImmediate(resolve));
    const second = store.updateAuthorizedContext(id, { year: 2029 });
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(seen, [2026, 2028], "authority must not execute concurrent session mutations");
    const recheck = store.revalidateAuthorizedContext(id);
    release();
    await Promise.all([first, second, recheck]);
    assert.deepEqual(seen, [2026, 2028, 2029, 2029]);
    assert.equal(store.get(id).context.year, 2029);
  } finally { release?.(); await store.closeAll(); }
});

describe("voice idle guard", () => {
  it("fires once after a quiet stretch and a bump delays it", () => {
    /** @type {{ fn: () => void, at: number, cancelled: boolean }[]} */
    const pending = [];
    let now = 0;
    let fired = 0;
    const idle = createIdleGuard({
      ms: 90,
      onIdle: () => {
        fired += 1;
      },
      schedule: (fn, ms) => {
        const timer = { fn, at: now + ms, cancelled: false };
        pending.push(timer);
        return timer;
      },
      cancel: (timer) => {
        timer.cancelled = true;
      },
    });
    const runDue = () => {
      for (const timer of pending) {
        if (!timer.cancelled && timer.at <= now) timer.fn();
      }
    };
    idle.bump();
    now = 89;
    runDue();
    assert.equal(fired, 0);
    idle.bump();
    now = 179;
    runDue();
    assert.equal(fired, 1);
    idle.stop();
    now = 400;
    runDue();
    assert.equal(fired, 1);
  });
});

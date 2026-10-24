import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { slimMissionForContinue, snapshotForWire, resolvePackageContinueMission } from "./continue.js";
import { parseRunStateBody, RUN_STATE_MAX_BYTES } from "../server/run-state.mjs";
import { prepareRunWorld } from "../sim/run-world.js";
import * as continueModule from "./continue.js";
import fs from "node:fs";

const ref = { packageId: "package-a", questId: "quest-a", revision: `sha256:${"ab".repeat(32)}` };
const bank = {
  schema: "future-forge.predictions/v1", id: "bank-a", title: "Synthetic calendar",
  predictions: [{ id: "test-row", year: 2026, kind: "prediction", claimBand: "now", headline: "Synthetic", detail: "Not a real prediction." }],
};
const legacyTile = JSON.parse(fs.readFileSync(new URL("../../test/fixtures/quests/companion-moonshots-304.json", import.meta.url), "utf8"));
const legacyBank = JSON.parse(fs.readFileSync(new URL("../../test/fixtures/predictions/companion-dock-test.json", import.meta.url), "utf8"));

describe("legacy Continue recovery", () => {
  it("blocks invalid/missing banks and malformed saved companions before applying progress", () => {
    const live = { cloudRunId: "live", year: 2026, hexBoard: { tiles: {} } };
    const malformed = { exploration: { premise: { mode: "assumed", bankId: legacyBank.id } } };
    for (const [companion, predictionsBank] of [
      [legacyTile.companion, undefined], [legacyTile.companion, false],
      [legacyTile.companion, {}], [legacyTile.companion, { ...legacyBank, id: "other" }],
      [legacyTile.companion, { ...legacyBank, predictions: [] }], [malformed, legacyBank],
    ]) {
      const snapshot = { questId: legacyTile.id, runId: "saved", year: 2030, board: { tiles: { saved: {} } },
        play: { mission: { id: legacyTile.id, access: "account", companion }, predictionsBank, reflection: "Preserve me" } };
      const before = structuredClone(snapshot);
      const next = continueModule.applyContinueSnapshot(live, snapshot);
      assert.equal(next.error, "legacy_world_unresolved");
      assert.match(next.message, /preserve|export/i);
      assert.equal(next.cloudRunId, live.cloudRunId);
      assert.equal(next.hexBoard, live.hexBoard);
      assert.equal(next.year, live.year);
      assert.equal(next.skipSeed, false);
      assert.deepEqual(snapshot, before);
    }
  });

  it("preflights the raw saved companion rather than a replacement catalog companion", () => {
    const snapshot = { questId: legacyTile.id, play: { mission: { id: legacyTile.id, access: "account",
      companion: { exploration: { premise: { mode: "assumed", bankId: legacyBank.id } } } }, predictionsBank: legacyBank } };
    const result = continueModule.validateContinueWorld(snapshot, { id: legacyTile.id });
    assert.equal(result.error, "legacy_world_unresolved");
  });

  it("keeps failure markers through browser wire projection and refuses old error codes", () => {
    for (const error of ["saved_bank_missing", "saved_bank_invalid", "bank_invalid", "bank_too_large", "missing_row", "bank_mismatch", "legacy_world_unresolved"]) {
      const snapshot = { questId: "legacy", play: { mission: { id: "legacy", predictionsBankError: error } } };
      const wire = snapshotForWire(snapshot);
      assert.equal(wire.play.mission.predictionsBankError, error);
      const next = continueModule.applyContinueSnapshot({}, wire);
      assert.equal(next.error, "legacy_world_unresolved");
    }
  });

  it("never falls through an explicitly empty saved bank to a second copy", () => {
    const saved = { id: legacyTile.id, access: "account", companion: legacyTile.companion };
    for (const predictionsBank of [null, false, "", {}]) {
      const result = continueModule.validateContinueWorld({ questId: saved.id,
        play: { mission: saved, predictionsBank }, predictionsBank: legacyBank });
      assert.equal(result.error, "legacy_world_unresolved");
    }
    assert.equal(continueModule.validateContinueWorld({ questId: saved.id }, saved).error, "legacy_world_unresolved");
  });

  it("browser Continue stops before catalog refresh/start and leaves the bad snapshot intact", async () => {
    const source = fs.readFileSync(new URL("../game.js", import.meta.url), "utf8");
    const handler = source.slice(source.indexOf("let continueInFlight = false;"), source.indexOf("async function syncCloudPins()"));
    const snapshot = { questId: legacyTile.id, play: { mission: { id: legacyTile.id, access: "account", companion: legacyTile.companion } } };
    const state = { cloudContinue: snapshot, hostedQuestsLoaded: false };
    const messages = [];
    const unexpected = () => { assert.fail("invalid save reached catalog or start"); };
    const run = new Function("state", "$", "flashToast", "validateContinueWorld", "refreshHostedQuests", "resolveContinueMission", "startMission",
      `${handler}; return continueCloudRun;`)(state, () => ({}), (s) => messages.push(s), continueModule.validateContinueWorld, unexpected, unexpected, unexpected);
    await run();
    assert.equal(state.cloudContinue, snapshot);
    assert.match(messages[0], /preserve|export/i);
  });

  it("browser GET failure displays recovery guidance without clearing a cached save", async () => {
    const source = fs.readFileSync(new URL("../game.js", import.meta.url), "utf8");
    const handler = source.slice(source.indexOf("async function maybeOfferContinue()"), source.indexOf("function overlayContinueCompanion("));
    const state = { cloudContinue: { questId: "keep-this-save" } };
    const saved = state.cloudContinue;
    const messages = [];
    const run = new Function("state", "$", "isClerkSignedIn", "apiFetch", "flashToast", "legacyWorldUnresolved",
      `${handler}; return maybeOfferContinue;`)(state, () => ({}), () => true,
      async () => ({ ok: false, status: 409, json: async () => ({ error: "legacy_world_unresolved" }) }),
      (s) => messages.push(s), () => ({ message: "Preserve or export the save for recovery." }));
    await run();
    assert.equal(state.cloudContinue, saved);
    assert.match(messages[0], /preserve|export/i);
  });

  it("restores the exact valid legacy bank and reflection without changing the original", () => {
    const snapshot = { questId: legacyTile.id, play: { mission: { id: legacyTile.id, access: "account", companion: legacyTile.companion },
      predictionsBank: legacyBank, reflection: "My private observation" } };
    const checked = continueModule.validateContinueWorld(snapshot);
    assert.equal(checked.ok, true);
    assert.equal(checked.world.trust, "legacy");
    assert.equal(checked.world.bank.id, legacyBank.id);
    assert.notEqual(checked.world.bank, legacyBank);
    assert.equal(continueModule.applyContinueSnapshot({}, snapshot).play.reflection, "My private observation");
  });
});

function mission(trust = "official") {
  return { id: "quest-a", globalId: "water", title: "Authoritative", source: trust === "official" ? "remote" : "imported",
    predictionBankId: bank.id, packageRef: structuredClone(ref),
    runWorld: { packageRef: structuredClone(ref), bank: structuredClone(bank), trust, questId: "quest-a" } };
}

describe("package Continue wire and restoration", () => {
  it("official snapshots keep both refs and omit bank copies through browser and server", () => {
    const raw = mission();
    raw.runWorld.bank.predictions[0].detail = "x".repeat(RUN_STATE_MAX_BYTES);
    const slim = slimMissionForContinue(raw);
    assert.deepEqual(slim.packageRef, ref);
    assert.equal(slim.predictionBankId, bank.id);
    assert.equal(slim.runWorld, undefined);
    const wire = snapshotForWire({ questId: raw.id, play: { mission: raw, predictionsBank: raw.runWorld.bank } });
    assert.deepEqual(wire.play.packageRef, ref);
    assert.equal(wire.play.predictionsBank, undefined);
    assert.ok(Buffer.byteLength(JSON.stringify(wire)) < 2000);
    const parsed = parseRunStateBody(wire);
    assert.equal(parsed.ok, true);
    assert.deepEqual(parsed.state.play.packageRef, ref);
    assert.deepEqual(parsed.state.play.mission.packageRef, ref);
    assert.equal(parsed.state.play.predictionsBank, undefined);
  });

  it("uses the server-authoritative resolved mission without a current-catalog lookup", async () => {
    const authoritative = mission();
    const snapshot = { questId: ref.questId, packageRef: ref, play: { mission: authoritative } };
    const restored = await resolvePackageContinueMission(snapshot, () => { throw new Error("must not fetch"); });
    assert.equal(restored.title, "Authoritative");
    assert.equal(restored.runWorld.bank.id, bank.id);
    assert.notEqual(restored.runWorld, authoritative.runWorld);
  });

  it("requests the exact revision and never overlays saved mission fields on the response", async () => {
    const stale = { ...slimMissionForContinue(mission()), title: "Tampered saved title", companion: { claim: "Tampered" } };
    const snapshot = { questId: ref.questId, play: { packageRef: ref, mission: stale } };
    let fetched = 0;
    const restored = await resolvePackageContinueMission(snapshot, async (id, exactRef) => {
      fetched++;
      assert.equal(id, ref.questId);
      assert.deepEqual(exactRef, ref);
      return { mission: mission() };
    });
    assert.equal(fetched, 1);
    assert.equal(restored.title, "Authoritative");
    assert.equal(restored.companion, undefined);
    assert.equal(restored.packageRef.revision, ref.revision);
    const wrong = mission();
    wrong.packageRef.revision = `sha256:${"cd".repeat(32)}`;
    assert.equal(await resolvePackageContinueMission(snapshot, async () => ({ mission: wrong })), null);
    assert.equal(await resolvePackageContinueMission(snapshot, async () => null), null);
  });

  it("does not look up malformed saved reference tokens", async () => {
    const snapshot = { questId: ref.questId, play: { packageRef: { ...ref, revision: ` ${ref.revision}` } } };
    assert.equal(await resolvePackageContinueMission(snapshot, () => { throw new Error("must not fetch"); }), null);
  });

  it("keeps local imports local across the actual wire/parser/restore pipeline", async () => {
    const local = mission("local-import");
    const wire = snapshotForWire({ questId: ref.questId, play: { mission: local } });
    assert.equal(wire.play.packageRef, undefined);
    const parsed = parseRunStateBody(wire);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.state.play.packageRef, undefined);
    assert.equal(parsed.state.play.mission.runWorld.trust, "local-import");
    const restored = await resolvePackageContinueMission(parsed.state, () => { throw new Error("must not fetch official release"); });
    assert.equal(restored.source, "imported");
    assert.equal(prepareRunWorld(restored, { restoring: true }).world.trust, "local-import");
  });
});

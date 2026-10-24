import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { bankForRun, createRunWorld, resetRunWorld, prepareRunWorld } from "./run-world.js";

describe("run world", () => {
  it("starts a resolved package without a matching global bank and refuses missing dependencies", () => {
    const bank = {
      schema: "future-forge.predictions/v1", id: "bank-a", title: "Synthetic calendar",
      predictions: [{ id: "test-row", year: 2026, kind: "prediction", claimBand: "now", headline: "Synthetic", detail: "Not a real prediction." }],
    };
    const packageRef = { packageId: "package-a", questId: "quest-a", revision: `sha256:${"ab".repeat(32)}` };
    const mission = {
      id: "quest-a", predictionBankId: bank.id, packageRef,
      runWorld: createRunWorld({ bank, packageRef, questId: "quest-a", trust: "local-import" }),
    };
    const started = prepareRunWorld(mission, { loadedBank: { id: "unrelated" }, year: 2026 });
    assert.equal(started.ok, true);
    assert.equal(started.world.bank.id, "bank-a");
    started.world.bank.predictions[0].year = 2039;
    assert.equal(mission.runWorld.bank.predictions[0].year, 2026);
    const missing = prepareRunWorld({ ...mission, runWorld: { ...mission.runWorld, bank: null } }, { loadedBank: bank });
    assert.equal(missing.ok, false);
    assert.equal(missing.error, "package_dependency_missing");
  });

  it("does not silently restore an assumed legacy run without its saved bank", () => {
    const mission = { id: "legacy", companion: { exploration: { premise: { mode: "assumed", bankId: "legacy-bank" } } } };
    const result = prepareRunWorld(mission, { restoring: true, loadedBank: { id: "legacy-bank" } });
    assert.equal(result.ok, false);
    assert.equal(result.error, "legacy_world_unresolved");
    assert.match(result.message, /preserve|export/i);
  });

  it("uses the bound bank and ignores a leftover mission bank", () => {
    const state = {
      runWorld: createRunWorld({
        packageRef: { packageId: "a", revision: "sha256:" + "ab".repeat(32), questId: "a" },
        bank: { id: "bank-a", predictions: [{ id: "a-row" }] },
        questId: "a",
      }),
      mission: { pinnedPredictionsBank: { id: "bank-b", predictions: [{ id: "b-row" }] } },
      pinnedPredictionsBank: { id: "bank-c", predictions: [{ id: "c-row" }] },
    };
    assert.equal(bankForRun(state).predictions[0].id, "a-row");
  });

  it("clears private reflection and both banks on a mode change", () => {
    const state = {
      runWorld: createRunWorld({ bank: { id: "old", predictions: [] } }),
      pinnedPredictionsBank: { id: "old" },
      mission: {
        pinnedPredictionsBank: { id: "old" },
        reflection: "private note",
      },
    };
    resetRunWorld(state);
    assert.equal(state.runWorld.bank, null);
    assert.equal(state.pinnedPredictionsBank, null);
    assert.equal(state.mission.pinnedPredictionsBank, undefined);
    assert.equal(state.mission.reflection, undefined);
    assert.equal(bankForRun(state), null);
  });
});

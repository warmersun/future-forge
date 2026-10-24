import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeMission } from "./mission-normalize.js";
import { createRunWorld, prepareRunWorld } from "./sim/run-world.js";

const bank = {
  schema: "future-forge.predictions/v1", id: "bank-a", title: "Synthetic calendar",
  predictions: [{ id: "test-row", year: 2026, kind: "prediction", claimBand: "now", headline: "Synthetic", detail: "Not a real prediction." }],
};
const packageRef = { packageId: "package-a", questId: "quest-a", revision: `sha256:${"ab".repeat(32)}` };
function mission(trust = "official") {
  return { id: "quest-a", globalId: "water", source: trust === "official" ? "remote" : "imported", access: "account", predictionBankId: bank.id, packageRef,
    runWorld: createRunWorld({ bank, packageRef, questId: "quest-a", trust }) };
}

describe("shared browser mission normalization", () => {
  it("survives catalog and selected-start normalization with an unrelated ambient bank", () => {
    const raw = mission();
    const catalog = normalizeMission(raw, "water");
    const selected = normalizeMission(catalog, catalog.globalId);
    const started = prepareRunWorld(selected, { loadedBank: { id: "unrelated" }, year: 2026 });
    assert.equal(started.ok, true);
    assert.equal(started.world.bank.id, bank.id);
    assert.deepEqual(selected.packageRef, packageRef);
    assert.deepEqual(selected.runWorld.packageRef, packageRef);
    assert.equal(selected.predictionBankId, bank.id);
    assert.equal(selected.access, "account");
    selected.runWorld.bank.predictions[0].year = 2040;
    selected.packageRef.packageId = "mutated";
    assert.equal(raw.runWorld.bank.predictions[0].year, 2026);
    assert.equal(catalog.runWorld.bank.predictions[0].year, 2026);
    assert.equal(raw.packageRef.packageId, "package-a");
  });

  it("deep-clones a valid legacy run world without promoting it", () => {
    const raw = { id: "legacy", runWorld: createRunWorld({ bank, questId: "legacy", trust: "legacy" }) };
    const normalized = normalizeMission(raw, "water");
    assert.equal(normalized.runWorld.bank.id, bank.id);
    assert.equal(normalized.runWorld.trust, "legacy");
    normalized.runWorld.bank.predictions[0].year = 2040;
    assert.equal(raw.runWorld.bank.predictions[0].year, 2026);
  });

  it("does not promote an imported package to official", () => {
    const normalized = normalizeMission(mission("local-import"), "water");
    const restored = prepareRunWorld(normalized, { restoring: true, loadedBank: { id: "other" } });
    assert.equal(normalized.source, "imported");
    assert.equal(restored.ok, true);
    assert.equal(restored.world.trust, "local-import");
  });

  it("retains literal malformed refs but rejects their world instead of downgrading to legacy", () => {
    const raw = mission();
    raw.packageRef = { ...packageRef, revision: ` ${packageRef.revision}` };
    const normalized = normalizeMission(raw, "water");
    assert.deepEqual(normalized.packageRef, raw.packageRef);
    assert.equal(normalized.runWorld, undefined);
    assert.equal(prepareRunWorld(normalized, { loadedBank: bank }).ok, false);
  });

  it("does not retain invalid or mismatched packaged banks", () => {
    for (const badBank of [null, { id: "wrong", predictions: [] }, { ...bank, id: "another-bank" }]) {
      const raw = mission();
      raw.runWorld.bank = badBank;
      const normalized = normalizeMission(raw, "water");
      assert.equal(normalized.runWorld, undefined);
      assert.equal(normalized.predictionBankId, bank.id);
      assert.equal(prepareRunWorld(normalized, { loadedBank: bank }).ok, false);
    }
  });
});

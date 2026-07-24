import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeDeployDrop,
  freezeStagedDropPool,
  pilotDropAmount,
  scaleDropAmount,
  newNormalExtraDrop,
  applyStagedDropStep,
  visionStageIdForDeployStage,
} from "./deploy.js";

describe("staged deploy pool", () => {
  it("freezes pool and remaining", () => {
    const f = freezeStagedDropPool(5);
    assert.equal(f.stagedDropPool, 5);
    assert.equal(f.stagedDropRemaining, 5);
    assert.equal(f.dropPilotApplied, 0);
  });

  it("pilot is ceil half, capped by remaining", () => {
    assert.equal(pilotDropAmount(4, 4), 2);
    assert.equal(pilotDropAmount(5, 5), 3);
    assert.equal(pilotDropAmount(3, 3), 2);
    assert.equal(pilotDropAmount(1, 1), 1);
    assert.equal(pilotDropAmount(0, 0), 0);
    assert.equal(pilotDropAmount(5, 1), 1);
  });

  it("scale takes remaining", () => {
    assert.equal(scaleDropAmount(2), 2);
    assert.equal(scaleDropAmount(0), 0);
  });

  it("new normal extra only with will≥4 and pool≥4", () => {
    assert.equal(newNormalExtraDrop(4, 4), 1);
    assert.equal(newNormalExtraDrop(3, 4), 0);
    assert.equal(newNormalExtraDrop(5, 3), 0);
  });

  it("pilot + scale ≤ pool (parity with one deploy)", () => {
    for (const pool of [1, 3, 4, 5, 6, 8]) {
      let f = freezeStagedDropPool(pool);
      const p = applyStagedDropStep("pilot", f);
      assert.equal(p.ok, true);
      f = p.frozen;
      const s = applyStagedDropStep("scale", f);
      assert.equal(s.ok, true);
      assert.equal(p.drop + s.drop, pool);
      assert.equal(s.frozen.stagedDropRemaining, 0);
    }
  });

  it("applies stages in sequence with optional mandate", () => {
    let f = freezeStagedDropPool(4);
    const p = applyStagedDropStep("pilot", f);
    assert.equal(p.drop, 2);
    f = p.frozen;
    const s = applyStagedDropStep("scale", f);
    assert.equal(s.drop, 2);
    f = s.frozen;
    const n = applyStagedDropStep("new_normal", f, { will: 4 });
    assert.equal(n.drop, 1);
    assert.equal(n.parts[0].id, "new_normal_mandate");
  });

  it("maps deploy stage to vision stage", () => {
    assert.equal(visionStageIdForDeployStage("none"), "present");
    assert.equal(visionStageIdForDeployStage("pilot"), "prototype");
    assert.equal(visionStageIdForDeployStage("scale"), "transition");
    assert.equal(visionStageIdForDeployStage("new_normal"), "transformed");
  });

  it("computeDeployDrop still returns positive base", () => {
    const r = computeDeployDrop({
      techs: [{ id: "a", domain: "power" }],
      inventionHow: "x ".repeat(50),
      inventionImpact: "y ".repeat(20),
      challengeVerdict: "pass",
      challengeAnswer: "who pays the fee limit and meter use with a hard cap for the pilot year.",
      domains: ["power"],
      pairs: [],
    });
    assert.ok(r.drop >= 2);
    assert.ok(r.parts.length >= 1);
  });
});

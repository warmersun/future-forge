import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { featuresForPlayMode } from "./play-mode.js";

describe("featuresForPlayMode", () => {
  const base = {
    runReport: true,
    actionPoints: true,
    budgetWill: true,
    scrutinyCombat: true,
    deployStages: true,
    multiplayer: false,
  };

  it("spark profile disables AP, budgetWill, scrutinyCombat, deployStages", () => {
    const f = featuresForPlayMode("spark", base);
    assert.equal(f.actionPoints, false);
    assert.equal(f.budgetWill, false);
    assert.equal(f.scrutinyCombat, false);
    assert.equal(f.deployStages, false);
    assert.equal(f.runReport, true);
    assert.equal(f.sparkPath, true);
    assert.equal(f.starterTechOnly, true);
    assert.equal(f.singleStoryFace, true);
    assert.equal(f.stackCap, 3);
  });

  it("workshop keeps actionPoints: true when base has it true", () => {
    const f = featuresForPlayMode("workshop", base);
    assert.equal(f.actionPoints, true);
    assert.equal(f.budgetWill, true);
    assert.equal(f.scrutinyCombat, true);
    assert.equal(f.deployStages, true);
    assert.equal(f.sparkPath, false);
    assert.equal(f.starterTechOnly, false);
    assert.equal(f.singleStoryFace, false);
    assert.equal(f.stackCap, 6);
  });
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { featuresForPlayMode, forgetLegacySparkKey, LEGACY_SPARK_KEY } from "./play-mode.js";

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    },
  };
}

describe("featuresForPlayMode", () => {
  const base = {
    runReport: true,
    actionPoints: true,
    budgetWill: true,
    scrutinyCombat: true,
    deployStages: true,
    multiplayer: false,
  };

  it("returns the single Workshop profile for any mode string", () => {
    for (const mode of ["spark", "workshop", "anything"]) {
      const f = featuresForPlayMode(mode, base);
      assert.equal(f.actionPoints, true);
      assert.equal(f.budgetWill, true);
      assert.equal(f.scrutinyCombat, true);
      assert.equal(f.deployStages, true);
      assert.equal(f.sparkPath, false);
      assert.equal(f.starterTechOnly, false);
      assert.equal(f.singleStoryFace, false);
      assert.equal(f.stackCap, 6);
    }
  });
});

describe("forgetLegacySparkKey", () => {
  it("removes the retired tutorial flag", () => {
    const s = memoryStorage({ [LEGACY_SPARK_KEY]: "1", other: "x" });
    forgetLegacySparkKey(s);
    assert.equal(s.getItem(LEGACY_SPARK_KEY), null);
    assert.equal(s.getItem("other"), "x");
  });

  it("tolerates a missing storage", () => {
    assert.doesNotThrow(() => forgetLegacySparkKey(null));
  });
});

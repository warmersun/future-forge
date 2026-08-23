import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  featuresForPlayMode,
  readHasCompletedSpark,
  markSparkCompleted,
  resetSparkProgress,
  shouldShowWorkshopUnlock,
  HAS_COMPLETED_SPARK_KEY,
} from "./play-mode.js";

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

  it("always returns workshop profile (spark retired)", () => {
    const f = featuresForPlayMode("spark", base);
    assert.equal(f.actionPoints, true);
    assert.equal(f.sparkPath, false);
    assert.equal(f.stackCap, 6);
    assert.equal(f.singleStoryFace, false);
  });

  it("workshop keeps full systems", () => {
    const f = featuresForPlayMode("workshop", base);
    assert.equal(f.actionPoints, true);
    assert.equal(f.budgetWill, true);
    assert.equal(f.scrutinyCombat, true);
    assert.equal(f.deployStages, true);
    assert.equal(f.sparkPath, false);
    assert.equal(f.stackCap, 6);
  });
});

describe("spark completion storage", () => {
  it("mark / reset still work for legacy key", () => {
    const s = memoryStorage();
    markSparkCompleted(s);
    assert.equal(s.getItem(HAS_COMPLETED_SPARK_KEY), "1");
    resetSparkProgress(s);
    assert.equal(s.getItem(HAS_COMPLETED_SPARK_KEY), null);
  });

  it("shouldShowWorkshopUnlock is always false", () => {
    assert.equal(shouldShowWorkshopUnlock(), false);
  });

  it("readHasCompletedSpark returns true (tutorial retired)", () => {
    assert.equal(readHasCompletedSpark(memoryStorage()), true);
  });
});

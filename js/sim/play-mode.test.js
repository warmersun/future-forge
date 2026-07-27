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

  it("spark profile disables heavy systems", () => {
    const f = featuresForPlayMode("spark", base);
    assert.equal(f.actionPoints, false);
    assert.equal(f.budgetWill, false);
    assert.equal(f.scrutinyCombat, false);
    assert.equal(f.deployStages, false);
    assert.equal(f.starterTechOnly, true);
    assert.equal(f.stackCap, 3);
  });

  it("workshop keeps full defaults from base", () => {
    const f = featuresForPlayMode("workshop", base);
    assert.equal(f.actionPoints, true);
    assert.equal(f.budgetWill, true);
    assert.equal(f.scrutinyCombat, true);
    assert.equal(f.deployStages, true);
    assert.equal(f.starterTechOnly, false);
    assert.equal(f.stackCap, 6);
  });
});

describe("tutorial completion storage", () => {
  it("new player has not completed tutorial", () => {
    const store = memoryStorage();
    assert.equal(readHasCompletedSpark(store), false);
  });

  it("markSparkCompleted sets flag; reset clears it", () => {
    const store = memoryStorage();
    markSparkCompleted(store);
    assert.equal(readHasCompletedSpark(store), true);
    assert.equal(store.getItem(HAS_COMPLETED_SPARK_KEY), "1");
    resetSparkProgress(store);
    assert.equal(readHasCompletedSpark(store), false);
  });
});

describe("shouldShowWorkshopUnlock", () => {
  it("true only for solo tutorial win", () => {
    assert.equal(
      shouldShowWorkshopUnlock({ kind: "win", multiparty: false, tutorialGraduation: true }),
      true
    );
  });

  it("false for partial, collapse, multiparty, or non-tutorial win", () => {
    assert.equal(
      shouldShowWorkshopUnlock({ kind: "partial", multiparty: false, tutorialGraduation: true }),
      false
    );
    assert.equal(
      shouldShowWorkshopUnlock({ kind: "collapse", multiparty: false, tutorialGraduation: true }),
      false
    );
    assert.equal(
      shouldShowWorkshopUnlock({ kind: "win", multiparty: true, tutorialGraduation: true }),
      false
    );
    assert.equal(
      shouldShowWorkshopUnlock({ kind: "win", multiparty: false, tutorialGraduation: false }),
      false
    );
  });
});

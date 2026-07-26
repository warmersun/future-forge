import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolvePlayMode,
  featuresForPlayMode,
  readPlayMode,
  writePlayMode,
  readHasCompletedSpark,
  markSparkCompleted,
  resetSparkProgress,
  canSelectWorkshop,
  PLAY_MODE_KEY,
  HAS_COMPLETED_SPARK_KEY,
} from "./play-mode.js";

/** Minimal localStorage-compatible store for Node tests */
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

describe("resolvePlayMode", () => {
  it("brand-new player → spark", () => {
    assert.equal(resolvePlayMode({}), "spark");
    assert.equal(resolvePlayMode({ storedMode: null, hasCompletedSpark: false }), "spark");
  });

  it("tutorial not complete → spark even if stored workshop", () => {
    assert.equal(
      resolvePlayMode({ storedMode: "workshop", hasCompletedSpark: false }),
      "spark"
    );
  });

  it("hasCompletedSpark with no stored mode → workshop", () => {
    assert.equal(resolvePlayMode({ hasCompletedSpark: true }), "workshop");
  });

  it("after complete, stored spark is respected", () => {
    assert.equal(
      resolvePlayMode({ storedMode: "spark", hasCompletedSpark: true }),
      "spark"
    );
  });

  it("after complete, stored workshop is respected", () => {
    assert.equal(
      resolvePlayMode({ storedMode: "workshop", hasCompletedSpark: true }),
      "workshop"
    );
  });

  it('forceMode: "spark" wins over completed', () => {
    assert.equal(
      resolvePlayMode({
        forceMode: "spark",
        hasCompletedSpark: true,
        storedMode: "workshop",
      }),
      "spark"
    );
  });

  it('forceMode: "workshop" wins even when not completed', () => {
    assert.equal(
      resolvePlayMode({ forceMode: "workshop", hasCompletedSpark: false }),
      "workshop"
    );
  });

  it("invalid storedMode after complete falls to workshop", () => {
    assert.equal(
      resolvePlayMode({ storedMode: "nope", hasCompletedSpark: true }),
      "workshop"
    );
  });
});

describe("canSelectWorkshop", () => {
  it("false for new player; true after mark complete", () => {
    const store = memoryStorage();
    assert.equal(canSelectWorkshop(store), false);
    markSparkCompleted(store);
    assert.equal(canSelectWorkshop(store), true);
  });
});

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

describe("play-mode storage", () => {
  it("read/write play mode", () => {
    const store = memoryStorage();
    assert.equal(readPlayMode(store), null);
    writePlayMode("spark", store);
    assert.equal(readPlayMode(store), "spark");
    writePlayMode("workshop", store);
    assert.equal(readPlayMode(store), "workshop");
    assert.equal(store.getItem(PLAY_MODE_KEY), "workshop");
  });

  it("markSparkCompleted sets flag and prefer workshop mode", () => {
    const store = memoryStorage();
    assert.equal(readHasCompletedSpark(store), false);
    markSparkCompleted(store);
    assert.equal(readHasCompletedSpark(store), true);
    assert.equal(store.getItem(HAS_COMPLETED_SPARK_KEY), "1");
    assert.equal(readPlayMode(store), "workshop");
    assert.equal(canSelectWorkshop(store), true);
    assert.equal(
      resolvePlayMode({
        storedMode: readPlayMode(store),
        hasCompletedSpark: readHasCompletedSpark(store),
      }),
      "workshop"
    );
  });

  it("resetSparkProgress clears graduation and forces spark; workshop locked", () => {
    const store = memoryStorage();
    markSparkCompleted(store);
    assert.equal(readHasCompletedSpark(store), true);
    assert.equal(readPlayMode(store), "workshop");
    resetSparkProgress(store);
    assert.equal(readHasCompletedSpark(store), false);
    assert.equal(readPlayMode(store), "spark");
    assert.equal(canSelectWorkshop(store), false);
    assert.equal(
      resolvePlayMode({
        storedMode: readPlayMode(store),
        hasCompletedSpark: readHasCompletedSpark(store),
      }),
      "spark"
    );
  });
});

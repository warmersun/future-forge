/*
Copyright © 2026 Warmer Sun Education, a sole proprietorship by Tamas Simon

This file is part of Future Forge.

Future Forge is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Future Forge is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Future Forge. If not, see <https://www.gnu.org/licenses/>.
*/

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

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
import { legacyWalletCaps, readSyncRdCount } from "./economy.js";

describe("legacy Continue caps", () => {
  const techById = (id) => (id ? { id, readyYear: 2026 } : null);

  it("counts paid techs and R&D, and leaves collector ids free", () => {
    const caps = legacyWalletCaps({
      budget: 4,
      will: 3,
      baseBudgetCap: 5,
      baseWillCap: 3,
      selectedTechIds: ["solar", "iot", "drones"],
      freeTechIds: ["drones"],
      rdCount: 1,
      techById,
      maxBudget: 10,
      maxWill: 5,
    });
    assert.equal(caps.used.budget, 3);
    assert.equal(caps.used.will, 0);
    assert.equal(caps.budgetCap, 7);
    assert.equal(caps.willCap, 3);
  });
});

describe("readSyncRdCount", () => {
  it("prefers rdCount and still accepts the workshop count field", () => {
    assert.equal(readSyncRdCount({ count: 1 }), 1);
    assert.equal(readSyncRdCount({ rdCount: 2, count: 0 }), 2);
    assert.equal(readSyncRdCount({}), 0);
    assert.equal(readSyncRdCount(null), 0);
  });
});

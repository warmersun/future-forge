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
import { sanitizePinList, MAX_CLOUD_PINS } from "./pins.mjs";

describe("sanitizePinList", () => {
  it("caps at 3 and drops junk", () => {
    const pins = sanitizePinList([
      { missionId: "a", globalId: "g" },
      { missionId: "a", globalId: "g" },
      { missionId: "b", globalId: "g" },
      { missionId: "c", globalId: "g" },
      { missionId: "d", globalId: "g" },
      { missionId: "bad id" },
    ]);
    assert.equal(pins.length, MAX_CLOUD_PINS);
    assert.deepEqual(
      pins.map((p) => p.missionId),
      ["a", "b", "c"]
    );
  });

  it("drops oversized snapshots", () => {
    const huge = { missionId: "x", globalId: "g", missionSnapshot: { w: "y".repeat(9000) } };
    assert.equal(sanitizePinList([huge])[0].missionSnapshot, null);
  });
});

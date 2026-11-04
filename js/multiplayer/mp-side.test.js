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
import { mpVisionStageId } from "./mp-side.js";

describe("mpVisionStageId", () => {
  it("maps multiplayer deploy stages to vision stages", () => {
    assert.equal(mpVisionStageId("none", 0), "present");
    assert.equal(mpVisionStageId("none", 2), "prototype");
    assert.equal(mpVisionStageId("pilot_ok", 1), "prototype");
    assert.equal(mpVisionStageId("scaled", 3), "transformed");
  });
});

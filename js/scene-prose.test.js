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
import { assertSceneReadable } from "./scene-prose.js";

describe("assertSceneReadable", () => {
  it("accepts spoken mid-length story craft", () => {
    const scene =
      "Nurse Amina seals another swab under the corrugated awning. The fever sheet on the fridge does not match, and the lab truck already left at dawn. Answers take days. By then the queue has moved on, or the ward is full.";
    const r = assertSceneReadable(scene);
    assert.equal(r.ok, true, r.reasons.join(","));
  });

  it("flags a Who-designs riddle close", () => {
    const scene =
      "Dr. Ramirez presses two fingers into the motorcycle rider's tight belly. The screen says discharge. The override button sits gray. A nurse waits with transfer papers. Who designs a trauma score a surgeon can still outrun?";
    const r = assertSceneReadable(scene);
    assert.equal(r.ok, false);
    assert.ok(r.reasons.includes("riddle_close"));
  });

  it("flags telegram punch stacks", () => {
    const scene =
      "Night holds the heat. Cots fill. Fans stop. Grid dies. Fever spikes. Backup fails. Who designs power for the hour a life arrives?";
    const r = assertSceneReadable(scene);
    assert.equal(r.ok, false);
    assert.ok(
      r.reasons.includes("too_many_punch_lines") || r.reasons.includes("riddle_close")
    );
  });
});

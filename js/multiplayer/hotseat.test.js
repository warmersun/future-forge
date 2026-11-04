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
import {
  createHotseatSession,
  setHotseatQuest,
  startHotseatQuest,
  hotseatApplyAction,
  activeSeat,
  serializeHotseat,
  deserializeHotseat,
} from "./hotseat.js";

const mission = {
  id: "hotseat-floods",
  title: "Hotseat floods",
  place: "Portside",
  globalId: "climate",
  startYear: 2026,
  yearsPerTurn: 2,
  collapseYear: 2036,
  pressure: { Floods: 2, Livelihoods: 2, Trust: 1 },
  pressureRise: { Floods: 1, Livelihoods: 1, Trust: 0 },
  winMax: { Floods: 0, Livelihoods: 1, Trust: 1 },
  suggested: ["solar", "iot"],
};

describe("hotseat (mp-session)", () => {
  it("creates seats and rotates via end_turn", () => {
    let s = createHotseatSession(["Alex", "Bea", "Cara"]);
    assert.equal(s.seats.length, 3);
    s = setHotseatQuest(s, mission, "climate");
    s = startHotseatQuest(s).session;
    assert.equal(activeSeat(s).displayName, "Alex");
    s = hotseatApplyAction(s, {
      type: "buffer_write",
      payload: { field: "inventionName", value: "A" },
    }).session;
    s = hotseatApplyAction(s, { type: "end_turn" }).session;
    assert.equal(activeSeat(s).displayName, "Bea");
  });

  it("personal invents — not shared invention", () => {
    let s = createHotseatSession(["Alex", "Bea"]);
    s = setHotseatQuest(s, mission, "climate");
    s = startHotseatQuest(s).session;
    s = hotseatApplyAction(s, {
      type: "buffer_write",
      payload: { field: "inventionName", value: "AlexThing" },
    }).session;
    assert.equal(s.invents["seat-0"].inventionName, "AlexThing");
    assert.equal(s.invents["seat-1"].inventionName, "");
    const denied = hotseatApplyAction(
      s,
      { type: "buffer_write", payload: { field: "inventionName", value: "Hack" } },
      "seat-1"
    );
    assert.equal(denied.ok, false);
  });

  it("serializes invents + place", () => {
    let s = createHotseatSession(["A", "B"]);
    s = setHotseatQuest(s, mission, "climate");
    s = startHotseatQuest(s).session;
    s = hotseatApplyAction(s, {
      type: "buffer_write",
      payload: { field: "inventionName", value: "X" },
    }).session;
    const raw = serializeHotseat(s);
    const restored = deserializeHotseat(raw);
    assert.equal(restored.invents["seat-0"].inventionName, "X");
    assert.equal(restored.place.year, 2026);
  });
});

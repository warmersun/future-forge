import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createHotseatSession,
  setHotseatMission,
  startHotseatMission,
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
    s = setHotseatMission(s, mission, "climate");
    s = startHotseatMission(s).session;
    assert.equal(activeSeat(s).displayName, "Alex");
    s = hotseatApplyAction(s, {
      type: "buffer_write",
      payload: { field: "inventionName", value: "A" },
    }).session;
    s = hotseatApplyAction(s, { type: "end_turn" }).session;
    assert.equal(activeSeat(s).displayName, "Bea");
  });

  it("personal forges — not shared invention", () => {
    let s = createHotseatSession(["Alex", "Bea"]);
    s = setHotseatMission(s, mission, "climate");
    s = startHotseatMission(s).session;
    s = hotseatApplyAction(s, {
      type: "buffer_write",
      payload: { field: "inventionName", value: "AlexThing" },
    }).session;
    assert.equal(s.forges["seat-0"].inventionName, "AlexThing");
    assert.equal(s.forges["seat-1"].inventionName, "");
    const denied = hotseatApplyAction(
      s,
      { type: "buffer_write", payload: { field: "inventionName", value: "Hack" } },
      "seat-1"
    );
    assert.equal(denied.ok, false);
  });

  it("serializes forges + place", () => {
    let s = createHotseatSession(["A", "B"]);
    s = setHotseatMission(s, mission, "climate");
    s = startHotseatMission(s).session;
    s = hotseatApplyAction(s, {
      type: "buffer_write",
      payload: { field: "inventionName", value: "X" },
    }).session;
    const raw = serializeHotseat(s);
    const restored = deserializeHotseat(raw);
    assert.equal(restored.forges["seat-0"].inventionName, "X");
    assert.equal(restored.place.year, 2026);
  });
});

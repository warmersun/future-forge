import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createHotseatSession,
  activeSeat,
  rotateSeat,
  setHotseatMission,
  startHotseatMission,
  hotseatApplyAction,
  serializeHotseat,
  deserializeHotseat,
} from "./hotseat.js";

const mission = {
  id: "hs-m",
  globalId: "climate",
  title: "Hotseat floods",
  place: "Hot Port",
  startYear: 2026,
  collapseYear: 2034,
  yearsPerTurn: 2,
  pressure: { Floods: 2, Trust: 1 },
  pressureRise: { Floods: 1, Trust: 0 },
  winMax: { Floods: 1, Trust: 1 },
  scene: "Test",
  stakeholder: "A",
  suggested: ["ai", "iot"],
  visionTheme: "coastal-city",
};

describe("hotseat", () => {
  it("creates seats and rotates active seat", () => {
    let s = createHotseatSession(["Alex", "Bea", "Cara"]);
    assert.equal(s.seats.length, 3);
    assert.equal(activeSeat(s).displayName, "Alex");
    s = rotateSeat(s, 1);
    assert.equal(activeSeat(s).displayName, "Bea");
    s = rotateSeat(s, 1);
    assert.equal(activeSeat(s).displayName, "Cara");
    s = rotateSeat(s, 1);
    assert.equal(activeSeat(s).displayName, "Alex");
  });

  it("starts mission and only active seat may act", () => {
    let s = createHotseatSession(["Alex", "Bea"]);
    s = setHotseatMission(s, mission, "climate");
    const started = startHotseatMission(s);
    assert.equal(started.ok, true);
    s = started.session;
    assert.ok(s.sim);
    assert.equal(s.simVersion, 1);

    const seat0 = s.seats[0].id;
    const seat1 = s.seats[1].id;
    const add = hotseatApplyAction(
      s,
      {
        type: "select_tech",
        payload: { techId: "ai", tech: { id: "ai", curve: "mature", readyYear: 2026 } },
      },
      seat0
    );
    assert.equal(add.ok, true);
    s = add.session;
    assert.ok(s.sim.selectedTechIds.includes("ai"));

    // Bea tries while Alex is active → rejected
    const denied = hotseatApplyAction(
      s,
      {
        type: "select_tech",
        payload: { techId: "iot", tech: { id: "iot", curve: "mature", readyYear: 2026 } },
      },
      seat1
    );
    assert.equal(denied.ok, false);
    assert.equal(denied.error, "not_active_seat");
    assert.ok(!denied.session.sim.selectedTechIds.includes("iot"));

    s = rotateSeat(s, 1);
    const beaAdd = hotseatApplyAction(
      s,
      {
        type: "select_tech",
        payload: { techId: "iot", tech: { id: "iot", curve: "mature", readyYear: 2026 } },
      },
      seat1
    );
    assert.equal(beaAdd.ok, true);
    assert.ok(beaAdd.session.sim.selectedTechIds.includes("iot"));
    // shared invention persists
    assert.ok(beaAdd.session.sim.selectedTechIds.includes("ai"));
  });

  it("serializes and restores shared sim across rotate", () => {
    let s = createHotseatSession(["A", "B"]);
    s = setHotseatMission(s, mission, "climate");
    s = startHotseatMission(s).session;
    s = hotseatApplyAction(s, {
      type: "buffer_write",
      payload: { field: "inventionName", value: "Shared Gate" },
    }).session;
    s = rotateSeat(s, 1);
    const raw = serializeHotseat(s);
    const restored = deserializeHotseat(raw);
    assert.equal(restored.sim.inventionName, "Shared Gate");
    assert.equal(activeSeat(restored).displayName, "B");
  });
});

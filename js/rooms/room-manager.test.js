import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { RoomManager, randomRoomCode } from "./room-manager.mjs";

const sampleMission = {
  id: "test-mission",
  globalId: "climate",
  title: "Test floods",
  place: "Test Port",
  startYear: 2026,
  collapseYear: 2034,
  yearsPerTurn: 2,
  pressure: { Floods: 2, Trust: 1 },
  pressureRise: { Floods: 1, Trust: 0 },
  winMax: { Floods: 1, Trust: 1 },
  scene: "A test place floods.",
  stakeholder: "Tester",
  suggested: ["ai", "iot"],
  visionTheme: "coastal-city",
};

describe("RoomManager", () => {
  it("creates room with host tokens", () => {
    const rm = new RoomManager();
    const r = rm.createRoom({ displayName: "Alex" });
    assert.equal(r.ok, true);
    assert.equal(r.code.length, 6);
    assert.ok(r.hostToken.length >= 32);
    assert.ok(r.playerToken.length >= 32);
    assert.equal(r.snapshot.you.displayName, "Alex");
    assert.equal(r.snapshot.you.isHost, true);
    assert.equal(r.snapshot.phase, "lobby");
  });

  it("joins second player", () => {
    const rm = new RoomManager();
    const created = rm.createRoom({ displayName: "Host" });
    const joined = rm.joinRoom(created.code, { displayName: "Bea" });
    assert.equal(joined.ok, true);
    assert.equal(joined.rejoined, false);
    assert.equal(joined.snapshot.players.length, 2);
  });

  it("rejects duplicate connected name", () => {
    const rm = new RoomManager();
    const created = rm.createRoom({ displayName: "Host" });
    // mark host connected
    const room = rm.rooms.get(created.code);
    room.players[0].connected = true;
    const j = rm.joinRoom(created.code, { displayName: "Host" });
    assert.equal(j.ok, false);
    assert.equal(j.error, "name_in_use");
  });

  it("starts mission and applies select_tech", () => {
    const rm = new RoomManager();
    const created = rm.createRoom({ displayName: "Host" });
    const room = rm.rooms.get(created.code);
    const host = room.players[0];
    const set = rm.hostCommand(room, host, "set_mission", {
      hostToken: created.hostToken,
      mission: sampleMission,
      globalId: "climate",
    });
    assert.equal(set.ok, true);
    const start = rm.hostCommand(room, host, "start_mission", {
      hostToken: created.hostToken,
    });
    assert.equal(start.ok, true);
    assert.ok(room.sim);
    assert.equal(room.simVersion, 1);

    const act = rm.applyPlayerAction(room, host, {
      type: "select_tech",
      payload: { techId: "ai", tech: { id: "ai", curve: "mature", readyYear: 2026 } },
    });
    assert.equal(act.ok, true);
    assert.ok(room.sim.selectedTechIds.includes("ai"));
    assert.equal(room.simVersion, 2);
  });

  it("room codes use crockford alphabet", () => {
    for (let i = 0; i < 20; i++) {
      const c = randomRoomCode(6);
      assert.match(c, /^[0-9A-HJKMNP-TV-Z]{6}$/);
    }
  });
});

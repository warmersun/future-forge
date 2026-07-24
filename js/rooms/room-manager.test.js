import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { RoomManager, randomRoomCode } from "./room-manager.mjs";
import { TECHS } from "../data.js";

const T0 = TECHS[0]?.id || "solar";

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

function twoPlayerRoom() {
  const rm = new RoomManager();
  const created = rm.createRoom({ displayName: "Host" });
  const room = rm.rooms.get(created.code);
  room.players[0].connected = true;
  const joined = rm.joinRoom(created.code, { displayName: "Bea" });
  assert.equal(joined.ok, true);
  return { rm, created, room, host: room.players[0], bea: room.players[1] };
}

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
    const room = rm.rooms.get(created.code);
    room.players[0].connected = true;
    const j = rm.joinRoom(created.code, { displayName: "Host" });
    assert.equal(j.ok, false);
    assert.equal(j.error, "name_in_use");
  });

  it("requires 2 players to start and builds personal forges", () => {
    const rm = new RoomManager();
    const created = rm.createRoom({ displayName: "Host" });
    const room = rm.rooms.get(created.code);
    const host = room.players[0];
    const alone = rm.hostCommand(room, host, "start_mission", {
      hostToken: created.hostToken,
      mission: sampleMission,
      globalId: "climate",
    });
    assert.equal(alone.ok, false);
    assert.equal(alone.error, "min_players");

    rm.joinRoom(created.code, { displayName: "Bea" });
    const start = rm.hostCommand(room, host, "start_mission", {
      hostToken: created.hostToken,
      mission: sampleMission,
      globalId: "climate",
    });
    assert.equal(start.ok, true);
    assert.ok(room.mp);
    assert.ok(room.mp.forges[host.id]);
    assert.ok(room.mp.place);
    assert.equal(room.mp.seats.length, 2);
  });

  it("starts mission and active seat can select_tech on own forge", () => {
    const { rm, created, room, host, bea } = twoPlayerRoom();
    const start = rm.hostCommand(room, host, "start_mission", {
      hostToken: created.hostToken,
      mission: sampleMission,
      globalId: "climate",
    });
    assert.equal(start.ok, true);

    const act = rm.applyPlayerAction(room, host, {
      type: "select_tech",
      payload: { techId: T0 },
    });
    assert.equal(act.ok, true);
    assert.equal(room.mp.forges[host.id].stack[0].techId, T0);
    assert.equal(room.mp.forges[bea.id].stack.length, 0);
  });

  it("non-active seat cannot act", () => {
    const { rm, created, room, host, bea } = twoPlayerRoom();
    rm.hostCommand(room, host, "start_mission", {
      hostToken: created.hostToken,
      mission: sampleMission,
      globalId: "climate",
    });
    const denied = rm.applyPlayerAction(room, bea, {
      type: "buffer_write",
      payload: { field: "inventionName", value: "Nope" },
    });
    assert.equal(denied.ok, false);
    assert.equal(denied.error, "not_active_seat");
  });

  it("bea can layer emTech on host after end_turn", () => {
    const { rm, created, room, host, bea } = twoPlayerRoom();
    rm.hostCommand(room, host, "start_mission", {
      hostToken: created.hostToken,
      mission: sampleMission,
      globalId: "climate",
    });
    rm.applyPlayerAction(room, host, {
      type: "buffer_write",
      payload: { field: "inventionName", value: "HostGate" },
    });
    rm.applyPlayerAction(room, host, { type: "end_turn" });
    const layer = rm.applyPlayerAction(room, bea, {
      type: "layer_tech",
      payload: { techId: T0, targetSeatId: host.id },
    });
    assert.equal(layer.ok, true);
    assert.equal(room.mp.forges[host.id].stack[0].addedBy, bea.id);
    assert.ok(room.mp.forges[bea.id].contributionBudgetSpent >= 1);
  });

  it("room codes use crockford alphabet", () => {
    for (let i = 0; i < 20; i++) {
      const c = randomRoomCode(6);
      assert.match(c, /^[0-9A-HJKMNP-TV-Z]{6}$/);
    }
  });

  it("requestAi only for active seat; refunds on failure", async () => {
    const { rm, created, room, host, bea } = twoPlayerRoom();
    rm.hostCommand(room, host, "start_mission", {
      hostToken: created.hostToken,
      mission: sampleMission,
      globalId: "climate",
    });
    const denied = await rm.requestAi(room, bea, {
      mode: "chat",
      clientActionId: "nope",
      reservedAp: 1,
    });
    assert.equal(denied.ok, false);
    assert.equal(denied.error, "not_active_seat");

    const startAp = room.mp.forges[host.id].ap;
    const pending = await rm.requestAi(room, host, {
      mode: "chat",
      clientActionId: "t1",
      reservedAp: 1,
    });
    assert.equal(pending.ok, true);
    assert.equal(pending.needsHandler, true);
    assert.equal(room.mp.forges[host.id].ap, startAp - 1);
    const done = rm.completeAiJob(room, host, "t1", { ok: false, error: "network" });
    assert.equal(done.type, "ai_result");
    assert.equal(done.ok, false);
    assert.equal(room.mp.forges[host.id].ap, startAp);
  });

  it("requestAi success applies proposals to personal forge", async () => {
    const { rm, created, room, host } = twoPlayerRoom();
    rm.coInventHandler = async () => ({
      message: "Try sensors",
      proposals: { inventionHow: "Sensors close the floodgate with human override." },
      source: "test",
    });
    rm.hostCommand(room, host, "start_mission", {
      hostToken: created.hostToken,
      mission: sampleMission,
      globalId: "climate",
    });
    const r = await rm.requestAi(room, host, {
      mode: "complete-picture",
      clientActionId: "t2",
      reservedAp: 1,
    });
    assert.equal(r.ok, true);
    assert.equal(r.type, "ai_result");
    assert.match(room.mp.forges[host.id].inventionHow, /Sensors/);
  });

  it("over quota rejects without AP spend", async () => {
    const { rm, created, room, host } = twoPlayerRoom();
    rm.hostCommand(room, host, "start_mission", {
      hostToken: created.hostToken,
      mission: sampleMission,
      globalId: "climate",
    });
    const { ROOM_AI_QUOTAS } = await import("../sim/ai_jobs.js");
    for (let i = 0; i < ROOM_AI_QUOTAS.perPlayerPerMin; i++) {
      const p = await rm.requestAi(room, host, {
        mode: "chat",
        clientActionId: `q${i}`,
        reservedAp: 0,
      });
      assert.equal(p.ok, true);
      rm.completeAiJob(room, host, `q${i}`, { ok: true, result: { message: "ok" } });
    }
    const ap = room.mp.forges[host.id].ap;
    const blocked = await rm.requestAi(room, host, {
      mode: "chat",
      clientActionId: "blocked",
      reservedAp: 1,
    });
    assert.equal(blocked.ok, false);
    assert.equal(blocked.error, "player_rate_quota");
    assert.equal(room.mp.forges[host.id].ap, ap);
  });
});

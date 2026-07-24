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

  it("soft lock blocks other player buffer_write", () => {
    const rm = new RoomManager();
    const created = rm.createRoom({ displayName: "Host" });
    const room = rm.rooms.get(created.code);
    const host = room.players[0];
    rm.joinRoom(created.code, { displayName: "Bea" });
    const bea = room.players[1];
    rm.hostCommand(room, host, "start_mission", {
      hostToken: created.hostToken,
      mission: sampleMission,
      globalId: "climate",
    });
    const lock = rm.lockField(room, host, "inventionHow", 30);
    assert.equal(lock.ok, true);
    const denied = rm.applyPlayerAction(room, bea, {
      type: "buffer_write",
      payload: { field: "inventionHow", value: "hijack" },
    });
    assert.equal(denied.ok, false);
    assert.equal(denied.error, "field_locked");
    // expire lock
    room.fieldLocks.get("inventionHow").until = Date.now() - 1;
    const ok = rm.applyPlayerAction(room, bea, {
      type: "buffer_write",
      payload: { field: "inventionHow", value: "ok now" },
    });
    assert.equal(ok.ok, true);
    assert.equal(room.sim.inventionHow, "ok now");
  });

  it("requestAi reserves then completeAiJob refunds on failure", async () => {
    const rm = new RoomManager();
    const created = rm.createRoom({ displayName: "Host" });
    const room = rm.rooms.get(created.code);
    const host = room.players[0];
    rm.hostCommand(room, host, "start_mission", {
      hostToken: created.hostToken,
      mission: sampleMission,
      globalId: "climate",
    });
    const startAp = room.sim.ap;
    const pending = await rm.requestAi(room, host, {
      mode: "chat",
      clientActionId: "t1",
      reservedAp: 1,
    });
    assert.equal(pending.ok, true);
    assert.equal(pending.needsHandler, true);
    assert.equal(room.sim.ap, startAp - 1);
    assert.equal(room.sim.pendingAi.clientActionId, "t1");
    const done = rm.completeAiJob(room, host, "t1", { ok: false, error: "network" });
    assert.equal(done.type, "ai_result");
    assert.equal(done.ok, false);
    assert.equal(done.error, "network");
    assert.equal(room.sim.pendingAi, null);
    assert.equal(room.sim.ap, startAp);
  });

  it("requestAi success applies proposals via completeAiJob", async () => {
    const rm = new RoomManager({
      coInventHandler: async () => ({
        message: "Try sensors",
        proposals: { inventionHow: "Sensors close the floodgate with human override." },
        source: "test",
      }),
    });
    const created = rm.createRoom({ displayName: "Host" });
    const room = rm.rooms.get(created.code);
    const host = room.players[0];
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
    assert.match(room.sim.inventionHow, /Sensors/);
    assert.equal(room.sim.pendingAi, null);
  });

  it("over quota rejects without AP spend", async () => {
    const rm = new RoomManager();
    const created = rm.createRoom({ displayName: "Host" });
    const room = rm.rooms.get(created.code);
    const host = room.players[0];
    rm.hostCommand(room, host, "start_mission", {
      hostToken: created.hostToken,
      mission: sampleMission,
      globalId: "climate",
    });
    // Exhaust per-minute quota with zero-AP jobs completed
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
    const ap = room.sim.ap;
    const blocked = await rm.requestAi(room, host, {
      mode: "chat",
      clientActionId: "blocked",
      reservedAp: 1,
    });
    assert.equal(blocked.ok, false);
    assert.equal(blocked.error, "player_rate_quota");
    assert.equal(room.sim.ap, ap);
  });
});

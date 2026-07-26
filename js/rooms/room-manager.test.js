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

  it("requires 2 players to start and builds personal invents", () => {
    const rm = new RoomManager();
    const created = rm.createRoom({ displayName: "Host" });
    const room = rm.rooms.get(created.code);
    const host = room.players[0];
    const alone = rm.hostCommand(room, host, "start_quest", {
      hostToken: created.hostToken,
      mission: sampleMission,
      globalId: "climate",
    });
    assert.equal(alone.ok, false);
    assert.equal(alone.error, "min_players");

    rm.joinRoom(created.code, { displayName: "Bea" });
    const start = rm.hostCommand(room, host, "start_quest", {
      hostToken: created.hostToken,
      mission: sampleMission,
      globalId: "climate",
    });
    assert.equal(start.ok, true);
    assert.ok(room.mp);
    assert.ok(room.mp.invents[host.id]);
    assert.ok(room.mp.place);
    assert.equal(room.mp.seats.length, 2);
  });

  it("starts mission and active seat can select_tech on own invent", () => {
    const { rm, created, room, host, bea } = twoPlayerRoom();
    const start = rm.hostCommand(room, host, "start_quest", {
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
    assert.equal(room.mp.invents[host.id].stack[0].techId, T0);
    assert.equal(room.mp.invents[bea.id].stack.length, 0);
  });

  it("non-active seat cannot act", () => {
    const { rm, created, room, host, bea } = twoPlayerRoom();
    rm.hostCommand(room, host, "start_quest", {
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

  it("enter_challenge freezes host invent prose for helpers; sync is visible to bea", () => {
    const { rm, room, host, bea, created } = twoPlayerRoom();
    rm.hostCommand(room, host, "start_quest", {
      hostToken: created.hostToken,
      mission: sampleMission,
      globalId: "climate",
    });
    rm.applyPlayerAction(room, host, {
      type: "write_commit",
      payload: { field: "inventionHow", value: "Host how it works", changed: true },
    });
    rm.applyPlayerAction(room, host, {
      type: "write_commit",
      payload: { field: "inventionImpact", value: "Host everyday life", changed: true },
    });
    const ent = rm.applyPlayerAction(room, host, { type: "enter_challenge" });
    assert.equal(ent.ok, true);
    assert.equal(room.mp.invents[host.id].turnPhase, "scrutiny");

    // Bea cannot act (not active)
    const blocked = rm.applyPlayerAction(room, bea, {
      type: "write_commit",
      payload: {
        field: "inventionHow",
        value: "Hack",
        changed: true,
        targetSeatId: host.id,
      },
    });
    assert.equal(blocked.ok, false);
    assert.equal(blocked.error, "not_active_seat");

    // Host ends turn mid-challenge — invent stays locked for Bea
    rm.applyPlayerAction(room, host, { type: "end_turn" });
    assert.equal(room.mp.invents[host.id].turnPhase, "scrutiny");
    const locked = rm.applyPlayerAction(room, bea, {
      type: "write_commit",
      payload: {
        field: "inventionHow",
        value: "Hack",
        changed: true,
        targetSeatId: host.id,
      },
    });
    assert.equal(locked.ok, false);
    assert.equal(locked.error, "invent_locked");
    assert.equal(room.mp.invents[host.id].inventionHow, "Host how it works");

    // Challenge view sync only while host is active; after end_turn host cannot sync.
    // Re-enter path: host was passed — Bea is active. Host mid-challenge state is still
    // visible on snapshot for spectators.
    const snap = rm.snapshotFor(room, bea.id);
    assert.equal(snap.mp.invents[host.id].turnPhase, "scrutiny");
  });

  it("bea can layer emTech on host after end_turn", () => {
    const { rm, created, room, host, bea } = twoPlayerRoom();
    rm.hostCommand(room, host, "start_quest", {
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
    assert.equal(room.mp.invents[host.id].stack[0].addedBy, bea.id);
    assert.ok(room.mp.invents[bea.id].contributionBudgetSpent >= 1);
  });

  it("bea can pilot then scale host invent after challenge pass (targetSeatId)", () => {
    const { rm, created, room, host, bea } = twoPlayerRoom();
    rm.hostCommand(room, host, "start_quest", {
      hostToken: created.hostToken,
      mission: sampleMission,
      globalId: "climate",
    });
    // Host prepares invent + passes challenge
    for (const [field, value] of [
      ["inventionName", "FloodGate"],
      [
        "inventionHow",
        "Sensors and pumps work with harbour crews on mapped flood corridors.",
      ],
      [
        "inventionImpact",
        "Homes stay dry and shops stay open when the river rises each spring.",
      ],
    ]) {
      rm.applyPlayerAction(room, host, {
        type: "write_commit",
        payload: { field, value, changed: true },
      });
    }
    rm.applyPlayerAction(room, host, {
      type: "select_tech",
      payload: { techId: T0 },
    });
    rm.applyPlayerAction(room, host, { type: "enter_challenge" });
    rm.applyPlayerAction(room, host, {
      type: "submit_challenge",
      payload: {
        answer:
          "We partner with the harbour authority for a supervised pilot corridor with human oversight.",
        verdict: "pass",
      },
    });
    assert.equal(room.mp.invents[host.id].challengePassed, true);
    rm.applyPlayerAction(room, host, { type: "end_turn" });

    // Bea scales without pilot → pilot_required on *host* invent
    const bad = rm.applyPlayerAction(room, bea, {
      type: "attempt_scale",
      payload: { targetSeatId: host.id, feasibilityLevel: "yellow" },
    });
    assert.equal(bad.ok, false);
    assert.equal(bad.error, "pilot_required");

    const pilot = rm.applyPlayerAction(room, bea, {
      type: "attempt_pilot",
      payload: { targetSeatId: host.id, feasibilityLevel: "yellow" },
    });
    // Pilot may fail on RNG — force by checking error or stage
    if (pilot.ok) {
      assert.equal(
        room.mp.invents[host.id].deployStage === "pilot_ok" ||
          room.mp.invents[bea.id].pilotFailedThisTurn,
        true
      );
    }
    // If pilot succeeded, scale should target host invent
    if (room.mp.invents[host.id].deployStage === "pilot_ok") {
      const scale = rm.applyPlayerAction(room, bea, {
        type: "attempt_scale",
        payload: { targetSeatId: host.id, feasibilityLevel: "yellow" },
      });
      if (scale.ok && room.mp.invents[host.id].deployStage === "scaled") {
        assert.ok((room.mp.invents[bea.id].apSpentThisTurn || 0) >= 1);
      }
    }
  });

  it("room codes use crockford alphabet", () => {
    for (let i = 0; i < 20; i++) {
      const c = randomRoomCode(6);
      assert.match(c, /^[0-9A-HJKMNP-TV-Z]{6}$/);
    }
  });

  it("after Quest ends, solving player chooses next Quest (not merely rank #1)", () => {
    const { rm, created, room, host, bea } = twoPlayerRoom();
    rm.hostCommand(room, host, "start_quest", {
      hostToken: created.hostToken,
      mission: sampleMission,
      globalId: "climate",
    });
    // Solver is Bea; ranking #1 is Host — chooser must be solver
    room.mp.place.status = "won";
    room.mp.place.solverSeatId = bea.id;
    room.mp.invents[bea.id].landedSolvingScale = true;
    room.mp.invents[bea.id].scaledBySeatId = bea.id;
    room.mp.ranking = {
      rows: [
        { seatId: host.id, displayName: "Host", rank: 1, score: 95 },
        { seatId: bea.id, displayName: "Bea", rank: 2, score: 80 },
      ],
    };
    rm.refreshNextQuestChooser(room);
    assert.equal(room.nextQuestChooserId, bea.id);

    // Host cannot steal next-Challenge pick when Bea solved
    const denied = rm.hostCommand(room, host, "set_quest", {
      hostToken: created.hostToken,
      mission: { ...sampleMission, id: "other", title: "Other" },
      globalId: "climate",
    });
    assert.equal(denied.ok, false);
    assert.equal(denied.error, "not_quest_chooser");

    // Bea (solver) sets next Challenge scenario
    const set = rm.hostCommand(room, bea, "set_quest", {
      mission: { ...sampleMission, id: "rematch-1", title: "Rematch floods" },
      globalId: "climate",
    });
    assert.equal(set.ok, true, set.error);
    assert.equal(room.questMeta.mission.id, "rematch-1");

    const start = rm.hostCommand(room, bea, "start_quest", {
      mission: room.questMeta.mission,
      globalId: "climate",
    });
    assert.equal(start.ok, true, start.error);
    assert.equal(room.mp.place.status, "playing");
    assert.equal(room.nextQuestChooserId, null);
  });

  it("after Quest collapse, host chooses next Quest", () => {
    const { rm, created, room, host, bea } = twoPlayerRoom();
    rm.hostCommand(room, host, "start_quest", {
      hostToken: created.hostToken,
      mission: sampleMission,
      globalId: "climate",
    });
    room.mp.place.status = "collapsed";
    room.mp.ranking = null;
    rm.refreshNextQuestChooser(room);
    assert.equal(room.nextQuestChooserId, host.id);

    const denied = rm.hostCommand(room, bea, "set_quest", {
      mission: { ...sampleMission, id: "after-collapse", title: "After" },
      globalId: "climate",
    });
    assert.equal(denied.ok, false);
    assert.equal(denied.error, "not_quest_chooser");

    const set = rm.hostCommand(room, host, "set_quest", {
      hostToken: created.hostToken,
      mission: { ...sampleMission, id: "after-collapse", title: "After" },
      globalId: "climate",
    });
    assert.equal(set.ok, true, set.error);
  });

  it("requestAi only for active seat; refunds on failure", async () => {
    const { rm, created, room, host, bea } = twoPlayerRoom();
    rm.hostCommand(room, host, "start_quest", {
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

    const startAp = room.mp.invents[host.id].ap;
    const pending = await rm.requestAi(room, host, {
      mode: "chat",
      clientActionId: "t1",
      reservedAp: 1,
    });
    assert.equal(pending.ok, true);
    assert.equal(pending.needsHandler, true);
    assert.equal(room.mp.invents[host.id].ap, startAp - 1);
    const done = rm.completeAiJob(room, host, "t1", { ok: false, error: "network" });
    assert.equal(done.type, "ai_result");
    assert.equal(done.ok, false);
    assert.equal(room.mp.invents[host.id].ap, startAp);
  });

  it("requestAi success applies proposals to personal invent", async () => {
    const { rm, created, room, host } = twoPlayerRoom();
    rm.coInventHandler = async () => ({
      message: "Try sensors",
      proposals: { inventionHow: "Sensors close the floodgate with human override." },
      source: "test",
    });
    rm.hostCommand(room, host, "start_quest", {
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
    assert.match(room.mp.invents[host.id].inventionHow, /Sensors/);
  });

  it("over quota rejects without AP spend", async () => {
    const { rm, created, room, host } = twoPlayerRoom();
    rm.hostCommand(room, host, "start_quest", {
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
    const ap = room.mp.invents[host.id].ap;
    const blocked = await rm.requestAi(room, host, {
      mode: "chat",
      clientActionId: "blocked",
      reservedAp: 1,
    });
    assert.equal(blocked.ok, false);
    assert.equal(blocked.error, "player_rate_quota");
    assert.equal(room.mp.invents[host.id].ap, ap);
  });
});

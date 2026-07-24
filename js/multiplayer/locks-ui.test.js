import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatFieldLockHint, fieldLockLabels, paintFieldLockElements } from "./locks-ui.js";
import { RoomManager } from "../rooms/room-manager.mjs";

/**
 * Simulates the shipped client path: RoomManager broadcasts lock state →
 * snapshot.fieldLocks update → paintFieldLockElements (same helper UI uses).
 */
describe("field lock labels (PR11 path)", () => {
  it("formatFieldLockHint shows editor only while until is future", () => {
    const now = 1_000_000;
    assert.equal(formatFieldLockHint(null, now), "");
    assert.equal(formatFieldLockHint({ displayName: "Alex", until: now - 1 }, now), "");
    assert.equal(
      formatFieldLockHint({ displayName: "Alex", until: now + 5000 }, now),
      "Alex is editing…"
    );
  });

  it("room lock then unlock refreshes labels via paint path", () => {
    const mission = {
      id: "m",
      globalId: "climate",
      title: "T",
      place: "P",
      startYear: 2026,
      collapseYear: 2034,
      yearsPerTurn: 2,
      pressure: { Floods: 2 },
      pressureRise: { Floods: 1 },
      winMax: { Floods: 1 },
      scene: "s",
      stakeholder: "a",
      suggested: ["ai"],
      visionTheme: "coastal-city",
    };
    const rm = new RoomManager();
    const created = rm.createRoom({ displayName: "Alex" });
    const room = rm.rooms.get(created.code);
    const alex = room.players[0];
    rm.joinRoom(created.code, { displayName: "Bea" });
    const bea = room.players[1];
    rm.hostCommand(room, alex, "start_mission", {
      hostToken: created.hostToken,
      mission,
      globalId: "climate",
    });

    // Client snapshot mirror (as RoomClient does on "locks" messages)
    const snapshot = { fieldLocks: {} };
    const els = {
      inventionName: { textContent: "" },
      inventionHow: { textContent: "" },
      inventionImpact: { textContent: "" },
    };

    const locked = rm.lockField(room, alex, "inventionHow", 30);
    assert.equal(locked.ok, true);
    // Server broadcast payload shape
    const locksMsg = { type: "locks", fieldLocks: locked.fieldLocks };
    snapshot.fieldLocks = locksMsg.fieldLocks; // client.js path
    paintFieldLockElements(snapshot.fieldLocks, els);
    assert.equal(els.inventionHow.textContent, "Alex is editing…");
    assert.equal(els.inventionName.textContent, "");

    // Bea blocked while locked
    const denied = rm.applyPlayerAction(room, bea, {
      type: "buffer_write",
      payload: { field: "inventionHow", value: "nope" },
    });
    assert.equal(denied.ok, false);
    assert.equal(denied.error, "field_locked");

    // Owner unlock → empty fieldLocks → labels clear
    const unlocked = rm.unlockField(room, alex, "inventionHow");
    assert.equal(unlocked.ok, true);
    snapshot.fieldLocks = unlocked.fieldLocks;
    paintFieldLockElements(snapshot.fieldLocks, els);
    assert.equal(els.inventionHow.textContent, "");

    // Bea can edit after unlock
    const ok = rm.applyPlayerAction(room, bea, {
      type: "buffer_write",
      payload: { field: "inventionHow", value: "ok" },
    });
    assert.equal(ok.ok, true);
    assert.equal(room.sim.inventionHow, "ok");
  });

  it("fieldLockLabels covers all three story fields", () => {
    const now = Date.now();
    const labels = fieldLockLabels(
      {
        inventionName: { displayName: "A", until: now + 10000 },
        inventionHow: { displayName: "B", until: now + 10000 },
      },
      now
    );
    assert.equal(labels.inventionName, "A is editing…");
    assert.equal(labels.inventionHow, "B is editing…");
    assert.equal(labels.inventionImpact, "");
  });
});

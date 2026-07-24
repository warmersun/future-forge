import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatFieldLockHint,
  fieldLockLabels,
  paintFieldLockElements,
  resolveFieldLock,
} from "./locks-ui.js";
import { RoomManager } from "../rooms/room-manager.mjs";

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

  it("resolves per-player lock keys from room manager", () => {
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
    rm.hostCommand(room, alex, "start_mission", {
      hostToken: created.hostToken,
      mission,
      globalId: "climate",
    });

    const els = {
      inventionName: { textContent: "" },
      inventionHow: { textContent: "" },
      inventionImpact: { textContent: "" },
    };

    const locked = rm.lockField(room, alex, "inventionHow", 30);
    assert.equal(locked.ok, true);
    assert.ok(resolveFieldLock(locked.fieldLocks, "inventionHow"));
    paintFieldLockElements(locked.fieldLocks, els);
    assert.equal(els.inventionHow.textContent, "Alex is editing…");
    assert.equal(els.inventionName.textContent, "");

    // Bea is not active — cannot write (turn gate, not shared field)
    const bea = room.players[1];
    const denied = rm.applyPlayerAction(room, bea, {
      type: "buffer_write",
      payload: { field: "inventionHow", value: "nope" },
    });
    assert.equal(denied.ok, false);
    assert.equal(denied.error, "not_active_seat");

    const unlocked = rm.unlockField(room, alex, "inventionHow");
    assert.equal(unlocked.ok, true);
    paintFieldLockElements(unlocked.fieldLocks, els);
    assert.equal(els.inventionHow.textContent, "");
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

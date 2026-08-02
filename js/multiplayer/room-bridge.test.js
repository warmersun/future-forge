import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createRoomBridge } from "./room-bridge.js";

const mission = {
  id: "t",
  title: "Test",
  place: "Port",
  globalId: "climate",
  startYear: 2026,
  collapseYear: 2036,
  yearsPerTurn: 2,
  pressure: { Floods: 2, Trust: 1 },
  pressureRise: { Floods: 1, Trust: 0 },
  winMax: { Floods: 0, Trust: 1 },
};

function mockClient({ invents, youId = "seat-0", activeId = "seat-0" } = {}) {
  const order = Object.keys(invents);
  return {
    session: { playerId: youId, code: "ABCD" },
    snapshot: {
      you: { id: youId },
      code: "ABCD",
      phase: "playing",
      activeSeatId: activeId,
      place: {
        status: "playing",
        year: 2026,
        turn: 0,
        pressure: { Floods: 2, Trust: 1 },
        mission,
        lastNews: "",
      },
      players: order.map((id) => ({
        id,
        displayName: id,
        connected: true,
      })),
      mp: {
        seatOrder: order,
        activeIndex: Math.max(0, order.indexOf(activeId)),
        activeSeatId: activeId,
        invents,
        place: {
          status: "playing",
          year: 2026,
          turn: 0,
          pressure: { Floods: 2, Trust: 1 },
          mission,
        },
      },
    },
  };
}

function baseInvent(overrides = {}) {
  return {
    displayName: "P",
    inventionName: "",
    inventionHow: "",
    inventionImpact: "",
    stack: [],
    ap: 3,
    apMax: 3,
    budget: 5,
    will: 3,
    apSpentThisTurn: 0,
    writeCommitsThisTurn: 0,
    techAddedThisTurn: {},
    year: 2026,
    waits: 0,
    abandoned: false,
    turnPhase: "act",
    inventPhase: "invent",
    challengePassed: false,
    challengeLocked: false,
    deployStage: "none",
    stagedDropPool: 0,
    ...overrides,
  };
}

describe("room-bridge", () => {
  it("clears stagedDropPool when switching view to invent without a Pilot pool", () => {
    // Regression: hydrate used `view.stagedDropPool || state.stagedDropPool`
    // so viewing another invent kept the previous seat's Pilot pool → wrong Scale drop.
    const b = createRoomBridge();
    b.attach(
      mockClient({
        invents: {
          "seat-0": baseInvent({
            displayName: "Alex",
            challengePassed: true,
            deployStage: "pilot_ok",
            stagedDropPool: 5,
            inventPhase: "scale_ready",
          }),
          "seat-1": baseInvent({
            displayName: "Bea",
            inventPhase: "invent",
            deployStage: "none",
            stagedDropPool: 0,
          }),
        },
      })
    );

    const state = {
      global: { id: "climate" },
      selectedTechIds: [],
      stagedDropPool: 0,
      stagedDropRemaining: 0,
    };

    // View Alex (pilot pool 5)
    assert.equal(b.setViewSeat("seat-0"), true);
    b.hydrateSoloState(state, { global: state.global });
    assert.equal(state.stagedDropPool, 5);
    assert.equal(state.stagedDropRemaining, 5);
    assert.equal(state.deployStage, "pilot");

    // Switch to Bea — must not keep Alex's pool
    assert.equal(b.setViewSeat("seat-1"), true);
    b.hydrateSoloState(state, { global: state.global });
    assert.equal(state.stagedDropPool, 0, "sticky pool from other invent");
    assert.equal(state.stagedDropRemaining, 0);
    assert.equal(state.deployUnlocked, false);
  });

  it("hydrates viewed invent pool even when local state still holds another pool", () => {
    const b = createRoomBridge();
    b.attach(
      mockClient({
        invents: {
          "seat-0": baseInvent({
            challengePassed: true,
            deployStage: "pilot_ok",
            stagedDropPool: 3,
            inventPhase: "scale_ready",
          }),
          "seat-1": baseInvent({
            challengePassed: true,
            deployStage: "pilot_ok",
            stagedDropPool: 2,
            inventPhase: "scale_ready",
          }),
        },
      })
    );
    const state = {
      global: { id: "climate" },
      selectedTechIds: [],
      stagedDropPool: 9, // stale local
      stagedDropRemaining: 9,
    };
    b.setViewSeat("seat-1");
    b.hydrateSoloState(state, { global: state.global });
    assert.equal(state.stagedDropPool, 2);
    assert.equal(state.stagedDropRemaining, 2);
  });
});

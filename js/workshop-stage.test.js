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
  WORKSHOP_STAGES,
  assessmentTabBadgeLevel,
  boardPlayerActivity,
  resolveWorkshopStage,
  shouldHighlightLookAhead,
} from "./workshop-stage.js";

describe("workshop-stage", () => {
  it("moves from crises -> invent -> active on a fresh quest", () => {
    const emptyBoard = {
      tiles: {
        "crisis-local": { id: "crisis-local", kind: "crisis", q: 0, r: 0 },
      },
    };
    assert.equal(
      resolveWorkshopStage({ crisisPending: 3, board: emptyBoard }),
      WORKSHOP_STAGES.crises
    );
    assert.equal(
      resolveWorkshopStage({ crisisPending: 0, board: emptyBoard }),
      WORKSHOP_STAGES.invent
    );

    // Unplaced AI sparks keep the workspace in Stage 1 until a tile is placed or minted.
    const withSparks = {
      tiles: {
        ...emptyBoard.tiles,
        s1: { id: "s1", kind: "invention", origin: "sparks", q: null, r: null },
      },
    };
    assert.deepEqual(boardPlayerActivity(withSparks), {
      total: 1,
      onBoard: 0,
      committed: 0,
    });
    assert.equal(
      resolveWorkshopStage({ crisisPending: 0, board: withSparks }),
      WORKSHOP_STAGES.invent
    );

    // Placing a spark or minting a custom tile unlocks Stage 2.
    const placedSpark = {
      tiles: {
        ...emptyBoard.tiles,
        s1: { id: "s1", kind: "invention", origin: "sparks", q: 1, r: 0 },
      },
    };
    assert.equal(
      resolveWorkshopStage({ crisisPending: 0, board: placedSpark }),
      WORKSHOP_STAGES.active
    );

    const customTray = {
      tiles: {
        ...emptyBoard.tiles,
        c1: { id: "c1", kind: "invention", origin: "custom", q: null, r: null },
      },
    };
    assert.equal(
      resolveWorkshopStage({ crisisPending: 0, board: customTray }),
      WORKSHOP_STAGES.active
    );
  });

  it("bypasses staging for tutorial and restored runs", () => {
    assert.equal(
      resolveWorkshopStage({ crisisPending: 3, tutorialOpen: true }),
      WORKSHOP_STAGES.active
    );
    assert.equal(
      resolveWorkshopStage({ crisisPending: 0, restored: true }),
      WORKSHOP_STAGES.active
    );
  });

  it("only highlights Look Ahead when a placed tile hits yellow/red timing", () => {
    assert.equal(
      shouldHighlightLookAhead({ stage: "invent", timingLevel: "red", onBoardCount: 0 }),
      false
    );
    assert.equal(
      shouldHighlightLookAhead({ stage: "active", timingLevel: "red", onBoardCount: 0 }),
      false
    );
    assert.equal(
      shouldHighlightLookAhead({ stage: "active", timingLevel: "green", onBoardCount: 1 }),
      false
    );
    assert.equal(
      shouldHighlightLookAhead({ stage: "active", timingLevel: "yellow", onBoardCount: 1 }),
      true
    );
    assert.equal(
      shouldHighlightLookAhead({ stage: "active", timingLevel: "red", onBoardCount: 2 }),
      true
    );
  });

  it("keeps the Assessment tab badge quiet until Stage 2", () => {
    assert.equal(assessmentTabBadgeLevel({ stage: "crises", level: "red" }), "");
    assert.equal(assessmentTabBadgeLevel({ stage: "invent", level: "red" }), "");
    assert.equal(assessmentTabBadgeLevel({ stage: "active", level: "red" }), "red");
    assert.equal(assessmentTabBadgeLevel({ stage: "active", level: "green" }), "green");
    assert.equal(
      assessmentTabBadgeLevel({ stage: "active", level: "red", pending: true }),
      "pending"
    );
  });
});

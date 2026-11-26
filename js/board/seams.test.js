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
import { cloneBoard, boardHolds, preferIncomingHexBoard, createEmptyBoard } from "../hex/board-state.js";
import { listInventionPathways, resolveIslandHow, concernsReachedFromPathway } from "../hex/evaluate.js";
import {
  createPathwayBoard,
  addTechTrack,
  dealMilestone,
  createPathway,
  plugWire,
  summonChallenger,
  setChallengerAnswer,
  resolveChallengerLamp,
} from "./pathway-model.js";

describe("pathway board seams", () => {
  it("cloneBoard keeps a v2 overlay and leaves a hex board unchanged", () => {
    const legacy = createEmptyBoard();
    const clonedLegacy = cloneBoard(legacy);
    assert.equal(clonedLegacy.schema, undefined);
    assert.equal(clonedLegacy.pathways, undefined);

    let board = createPathwayBoard();
    board = addTechTrack(board, "drones");
    board.questYear = 2026;
    const cloned = cloneBoard(board);
    assert.equal(cloned.schema, "future-forge.pathway-board/v2");
    assert.equal(cloned.techTracks.drones.techId, "drones");
    assert.equal(cloned.questYear, 2026);
    assert.notEqual(cloned.techTracks, board.techTracks);
  });

  it("groups pathways by ingredients instead of hex adjacency", () => {
    let board = createPathwayBoard();
    board = dealMilestone(board, "drones", {
      id: "ms-d",
      year: 2026,
      label: "Now",
      status: "reached",
      useCases: [{ id: "uc-d", title: "Map", blurb: "Map the sluice.", world: "atoms" }],
    });
    const made = createPathway(board, { techId: "drones", title: "Mapper", howText: "Fly the map.", useCaseIds: ["uc-d"] });
    const groups = listInventionPathways(made.board);
    assert.equal(groups.length, 1);
    assert.equal(groups[0][0].techId, "drones");
    assert.match(resolveIslandHow(made.board, groups[0]).text, /Fly the map/);
  });

  it("reads roadblocks from wires and prefers the higher rev", () => {
    let board = createPathwayBoard();
    board = dealMilestone(board, "drones", {
      id: "ms-d",
      year: 2026,
      status: "reached",
      label: "Now",
      useCases: [{ id: "uc-d", title: "Map", blurb: "Map.", world: "atoms" }],
    });
    const made = createPathway(board, { techId: "drones", title: "Mapper", howText: "Fly.", useCaseIds: ["uc-d"] });
    made.board.crises["crisis-local"] = { id: "crisis-local", role: "local", name: "Clean Water", lamp: "yellow" };
    const plugged = plugWire(made.board, made.pathwayId, "crisis-local");
    const summoned = summonChallenger(plugged.board, { wireId: plugged.wireId, angle: "stakeholder", question: "Who pays?" });
    const groups = listInventionPathways(summoned.board);
    const concerns = concernsReachedFromPathway(summoned.board, groups[0]);
    assert.equal(concerns[0].angle, "stakeholder");
    assert.equal(boardHolds(summoned.board), false);
    const answered = setChallengerAnswer(summoned.board, summoned.id, { answerQuality: "glance", playerAnswer: "The co-op pays." });
    answered.challengers[summoned.id].lamp = resolveChallengerLamp(answered.challengers[summoned.id], answered.pathways[made.pathwayId], "yellow");
    answered.crises["crisis-local"].lamp = "green";
    answered.questYear = 2026;
    assert.equal(boardHolds(answered), true);

    const older = { ...answered, rev: 1 };
    const newer = { ...answered, rev: 4 };
    assert.equal(preferIncomingHexBoard(older, newer), true);
    assert.equal(preferIncomingHexBoard(newer, older), false);
  });
});

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
  collectorMilestonesForTech,
  collectorInventionIsFree,
} from "./collector-ontology.js";
import { resolveTechTrack } from "./index.js";

describe("collector ontology", () => {
  it("drops a collected milestone and its use cases onto the matching tech", () => {
    const cards = [
      {
        id: "card-drone",
        techId: "drones",
        title: "A one-motor drone that sees all around",
        capability: "One motor, a full view, onboard.",
        useCases: ["Map a car park with no satellite.", "Fly a cluttered hall."],
      },
    ];
    const rows = collectorMilestonesForTech(cards, "drones", { world: "atoms" });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].status, "reached");
    assert.equal(rows[0].origin, "collector");
    assert.equal(rows[0].collectorCardId, "card-drone");
    assert.equal(rows[0].useCases.length, 2);
    assert.equal(rows[0].useCases[0].origin, "collector");

    const track = resolveTechTrack("drones", { collectorCards: cards });
    assert.ok(track.milestones.some((m) => m.collectorCardId === "card-drone"));
  });

  it("grants the free invention only to the first ingredient from that card", () => {
    const board = {
      pathways: {
        a: {
          id: "a",
          createdOrder: 1,
          ingredients: [{ id: "ing-1", collectorCardId: "card-drone" }],
        },
        b: {
          id: "b",
          createdOrder: 2,
          ingredients: [{ id: "ing-2", collectorCardId: "card-drone" }],
        },
      },
    };
    assert.equal(collectorInventionIsFree(board, "card-drone", "ing-1"), true);
    assert.equal(collectorInventionIsFree(board, "card-drone", "ing-2"), false);
  });

  it("synthesizes a collected use case from publicCardDto description when useCases is absent", () => {
    const cards = [
      {
        id: "card-api-1",
        techId: "solar",
        techName: "Solar Power",
        title: "Agrivoltaic shade panels",
        description: "Semi-transparent rooftop panels generate electricity while shielding crops.",
        imageUrl: "https://cloud.warmersun.com/card/card-api-1/image",
      },
    ];
    const rows = collectorMilestonesForTech(cards, "solar", { world: "atoms" });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].label, "Agrivoltaic shade panels");
    assert.match(rows[0].detail, /Semi-transparent rooftop panels/);
    assert.equal(rows[0].useCases.length, 1);
    assert.equal(rows[0].useCases[0].title, "Agrivoltaic shade panels");
    assert.equal(rows[0].useCases[0].origin, "collector");
  });
});

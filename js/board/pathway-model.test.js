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
  addTechTrack,
  dealMilestone,
  createPathway,
  fusePathways,
  unfuseIngredient,
  composePathwayHow,
  needsBridgeWarning,
  plugWire,
  seedCrises,
  summonChallenger,
  setChallengerAnswer,
  resolveChallengerLamp,
  applyChallengerLamps,
  applyScoreToCrisis,
  boardHolds,
  effectiveTiming,
  forecastWireState,
  migrateToPathwayBoard,
  projectToTiles,
  createPathwayBoard,
  isUseCaseEarly,
  removeTechTrack,
  removeUseCase,
  removePathway,
  findUnusedItems,
  pruneUnusedItems,
  attachRd,
  attachArgument,
  settleArgument,
  acceptedArgumentsForPathway,
  pairConverges,
} from "./pathway-model.js";

const milestone = {
  id: "ms-drones-2026",
  year: 2026,
  status: "reached",
  label: "Mapped corridors",
  useCases: [
    { id: "uc-map", title: "Sluice mapping", blurb: "Photograph every sluice.", world: "atoms" },
  ],
};

const forecast = {
  id: "ms-drones-2030",
  year: 2030,
  status: "predicted",
  label: "Shared town map",
  useCases: [
    { id: "uc-fleet", title: "Shared flood map", blurb: "Several craft, one map.", world: "atoms" },
  ],
};

describe("pathway board", () => {
  it("keeps a predicted use case predicted when the quest year passes it", () => {
    let board = addTechTrack(createPathwayBoard(), "drones");
    board = dealMilestone(board, "drones", forecast);
    const uc = board.useCases["uc-fleet"];
    assert.equal(uc.milestoneStatus, "predicted");
    assert.equal(forecastWireState(uc, 2026), "early");
    assert.equal(isUseCaseEarly(uc, 2026), true);
    assert.equal(forecastWireState(uc, 2030), "solid");
    assert.equal(uc.milestoneStatus, "predicted");
  });

  it("fuses and unfuses with no score call and a deterministic how-text", () => {
    let board = dealMilestone(addTechTrack(createPathwayBoard(), "drones"), "drones", milestone);
    board = dealMilestone(addTechTrack(board, "battery"), "battery", {
      id: "ms-battery-2026",
      year: 2026,
      status: "reached",
      useCases: [
        { id: "uc-pack", title: "Flight pack", blurb: "A swap pack keeps the flight up.", world: "atoms" },
      ],
    });
    const a = createPathway(board, {
      techId: "drones",
      useCaseIds: ["uc-map"],
      title: "Runoff Mapper",
      howText: "A mapped drone photographs every sluice.",
      world: "atoms",
    });
    const b = createPathway(a.board, {
      techId: "battery",
      useCaseIds: ["uc-pack"],
      title: "Flight Pack",
      howText: "A swap pack keeps that flight in the air.",
      world: "atoms",
    });
    assert.equal(Object.keys(b.board.pathwayImpacts).length, 0);
    const fused = fusePathways(b.board, a.pathwayId, b.pathwayId);
    assert.equal(fused.ok, true);
    const pathway = fused.board.pathways[a.pathwayId];
    assert.equal(pathway.ingredients.length, 2);
    assert.ok(pathway.convergences.length >= 1);
    assert.match(composePathwayHow(pathway), /sluice/);
    assert.match(composePathwayHow(pathway), /swap pack/);
    const ing = pathway.ingredients[1];
    const back = unfuseIngredient(fused.board, a.pathwayId, ing.id);
    assert.equal(back.ok, true);
    assert.equal(back.ingredient.artUrl, ing.artUrl);
    assert.equal(back.board.pathways[back.pathwayId].ingredients.length, 1);
    assert.equal(Object.keys(back.board.wires).length, 0);
  });

  it("warns on a bits/atoms fusion and stays quiet when a human step is present", () => {
    const pathway = {
      ingredients: [
        { world: "bits" },
        { world: "atoms" },
      ],
    };
    assert.equal(needsBridgeWarning(pathway, true), true);
    assert.equal(needsBridgeWarning(pathway, false), false);
    assert.equal(
      needsBridgeWarning({ ingredients: [...pathway.ingredients, { world: "plain" }] }, true),
      false
    );
  });

  it("does not score until a pathway is plugged, then a challenger can clear both ways", () => {
    let board = seedCrises(createPathwayBoard(), [
      { id: "crisis-local", role: "local", name: "Clean Water", lamp: "red" },
    ]);
    board = dealMilestone(board, "drones", milestone);
    const made = createPathway(board, {
      useCaseIds: ["uc-map"],
      title: "Runoff Mapper",
      howText: "Photographs every sluice on a mapped corridor this year.",
      timingLevel: "green",
      timingPct: 85,
      world: "atoms",
    });
    board = made.board;
    assert.equal(Object.keys(board.pathwayImpacts).length, 0);
    const plugged = plugWire(board, made.pathwayId, "crisis-local");
    assert.equal(plugged.ok, true);
    assert.equal(Object.values(plugged.board.pathwayImpacts)[0].pending, true);
    const summoned = summonChallenger(plugged.board, {
      wireId: plugged.wireId,
      angle: "stakeholder",
      speech: "Who pays for the flights?",
      question: "Name who signs and who pays.",
    });
    let ch = summoned.board.challengers[summoned.id];
    assert.equal(resolveChallengerLamp(ch, summoned.board.pathways[made.pathwayId], "red"), "red");
    const written = setChallengerAnswer(summoned.board, summoned.id, {
      playerAnswer: "The co-op pays and Sita signs.",
      answerQuality: "glance",
    });
    ch = written.challengers[summoned.id];
    assert.equal(resolveChallengerLamp(ch, written.pathways[made.pathwayId], "red"), "yellow");

    const spatial = applyChallengerLamps(
      setChallengerAnswer(summoned.board, summoned.id, { answerQuality: null }),
      {}
    );
    spatial.pathways[made.pathwayId].ingredients[0].howText = "A changed mechanism with a named payer.";
    const cleared = applyChallengerLamps(spatial, { stakeholder: "green" });
    assert.equal(cleared.challengers[summoned.id].lamp, "green");
  });

  it("holds only when crises, timing, and roadblocks are clear", () => {
    let board = seedCrises(createPathwayBoard(), [
      { id: "crisis-local", role: "local", name: "Clean Water", lamp: "green" },
    ]);
    board = dealMilestone(board, "drones", milestone);
    const made = createPathway(board, {
      useCaseIds: ["uc-map"],
      howText: "Mapped photos of every sluice.",
      timingLevel: "green",
      timingPct: 85,
      world: "atoms",
    });
    const plugged = plugWire(made.board, made.pathwayId, "crisis-local");
    const summoned = summonChallenger(plugged.board, {
      wireId: plugged.wireId,
      angle: "stakeholder",
    });
    assert.equal(boardHolds(summoned.board, 2026), false);
    const answered = setChallengerAnswer(summoned.board, summoned.id, {
      answerQuality: "hit",
      lamp: "green",
    });
    assert.equal(boardHolds(answered, 2026), true);
    const early = dealMilestone(answered, "drones", forecast);
    const late = createPathway(early, { useCaseIds: ["uc-fleet"], timingLevel: "green", world: "atoms" });
    const lateWire = plugWire(late.board, late.pathwayId, "crisis-local");
    const timing = effectiveTiming(lateWire.board.pathways[late.pathwayId], lateWire.board.useCases, 2026);
    assert.equal(timing.early, true);
    assert.match(timing.timingReason, /Too early in 2026/);
    assert.equal(boardHolds(lateWire.board, 2026), false);
  });

  it("migrates a placed hex island into a pathway and a crisis wire", () => {
    const legacy = {
      tiles: {
        "crisis-local": {
          id: "crisis-local",
          kind: "crisis",
          role: "local",
          name: "Clean Water",
          q: 0,
          r: 0,
          lamp: "yellow",
        },
        inv: {
          id: "inv",
          kind: "invention",
          techId: "drones",
          name: "Mapper",
          howText: "Photographs sluices.",
          polarity: "atoms",
          q: 1,
          r: 0,
        },
      },
      concernsSummoned: false,
    };
    const board = migrateToPathwayBoard(legacy);
    assert.equal(board.schema, "future-forge.pathway-board/v2");
    assert.equal(Object.keys(board.pathways).length, 1);
    assert.equal(Object.values(board.pathways)[0].ingredients[0].howText, "Photographs sluices.");
    assert.equal(Object.keys(board.wires).length, 1);
    assert.equal(board.crises["crisis-local"].name, "Clean Water");
    const projected = projectToTiles(board);
    assert.equal(projected.tiles.inv.kind, "invention");
    assert.equal(projected.tiles.inv.techId, "drones");
    assert.ok(projected.tiles.inv.q != null);
  });

  it("checks real TECHS.pairs convergence and multiplies effectiveTiming with R&D", () => {
    assert.equal(pairConverges({ techId: "drones", world: "atoms" }, { techId: "battery", world: "atoms" }), true);
    assert.equal(pairConverges({ techId: "nuclear", world: "atoms" }, { techId: "ar", world: "bits" }), false);

    let board = createPathwayBoard();
    const a = createPathway(board, { techId: "drones", title: "Scout", timingPct: 70, timingLevel: "yellow", world: "atoms" });
    const b = createPathway(a.board, { techId: "battery", title: "Pack", timingPct: 70, timingLevel: "yellow", world: "atoms" });
    const fused = fusePathways(b.board, a.pathwayId, b.pathwayId);
    assert.equal(fused.board.pathways[a.pathwayId].convergences.length, 1);

    // (70 * 70 / 100) = 49% * 1.25 convergence = 61% (yellow); then 1.5x R&D = 92% (green)
    const convTiming = effectiveTiming(fused.board.pathways[a.pathwayId], fused.board.useCases, 2026);
    assert.equal(convTiming.timingPct, 61);
    assert.equal(convTiming.timingLevel, "yellow");

    const boosted = attachRd(fused.board, a.pathwayId, { factor: 1.5 });
    const rdTiming = effectiveTiming(boosted.pathways[a.pathwayId], boosted.useCases, 2026);
    assert.equal(rdTiming.timingPct, 92);
    assert.equal(rdTiming.timingLevel, "green");
  });

  it("removes tech tracks, use cases, and pathways cleanly and settles fact-checked arguments", () => {
    let board = seedCrises(createPathwayBoard(), [
      { id: "crisis-local", role: "local", name: "Clean Water", lamp: "red" },
    ]);
    board = addTechTrack(board, "drones");
    board = dealMilestone(board, "drones", milestone);
    assert.ok(board.useCases["uc-map"]);

    const made = createPathway(board, { techId: "drones", useCaseIds: ["uc-map"], howText: "Map silt." });
    const plugged = plugWire(made.board, made.pathwayId, "crisis-local");
    let b = applyScoreToCrisis(plugged.board, "crisis-local", { delta: -2, reason: "Cuts silt." });
    assert.equal(b.crises["crisis-local"].lamp, "green");
    b = attachArgument(b, made.pathwayId, { id: "arg-1", claim: "BVLOS farm flights approved in 2025.", verdict: "pending", pending: true });
    assert.equal(acceptedArgumentsForPathway(b, b.pathways[made.pathwayId]).length, 0);
    b = settleArgument(b, "arg-1", "accept", "Verified FAA Part 108 pilot.");
    assert.equal(acceptedArgumentsForPathway(b, b.pathways[made.pathwayId]).length, 1);

    b = removeUseCase(b, "uc-map");
    assert.equal(b.useCases["uc-map"], undefined);
    assert.deepEqual(b.pathways[made.pathwayId].ingredients[0].useCaseIds, []);

    b = removePathway(b, made.pathwayId);
    assert.equal(Object.keys(b.pathways).length, 0);
    assert.equal(Object.keys(b.wires).length, 0);
    assert.equal(b.crises["crisis-local"].lamp, "red");

    b = removeTechTrack(b, "drones");
    assert.equal(b.techTracks.drones, undefined);
  });

  it("findUnusedItems and pruneUnusedItems clear unconnected branches in both unwired and wired states", () => {
    let b = seedCrises(createPathwayBoard(), [
      { id: "crisis-local", role: "local", name: "Clean Water", lamp: "red" },
    ]);
    b = addTechTrack(b, "drones");
    // Fresh board with a single focused tech has nothing unused.
    assert.equal(findUnusedItems(b, { focusedTechId: "drones" }).count, 0);

    // Add a second tech + deal milestones on both.
    b = addTechTrack(b, "solar");
    b = dealMilestone(b, "drones", {
      id: "ms-drones-2026",
      year: 2026,
      status: "reached",
      label: "Autonomous scout",
      useCases: [
        { id: "uc-d1", title: "Map canal", blurb: "Map canal", world: "atoms" },
        { id: "uc-d2", title: "Deliver vial", blurb: "Deliver vial", world: "atoms" },
      ],
    });
    b = dealMilestone(b, "solar", {
      id: "ms-solar-2026",
      year: 2026,
      status: "reached",
      label: "Cheap PV",
      useCases: [
        { id: "uc-s1", title: "Pump water", blurb: "Pump water", world: "atoms" },
      ],
    });

    // Build two pathways: one from drones (uc-d1), one from solar (uc-s1). Neither plugged yet.
    const pwA = createPathway(b, { techId: "drones", useCaseIds: ["uc-d1"], title: "Canal drone", howText: "Map canal." });
    const pwB = createPathway(pwA.board, { techId: "solar", useCaseIds: ["uc-s1"], title: "Solar pump", howText: "Pump water." });

    // Unwired stage: both pathways stay, only uc-d2 is unused.
    const unwiredUnused = findUnusedItems(pwB.board, { focusedTechId: "drones" });
    assert.deepEqual(unwiredUnused.pathwayIds, []);
    assert.deepEqual(unwiredUnused.techIds, []);
    assert.deepEqual(unwiredUnused.useCaseIds, ["uc-d2"]);

    // Plug pwA into crisis-local; leave pwB unplugged.
    const wired = plugWire(pwB.board, pwA.pathwayId, "crisis-local").board;
    const wiredUnused = findUnusedItems(wired, { focusedTechId: "solar" });
    assert.deepEqual(wiredUnused.pathwayIds, [pwB.pathwayId]);
    assert.deepEqual(wiredUnused.useCaseIds.sort(), ["uc-d2", "uc-s1"]);
    assert.deepEqual(wiredUnused.techIds, ["solar"]);

    const pruned = pruneUnusedItems(wired, { focusedTechId: "solar" });
    assert.equal(pruned.removed.count, 4);
    assert.deepEqual(Object.keys(pruned.board.pathways), [pwA.pathwayId]);
    assert.deepEqual(Object.keys(pruned.board.useCases), ["uc-d1"]);
    assert.deepEqual(Object.keys(pruned.board.techTracks), ["drones"]);
    assert.equal(Object.keys(pruned.board.wires).length, 1);
    assert.equal(findUnusedItems(pruned.board).count, 0);
  });
});

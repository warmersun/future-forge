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
import { TECHS } from "../data.js";
import { createPathwayBoard, dealMilestone, addTechTrack, createPathway, seedCrises } from "./pathway-model.js";
import {
  WORKBENCH_METHODS,
  SIT_LENSES,
  SCAMPER_LENSES,
  CHALLENGER_LENS_MAP,
  extractScarcityPrompts,
  buildConvergenceCanvas,
  analyzeConvergencePair,
  recommendedScamperForSeed,
  buildLensPrompt,
  evaluateStagedDrafts,
  localWorkbenchLensDrafts,
  sanitizeWorkbenchDrafts,
} from "./workbench-methods.js";

describe("workbench-methods", () => {
  it("defines 4 methods, 4 SIT lenses, 7 SCAMPER letters, and 4 challenger maps", () => {
    assert.deepEqual(
      WORKBENCH_METHODS.map((m) => m.id),
      ["seed", "convergence", "sit", "scamper"]
    );
    assert.deepEqual(
      SIT_LENSES.map((l) => l.id),
      ["subtraction", "division", "multiplication", "addition"]
    );
    assert.deepEqual(
      SCAMPER_LENSES.map((l) => l.id),
      ["S", "C", "A", "M", "P", "E", "R"]
    );
    for (const angle of ["moloch", "nature", "ethicist", "stakeholder"]) {
      assert.equal(CHALLENGER_LENS_MAP[angle].scamper.length, 3);
      assert.ok(SIT_LENSES.some((l) => l.id === CHALLENGER_LENS_MAP[angle].sit));
    }
  });

  it("extracts scarcity prompts ordered by hottest crisis plus scene bottlenecks", () => {
    const prompts = extractScarcityPrompts(
      {
        title: "The reinjection ledger at Steamholt",
        scene: "Hot geothermal brine runs to waste while trucks haul battery feedstock and public trust falls.",
        stakeholder: "Rina, geothermal ops lead",
      },
      [
        { id: "c-support", role: "support", name: "Terrace Trust", level: 2, description: "Neighbors fear pond spills." },
        { id: "c-local", role: "local", name: "Wasted Brine", level: 4, description: "Mineral brine dumped into ponds." },
        { id: "c-global", role: "global", name: "Truck Feedstock", level: 3, description: "Long-haul diesel supply." },
      ]
    );
    assert.ok(prompts.length >= 3 && prompts.length <= 5);
    assert.equal(prompts[0].label, "Wasted Brine");
    assert.equal(prompts[1].label, "Truck Feedstock");
    assert.equal(prompts[2].label, "Terrace Trust");
  });

  it("groups all 29 technologies across 3 Convergence Canvas zones and detects synergy & missing bridge", () => {
    const canvas = buildConvergenceCanvas(
      { ai: { techId: "ai" }, geothermal: { techId: "geothermal" } },
      { suggested: ["iot", "battery"] },
      ["ai", "geothermal"],
      { place: "Steamholt", scarcity: "Wasted Brine" }
    );
    assert.deepEqual(
      canvas.zones.map((z) => z.id),
      ["bits", "split", "atoms"]
    );
    const total = canvas.zones.reduce((sum, z) => sum + z.count, 0);
    assert.equal(total, TECHS.length);
    // Bits (ai) + Atoms (geothermal) active without a Bridge => highlight center Bridge column
    assert.equal(canvas.needsBridgeHighlight, true);
    assert.equal(canvas.zones[1].highlightBridge, true);
    assert.equal(canvas.pairAnalysis.ready, true);
    assert.equal(canvas.pairAnalysis.needsBridge, true);
    assert.match(canvas.pairAnalysis.prompt, /Steamholt/);
    assert.match(canvas.pairAnalysis.prompt, /Wasted Brine/);

    // Known synergy pair (drones × battery)
    const pair = analyzeConvergencePair("drones", "battery", { place: "Steamholt" });
    assert.equal(pair.knownSynergy, true);
    assert.match(pair.badge, /Known Synergy Pair/);
  });

  it("recommends 3 focused SCAMPER letters per challenger angle", () => {
    assert.deepEqual(recommendedScamperForSeed({ challengerAngle: "moloch" }), ["R", "C", "E"]);
    assert.deepEqual(recommendedScamperForSeed({ challengerAngle: "nature" }), ["S", "E", "M"]);
    assert.deepEqual(recommendedScamperForSeed({ challengerAngle: "ethicist" }), ["R", "S", "A"]);
    assert.deepEqual(recommendedScamperForSeed({ challengerAngle: "stakeholder" }), ["C", "P", "R"]);
  });

  it("evaluates staged drafts in Converge pre-flight with exact incremental cost, world chain, horizon, and synergy", () => {
    let board = seedCrises(createPathwayBoard(), [
      { id: "c-local", role: "local", name: "Wasted Brine", lamp: "red" },
      { id: "c-support", role: "support", name: "Terrace Trust", lamp: "red" },
    ]);
    board = addTechTrack(board, "drones");
    board = dealMilestone(board, "drones", {
      id: "ms-drones-2030",
      year: 2030,
      status: "predicted",
      label: "Fleet dispatch",
      useCases: [{ id: "uc-future", title: "Autonomous fleet", blurb: "Fleet.", world: "atoms" }],
    });
    // Place drones already on board so drones incremental cost is 0$
    const existing = createPathway(board, {
      techId: "drones",
      title: "Existing Drone",
      howText: "Already placed on board.",
      world: "atoms",
    });
    board = existing.board;

    const drafts = [
      {
        id: "d1",
        title: "Drone + AI Monitor",
        howText: "AI routes drone inspections over the brine terrace.",
        techId: "ai",
        secondaryTechId: "drones",
        useCaseIds: ["uc-future"],
        world: "bits",
        eases: "Wasted Brine",
      },
    ];

    const pf = evaluateStagedDrafts(drafts, board, 2026);
    assert.equal(pf.canMint, true);
    // Bits (ai) + Atoms (drones) without Bridge or Human step
    assert.equal(pf.worldChain.needsBridge, true);
    assert.equal(pf.worldChain.status, "missing-bridge");
    // Relies on 2030 forecast in 2026
    assert.equal(pf.horizon.early, true);
    assert.equal(pf.horizon.year, 2030);
    // AI × Drones is an authored synergy pair
    assert.ok(pf.convergences.length >= 1);
    // Target crisis matched
    assert.equal(pf.crises[0].name, "Wasted Brine");
    // Only `ai` is newly paid; `drones` is already on board
    assert.deepEqual(pf.cost.newlyPaidTechIds, ["ai"]);
    assert.ok(pf.cost.budget > 0);

    // Adding a Human step draft resolves the missing Bridge warning for 0$ extra!
    const pfBridged = evaluateStagedDrafts(
      [
        ...drafts,
        {
          id: "d2",
          title: "Co-op Valve Check",
          howText: "Operators confirm every alert before flipping valves.",
          techId: null,
          world: "plain",
          eases: "Terrace Trust",
        },
      ],
      board,
      2026
    );
    assert.equal(pfBridged.worldChain.needsBridge, false);
    assert.equal(pfBridged.worldChain.status, "complete");
    assert.equal(pfBridged.cost.budget, pf.cost.budget);
    assert.equal(pfBridged.crises.length, 2);
  });

  it("generates focused local fallback drafts for SIT (1 or 4), SCAMPER (1-3), Convergence, and Seed", () => {
    const sit1 = localWorkbenchLensDrafts({
      method: "sit",
      lenses: ["subtraction"],
      seedTitle: "Brine Loop",
      techIds: ["geothermal"],
      place: "Steamholt",
      year: 2026,
      scarcity: "Wasted Brine",
    });
    assert.equal(sit1.length, 1);
    assert.equal(sit1[0].lens, "subtraction");
    assert.match(sit1[0].howText, /Steamholt/);

    const sit4 = localWorkbenchLensDrafts({
      method: "sit",
      lenses: ["subtraction", "division", "multiplication", "addition"],
      seedTitle: "Brine Loop",
      techIds: ["geothermal"],
      place: "Steamholt",
      year: 2026,
    });
    assert.equal(sit4.length, 4);

    const scamper2 = localWorkbenchLensDrafts({
      method: "scamper",
      lenses: ["R", "C"],
      seedTitle: "Brine Loop",
      techIds: ["geothermal"],
      place: "Steamholt",
      year: 2026,
    });
    assert.equal(scamper2.length, 2);
    assert.deepEqual(scamper2.map((d) => d.lens), ["R", "C"]);

    const conv = localWorkbenchLensDrafts({
      method: "convergence",
      techIds: ["ai", "geothermal"],
      place: "Steamholt",
      year: 2026,
      scarcity: "Wasted Brine",
    });
    assert.equal(conv.length, 2);
    assert.equal(conv[0].techId, "ai");
    assert.equal(conv[0].secondaryTechId, "geothermal");

    const prompt = buildLensPrompt("scamper", {
      scamperLetters: ["R", "C"],
      seedTitle: "Brine Loop",
      place: "Steamholt",
      challengerAngle: "moloch",
      challengerQuestion: "Who stops plants from dumping hot brine at night?",
    });
    assert.match(prompt.question, /Brine Loop/);
    assert.match(prompt.question, /dumping hot brine/);

    const sanitized = sanitizeWorkbenchDrafts(
      [{ title: "Valid Card", howText: "A concrete local mechanism in Steamholt.", techId: "not-real", lens: "S" }],
      { method: "scamper", techId: "geothermal", lenses: ["S"] }
    );
    assert.equal(sanitized.length, 1);
    assert.equal(sanitized[0].techId, "geothermal");
  });

  it("keeps an explicit human step unpaid and off the selected use cases", () => {
    const seed = localWorkbenchLensDrafts({
      method: "seed",
      techIds: ["geothermal"],
      useCaseIds: ["uc-early"],
      place: "Steamholt",
      year: 2026,
      stakeholder: "Rina",
      scarcity: "Wasted Brine",
    });
    assert.equal(seed.length, 3);
    assert.equal(seed[0].techId, "geothermal");
    assert.deepEqual(seed[0].useCaseIds, ["uc-early"]);
    const handoff = seed.find((d) => d.lensLabel.includes("Human Bridge"));
    assert.ok(handoff);
    assert.equal(handoff.techId, null);
    assert.equal(handoff.secondaryTechId, null);
    assert.equal(handoff.world, "plain");
    assert.deepEqual(handoff.useCaseIds, []);

    const aiHuman = sanitizeWorkbenchDrafts(
      [
        {
          title: "Neighborhood ledger",
          howText: "Residents confirm each reading before the valve moves.",
          techId: null,
          secondaryTechId: "battery",
          world: "bits",
        },
      ],
      {
        method: "seed",
        techId: "geothermal",
        techIds: ["geothermal"],
        useCaseIds: ["uc-early"],
      }
    );
    assert.equal(aiHuman.length, 1);
    assert.equal(aiHuman[0].techId, null);
    assert.equal(aiHuman[0].secondaryTechId, null);
    assert.equal(aiHuman[0].world, "plain");
    assert.deepEqual(aiHuman[0].useCaseIds, []);

    const pf = evaluateStagedDrafts(seed, createPathwayBoard(), 2026);
    assert.deepEqual(pf.cost.newlyPaidTechIds, ["geothermal"]);
    assert.equal(pf.worldChain.hasHuman, true);
  });
});

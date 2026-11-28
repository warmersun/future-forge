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
  createPathwayBoard,
  dealMilestone,
  addTechTrack,
  createPathway,
  seedCrises,
} from "./pathway-model.js";
import {
  DOUBLE_DIAMOND_STAGES,
  WORKBENCH_METHODS,
  SIT_LENSES,
  SCAMPER_LENSES,
  CHALLENGER_LENS_MAP,
  extractScarcityPrompts,
  extractDiscoveryClues,
  synthesizeHmwCandidates,
  recommendedScamperForSeed,
  buildLensPrompt,
  ingredientToWorkbenchIdea,
  draftToIngredientPartials,
  evaluateStagedDrafts,
  localWorkbenchLensDrafts,
  sanitizeWorkbenchDrafts,
} from "./workbench-methods.js";

describe("workbench-methods", () => {
  it("defines the 2-Diamond stages, 3 focused ideation methods (no redundant convergence tab), 4 SIT lenses, and 7 SCAMPER letters", () => {
    assert.deepEqual(
      DOUBLE_DIAMOND_STAGES.map((d) => [d.id, d.diverge.step, d.converge.step]),
      [
        ["problem", "1 · Discover", "2 · Define"],
        ["solution", "3 · Develop", "4 · Deliver"],
      ]
    );
    assert.deepEqual(
      WORKBENCH_METHODS.map((m) => m.id),
      ["seed", "sit", "scamper"]
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

  it("extracts Diamond 1 Discovery clues and synthesizes 'How Might We…' candidates from Quest & player insights", () => {
    const mission = {
      place: "Brackenfold",
      title: "The blood that cannot reach Brackenfold in time",
      job: "Help Imani get the right blood to her ward within the hour, whatever the road is doing, without a fridge full of bags that spoil.",
      scene: "Mudslides cut off the three-hour dirt road while ward stock expires.",
      stakeholder: "Dr. Imani Sekule, head of the maternity ward",
    };
    const crises = [
      { id: "c-local", role: "local", name: "Blood Too Late", level: 3, goal: 1, description: "Matched blood arrives hours late." },
      { id: "c-global", role: "global", name: "Cut-Off Districts", level: 2, goal: 1, description: "Dirt road washes out in rain." },
      { id: "c-support", role: "support", name: "Blood Bank Doubt", level: 2, goal: 1, description: "City bank doubts bags will be used before expiry." },
    ];
    const clues = extractDiscoveryClues(mission, crises, [
      { id: "r1", label: "Night flight noise curfew", body: "No loud rotors over housing after 22:00." },
    ]);
    assert.ok(clues.some((c) => c.kind === "stakeholder" && /Imani Sekule/.test(c.title)));
    assert.ok(clues.some((c) => c.role === "local" && /Blood Too Late/.test(c.title)));
    assert.ok(clues.some((c) => c.role === "global" && /Cut-Off Districts/.test(c.title)));
    assert.ok(clues.some((c) => c.role === "support" && /Blood Bank Doubt/.test(c.title)));
    assert.ok(clues.some((c) => /Night flight noise curfew/.test(c.title)));

    const hmw = synthesizeHmwCandidates(mission, crises, [
      {
        id: "custom-1",
        kind: "insight",
        author: "player",
        title: "Cargo transport where there are no all-season roads",
        detail: "Cargo transport where there are no all-season roads",
      },
    ]);
    assert.ok(hmw.length >= 3);
    assert.match(hmw[0].howText, /^How might we/i);
    assert.match(hmw[0].howText, /no all-season roads/i);
    assert.ok(hmw.some((row) => /Blood Too Late/.test(row.howText)));

    const prompts = extractScarcityPrompts(mission, crises);
    assert.ok(prompts.length >= 3 && prompts.length <= 5);
  });

  it("round-trips Pathway ingredients <-> Workbench Ideas losslessly (preserving art and settled timing)", () => {
    const ing = {
      id: "ing-42",
      techId: "drones",
      useCaseIds: ["uc-1"],
      title: "Parachute blood drop",
      howText: "Fixed-wing drone drops insulated blood box onto hospital pad.",
      world: "atoms",
      artUrl: "/api/idea-image/art-42",
      artId: "art-42",
      imagePrompt: "Fixed-wing medical drone",
      timingLevel: "green",
      timingPct: 86,
      timingReason: "Demonstrated medical drone corridors exist in 2026.",
      timingPending: false,
      collectorCardId: "card-7",
    };

    const idea = ingredientToWorkbenchIdea(ing);
    assert.ok(idea);
    assert.equal(idea.title, "Parachute blood drop");
    assert.equal(idea.techId, "drones");
    assert.deepEqual(idea.useCaseIds, ["uc-1"]);
    assert.equal(idea.artUrl, "/api/idea-image/art-42");
    assert.equal(idea.artId, "art-42");
    assert.equal(idea.timingLevel, "green");
    assert.equal(idea.timingPct, 86);
    assert.equal(idea.collectorCardId, "card-7");

    const partials = draftToIngredientPartials(idea);
    assert.equal(partials.length, 1);
    assert.equal(partials[0].techId, "drones");
    assert.equal(partials[0].artUrl, "/api/idea-image/art-42");
    assert.equal(partials[0].artId, "art-42");
    assert.equal(partials[0].timingLevel, "green");
    assert.equal(partials[0].timingPct, 86);
    assert.equal(partials[0].collectorCardId, "card-7");
  });

  it("recommends 3 focused SCAMPER letters per challenger angle", () => {
    assert.deepEqual(recommendedScamperForSeed({ challengerAngle: "moloch" }), ["R", "C", "E"]);
    assert.deepEqual(recommendedScamperForSeed({ challengerAngle: "nature" }), ["S", "E", "M"]);
    assert.deepEqual(recommendedScamperForSeed({ challengerAngle: "ethicist" }), ["R", "S", "A"]);
    assert.deepEqual(recommendedScamperForSeed({ challengerAngle: "stakeholder" }), ["C", "P", "R"]);
  });

  it("evaluates Idea cards with exact incremental cost, world chain, horizon, and synergy", () => {
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
    assert.equal(pf.worldChain.needsBridge, true);
    assert.equal(pf.worldChain.status, "missing-bridge");
    assert.equal(pf.horizon.early, true);
    assert.equal(pf.horizon.year, 2030);
    assert.ok(pf.convergences.length >= 1);
    assert.equal(pf.crises[0].name, "Wasted Brine");
    assert.deepEqual(pf.cost.newlyPaidTechIds, ["ai"]);
    assert.ok(pf.cost.budget > 0);
  });

  it("generates focused local fallbacks for Discover, Define, SIT, SCAMPER, and Seed, and anchors prompts to HMW brief", () => {
    const discover = localWorkbenchLensDrafts({
      method: "discover",
      place: "Steamholt",
      year: 2026,
      stakeholder: "Rina",
    });
    assert.equal(discover.length, 3);
    assert.equal(discover[0].method, "discover");
    assert.equal(discover[0].techId, null);

    const define = localWorkbenchLensDrafts({
      method: "define",
      place: "Steamholt",
      year: 2026,
      stakeholder: "Rina",
      scarcity: "Wasted Brine",
    });
    assert.equal(define.length, 3);
    assert.match(define[0].howText, /^How might we/i);

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

    const seedPrompt = buildLensPrompt("seed", {
      techName: "Drones",
      place: "Brackenfold",
      year: 2026,
      hmwBrief: "How might we deliver matched blood within 60 minutes without ward spoilage?",
    });
    assert.match(seedPrompt.question, /Drones/);
    assert.match(seedPrompt.question, /How Might We/);

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
    const handoff = seed.find((d) => d.lensLabel.includes("Human Bridge"));
    assert.ok(handoff);
    assert.equal(handoff.techId, null);
    assert.equal(handoff.world, "plain");
    assert.deepEqual(handoff.useCaseIds, []);
  });
});

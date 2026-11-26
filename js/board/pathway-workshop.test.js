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
import { createPathwayWorkshop } from "./pathway-workshop.js";
import { resolveTechTrack } from "../ontology/index.js";
import { renderOntologyBoard, resolveChainHighlight, formatChainSentence } from "./board-render.js";

function harness(opts = {}) {
  let board = null;
  let year = opts.year ?? 2026;
  const calls = [];
  const root = {
    innerHTML: "",
    addEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    contains() { return false; },
  };
  const ws = createPathwayWorkshop({
    $: (sel) => (sel === "#ontology-board" ? root : null),
    getBoard: () => board,
    setBoard: (b) => { board = b; },
    getYear: () => year,
    getMission: () => ({ place: "Paddy Step Wells", spotlight: { techId: "drones" }, pressure: { "Clean Water": 3 } }),
    getPlace: () => "Paddy Step Wells",
    getRules: () => [{ id: "sluice", label: "Sluice calendar" }],
    canPlaceInvention: () => ({ ok: true }),
    reconcileStackFromBoard: () => ({ ok: true }),
    coInvent: async (mode) => {
      calls.push(mode);
      if (mode === "idea-sparks") {
        return {
          ideas: [{
            id: "spark-1",
            title: opts.sparkTitle || "Runoff Mapper",
            howText: "A pilot maps every sluice from the air and marks the one dumping silt into the well this week.",
          }],
        };
      }
      return {};
    },
    grantPathwayEase: () => {},
    ...opts.api,
  });
  return {
    ws,
    calls,
    root,
    get board() { return board; },
    set year(n) { year = n; },
    get year() { return year; },
  };
}

describe("pathway workshop", () => {
  it("deals milestones and fuses with no model call, and scores only after a wire", async () => {
    const h = harness();
    h.ws.seedFromMission({ place: "Paddy Step Wells", pressure: { "Clean Water": 3 }, spotlight: { techId: "drones" } });
    assert.equal(h.board.schema, "future-forge.pathway-board/v2");
    assert.ok(h.board.crises && Object.keys(h.board.crises).length >= 1);
    const drones = resolveTechTrack("drones");
    const reached = drones.milestones.find((m) => m.status === "reached" && m.year <= 2026);
    assert.equal(h.ws.dealMilestone("drones", reached.id), true);
    assert.equal(h.calls.length, 0);
    h.ws.focusTech("drones");
    await h.ws.askForIdeas();
    assert.deepEqual(h.calls, ["idea-sparks"]);
    assert.equal(h.ws.placeSpark("spark-1"), true);
    h.ws.focusTech("battery");
    const battery = resolveTechTrack("battery");
    const batteryReached = battery.milestones.find((m) => m.status === "reached" && m.year <= 2026);
    h.ws.dealMilestone("battery", batteryReached.id);
    await h.ws.askForIdeas();
    const ids = Object.keys(h.board.pathways);
    assert.equal(h.ws.placeSpark("spark-1"), true);
    const made = Object.keys(h.board.pathways);
    const source = made.find((id) => !ids.includes(id));
    const target = ids[0];
    assert.equal(h.ws.fuse(target, source), true);
    assert.equal(Object.keys(h.board.pathways).length, 1);
    assert.ok((h.board.pathways[target].ingredients || []).length >= 2);
    assert.equal(Object.values(h.board.pathwayImpacts || {}).length, 0);
    assert.equal(h.calls.includes("score-pathway"), false);
    const crisisId = Object.keys(h.board.crises)[0];
    await h.ws.plug(target, crisisId);
    assert.equal(h.calls.includes("score-pathway"), true);
    assert.match(h.root.innerHTML, /ontology-lane-tech/);
    assert.match(h.root.innerHTML, /Sluice calendar/);
  });

  it("keeps a forecast predicted and skips the model until the year arrives", async () => {
    const h = harness();
    h.ws.seedFromMission({ pressure: { "Clean Water": 3 } });
    const drones = resolveTechTrack("drones");
    const predicted = drones.milestones.find((m) => m.status === "predicted" && m.year > 2026);
    h.ws.focusTech("drones");
    h.ws.dealMilestone("drones", predicted.id);
    const placed = Object.values(h.board.useCases);
    assert.ok(placed.every((uc) => uc.milestoneStatus === "predicted"));
    await h.ws.askForIdeas();
    h.ws.placeSpark("spark-1");
    const pathwayId = Object.keys(h.board.pathways)[0];
    const crisisId = Object.keys(h.board.crises)[0];
    h.calls.length = 0;
    await h.ws.plug(pathwayId, crisisId);
    assert.equal(h.calls.includes("score-pathway"), false);
    assert.match(h.root.innerHTML, /Too early/);
    assert.match(h.root.innerHTML, /data-wire-state="early"/);
    assert.ok(Object.values(h.board.useCases).every((uc) => uc.milestoneStatus === "predicted"));
    h.year = predicted.year;
    await h.ws.refreshAfterYearChange();
    assert.ok(Object.values(h.board.useCases).every((uc) => uc.milestoneStatus === "predicted"));
    assert.match(h.root.innerHTML, /data-wire-state="solid"/);
    assert.equal(h.calls.includes("score-pathway"), true);
  });

  it("renders a forecast wire as dashed and early", () => {
    const html = renderOntologyBoard({
      year: 2026,
      tracks: [],
      useCases: [],
      pathways: [{ id: "pw-1", title: "Mapper", ingredients: [], convergences: [], howText: "Fly." }],
      crises: [{ id: "crisis-local", name: "Clean Water", role: "local", lamp: "red" }],
      wires: [{ id: "w1", pathwayId: "pw-1", crisisId: "crisis-local", state: "early", reason: "Too early (~2030)", lamp: "red" }],
      rules: [],
    });
    assert.match(html, /data-wire-state="early"/);
    assert.match(html, /Too early \(~2030\)/);
    assert.match(html, /QUEST YEAR: 2026/);
    assert.match(html, /data-action="tool-share"/);
    assert.match(html, /Share puzzle/);
  });

  it("deduplicates score-pathway across multiple wires and slides NOW divider across forecast years", async () => {
    const h = harness();
    h.ws.seedFromMission({
      place: "Paddy Step Wells",
      pressure: { "Clean Water": 3, "Farm Yield": 3 },
      spotlight: { techId: "drones" },
    });
    const drones = resolveTechTrack("drones");
    const reached = drones.milestones.find((m) => m.status === "reached" && m.year <= 2026);
    const predicted = drones.milestones.find((m) => m.status === "predicted" && m.year > 2026);
    h.ws.dealMilestone("drones", reached.id);
    assert.match(h.root.innerHTML, /NOW: 2026/);

    await h.ws.askForIdeas();
    h.ws.placeSpark("spark-1");
    const pwId = Object.keys(h.board.pathways)[0];
    const crisisIds = Object.keys(h.board.crises);
    assert.ok(crisisIds.length >= 2);
    h.calls.length = 0;

    await h.ws.plug(pwId, crisisIds[0]);
    assert.deepEqual(h.calls, ["score-pathway"]);

    // Plugging the same pathway into a second crisis scores the new role once, then caches both
    h.calls.length = 0;
    await h.ws.plug(pwId, crisisIds[1]);
    assert.deepEqual(h.calls, ["score-pathway"]);

    // Subsequent sync does zero duplicate model calls
    h.calls.length = 0;
    await h.ws.syncPathwayScores();
    assert.deepEqual(h.calls, []);

    // Advancing year past predicted milestone moves NOW divider while keeping Forecast badge
    h.year = predicted.year + 1;
    await h.ws.refreshAfterYearChange();
    assert.match(h.root.innerHTML, new RegExp(`NOW: ${predicted.year + 1}`));
    assert.match(h.root.innerHTML, /◌ Forecast/);
  });

  it("renders working indicators for pathway scoring, Weave with AI, and Moloch challenger generation", () => {
    const html = renderOntologyBoard({
      year: 2026,
      tracks: [],
      useCases: [],
      pathways: [
        {
          id: "pw-1",
          title: "Mapper + Pack",
          ingredients: [
            { id: "i1", title: "Mapper", world: "atoms" },
            { id: "i2", title: "Pack", world: "atoms" },
          ],
          convergences: [],
          howText: "Fly.",
          scoring: true,
          polishing: true,
        },
      ],
      crises: [{ id: "crisis-local", name: "Empty Shelf", role: "local", lamp: "yellow" }],
      wires: [
        {
          id: "w1",
          pathwayId: "pw-1",
          crisisId: "crisis-local",
          state: "solid",
          pending: true,
          summoning: { angle: "moloch", wireId: "w1" },
          lamp: "yellow",
        },
      ],
      summoning: { angle: "moloch", wireId: "w1" },
      rules: [],
    });
    assert.match(html, /Scoring pathway against plugged crises/);
    assert.match(html, /Weaving ingredients with AI/);
    assert.match(html, /Moloch.*crafting a hard question/);
    assert.match(html, /Moloch.*sharpening a hard question/);
    assert.match(html, /ontology-spinner/);
  });

  it("removes placed and dismissed idea cards and supports clearing all unused sparks", async () => {
    const h = harness();
    h.ws.seedFromMission({ place: "Coldharrow", pressure: { "Empty Shelf": 3 }, spotlight: { techId: "drones" } });
    h.ws.focusTech("drones");
    await h.ws.askForIdeas();
    assert.equal(h.ws.hasSparkBatch("drones"), true);
    assert.match(h.root.innerHTML, /data-action="dismiss-spark"/);
    assert.match(h.root.innerHTML, /data-action="clear-sparks"/);

    // Dismissing one unused spark removes just that card.
    const seen = [...h.root.innerHTML.matchAll(/data-action="dismiss-spark" data-idea-id="([^"]+)"/g)].map((m) => m[1]);
    assert.ok(seen.length >= 2);
    assert.equal(h.ws.dismissSpark(seen[1]), true);
    assert.doesNotMatch(h.root.innerHTML, new RegExp(`data-idea-id="${seen[1]}"`));
    assert.match(h.root.innerHTML, new RegExp(`data-idea-id="${seen[0]}"`));

    // Placing a spark automatically removes it from the unused tray.
    assert.equal(h.ws.placeSpark(seen[0]), true);
    assert.doesNotMatch(h.root.innerHTML, new RegExp(`data-action="dismiss-spark" data-idea-id="${seen[0]}"`));

    // Refreshing gets fresh ideas, and Clear empties the entire tray.
    await h.ws.askForIdeas({ refresh: true });
    assert.equal(h.ws.hasSparkBatch("drones"), true);
    assert.equal(h.ws.clearSparks(), true);
    assert.equal(h.ws.hasSparkBatch("drones"), false);
    assert.match(h.root.innerHTML, /id="ontology-sparks" class="ontology-sparks" hidden/);
  });

  it("traces exact upstream and downstream chains across all 4 lanes and dims unrelated items", () => {
    const baseView = {
      year: 2026,
      tracks: [
        {
          techId: "drones",
          name: "Drones",
          world: "atoms",
          milestones: [
            { id: "ms-d1", year: 2026, status: "reached", label: "Autonomous scout", dealt: true, useCases: [] },
            { id: "ms-d2", year: 2029, status: "predicted", label: "Heavy cargo", dealt: true, useCases: [] },
          ],
        },
        {
          techId: "battery",
          name: "Battery",
          world: "atoms",
          milestones: [
            { id: "ms-b1", year: 2026, status: "reached", label: "Cheap LFP pack", dealt: true, useCases: [] },
          ],
        },
      ],
      useCases: [
        { id: "uc-d1", techId: "drones", milestoneId: "ms-d1", milestoneYear: 2026, milestoneStatus: "reached", title: "Canal scan", world: "atoms" },
        { id: "uc-d2", techId: "drones", milestoneId: "ms-d1", milestoneYear: 2026, milestoneStatus: "reached", title: "Roof check", world: "atoms" },
        { id: "uc-b1", techId: "battery", milestoneId: "ms-b1", milestoneYear: 2026, milestoneStatus: "reached", title: "Microgrid pack", world: "atoms" },
      ],
      pathways: [
        {
          id: "pw-1",
          title: "Canal Mapper",
          ingredients: [{ id: "i1", techId: "drones", title: "Canal Mapper", world: "atoms", useCaseIds: ["uc-d1"] }],
          convergences: [],
          howText: "Scan canals.",
        },
        {
          id: "pw-2",
          title: "Village Pack",
          ingredients: [{ id: "i2", techId: "battery", title: "Village Pack", world: "atoms", useCaseIds: ["uc-b1"] }],
          convergences: [],
          howText: "Store solar.",
        },
      ],
      crises: [
        { id: "cr-1", name: "Clean Water", role: "local", lamp: "green" },
        { id: "cr-2", name: "Power Outages", role: "global", lamp: "yellow" },
      ],
      wires: [
        { id: "w-1", pathwayId: "pw-1", crisisId: "cr-1", pathwayTitle: "Canal Mapper", state: "solid", lamp: "green", challengers: [] },
        { id: "w-2", pathwayId: "pw-2", crisisId: "cr-2", pathwayTitle: "Village Pack", state: "solid", lamp: "yellow", challengers: [] },
      ],
      rules: [],
    };

    // Selecting Pathway pw-1 isolates ONLY ms-d1 -> uc-d1 -> pw-1 -> w-1 -> cr-1 (not sibling uc-d2 or battery branch).
    const pwHl = resolveChainHighlight({ ...baseView, trace: { type: "pathway", id: "pw-1" } });
    assert.deepEqual([...pwHl.techIds], ["drones"]);
    assert.deepEqual([...pwHl.milestoneIds], ["ms-d1"]);
    assert.deepEqual([...pwHl.useCaseIds], ["uc-d1"]);
    assert.deepEqual([...pwHl.pathwayIds], ["pw-1"]);
    assert.deepEqual([...pwHl.wireIds], ["w-1"]);
    assert.deepEqual([...pwHl.crisisIds], ["cr-1"]);
    assert.equal(pwHl.tier1Edges.has("ms-d1->uc-d1"), true);
    assert.equal(pwHl.tier1Edges.has("ms-d1->uc-d2"), false);
    assert.equal(pwHl.tier2Edges.has("uc-d1->pw-1"), true);
    assert.equal(pwHl.tier2Edges.has("uc-b1->pw-2"), false);

    // Selecting Crisis cr-2 traces all the way back to battery -> ms-b1 -> uc-b1 -> pw-2 -> w-2 -> cr-2.
    const crHl = resolveChainHighlight({ ...baseView, trace: { type: "crisis", id: "cr-2" } });
    assert.deepEqual([...crHl.techIds], ["battery"]);
    assert.deepEqual([...crHl.milestoneIds], ["ms-b1"]);
    assert.deepEqual([...crHl.useCaseIds], ["uc-b1"]);
    assert.deepEqual([...crHl.pathwayIds], ["pw-2"]);
    assert.deepEqual([...crHl.wireIds], ["w-2"]);
    assert.deepEqual([...crHl.crisisIds], ["cr-2"]);

    // Selecting Use Case uc-d1 traces upstream to ms-d1 and downstream to pw-1 -> cr-1.
    const ucHl = resolveChainHighlight({ ...baseView, trace: { type: "usecase", id: "uc-d1" } });
    assert.deepEqual([...ucHl.milestoneIds], ["ms-d1"]);
    assert.deepEqual([...ucHl.pathwayIds], ["pw-1"]);
    assert.deepEqual([...ucHl.crisisIds], ["cr-1"]);

    // Rendered HTML marks active vs dimmed cards, puts active wire in foreground SVG, and renders trace bar.
    const html = renderOntologyBoard({ ...baseView, trace: { type: "pathway", id: "pw-1" } });
    assert.match(html, /ontology-lanes-stage has-chain-highlight/);
    assert.match(html, /ontology-pathway[^"]*is-chain-selected[^"]*" data-pathway-id="pw-1"/);
    assert.match(html, /ontology-pathway[^"]*is-chain-dim[^"]*" data-pathway-id="pw-2"/);
    assert.match(html, /ontology-crisis[^"]*is-chain-linked[^"]*" data-crisis-id="cr-1"/);
    assert.match(html, /ontology-crisis[^"]*is-chain-dim[^"]*" data-crisis-id="cr-2"/);
    assert.match(html, /svg class="ontology-wires is-active-layer"[^>]*>[^<]*<path[^>]*is-highlighted[^>]*data-wire-id="w-1"/);
    assert.match(html, /ontology-trace-bar/);
    assert.match(html, /data-action="clear-trace"/);
    assert.match(html, /trace-tech/);
    assert.match(html, /trace-pw/);
    assert.match(html, /trace-crisis/);

    // Plain-English causal chain sentence covers full chains, forecasts, capabilities, and unplugged crises.
    const fullSentence = formatChainSentence(pwHl, baseView);
    assert.equal(
      fullSentence.text,
      "Drones reached Autonomous scout (2026), enabling Canal scan. We build Canal Mapper to address Clean Water."
    );

    const forecastView = { ...baseView, trace: { type: "milestone", id: "ms-d2" } };
    const forecastSentence = formatChainSentence(resolveChainHighlight(forecastView), forecastView);
    assert.match(forecastSentence.text, /^Drones are forecast to reach Heavy cargo \(~2029\)/);

    const capView = {
      year: 2026,
      tracks: [
        { techId: "solar", name: "Solar Power", capability: "Cheap daytime electricity from sunlight.", milestones: [] },
        { techId: "alt-proteins", name: "Alternative Proteins", capability: "Make protein in any season without farmland.", milestones: [] },
      ],
      useCases: [
        {
          id: "uc-custom",
          techId: "alt-proteins",
          milestoneId: null,
          milestoneYear: 2026,
          milestoneStatus: "reached",
          origin: "custom",
          title: "make something edible from thin air with artificial photosynthesis",
          blurb: "make something edible from thin air with artificial photosynthesis",
          world: "atoms",
        },
      ],
      pathways: [
        {
          id: "pw-custom",
          title: "artificial photosynthesis",
          ingredients: [{ id: "ic-1", techId: "alt-proteins", title: "artificial photosynthesis", world: "atoms", useCaseIds: ["uc-custom"] }],
          convergences: [],
          howText: "Artificial photosynthesis.",
        },
      ],
      crises: [
        { id: "cr-empty", name: "Power Outages", role: "local", lamp: "yellow" },
        { id: "cr-shelf", name: "Empty Shelf", role: "local", lamp: "yellow" },
      ],
      wires: [
        { id: "w-custom", pathwayId: "pw-custom", crisisId: "cr-shelf", pathwayTitle: "artificial photosynthesis", state: "solid", lamp: "yellow", challengers: [] },
      ],
      rules: [],
    };
    const techSentence = formatChainSentence(
      resolveChainHighlight({ ...capView, trace: { type: "tech", id: "solar" } }),
      capView
    );
    assert.equal(
      techSentence.text,
      "Solar Power — tap a milestone (or + Custom) to add use cases."
    );
    const customHl = resolveChainHighlight({ ...capView, trace: { type: "pathway", id: "pw-custom" } });
    assert.equal(customHl.tier1Edges.has("tech:alt-proteins->uc-custom"), true);
    const customSentence = formatChainSentence(customHl, capView);
    assert.equal(
      customSentence.text,
      "Alternative Proteins enable make something edible from thin air with artificial photosynthesis. We build artificial photosynthesis to address Empty Shelf."
    );
    const customHtml = renderOntologyBoard({ ...capView, trace: { type: "pathway", id: "pw-custom" } });
    assert.match(customHtml, /data-port-tech="alt-proteins"/);
    assert.match(customHtml, /data-from-tech="alt-proteins"/);
    const emptyCrisisSentence = formatChainSentence(
      resolveChainHighlight({ ...capView, trace: { type: "crisis", id: "cr-empty" } }),
      capView
    );
    assert.match(emptyCrisisSentence.text, /^Power Outages has no pathways plugged in yet/);
  });
});

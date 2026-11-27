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
import { renderOntologyBoard, resolveChainHighlight, formatChainSentence, worldBadge } from "./board-render.js";

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
    assert.match(html, /QUEST YEAR:\s*<\/span>2026/);
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

  it("restoreFromBoard clears stale UI state, keeps use cases/wires, and re-fetches stripped artId", async () => {
    const fetched = [];
    let board = null;
    let year = 2026;
    const root = { innerHTML: "", querySelector: () => null, querySelectorAll: () => [], addEventListener: () => {} };
    const ws = createPathwayWorkshop({
      $: () => root,
      getBoard: () => board,
      setBoard: (b) => { board = b; },
      getYear: () => year,
      getMission: () => ({ place: "Steamholt", pressure: { "Truck Feedstock": 3 } }),
      getPlace: () => "Steamholt",
      getRules: () => [],
      fetchIdeaImage: async (opts) => {
        fetched.push(opts);
        return "https://example.test/cached-art.jpg";
      },
    });
    ws.seedFromMission({ place: "Steamholt", pressure: { "Truck Feedstock": 3 }, spotlight: { techId: "drones" } });
    const drones = resolveTechTrack("drones");
    const reached = drones.milestones.find((m) => m.status === "reached" && m.year <= 2026);
    ws.dealMilestone("drones", reached.id);
    await ws.askForIdeas();
    ws.placeSpark("spark-1");
    const pwId = Object.keys(board.pathways)[0];
    const crisisId = Object.keys(board.crises)[0];
    await ws.plug(pwId, crisisId);

    // Simulate wire round-trip stripping inline artUrl while keeping artId + use cases + wires.
    const saved = structuredClone(board);
    saved.pathways[pwId].ingredients[0].artUrl = null;
    saved.pathways[pwId].ingredients[0].artId = "cached-art-1";
    fetched.length = 0;

    board = saved;
    ws.restoreFromBoard(saved, { focusedTechId: "drones" });
    await new Promise((r) => setTimeout(r, 10));

    assert.equal(Object.keys(board.useCases).length >= 1, true);
    assert.equal(Object.keys(board.wires).length, 1);
    assert.equal(fetched.length, 1);
    assert.equal(fetched[0].artId, "cached-art-1");
    assert.equal(board.pathways[pwId].ingredients[0].artUrl, "https://example.test/cached-art.jpg");
    assert.doesNotMatch(root.innerHTML, /use case linked into your next invention/);
  });

  it("showCollection lifts dialog out of hidden containers, recovers from fetch errors, and adopts picked cards", async () => {
    const prevDoc = globalThis.document;
    const makeEl = (tag) => {
      const listeners = {};
      return {
        tagName: tag,
        hidden: false,
        open: false,
        dataset: {},
        children: [],
        textContent: "",
        classList: { toggle() {} },
        parentElement: null,
        appendChild(c) {
          c.parentElement = this;
          this.children.push(c);
          return c;
        },
        replaceChildren() {
          this.children = [];
        },
        addEventListener(ev, fn) {
          (listeners[ev] ||= []).push(fn);
        },
        click() {
          for (const fn of listeners.click || []) fn({ target: this });
        },
        showModal() {
          this.open = true;
        },
        close() {
          this.open = false;
        },
      };
    };
    const body = makeEl("body");
    const hiddenParent = makeEl("div");
    const dlg = makeEl("dialog");
    hiddenParent.appendChild(dlg);
    const list = makeEl("div");
    const filters = makeEl("div");
    const empty = makeEl("p");
    globalThis.document = {
      body,
      addEventListener: () => {},
      createElement: (tag) => makeEl(tag),
      querySelector: (sel) => {
        if (sel === "#collector-cards") return dlg;
        if (sel === "#collector-cards-list") return list;
        if (sel === "#collector-cards-filters") return filters;
        if (sel === "#collector-cards-empty") return empty;
        return null;
      },
    };
    try {
      let board = null;
      let calls = 0;
      const toasts = [];
      const root = { innerHTML: "", querySelector: () => null, querySelectorAll: () => [], addEventListener: () => {} };
      const ws = createPathwayWorkshop({
        $: () => root,
        getBoard: () => board,
        setBoard: (b) => { board = b; },
        getYear: () => 2026,
        getMission: () => ({ place: "Saltpier", pressure: { Spoilage: 3 } }),
        getPlace: () => "Saltpier",
        getRules: () => [],
        isSignedIn: () => true,
        flashToast: (msg) => toasts.push(msg),
        listCollectorCards: async () => {
          calls += 1;
          if (calls === 1) throw new Error("network_blip");
          return [
            {
              id: "card-real-1",
              techId: "solar",
              techName: "Solar Power",
              title: "Nighttime radiative cooling film",
              description: "Passive roof film cools produce stalls without grid power.",
            },
          ];
        },
      });
      ws.seedFromMission({ place: "Saltpier", pressure: { Spoilage: 3 } });

      // First open fails -> dialog still moved to body, shows error message, does not poison cache.
      await ws.showCollection();
      assert.equal(dlg.parentElement, body);
      assert.equal(dlg.open, true);
      assert.equal(empty.hidden, false);
      assert.match(empty.textContent, /Could not load/);
      dlg.close();

      // Second open retries -> renders card button, picking it closes dialog & deals Lane 1+2.
      await ws.showCollection();
      assert.equal(calls, 2);
      assert.equal(list.children.length, 1);
      list.children[0].click();
      assert.equal(dlg.open, false);
      assert.ok(board.techTracks.solar);
      assert.ok(Object.values(board.useCases).some((uc) => uc.origin === "collector"));
      assert.ok(toasts.some((t) => /Nighttime radiative cooling film/.test(t)));
    } finally {
      globalThis.document = prevDoc;
    }
  });

  it("worldBadge renders crisp inline SVGs for Bits, Atoms, Bridge, and Human without dot/heart emoji", () => {
    const bits = worldBadge("bits");
    const atoms = worldBadge("atoms");
    const bridge = worldBadge("split");
    const human = worldBadge("plain");
    for (const html of [bits, atoms, bridge, human]) {
      assert.doesNotMatch(html, /[🔵🩷⚪]/);
      assert.match(html, /<svg /);
      assert.match(html, /title="/);
    }
    assert.match(bits, /ontology-world-svg is-bits/);
    assert.match(bits, />Bits<\/span>/);
    assert.match(atoms, /ontology-world-svg is-atoms/);
    assert.match(atoms, />Atoms<\/span>/);
    assert.match(bridge, /ontology-world-bridge-pair/);
    assert.match(bridge, /ontology-world-svg is-bits/);
    assert.match(bridge, /ontology-world-link-svg/);
    assert.match(bridge, /ontology-world-svg is-atoms/);
    assert.match(bridge, />Bridge<\/span>/);
    assert.match(human, /ontology-world-svg is-plain/);
    assert.match(human, />Human<\/span>/);
  });

  it("pruneUnused clears unconnected techs, use cases, unplugged pathways, and sparks", async () => {
    const h = harness();
    h.ws.seedFromMission({ place: "Paddy Step Wells", pressure: { "Clean Water": 3 }, spotlight: { techId: "drones" } });
    const drones = resolveTechTrack("drones");
    const solar = resolveTechTrack("solar");
    const dronesMs = drones.milestones.find((m) => m.status === "reached" && m.year <= 2026);
    const solarMs = solar.milestones.find((m) => m.status === "reached" && m.year <= 2026);

    h.ws.dealMilestone("drones", dronesMs.id);
    h.ws.focusTech("solar");
    h.ws.dealMilestone("solar", solarMs.id);

    // Ask for ideas on solar (creates 3 unplaced sparks), place spark-1 and plug it into crisis,
    // place spark-2 as an unplugged pathway, and leave spark-3 unplaced.
    await h.ws.askForIdeas();
    h.ws.placeSpark("spark-1");
    const wiredPwId = Object.keys(h.board.pathways)[0];
    const crisisId = Object.keys(h.board.crises)[0];
    await h.ws.plug(wiredPwId, crisisId);
    h.ws.placeSpark("spark-2");
    assert.equal(Object.keys(h.board.pathways).length, 2);
    assert.match(h.root.innerHTML, /data-action="prune-unused"/);
    assert.match(h.root.innerHTML, /Clear unused/);

    // Prune everything unconnected.
    assert.equal(h.ws.pruneUnused(), true);
    assert.deepEqual(Object.keys(h.board.pathways), [wiredPwId]);
    assert.deepEqual(Object.keys(h.board.techTracks), ["solar"]);
    assert.equal(h.ws.hasSparkBatch("solar"), false);
    assert.doesNotMatch(h.root.innerHTML, /data-action="prune-unused"/);
    assert.doesNotMatch(h.root.innerHTML, /Undo clear/);
  });

  it("pruneUnused keeps sparks and the board when the clear is rejected", async () => {
    let rejectClear = false;
    const h = harness({
      api: {
        reconcileStackFromBoard: () =>
          rejectClear ? { ok: false, techId: "solar", error: "short" } : { ok: true },
      },
    });
    h.ws.seedFromMission({
      place: "Paddy Step Wells",
      pressure: { "Clean Water": 3 },
      spotlight: { techId: "drones" },
    });
    const drones = resolveTechTrack("drones");
    const solar = resolveTechTrack("solar");
    const dronesMs = drones.milestones.find((m) => m.status === "reached" && m.year <= 2026);
    const solarMs = solar.milestones.find((m) => m.status === "reached" && m.year <= 2026);
    h.ws.dealMilestone("drones", dronesMs.id);
    h.ws.focusTech("solar");
    h.ws.dealMilestone("solar", solarMs.id);
    await h.ws.askForIdeas();
    h.ws.placeSpark("spark-1");
    const wiredPwId = Object.keys(h.board.pathways)[0];
    await h.ws.plug(wiredPwId, Object.keys(h.board.crises)[0]);
    h.ws.placeSpark("spark-2");
    assert.equal(Object.keys(h.board.pathways).length, 2);
    rejectClear = true;
    assert.equal(h.ws.pruneUnused(), false);
    assert.equal(Object.keys(h.board.pathways).length, 2);
    assert.ok(h.board.techTracks.drones);
    assert.equal(h.ws.hasSparkBatch("solar"), true);
  });

  it("does not pay or drop edits made while score-pathway is in flight", async () => {
    let release = null;
    const ease = [];
    const h = harness({
      api: {
        coInvent: async (mode) => {
          if (mode === "idea-sparks") {
            return {
              ideas: [{
                id: "spark-1",
                title: "Runoff Mapper",
                howText: "A pilot maps every sluice from the air and marks the one dumping silt into the well this week.",
              }],
            };
          }
          if (mode !== "score-pathway") return {};
          return new Promise((resolve) => {
            release = () =>
              resolve({
                crisisDelta: { local: -1 },
                crisisReasons: { local: "Less silt reaches the well." },
              });
          });
        },
        grantPathwayEase: (opts) => ease.push(opts),
        getMission: () => ({
          place: "Paddy Step Wells",
          pressure: { "Clean Water": 4 },
          winMax: { "Clean Water": 1 },
          spotlight: { techId: "drones" },
        }),
      },
    });
    h.ws.seedFromMission({
      place: "Paddy Step Wells",
      pressure: { "Clean Water": 4 },
      winMax: { "Clean Water": 1 },
      spotlight: { techId: "drones" },
    });
    const drones = resolveTechTrack("drones");
    const solar = resolveTechTrack("solar");
    const dronesMs = drones.milestones.find((m) => m.status === "reached" && m.year <= 2026);
    h.ws.dealMilestone("drones", dronesMs.id);
    h.ws.focusTech("drones");
    await h.ws.askForIdeas();
    h.ws.placeSpark("spark-1");
    const pathwayId = Object.keys(h.board.pathways)[0];
    const crisisId = Object.keys(h.board.crises)[0];

    const pending = h.ws.plug(pathwayId, crisisId);
    assert.equal(typeof release, "function");
    const solarMs = solar.milestones.find((m) => m.status === "reached" && m.year <= 2026);
    h.ws.focusTech("solar");
    assert.equal(h.ws.dealMilestone("solar", solarMs.id), true);
    assert.ok(h.board.techTracks.solar);
    release();
    assert.equal(await pending, true);
    assert.ok(h.board.techTracks.solar);
    assert.ok(h.board.wires && Object.keys(h.board.wires).length === 1);
    assert.equal(ease.length, 1);
    assert.ok(Number(ease[0].crisisDelta?.local) < 0);
  });

  it("does not pay pathway ease for a wire removed while score-pathway is in flight", async () => {
    let release = null;
    const ease = [];
    const h = harness({
      api: {
        coInvent: async (mode) => {
          if (mode === "idea-sparks") {
            return {
              ideas: [{
                id: "spark-1",
                title: "Runoff Mapper",
                howText: "A pilot maps every sluice from the air and marks the one dumping silt into the well this week.",
              }],
            };
          }
          if (mode !== "score-pathway") return {};
          return new Promise((resolve) => {
            release = () =>
              resolve({
                crisisDelta: { local: -1 },
                crisisReasons: { local: "Less silt reaches the well." },
              });
          });
        },
        grantPathwayEase: (opts) => ease.push(opts),
      },
    });
    h.ws.seedFromMission({
      place: "Paddy Step Wells",
      pressure: { "Clean Water": 4 },
      spotlight: { techId: "drones" },
    });
    const drones = resolveTechTrack("drones");
    const dronesMs = drones.milestones.find((m) => m.status === "reached" && m.year <= 2026);
    h.ws.dealMilestone("drones", dronesMs.id);
    h.ws.focusTech("drones");
    await h.ws.askForIdeas();
    h.ws.placeSpark("spark-1");
    const pathwayId = Object.keys(h.board.pathways)[0];
    const pending = h.ws.plug(pathwayId, Object.keys(h.board.crises)[0]);
    assert.equal(typeof release, "function");
    const wireId = Object.keys(h.board.wires)[0];
    assert.equal(await h.ws.unplug(wireId), true);
    release();
    await pending;
    assert.equal(ease.length, 0);
    assert.equal(Object.keys(h.board.wires).length, 0);
  });

  it("supports the Design Thinking Double-Diamond Workbench: Discover -> Define HMW brief, Develop Ideas (no redundant Convergence tab), modular Pathway assembly, and non-destructive Break Apart", async () => {
    const bills = [];
    const lensCalls = [];
    const paintedPrompts = [];
    let feasibilityCalls = 0;
    const h = harness({
      api: {
        reconcileStackFromBoard: (ids) => {
          bills.push([...ids]);
          return { ok: true };
        },
        fetchIdeaImage: async (opts) => {
          paintedPrompts.push(opts.ideaId);
          return `/assets/generated/${opts.ideaId}.jpg`;
        },
        coInvent: async (mode, _msg, extra) => {
          if (mode === "workbench-lens") {
            lensCalls.push({
              method: extra.method,
              lenses: extra.lenses,
              techIds: extra.techIds,
              hmwBrief: extra.hmwBrief,
            });
            if (extra.method === "sit") {
              return {
                ideas: (extra.lenses || ["subtraction"]).map((lens) => ({
                  id: `ai-sit-${lens}`,
                  lens,
                  title: `SIT ${lens} loop`,
                  howText: `Operators apply ${lens} to run clean water relays locally in Paddy Step Wells.`,
                  techId: extra.techIds?.[0] || "drones",
                  world: "atoms",
                  eases: "Clean Water",
                })),
              };
            }
            return {
              ideas: [
                {
                  id: "ai-seed-1",
                  lens: "seed",
                  title: "Mapped ridge blood drop",
                  howText: "Fixed-wing drones fly mapped corridors to deliver insulated packs within 45 minutes.",
                  techId: "drones",
                  world: "atoms",
                  eases: "Clean Water",
                },
                {
                  id: "ai-seed-2",
                  lens: "seed",
                  title: "Battery swap cradle",
                  howText: "Modular battery swap cradles at the clinic pad turn drones around in two minutes.",
                  techId: "battery",
                  world: "atoms",
                  eases: "Clean Water",
                },
              ],
            };
          }
          if (mode === "assess-feasibility" || mode === "assess-plain") {
            feasibilityCalls += 1;
            return { timing: { level: "green", reason: "Honest today." } };
          }
          return {};
        },
      },
    });
    h.ws.seedFromMission({
      id: "wb-test-quest",
      place: "Paddy Step Wells",
      stakeholder: "Dr. Imani Sekule",
      pressure: { "Clean Water": 4 },
      spotlight: { techId: "drones" },
    });

    // Collapsed view renders Workbench open button
    assert.match(h.root.innerHTML, /btn-open-workbench/);

    // 1. Fresh open starts on Diamond 1 (Problem Space: 1 · Discover -> 2 · Define)
    h.ws.openWorkbench();
    assert.match(h.root.innerHTML, /is-workbench-open/);
    assert.match(h.root.innerHTML, /DIAMOND 1 · PROBLEM SPACE/);
    assert.match(h.root.innerHTML, /DIAMOND 2 · SOLUTION SPACE/);
    assert.match(h.root.innerHTML, /1 · DISCOVER/);
    assert.match(h.root.innerHTML, /2 · DEFINE/);

    // Player adds a custom Discovery insight, toggles a suggested HMW frame on and off, then locks a brief -> Diamond 2!
    const insight = h.ws.addPlayerDiscoveryInsight(
      "Cargo must cross washed-out ridges where there are no all-season roads."
    );
    assert.ok(insight);
    assert.match(h.root.innerHTML, /\+ Select/);
    const firstHmwMatch = h.root.innerHTML.match(/data-action="wb-pick-hmw" data-hmw="([^"]+)"/);
    assert.ok(firstHmwMatch, "renders suggested HMW problem frame");
    const firstHmw = firstHmwMatch[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&");
    assert.equal(h.ws.pickHmwCandidate(firstHmw), true);
    assert.equal(h.ws.getWorkbenchState().hmwBrief, firstHmw);
    assert.match(h.root.innerHTML, /✓ Selected/);
    assert.equal(h.ws.pickHmwCandidate(firstHmw), false, "clicking selected frame deselects it");
    assert.equal(h.ws.getWorkbenchState().hmwBrief, "");
    assert.doesNotMatch(h.root.innerHTML, /✓ Selected/);

    assert.equal(h.ws.lockHmwAndIdeate(), true);
    assert.equal(h.ws.getWorkbenchState().diamond, "solution");
    assert.match(h.ws.getWorkbenchState().hmwBrief, /^How might we/i);
    assert.match(h.root.innerHTML, /wb-hmw-banner is-locked/);
    assert.match(h.root.innerHTML, /3 · DEVELOP/);
    assert.match(h.root.innerHTML, /4 · DELIVER/);

    // 2. Redundant Convergence ideation tab is gone; focused methods are Seed, SIT, SCAMPER
    assert.doesNotMatch(h.root.innerHTML, /wb-conv-map/);
    assert.doesNotMatch(h.root.innerHTML, /wb-conv-pick/);
    assert.equal(h.ws.setWorkbenchMethod("convergence"), false);

    // 3. Player saves a 0$ Idea & deals AI Seed Ideas anchored to the locked HMW brief
    const iHuman = h.ws.addPlayerWorkbenchIdea({
      title: "Co-op Sluice Ledger",
      howText: "Local stewards verify every flight log before opening irrigation gates.",
      techId: null,
      world: "plain",
    });
    assert.ok(iHuman);
    const seedIdeas = await h.ws.dealWorkbenchAiIdeas("focused");
    assert.equal(seedIdeas.length, 2);
    assert.equal(lensCalls[0].method, "seed");
    assert.match(lensCalls[0].hmwBrief, /^How might we/i);
    assert.equal(bills.length, 0, "Ideation remains 0$ until an Idea enters a Pathway");

    await new Promise((r) => setTimeout(r, 15));
    assert.ok(paintedPrompts.length >= 3, "all ideas get visualized with images");
    assert.equal(h.ws.getWorkbenchState().ideas.length, 3);

    // 4. Clean modular Pathway Assembly:
    //    - Start Pathway #1 with Idea 1 (moves out of Ideas)
    //    - Add Idea 2 directly into Pathway #1 (NO intermediate 1-part pathway spawned!)
    assert.equal(h.ws.startPathwayFromIdea(seedIdeas[0].id), true);
    assert.equal(Object.keys(h.board.pathways).length, 1);
    assert.equal(h.ws.getWorkbenchState().ideas.length, 2);
    assert.match(h.root.innerHTML, /\+ Add to Pathway #1/);

    assert.equal(h.ws.addIdeaToPathway(seedIdeas[1].id), true);
    assert.equal(Object.keys(h.board.pathways).length, 1, "still ONE clean Pathway, not two");
    assert.equal(h.ws.getWorkbenchState().ideas.length, 1);
    const pwId = Object.keys(h.board.pathways)[0];
    assert.equal(h.board.pathways[pwId].ingredients.length, 2);
    assert.ok(h.board.techTracks.battery, "Battery auto-added to Lane 1");
    assert.ok(h.board.pathways[pwId].convergences.length >= 1, "Drones × Battery synergy still fires naturally");

    // Let initial feasibility checks settle
    await new Promise((r) => setTimeout(r, 15));
    const feasibilityAfterFirstBuild = feasibilityCalls;
    assert.equal(feasibilityAfterFirstBuild, 2);

    // 5. Detach a single Idea (`returnIngredientToIdeas`) -> returns card to Ideas and refunds unused Battery tech!
    const batteryIngId = h.board.pathways[pwId].ingredients.find((i) => i.techId === "battery").id;
    assert.equal(h.ws.returnIngredientToIdeas(pwId, batteryIngId), true);
    assert.equal(h.board.pathways[pwId].ingredients.length, 1);
    assert.equal(h.ws.getWorkbenchState().ideas.length, 2, "Battery idea returned to Ideas tray");
    assert.deepEqual(bills.at(-1), ["drones"], "Battery refunded when no longer in any Pathway");

    // 6. Break apart the entire Pathway (`breakPathwayIntoIdeas`) -> returns remaining Idea with art & settled timing!
    assert.equal(h.ws.breakPathwayIntoIdeas(pwId), true);
    assert.equal(Object.keys(h.board.pathways).length, 0, "Pathway cleanly disassembled");
    assert.equal(h.ws.getWorkbenchState().ideas.length, 3, "All 3 original Ideas are back in Ideas tray");
    assert.deepEqual(bills.at(-1), [], "All emTech Budget refunded when board has 0 Pathways");

    // 7. Reassemble returned Ideas into a DIFFERENT Pathway (`Battery` + `Human Ledger`) with zero redundant feasibility calls!
    const batteryIdea = h.ws.getWorkbenchState().ideas.find((d) => d.techId === "battery");
    const humanIdea = h.ws.getWorkbenchState().ideas.find((d) => d.techId === null);
    assert.ok(batteryIdea?.artUrl, "returned Idea kept its artwork");
    assert.equal(batteryIdea?.timingLevel, "green", "returned Idea kept its settled feasibility");
    assert.equal(h.ws.startPathwayFromIdea(batteryIdea.id), true);
    assert.equal(h.ws.addIdeaToPathway(humanIdea.id), true);
    const newPwId = Object.keys(h.board.pathways)[0];
    assert.equal(h.board.pathways[newPwId].ingredients.length, 2);
    await new Promise((r) => setTimeout(r, 15));
    // Battery already had settled green timing; only Human step needed assessment -> at most +1 call
    assert.ok(feasibilityCalls <= feasibilityAfterFirstBuild + 1);

    // 8. SIT & Roadblock SCAMPER remix still work seamlessly
    h.ws.remixInWorkbench("pathway", newPwId, "sit");
    const sitAll = await h.ws.dealWorkbenchAiIdeas("all");
    assert.equal(sitAll.length, 4);

    const crisisId = Object.keys(h.board.crises)[0];
    await h.ws.plug(newPwId, crisisId);
    await h.ws.summonNextChallenger();
    const chId = Object.keys(h.board.challengers)[0];
    assert.equal(h.ws.remixRoadblockInWorkbench(chId), true);
    assert.equal(h.ws.getWorkbenchState().diamond, "solution");
    assert.equal(h.ws.getWorkbenchState().method, "scamper");
    assert.match(h.root.innerHTML, /wb-challenger-banner/);

    h.ws.closeWorkbench();
    assert.equal(h.ws.getWorkbenchState().open, false);
  });

  it("refuses to return ideas that would not fit and keeps every card when they do", () => {
    const toasts = [];
    const h = harness({
      api: { flashToast: (msg) => toasts.push(String(msg)) },
    });
    h.ws.seedFromMission({
      place: "Paddy Step Wells",
      pressure: { "Clean Water": 3 },
      spotlight: { techId: "drones" },
    });
    const first = h.ws.addPlayerWorkbenchIdea({
      title: "Sluice scout",
      howText: "A drone maps the silted sluice before the next irrigation turn.",
      techId: "drones",
      world: "atoms",
    });
    const second = h.ws.addPlayerWorkbenchIdea({
      title: "Gate ledger",
      howText: "Stewards sign the gate log before any flight leaves the pad.",
      techId: null,
      world: "plain",
    });
    assert.equal(h.ws.startPathwayFromIdea(first.id), true);
    const pwId = Object.keys(h.board.pathways)[0];
    assert.equal(h.ws.addIdeaToPathway(second.id, pwId), true);
    assert.equal(h.board.pathways[pwId].ingredients.length, 2);

    for (let i = 0; i < 23; i++) {
      const idea = h.ws.addPlayerWorkbenchIdea({
        title: `Spare idea ${i}`,
        howText: `Local stewards keep spare idea ${i} ready beside the well.`,
        techId: null,
        world: "plain",
      });
      assert.ok(idea, `filler ${i}`);
    }
    assert.equal(h.ws.getWorkbenchState().ideas.length, 23);

    toasts.length = 0;
    assert.equal(h.ws.breakPathwayIntoIdeas(pwId), false);
    assert.equal(h.board.pathways[pwId].ingredients.length, 2);
    assert.equal(h.ws.getWorkbenchState().ideas.length, 23);
    assert.match(toasts.at(-1) || "", /room for 1 more/);

    const plainId = h.board.pathways[pwId].ingredients.find((i) => !i.techId).id;
    assert.equal(h.ws.returnIngredientToIdeas(pwId, plainId), true);
    assert.equal(h.board.pathways[pwId].ingredients.length, 1);
    assert.equal(h.ws.getWorkbenchState().ideas.length, 24);
    assert.ok(h.ws.getWorkbenchState().ideas.some((d) => d.title === "Gate ledger"));

    const leftId = h.board.pathways[pwId].ingredients[0].id;
    toasts.length = 0;
    assert.equal(h.ws.returnIngredientToIdeas(pwId, leftId), false);
    assert.equal(h.board.pathways[pwId].ingredients.length, 1);
    assert.equal(h.ws.getWorkbenchState().ideas.length, 24);
    assert.match(toasts.at(-1) || "", /Ideas tray is full/);

    const spare = h.ws.getWorkbenchState().ideas.find((d) => d.title.startsWith("Spare idea"));
    assert.equal(h.ws.deleteWorkbenchIdea(spare.id), true);
    toasts.length = 0;
    assert.equal(h.ws.breakPathwayIntoIdeas(pwId), true);
    assert.equal(h.board.pathways[pwId], undefined);
    assert.equal(h.ws.getWorkbenchState().ideas.length, 24);
    assert.match(toasts.at(-1) || "", /Returned 1 idea/);
    assert.ok(h.ws.getWorkbenchState().ideas.some((d) => d.title === "Sluice scout"));
  });

  it("drops a woven pathway mechanism when an idea is added or returned", () => {
    const h = harness();
    h.ws.seedFromMission({
      place: "Sablewick",
      pressure: { "Hidden Leaks": 3 },
      spotlight: { techId: "drones" },
    });
    const a = h.ws.addPlayerWorkbenchIdea({
      title: "Morning plume board",
      howText: "Ines ranks the top five methane plumes each clear morning.",
      techId: "drones",
      world: "atoms",
    });
    const b = h.ws.addPlayerWorkbenchIdea({
      title: "Valve seal check",
      howText: "The next clear pass confirms every sealed valve stays tight.",
      techId: null,
      world: "plain",
    });
    assert.equal(h.ws.startPathwayFromIdea(a.id), true);
    const pwId = Object.keys(h.board.pathways)[0];
    h.ws.openWorkbench({ diamond: "solution" });
    h.board.pathways[pwId].customHow = "Woven: trucks go to the largest plumes only.";
    h.ws.paint();
    assert.match(h.root.innerHTML, /Woven: trucks go to the largest plumes only/);

    assert.equal(h.ws.addIdeaToPathway(b.id, pwId), true);
    assert.equal(h.board.pathways[pwId].customHow, "");
    assert.doesNotMatch(h.root.innerHTML, /Woven: trucks go to the largest plumes only/);
    assert.match(
      h.root.innerHTML,
      /<p class="wb-pw-how">Ines ranks the top five methane plumes each clear morning\.[\s\S]*The next clear pass confirms every sealed valve stays tight\.<\/p>/
    );

    h.board.pathways[pwId].customHow = "Woven again after both ideas.";
    h.ws.paint();
    const plainId = h.board.pathways[pwId].ingredients.find((i) => !i.techId).id;
    assert.equal(h.ws.returnIngredientToIdeas(pwId, plainId), true);
    assert.equal(h.board.pathways[pwId].customHow, "");
    assert.doesNotMatch(h.root.innerHTML, /Woven again after both ideas/);
    assert.match(
      h.root.innerHTML,
      /<p class="wb-pw-how">Ines ranks the top five methane plumes each clear morning\.<\/p>/
    );
  });

  it("refuses a two-tech mint when the combined bill does not fit and leaves the board unbilled", () => {
    const bills = [];
    const flashes = [];
    const h = harness({
      api: {
        canPlaceInventions: (tiles) => {
          const ids = tiles.map((t) => t.techId);
          if (ids.length > 1) return { ok: false, error: "no_budget", techId: ids[1] };
          return { ok: true };
        },
        reconcileStackFromBoard: (ids) => {
          bills.push([...ids]);
          return { ok: true };
        },
        flashUnaffordableTech: (id, error) => flashes.push({ id, error }),
      },
    });
    h.ws.seedFromMission({
      place: "Paddy Step Wells",
      pressure: { "Clean Water": 4 },
      spotlight: { techId: "drones" },
    });
    const before = Object.keys(h.board.pathways).length;
    const billsBefore = bills.length;
    const idea = h.ws.addPlayerWorkbenchIdea({
      title: "Drone battery loop",
      howText: "Battery racks keep the mapped drones flying over the wells all afternoon.",
      techId: "drones",
      secondaryTechId: "battery",
    });
    assert.ok(idea);
    assert.equal(h.ws.mintWorkbenchIdea(idea.id), false);
    assert.equal(bills.length, billsBefore);
    assert.equal(Object.keys(h.board.pathways).length, before);
    assert.deepEqual(flashes[0], { id: "battery", error: "no_budget" });
    assert.ok(h.ws.getWorkbenchState().drafts.some((d) => d.id === idea.id));
  });

  it("highlights only the specific hovered Crisis card (not all of Lane 4) during Pathway drag-and-drop", () => {
    const listeners = {};
    const makeEl = (attrs = {}, parent = null) => {
      const cls = new Set();
      const el = {
        attrs: { ...attrs },
        parent,
        classList: {
          add: (c) => cls.add(c),
          remove: (c) => cls.delete(c),
          contains: (c) => cls.has(c),
        },
        getAttribute: (k) => (k in el.attrs ? el.attrs[k] : null),
        hasAttribute: (k) => k in el.attrs,
        contains: (other) => {
          let cur = other;
          while (cur) {
            if (cur === el) return true;
            cur = cur.parent || null;
          }
          return false;
        },
        closest: (sel) => {
          const checks = sel.split(",").map((s) => s.trim());
          let cur = el;
          while (cur) {
            for (const c of checks) {
              const m = c.match(/^\[([^=\]]+)(?:=['"]?([^'"\]]+)['"]?)?\]$/);
              if (m) {
                const [, attr, val] = m;
                if (val === undefined ? cur.hasAttribute(attr) : cur.getAttribute(attr) === val) {
                  return cur;
                }
              }
            }
            cur = cur.parent || null;
          }
          return null;
        },
      };
      return el;
    };

    const problemLane = makeEl({ "data-lane": "problem", "data-drop": "crisis" });
    const crisis1 = makeEl({ "data-crisis-id": "c-1", "data-drop": "crisis" }, problemLane);
    const crisis2 = makeEl({ "data-crisis-id": "c-2", "data-drop": "crisis" }, problemLane);
    const pwCard = makeEl({ "data-pathway-id": "pw-1", "data-drop": "pathway" });
    problemLane.querySelectorAll = (s) => (s === "[data-crisis-id]" ? [crisis1, crisis2] : []);
    const allEls = [problemLane, crisis1, crisis2, pwCard];

    let board = null;
    const rootCls = new Set();
    const root = {
      innerHTML: "",
      classList: {
        add: (c) => rootCls.add(c),
        remove: (c) => rootCls.delete(c),
        contains: (c) => rootCls.has(c),
      },
      addEventListener: (type, fn) => {
        listeners[type] = fn;
      },
      querySelector: () => null,
      querySelectorAll: (sel) =>
        sel === ".is-drop-hover" ? allEls.filter((e) => e.classList.contains("is-drop-hover")) : [],
      contains: () => true,
    };

    const ws = createPathwayWorkshop({
      $: (sel) => (sel === "#ontology-board" ? root : null),
      getBoard: () => board,
      setBoard: (b) => { board = b; },
      getYear: () => 2026,
      getMission: () => ({
        place: "Steamholt",
        pressure: { "Wasted Brine": 3, "Truck Feedstock": 2 },
      }),
      getPlace: () => "Steamholt",
      canPlaceInvention: () => ({ ok: true }),
      reconcileStackFromBoard: () => ({ ok: true }),
      grantPathwayEase: () => {},
    });
    ws.seedFromMission({
      place: "Steamholt",
      pressure: { "Wasted Brine": 3, "Truck Feedstock": 2 },
    });
    // Add a real Pathway + read actual seeded Crisis IDs so drop connects a real wire
    const idea = ws.addPlayerWorkbenchIdea({
      title: "Local Relay",
      howText: "Local stewards coordinate dispatch.",
      world: "plain",
    });
    ws.mintWorkbenchIdea(idea.id);
    const realPwId = Object.keys(board.pathways)[0];
    const [realCrisisId1, realCrisisId2] = Object.keys(board.crises);
    const realPwCard = makeEl({ "data-pathway-id": realPwId, "data-drop": "pathway" });
    const realCrisis1 = makeEl({ "data-crisis-id": realCrisisId1, "data-drop": "crisis" }, problemLane);
    const realCrisis2 = makeEl({ "data-crisis-id": realCrisisId2, "data-drop": "crisis" }, problemLane);
    const realCrisis2Child = makeEl({}, realCrisis2);
    problemLane.querySelectorAll = (s) =>
      s === "[data-crisis-id]" ? [realCrisis1, realCrisis2] : [];
    allEls.push(realPwCard, realCrisis1, realCrisis2, realCrisis2Child);

    const dataStore = {};
    const dt = {
      effectAllowed: "none",
      dropEffect: "none",
      setData: (k, v) => { dataStore[k] = v; },
      getData: (k) => dataStore[k] || "",
    };

    // Start dragging Pathway
    listeners.dragstart({ target: realPwCard, dataTransfer: dt });
    assert.equal(rootCls.has("is-dragging-pathway"), true);
    assert.equal(dt.effectAllowed, "all");

    // Dragging over Lane 4 empty gutter must NOT highlight the whole lane
    let prevented = false;
    listeners.dragover({
      target: problemLane,
      dataTransfer: dt,
      preventDefault: () => { prevented = true; },
    });
    assert.equal(prevented, false);
    assert.equal(problemLane.classList.contains("is-drop-hover"), false);

    // Dragging over Crisis 1 highlights ONLY Crisis 1
    prevented = false;
    listeners.dragover({
      target: realCrisis1,
      dataTransfer: dt,
      preventDefault: () => { prevented = true; },
    });
    assert.equal(prevented, true);
    assert.equal(dt.dropEffect, "move");
    assert.equal(realCrisis1.classList.contains("is-drop-hover"), true);
    assert.equal(realCrisis2.classList.contains("is-drop-hover"), false);
    assert.equal(problemLane.classList.contains("is-drop-hover"), false);

    // Moving to Crisis 2 clears Crisis 1 and highlights ONLY Crisis 2
    listeners.dragover({
      target: realCrisis2Child,
      dataTransfer: dt,
      preventDefault: () => {},
    });
    assert.equal(realCrisis1.classList.contains("is-drop-hover"), false);
    assert.equal(realCrisis2.classList.contains("is-drop-hover"), true);
    assert.equal(problemLane.classList.contains("is-drop-hover"), false);

    // Dropping on Crisis 2 (even if browser overwrote text/plain!) MUST plug the wire
    let dropPrevented = false;
    listeners.drop({
      target: realCrisis2Child,
      dataTransfer: { getData: () => "data:image/jpeg;base64,abc" },
      preventDefault: () => { dropPrevented = true; },
    });
    assert.equal(dropPrevented, true);
    assert.equal(rootCls.has("is-dragging-pathway"), false);
    assert.equal(realCrisis2.classList.contains("is-drop-hover"), false);
    const wires = Object.values(board.wires);
    assert.equal(wires.length, 1, "drop must connect Pathway to Crisis 2");
    assert.equal(wires[0].pathwayId, realPwId);
    assert.equal(wires[0].crisisId, realCrisisId2);
  });

  it("wires direct Lane 1 Tech -> Lane 3 Pathway ports and chain edges when a Pathway skips Lane 2 Use Cases", () => {
    const view = {
      year: 2026,
      trace: { type: "pathway", id: "pw-conv" },
      tracks: [
        { techId: "drones", name: "Drones", world: "atoms", milestones: [] },
        { techId: "iot", name: "Internet of Things", world: "split", milestones: [] },
      ],
      useCases: [],
      pathways: [
        {
          id: "pw-conv",
          title: "Drone + IoT sensors",
          howText: "Sensors on drones guide delivery.",
          timingLevel: "green",
          timingPct: 76,
          ingredients: [
            { id: "ing-1", techId: "drones", title: "Drones", world: "atoms", useCaseIds: [] },
            { id: "ing-2", techId: "iot", title: "IoT", world: "split", useCaseIds: [] },
          ],
          convergences: [],
        },
      ],
      crises: [{ id: "cr-1", role: "local", name: "Blood Too Late", lamp: "yellow" }],
      wires: [{ id: "w-1", pathwayId: "pw-conv", crisisId: "cr-1", lamp: "yellow" }],
    };

    const hl = resolveChainHighlight(view);
    assert.ok(hl);
    assert.equal(hl.tier2Edges.has("tech:drones->pw-conv"), true);
    assert.equal(hl.tier2Edges.has("tech:iot->pw-conv"), true);

    const html = renderOntologyBoard(view);
    assert.match(html, /data-port-pw-in="pw-conv"[^>]*data-from-techs="drones,iot"/);
    assert.match(html, /is-tech-port is-lit is-chain-lit" data-port-tech="drones"/);
    assert.match(html, /is-tech-port is-lit is-chain-lit" data-port-tech="iot"/);
    assert.match(html, /is-in is-lit is-chain-lit" data-port-pw-in="pw-conv"/);
  });

  it("scores only the newly plugged crisis when connecting an unchanged Pathway to a second crisis", async () => {
    const scoreCalls = [];
    const easeGrants = [];
    let releaseSecond = null;
    const h = harness({
      api: {
        coInvent: async (mode, _text, ctx) => {
          if (mode === "idea-sparks") {
            return {
              ideas: [
                {
                  id: "spark-1",
                  title: "Clinic Delivery Relay",
                  howText: "Battery drones fly pre-packed blood kits directly to rural clinics.",
                },
              ],
            };
          }
          if (mode === "score-pathway") {
            const roles = (ctx?.crisisRoles || []).map((c) => c.role);
            scoreCalls.push(roles);
            if (scoreCalls.length === 1) {
              return {
                crisisDelta: { local: -1 },
                crisisReasons: { local: "First crisis settled reason." },
              };
            }
            return new Promise((resolve) => {
              const r2 = roles[0] || "global";
              releaseSecond = () =>
                resolve({
                  crisisDelta: { [r2]: -1 },
                  crisisReasons: { [r2]: "Second crisis settled reason." },
                });
            });
          }
          return {};
        },
        grantPathwayEase: (opts) => easeGrants.push(opts),
      },
    });
    h.ws.seedFromMission({
      place: "Brackenfold",
      pressure: { "Blood Too Late": 3, "Cut-Off Districts": 2, "Blood Bank Doubt": 2 },
      spotlight: { techId: "drones" },
    });
    const drones = resolveTechTrack("drones");
    const reached = drones.milestones.find((m) => m.status === "reached" && m.year <= 2026);
    h.ws.dealMilestone("drones", reached.id);
    await h.ws.askForIdeas();
    h.ws.placeSpark("spark-1");

    const pwId = Object.keys(h.board.pathways)[0];
    const [crisis1Id, crisis2Id] = Object.keys(h.board.crises);
    const role1 = h.board.crises[crisis1Id].role;
    const role2 = h.board.crises[crisis2Id].role;

    // 1. Plug into Crisis 1
    await h.ws.plug(pwId, crisis1Id);
    assert.deepEqual(scoreCalls, [[role1]]);
    assert.equal(easeGrants.length, 1);
    assert.deepEqual(easeGrants[0].crisisDelta, { [role1]: -1 });
    const fp = Object.keys(h.board.pathwayImpacts)[0];
    assert.equal(h.board.pathwayImpacts[fp].crisisReasons[role1], "First crisis settled reason.");

    // 2. Plug same unchanged Pathway into Crisis 2
    const pendingSecond = h.ws.plug(pwId, crisis2Id);
    assert.equal(typeof releaseSecond, "function");

    // While Crisis 2 is scoring: ONLY Crisis 2 was sent to score-pathway, AND Crisis 1 stays settled (not re-scoring)!
    assert.deepEqual(scoreCalls, [[role1], [role2]]);
    assert.equal(h.board.crises[crisis1Id].delta, -1);
    assert.match(h.root.innerHTML, /First crisis settled reason\./);
    const scoringMatches = [...h.root.innerHTML.matchAll(/Scoring…/g)];
    assert.equal(scoringMatches.length, 1, "only the newly connected crisis wire should show Scoring…");

    // Resolve Crisis 2
    releaseSecond();
    await pendingSecond;
    assert.equal(h.board.pathwayImpacts[fp].crisisDelta[role1], -1);
    assert.equal(h.board.pathwayImpacts[fp].crisisDelta[role2], -1);
    assert.equal(h.board.pathwayImpacts[fp].crisisReasons[role1], "First crisis settled reason.");
    assert.equal(h.board.pathwayImpacts[fp].crisisReasons[role2], "Second crisis settled reason.");
    assert.equal(h.board.pathwayImpacts[fp].pending, false);
    assert.equal(easeGrants.length, 2);
    assert.deepEqual(easeGrants[1].crisisDelta, { [role2]: -1 }, "ease is granted only for the newly scored crisis");

    // 3. Unplugging and re-plugging Crisis 2 uses the cached score with ZERO model calls
    const wire2 = Object.values(h.board.wires).find((w) => w.crisisId === crisis2Id);
    await h.ws.unplug(wire2.id);
    await h.ws.plug(pwId, crisis2Id);
    assert.deepEqual(scoreCalls, [[role1], [role2]], "re-plugging an unchanged pathway makes no extra score call");
  });

  it("sends settled timing and pathway assessments to fact-check-argument and rescores on accept", async () => {
    const factChecks = [];
    const scoreArgsSeen = [];
    let apCharges = 0;
    const h = harness({
      api: {
        spendArgumentAp: () => {
          apCharges += 1;
          return { ok: true };
        },
        coInvent: async (mode, _text, ctx) => {
          if (mode === "idea-sparks") {
            return {
              ideas: [
                {
                  id: "spark-1",
                  title: "Flying Car Shuttle",
                  howText: "Flying car, so people do not need a road network.",
                },
              ],
            };
          }
          if (mode === "score-pathway") {
            scoreArgsSeen.push(ctx?.acceptedArguments || []);
            const role = ctx?.crisisRoles?.[0]?.role || "local";
            return {
              crisisDelta: { [role]: (ctx?.acceptedArguments || []).length ? -1 : 0 },
              crisisReasons: {
                [role]: (ctx?.acceptedArguments || []).length
                  ? "Accepted 2026 certification case shifts score."
                  : "Flying cars are not a 2026 way to move blood bags.",
              },
            };
          }
          if (mode === "fact-check-argument") {
            factChecks.push(ctx);
            return {
              verdict: "accept",
              reason: "Commercial light eVTOL air-taxi corridors began certified flights in 2026.",
            };
          }
          return {};
        },
      },
    });
    h.ws.seedFromMission({
      place: "Brackenfold",
      pressure: { "Blood Too Late": 3, "Cut-Off Districts": 2 },
      spotlight: { techId: "drones" },
    });
    const drones = resolveTechTrack("drones");
    const reached = drones.milestones.find((m) => m.status === "reached" && m.year <= 2026);
    h.ws.dealMilestone("drones", reached.id);
    await h.ws.askForIdeas();
    h.ws.placeSpark("spark-1");

    const pwId = Object.keys(h.board.pathways)[0];
    const crisisId = Object.keys(h.board.crises)[0];
    await h.ws.plug(pwId, crisisId);

    const res = await h.ws.submitArgument(
      pwId,
      "Certified commercial eVTOL point-to-point shuttles already operate in 2026."
    );
    assert.equal(apCharges, 1);
    assert.equal(res?.verdict, "accept");
    assert.equal(factChecks.length, 1);
    assert.ok(factChecks[0].assessments, "fact-check-argument must receive assessments");
    assert.ok(factChecks[0].assessments.timings.length >= 1, "settled timing assessment included");
    assert.equal(factChecks[0].assessments.pathways.length, 1, "settled pathway assessment included");
    assert.match(
      Object.values(factChecks[0].assessments.pathways[0].crisisReasons)[0],
      /Flying cars are not a 2026 way/
    );
    // Accepted argument triggers a rescore that includes the accepted claim
    assert.equal(scoreArgsSeen.length, 2);
    assert.deepEqual(scoreArgsSeen[1], [
      "Certified commercial eVTOL point-to-point shuttles already operate in 2026.",
    ]);
  });

  it("unwraps nested timing payloads and never copies HTTP 429 error messages into timingReason", async () => {
    let callIdx = 0;
    const h = harness({
      api: {
        coInvent: async (mode) => {
          if (mode === "assess-feasibility" || mode === "assess-plain") {
            callIdx += 1;
            if (callIdx === 1) {
              return {
                source: "ai",
                timing: {
                  level: "red",
                  reason: "Consumer flying cars are not deployed at routine scale in 2026.",
                },
              };
            }
            return {
              error: "in_flight",
              message: "Previous requests are still finishing.",
            };
          }
          return {};
        },
      },
    });
    h.ws.seedFromMission({
      place: "Brackenfold",
      pressure: { "Blood Too Late": 3 },
      spotlight: { techId: "drones" },
    });

    const i1 = h.ws.addPlayerWorkbenchIdea({
      title: "Flying car shuttle",
      howText: "Every villager flies a personal car over the ridge.",
      techId: "drones",
      world: "atoms",
    });
    const i2 = h.ws.addPlayerWorkbenchIdea({
      title: "Hospital pad courier",
      howText: "Nurse checks incoming medical pack on the ward pad.",
      techId: null,
      world: "plain",
    });
    h.ws.startPathwayFromIdea(i1.id);
    await new Promise((r) => setTimeout(r, 15));
    const pwId = Object.keys(h.board.pathways)[0];
    assert.equal(h.board.pathways[pwId].ingredients[0].timingLevel, "red");
    assert.match(
      h.board.pathways[pwId].ingredients[0].timingReason,
      /Consumer flying cars are not deployed/
    );

    h.ws.startPathwayFromIdea(i2.id);
    await new Promise((r) => setTimeout(r, 15));
    const pw2Id = Object.keys(h.board.pathways).find((id) => id !== pwId);
    assert.doesNotMatch(
      h.board.pathways[pw2Id].ingredients[0].timingReason || "",
      /Previous requests are still finishing/
    );
  });

  it("renders direct add buttons for every existing Pathway (#1, #2, etc.) on each Idea card", () => {
    const h = harness();
    h.ws.seedFromMission({
      place: "Sablewick",
      pressure: { "Hidden Leaks": 3 },
      spotlight: { techId: "drones" },
    });
    h.ws.openWorkbench({ diamond: "solution" });

    const a = h.ws.addPlayerWorkbenchIdea({
      title: "Morning plume board",
      howText: "Ines sorts satellite methane flags every morning.",
      techId: "drones",
      world: "atoms",
    });
    const b = h.ws.addPlayerWorkbenchIdea({
      title: "Giant plume shortlist",
      howText: "Crew ranks the top five methane leaks across the district.",
      techId: "drones",
      world: "atoms",
    });
    const c = h.ws.addPlayerWorkbenchIdea({
      title: "Next-clear fix check",
      howText: "Re-scan sealed wellheads on the next clear satellite pass.",
      techId: null,
      world: "plain",
    });

    assert.equal(h.ws.startPathwayFromIdea(a.id), true);
    assert.equal(h.ws.startPathwayFromIdea(b.id), true);
    const [pw1Id, pw2Id] = Object.keys(h.board.pathways);
    assert.ok(pw1Id && pw2Id);

    // Remaining Idea card must offer direct 1-click buttons for BOTH Pathway #1 and Pathway #2, plus + New
    assert.match(
      h.root.innerHTML,
      new RegExp(`data-action="wb-add-to-pathway" data-idea-id="${c.id}" data-pathway-id="${pw1Id}"[^>]*>\\+ Pathway #1<`)
    );
    assert.match(
      h.root.innerHTML,
      new RegExp(`data-action="wb-add-to-pathway" data-idea-id="${c.id}" data-pathway-id="${pw2Id}"[^>]*>\\+ Pathway #2<`)
    );
    assert.match(h.root.innerHTML, /\+ New/);

    // Clicking + Pathway #1 adds directly to Pathway #1 while leaving Pathway #2 at 1 idea
    assert.equal(h.ws.addIdeaToPathway(c.id, pw1Id), true);
    assert.equal(h.board.pathways[pw1Id].ingredients.length, 2);
    assert.equal(h.board.pathways[pw2Id].ingredients.length, 1);
  });

  it("scopes Diamond 1 AI working indicators to the clicked column and lets players remove and restore HMW framings", async () => {
    let resolveDefine = null;
    let resolveDiscover = null;
    const h = harness({
      api: {
        coInvent: async (mode, _prompt, ctx) => {
          if (mode === "workbench-lens" && ctx?.method === "define") {
            return await new Promise((r) => {
              resolveDefine = r;
            });
          }
          if (mode === "workbench-lens" && ctx?.method === "discover") {
            return await new Promise((r) => {
              resolveDiscover = r;
            });
          }
          return { ideas: [] };
        },
      },
    });

    h.ws.seedFromMission({
      place: "Sablewick",
      stakeholder: "Ines Karaman, who runs Sablewick's only leak-repair crew",
      pressure: { "Hidden Leaks": 3, "Trapped Heat": 3, "Nobody Answers": 2 },
      spotlight: { techId: "drones" },
    });
    h.ws.openWorkbench({ diamond: "problem" });

    // 1) Click Draft HMW Options (AI) on the right: indicator MUST appear in Define, NOT Discover
    const definePromise = h.ws.dealHmwOptionsAi();
    assert.equal(h.ws.getWorkbenchState().busy, true);
    assert.equal(h.ws.getWorkbenchState().busyKind, "define");
    const defineHtml = h.root.innerHTML;
    assert.match(defineHtml, /class="ontology-link-btn wb-hmw-ai-btn is-busy"[^>]*>[\s\S]*Drafting…/);
    assert.match(defineHtml, /Drafting "How Might We…" problem frames…/);
    assert.match(defineHtml, /✨ Unpack Hidden Tensions \(AI\)/);
    assert.doesNotMatch(defineHtml, /Unpacking…/);
    assert.doesNotMatch(defineHtml, /Unpacking hidden ground tensions…/);

    resolveDefine({
      ideas: [
        {
          title: "False tip filter",
          howText: "How might we help Ines skip false rumors before burning a full truck day?",
        },
        {
          title: "Silent wellhead accountability",
          howText: "How might we get operators to claim leaking pads without triggering silence?",
        },
      ],
    });
    const addedHmw = await definePromise;
    assert.equal(addedHmw.length, 2);
    assert.equal(h.ws.getWorkbenchState().busy, false);
    assert.equal(h.ws.getWorkbenchState().busyKind, null);

    // 2) Click Unpack Hidden Tensions (AI) on the left: indicator MUST appear in Discover, NOT Define
    const discoverPromise = h.ws.dealDiscoveryInsightsAi();
    assert.equal(h.ws.getWorkbenchState().busyKind, "discover");
    const discoverHtml = h.root.innerHTML;
    assert.match(discoverHtml, /Unpacking…/);
    assert.match(discoverHtml, /Unpacking hidden ground tensions…/);
    assert.match(discoverHtml, /✨ Draft HMW Options \(AI\)/);
    assert.doesNotMatch(discoverHtml, /Drafting…/);
    assert.doesNotMatch(discoverHtml, /Drafting "How Might We…" problem frames…/);

    resolveDiscover({
      ideas: [
        {
          title: "Unpaved access bottleneck",
          howText: "Mud washes out the north road for three months every winter.",
        },
      ],
    });
    await discoverPromise;

    // 3) Every HMW card exposes a removable × button; removing the selected HMW clears the brief
    assert.match(h.root.innerHTML, /data-action="wb-remove-hmw"/);
    const selectedText = addedHmw[0].howText;
    assert.equal(h.ws.getWorkbenchState().hmwBrief, selectedText);

    assert.equal(h.ws.removeHmwOption(addedHmw[0].id, selectedText), true);
    assert.equal(h.ws.getWorkbenchState().hmwBrief, "");
    assert.doesNotMatch(h.root.innerHTML, /skip false rumors before burning a full truck day/);

    // Remove remaining HMW options until empty -> Restore defaults appears and restores defaults
    let guard = 0;
    while (h.root.innerHTML.includes('data-action="wb-remove-hmw"') && guard < 12) {
      guard += 1;
      const m = h.root.innerHTML.match(
        /data-action="wb-remove-hmw" data-hmw-id="([^"]*)" data-hmw="([^"]*)"/
      );
      assert.ok(m, "expected removable HMW button attributes");
      const unesc = (s) =>
        s.replaceAll("&quot;", '"').replaceAll("&#39;", "'").replaceAll("&amp;", "&");
      assert.equal(h.ws.removeHmwOption(unesc(m[1]), unesc(m[2])), true);
    }
    assert.doesNotMatch(h.root.innerHTML, /data-action="wb-remove-hmw"/);
    assert.match(h.root.innerHTML, /data-action="wb-restore-hmw"[^>]*>Restore defaults</);

    assert.equal(h.ws.restoreDismissedHmw(), true);
    assert.match(h.root.innerHTML, /data-action="wb-remove-hmw"/);
  });

  it("always shows the full Pathway mechanism description on Workbench Pathway cards without requiring Edit mechanism", () => {
    const h = harness();
    h.ws.seedFromMission({
      place: "Sablewick",
      pressure: { "Hidden Leaks": 3 },
      spotlight: { techId: "drones" },
    });
    h.ws.openWorkbench({ diamond: "solution" });

    const a = h.ws.addPlayerWorkbenchIdea({
      title: "Morning plume board",
      howText:
        "Each clear morning Ines opens free public satellite methane alerts and ranks the top five plumes so her two trucks stop wasting full days on rumors.",
      techId: "drones",
      world: "atoms",
    });
    const b = h.ws.addPlayerWorkbenchIdea({
      title: "Valve seal check",
      howText:
        "After a crew seals a wellhead, the next clear pass checks whether the plume vanished before marking the repair complete.",
      techId: null,
      world: "plain",
    });

    assert.equal(h.ws.startPathwayFromIdea(a.id), true);
    const pwId = Object.keys(h.board.pathways)[0];
    assert.ok(pwId);

    // Full mechanism text must be visible directly inside .wb-pw-how without clicking Edit mechanism
    assert.match(h.root.innerHTML, /<div class="wb-pw-how-wrap">/);
    assert.match(
      h.root.innerHTML,
      /<p class="wb-pw-how">Each clear morning Ines opens free public satellite methane alerts and ranks the top five plumes so her two trucks stop wasting full days on rumors\.<\/p>/
    );
    assert.doesNotMatch(h.root.innerHTML, /data-role="pathway-how-input"/);

    // Combining a second idea immediately shows both parts in .wb-pw-how
    assert.equal(h.ws.addIdeaToPathway(b.id, pwId), true);
    assert.match(
      h.root.innerHTML,
      /<p class="wb-pw-how">Each clear morning Ines opens free public satellite methane alerts[\s\S]*After a crew seals a wellhead, the next clear pass checks whether the plume vanished before marking the repair complete\.<\/p>/
    );

    // Custom/woven Pathway mechanism shows visibly with the Edited pill without entering edit mode
    h.board.pathways[pwId].customHow =
      "Satellite alerts dispatch Ines's two trucks to the largest plumes first, and the next clear pass confirms every sealed valve stays tight.";
    h.ws.paint();
    assert.match(
      h.root.innerHTML,
      /<span class="wb-pw-how-edited">Edited<\/span>/
    );
    assert.match(
      h.root.innerHTML,
      /<p class="wb-pw-how">Satellite alerts dispatch Ines's two trucks to the largest plumes first, and the next clear pass confirms every sealed valve stays tight\.<\/p>/
    );
  });

  it("collapses Tech, Pathway, Crisis, Workbench Pathway, and Workbench Idea cards independently to 1-line summary bars and auto-expands on interaction", async () => {
    const h = harness();
    h.ws.seedFromMission({
      place: "Brackenfold",
      pressure: { "Blood Too Late": 3, "Cut-Off Districts": 2 },
      spotlight: { techId: "drones" },
    });

    // Deal a milestone so a Use Case exists (Use Case cards must NOT have collapse chevrons)
    const drones = resolveTechTrack("drones");
    const reached = drones.milestones.find((m) => m.status === "reached" && m.year <= 2026);
    h.ws.dealMilestone("drones", reached.id);

    // Create a Pathway and an extra Workbench Idea
    const idea1 = h.ws.addPlayerWorkbenchIdea({
      title: "Ridge blood parachute drop",
      howText: "Fixed-wing drone drops insulated blood pack to hospital pad.",
      techId: "drones",
      world: "atoms",
    });
    const idea2 = h.ws.addPlayerWorkbenchIdea({
      title: "Ward pad nurse handoff",
      howText: "Charge nurse logs incoming temperature seal and carries unit to theater.",
      techId: null,
      world: "plain",
    });
    assert.equal(h.ws.startPathwayFromIdea(idea1.id), true);
    const pwId = Object.keys(h.board.pathways)[0];
    const crisisId = Object.keys(h.board.crises)[0];
    assert.ok(pwId && crisisId);

    // 4-lane view: Tech, Pathway, Crisis all start expanded with chevron buttons; Use Cases do not
    h.board.pathways[pwId].ingredients[0].artUrl = "https://example.test/pw-art.jpg";
    h.ws.closeWorkbench();
    assert.match(h.root.innerHTML, /data-collapse-key="tech:drones" aria-expanded="true"/);
    assert.match(h.root.innerHTML, new RegExp(`data-collapse-key="pathway:${pwId}" aria-expanded="true"`));
    assert.match(h.root.innerHTML, new RegExp(`data-collapse-key="crisis:${crisisId}" aria-expanded="true"`));
    assert.doesNotMatch(h.root.innerHTML, /data-collapse-key="usecase:/);
    // Pathway collapse toggle/header must always render ABOVE its art banner, never below the image
    const pwToggleIdx = h.root.innerHTML.indexOf(`data-collapse-key="pathway:${pwId}"`);
    const pwArtIdx = h.root.innerHTML.indexOf("https://example.test/pw-art.jpg");
    assert.ok(pwToggleIdx > 0 && pwArtIdx > pwToggleIdx, "Pathway collapse toggle should appear above its artwork");

    // Full feasibility rationale renders visibly in .ontology-timing-reason (not truncated inside the progress bar)
    const longRationale =
      "By 2026, free public satellite methane alerts already exist: UNEP's Methane Alert and Response System (MARS) has been operational since 2023 and flags large plumes globally.";
    h.board.pathways[pwId].ingredients[0].timingLevel = "green";
    h.board.pathways[pwId].ingredients[0].timingPct = 86;
    h.board.pathways[pwId].ingredients[0].timingReason = longRationale;
    h.board.pathways[pwId].ingredients[0].timingPending = false;
    h.ws.paint();
    assert.match(h.root.innerHTML, /<span class="ontology-timing-label">Honest for this year \(86%\)<\/span>/);
    assert.match(
      h.root.innerHTML,
      /<p class="ontology-timing-reason">By 2026, free public satellite methane alerts already exist: UNEP's Methane Alert and Response System \(MARS\) has been operational since 2023 and flags large plumes globally\.<\/p>/
    );

    // Collapse Tech card -> compact bar keeps data-port-tech lit and hides milestone rows
    assert.equal(h.ws.toggleCardCollapse("tech:drones"), true);
    assert.equal(h.ws.isCardCollapsed("tech", "drones"), true);
    assert.match(h.root.innerHTML, /class="ontology-card ontology-tech is-collapsed/);
    assert.match(h.root.innerHTML, /data-port-tech="drones"/);
    assert.doesNotMatch(h.root.innerHTML, /class="ontology-spine is-solid"/);

    // Collapse 4-lane Pathway card -> compact bar keeps both ports; Workbench Pathway stays expanded (independent!)
    assert.equal(h.ws.toggleCardCollapse(`pathway:${pwId}`), true);
    assert.match(h.root.innerHTML, /class="ontology-card ontology-pathway is-collapsed/);
    assert.match(h.root.innerHTML, new RegExp(`data-port-pw-in="${pwId}"`));
    assert.match(h.root.innerHTML, new RegExp(`data-port-pw-out="${pwId}"`));
    assert.doesNotMatch(h.root.innerHTML, /class="ontology-how-wrap"/);
    assert.equal(h.ws.isCardCollapsed("wb-pathway", pwId), false);

    // Collapse Crisis card -> compact bar keeps drop target + port; plugging auto-expands Crisis!
    assert.equal(h.ws.toggleCardCollapse(`crisis:${crisisId}`), true);
    assert.match(h.root.innerHTML, /class="ontology-card ontology-crisis is-collapsed/);
    assert.match(h.root.innerHTML, new RegExp(`data-port-crisis-in="${crisisId}"`));
    assert.match(h.root.innerHTML, new RegExp(`data-crisis-id="${crisisId}"[^>]*data-drop="crisis"`));
    assert.equal(await h.ws.plug(pwId, crisisId), true);
    assert.equal(h.ws.isCardCollapsed("crisis", crisisId), false);
    assert.doesNotMatch(
      h.root.innerHTML,
      new RegExp(`class="ontology-card ontology-crisis is-collapsed[^"]*" data-crisis-id="${crisisId}"`)
    );

    // Open Workbench -> Pathway is STILL expanded (independent of 4-lane collapse!), Idea starts expanded
    h.ws.openWorkbench({ diamond: "solution" });
    assert.match(h.root.innerHTML, new RegExp(`data-collapse-key="wb-pathway:${pwId}" aria-expanded="true"`));
    assert.match(h.root.innerHTML, new RegExp(`data-collapse-key="wb-idea:${idea2.id}" aria-expanded="true"`));

    // Collapse both Workbench Idea and Workbench Pathway
    assert.equal(h.ws.toggleCardCollapse(`wb-idea:${idea2.id}`), true);
    assert.match(h.root.innerHTML, /class="wb-idea-card is-collapsed/);
    assert.doesNotMatch(h.root.innerHTML, /class="wb-idea-main"/);

    assert.equal(h.ws.toggleCardCollapse(`wb-pathway:${pwId}`), true);
    assert.match(h.root.innerHTML, /class="wb-visual-pathway is-collapsed/);
    assert.doesNotMatch(h.root.innerHTML, /class="wb-pw-how-wrap"/);

    // Adding an Idea into the collapsed Workbench Pathway auto-expands it!
    assert.equal(h.ws.addIdeaToPathway(idea2.id, pwId), true);
    assert.equal(h.ws.isCardCollapsed("wb-pathway", pwId), false);
    assert.match(h.root.innerHTML, /class="wb-pw-how-wrap"/);

    // Session-only reset: seeding a new mission clears all collapsed states
    h.ws.seedFromMission({
      place: "Sablewick",
      pressure: { "Hidden Leaks": 3 },
      spotlight: { techId: "drones" },
    });
    assert.equal(h.ws.isCardCollapsed("tech", "drones"), false);
  });
});

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
  snapOf,
  resolveTourStep,
  queryTourTarget,
  createGuidedTour,
} from "./guided-tour.js";

function base(over = {}) {
  const briefing = { active: false, index: 0, beatCount: 4, ...(over.briefing || {}) };
  const mp = {
    spectator: false,
    viewingOther: false,
    hotseat: false,
    needPassDevice: false,
    ...(over.mp || {}),
  };
  const ui = { ...(over.ui || {}) };
  const wb = {
    open: false,
    diamond: "solution",
    busy: false,
    hasHmwBrief: false,
    hmwLocked: false,
    ideaCount: 0,
    ...(over.wb || {}),
  };
  return {
    screen: "workshop",
    place: "Tideglass",
    spotlightTechId: "gene-sequencing",
    spotlightName: "Gene sequencing",
    spotlightEncourage: "Invent on-site sequencing so clinics don't wait on a lab.",
    hasRecommended: true,
    suggestedIds: ["gene-sequencing"],
    isLearning: false,
    tutorOn: false,
    sideTab: "vision",
    tracks: 0,
    focusedTechId: null,
    focusedTechName: "",
    useCaseCount: 0,
    sparksCount: 0,
    writeOpen: false,
    draftHowLength: 0,
    pathwayCount: 0,
    primaryPathwayId: null,
    unpluggedCrisisId: null,
    unpluggedCrisisName: "",
    unpluggedCount: 0,
    redChallengerId: null,
    redChallengerCrisisId: null,
    challengerAnswerPending: false,
    timingLevel: "green",
    redPathwayId: null,
    hasEarlyForecastWire: false,
    redCrisisId: null,
    redCrisisName: "",
    redCrisisCount: 0,
    concernsOnBoard: 0,
    remainingConcerns: 1,
    concernsSummoned: false,
    boardHolds: false,
    ap: 3,
    apEnabled: true,
    isMultiplayer: false,
    budget: 5,
    budgetWillEnabled: true,
    ...over,
    briefing,
    mp,
    ui,
    wb,
  };
}

function idOf(snap) {
  return resolveTourStep(snap).id;
}

describe("snapOf", () => {
  it("normalizes missing fields and supports legacy pathway aliases", () => {
    const s = snapOf({
      suggestedIds: ["ai"],
      pathway: { timingLevel: "red", timingPending: true },
      workbench: { open: true, diamond: "problem", hmwBrief: "How might we?" },
    });
    assert.equal(s.hasRecommended, true);
    assert.equal(s.timingLevel, "red");
    assert.equal(s.ui.timingPending, true);
    assert.equal(s.wb.open, true);
    assert.equal(s.wb.diamond, "problem");
    assert.equal(s.wb.hasHmwBrief, true);
  });
});

describe("resolveTourStep", () => {
  it("M1 wait confirm beats everything else and skips dimmer", () => {
    const step = resolveTourStep(
      base({
        ui: { waitConfirmOpen: true, openChallengerId: "ch-1", pickerOpen: true },
        briefing: { active: true, index: 0, beatCount: 4 },
      })
    );
    assert.equal(step.id, "M1");
    assert.equal(step.target.selector, "#wait-confirm-ok");
    assert.equal(step.skipDimmer, true);
  });

  it("M2 roadblock modal distinguishes judging vs defend/remix", () => {
    const defend = resolveTourStep(base({ ui: { openChallengerId: "ch-1" } }));
    assert.equal(defend.id, "M2");
    assert.equal(defend.title, "Defend or remix");
    assert.equal(defend.target.selector, "#ontology-roadblock");
    assert.equal(defend.skipDimmer, true);

    const judging = resolveTourStep(
      base({ ui: { openChallengerId: "ch-1" }, challengerAnswerPending: true })
    );
    assert.equal(judging.id, "M2");
    assert.equal(judging.title, "Judging defense…");
    assert.equal(judging.skipDimmer, true);
  });

  it("M3 argument modal targets scrim form and skips dimmer", () => {
    const step = resolveTourStep(base({ ui: { argumentModalOpen: true } }));
    assert.equal(step.id, "M3");
    assert.equal(step.target.selector, ".ontology-modal-scrim form");
    assert.deepEqual(step.target.selectors, [
      ".ontology-modal-scrim form",
      ".ontology-modal-scrim",
    ]);
    assert.equal(step.skipDimmer, true);
  });

  it("M4 tech picker targets spotlight, recommended, or picker", () => {
    const spot = resolveTourStep(base({ ui: { pickerOpen: true } }));
    assert.equal(spot.id, "M4");
    assert.equal(spot.skipDimmer, true);
    assert.match(spot.title, /Gene sequencing/);
    assert.deepEqual(spot.target.selectors, [
      '#ontology-tech-picker [data-tech-id="gene-sequencing"]',
      "#ontology-tech-picker .tech-card.recommended",
      "#ontology-tech-picker",
    ]);

    const rec = resolveTourStep(
      base({ ui: { pickerOpen: true }, spotlightTechId: null, hasRecommended: true })
    );
    assert.equal(rec.id, "M4");
    assert.equal(rec.target.selector, "#ontology-tech-picker .tech-card.recommended");

    const any = resolveTourStep(
      base({
        ui: { pickerOpen: true },
        spotlightTechId: null,
        hasRecommended: false,
        suggestedIds: [],
      })
    );
    assert.equal(any.id, "M4");
    assert.equal(any.target.selector, "#ontology-tech-picker");
  });

  it("M5 covers summonBusy, challengerDrawOpen, createBusy, scoringPending, timingPending, wb.busy", () => {
    assert.equal(
      resolveTourStep(base({ ui: { summonBusy: true } })).target.selector,
      "#hex-challenger-draw"
    );
    assert.equal(
      resolveTourStep(base({ ui: { challengerDrawOpen: true } })).id,
      "M5"
    );
    assert.equal(
      resolveTourStep(base({ ui: { createBusy: true } })).target.selector,
      "#ontology-lane-pathway"
    );
    assert.equal(
      resolveTourStep(base({ wb: { open: true, busy: true } })).id,
      "M5"
    );
    assert.equal(
      resolveTourStep(base({ ui: { scoringPending: true } })).target.selector,
      "#ontology-lane-problem"
    );
    assert.equal(
      resolveTourStep(base({ ui: { timingPending: true } })).id,
      "M5"
    );
  });

  it("B1–B3 handle multiplayer spectator, viewingOther, and hotseat pass-device", () => {
    const b1 = resolveTourStep(base({ mp: { spectator: true } }));
    assert.equal(b1.id, "B1");
    assert.equal(b1.target.selector, "#mp-seat-tabs");

    const b2 = resolveTourStep(base({ mp: { viewingOther: true } }));
    assert.equal(b2.id, "B2");
    assert.equal(b2.target.selector, "#mp-seat-tabs");

    const b3 = resolveTourStep(
      base({ mp: { hotseat: true, needPassDevice: true } })
    );
    assert.equal(b3.id, "B3");
    assert.equal(b3.target.selector, "#btn-mp-workshop-end-turn");
  });

  it("C1 points at briefing Next, C2 at Start inventing on final beat", () => {
    const c1 = resolveTourStep(
      base({ briefing: { active: true, index: 0, beatCount: 4 } })
    );
    assert.equal(c1.id, "C1");
    assert.equal(c1.target.selector, '[data-brief="next"]');

    const c2 = resolveTourStep(
      base({ briefing: { active: true, index: 3, beatCount: 4 } })
    );
    assert.equal(c2.id, "C2");
    assert.equal(c2.target.selector, ".quest-briefing-invent");
  });

  it("D1 targets learning tutor with openSideTab coinventor when board is empty", () => {
    const step = resolveTourStep(base({ isLearning: true, tutorOn: true }));
    assert.equal(step.id, "D1");
    assert.equal(step.target.selector, "#co-inventor-root");
    assert.equal(step.openSideTab, "coinventor");

    // Once a tech track is added, move on to L2
    assert.equal(
      idOf(
        base({
          isLearning: true,
          tutorOn: true,
          tracks: 1,
          focusedTechId: "ai",
        })
      ),
      "L2"
    );
  });

  it("W1–W4 guide Double-Diamond Workbench stages in place", () => {
    const w1 = resolveTourStep(
      base({ wb: { open: true, diamond: "problem" } })
    );
    assert.equal(w1.id, "W1");
    assert.equal(w1.target.selector, '[data-action="wb-lock-hmw"]');

    const w2 = resolveTourStep(
      base({ wb: { open: true, diamond: "solution", ideaCount: 0 } })
    );
    assert.equal(w2.id, "W2");
    assert.equal(w2.target.selector, '[data-action="wb-deal-ai"]');

    const w3 = resolveTourStep(
      base({ wb: { open: true, diamond: "solution", ideaCount: 3 } })
    );
    assert.equal(w3.id, "W3");
    assert.equal(w3.target.selector, '[data-drop="wb-assemble-canvas"]');

    const w4Plug = resolveTourStep(
      base({
        wb: { open: true, diamond: "solution", ideaCount: 1 },
        pathwayCount: 1,
        unpluggedCount: 2,
      })
    );
    assert.equal(w4Plug.id, "W4");
    assert.equal(w4Plug.target.selector, ".wb-dock-right");

    const w4Collapse = resolveTourStep(
      base({
        wb: { open: true, diamond: "solution", ideaCount: 1 },
        pathwayCount: 1,
        unpluggedCount: 0,
      })
    );
    assert.equal(w4Collapse.id, "W4");
    assert.equal(w4Collapse.target.selector, "#btn-close-workbench");
  });

  it("L1–L5 walk the 4-lane causal chain", () => {
    const l1 = resolveTourStep(base());
    assert.equal(l1.id, "L1");
    assert.equal(l1.target.selector, "#btn-add-tech");

    const l2 = resolveTourStep(
      base({
        tracks: 1,
        focusedTechId: "gene-sequencing",
        focusedTechName: "Gene sequencing",
      })
    );
    assert.equal(l2.id, "L2");
    assert.equal(
      l2.target.selector,
      '#ontology-lane-tech [data-action="deal-milestone"].is-latest-reached'
    );
    assert.deepEqual(l2.expandCard, { kind: "tech", id: "gene-sequencing" });

    const l3 = resolveTourStep(
      base({ tracks: 1, useCaseCount: 2, sparksCount: 3 })
    );
    assert.equal(l3.id, "L3");
    assert.equal(l3.target.selector, "#ontology-sparks");

    const l4Write = resolveTourStep(
      base({
        tracks: 1,
        useCaseCount: 2,
        writeOpen: true,
        draftHowLength: 20,
      })
    );
    assert.equal(l4Write.id, "L4");
    assert.equal(l4Write.title, "Form Pathway");
    assert.equal(l4Write.target.selector, '[data-action="write-pathway"]');

    const l4Ap = resolveTourStep(
      base({ tracks: 1, useCaseCount: 2, apEnabled: true, ap: 0 })
    );
    assert.equal(l4Ap.id, "L4");
    assert.equal(l4Ap.title, "Out of Moves");
    assert.equal(
      l4Ap.target.selector,
      '#ontology-board [data-action="year-plus"][data-years="1"]'
    );

    const l4ApMp = resolveTourStep(
      base({
        tracks: 1,
        useCaseCount: 2,
        apEnabled: true,
        ap: 0,
        isMultiplayer: true,
      })
    );
    assert.equal(l4ApMp.id, "L4");
    assert.equal(l4ApMp.target.selector, "#btn-mp-workshop-end-turn");

    const l4Budget = resolveTourStep(
      base({
        tracks: 1,
        useCaseCount: 2,
        budgetWillEnabled: true,
        budget: 0,
      })
    );
    assert.equal(l4Budget.id, "L4");
    assert.equal(l4Budget.target.selector, "#hud-budget");

    const l4Ask = resolveTourStep(
      base({
        tracks: 1,
        useCaseCount: 2,
        focusedTechId: "gene-sequencing",
        focusedTechName: "Gene sequencing",
      })
    );
    assert.equal(l4Ask.id, "L4");
    assert.equal(l4Ask.target.selector, "#btn-ask-ideas");

    const l5 = resolveTourStep(
      base({
        tracks: 1,
        useCaseCount: 2,
        pathwayCount: 1,
        primaryPathwayId: "pw-1",
        unpluggedCount: 1,
        unpluggedCrisisId: "cr-1",
        unpluggedCrisisName: "Grade Fear",
      })
    );
    assert.equal(l5.id, "L5");
    assert.match(l5.body, /Grade Fear/);
    assert.equal(
      l5.target.selector,
      '#ontology-lane-pathway [data-pathway-id="pw-1"] [data-menu="plug"]'
    );
    assert.deepEqual(l5.expandCard, { kind: "pathway", id: "pw-1" });
  });

  it("R1–R3 handle red roadblocks, timing, and crisis lights", () => {
    const r1 = resolveTourStep(
      base({
        tracks: 1,
        useCaseCount: 2,
        pathwayCount: 1,
        unpluggedCount: 0,
        redChallengerId: "ch-nature",
        redChallengerCrisisId: "cr-local",
      })
    );
    assert.equal(r1.id, "R1");
    assert.equal(
      r1.target.selector,
      '.ontology-wire-token.is-red[data-challenger-id="ch-nature"]'
    );
    assert.deepEqual(r1.target.selectors, [
      '.ontology-wire-token.is-red[data-challenger-id="ch-nature"]',
      '.ontology-roadblock-pill.is-red[data-challenger-id="ch-nature"]',
      "#ontology-lane-problem",
    ]);
    assert.deepEqual(r1.expandCard, { kind: "crisis", id: "cr-local" });

    const r2 = resolveTourStep(
      base({
        tracks: 1,
        useCaseCount: 2,
        pathwayCount: 1,
        unpluggedCount: 0,
        timingLevel: "red",
      })
    );
    assert.equal(r2.id, "R2");
    assert.equal(
      r2.target.selector,
      '#ontology-board [data-action="year-plus"][data-years="2"]'
    );

    const r3 = resolveTourStep(
      base({
        tracks: 1,
        useCaseCount: 2,
        pathwayCount: 1,
        unpluggedCount: 0,
        redCrisisCount: 1,
        redCrisisId: "cr-local",
        redCrisisName: "Grade Fear",
      })
    );
    assert.equal(r3.id, "R3");
    assert.match(r3.body, /Grade Fear/);
    assert.equal(
      r3.target.selector,
      '#ontology-lane-problem [data-crisis-id="cr-local"]'
    );
    assert.deepEqual(r3.target.selectors, [
      '#ontology-lane-problem [data-crisis-id="cr-local"]',
      "#ontology-lane-problem",
    ]);
    assert.deepEqual(r3.expandCard, { kind: "crisis", id: "cr-local" });
  });

  it("H1 summons challengers and H2 declares hold", () => {
    const h1 = resolveTourStep(
      base({
        tracks: 1,
        useCaseCount: 2,
        pathwayCount: 1,
        unpluggedCount: 0,
        concernsSummoned: false,
        remainingConcerns: 2,
      })
    );
    assert.equal(h1.id, "H1");
    assert.equal(h1.target.selector, "#btn-to-challenge");

    const h2 = resolveTourStep(
      base({
        tracks: 1,
        useCaseCount: 2,
        pathwayCount: 1,
        unpluggedCount: 0,
        concernsSummoned: true,
        remainingConcerns: 0,
        boardHolds: true,
      })
    );
    assert.equal(h2.id, "H2");
    assert.equal(h2.target.selector, "#btn-to-challenge");
  });

  it("falls back cleanly when board does not hold and no reds remain", () => {
    const fb = resolveTourStep(
      base({
        tracks: 1,
        useCaseCount: 2,
        pathwayCount: 1,
        unpluggedCount: 0,
        concernsSummoned: true,
        remainingConcerns: 0,
        boardHolds: false,
      })
    );
    assert.equal(fb.id, "H0");
    assert.equal(fb.target.selector, "#hud-crisis-wrap");
  });
});

describe("queryTourTarget", () => {
  it("returns null without a document", () => {
    assert.equal(
      queryTourTarget({ target: { kind: "selector", selector: "#nope" } }, null),
      null
    );
  });

  it("never queries #ontology-lane-crisis and resolves #ontology-lane-problem", () => {
    const problemLane = { id: "ontology-lane-problem" };
    const seen = [];
    const root = {
      querySelector(sel) {
        seen.push(sel);
        if (sel === "#ontology-lane-problem") return problemLane;
        return null;
      },
    };
    const r3 = resolveTourStep(
      base({
        tracks: 1,
        useCaseCount: 1,
        pathwayCount: 1,
        redCrisisCount: 1,
        redCrisisId: "cr-9",
      })
    );
    const el = queryTourTarget(r3, root);
    assert.equal(el, problemLane);
    assert.equal(
      seen.some((s) => s.includes("ontology-lane-crisis")),
      false
    );
  });

  it("resolves roadblock tokens with fallback to pill and #ontology-lane-problem", () => {
    const pill = { id: "pill" };
    const root = {
      querySelector(sel) {
        if (sel === '.ontology-roadblock-pill.is-red[data-challenger-id="ch-1"]') {
          return pill;
        }
        return null;
      },
    };
    const r1 = resolveTourStep(
      base({
        tracks: 1,
        useCaseCount: 1,
        pathwayCount: 1,
        redChallengerId: "ch-1",
      })
    );
    assert.equal(queryTourTarget(r1, root), pill);
  });

  it("resolves Workbench targets", () => {
    const dockRight = { id: "dock-right" };
    const root = {
      querySelector(sel) {
        if (sel === ".wb-dock-right") return dockRight;
        return null;
      },
    };
    const w4 = resolveTourStep(
      base({
        wb: { open: true, diamond: "solution", ideaCount: 1 },
        pathwayCount: 1,
        unpluggedCount: 1,
      })
    );
    assert.equal(queryTourTarget(w4, root), dockRight);
  });

  it("preserves { kind: 'tech', id } lookup for ensureTourTargetVisible compatibility", () => {
    const pickerCard = { id: "picker-ai" };
    const root = {
      querySelector(sel) {
        if (sel === '#ontology-tech-picker [data-tech-id="ai"]') return pickerCard;
        return null;
      },
    };
    assert.equal(
      queryTourTarget({ target: { kind: "tech", id: "ai" } }, root),
      pickerCard
    );
  });
});

describe("createGuidedTour overlay", () => {
  let prevDoc;
  let prevWin;
  let prevRaf;

  function installFakeDom() {
    prevDoc = globalThis.document;
    prevWin = globalThis.window;
    prevRaf = globalThis.requestAnimationFrame;
    const dom = fakeDom();
    globalThis.document = dom.document;
    globalThis.window = dom.window;
    globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
    return dom;
  }

  function restoreDom() {
    globalThis.document = prevDoc;
    globalThis.window = prevWin;
    globalThis.requestAnimationFrame = prevRaf;
  }

  it("builds .tour-ring and .tour-card with #tour-rules and #tour-dismiss and no .tour-panes", async () => {
    installFakeDom();
    try {
      const addTechBtn = fakeEl("button", "btn-add-tech");
      addTechBtn.rect = { top: 100, left: 20, width: 90, height: 30, bottom: 130, right: 110 };
      globalThis.document.getElementById("screen-workshop").appendChild(addTechBtn);

      const tour = createGuidedTour();
      await tour.open(base());
      const root = globalThis.document.getElementById("tour-root");
      assert.equal(root.querySelector(".tour-panes"), null);
      assert.equal(Boolean(root.querySelector("#tour-rules")), true);
      assert.equal(Boolean(root.querySelector("#tour-dismiss")), true);
      const ring = root.querySelector(".tour-ring");
      assert.equal(ring.hidden, false);
      assert.equal(ring.classList.contains("has-dimmer"), true);

      // Modal steps with skipDimmer remove .has-dimmer
      await tour.refresh(base({ ui: { waitConfirmOpen: true } }));
      assert.equal(ring.classList.contains("has-dimmer"), false);
    } finally {
      restoreDom();
    }
  });

  it("cancel during ensureTargetVisible does not resurrect the tour", async () => {
    installFakeDom();
    try {
      let release;
      const gate = new Promise((r) => {
        release = r;
      });
      const tour = createGuidedTour({
        ensureTargetVisible: () => gate,
      });
      const pending = tour.open(base());
      assert.equal(tour.isOpen(), false);
      tour.close();
      release();
      await pending;
      assert.equal(tour.isOpen(), false);
    } finally {
      restoreDom();
    }
  });

  it("one-shot pointerdown outside .tour-card closes without preventDefault or stopPropagation", async () => {
    const dom = installFakeDom();
    try {
      const opener = fakeEl("button", "btn-help");
      const plugBtn = fakeEl("button", "plug-btn");
      dom.workshop.appendChild(opener);
      dom.workshop.appendChild(plugBtn);

      const tour = createGuidedTour({ restoreFocusEl: () => opener });
      await tour.open(base(), { opener });
      assert.equal(tour.isOpen(), true);

      let prevented = false;
      let stopped = false;
      dom.dispatchDoc("pointerdown", {
        target: plugBtn,
        preventDefault: () => {
          prevented = true;
        },
        stopPropagation: () => {
          stopped = true;
        },
      });

      assert.equal(tour.isOpen(), false);
      assert.equal(prevented, false);
      assert.equal(stopped, false);
      assert.equal(opener.didFocus, false);
    } finally {
      restoreDom();
    }
  });

  it("pointerdown inside .tour-card does not close; #tour-dismiss click closes", async () => {
    const dom = installFakeDom();
    try {
      const opener = fakeEl("button", "btn-help");
      dom.workshop.appendChild(opener);
      const tour = createGuidedTour({ restoreFocusEl: () => opener });
      await tour.open(base(), { opener });

      const dismiss = globalThis.document.getElementById("tour-root").querySelector("#tour-dismiss");
      dom.dispatchDoc("pointerdown", {
        target: dismiss,
        preventDefault() {},
        stopPropagation() {},
      });
      assert.equal(tour.isOpen(), true);

      dismiss.trigger("click");
      assert.equal(tour.isOpen(), false);
      assert.equal(opener.didFocus, true);
    } finally {
      restoreDom();
    }
  });

  it("clicking #btn-help while open toggles closed and suppresses the following opener click", async () => {
    const dom = installFakeDom();
    try {
      const opener = fakeEl("button", "btn-help");
      const openerIcon = fakeEl("span");
      opener.appendChild(openerIcon);
      dom.workshop.appendChild(opener);
      dom.byId.set("btn-help", opener);

      const tour = createGuidedTour({ restoreFocusEl: () => opener });
      let clickHandlerCalls = 0;
      opener.addEventListener("click", () => {
        clickHandlerCalls += 1;
        void tour.open(base(), { opener });
      });

      // Open via normal click when closed
      dom.dispatchDoc("pointerdown", { target: openerIcon, preventDefault() {}, stopPropagation() {} });
      dom.dispatchClickOn(openerIcon, opener);
      await new Promise((r) => setTimeout(r, 0));
      assert.equal(tour.isOpen(), true);
      assert.equal(clickHandlerCalls, 1);

      // Re-click #btn-help while open: closes on pointerdown and suppresses click reopen
      let prevented = false;
      dom.dispatchDoc("pointerdown", {
        target: openerIcon,
        preventDefault: () => {
          prevented = true;
        },
        stopPropagation() {},
      });
      assert.equal(prevented, true);
      assert.equal(tour.isOpen(), false);

      dom.dispatchClickOn(openerIcon, opener);
      await new Promise((r) => setTimeout(r, 0));
      assert.equal(tour.isOpen(), false);
      assert.equal(clickHandlerCalls, 1);
    } finally {
      restoreDom();
    }
  });

  it("Escape closes the tour unless #help-backdrop is open", async () => {
    const dom = installFakeDom();
    try {
      const tour = createGuidedTour();
      await tour.open(base());
      assert.equal(tour.isOpen(), true);

      const helpBackdrop = fakeEl("div", "help-backdrop");
      helpBackdrop.classList.add("open");
      dom.byId.set("help-backdrop", helpBackdrop);
      dom.body.appendChild(helpBackdrop);

      dom.dispatchDoc("keydown", { key: "Escape", stopPropagation() {} });
      assert.equal(tour.isOpen(), true);

      helpBackdrop.classList.remove("open");
      let stopped = false;
      dom.dispatchDoc("keydown", {
        key: "Escape",
        stopPropagation: () => {
          stopped = true;
        },
      });
      assert.equal(tour.isOpen(), false);
      assert.equal(stopped, true);
    } finally {
      restoreDom();
    }
  });
});

function fakeClassList(on = new Set()) {
  return {
    add(...xs) {
      xs.forEach((x) => on.add(x));
    },
    remove(...xs) {
      xs.forEach((x) => on.delete(x));
    },
    contains(x) {
      return on.has(x);
    },
    toggle(x, force) {
      if (force === true) on.add(x);
      else if (force === false) on.delete(x);
      else if (on.has(x)) on.delete(x);
      else on.add(x);
      return on.has(x);
    },
  };
}

function fakeEl(tag, id = "") {
  const children = [];
  const classSet = new Set();
  const listeners = new Map();
  const node = {
    tagName: String(tag).toUpperCase(),
    id,
    className: "",
    hidden: false,
    dataset: {},
    style: {},
    children,
    parentNode: null,
    didFocus: false,
    rect: { top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0 },
    classList: fakeClassList(classSet),
    querySelector(sel) {
      return findDesc(node, sel);
    },
    querySelectorAll(sel) {
      const out = [];
      walk(node, (n) => {
        if (n !== node && matchSel(n, sel)) out.push(n);
      });
      return out;
    },
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    trigger(type, ev = {}) {
      for (const fn of listeners.get(type) || []) fn(ev);
    },
    appendChild(c) {
      children.push(c);
      c.parentNode = node;
      return c;
    },
    setAttribute(k, v) {
      if (k === "id") node.id = v;
      if (k === "hidden") node.hidden = true;
      if (k === "data-edge") node.dataset.edge = v;
    },
    removeAttribute(k) {
      if (k === "hidden") node.hidden = false;
    },
    focus() {
      node.didFocus = true;
    },
    getBoundingClientRect() {
      return node.rect;
    },
  };
  Object.defineProperty(node, "isConnected", { get: () => true });
  Object.defineProperty(node, "innerHTML", {
    get: () => "",
    set() {
      children.length = 0;
      const ring = fakeEl("div");
      ring.classList.add("tour-ring");
      node.appendChild(ring);
      const card = fakeEl("div");
      card.classList.add("tour-card");
      const kicker = fakeEl("p", "tour-card-kicker");
      kicker.classList.add("tour-kicker");
      card.appendChild(kicker);
      const title = fakeEl("h3", "tour-card-title");
      const body = fakeEl("p", "tour-card-body");
      card.appendChild(title);
      card.appendChild(body);
      card.appendChild(fakeEl("button", "tour-rules"));
      card.appendChild(fakeEl("button", "tour-dismiss"));
      node.appendChild(card);
    },
  });
  return node;
}

function walk(node, fn) {
  fn(node);
  for (const c of node.children || []) walk(c, fn);
}

function matchSel(node, sel) {
  const s = String(sel).trim();
  if (s.startsWith("#")) return node.id === s.slice(1);
  if (s.startsWith(".")) return node.classList.contains(s.slice(1).split(/[\s.\[]/)[0]);
  return false;
}

function findDesc(node, sel) {
  let found = null;
  walk(node, (n) => {
    if (found || n === node) return;
    if (matchSel(n, sel)) found = n;
  });
  return found;
}

function fakeDom() {
  const byId = new Map();
  const body = fakeEl("body");
  const tourRoot = fakeEl("div", "tour-root");
  byId.set("tour-root", tourRoot);
  body.appendChild(tourRoot);
  const workshop = fakeEl("section", "screen-workshop");
  byId.set("screen-workshop", workshop);
  body.appendChild(workshop);
  const docListeners = new Map();
  const doc = {
    body,
    getElementById: (id) => byId.get(id) || null,
    createElement: (tag) => fakeEl(tag),
    querySelector: (sel) => {
      if (sel === "#screen-workshop") return workshop;
      return findDesc(body, sel) || (matchSel(body, sel) ? body : null);
    },
    addEventListener(type, fn) {
      if (!docListeners.has(type)) docListeners.set(type, []);
      docListeners.get(type).push(fn);
    },
  };
  const win = {
    innerWidth: 1024,
    innerHeight: 768,
    addEventListener() {},
  };
  function dispatchDoc(type, ev = {}) {
    for (const fn of docListeners.get(type) || []) fn(ev);
  }
  function dispatchClickOn(target, bubbleEl) {
    let stopped = false;
    const ev = {
      target,
      preventDefault() {},
      stopPropagation() {
        stopped = true;
      },
      stopImmediatePropagation() {
        stopped = true;
      },
    };
    dispatchDoc("click", ev);
    if (!stopped && bubbleEl) bubbleEl.trigger("click", ev);
  }
  return { document: doc, window: win, body, workshop, byId, dispatchDoc, dispatchClickOn };
}

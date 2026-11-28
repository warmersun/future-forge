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

/**
 * On-demand next-step spotlight for the 4-Lane Visual Ontology Board
 * and Double-Diamond Innovation Workbench.
 * Resolver is pure (no DOM). Overlay is browser-only.
 */

/** @typedef {"selector"|"tech"} TourTargetKind */

/**
 * @typedef {{
 *   kind: TourTargetKind,
 *   selector?: string,
 *   selectors?: string[],
 *   id?: string,
 * }} TourTarget
 */

/**
 * @typedef {{
 *   id: string,
 *   title: string,
 *   body: string,
 *   target: TourTarget,
 *   skipDimmer?: boolean,
 *   openSideTab?: string,
 *   expandCard?: { kind: "tech"|"pathway"|"crisis", id: string },
 * }} TourStep
 */

const MINT_HOW_MIN = 12;

/**
 * Normalize a raw tourSnapshot() payload for resolveTourStep().
 * @param {object} [raw]
 */
export function snapOf(raw = {}) {
  const briefing = raw.briefing || {};
  const mp = raw.mp || {};
  const ui = raw.ui || {};
  const wb = raw.wb || raw.workbench || ui.workbench || {};
  const pathway = raw.pathway || {};
  const suggestedIds = Array.isArray(raw.suggestedIds)
    ? raw.suggestedIds.filter(Boolean)
    : [];

  return {
    screen: raw.screen || "workshop",
    place: String(raw.place || "").trim(),
    spotlightTechId: raw.spotlightTechId || null,
    spotlightName: String(raw.spotlightName || "").trim(),
    spotlightEncourage: String(raw.spotlightEncourage || "").trim(),
    hasRecommended: Boolean(raw.hasRecommended ?? suggestedIds.length > 0),
    suggestedIds,
    isLearning: Boolean(raw.isLearning),
    tutorOn: Boolean(raw.tutorOn),
    sideTab: raw.sideTab || "vision",
    briefing: {
      active: Boolean(briefing.active),
      index: Number(briefing.index) || 0,
      beatCount: Number(briefing.beatCount) || 0,
    },
    mp: {
      spectator: Boolean(mp.spectator),
      viewingOther: Boolean(mp.viewingOther),
      hotseat: Boolean(mp.hotseat),
      needPassDevice: Boolean(mp.needPassDevice),
    },
    ui: {
      waitConfirmOpen: Boolean(ui.waitConfirmOpen),
      pickerOpen: Boolean(ui.pickerOpen),
      openChallengerId: ui.openChallengerId || null,
      argumentModalOpen: Boolean(ui.argumentModalOpen),
      argumentBusy: Boolean(ui.argumentBusy),
      createBusy: Boolean(ui.createBusy),
      summonBusy: Boolean(ui.summonBusy),
      challengerDrawOpen: Boolean(ui.challengerDrawOpen),
      scoringPending: Boolean(ui.scoringPending),
      timingPending: Boolean(ui.timingPending ?? pathway.timingPending),
    },
    wb: {
      open: Boolean(wb.open),
      diamond: wb.diamond || "solution",
      busy: Boolean(wb.busy),
      hasHmwBrief: Boolean(wb.hasHmwBrief ?? wb.hmwBrief),
      hmwLocked: Boolean(wb.hmwLocked),
      ideaCount: Number(wb.ideaCount) || 0,
    },
    tracks: Number(raw.tracks) || 0,
    focusedTechId: raw.focusedTechId || null,
    focusedTechName: String(raw.focusedTechName || "").trim(),
    useCaseCount: Number(raw.useCaseCount) || 0,
    sparksCount: Number(raw.sparksCount) || 0,
    writeOpen: Boolean(raw.writeOpen),
    draftHowLength: Number(raw.draftHowLength) || 0,
    pathwayCount: Number(raw.pathwayCount) || 0,
    primaryPathwayId: raw.primaryPathwayId || raw.focusedPathwayId || null,
    unpluggedCrisisId: raw.unpluggedCrisisId || null,
    unpluggedCrisisName: String(raw.unpluggedCrisisName || "").trim(),
    unpluggedCount: Number(raw.unpluggedCount) || 0,
    redChallengerId: raw.redChallengerId || null,
    redChallengerCrisisId: raw.redChallengerCrisisId || null,
    challengerAnswerPending: Boolean(raw.challengerAnswerPending),
    timingLevel: String(raw.timingLevel || pathway.timingLevel || "green"),
    redPathwayId: raw.redPathwayId || null,
    hasEarlyForecastWire: Boolean(raw.hasEarlyForecastWire),
    redCrisisId: raw.redCrisisId || null,
    redCrisisName: String(raw.redCrisisName || "").trim(),
    redCrisisCount: Number(raw.redCrisisCount) || 0,
    concernsOnBoard: Number(raw.concernsOnBoard) || 0,
    remainingConcerns: Number(raw.remainingConcerns) || 0,
    concernsSummoned: Boolean(raw.concernsSummoned),
    boardHolds: Boolean(raw.boardHolds),
    ap: Number.isFinite(Number(raw.ap)) ? Number(raw.ap) : 0,
    apEnabled: Boolean(raw.apEnabled),
    isMultiplayer: Boolean(
      raw.isMultiplayer ?? (mp.spectator || mp.viewingOther || mp.hotseat)
    ),
    budget: Number.isFinite(Number(raw.budget)) ? Number(raw.budget) : 0,
    budgetWillEnabled: Boolean(raw.budgetWillEnabled),
  };
}

function step(id, title, body, target, extra = {}) {
  return { id, title, body, target, ...extra };
}

function sel(...list) {
  const clean = list.filter(Boolean);
  if (clean.length <= 1) {
    return { kind: "selector", selector: clean[0] || "" };
  }
  return { kind: "selector", selector: clean[0], selectors: clean };
}

function techName(s) {
  return s.focusedTechName || "this emTech";
}

function spotlightLabel(s) {
  return s.spotlightName || "the spotlight tech";
}

function lastBriefBeat(s) {
  const n = s.briefing.beatCount;
  if (n <= 0) return true;
  return s.briefing.index >= n - 1;
}

/**
 * First matching next-step for an Ontology Board / Workbench snapshot.
 * @param {object} raw
 * @returns {TourStep}
 */
export function resolveTourStep(raw) {
  const s = snapOf(raw);

  // M1–M5 — Active modals & in-flight work
  if (s.ui.waitConfirmOpen) {
    return step(
      "M1",
      "Look Ahead",
      "Jumping +2 years advances capability curves and raises crisis pressure. Confirm only if the curve gain is worth it.",
      sel("#wait-confirm-ok"),
      { skipDimmer: true }
    );
  }

  if (s.ui.openChallengerId) {
    if (s.challengerAnswerPending) {
      return step(
        "M2",
        "Judging defense…",
        "Wait a moment while the Challenger judges your defense.",
        sel("#ontology-roadblock"),
        { skipDimmer: true }
      );
    }
    return step(
      "M2",
      "Defend or remix",
      "Explain who acts, who pays, or what guardrail holds, then click Submit defense (or Remix in Workbench).",
      sel("#ontology-roadblock"),
      { skipDimmer: true }
    );
  }

  if (s.ui.argumentModalOpen) {
    return step(
      "M3",
      "Fact-check argument",
      s.ui.argumentBusy
        ? "Wait a moment while your real-world capability fact is verified."
        : "State a real-world capability fact to challenge the assessment, or close to return to the board.",
      sel(".ontology-modal-scrim form", ".ontology-modal-scrim"),
      { skipDimmer: true }
    );
  }

  if (s.ui.pickerOpen) {
    if (s.spotlightTechId) {
      const extra = s.spotlightEncourage ? ` ${s.spotlightEncourage}` : "";
      return step(
        "M4",
        `Pick ${spotlightLabel(s)}`,
        `${spotlightLabel(s)} is the suggested tech for this Quest. Select it to add it to Lane 1.${extra}`,
        sel(
          `#ontology-tech-picker [data-tech-id="${cssIdent(s.spotlightTechId)}"]`,
          "#ontology-tech-picker .tech-card.recommended",
          "#ontology-tech-picker"
        ),
        { skipDimmer: true }
      );
    }
    if (s.hasRecommended) {
      return step(
        "M4",
        "Pick a suggested tech",
        "Pick a recommended emerging tech for this place, or choose any tech in the picker.",
        sel("#ontology-tech-picker .tech-card.recommended", "#ontology-tech-picker"),
        { skipDimmer: true }
      );
    }
    return step(
      "M4",
      "Pick an emerging tech",
      "Select any emerging technology in the picker to add it to Lane 1.",
      sel("#ontology-tech-picker"),
      { skipDimmer: true }
    );
  }

  if (
    s.ui.summonBusy ||
    s.ui.challengerDrawOpen ||
    s.ui.createBusy ||
    s.ui.scoringPending ||
    s.ui.timingPending ||
    s.wb.busy
  ) {
    const busyTarget =
      s.ui.summonBusy || s.ui.challengerDrawOpen
        ? sel("#hex-challenger-draw", "#ontology-lane-problem")
        : s.ui.createBusy || s.wb.busy
          ? sel("#ontology-lane-pathway", "#ontology-board")
          : sel("#ontology-lane-problem", "#ontology-lane-pathway");
    return step(
      "M5",
      "Working…",
      "Wait a moment for AI generation or pathway scoring to finish before the next move.",
      busyTarget
    );
  }

  // B1–B3 — Multiplayer gates
  if (s.mp.spectator) {
    return step(
      "B1",
      "Not your turn",
      "Browse freely. Only the active seat spends Moves, commits pathways, and answers challengers.",
      sel("#mp-seat-tabs")
    );
  }
  if (s.mp.viewingOther) {
    return step(
      "B2",
      "Someone else's board",
      "You can browse here, but only the owner can summon challengers or declare the pathway holds — use the seat tabs to switch back.",
      sel("#mp-seat-tabs")
    );
  }
  if (s.mp.hotseat && s.mp.needPassDevice) {
    return step(
      "B3",
      "End your turn",
      "When you're ready, click End turn → to pass to the next inventor and refill Moves.",
      sel("#btn-mp-workshop-end-turn")
    );
  }

  // C1–C2 — Quest briefing walk
  if (s.briefing.active) {
    if (lastBriefBeat(s)) {
      return step(
        "C2",
        "Finish the briefing",
        "Last card. When you know the job, click Start inventing to build on the Ontology Board.",
        sel(".quest-briefing-invent")
      );
    }
    return step(
      "C1",
      "Read the briefing",
      "The story is this card on the right. Read it, then click Next.",
      sel('[data-brief="next"]')
    );
  }

  // D1 — Learning tutor before board work
  if (s.isLearning && s.tutorOn && s.pathwayCount === 0 && s.tracks === 0) {
    return step(
      "D1",
      "Talk to the tutor",
      "Walk through the lesson idea first, or click End tutoring when ready to build on the board.",
      sel("#co-inventor-root"),
      { openSideTab: "coinventor" }
    );
  }

  // W1–W4 — Double-Diamond Innovation Workbench open
  if (s.wb.open) {
    if (s.wb.diamond === "problem") {
      return step(
        "W1",
        "Lock your Design Brief",
        "Pick or write a How Might We… frame, then click Lock Brief & Develop Ideas → (or Skip to Ideas →).",
        sel('[data-action="wb-lock-hmw"]', "#ontology-lane-pathway")
      );
    }
    if (s.pathwayCount === 0 && s.wb.ideaCount === 0) {
      return step(
        "W2",
        "Generate or write Ideas",
        "Deal AI ideas with SIT/SCAMPER/Open lenses (or save your own) onto the Ideas bench.",
        sel('[data-action="wb-deal-ai"]', "#ontology-lane-pathway")
      );
    }
    if (s.pathwayCount === 0 && s.wb.ideaCount > 0) {
      return step(
        "W3",
        "Assemble a Pathway",
        "Click → Start Pathway on an Idea (or drag it into Pathways) to form your invention.",
        sel('[data-drop="wb-assemble-canvas"]', "#ontology-lane-pathway")
      );
    }
    if (s.unpluggedCount > 0) {
      return step(
        "W4",
        "Plug into Problem",
        "Drag your Pathway onto an unplugged Crisis on the right rail (or collapse to use 🔌 Plug).",
        sel(".wb-dock-right", "#btn-close-workbench")
      );
    }
    return step(
      "W4",
      "Return to 4-lane circuit",
      "Collapse Workbench to clear roadblocks, summon challengers, or hold.",
      sel("#btn-close-workbench", "#ontology-lane-pathway")
    );
  }

  // L1–L5 — 4-Lane causal chain
  if (s.tracks === 0 && s.pathwayCount === 0) {
    const hint = s.spotlightTechId
      ? `Open + Add tech in Lane 1 and pick ${spotlightLabel(s)} (or another tech) to start the chain.`
      : "Open + Add tech in Lane 1 and pick a technology to start the chain.";
    return step("L1", "1 · Add an emerging tech", hint, sel("#btn-add-tech", "#ontology-lane-tech"));
  }

  if (
    s.tracks > 0 &&
    s.useCaseCount === 0 &&
    s.pathwayCount === 0 &&
    s.sparksCount === 0
  ) {
    return step(
      "L2",
      "2 · Deal a milestone",
      `Tap a reached ● milestone (at or above NOW) on ${techName(s)} in Lane 1 to unlock its Use Cases in Lane 2.`,
      sel(
        '#ontology-lane-tech [data-action="deal-milestone"].is-latest-reached',
        '#ontology-lane-tech [data-action="deal-milestone"]',
        "#ontology-lane-tech"
      ),
      s.focusedTechId
        ? { expandCard: { kind: "tech", id: s.focusedTechId } }
        : {}
    );
  }

  if (s.pathwayCount === 0 && s.sparksCount > 0) {
    return step(
      "L3",
      "3 · Add an idea to Pathway",
      "Tap + Add on one of the generated sparks to place it as a Pathway.",
      sel("#ontology-sparks", "#ontology-lane-pathway")
    );
  }

  if (s.pathwayCount === 0) {
    if (s.writeOpen && s.draftHowLength >= MINT_HOW_MIN) {
      return step(
        "L4",
        "Add Invention",
        `Click Add Invention to place your ${techName(s)} idea into Lane 3.`,
        sel('[data-action="write-pathway"]', "#ontology-lane-pathway")
      );
    }
    if (s.apEnabled && s.ap < 1) {
      return step(
        "L4",
        "Out of Moves",
        s.isMultiplayer
          ? "You've used your Moves for this year. Click End turn → to refill Moves."
          : "You've used your Moves for this year. Advance the year (+1 yr →) to refill Moves.",
        s.isMultiplayer
          ? sel("#btn-mp-workshop-end-turn", "#btn-end-turn")
          : sel('#ontology-board [data-action="year-plus"][data-years="1"]', "#btn-end-turn")
      );
    }
    if (s.budgetWillEnabled && s.budget <= 0) {
      return step(
        "L4",
        "Budget capacity full",
        "All Budget capacity is allocated on your board. Remove a pathway or ease a crisis to free capacity.",
        sel("#hud-budget")
      );
    }
    return step(
      "L4",
      "3 · Create a Pathway",
      `Click ✨ Ask for ideas on ${techName(s)} (or ✍️ Write / ⤢ Workbench) to create a Pathway in Lane 3.`,
      sel("#btn-ask-ideas", "#ontology-lane-pathway")
    );
  }

  if (s.unpluggedCount > 0) {
    const label = s.unpluggedCrisisName ? `“${s.unpluggedCrisisName}”` : "A Crisis";
    const plugTarget = s.primaryPathwayId
      ? sel(
          `#ontology-lane-pathway [data-pathway-id="${cssIdent(s.primaryPathwayId)}"] [data-menu="plug"]`,
          '[data-menu="plug"]',
          "#ontology-lane-pathway"
        )
      : sel('[data-menu="plug"]', "#ontology-lane-pathway");
    return step(
      "L5",
      "4 · Plug into every Crisis",
      `${label} isn't wired yet. Open 🔌 Plug on your Pathway (or drag from its output port) to connect every Crisis in Lane 4.`,
      plugTarget,
      s.primaryPathwayId
        ? { expandCard: { kind: "pathway", id: s.primaryPathwayId } }
        : {}
    );
  }

  // R1–R3 — Red diagnostics
  if (s.redChallengerId) {
    const chId = cssIdent(s.redChallengerId);
    return step(
      "R1",
      "Clear the roadblock",
      "A Challenger is blocking a wire. Click the red roadblock token to defend your pathway (1 Move) or remix it in the Workbench.",
      sel(
        `.ontology-wire-token.is-red[data-challenger-id="${chId}"]`,
        `.ontology-roadblock-pill.is-red[data-challenger-id="${chId}"]`,
        "#ontology-lane-problem"
      ),
      s.redChallengerCrisisId
        ? { expandCard: { kind: "crisis", id: s.redChallengerCrisisId } }
        : {}
    );
  }

  if (s.timingLevel === "red") {
    return step(
      "R2",
      "Timing is too early",
      "This pathway relies on a future forecast or stretch claim for the current year. Jump +2 yrs (Look Ahead — crises rise), roll an R&D boost / fuse a convergence, or soften how it works.",
      sel(
        '#ontology-board [data-action="year-plus"][data-years="2"]',
        "#btn-wait",
        "#ontology-lane-pathway"
      )
    );
  }

  if (s.redCrisisCount > 0) {
    const label = s.redCrisisName ? `“${s.redCrisisName}”` : "A Crisis";
    return step(
      "R3",
      "Crisis light is still red",
      `${label} isn't eased enough yet. Read the wire reason on that Crisis card, then 🔀 Remix, fuse another piece, or plug a second Pathway aimed at it.`,
      s.redCrisisId
        ? sel(
            `#ontology-lane-problem [data-crisis-id="${cssIdent(s.redCrisisId)}"]`,
            "#ontology-lane-problem"
          )
        : sel("#ontology-lane-problem"),
      s.redCrisisId
        ? { expandCard: { kind: "crisis", id: s.redCrisisId } }
        : {}
    );
  }

  // H1–H2 — Summon challengers & declare hold
  if (!s.concernsSummoned && s.remainingConcerns > 0) {
    return step(
      "H1",
      "Summon the hard questions",
      "Every Crisis is wired and yellow/green. Click Answer the hard questions to test your pathway against Challengers.",
      sel("#btn-to-challenge")
    );
  }

  if (s.concernsSummoned && s.boardHolds) {
    return step(
      "H2",
      "The pathway holds",
      "All active lamps and roadblocks are yellow or green. Click The pathway holds → before a crisis meter hits 5.",
      sel("#btn-to-challenge")
    );
  }

  // Sensible fallback
  return step(
    "H0",
    "Keep inventing",
    "Watch the crisis meters and the year. Keep every lamp yellow or green, clear challengers, and hold the pathway before a meter hits 5.",
    sel("#hud-crisis-wrap", "#ontology-board")
  );
}

/**
 * Prefer the live workshop screen so hidden hotseat/room catalogs don't win.
 * @param {Document|null} [doc]
 * @returns {ParentNode|null}
 */
export function tourQueryRoot(doc = typeof document !== "undefined" ? document : null) {
  if (!doc?.querySelector) return doc || null;
  return doc.querySelector("#screen-workshop") || doc;
}

function queryIn(root, selector) {
  if (!root?.querySelector || !selector) return null;
  return root.querySelector(selector);
}

/**
 * Resolve a step's target to a live element.
 * @param {TourStep} stepObj
 * @param {ParentNode} [root]
 * @returns {HTMLElement|SVGElement|null}
 */
export function queryTourTarget(stepObj, root) {
  const doc = typeof document !== "undefined" ? document : null;
  const scope = root || tourQueryRoot(doc);
  if (!stepObj?.target || !scope?.querySelector) return null;
  const t = stepObj.target;
  const lookup = (s) => queryIn(scope, s) || (doc && scope !== doc ? queryIn(doc, s) : null);

  if (t.kind === "tech" && t.id) {
    const id = cssIdent(t.id);
    return (
      lookup(`#ontology-tech-picker [data-tech-id="${id}"]`) ||
      lookup(`#ontology-lane-tech [data-tech-id="${id}"]`) ||
      lookup(`.tech-card[data-id="${id}"]`) ||
      lookup(`[data-tech-focus="${id}"]`)
    );
  }

  const list =
    Array.isArray(t.selectors) && t.selectors.length
      ? t.selectors
      : t.selector
        ? [t.selector]
        : [];
  for (const s of list) {
    const hit = lookup(s);
    if (hit) return hit;
  }
  return null;
}

function cssIdent(id) {
  const s = String(id || "");
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(s);
  }
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function matchesNode(el, selector) {
  if (!el) return false;
  if (typeof el.matches === "function") {
    try {
      return el.matches(selector);
    } catch {
      /* fallback */
    }
  }
  if (selector.startsWith("#")) return el.id === selector.slice(1);
  if (selector.startsWith(".")) return Boolean(el.classList?.contains(selector.slice(1)));
  return false;
}

function closestNode(el, selector) {
  let cur = el;
  while (cur) {
    if (matchesNode(cur, selector)) return cur;
    cur = cur.parentNode || null;
  }
  return null;
}

function isDescendantOrSelf(target, ancestor) {
  if (!target || !ancestor) return false;
  if (target === ancestor) return true;
  if (typeof ancestor.contains === "function" && ancestor.contains(target)) return true;
  let cur = target.parentNode || null;
  while (cur) {
    if (cur === ancestor) return true;
    cur = cur.parentNode || null;
  }
  return false;
}

const GAP = 12;
const RING_PAD = 6;
const OPENER_SUPPRESS_MS = 800;

/**
 * Browser overlay. Call createGuidedTour() once; open/refresh/close after that.
 * @param {{
 *   onOpenRules?: () => void,
 *   ensureTargetVisible?: (step: TourStep) => void | Promise<void>,
 *   restoreFocusEl?: () => HTMLElement|null,
 *   snapshot?: () => object,
 * }} [opts]
 */
export function createGuidedTour(opts = {}) {
  /** @type {HTMLElement|null} */
  let root = null;
  /** @type {TourStep|null} */
  let current = null;
  /** @type {HTMLElement|SVGElement|null} */
  let lastTarget = null;
  /** @type {HTMLElement|null} */
  let openerEl = null;
  let bound = false;
  let gen = 0;
  let suppressOpenerClick = false;
  let suppressOpenerUntil = 0;

  function ensureRoot() {
    if (root && root.isConnected) return root;
    root = document.getElementById("tour-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "tour-root";
      document.body.appendChild(root);
    }
    if (!root.dataset.tourBuilt) {
      root.dataset.tourBuilt = "1";
      root.innerHTML = `
        <div class="tour-ring" hidden></div>
        <div class="tour-card" hidden role="dialog" aria-modal="false" aria-labelledby="tour-card-title" aria-describedby="tour-card-body" tabindex="-1">
          <p class="tour-kicker" id="tour-card-kicker">Next step</p>
          <h3 class="tour-card-title" id="tour-card-title"></h3>
          <p class="tour-card-body" id="tour-card-body"></p>
          <div class="tour-card-actions">
            <button type="button" class="btn btn-ghost btn-sm" id="tour-rules">Rules</button>
            <button type="button" class="btn btn-primary btn-sm" id="tour-dismiss">Got it</button>
          </div>
        </div>
      `;
      root.querySelector("#tour-dismiss")?.addEventListener("click", () => close());
      root.querySelector("#tour-rules")?.addEventListener("click", () => {
        close({ restoreFocus: false });
        opts.onOpenRules?.();
      });
    }
    return root;
  }

  function bindWindow() {
    if (bound) return;
    bound = true;
    window.addEventListener("resize", onGeometry, { passive: true });
    window.addEventListener("scroll", onGeometry, { passive: true, capture: true });
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDownCapture, { capture: true });
    document.addEventListener("click", onClickCapture, { capture: true });
  }

  function isTourCardTarget(target) {
    if (!target) return false;
    const card = root?.querySelector?.(".tour-card");
    if (card && isDescendantOrSelf(target, card)) return true;
    return Boolean(closestNode(target, ".tour-card"));
  }

  function isOpenerTarget(target) {
    if (!target) return false;
    if (openerEl && isDescendantOrSelf(target, openerEl)) return true;
    if (closestNode(target, "#btn-help")) return true;
    const helpBtn = document.getElementById("btn-help");
    if (helpBtn && isDescendantOrSelf(target, helpBtn)) return true;
    return false;
  }

  function onPointerDownCapture(e) {
    if (!isOpen()) {
      suppressOpenerClick = false;
      return;
    }
    const target = e?.target;
    if (isTourCardTarget(target)) return;

    if (isOpenerTarget(target)) {
      suppressOpenerClick = true;
      suppressOpenerUntil = Date.now() + OPENER_SUPPRESS_MS;
      e.preventDefault?.();
      close();
      return;
    }

    suppressOpenerClick = false;
    close({ restoreFocus: false });
  }

  function onClickCapture(e) {
    if (!suppressOpenerClick) return;
    if (Date.now() > suppressOpenerUntil) {
      suppressOpenerClick = false;
      return;
    }
    if (isOpenerTarget(e?.target)) {
      suppressOpenerClick = false;
      e.preventDefault?.();
      e.stopPropagation?.();
      e.stopImmediatePropagation?.();
    }
  }

  function onKey(e) {
    if (e.key !== "Escape") return;
    if (!isOpen()) return;
    const help = document.getElementById("help-backdrop");
    if (help?.classList.contains("open")) return;
    e.stopPropagation?.();
    close();
  }

  function onGeometry() {
    if (!isOpen() || !current) return;
    layout(current);
  }

  function isOpen() {
    return Boolean(root?.classList.contains("is-open"));
  }

  /**
   * @param {object} snapshot
   * @param {{ refresh?: boolean, opener?: HTMLElement|null }} [extra]
   */
  async function open(snapshot, extra = {}) {
    const token = ++gen;
    const refresh = Boolean(extra.refresh);
    if (!refresh && extra.opener) openerEl = extra.opener;
    const host = ensureRoot();
    bindWindow();
    const next = resolveTourStep(snapshot);
    current = next;
    try {
      await opts.ensureTargetVisible?.(next);
    } catch {
      /* still show the card */
    }
    if (token !== gen) return;
    host.classList.add("is-open");
    document.body.classList.add("tour-open");
    layout(next);
    if (refresh) return;
    const card = host.querySelector(".tour-card");
    try {
      card?.focus?.({ preventScroll: true });
    } catch {
      /* ignore */
    }
  }

  async function refresh(snapshot) {
    if (!isOpen()) return;
    await open(snapshot, { refresh: true });
  }

  function close(options = {}) {
    const restoreFocus = options.restoreFocus !== false;
    gen += 1;
    if (!root) return;
    root.classList.remove("is-open");
    document.body.classList.remove("tour-open");
    const ring = root.querySelector(".tour-ring");
    const card = root.querySelector(".tour-card");
    if (ring) {
      ring.hidden = true;
      ring.classList.remove("has-dimmer");
    }
    if (card) card.hidden = true;
    lastTarget?.classList?.remove("tour-target");
    lastTarget = null;
    current = null;
    const restore = openerEl || opts.restoreFocusEl?.() || null;
    openerEl = null;
    if (restoreFocus) {
      try {
        restore?.focus?.({ preventScroll: true });
      } catch {
        /* ignore */
      }
    }
  }

  function layout(stepObj) {
    const host = ensureRoot();
    const card = host.querySelector(".tour-card");
    const ring = host.querySelector(".tour-ring");
    const title = host.querySelector("#tour-card-title");
    const body = host.querySelector("#tour-card-body");
    if (!card || !ring || !title || !body) return;

    title.textContent = stepObj.title;
    body.textContent = stepObj.body;
    card.hidden = false;
    card.dataset.step = stepObj.id;
    const kicker = host.querySelector("#tour-card-kicker");
    if (kicker) kicker.textContent = "Next step";

    lastTarget?.classList?.remove("tour-target");
    const target = queryTourTarget(stepObj);
    lastTarget = target || null;
    target?.classList?.add("tour-target");

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rect = targetRect(target);

    ring.hidden = !rect;
    if (rect) {
      ring.style.top = `${rect.top - RING_PAD}px`;
      ring.style.left = `${rect.left - RING_PAD}px`;
      ring.style.width = `${rect.width + RING_PAD * 2}px`;
      ring.style.height = `${rect.height + RING_PAD * 2}px`;
    }
    ring.classList.toggle("has-dimmer", Boolean(rect) && !stepObj.skipDimmer);

    placeCard(card, rect, vw, vh);
  }

  return {
    open,
    refresh,
    close,
    isOpen,
    currentStep: () => current,
  };
}

function targetRect(el) {
  if (!el || typeof el.getBoundingClientRect !== "function") return null;
  const r = el.getBoundingClientRect();
  if (!r.width && !r.height) return null;
  return {
    top: r.top,
    left: r.left,
    width: r.width,
    height: r.height,
    bottom: r.bottom,
    right: r.right,
  };
}

function placeCard(card, rect, vw, vh) {
  card.style.maxWidth = `${Math.min(340, vw - 24)}px`;
  card.removeAttribute("data-edge");
  const cw = card.offsetWidth || 320;
  const ch = card.offsetHeight || 160;
  const hudish = rect && rect.top < 88;
  const mobile = vw < 720;

  if (!rect) {
    card.style.left = `${Math.max(12, (vw - cw) / 2)}px`;
    card.style.top = `${Math.max(12, vh * 0.2)}px`;
    return;
  }

  if (mobile && hudish) {
    card.setAttribute("data-edge", "bottom-sheet");
    card.style.left = "12px";
    card.style.right = "12px";
    card.style.top = "auto";
    card.style.bottom = "12px";
    card.style.maxWidth = "none";
    return;
  }

  const candidates = [
    {
      edge: "bottom",
      left: clamp(rect.left, 12, vw - cw - 12),
      top: rect.bottom + GAP,
    },
    {
      edge: "top",
      left: clamp(rect.left, 12, vw - cw - 12),
      top: rect.top - GAP - ch,
    },
    {
      edge: "right",
      left: rect.right + GAP,
      top: clamp(rect.top, 12, vh - ch - 12),
    },
    {
      edge: "left",
      left: rect.left - GAP - cw,
      top: clamp(rect.top, 12, vh - ch - 12),
    },
  ];

  let chosen = candidates.find(
    (c) =>
      c.top >= 8 &&
      c.left >= 8 &&
      c.top + ch <= vh - 8 &&
      c.left + cw <= vw - 8
  );
  if (!chosen) {
    chosen = {
      edge: "bottom",
      left: clamp(rect.left, 12, vw - cw - 12),
      top: clamp(rect.bottom + GAP, 12, vh - ch - 12),
    };
  }
  card.style.right = "auto";
  card.style.bottom = "auto";
  card.style.left = `${Math.round(chosen.left)}px`;
  card.style.top = `${Math.round(chosen.top)}px`;
  card.setAttribute("data-edge", chosen.edge);
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

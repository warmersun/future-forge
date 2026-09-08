/**
 * On-demand next-step coach-mark for the invent workshop.
 * Resolver is pure (no DOM). Overlay is browser-only.
 */

/** @typedef {"selector"|"tech"|"hex-tile"} TourTargetKind */

/**
 * @typedef {{
 *   kind: TourTargetKind,
 *   selector?: string,
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
 * }} TourStep
 */

const MINT_HOW_MIN = 12;

/**
 * @param {object} [raw]
 */
function snapOf(raw = {}) {
  const briefing = raw.briefing || {};
  const pathway = raw.pathway || {};
  const ui = raw.ui || {};
  const mp = raw.mp || {};
  return {
    screen: raw.screen || "workshop",
    place: String(raw.place || "").trim(),
    spotlightName: String(raw.spotlightName || "").trim(),
    spotlightEncourage: String(raw.spotlightEncourage || "").trim(),
    spotlightTechId: raw.spotlightTechId || null,
    suggestedIds: Array.isArray(raw.suggestedIds) ? raw.suggestedIds.filter(Boolean) : [],
    focusedTechId: raw.focusedTechId || null,
    focusedTechName: String(raw.focusedTechName || "").trim(),
    isLearning: Boolean(raw.isLearning),
    tutorOn: Boolean(raw.tutorOn),
    sideTab: raw.sideTab || "vision",
    briefing: {
      active: Boolean(briefing.active),
      index: Number(briefing.index) || 0,
      beatCount: Number(briefing.beatCount) || 0,
    },
    unplacedInventionCount: Number(raw.unplacedInventionCount) || 0,
    placedInventionCount: Number(raw.placedInventionCount) || 0,
    howTextLength: Number(raw.howTextLength) || 0,
    hasSparkBatch: Boolean(raw.hasSparkBatch),
    pathway: {
      overall: pathway.overall || "red",
      bonds: pathway.bonds || "red",
      coverage: pathway.coverage || "red",
      timingLevel: pathway.timingLevel || "red",
      timingPending: Boolean(pathway.timingPending),
    },
    concernsOnBoard: Number(raw.concernsOnBoard) || 0,
    remainingConcerns: Number(raw.remainingConcerns) || 0,
    concernsSummoned: Boolean(raw.concernsSummoned),
    boardHolds: Boolean(raw.boardHolds),
    unansweredConcernId: raw.unansweredConcernId || null,
    concernAnswerPending: Boolean(raw.concernAnswerPending),
    redGivenId: raw.redGivenId || null,
    redInventionId: raw.redInventionId || null,
    uncoveredGivenId: raw.uncoveredGivenId || null,
    uncoveredGivenName: String(raw.uncoveredGivenName || "").trim(),
    uncoveredCount: Number(raw.uncoveredCount) || 0,
    bondsNote: String(raw.bondsNote || "").trim(),
    coverageNote: String(raw.coverageNote || "").trim(),
    coverageReds: Number(raw.coverageReds) || 0,
    ap: Number.isFinite(Number(raw.ap)) ? Number(raw.ap) : 0,
    apEnabled: Boolean(raw.apEnabled),
    budget: Number.isFinite(Number(raw.budget)) ? Number(raw.budget) : 0,
    budgetWillEnabled: Boolean(raw.budgetWillEnabled),
    will: Number.isFinite(Number(raw.will)) ? Number(raw.will) : 0,
    lobbyVisible: Boolean(raw.lobbyVisible),
    mp: {
      spectator: Boolean(mp.spectator),
      viewingOther: Boolean(mp.viewingOther),
      hotseat: Boolean(mp.hotseat),
      needPassDevice: Boolean(mp.needPassDevice),
    },
    ui: {
      techCatalogHidden: Boolean(ui.techCatalogHidden),
      waitConfirmOpen: Boolean(ui.waitConfirmOpen),
      tilePopupOpen: Boolean(ui.tilePopupOpen),
      convergenceOpen: Boolean(ui.convergenceOpen),
      createBusy: Boolean(ui.createBusy),
      summonBusy: Boolean(ui.summonBusy),
      challengerDrawOpen: Boolean(ui.challengerDrawOpen),
    },
    islandHowEmpty: Boolean(raw.islandHowEmpty),
    coinventorUsed: Boolean(raw.coinventorUsed),
    learnOpenedThisTurn: Boolean(raw.learnOpenedThisTurn),
    waitUsed: Boolean(raw.waitUsed),
  };
}

function step(id, title, body, target, extra = {}) {
  return { id, title, body, target, ...extra };
}

function sel(selector) {
  return { kind: "selector", selector };
}

function techTarget(id) {
  return { kind: "tech", id };
}

function hexTarget(id) {
  return { kind: "hex-tile", id };
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

function noInventYet(s) {
  return s.placedInventionCount === 0 && s.unplacedInventionCount === 0;
}

function pathwayNotRed(s) {
  return s.pathway.overall !== "red";
}

function outOfAp(s) {
  return s.apEnabled && s.ap < 1;
}

function uncoveredLabel(s) {
  return s.uncoveredGivenName || "a crisis hex";
}

function bondsTarget(s) {
  if (s.uncoveredGivenId) return hexTarget(s.uncoveredGivenId);
  if (s.redGivenId) return hexTarget(s.redGivenId);
  return sel("#feasibility");
}

function bondsRedStep(s, id) {
  const n = s.uncoveredCount || 1;
  const name = uncoveredLabel(s);
  const who =
    n === 1 ? `“${name}”` : `${n} crisis hexes`;
  const verb = n === 1 ? "isn't" : "aren't";
  return step(
    id,
    "Bonds is red",
    `${who} ${verb} touching your invent island — that's why the pathway is red. Drag the crisis hex next to your idea (crisis tiles move). You don't need more invention tiles for this.`,
    bondsTarget(s)
  );
}

function coverageRedStep(s, id) {
  const n = s.coverageReds || 0;
  const lights =
    n === 1
      ? "1 crisis light is still red"
      : n > 1
        ? `${n} crisis lights are still red`
        : "a crisis light is still red";
  const target = s.redGivenId ? hexTarget(s.redGivenId) : sel("#feasibility");
  return step(
    id,
    "Coverage is red",
    `${lights}${s.coverageNote ? ` (${s.coverageNote})` : ""}. The idea is on the board, but it isn't helping that role enough yet. Click the red hex to see why, then change how it works or add an idea aimed at that meter.`,
    target
  );
}

/**
 * First matching next-step for a workshop snapshot.
 * @param {object} raw
 * @returns {TourStep}
 */
export function resolveTourStep(raw) {
  const s = snapOf(raw);

  // A — blocking overlays / busy
  if (s.ui.waitConfirmOpen) {
    return step(
      "A1",
      "Look Ahead",
      "Waiting jumps the calendar +2 years and raises the crisis. Confirm only if later capability is worth that heat.",
      sel("#wait-confirm-ok"),
      { skipDimmer: true }
    );
  }
  if (s.concernAnswerPending) {
    return step(
      "H3",
      "Challenger is reading",
      "Wait — your answer is being judged. You can close this card when it finishes.",
      sel(".hex-tile-popup-card"),
      { skipDimmer: true }
    );
  }
  if (s.ui.tilePopupOpen && s.unansweredConcernId) {
    return step(
      "H2",
      "Answer the hard question",
      "Write who acts, who pays, or what limit you respect — a short paragraph is enough — then submit.",
      sel(".hex-tile-popup-card"),
      { skipDimmer: true }
    );
  }
  if (s.ui.tilePopupOpen) {
    return step(
      "A2",
      "This tile",
      "Read the tile, then close it (or keep editing). Looking at the board is the thinking.",
      sel(".hex-tile-popup-card"),
      { skipDimmer: true }
    );
  }
  if (s.ui.convergenceOpen) {
    return step(
      "A3",
      "Convergence",
      "Two ideas docked and sped each other up. Got it to keep inventing.",
      sel(".hex-convergence-card"),
      { skipDimmer: true }
    );
  }
  if (s.ui.summonBusy || s.ui.challengerDrawOpen) {
    return step(
      "H1",
      "Summoning a challenger",
      "Wait — a hard question is landing on the board.",
      sel("#hex-board-pending")
    );
  }
  if (s.ui.createBusy) {
    return step(
      "A4",
      "Working…",
      "Wait — ideas or a tile are still minting.",
      sel("#hex-create-pending")
    );
  }
  if (s.pathway.timingPending) {
    return step(
      "A5",
      "Re-checking timing",
      "Wait for the year-honesty check to finish before you summon or hold.",
      sel("#feasibility")
    );
  }

  // B — multiplayer
  if (s.mp.spectator) {
    return step(
      "B1",
      "Not your turn",
      "Browse freely. Only the active seat spends AP, places costs, and summons challengers.",
      sel("#mp-seat-tabs")
    );
  }
  if (s.mp.viewingOther) {
    return step(
      "B2",
      "Someone else's invent",
      "You can add idea tiles here. Only the owner can summon challengers or declare the pathway holds — use the seat tabs to open yours.",
      sel("#mp-seat-tabs")
    );
  }
  if (s.mp.hotseat && s.mp.needPassDevice) {
    return step(
      "B3",
      "Pass the device",
      "This seat is done. Pass the device so the next inventor can play.",
      sel("#btn-mp-pass-device")
    );
  }

  // C — briefing walk
  if (s.briefing.active) {
    if (lastBriefBeat(s)) {
      return step(
        "C2",
        "Finish the briefing",
        "Last card. Click Full brief when you know the job — then invent on the hex board.",
        sel(".quest-briefing-full")
      );
    }
    return step(
      "C1",
      "Read the briefing",
      "This walkthrough is the Quest. Read this card, then Next — or Full brief to skip to the whole story.",
      sel('[data-brief="next"]')
    );
  }

  // D — learning tutor (only before inventing)
  if (s.isLearning && s.tutorOn && noInventYet(s) && !s.focusedTechId) {
    if (s.sideTab !== "coinventor") {
      return step(
        "D1",
        "Meet the tutor",
        "This lesson has a tutor. Open AI co-inventor — chat is free while Tutoring is on. Pick an emTech when you're ready to invent.",
        sel('.side-tab[data-tab="coinventor"]')
      );
    }
    return step(
      "D2",
      "Talk to the tutor",
      "Ask about the idea of this lesson, one beat at a time. End tutoring when you want invent tools (Ask for ideas costs AP after that).",
      sel("#co-inventor-root")
    );
  }

  // E — pick / focus a tech
  if (noInventYet(s) && !s.focusedTechId) {
    if (s.ui.techCatalogHidden) {
      return step(
        "E0",
        "Open emerging tech",
        "The catalog is tucked away. Open it, then pick a tech to invent with.",
        sel("#screen-workshop [data-tech-dock-handle]")
      );
    }
    if (s.spotlightTechId) {
      const extra = s.spotlightEncourage ? ` ${s.spotlightEncourage}` : "";
      return step(
        "E1",
        `Pick ${spotlightLabel(s)}`,
        `${spotlightLabel(s)} is the suggested emTech for this Quest. Click it, then Ask for ideas.${extra}`,
        techTarget(s.spotlightTechId)
      );
    }
    if (s.suggestedIds.length) {
      return step(
        "E2",
        "Pick a suggested tech",
        "Start with a suggested emTech for this place — then Ask for ideas. The AI will mint 3 tiles.",
        sel("#screen-workshop .tech-card.recommended")
      );
    }
    return step(
      "E3",
      "Pick an emTech",
      "Click any emerging tech, then Ask for ideas — or write how it works and mint a tile.",
      sel("#tech-list")
    );
  }

  // Pathway red while something is already on the board — explain WHY
  // before asking for more tiles (bonds is geometry: move crisis hexes).
  if (s.placedInventionCount > 0 && s.pathway.bonds === "red") {
    return bondsRedStep(s, "G2");
  }
  if (s.placedInventionCount > 0 && s.pathway.coverage === "red") {
    return coverageRedStep(s, "G3");
  }
  if (s.placedInventionCount > 0 && s.pathway.timingLevel === "red") {
    const target = s.redInventionId ? hexTarget(s.redInventionId) : sel("#btn-wait");
    return step(
      "G4",
      "Timing is red",
      "The idea over-claims what this tech can do this year — that's why the pathway is red. Soften how it works, or Look Ahead to wait +2 years (crisis rises).",
      target
    );
  }

  // F — mint / place ideas
  if (s.unplacedInventionCount > 0 && s.placedInventionCount === 0) {
    return step(
      "F3",
      "Place an idea on the board",
      "Drag a tile onto the hex board (or double-click). Dock it against a crisis hex so the pathway can turn yellow.",
      sel("#hex-idea-cards")
    );
  }

  if (s.focusedTechId && s.placedInventionCount === 0) {
    if (s.howTextLength >= MINT_HOW_MIN) {
      return step(
        "F2",
        "Mint your idea",
        `Mint a tile for ${techName(s)} so you can drag it onto the board.`,
        sel("#btn-mint-custom")
      );
    }
    if (s.hasSparkBatch) {
      return step(
        "F5",
        "Ask again",
        "Those idea tiles are gone. Refresh for a new trio, or write how it works and mint your own.",
        sel("#btn-refresh-ideas")
      );
    }
    return step(
      "F1",
      "Ask for ideas",
      `Click Ask for ideas — the AI will mint 3 tiles for ${techName(s)} in this place. You can also write your own under How it works.`,
      sel("#btn-ask-ideas")
    );
  }

  if (!s.focusedTechId && s.placedInventionCount === 0 && s.ui.techCatalogHidden) {
    return step(
      "E0",
      "Open emerging tech",
      "Open the catalog to pick another emTech.",
      sel("#screen-workshop [data-tech-dock-handle]")
    );
  }

  if (!s.focusedTechId && s.placedInventionCount === 0) {
    if (s.spotlightTechId) {
      return step(
        "E1",
        `Pick ${spotlightLabel(s)}`,
        `${spotlightLabel(s)} is the suggested emTech. Click it, then Ask for ideas.`,
        techTarget(s.spotlightTechId)
      );
    }
    return step(
      "E3",
      "Pick an emTech",
      "Pick a tech, then Ask for ideas.",
      sel("#tech-list")
    );
  }

  // G / H — board honesty, summon, hold
  if (s.unansweredConcernId && !s.ui.tilePopupOpen) {
    return step(
      "H2",
      "Answer the hard question",
      "Click the challenger hex. Write who acts, who pays, or what limit you respect.",
      hexTarget(s.unansweredConcernId)
    );
  }

  if (s.concernsSummoned && s.boardHolds && s.pathway.timingLevel === "red") {
    return step(
      "H7",
      "Timing is too early",
      "The pathway is honest on the lights, but the year-claim is still red. Soften a claim, or Look Ahead (+2 years, crisis rises).",
      sel("#btn-wait")
    );
  }

  if (s.concernsSummoned && s.boardHolds) {
    return step(
      "H6",
      "The pathway holds",
      "Every active light is yellow or green. Declare that the pathway holds before the crisis wins.",
      sel("#btn-to-challenge")
    );
  }

  if (s.concernsOnBoard > 0 && s.remainingConcerns > 0 && pathwayNotRed(s)) {
    const n = s.remainingConcerns;
    return step(
      "H4",
      "Next challenger",
      `${n} hard question${n === 1 ? "" : "s"} still to summon. Keep going — one at a time.`,
      sel("#btn-to-challenge")
    );
  }

  if (s.concernsSummoned && s.pathway.bonds === "red") {
    return bondsRedStep(s, "H5");
  }
  if (s.concernsSummoned && s.pathway.coverage === "red") {
    return coverageRedStep(s, "H5");
  }
  if (s.concernsSummoned && s.pathway.overall === "red") {
    const target = s.redGivenId
      ? hexTarget(s.redGivenId)
      : sel("#feasibility");
    return step(
      "H5",
      "Ease the red lights",
      "A crisis or concern light is still red. Click it to see why, then dock an honest idea against it — or move that hex next to your island.",
      target
    );
  }

  if (
    s.budgetWillEnabled &&
    s.budget <= 0 &&
    s.placedInventionCount > 0
  ) {
    return step(
      "G7",
      "Budget is empty",
      "Solo runs end at Budget 0$. Don't spend — summon or hold while you still can.",
      sel("#hud-budget")
    );
  }

  if (
    s.placedInventionCount > 0 &&
    pathwayNotRed(s) &&
    !s.concernsSummoned &&
    s.concernsOnBoard === 0
  ) {
    if (outOfAp(s)) {
      return step(
        "G6",
        "Refill AP",
        "You're out of AP. End turn to refill (calendar +1 year; crisis meters stay put).",
        sel("#btn-end-turn")
      );
    }
    return step(
      "G5",
      "Answer the hard questions",
      "Your pathway is honest enough. Summon a challenger onto the board — Mother Nature, Moloch, Ethicist, or Stakeholder.",
      sel("#btn-to-challenge")
    );
  }

  // Focused but already placing — invite Ask for another tech's ideas
  if (s.focusedTechId && s.placedInventionCount > 0 && s.unplacedInventionCount === 0) {
    if (s.howTextLength >= MINT_HOW_MIN) {
      return step(
        "F2",
        "Mint another idea",
        `Mint this ${techName(s)} idea and dock it against remaining red or thin spots.`,
        sel("#btn-mint-custom")
      );
    }
    if (!s.hasSparkBatch) {
      return step(
        "F1",
        "Ask for more ideas",
        `Ask for ideas on ${techName(s)} — or pick another emTech if the pathway still has a gap.`,
        sel("#btn-ask-ideas")
      );
    }
  }

  // I — idle extras
  if (s.isLearning && !s.tutorOn && s.sideTab === "coinventor") {
    return step(
      "I1",
      "Tutor is paused",
      "Resume tutoring anytime (free AP), or keep inventing — co-inventor chat costs 1 AP.",
      sel("#co-resume-tutor")
    );
  }
  if (s.lobbyVisible && s.will < 4 && !outOfAp(s) && s.budget >= 1) {
    return step(
      "I2",
      "Lobby for support",
      "Spend 1 AP and 1$ for +1 Support. Support 4 or more helps the pathway stick.",
      sel("#btn-lobby")
    );
  }
  if (s.focusedTechId && !s.learnOpenedThisTurn) {
    return step(
      "I4",
      "Learn this emTech",
      `Open Learn for a short brief on ${techName(s)} — then come back and invent.`,
      sel("#btn-learn-tech")
    );
  }
  if (s.islandHowEmpty && s.placedInventionCount > 0) {
    return step(
      "I6",
      "How the pathway works",
      "Write how the whole island works together — the parts are on the tiles; this is the whole.",
      sel("#hex-island-how")
    );
  }
  if (!s.coinventorUsed && s.sideTab !== "coinventor") {
    return step(
      "I5",
      "AI co-inventor",
      "Stuck on the idea? The co-inventor can suggest a stack or check timing — usually 1 AP per request.",
      sel('.side-tab[data-tab="coinventor"]')
    );
  }
  if (!s.waitUsed && s.pathway.timingLevel === "yellow") {
    return step(
      "I3",
      "Look Ahead",
      "Timing is tight but not blocked. Look Ahead if you want later-year capability (crisis will rise).",
      sel("#btn-wait")
    );
  }

  return step(
    "I7",
    "Keep inventing",
    "Watch the crisis meters and the year. Place honest ideas, then hold the pathway before a meter hits 5.",
    sel("#hud-crisis-wrap")
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
 * @param {TourStep} step
 * @param {ParentNode} [root]
 * @returns {HTMLElement|SVGElement|null}
 */
export function queryTourTarget(step, root) {
  const doc = typeof document !== "undefined" ? document : null;
  const scope = root || tourQueryRoot(doc);
  if (!step?.target || !scope?.querySelector) return null;
  const t = step.target;
  const lookup = (sel) => queryIn(scope, sel) || (doc && scope !== doc ? queryIn(doc, sel) : null);
  if (t.kind === "tech" && t.id) {
    return (
      lookup(`.tech-card[data-id="${cssIdent(t.id)}"]`) ||
      lookup(`[data-tech-focus="${cssIdent(t.id)}"]`)
    );
  }
  if (t.kind === "hex-tile" && t.id) {
    return (
      lookup(`#hex-board-svg [data-id="${cssIdent(t.id)}"]`) ||
      lookup(`#hex-board [data-id="${cssIdent(t.id)}"]`)
    );
  }
  if (t.selector) return lookup(t.selector);
  return null;
}

function cssIdent(id) {
  const s = String(id || "");
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(s);
  }
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

const GAP = 12;
const RING_PAD = 6;

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
        <div class="tour-panes" hidden>
          <div class="tour-pane" data-edge="n"></div>
          <div class="tour-pane" data-edge="s"></div>
          <div class="tour-pane" data-edge="w"></div>
          <div class="tour-pane" data-edge="e"></div>
        </div>
        <div class="tour-ring" hidden></div>
        <div class="tour-card" hidden role="dialog" aria-modal="false" aria-labelledby="tour-card-title" aria-describedby="tour-card-body" tabindex="-1">
          <p class="tour-kicker">Next step</p>
          <h3 class="tour-card-title" id="tour-card-title"></h3>
          <p class="tour-card-body" id="tour-card-body"></p>
          <div class="tour-card-actions">
            <button type="button" class="btn btn-ghost btn-sm" id="tour-rules">Rules</button>
            <button type="button" class="btn btn-primary btn-sm" id="tour-got-it">Got it</button>
          </div>
        </div>
      `;
      root.querySelector("#tour-got-it")?.addEventListener("click", () => close());
      root.querySelector("#tour-rules")?.addEventListener("click", () => {
        close();
        opts.onOpenRules?.();
      });
      root.querySelectorAll(".tour-pane").forEach((el) => {
        el.addEventListener("click", () => close());
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
  }

  function onKey(e) {
    if (e.key !== "Escape") return;
    if (!isOpen()) return;
    const help = document.getElementById("help-backdrop");
    if (help?.classList.contains("open")) return;
    e.stopPropagation();
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
    let next = resolveTourStep(snapshot);
    current = next;
    try {
      await opts.ensureTargetVisible?.(next);
    } catch {
      /* still show the card */
    }
    if (token !== gen) return;
    if (next.id === "E0" && typeof opts.snapshot === "function") {
      try {
        next = resolveTourStep(opts.snapshot());
        current = next;
        await opts.ensureTargetVisible?.(next);
      } catch {
        /* keep E0 */
      }
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

  function close() {
    gen += 1;
    if (!root) return;
    root.classList.remove("is-open");
    document.body.classList.remove("tour-open");
    root.querySelector(".tour-panes")?.setAttribute("hidden", "");
    const ring = root.querySelector(".tour-ring");
    const card = root.querySelector(".tour-card");
    if (ring) ring.hidden = true;
    if (card) card.hidden = true;
    lastTarget?.classList?.remove("tour-target");
    lastTarget = null;
    current = null;
    const restore = openerEl || opts.restoreFocusEl?.() || null;
    openerEl = null;
    try {
      restore?.focus?.({ preventScroll: true });
    } catch {
      /* ignore */
    }
  }

  function layout(stepObj) {
    const host = ensureRoot();
    const card = host.querySelector(".tour-card");
    const ring = host.querySelector(".tour-ring");
    const panes = host.querySelector(".tour-panes");
    const title = host.querySelector("#tour-card-title");
    const body = host.querySelector("#tour-card-body");
    if (!card || !ring || !panes || !title || !body) return;

    title.textContent = stepObj.title;
    body.textContent = stepObj.body;
    card.hidden = false;
    card.dataset.step = stepObj.id;

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

    const skipDimmer = Boolean(stepObj.skipDimmer) || !rect;
    panes.hidden = skipDimmer;
    if (!skipDimmer && rect) {
      const hole = inflate(rect, RING_PAD);
      placePanes(panes, hole, vw, vh);
    }

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

function inflate(r, pad) {
  return {
    top: r.top - pad,
    left: r.left - pad,
    width: r.width + pad * 2,
    height: r.height + pad * 2,
    bottom: r.bottom + pad,
    right: r.right + pad,
  };
}

function placePanes(panes, hole, vw, vh) {
  const n = panes.querySelector('[data-edge="n"]');
  const s = panes.querySelector('[data-edge="s"]');
  const w = panes.querySelector('[data-edge="w"]');
  const e = panes.querySelector('[data-edge="e"]');
  const top = Math.max(0, hole.top);
  const left = Math.max(0, hole.left);
  const bottom = Math.min(vh, hole.bottom);
  const right = Math.min(vw, hole.right);
  if (n) {
    n.style.top = "0";
    n.style.left = "0";
    n.style.right = "0";
    n.style.height = `${top}px`;
  }
  if (s) {
    s.style.top = `${bottom}px`;
    s.style.left = "0";
    s.style.right = "0";
    s.style.bottom = "0";
    s.style.height = `${Math.max(0, vh - bottom)}px`;
  }
  if (w) {
    w.style.top = `${top}px`;
    w.style.left = "0";
    w.style.width = `${left}px`;
    w.style.height = `${Math.max(0, bottom - top)}px`;
  }
  if (e) {
    e.style.top = `${top}px`;
    e.style.left = `${right}px`;
    e.style.right = "0";
    e.style.height = `${Math.max(0, bottom - top)}px`;
  }
}

function placeCard(card, rect, vw, vh) {
  card.style.maxWidth = `${Math.min(340, vw - 24)}px`;
  card.removeAttribute("data-edge");
  // Measure after content set
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

  let chosen = candidates.find((c) => c.top >= 8 && c.left >= 8 && c.top + ch <= vh - 8 && c.left + cw <= vw - 8);
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


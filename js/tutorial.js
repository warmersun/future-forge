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
 * Hand-holding tutorial for Clean Water → Paddy Step Wells.
 *
 * Pure step resolver (no DOM) plus a browser overlay that reuses the ?
 * coach-mark look. While it is open, only the current step's targets accept
 * input. Scoring stays on the local heuristics — see tutorialCoInventResult.
 */

import {
  attachReadAloud,
  releaseReadAloudFollow,
  formatHeadingForSpeech,
  normalizeSpeakText,
} from "./read-aloud.js";

export const TUTORIAL_DONE_KEY = "future-forge:tutorialDone";

/** Exact strings the player must type. Pilot wording, no frontier claims. */
export const TUTORIAL_TEXT = {
  scarceIot: "Clean well water",
  mechIot:
    "Cheap nitrate sensors at each sluice text the keepers before runoff reaches the wells, starting with a pilot on the lower paddies",
  scarceDrones: "Early warning of runoff",
  mechDrones:
    "A small drone flies the paddies after each rain and maps where fertilizer runs off, so the keepers can agree one sluice calendar as a pilot",
  scarceBattery: "A flight that lasts past one pass",
  mechBattery:
    "A pack on the drone keeps that one pilot flight in the air long enough to map the sluices after rain",
  pathwayHow:
    "The drone flies one pilot after rain, and the battery keeps that flight in the air long enough to warn every sluice.",
  answer:
    "Sita's growers' committee signs the sluice calendar. Year one the sensors are paid by the co-op loan; by year five the saved fertilizer pays for them. Nobody pays to drink.",
};

const PASTE_SCARCE = "What is scarce here?";
const PASTE_MECH = "How does this emTech make it more abundant?";

/**
 * @param {Storage|null|undefined} storage
 */
export function readTutorialDone(storage) {
  const s = resolveStorage(storage);
  if (!s) return false;
  try {
    return s.getItem(TUTORIAL_DONE_KEY) === "1";
  } catch {
    return false;
  }
}

/** @param {Storage|null|undefined} [storage] */
export function markTutorialDone(storage) {
  const s = resolveStorage(storage);
  if (!s) return;
  try {
    s.setItem(TUTORIAL_DONE_KEY, "1");
  } catch {
    /* private mode */
  }
}

function resolveStorage(storage) {
  if (storage && typeof storage.getItem === "function") return storage;
  try {
    if (typeof globalThis !== "undefined" && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch {
    /* private mode */
  }
  return null;
}

/**
 * Fold quotes and whitespace so a careful typist still matches.
 * @param {unknown} value
 */
export function normalizeTyped(value) {
  return String(value ?? "")
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Exact match, or the expected sentence plus extra the player kept typing.
 * @param {unknown} actual
 * @param {unknown} expected
 */
export function typedMatches(actual, expected) {
  const a = normalizeTyped(actual);
  const e = normalizeTyped(expected);
  if (!e) return false;
  return a === e || a.startsWith(e);
}

/**
 * Live hint under a typing step.
 * @param {unknown} actual
 * @param {unknown} expected
 */
export function typeHint(actual, expected) {
  const a = normalizeTyped(actual);
  const e = normalizeTyped(expected);
  if (!a) return "Type this exactly.";
  if (a === e || a.startsWith(e)) return "That matches.";
  if (e.startsWith(a)) return "Keep typing…";
  return "Almost — check the spelling.";
}

/**
 * Local stand-in for coInvent while the tutorial is running.
 * `undefined` means "call the real AI" (vision and anything we did not pin).
 * @param {string} mode
 * @param {object} [extra]
 * @returns {object|null|undefined}
 */
export function tutorialCoInventResult(mode, extra) {
  switch (mode) {
    case "score-pathway":
      return {};
    case "assess-feasibility":
      return {};
    case "pose-challenge":
      return {};
    case "judge-challenge":
      return {
        quality: "glance",
        message:
          "The committee signs and the co-op pays, and nobody pays to drink — a partial answer, so the light stays yellow.",
      };
    case "evaluate-convergence":
      return tutorialConvergence(extra);
    case "idea-sparks": {
      const techId = String(extra?.focusTechId || extra?.techId || "");
      const battery = techId === "battery";
      const how = battery ? TUTORIAL_TEXT.mechBattery : TUTORIAL_TEXT.mechDrones;
      return {
        ideas: [{
          id: battery ? "spark-battery" : "spark-drones",
          title: battery ? "Battery Flight Pack" : "Runoff Mapper",
          blurb: how,
          insertText: how,
          howText: how,
          year: 2026,
        }],
      };
    }
    case "fact-check-argument":
      return {
        verdict: "reject",
        reason: "Finish the tutorial before arguing an assessment.",
      };
    default:
      return undefined;
  }
}

/**
 * Only Drones docked to Battery converge during the tutorial.
 * Any other pair, including the sensors, stays empty.
 * @param {object} [extra]
 */
function tutorialConvergence(extra) {
  const placed = extra?.placed;
  const neighbors = Array.isArray(extra?.neighbors) ? extra.neighbors : [];
  const neighbor = neighbors.find((n) => {
    const ids = [placed?.techId, n?.techId];
    return ids.includes("drones") && ids.includes("battery");
  });
  if (!neighbor?.id) return { convergences: [] };
  return {
    convergences: [
      {
        neighborId: neighbor.id,
        converges: true,
        title: "Drones × Battery",
        reason:
          "A pack keeps the pilot flight in the air long enough to map every sluice.",
      },
    ],
  };
}

/**
 * @param {object|null|undefined} step — materialized step (has place)
 * @param {object|null|undefined} tile
 * @param {number} q
 * @param {number} r
 * @returns {true|string}
 */
export function tutorialOccupyDecision(step, tile, q, r) {
  const place = step?.place;
  if (!place) return "Not yet — follow the glowing step.";
  if (place.techId && tile?.techId !== place.techId) {
    return "Drag the tile this step named.";
  }
  if (Number(q) !== Number(place.q) || Number(r) !== Number(place.r)) {
    return step.wrongPlaceHint || "Drop it on the glowing hex.";
  }
  return true;
}

function sel(selector) {
  return { kind: "selector", selector };
}

function techTarget(id) {
  return { kind: "tech", id };
}

function hexTile(id) {
  return { kind: "hex-tile", id };
}

function hexSlot(q, r) {
  return { kind: "hex-slot", q, r };
}

function islandHowTarget(techIds) {
  return { kind: "island-how", techIds };
}

function scarcePaste(selector, text) {
  return { selector, text, label: PASTE_SCARCE };
}

function mechPaste(selector, text) {
  return { selector, text, label: PASTE_MECH };
}

function fieldOf(snap, path) {
  const parts = String(path || "").split(".");
  let cur = snap;
  for (const p of parts) {
    if (cur == null) return "";
    cur = cur[p];
  }
  return cur == null ? "" : cur;
}

function inventions(snap) {
  return (Array.isArray(snap?.tiles) ? snap.tiles : []).filter(
    (t) => t && t.kind === "invention"
  );
}

function hasInvention(snap, techId) {
  return inventions(snap).some((t) => t.techId === techId);
}

function tileAt(snap, techId, q, r) {
  return inventions(snap).some(
    (t) => t.techId === techId && Number(t.q) === q && Number(t.r) === r
  );
}

function lastBriefBeat(snap) {
  const b = snap?.briefing || {};
  const n = Number(b.beatCount) || 0;
  if (n <= 0) return false;
  return (Number(b.index) || 0) >= n - 1;
}

function workshop(snap) {
  return snap?.screen === "workshop";
}

/**
 * @typedef {{ kind: string, selector?: string, id?: string, q?: number, r?: number }} TutorialTarget
 */

/**
 * @type {Array<{
 *   id: string,
 *   mode?: "act"|"read"|"finish",
 *   title: string | ((snap: object) => string),
 *   body: string | ((snap: object) => string),
 *   targets?: TutorialTarget[] | ((snap: object) => TutorialTarget[]),
 *   spotlight?: TutorialTarget[] | ((snap: object) => TutorialTarget[]),
 *   type?: { field: string, selector: string, text: string } | null,
 *   place?: { techId: string, q: number, r: number } | null,
 *   wrongPlaceHint?: string,
 *   advanceWhen?: (snap: object) => boolean,
 *   skipIf?: (snap: object) => boolean,
 * }>}
 */
export const TUTORIAL_STEPS = [
  {
    id: "deal-drones",
    title: "1 · Deal a 2026 milestone",
    body: "Drones already fly. Tap the lit 2026 milestone. Its use cases land in the next lane. No typing.",
    targets: [sel('#ontology-lane-tech [data-tech-id="drones"] button.is-latest-reached')],
    dockVision: true,
    advanceWhen: (s) => (s.useCaseCount || 0) > 0,
  },
  {
    id: "spark-mapper",
    title: "2 · Make a Runoff Mapper",
    body: "Ask for ideas, then tap + Add on Runoff Mapper. That one click places the invention. You do not type the how.",
    targets: [
      sel("#btn-ask-ideas"),
      sel("#ontology-sparks"),
    ],
    dockVision: true,
    advanceWhen: (s) => (s.pathwayCount || 0) >= 1,
  },
  {
    id: "add-battery",
    title: "3 · Add Battery",
    body: "Open Add tech, pick Battery, then tap its lit 2026 milestone.",
    targets: [
      sel("#btn-add-tech"),
      sel('#ontology-tech-picker [data-tech-id="battery"]'),
      sel('#ontology-lane-tech [data-tech-id="battery"] button.is-latest-reached'),
    ],
    dockVision: true,
    advanceWhen: (s) => (s.batteryUseCount || 0) > 0,
  },
  {
    id: "spark-pack",
    title: "3 · Make a Flight Pack",
    body: "Ask for ideas on Battery, then tap + Add on Battery Flight Pack.",
    targets: [
      sel("#btn-ask-ideas"),
      sel("#ontology-sparks"),
    ],
    dockVision: true,
    advanceWhen: (s) => (s.pathwayCount || 0) >= 2 || Boolean(s.hasBattery),
  },
  {
    id: "fuse-pack",
    title: "3 · Alchemy-fuse",
    body: "Open Fuse with… and join the Flight Pack to the Runoff Mapper. The bolt means the two techs make each other better.",
    targets: [sel('[data-menu="fuse"]')],
    dockVision: true,
    advanceWhen: (s) => Boolean(s.fused),
  },
  {
    id: "plug-water",
    title: "4 · Plug into Clean Water",
    body: "Open Plug into… and choose Clean Water. The wire is what gets scored.",
    targets: [sel('[data-menu="plug"]')],
    dockVision: true,
    advanceWhen: (s) => Boolean(s.wired),
  },
  {
    id: "clear-roadblock",
    title: "5 · Clear the Stakeholder",
    body: "Click Answer the hard questions to summon the Stakeholder onto the wire, then tap Fill tutorial reply →.",
    targets: (s) =>
      s.challengerDrawOpen
        ? [sel("#hex-challenger-draw")]
        : s.concernsOnBoard > 0
          ? [sel('[data-action="roadblock-suggest"]'), sel("#ontology-roadblock"), sel('[data-action="open-roadblock"]')]
          : [sel("#btn-to-challenge")],
    pinPopup: (s) => Boolean(s.concernsOnBoard > 0),
    dockBottom: true,
    advanceWhen: (s) => Boolean(s.roadblockClear),
  },
  {
    id: "declare-holds",
    title: "6 · Declare the pathway holds",
    body: "When the lights are yellow or green, declare the pathway holds. The Future Vision shows what changed.",
    targets: [sel("#btn-to-challenge")],
    dockVision: true,
    advanceWhen: (s) => s.screen === "outcome",
  },
  {
    id: "graduation",
    mode: "finish",
    title: "You held the pathway",
    body: "That was the whole loop: a milestone, a use, an invention, a fuse, a wire, one hard question, and a future. Start a Quest when you want a new place.",
    targets: [],
  },
];

export function resolveTutorialStep(raw, stepIndex = 0) {
  const snap = raw || {};
  if (snap.screen === "outcome") {
    const i = TUTORIAL_STEPS.findIndex((s) => s.id === "graduation");
    return { index: i, step: materialize(TUTORIAL_STEPS[i], snap), done: false };
  }
  let i = Math.max(0, Math.floor(Number(stepIndex) || 0));
  while (i < TUTORIAL_STEPS.length) {
    const step = TUTORIAL_STEPS[i];
    if (step.skipIf?.(snap)) {
      i += 1;
      continue;
    }
    if (step.advanceWhen?.(snap)) {
      i += 1;
      continue;
    }
    return { index: i, step: materialize(step, snap), done: false };
  }
  return { index: TUTORIAL_STEPS.length, step: null, done: true };
}

function materialize(step, snap) {
  const targets = asList(step.targets, snap);
  const spotlight = step.spotlight ? asList(step.spotlight, snap) : targets;
  return {
    id: step.id,
    mode: step.mode || "act",
    title: typeof step.title === "function" ? step.title(snap) : step.title,
    body: typeof step.body === "function" ? step.body(snap) : step.body,
    targets,
    spotlight,
    type: step.type || null,
    focusSelector: step.focusSelector || "",
    paste: Array.isArray(step.paste) ? step.paste : null,
    place: step.place || null,
    wrongPlaceHint: step.wrongPlaceHint || "",
    pinPopup:
      typeof step.pinPopup === "function"
        ? Boolean(step.pinPopup(snap))
        : Boolean(step.pinPopup),
    dockTop: Boolean(step.dockTop),
    dockBeside: Boolean(step.dockBeside),
    dockVision: Boolean(step.dockVision),
    dockBottom:
      typeof step.dockBottom === "function"
        ? Boolean(step.dockBottom(snap))
        : Boolean(step.dockBottom),
    expandVision: Boolean(step.expandVision),
    showTile: step.showTile || "",
    openSideTab: step.openSideTab || "",
    watchVision: Boolean(step.watchVision),
    holdNext: Boolean(
      step.watchVision &&
        (!snap.visionUrl || snap.visionUrl === snap.visionBaseline) &&
        !snap.visionSettled
    ),
  };
}

/**
 * Title, then the body on the card, then the paste quote.
 * Stable text so the shared TTS cache can reuse a clip the next time this card is read.
 * @param {{ title?: string, body?: string, paste?: Array<{label?: string, text?: string}>|null, type?: { text?: string }|null }|null|undefined} step
 */
export function tutorialCardSpeakText(step) {
  const title = formatHeadingForSpeech(step?.title);
  const body = String(step?.body || "")
    .replace(/\s+/g, " ")
    .trim();
  const quote = spokenQuote(step);
  return normalizeSpeakText([title, body, quote].filter(Boolean).join("\n\n"));
}

/**
 * Paste quote as one spoken line, matching the blockquote's collapsed text.
 * @param {{ paste?: Array<{label?: string, text?: string}>|null, type?: { text?: string }|null }|null|undefined} step
 */
function spokenQuote(step) {
  if (Array.isArray(step?.paste) && step.paste.length) {
    const raw = step.paste
      .map((row) => {
        const label = String(row?.label || "").trim();
        const text = String(row?.text || "").trim();
        if (label && text) return `${label}\n${text}`;
        return text || label;
      })
      .join("\n\n");
    return raw.replace(/\s+/g, " ").trim();
  }
  return String(step?.type?.text || "")
    .replace(/\s+/g, " ")
    .trim();
}

function clickableTargets(step) {
  if (!step || step.mode !== "act") return [];
  return step.targets || [];
}

/**
 * Controls inside an allowed container that must still wait.
 * @param {object|null} _step
 * @param {object} [_snap]
 * @returns {string[]} selectors
 */
export function deniedSelectors(_step, _snap) {
  return [];
}

function asList(value, snap) {
  const list = typeof value === "function" ? value(snap) : value;
  return Array.isArray(list) ? list : [];
}

function cssAttr(id) {
  return String(id || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function cssIdent(id) {
  const s = String(id || "");
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(s);
  }
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * @param {TutorialTarget|null|undefined} target
 * @param {ParentNode|null} [root]
 * @returns {Element|null}
 */
export function queryTutorialTarget(target, root) {
  const doc = typeof document !== "undefined" ? document : null;
  const scope = root || doc;
  if (!target || !scope?.querySelector) return null;
  const lookup = (selector) => {
    if (!selector) return null;
    return (
      scope.querySelector(selector) ||
      (doc && scope !== doc ? doc.querySelector(selector) : null)
    );
  };
  if (target.kind === "tech" && target.id) {
    return lookup(`.tech-card[data-id="${cssIdent(target.id)}"]`);
  }
  if (target.kind === "hex-tile" && target.id) {
    return (
      lookup(`#hex-board-svg [data-id="${cssIdent(target.id)}"]`) ||
      lookup(`#hex-board [data-id="${cssIdent(target.id)}"]`)
    );
  }
  if (target.kind === "hex-slot") {
    const q = cssIdent(target.q);
    const r = cssIdent(target.r);
    return lookup(`#hex-board-svg .hex-slot[data-q="${q}"][data-r="${r}"]`);
  }
  if (target.kind === "island-how" && Array.isArray(target.techIds)) {
    const blocks = scope.querySelectorAll?.(".hex-island-how-block") || [];
    for (const block of blocks) {
      const label = (block.querySelector(".hex-island-how-label")?.textContent || "").toLowerCase();
      if (target.techIds.every((id) => label.includes(String(id).toLowerCase()))) return block;
    }
    return null;
  }
  if (target.selector === "#btn-mint-custom") {
    const el =
      lookup("#screen-workshop.active #btn-mint-custom") ||
      lookup("#btn-mint-custom");
    if (!el || el.closest?.(".tech-card, .tech-library")) return null;
    return el;
  }
  if (target.selector) {
    const el = lookup(target.selector);
    if (!el) return null;
    return el.closest?.("label.hex-scaffold-field") || el;
  }
  return null;
}

const HOLE_PAD = 6;

/**
 * @param {{
 *   snapshot?: () => object,
 *   ensureTargetVisible?: (step: object) => void | Promise<void>,
 *   onQuit?: () => void,
 *   onFinish?: () => void,
 * }} [opts]
 */
export function createTutorial(opts = {}) {
  /** @type {HTMLElement|null} */
  let root = null;
  let index = 0;
  let open = false;
  let paintedId = "";
  /** Quantized hole geometry from the last ring/dimmer paint. */
  let lastGeomKey = "";
  /** Step id that last played the ring entrance animation. */
  let lastRingStep = "";
  let briefingSeen = false;
  let marketSeen = false;
  let marketGaveUp = false;
  /** @type {ReturnType<typeof setTimeout>|null} */
  let marketGrace = null;
  /** @type {object|null} */
  let current = null;
  /** Materialized card the speaker reads. Updated before each paint. */
  let spokenStep = null;
  /** @type {object} */
  let lastSnap = {};
  /** @type {Element[]} */
  let allowedEls = [];
  /** @type {string[]} */
  let deniedSels = [];
  /** Baseline Future-vision URL for the vision step currently armed. */
  let visionLatch = { id: "", baseline: "", settled: false };
  let bound = false;
  let observer = null;
  /** @type {ReturnType<typeof setTimeout>|null} */
  let refreshTimer = null;
  let refreshing = false;
  /** True while ensureTargetVisible is running, so focus/rail changes cannot paint a stale ring. */
  let ensuring = false;

  function coachCard() {
    return document.querySelector(".tour-card.is-tutorial");
  }

  function ensureRoot() {
    if (root?.isConnected) return root;
    root = document.getElementById("tutorial-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "tutorial-root";
      document.body.appendChild(root);
    }
    if (!root.dataset.tutorialBuilt) {
      root.dataset.tutorialBuilt = "1";
      root.innerHTML = `
        <svg class="tutorial-dim" aria-hidden="true">
          <path class="tutorial-dim-path" fill="rgba(2, 6, 14, 0.62)" fill-rule="evenodd"></path>
        </svg>
        <div class="tutorial-rings"></div>
        <div class="tour-card is-tutorial" role="dialog" aria-modal="true" aria-labelledby="tutorial-card-title" aria-describedby="tutorial-card-body" tabindex="-1">
          <p class="tour-kicker" id="tutorial-card-kicker">Tutorial</p>
          <h3 class="tour-card-title" id="tutorial-card-title"></h3>
          <p class="tour-card-body" id="tutorial-card-body"></p>
          <blockquote class="tutorial-type" id="tutorial-type" hidden></blockquote>
          <p class="tutorial-type-hint" id="tutorial-type-hint" hidden></p>
          <div class="tour-card-actions">
            <button type="button" class="btn btn-ghost btn-sm" id="tutorial-quit">Quit tutorial</button>
            <button type="button" class="btn btn-primary btn-sm" id="tutorial-next" hidden>Next</button>
            <button type="button" class="btn btn-primary btn-sm" id="tutorial-finish" hidden>Finish</button>
          </div>
        </div>
      `;
      root.querySelector("#tutorial-quit")?.addEventListener("click", () => {
        opts.onQuit?.();
      });
      root.querySelector("#tutorial-next")?.addEventListener("click", () => {
        if (current?.mode !== "read" || current?.holdNext) return;
        index += 1;
        paintedId = "";
        void refreshNow();
      });
      root.querySelector("#tutorial-finish")?.addEventListener("click", () => {
        opts.onFinish?.();
      });
      const card = root.querySelector(".tour-card");
      if (card) document.body.appendChild(card);
      card?.addEventListener(
        "wheel",
        (e) => {
          const max = card.scrollHeight - card.clientHeight;
          const atTop = card.scrollTop <= 0;
          const atBottom = card.scrollTop >= max - 1;
          const scrollingCard =
            max > 1 && ((e.deltaY < 0 && !atTop) || (e.deltaY > 0 && !atBottom));
          if (scrollingCard) return;
          const scroller = document.scrollingElement;
          if (!scroller) return;
          scroller.scrollTop += e.deltaY;
          e.preventDefault();
        },
        { passive: false }
      );
    }
    const parked = root.querySelector(".tour-card");
    if (parked) document.body.appendChild(parked);
    return root;
  }

  function bind() {
    if (bound) return;
    bound = true;
    const block = (e) => onGate(e);
    for (const type of [
      "pointerdown",
      "mousedown",
      "touchstart",
      "click",
      "auxclick",
      "dblclick",
      "contextmenu",
      "keydown",
    ]) {
      document.addEventListener(type, block, true);
    }
    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("input", onInput, true);
    window.addEventListener("resize", onGeometry, { passive: true });
    window.addEventListener("scroll", onGeometry, { passive: true, capture: true });
    observer = new MutationObserver((records) => {
      if (!open || refreshing) return;
      const relevant = records.some((rec) => {
        const t = rec.target;
        if (!(t instanceof Element) && !(t instanceof Document)) return false;
        const el = t instanceof Element ? t : null;
        if (el?.closest?.("#tutorial-root, .tour-card.is-tutorial")) return false;
        return true;
      });
      if (relevant) scheduleRefresh();
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
  }

  function onInput() {
    if (!open) return;
    scheduleRefresh();
  }

  function onGeometry() {
    if (!open || !current || ensuring) return;
    layout(current);
  }

  function scheduleRefresh() {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      refreshTimer = null;
      void refreshNow();
    }, 40);
  }

  function latch(snap) {
    const next = { ...(snap || {}) };
    if (next.briefing?.active) briefingSeen = true;
    if (next.marketNewsOpen) {
      marketSeen = true;
      marketGaveUp = false;
      if (marketGrace) {
        clearTimeout(marketGrace);
        marketGrace = null;
      }
    }
    next.briefingSeen = Boolean(next.briefingSeen || briefingSeen);
    next.marketNewsSeen = Boolean(next.marketNewsSeen || marketSeen);
    next.marketNewsGaveUp = Boolean(next.marketNewsGaveUp || marketGaveUp);
    return next;
  }

  /**
   * Arm the vision step only once we are standing on it, so the while-loop
   * that arrives there does not skip it before the player sees the picture.
   * @param {object} snap
   */
  function armVision(snap) {
    const step = TUTORIAL_STEPS[index];
    if (!step?.watchVision) {
      return { ...snap, visionArmed: "", visionBaseline: "", visionSettled: false };
    }
    if (visionLatch.id !== step.id) {
      visionLatch = { id: step.id, baseline: snap.visionUrl || "", settled: false };
    }
    return {
      ...snap,
      visionArmed: step.id,
      visionBaseline: visionLatch.baseline,
      visionSettled: Boolean(visionLatch.settled),
    };
  }

  function noteVisionSettled() {
    if (!open || !visionLatch.id || visionLatch.settled) return;
    visionLatch.settled = true;
    void refreshNow();
  }

  function armMarketGrace(step, snap) {
    if (step?.id !== "market-news") return;
    if (snap.marketNewsOpen || marketSeen || marketGaveUp || marketGrace) return;
    marketGrace = setTimeout(() => {
      marketGrace = null;
      if (!marketSeen) marketGaveUp = true;
      void refreshNow();
    }, 700);
  }

  function isOpen() {
    return open;
  }

  function start() {
    index = 0;
    paintedId = "";
    lastGeomKey = "";
    lastRingStep = "";
    briefingSeen = false;
    marketSeen = false;
    marketGaveUp = false;
    visionLatch = { id: "", baseline: "", settled: false };
    if (marketGrace) {
      clearTimeout(marketGrace);
      marketGrace = null;
    }
    open = true;
    silenceVoice();
    ensureRoot();
    bind();
    document.body.classList.add("tutorial-open");
    root?.classList.add("is-open");
    void refreshNow();
  }

  function silenceVoice() {
    releaseReadAloudFollow(document.querySelector("#tutorial-card-body"));
  }

  function close() {
    open = false;
    silenceVoice();
    current = null;
    spokenStep = null;
    allowedEls = [];
    deniedSels = [];
    paintedId = "";
    lastGeomKey = "";
    lastRingStep = "";
    if (marketGrace) {
      clearTimeout(marketGrace);
      marketGrace = null;
    }
    document.body.classList.remove("tutorial-open", "tutorial-popup-front");
    root?.classList.remove("is-open");
    document.querySelectorAll(".tutorial-target").forEach((el) => {
      el.classList.remove("tutorial-target");
    });
  }

  async function refreshNow() {
    if (!open) return;
    // focusTech refreshes coach marks while we are still revealing the target.
    // A nested paint would ring the old hole (the Drones card) and then skip
    // the repaint once the Mint button's box happens to match that key.
    if (ensuring) return;
    refreshing = true;
    try {
      const snap = armVision(latch(opts.snapshot?.() || {}));
      const resolved = resolveTutorialStep(snap, index);
      index = resolved.index;
      if (resolved.done || !resolved.step) {
        close();
        return;
      }
      armMarketGrace(resolved.step, snap);
      current = resolved.step;
      ensuring = true;
      try {
        await opts.ensureTargetVisible?.(current);
      } catch {
        /* still paint */
      } finally {
        ensuring = false;
      }
      if (!open) return;
      paint(current, snap);
    } finally {
      // Observer callbacks run after this turn. Stay refreshing until then
      // so our own DOM updates do not schedule another refresh.
      queueMicrotask(() => {
        refreshing = false;
      });
    }
  }

  function paint(step, snap) {
    const host = ensureRoot();
    const cardEl = coachCard();
    const title = cardEl?.querySelector("#tutorial-card-title");
    const body = cardEl?.querySelector("#tutorial-card-body");
    const kicker = cardEl?.querySelector("#tutorial-card-kicker");
    const typeEl = cardEl?.querySelector("#tutorial-type");
    const hintEl = cardEl?.querySelector("#tutorial-type-hint");
    const nextBtn = cardEl?.querySelector("#tutorial-next");
    const finishBtn = cardEl?.querySelector("#tutorial-finish");
    if (!title || !body || !kicker) return;
    spokenStep = step;
    const n = TUTORIAL_STEPS.findIndex((s) => s.id === step.id) + 1;
    kicker.textContent = `Tutorial · ${n} / ${TUTORIAL_STEPS.length}`;
    title.textContent = step.title;
    body.textContent = step.body;
    lastSnap = snap || {};
    applyPaste(step);
    const quoteHtml = pasteQuoteHtml(step);
    const quoteText = step.type?.text || "";
    if (typeEl) {
      if (quoteHtml) {
        typeEl.hidden = false;
        typeEl.innerHTML = quoteHtml;
      } else if (quoteText) {
        typeEl.hidden = false;
        typeEl.textContent = quoteText;
      } else {
        typeEl.hidden = true;
        typeEl.textContent = "";
      }
    }
    if (hintEl) {
      const showHint = Boolean(step.type?.text) && step.mode === "act";
      hintEl.hidden = !showHint;
      if (showHint) {
        hintEl.textContent = typeHint(fieldOf(snap, step.type.field), step.type.text);
      }
    }
    if (nextBtn) {
      nextBtn.hidden = step.mode !== "read";
      nextBtn.disabled = Boolean(step.holdNext);
    }
    if (finishBtn) finishBtn.hidden = step.mode !== "finish";
    attachReadAloud(body, {
      minChars: 1,
      continueOnChange: true,
      getText: () => tutorialCardSpeakText(spokenStep),
    });
    const card = coachCard();
    if (card) card.dataset.step = step.id;
    const changed = paintedId !== step.id;
    paintedId = step.id;
    layout(step);
    if (!changed) return;
    const focusSel = step.focusSelector || step.type?.selector;
    const field = focusSel ? document.querySelector(focusSel) : null;
    const focusEl = field || card;
    try {
      focusEl?.focus?.({ preventScroll: true });
    } catch {
      /* ignore */
    }
  }

  function layout(step) {
    const host = ensureRoot();
    const spots = step.spotlight?.length ? step.spotlight : step.targets;
    const clickable = clickableTargets(step);
    allowedEls = clickable.map((t) => queryTutorialTarget(t)).filter(Boolean);
    deniedSels = deniedSelectors(step, lastSnap);
    const holeEls = spots.map((t) => queryTutorialTarget(t)).filter(Boolean);
    const holeSet = new Set(holeEls);
    document.querySelectorAll(".tutorial-target").forEach((el) => {
      if (!holeSet.has(el)) el.classList.remove("tutorial-target");
    });
    for (const el of holeEls) {
      if (!el.classList.contains("tutorial-target")) el.classList.add("tutorial-target");
    }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const holes = holeEls
      .map((el) => targetRect(el))
      .filter(Boolean)
      .map((r) => quantizeRect(inflate(r, HOLE_PAD)));
    const geomKey = `${vw}x${vh}|${holes
      .map((h) => `${h.left},${h.top},${h.width},${h.height}`)
      .join(";")}`;
    const stepChanged = step.id !== lastRingStep;
    if (stepChanged || geomKey !== lastGeomKey) {
      lastGeomKey = geomKey;
      lastRingStep = step.id;
      paintDim(host, holes, vw, vh);
      paintRings(host, holes, stepChanged);
    }
    const anchor = holes[0] || null;
    const card = coachCard();
    document.body.classList.toggle("tutorial-popup-front", Boolean(step.pinPopup));
    const pin = step.dockTop
      ? "top"
      : step.dockVision
        ? "vision"
        : step.dockBeside
          ? "beside"
          : step.pinPopup || step.dockBottom
            ? "bottom"
            : "";
    if (card) placeCard(card, anchor, vw, vh, pin);
  }

  function islandHowField(techIds) {
    const ids = (techIds || []).map((id) => String(id).toLowerCase());
    const blocks = document.querySelectorAll(".hex-island-how-block");
    for (const block of blocks) {
      const label = (block.querySelector(".hex-island-how-label")?.textContent || "").toLowerCase();
      if (ids.every((id) => label.includes(id))) return block.querySelector("textarea");
    }
    return null;
  }

  function applyPaste(step) {
    if (!Array.isArray(step?.paste)) return;
    const scaffold = step.paste.some((row) =>
      String(row?.selector || "").includes("hex-scaffold-")
    );
    if (scaffold) opts.useScaffold?.();
    for (const row of step.paste) {
      const el = row.islandTechs
        ? islandHowField(row.islandTechs)
        : document.querySelector(row.selector);
      if (!el || el.value === row.text) continue;
      el.value = row.text;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  function nudge() {
    const card = coachCard();
    if (!card) return;
    card.classList.remove("tutorial-nudge");
    void card.offsetWidth;
    card.classList.add("tutorial-nudge");
  }

  function onGate(e) {
    if (!open) return;
    if (e.type === "dblclick") {
      e.preventDefault();
      e.stopPropagation();
      nudge();
      return;
    }
    const target = e.target;
    if (isAllowed(target)) {
      if (e.type === "keydown" && e.key === "Tab") {
        e.preventDefault();
        e.stopPropagation();
      }
      return;
    }
    if (e.type === "keydown" && isTypingKey(e) && typingFieldFocused()) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "pointerdown" || e.type === "mousedown" || e.type === "touchstart" || e.type === "click") {
      nudge();
    }
  }

  function onFocusIn(e) {
    if (!open) return;
    if (isAllowed(e.target)) return;
    if (e.target === document.body) return;
    try {
      e.target?.blur?.();
    } catch {
      /* ignore */
    }
  }

  function isAllowed(node) {
    const el = node?.nodeType === 1 ? node : node?.parentElement;
    if (!el?.closest) return false;
    if (el.closest(".hex-idea-card-discard, #hex-tile-popup-discard, #hex-tile-popup-lift")) {
      return false;
    }
    if (el.closest(".tour-card.is-tutorial")) return true;
    if (el.closest("#btn-abandon")) return true;
    if (el.closest("#hex-challenger-draw")) return true;
    if (current?.id === "clear-roadblock" && el.closest("#ontology-roadblock")) return true;
    if (current?.id === "answer" && el.closest(".hex-tile-popup-card")) return true;
    if (current?.expandVision && el.closest(".vision-split-handle")) return true;
    if (current?.id === "deal-drones" && el.closest('#ontology-lane-tech [data-tech-id="drones"] button.ontology-ms')) {
      return true;
    }
    if (current?.id === "add-battery" && el.closest('#ontology-lane-tech [data-tech-id="battery"] button.ontology-ms, #ontology-tech-picker .ontology-domain-pills')) {
      return true;
    }
    if (current?.mode !== "act") return false;
    if (deniedSels.some((s) => el.closest(s))) return false;
    if (allowedEls.some((t) => t.isConnected && (t === el || t.contains(el)))) return true;
    const liveClickable = clickableTargets(current)
      .map((t) => queryTutorialTarget(t))
      .filter(Boolean);
    return liveClickable.some((t) => t === el || t.contains(el));
  }

  function typingFieldFocused() {
    const sel = current?.type?.selector;
    if (!sel) return false;
    const field = document.querySelector(sel);
    return Boolean(field && (document.activeElement === field || field.contains(document.activeElement)));
  }

  function allowOccupy(tile, q, r) {
    if (!open) return true;
    return tutorialOccupyDecision(current, tile, q, r);
  }

  return {
    start,
    close,
    refresh: () => {
      if (!open) return;
      void refreshNow();
    },
    isOpen,
    nudge,
    allowOccupy,
    noteVisionSettled,
    currentStep: () => current,
  };
}

function isTypingKey(e) {
  if (!e || e.type !== "keydown") return false;
  if (e.key === "Tab" || e.key === "Escape") return false;
  return true;
}

function paintDim(host, holes, vw, vh) {
  const svg = host.querySelector(".tutorial-dim");
  const path = host.querySelector(".tutorial-dim-path");
  if (!svg || !path) return;
  svg.setAttribute("viewBox", `0 0 ${vw} ${vh}`);
  svg.setAttribute("width", String(vw));
  svg.setAttribute("height", String(vh));
  const outer = `M0,0 H${vw} V${vh} H0 Z`;
  const inner = holes.map((h) => holePath(h, 12)).join(" ");
  path.setAttribute("d", `${outer} ${inner}`);
}

/**
 * Move existing rings. The fade-in runs when a ring is created or the step
 * changes, not when a refresh paints the same hole again.
 * @param {HTMLElement} host
 * @param {Array<{ top: number, left: number, width: number, height: number }>} holes
 * @param {boolean} animate
 */
function paintRings(host, holes, animate) {
  const box = host.querySelector(".tutorial-rings");
  if (!box) return;
  const rings = [...box.children];
  while (rings.length > holes.length) {
    rings.pop()?.remove();
  }
  for (let i = 0; i < holes.length; i++) {
    let ring = rings[i];
    let created = false;
    if (!(ring instanceof HTMLElement)) {
      ring = document.createElement("div");
      ring.className = "tour-ring tutorial-ring";
      box.appendChild(ring);
      created = true;
    }
    const h = holes[i];
    ring.style.top = `${h.top}px`;
    ring.style.left = `${h.left}px`;
    ring.style.width = `${h.width}px`;
    ring.style.height = `${h.height}px`;
    if (created || animate) restartRingIn(ring);
  }
}

function restartRingIn(ring) {
  ring.classList.remove("tutorial-ring-in");
  void ring.offsetWidth;
  ring.classList.add("tutorial-ring-in");
}

function quantizeRect(r) {
  const top = Math.round(r.top);
  const left = Math.round(r.left);
  const width = Math.max(0, Math.round(r.width));
  const height = Math.max(0, Math.round(r.height));
  return {
    top,
    left,
    width,
    height,
    bottom: top + height,
    right: left + width,
  };
}

function holePath(r, rad) {
  const x = Math.round(r.left);
  const y = Math.round(r.top);
  const w = Math.max(0, Math.round(r.width));
  const h = Math.max(0, Math.round(r.height));
  const r0 = Math.min(rad, w / 2, h / 2);
  if (w < 2 || h < 2) return "";
  return `M${x + r0},${y} H${x + w - r0} A${r0},${r0} 0 0 1 ${x + w},${y + r0} V${y + h - r0} A${r0},${r0} 0 0 1 ${x + w - r0},${y + h} H${x + r0} A${r0},${r0} 0 0 1 ${x},${y + h - r0} V${y + r0} A${r0},${r0} 0 0 1 ${x + r0},${y} Z`;
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

const CARD_GAP = 12;

function escapeQuote(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function pasteQuoteHtml(step) {
  if (!Array.isArray(step?.paste) || !step.paste.length) return "";
  return step.paste
    .map((row) => {
      const text = escapeQuote(row.text);
      if (!row.label) return text;
      return `<em>${escapeQuote(row.label)}</em>\n${text}`;
    })
    .join("\n\n");
}

function placeCard(card, rect, vw, vh, pin) {
  card.style.maxWidth = `${Math.min(360, vw - 24)}px`;
  card.style.right = "auto";
  if (pin === "vision") {
    const panel =
      document.querySelector("#screen-workshop.active .vision-panel") ||
      document.querySelector(".vision-panel");
    const pr = panel?.getBoundingClientRect();
    card.style.maxWidth = "320px";
    card.style.bottom = "auto";
    const cw = Math.min(320, card.getBoundingClientRect().width || 320);
    const ch = card.offsetHeight || 180;
    const left =
      pr && pr.width > 40
        ? clamp(pr.left + CARD_GAP, 12, vw - cw - 12)
        : clamp(vw - cw - 24, 12, vw - cw - 12);
    const top = clamp((vh - ch) / 2, 12, Math.max(12, vh - ch - 12));
    card.style.left = `${Math.round(left)}px`;
    card.style.top = `${Math.round(top)}px`;
    return;
  }
  if (pin === "beside") {
    const panel =
      document.querySelector("#screen-workshop.active .vision-panel") ||
      document.querySelector(".vision-panel");
    const pr = panel?.getBoundingClientRect();
    card.style.maxWidth = "320px";
    card.style.bottom = "auto";
    const cw = Math.min(320, card.getBoundingClientRect().width || 320);
    const ch = card.offsetHeight || 180;
    const panelLeft = pr && pr.width > 40 ? pr.left : vw * 0.62;
    const left = clamp(panelLeft - CARD_GAP - cw, 12, vw - cw - 12);
    const top = clamp((vh - ch) / 2, 12, Math.max(12, vh - ch - 12));
    card.style.left = `${Math.round(left)}px`;
    card.style.top = `${Math.round(top)}px`;
    return;
  }
  if (pin === "bottom" || pin === "top") {
    card.style.left = "12px";
    card.style.maxWidth = "320px";
    if (pin === "top") {
      card.style.top = "12px";
      card.style.bottom = "auto";
    } else {
      card.style.top = "auto";
      card.style.bottom = "12px";
    }
    return;
  }
  card.style.bottom = "auto";
  const cw = card.offsetWidth || 320;
  const ch = card.offsetHeight || 180;
  if (!rect) {
    card.style.left = `${Math.max(12, (vw - cw) / 2)}px`;
    card.style.top = `${Math.max(12, vh * 0.18)}px`;
    return;
  }
  const candidates = [
    { left: clamp(rect.left, 12, vw - cw - 12), top: rect.bottom + CARD_GAP },
    { left: clamp(rect.left, 12, vw - cw - 12), top: rect.top - CARD_GAP - ch },
    { left: rect.right + CARD_GAP, top: clamp(rect.top, 12, vh - ch - 12) },
    { left: rect.left - CARD_GAP - cw, top: clamp(rect.top, 12, vh - ch - 12) },
  ];
  const chosen =
    candidates.find(
      (c) => c.top >= 8 && c.left >= 8 && c.top + ch <= vh - 8 && c.left + cw <= vw - 8
    ) || {
      left: clamp(rect.left, 12, vw - cw - 12),
      top: clamp(rect.bottom + CARD_GAP, 12, vh - ch - 12),
    };
  card.style.left = `${Math.round(chosen.left)}px`;
  card.style.top = `${Math.round(chosen.top)}px`;
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

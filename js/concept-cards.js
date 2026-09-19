/**
 * Friend's-seven concept cards — pure resolver + card data (no DOM).
 *
 * Seven ideas the practice rests on (docs/on-the-curve-recording-pack.md):
 * Look Ahead, honesty bar, convergence, pathway, Wait vs End turn,
 * Art of the possible, Learn. Each card auto-opens once per Quest at the
 * first moment it matters, in every Quest, until the player quiets that
 * concept. All seven stay reachable from the ? card.
 */

export const MUTED_KEY = "future-forge:conceptCardsMuted";
export const CONCEPT_KICKER = "Concept";
export const BODY_WORD_MAX = 45;

/** @typedef {{ kind: "selector"|"tech"|"hex-tile", selector?: string, id?: string }} CardTarget */

/**
 * @typedef {{
 *   id: string,
 *   order: number,
 *   title: string,
 *   body: string,
 *   glossaryId: string,
 *   kicker: string,
 *   target: CardTarget,
 *   skipDimmer?: boolean,
 *   openSideTab?: string,
 *   openTray?: boolean,
 * }} ConceptCard
 */

const sel = (selector) => ({ kind: "selector", selector });
const hexTarget = (id) => ({ kind: "hex-tile", id });

/** @type {ConceptCard[]} */
export const CONCEPT_CARDS = [
  {
    id: "look-ahead",
    order: 1,
    title: "Look Ahead is the exponential clock",
    body: "Every emerging tech on your board gets better on a curve — cheaper, faster, more capable each year. Look Ahead shows how fast, and what two more years would buy you.",
    glossaryId: "look-ahead",
    kicker: CONCEPT_KICKER,
    target: sel("#btn-wait"),
  },
  {
    id: "honesty-bar",
    order: 2,
    title: "Is this real this year?",
    body: "The bar under a tile's name answers one question: can this technology really do that here, this year? Green is honest now. Red means the claim is still ahead of the curve.",
    glossaryId: "honest",
    kicker: CONCEPT_KICKER,
    target: sel("#feasibility"),
  },
  {
    id: "convergence",
    order: 3,
    title: "Convergence: A makes B better, and B pulls A",
    body: "Two families that touch can speed each other up. Better batteries make better drones; more drones demand better batteries. That loop is how exponential progress usually arrives.",
    glossaryId: "convergence",
    kicker: CONCEPT_KICKER,
    target: sel(".hex-convergence-card"),
    skipDimmer: true,
  },
  {
    id: "pathway",
    order: 4,
    title: "The combination is the idea",
    body: "Your connected tiles are judged as one invention, not a pile of parts. Coverage, Bonds and Timing read the whole pathway — what it eases, and what it still misses.",
    glossaryId: "pathway",
    kicker: CONCEPT_KICKER,
    target: sel("#feasibility"),
  },
  {
    id: "wait-vs-end-turn",
    order: 5,
    title: "Jump the curve, pay in crisis",
    body: "End turn moves one year and leaves the meters alone. Wait +2 years moves your technologies up the curve — and the crisis meters rise. Timing is choosing when that trade is worth it.",
    glossaryId: "wait",
    kicker: CONCEPT_KICKER,
    target: sel("#wait-confirm-ok"),
    skipDimmer: true,
  },
  {
    id: "art-of-the-possible",
    order: 6,
    title: "What works here, this year",
    body: "Not sure what a family can really do yet? Art of the possible asks the co-inventor what already works with these technologies in this place, this year — and what is still a stretch.",
    glossaryId: "art-of-the-possible",
    kicker: CONCEPT_KICKER,
    target: sel('.co-chip[data-mode="art-of-the-possible"]'),
    openSideTab: "coinventor",
  },
  {
    id: "learn",
    order: 7,
    title: "Learn: where this family sits on the curve",
    body: "Learn is a short primer on one family: what it is, what already works, where the curve is heading, and how to invent with it here. Best read while ideas generate.",
    glossaryId: "learn",
    kicker: CONCEPT_KICKER,
    target: sel("#btn-learn-tech"),
    openTray: true,
  },
];

const BY_ID = new Map(CONCEPT_CARDS.map((c) => [c.id, c]));

/** @returns {ConceptCard[]} in Friend's-seven order */
export function listConcepts() {
  return CONCEPT_CARDS.slice().sort((a, b) => a.order - b.order);
}

/**
 * @param {string} id
 * @returns {ConceptCard|null}
 */
export function conceptById(id) {
  return BY_ID.get(String(id || "")) || null;
}

/** Normalize the raw workshop snapshot (same field names as guided-tour snapOf). */
function snap(raw) {
  raw = raw && typeof raw === "object" ? raw : {};
  const briefing = raw.briefing || {};
  const pathway = raw.pathway || {};
  const ui = raw.ui || {};
  const mp = raw.mp || {};
  return {
    screen: raw.screen || "workshop",
    focusedTechId: raw.focusedTechId || null,
    sideTab: raw.sideTab || "vision",
    briefingActive: Boolean(briefing.active),
    unplaced: Number(raw.unplacedInventionCount) || 0,
    placed: Number(raw.placedInventionCount) || 0,
    timingLevel: pathway.timingLevel || null,
    timingPending: Boolean(pathway.timingPending),
    coverage: pathway.coverage || "red",
    redInventionId: raw.redInventionId || null,
    firstPlacedTileId: raw.firstPlacedTileId || null,
    convergedTileId: raw.convergedTileId || null,
    waitUsed: Boolean(raw.waitUsed),
    spectator: Boolean(mp.spectator),
    ui: {
      waitConfirmOpen: Boolean(ui.waitConfirmOpen),
      tilePopupOpen: Boolean(ui.tilePopupOpen),
      convergenceOpen: Boolean(ui.convergenceOpen),
      createBusy: Boolean(ui.createBusy),
      summonBusy: Boolean(ui.summonBusy),
      challengerDrawOpen: Boolean(ui.challengerDrawOpen),
    },
  };
}

function toSet(v) {
  if (v instanceof Set) return v;
  return new Set(Array.isArray(v) ? v : []);
}

/**
 * Which concept card (if any) should auto-open for this snapshot.
 * Guards suppress everything; triggers are checked in Friend's-seven order
 * among cards not yet seen this Quest and not muted for good.
 * @param {object} raw — tourSnapshot()
 * @param {{ seen?: Iterable<string>|Set<string>, muted?: Iterable<string>|Set<string> }} [opts]
 * @returns {ConceptCard|null}
 */
export function resolveConceptCard(raw, opts = {}) {
  const s = snap(raw);
  if (s.screen !== "workshop") return null;
  if (s.briefingActive) return null;
  if (s.spectator) return null;
  if (s.ui.createBusy || s.ui.summonBusy || s.ui.challengerDrawOpen) return null;
  if (s.ui.tilePopupOpen) return null;

  const seen = toSet(opts.seen);
  const muted = toSet(opts.muted);
  const fires = {
    "look-ahead": s.unplaced + s.placed >= 1,
    "honesty-bar": s.placed >= 1 && !s.timingPending && Boolean(s.timingLevel),
    convergence: s.ui.convergenceOpen || Boolean(s.convergedTileId),
    pathway: s.placed >= 2 || (s.placed >= 1 && s.coverage !== "red"),
    "wait-vs-end-turn": s.ui.waitConfirmOpen || s.waitUsed,
    "art-of-the-possible": Boolean(s.redInventionId) || s.sideTab === "coinventor",
    learn: Boolean(s.focusedTechId),
  };

  for (const card of listConcepts()) {
    if (seen.has(card.id) || muted.has(card.id)) continue;
    if (!fires[card.id]) continue;
    return withLiveTarget(card, s);
  }
  return null;
}

/** Point the honesty card at the first placed tile when there is one. */
function withLiveTarget(card, s) {
  if (card.id === "honesty-bar" && s.firstPlacedTileId) {
    return { ...card, target: hexTarget(s.firstPlacedTileId) };
  }
  if (card.id === "convergence" && !s.ui.convergenceOpen && s.convergedTileId) {
    return { ...card, target: hexTarget(s.convergedTileId), skipDimmer: false };
  }
  if (card.id === "wait-vs-end-turn" && !s.ui.waitConfirmOpen) {
    // Dialog closed (after a Wait): anchor on the Look Ahead button, with the dimmer.
    return { ...card, target: sel("#btn-wait"), skipDimmer: false };
  }
  return card;
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
 * Concepts the player quieted for good.
 * @param {Storage|null} [storage]
 * @returns {Set<string>}
 */
export function readMutedConcepts(storage) {
  const s = resolveStorage(storage);
  if (!s) return new Set();
  try {
    const raw = JSON.parse(s.getItem(MUTED_KEY) || "[]");
    return new Set((Array.isArray(raw) ? raw : []).map(String).filter((id) => BY_ID.has(id)));
  } catch {
    return new Set();
  }
}

/**
 * @param {Iterable<string>} ids
 * @param {Storage|null} [storage]
 */
export function writeMutedConcepts(ids, storage) {
  const s = resolveStorage(storage);
  if (!s) return;
  const list = [...new Set([...ids].map(String).filter((id) => BY_ID.has(id)))];
  try {
    if (list.length) s.setItem(MUTED_KEY, JSON.stringify(list));
    else s.removeItem(MUTED_KEY);
  } catch {
    /* private mode */
  }
}

/**
 * Toggle one concept's mute flag and persist.
 * @param {string} id
 * @param {boolean} on
 * @param {Storage|null} [storage]
 * @returns {Set<string>} the new muted set
 */
export function setConceptMuted(id, on, storage) {
  const muted = readMutedConcepts(storage);
  if (!BY_ID.has(id)) return muted;
  if (on) muted.add(id);
  else muted.delete(id);
  writeMutedConcepts(muted, storage);
  return muted;
}

/** @param {string} text */
export function wordCount(text) {
  return String(text || "").trim().split(/\s+/).filter(Boolean).length;
}

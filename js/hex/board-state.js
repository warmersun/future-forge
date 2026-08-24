/**
 * Hex invent board document — occupy / lift / neighbors / win.
 * DOM-free. Uses hex-tile-grid for docking geometry.
 */

import {
  BITS,
  ATOMS,
  CURVE,
  makeGrid,
  neighbor,
  keyOf,
  canDock,
} from "./hex-tile-grid.js";
import { polarityForTech, SPLIT } from "./polarity.js";
import { GAME, clampChallengerCount } from "../data.js";

export const TILE_KIND = {
  invention: "invention",
  crisis: "crisis",
  concern: "concern",
  rd: "rd",
};

/** Equal-weight R&D mint rolls. */
export const RD_FACTORS = [0.75, 1, 1.5, 2];

/** Free invention-to-invention acceleration (smaller than a lucky 2× R&D). */
export const CONVERGENCE_FACTOR = 1.25;

export const CONCERN_ANGLES = ["nature", "moloch", "ethicist", "stakeholder"];

export const CONCERN_LABELS = {
  nature: "Mother Nature",
  moloch: "Moloch",
  ethicist: "Ethicist",
  stakeholder: "Stakeholder",
};

export const CRISIS_ROLE_DEFAULT_NAMES = {
  local: "Here and now",
  global: "Root cause",
  support: "Public support",
};

/** Learner-facing one-liners for what each crisis-meter perspective judges. */
export const CRISIS_ROLE_BLURBS = {
  local: "the harm people feel on the ground today",
  global: "the underlying problem, not only the surface",
  support: "buy-in so the pathway can actually field",
};

/**
 * Empty board document.
 * @returns {object}
 */
export function createEmptyBoard() {
  return {
    tiles: {},
    concernsSummoned: false,
    concernTargetCount: clampChallengerCount(GAME.challengerCount),
    concernRoster: null,
    evalSeq: 0,
    /** Quest-start pressure (+ Wait rises). Invention relief lives in pathwayImpacts. */
    pressureBase: null,
    /**
     * Cached AI scores per invention-component fingerprint.
     * @type {Record<string, {
     *   inventionIds: string[],
     *   crisisDelta: { local: number, global: number, support: number },
     *   concerns: Record<string, { level: string, reason: string }>,
     *   pending: boolean,
     * }>}
     */
    pathwayImpacts: {},
    /**
     * Already-judged invention pairs. Key = sorted `idA|idB`.
     * Rows persist after lift so a re-dock does not stack; dropped when a
     * member is discarded.
     * @type {Record<string, {
     *   factor: number,
     *   title: string,
     *   reason: string,
     * }>}
     */
    convergences: {},
  };
}

/**
 * Deep-ish clone of a board (tiles are plain objects).
 * @param {object|null|undefined} board
 */
export function cloneBoard(board) {
  if (!board) return createEmptyBoard();
  const base = board.pressureBase;
  const impacts = board.pathwayImpacts || {};
  return {
    tiles: Object.fromEntries(
      Object.entries(board.tiles || {}).map(([id, t]) => [id, { ...t }])
    ),
    concernsSummoned: Boolean(board.concernsSummoned),
    concernTargetCount: clampChallengerCount(
      board.concernTargetCount ?? GAME.challengerCount
    ),
    concernRoster: Array.isArray(board.concernRoster)
      ? board.concernRoster.map(String)
      : null,
    evalSeq: Number(board.evalSeq) || 0,
    pressureBase:
      base && typeof base === "object"
        ? Object.fromEntries(
            Object.entries(base).map(([k, v]) => [k, Number(v) || 0])
          )
        : null,
    pathwayImpacts: Object.fromEntries(
      Object.entries(impacts).map(([fp, row]) => [
        fp,
        {
          inventionIds: Array.isArray(row?.inventionIds)
            ? row.inventionIds.map(String)
            : [],
          crisisDelta: {
            local: Number(row?.crisisDelta?.local) || 0,
            global: Number(row?.crisisDelta?.global) || 0,
            support: Number(row?.crisisDelta?.support) || 0,
          },
          concerns:
            row?.concerns && typeof row.concerns === "object"
              ? Object.fromEntries(
                  Object.entries(row.concerns).map(([a, c]) => [
                    a,
                    {
                      level: String(c?.level || "red"),
                      reason: String(c?.reason || "").slice(0, 280),
                    },
                  ])
                )
              : {},
          pending: Boolean(row?.pending),
        },
      ])
    ),
    convergences: cloneConvergences(board.convergences),
  };
}

/**
 * @param {object|null|undefined} src
 */
function cloneConvergences(src) {
  const out = {};
  if (!src || typeof src !== "object") return out;
  for (const [k, row] of Object.entries(src)) {
    if (!row || typeof row !== "object") continue;
    out[k] = {
      enhancedId: String(row.enhancedId || ""),
      factor: Number(row.factor) || CONVERGENCE_FACTOR,
      title: String(row.title || "").slice(0, 80),
      reason: String(row.reason || "").slice(0, 400),
    };
  }
  return out;
}

/**
 * Stable pair key for two invention ids.
 * @param {string} idA
 * @param {string} idB
 */
export function convergencePairKey(idA, idB) {
  return [String(idA || ""), String(idB || "")].sort().join("|");
}

/**
 * Format a multiplier for HUD / tile face (0.75 → "0.75×").
 * @param {number} factor
 */
export function formatFactor(factor) {
  const n = Number(factor);
  if (!Number.isFinite(n)) return "1×";
  const rounded = Math.round(n * 100) / 100;
  const s = Number.isInteger(rounded) ? String(rounded) : String(rounded);
  return `${s}×`;
}

/**
 * @param {() => number} [rng]
 * @returns {number}
 */
export function rollRdFactor(rng = Math.random) {
  const i = Math.floor(Number(rng()) * RD_FACTORS.length);
  return RD_FACTORS[Math.max(0, Math.min(RD_FACTORS.length - 1, i))] ?? 1;
}

/**
 * True if the tile can be lifted, discarded, or tray-dragged.
 * @param {object|null|undefined} tile
 */
export function isPortableTile(tile) {
  return tile?.kind === TILE_KIND.invention || tile?.kind === TILE_KIND.rd;
}

/**
 * Seed crisis meter tiles from a mission (active roles only).
 * Place and named person are NOT tiles.
 * @param {object} mission
 * @param {object} [opts]
 * @param {number} [opts.startQ]
 * @param {number} [opts.startR]
 */
export function seedCrisisTiles(mission, opts = {}) {
  const board = createEmptyBoard();
  const roles =
    Array.isArray(mission?.crisisRoles) && mission.crisisRoles.length
      ? mission.crisisRoles
      : inferRolesFromPressure(mission?.pressure);
  const keys = Object.keys(mission?.pressure || {});
  const startQ = opts.startQ ?? 1;
  const startR = opts.startR ?? 3;

  roles.forEach((role, i) => {
    const id = `crisis-${role}`;
    const name =
      (keys[i] != null ? keys[i] : null) ||
      CRISIS_ROLE_DEFAULT_NAMES[role] ||
      role;
    board.tiles[id] = {
      id,
      kind: TILE_KIND.crisis,
      q: startQ + i,
      r: startR,
      polarity: CURVE,
      name,
      role,
      meterKey: name,
      lamp: "yellow",
      lampPending: false,
      lampEvalKey: null,
      artUrl: null,
      imagePrompt: null,
    };
  });
  const pressure = mission?.pressure || {};
  board.pressureBase = Object.fromEntries(
    Object.entries(pressure).map(([k, v]) => [
      k,
      Math.max(0, Math.min(5, Math.round(Number(v) || 0))),
    ])
  );
  board.pathwayImpacts = {};
  board.concernTargetCount = clampChallengerCount(
    opts.challengerCount ?? mission?.challengerCount ?? GAME.challengerCount
  );
  board.concernRoster = null;
  board.concernsSummoned = false;
  return board;
}

/**
 * @param {Record<string, number>|null|undefined} pressure
 * @returns {string[]}
 */
function inferRolesFromPressure(pressure) {
  const n = Object.keys(pressure || {}).length;
  if (n <= 0) return ["local", "global", "support"];
  if (n === 1) return ["local"];
  if (n === 2) return ["local", "support"];
  return ["local", "global", "support"];
}

/**
 * Mint an invention tile (not yet on the field unless q/r set).
 * @param {object} opts
 */
export function mintInventionTile(opts = {}) {
  const techId = opts.techId || null;
  const id =
    opts.id ||
    `inv-${techId || "x"}-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 7)}`;
  return {
    id,
    kind: TILE_KIND.invention,
    q: opts.q ?? null,
    r: opts.r ?? null,
    techId,
    polarity: opts.polarity || polarityForTech(techId),
    name: String(opts.name || "Idea").slice(0, 80),
    howText: String(opts.howText || "").slice(0, 4000),
    year: Number(opts.year) || 2026,
    artUrl: opts.artUrl || null,
    imagePrompt: opts.imagePrompt || null,
    feasibilityPct: opts.feasibilityPct ?? null,
    timingLevel: opts.timingLevel ?? null,
    timingReason: opts.timingReason ?? null,
    timingPending: false,
    timingForKey: null,
    origin: opts.origin || null,
    lamp: null,
    /** Sticky honesty multiplier from convergences (default 1). Survives lift. */
    convergenceFactor:
      opts.convergenceFactor != null &&
      Number.isFinite(Number(opts.convergenceFactor)) &&
      Number(opts.convergenceFactor) > 0
        ? Number(opts.convergenceFactor)
        : 1,
  };
}

/**
 * Mint an R&D tile (tray unless q/r set). Pays off only while it edge-touches a pathway.
 * @param {object} [opts]
 */
export function mintRdTile(opts = {}) {
  const factor =
    opts.factor != null && Number.isFinite(Number(opts.factor))
      ? Number(opts.factor)
      : rollRdFactor(opts.rng);
  const id =
    opts.id ||
    `rd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  return {
    id,
    kind: TILE_KIND.rd,
    q: opts.q ?? null,
    r: opts.r ?? null,
    polarity: CURVE,
    name: "R&D",
    factor,
    year: Number(opts.year) || 2026,
    artUrl: null,
    imagePrompt: null,
    lamp: null,
  };
}

/**
 * Unplaced R&D tiles (tray).
 * @param {object|null|undefined} board
 * @returns {object[]}
 */
export function unplacedRdTiles(board) {
  return Object.values(board?.tiles || {}).filter(
    (t) => t.kind === TILE_KIND.rd && (t.q == null || t.r == null)
  );
}

/**
 * On-field invention neighbors of a placed tile.
 * @param {object} board
 * @param {string} tileId
 * @returns {object[]}
 */
export function inventionNeighbors(board, tileId) {
  return neighborTiles(board, tileId).filter(
    (n) => n.kind === TILE_KIND.invention && n.q != null && n.r != null
  );
}

/**
 * Drop judged-pair rows whose inventions are gone (discarded).
 * Does **not** drop on lift/move — the honesty bump is sticky, and the key
 * must remain so a later re-dock does not evaluate or multiply again.
 * @param {object} board
 */
export function pruneStaleConvergences(board) {
  const next = cloneBoard(board);
  const conv = { ...(next.convergences || {}) };
  for (const key of Object.keys(conv)) {
    const [a, b] = String(key).split("|");
    const ta = next.tiles[a];
    const tb = next.tiles[b];
    if (
      !ta ||
      !tb ||
      ta.kind !== TILE_KIND.invention ||
      tb.kind !== TILE_KIND.invention
    ) {
      delete conv[key];
    }
  }
  next.convergences = conv;
  return next;
}

/**
 * Record a convergence for an invention pair and bake the factor onto
 * both tiles. No-op if this pair was already judged (does not stack).
 * @param {object} board
 * @param {string} idA
 * @param {string} idB
 * @param {{ enhancedId?: string, factor?: number, title?: string, reason?: string }} row
 */
export function putConvergence(board, idA, idB, row) {
  const next = cloneBoard(board);
  const key = convergencePairKey(idA, idB);
  if (next.convergences?.[key]) return next;
  const factor = Number(row?.factor) || CONVERGENCE_FACTOR;
  next.convergences = {
    ...(next.convergences || {}),
    [key]: {
      factor,
      title: String(row?.title || "Convergence").slice(0, 80),
      reason: String(row?.reason || "").slice(0, 400),
    },
  };
  for (const id of [idA, idB]) {
    const tile = next.tiles[id];
    if (tile && tile.kind === TILE_KIND.invention) {
      const prev = Number(tile.convergenceFactor);
      const base = Number.isFinite(prev) && prev > 0 ? prev : 1;
      tile.convergenceFactor = base * factor;
    }
  }
  return next;
}

/**
 * Speech + question stored on a concern tile.
 * Falls back to legacy `analysis` if an in-progress board still has it.
 * @param {object|null|undefined} tile
 * @returns {{ speech: string, question: string }}
 */
export function concernPoseText(tile) {
  const speech = String(
    tile?.challengeSpeech || tile?.analysis || ""
  ).trim();
  const question = String(tile?.challengeQuestion || "").trim();
  return { speech, question };
}

const ANSWER_QUALITIES = new Set(["hit", "glance", "miss"]);

/**
 * Written reply stored on a concern tile (not spoken; does not move the lamp alone).
 * @param {object|null|undefined} tile
 * @returns {{ answer: string, quality: "hit"|"glance"|"miss"|null, feedback: string, pending: boolean }}
 */
export function concernReplyText(tile) {
  const answer = String(tile?.playerAnswer || "").trim();
  const q = String(tile?.answerQuality || "").toLowerCase();
  return {
    answer,
    quality: ANSWER_QUALITIES.has(q) ? q : null,
    feedback: String(tile?.answerFeedback || "").trim(),
    pending: Boolean(tile?.answerPending),
  };
}

/**
 * Patch written-answer fields on a concern tile.
 * @param {object} board
 * @param {string} tileId
 * @param {{ playerAnswer?: string|null, answerQuality?: string|null, answerFeedback?: string|null, answerPending?: boolean }} [patch]
 */
export function setConcernReply(board, tileId, patch = {}) {
  const next = cloneBoard(board);
  const t = next.tiles?.[tileId];
  if (!t || t.kind !== TILE_KIND.concern) return next;
  if (patch.playerAnswer !== undefined) {
    const s = String(patch.playerAnswer || "").slice(0, 2000);
    t.playerAnswer = s.trim() ? s : null;
  }
  if (patch.answerQuality !== undefined) {
    const q = String(patch.answerQuality || "").toLowerCase();
    t.answerQuality = ANSWER_QUALITIES.has(q) ? q : null;
  }
  if (patch.answerFeedback !== undefined) {
    const s = String(patch.answerFeedback || "")
      .trim()
      .slice(0, 400);
    t.answerFeedback = s || null;
  }
  if (patch.answerPending !== undefined) {
    t.answerPending = Boolean(patch.answerPending);
  }
  return next;
}

/**
 * Mint the four concern tiles (off-board until placed by summonConcerns).
 * @param {Record<string, {
 *   challengeSpeech?: string,
 *   challengeQuestion?: string,
 *   analysis?: string,
 *   artUrl?: string|null,
 *   imagePrompt?: string|null,
 *   playerAnswer?: string|null,
 *   answerQuality?: string|null,
 *   answerFeedback?: string|null,
 *   answerPending?: boolean,
 * }>} [byAngle] — optional per-angle pose + art captured at summon
 */
export function mintConcernTiles(byAngle = null) {
  return CONCERN_ANGLES.map((angle) => {
    const enrich = byAngle?.[angle] || {};
    const speech = enrich.challengeSpeech || enrich.analysis;
    const question = enrich.challengeQuestion;
    const quality = String(enrich.answerQuality || "").toLowerCase();
    const answer = enrich.playerAnswer
      ? String(enrich.playerAnswer).slice(0, 2000)
      : "";
    const feedback = enrich.answerFeedback
      ? String(enrich.answerFeedback).slice(0, 400)
      : "";
    return {
      id: `concern-${angle}`,
      kind: TILE_KIND.concern,
      q: null,
      r: null,
      polarity: CURVE,
      name: CONCERN_LABELS[angle] || angle,
      angle,
      lamp: "red",
      lampPending: false,
      lampEvalKey: null,
      artUrl: enrich.artUrl || null,
      imagePrompt: enrich.imagePrompt || null,
      challengeSpeech: speech ? String(speech).slice(0, 1200) : null,
      challengeQuestion: question ? String(question).slice(0, 500) : null,
      playerAnswer: answer.trim() ? answer : null,
      answerQuality: ANSWER_QUALITIES.has(quality) ? quality : null,
      answerFeedback: feedback.trim() ? feedback : null,
      answerPending: Boolean(enrich.answerPending),
    };
  });
}

/**
 * Place four concern tiles around the board. Marks concernsSummoned.
 * Prefers isolated slots (no shared edge with any tile).
 * @param {object} board
 * @param {Array<[number, number]>} [slots] — axial slots for the four angles
 * @param {Record<string, object>} [byAngle] — per-angle pose (speech / question) / art
 */
export function summonConcerns(board, slots = null, byAngle = null) {
  let next = cloneBoard(board);
  const defaults = [
    [3, 1],
    [4, 1],
    [1, 2],
    [5, 2],
  ];
  const places = slots || defaults;
  const concerns = mintConcernTiles(byAngle);
  concerns.forEach((c, i) => {
    const [q, r] = places[i] || defaults[i];
    const slot = findIsolatedSlot(next, q, r);
    next.tiles[c.id] = { ...c, q: slot.q, r: slot.r };
  });
  next.concernsSummoned = true;
  return next;
}

/**
 * Angles that already have concern tiles on this board.
 * @param {object} board
 * @returns {string[]}
 */
export function concernAnglesOnBoard(board) {
  const out = [];
  for (const t of Object.values(board?.tiles || {})) {
    if (t.kind !== TILE_KIND.concern || !t.angle) continue;
    if (!out.includes(t.angle)) out.push(t.angle);
  }
  return out;
}

/**
 * Target how many challengers this board must face.
 * @param {object} board
 */
export function concernTargetCount(board) {
  return clampChallengerCount(
    board?.concernTargetCount ?? GAME.challengerCount
  );
}

/**
 * Shuffle-sample N distinct angles from CONCERN_ANGLES.
 * @param {number} count
 * @param {() => number} [rng] — Math.random-compatible
 * @returns {string[]}
 */
export function sampleConcernRoster(count, rng = Math.random) {
  const n = clampChallengerCount(count);
  const pool = CONCERN_ANGLES.slice();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }
  return pool.slice(0, n);
}

/**
 * Ensure board has a frozen concernRoster of length concernTargetCount.
 * Idempotent once roster is set.
 * @param {object} board
 * @param {number} [count]
 * @param {() => number} [rng]
 */
export function ensureConcernRoster(board, count = null, rng = Math.random) {
  const next = cloneBoard(board);
  const target = clampChallengerCount(
    count ?? next.concernTargetCount ?? GAME.challengerCount
  );
  next.concernTargetCount = target;
  if (Array.isArray(next.concernRoster) && next.concernRoster.length === target) {
    // Drop unknown / dupes while keeping order
    const seen = new Set();
    next.concernRoster = next.concernRoster.filter((a) => {
      if (!CONCERN_ANGLES.includes(a) || seen.has(a)) return false;
      seen.add(a);
      return true;
    });
    if (next.concernRoster.length === target) return next;
  }
  next.concernRoster = sampleConcernRoster(target, rng);
  return next;
}

/**
 * Concern angles in the session roster that are not yet placed.
 * If roster not created yet, returns [] (call ensureConcernRoster before summoning).
 * @param {object} board
 * @returns {string[]}
 */
export function remainingConcernAngles(board) {
  const on = new Set(concernAnglesOnBoard(board));
  const roster = Array.isArray(board?.concernRoster)
    ? board.concernRoster
    : null;
  if (!roster || !roster.length) return [];
  return roster.filter((a) => CONCERN_ANGLES.includes(a) && !on.has(a));
}

/**
 * True when every roster angle has a concern tile on the board.
 * @param {object} board
 */
export function rosterComplete(board) {
  const roster = Array.isArray(board?.concernRoster) ? board.concernRoster : [];
  if (!roster.length) return false;
  const on = new Set(concernAnglesOnBoard(board));
  return roster.every((a) => on.has(a));
}

/**
 * Mint + place one concern tile on an isolated hex.
 * Sets concernsSummoned when the board's concern roster is fully placed.
 * @param {object} board
 * @param {string} angle
 * @param {{ challengeSpeech?: string, challengeQuestion?: string, analysis?: string, artUrl?: string|null, imagePrompt?: string|null }} [enrich]
 */
export function summonOneConcern(board, angle, enrich = null) {
  const a = String(angle || "");
  if (!CONCERN_ANGLES.includes(a)) {
    return { ok: false, error: "unknown_angle", board };
  }
  if (board?.tiles?.[`concern-${a}`]) {
    return { ok: false, error: "already_summoned", board };
  }
  let next = cloneBoard(board);
  if (!Array.isArray(next.concernRoster) || !next.concernRoster.length) {
    next = ensureConcernRoster(next);
  }
  if (!next.concernRoster.includes(a)) {
    return { ok: false, error: "not_in_roster", board: next };
  }
  const [tile] = mintConcernTiles({ [a]: enrich || {} }).filter(
    (c) => c.angle === a
  );
  const seed = concernSeedSlot(next, a);
  const slot = findIsolatedSlot(next, seed.q, seed.r);
  next.tiles[tile.id] = { ...tile, q: slot.q, r: slot.r };
  if (rosterComplete(next)) {
    next.concernsSummoned = true;
  }
  return { ok: true, board: next, tile: next.tiles[tile.id] };
}

/** Prefer distinct seeds so successive isolated searches spread out. */
function concernSeedSlot(board, angle) {
  const defaults = {
    nature: [3, 1],
    moloch: [4, 1],
    ethicist: [1, 2],
    stakeholder: [5, 2],
  };
  const d = defaults[angle] || [3, 1];
  return { q: d[0], r: d[1] };
}

/**
 * True if (q,r) is empty and none of its six neighbors are occupied.
 * @param {object} board
 * @param {number} q
 * @param {number} r
 */
export function isIsolatedCell(board, q, r) {
  if (tileAt(board, q, r)) return false;
  for (let d = 0; d < 6; d++) {
    const n = neighbor(q, r, d);
    if (tileAt(board, n.q, n.r)) return false;
  }
  return true;
}

/**
 * Spiral search for an empty axial cell with no occupied neighbors.
 * @param {object} board
 * @param {number} [q0]
 * @param {number} [r0]
 */
export function findIsolatedSlot(board, q0 = 3, r0 = 1) {
  if (isIsolatedCell(board, q0, r0)) return { q: q0, r: r0 };
  for (let radius = 1; radius <= 16; radius++) {
    let q = q0 - radius;
    let r = r0;
    const steps = [
      [1, 0],
      [1, -1],
      [0, -1],
      [-1, 0],
      [-1, 1],
      [0, 1],
    ];
    for (const [dq, dr] of steps) {
      for (let i = 0; i < radius; i++) {
        q += dq;
        r += dr;
        if (isIsolatedCell(board, q, r)) return { q, r };
      }
    }
  }
  // Last resort: far from seed (still try isolation at a distant point)
  for (let extra = 17; extra <= 24; extra++) {
    const q = q0 + extra;
    const r = r0 - Math.floor(extra / 2);
    if (isIsolatedCell(board, q, r)) return { q, r };
  }
  return findFreeSlot(board, q0 + 12, r0);
}

/**
 * @param {object} board
 * @param {number} q
 * @param {number} r
 */
export function tileAt(board, q, r) {
  for (const t of Object.values(board?.tiles || {})) {
    if (t.q === q && t.r === r) return t;
  }
  return null;
}

/**
 * Spiral search for an empty axial cell near a seed.
 * @param {object} board
 * @param {number} q0
 * @param {number} r0
 */
export function findFreeSlot(board, q0 = 0, r0 = 0) {
  if (!tileAt(board, q0, r0)) return { q: q0, r: r0 };
  for (let radius = 1; radius <= 8; radius++) {
    let q = q0 - radius;
    let r = r0;
    // walk hex ring
    const steps = [
      [1, 0],
      [1, -1],
      [0, -1],
      [-1, 0],
      [-1, 1],
      [0, 1],
    ];
    for (const [dq, dr] of steps) {
      for (let i = 0; i < radius; i++) {
        q += dq;
        r += dr;
        if (!tileAt(board, q, r)) return { q, r };
      }
    }
  }
  return { q: q0 + 10, r: r0 };
}

/**
 * Build a live grid from board tiles that are on the field.
 * @param {object} board
 * @param {object} [gridOpts]
 */
export function gridFromBoard(board, gridOpts = {}) {
  const g = makeGrid(gridOpts);
  for (const t of Object.values(board?.tiles || {})) {
    if (t.q == null || t.r == null) continue;
    g.set(t.q, t.r, {
      id: t.id,
      polarity: t.polarity || CURVE,
      kind: t.kind,
    });
  }
  return g;
}

/**
 * Try to place (or move) a tile onto (q,r). Returns { ok, board, blockers }.
 * Invention↔invention must share face worlds; crisis/concern are curve (always dock).
 * @param {object} board
 * @param {string} tileId
 * @param {number} q
 * @param {number} r
 */
export function placeTile(board, tileId, q, r) {
  const next = cloneBoard(board);
  const tile = next.tiles[tileId];
  if (!tile) return { ok: false, board, blockers: [{ need: "missing" }] };

  const occ = tileAt(next, q, r);
  if (occ && occ.id !== tileId) {
    return { ok: false, board, blockers: [{ need: "occupied", other: occ }] };
  }

  // Temporary lift so we can test neighbors
  const prevQ = tile.q;
  const prevR = tile.r;
  tile.q = null;
  tile.r = null;

  const blockers = [];
  for (let d = 0; d < 6; d++) {
    const n = neighbor(q, r, d);
    const other = tileAt(next, n.q, n.r);
    if (!other) continue;
    // World rules only between two invention tiles
    if (tile.kind === TILE_KIND.invention && other.kind === TILE_KIND.invention) {
      if (!canDock(tile.polarity, other.polarity, d)) {
        blockers.push({ dir: d, other, need: "world" });
      }
    }
  }
  if (blockers.length) {
    tile.q = prevQ;
    tile.r = prevR;
    return { ok: false, board, blockers };
  }

  tile.q = q;
  tile.r = r;
  return { ok: true, board: next, blockers: [] };
}

/**
 * Lift a tile off the field (keeps it in tiles dict; q/r null).
 * Crisis tiles should generally stay — allow lift only for inventions by default.
 * @param {object} board
 * @param {string} tileId
 * @param {{ allowGiven?: boolean }} [opts]
 */
export function liftTile(board, tileId, opts = {}) {
  const next = cloneBoard(board);
  const tile = next.tiles[tileId];
  if (!tile) return { ok: false, board };
  if (
    !opts.allowGiven &&
    (tile.kind === TILE_KIND.crisis || tile.kind === TILE_KIND.concern)
  ) {
    return { ok: false, board };
  }
  tile.q = null;
  tile.r = null;
  return { ok: true, board: next };
}

/**
 * Delete a tile from the board dict (tray or field). Crisis/concern stay by default.
 * @param {object} board
 * @param {string} tileId
 * @param {{ allowGiven?: boolean }} [opts]
 */
export function discardTile(board, tileId, opts = {}) {
  const next = cloneBoard(board);
  const tile = next.tiles[tileId];
  if (!tile) return { ok: false, board };
  if (
    !opts.allowGiven &&
    (tile.kind === TILE_KIND.crisis || tile.kind === TILE_KIND.concern)
  ) {
    return { ok: false, board };
  }
  delete next.tiles[tileId];
  return { ok: true, board: pruneStaleConvergences(next) };
}

/**
 * Neighbor tile objects for a placed tile.
 * @param {object} board
 * @param {string} tileId
 */
export function neighborTiles(board, tileId) {
  const tile = board?.tiles?.[tileId];
  if (!tile || tile.q == null || tile.r == null) return [];
  const out = [];
  for (let d = 0; d < 6; d++) {
    const n = neighbor(tile.q, tile.r, d);
    const other = tileAt(board, n.q, n.r);
    if (other) out.push({ ...other, dir: d });
  }
  return out;
}

/**
 * Given tiles (crisis + concern) neighboring an invention, or all givens if tileId null.
 * @param {object} board
 * @param {string|null} [placedOrLiftedId]
 */
export function affectedGivens(board, placedOrLiftedId = null) {
  const givens = Object.values(board?.tiles || {}).filter(
    (t) => t.kind === TILE_KIND.crisis || t.kind === TILE_KIND.concern
  );
  if (!placedOrLiftedId) return givens;
  const nabeIds = new Set(
    neighborTiles(board, placedOrLiftedId).map((t) => t.id)
  );
  // Also re-check any given that previously neighbored this id — after lift
  // the tile may be off-board, so include givens that list it… we pass board
  // after the move, so only current neighbors of remaining tiles + all if lift.
  const tile = board?.tiles?.[placedOrLiftedId];
  if (!tile || tile.q == null) {
    // Lifted: re-eval all givens (cheap enough for ≤7)
    return givens;
  }
  return givens.filter((g) => nabeIds.has(g.id) || neighborTiles(board, g.id).some((n) => n.id === placedOrLiftedId));
}

/**
 * Tech ids with at least one invention tile placed on the hex field.
 * Tray tiles (null q/r) do not count.
 * @param {object} board
 * @returns {string[]}
 */
export function techIdsFromBoard(board) {
  const ids = [];
  const seen = new Set();
  for (const t of Object.values(board?.tiles || {})) {
    if (t.kind !== TILE_KIND.invention || !t.techId) continue;
    if (t.q == null || t.r == null) continue;
    if (seen.has(t.techId)) continue;
    seen.add(t.techId);
    ids.push(t.techId);
  }
  return ids;
}

function isUnplaced(tile) {
  return tile?.q == null || tile?.r == null;
}

/**
 * Unplaced invention tiles for one emTech (tray / idea cards).
 * Insertion order is preserved; callers may re-sort (spark batch first).
 * @param {object} board
 * @param {string|null|undefined} techId
 * @returns {object[]}
 */
export function unplacedInventionsForTech(board, techId) {
  if (!techId) return [];
  return Object.values(board?.tiles || {}).filter(
    (t) =>
      t.kind === TILE_KIND.invention &&
      t.techId === techId &&
      isUnplaced(t)
  );
}

/**
 * Tech ids with at least one unplaced invention (tray / idea cards).
 * Insertion order; sparks and custom mints both count.
 * @param {object} board
 * @returns {string[]}
 */
export function techIdsWithUnplacedInventions(board) {
  const ids = [];
  const seen = new Set();
  for (const t of Object.values(board?.tiles || {})) {
    if (t.kind !== TILE_KIND.invention || !t.techId) continue;
    if (!isUnplaced(t)) continue;
    if (seen.has(t.techId)) continue;
    seen.add(t.techId);
    ids.push(t.techId);
  }
  return ids;
}

/**
 * Derive prose snapshot for co-inventor / vision / outcome.
 * @param {object} board
 */
export function deriveBoardProse(board) {
  const inventions = Object.values(board?.tiles || {}).filter(
    (t) => t.kind === TILE_KIND.invention
  );
  const howParts = inventions
    .map((t) => String(t.howText || "").trim())
    .filter(Boolean);
  const techLabels = inventions
    .map((t) => t.techId)
    .filter(Boolean);
  return {
    // Pathway has no invention name — tech ids are a weak label for legacy callers
    inventionName: techLabels.slice(0, 3).join(" · ") || "Pathway",
    inventionHow: howParts.join("\n\n") || "",
    // Never put lamp colors here — vision/image prompts read inventionImpact.
    inventionImpact: "",
  };
}

/**
 * Win: concerns summoned AND every active given lamp is yellow or green.
 * @param {object} board
 */
export function boardHolds(board) {
  if (!board?.concernsSummoned) return false;
  const givens = Object.values(board.tiles || {}).filter(
    (t) => t.kind === TILE_KIND.crisis || t.kind === TILE_KIND.concern
  );
  if (!givens.length) return false;
  return givens.every((t) => t.lamp === "yellow" || t.lamp === "green");
}

/**
 * Apply lamp updates from AI or heuristic.
 * Clears lampPending on every updated given so the snake stops when settled.
 * @param {object} board
 * @param {Array<{ id: string, level: string, reason?: string }>} lights
 */
export function applyLights(board, lights) {
  const next = cloneBoard(board);
  for (const L of lights || []) {
    const t = next.tiles[L.id];
    if (!t) continue;
    if (t.kind !== TILE_KIND.crisis && t.kind !== TILE_KIND.concern) continue;
    const level = String(L.level || "").toLowerCase();
    if (level === "red" || level === "yellow" || level === "green") {
      t.lamp = level;
      t.lampPending = false;
      if (L.reason) t.lampReason = String(L.reason).slice(0, 280);
    }
  }
  next.evalSeq = (next.evalSeq || 0) + 1;
  return next;
}

/**
 * Mark crisis/concern tiles as pending evaluation without changing lamp color.
 * @param {object} board
 * @param {string[]|null} ids — null = all on-field givens
 * @param {boolean} on
 */
export function setLampPending(board, ids, on) {
  const next = cloneBoard(board);
  const want = ids ? new Set(ids) : null;
  for (const t of Object.values(next.tiles || {})) {
    if (t.kind !== TILE_KIND.crisis && t.kind !== TILE_KIND.concern) continue;
    if (t.q == null || t.r == null) continue;
    if (want && !want.has(t.id)) continue;
    t.lampPending = Boolean(on);
  }
  return next;
}

/**
 * True when incoming should replace a local hex board on MP hydrate.
 * Keeps a richer local board (minted idea tiles, seeded meters) when the
 * snapshot is a stale subset — Ask-for-ideas races the next WS patch.
 * @param {object|null|undefined} local
 * @param {object|null|undefined} incoming
 * @param {{ forceIncoming?: boolean, keepLocal?: boolean }} [opts]
 */
export function preferIncomingHexBoard(local, incoming, opts = {}) {
  if (!incoming || typeof incoming !== "object") return false;
  if (opts.forceIncoming) return true;
  if (!local || typeof local !== "object") return true;
  if (opts.keepLocal) return false;
  const localTiles = local.tiles || {};
  const incomingTiles = incoming.tiles || {};
  const localIds = Object.keys(localTiles);
  const incomingIds = Object.keys(incomingTiles);
  if (!localIds.length) return true;
  // Same tile id in the tray snapshot must not unplace a local field drop.
  for (const id of localIds) {
    const lt = localTiles[id];
    const it = incomingTiles[id];
    const localPlaced = lt && lt.q != null && lt.r != null;
    const incomingPlaced = it && it.q != null && it.r != null;
    if (localPlaced && !incomingPlaced) return false;
  }
  const localSet = new Set(localIds);
  let incomingHasNew = false;
  for (const id of incomingIds) {
    if (!localSet.has(id)) {
      incomingHasNew = true;
      break;
    }
  }
  if (incomingHasNew) return true;
  return incomingIds.length >= localIds.length;
}

export function addTile(board, tile) {
  const next = cloneBoard(board);
  next.tiles[tile.id] = { ...tile };
  return next;
}

/**
 * Remove tiles that are still unplaced (q/r null). Placed tiles are kept.
 * @param {object} board
 * @param {string[]} ids
 */
export function removeUnplacedTiles(board, ids) {
  const next = cloneBoard(board);
  const list = Array.isArray(ids) ? ids : [];
  for (const id of list) {
    const t = next.tiles[id];
    if (!t) continue;
    if (t.q != null || t.r != null) continue;
    delete next.tiles[id];
  }
  return next;
}

export { BITS, ATOMS, CURVE, SPLIT, keyOf, canDock, neighbor };

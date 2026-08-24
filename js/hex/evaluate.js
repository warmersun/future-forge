/**
 * Hex-board cluster priors + timing helpers.
 * DOM-free. Remaps old feasibility dims onto crisis/concern lamps;
 * timing is per invention tile (techId + howText only — no invention name).
 */

import { assessSustainable } from "../sim/sustainable.js";
import { worseLevel } from "../sim/deploy.js";
import { crisisMeterLevel } from "../sim/collapse.js";
import {
  TILE_KIND,
  neighborTiles,
  CRISIS_ROLE_BLURBS,
  cloneBoard,
  applyLights,
} from "./board-state.js";

/** cool/warm/hot → hex RYG — same as HUD. */
export function bandToLamp(band) {
  if (band === "cool") return "green";
  if (band === "warm") return "yellow";
  return "red";
}

export function emptyCrisisDelta() {
  return { local: 0, global: 0, support: 0 };
}

/**
 * Clamp a pressure value to 0–5.
 * @param {number} n
 */
export function clampPressure(n) {
  return Math.max(0, Math.min(5, Math.round(Number(n) || 0)));
}

/**
 * All distinct on-field invention connected components (pathways).
 * @param {object|null|undefined} board
 * @returns {object[][]}
 */
export function listInventionPathways(board) {
  const seen = new Set();
  const out = [];
  for (const t of Object.values(board?.tiles || {})) {
    if (t.kind !== TILE_KIND.invention) continue;
    if (t.q == null || t.r == null) continue;
    if (seen.has(t.id)) continue;
    const comp = inventionComponent(board, t.id);
    for (const c of comp) seen.add(c.id);
    if (comp.length) out.push(comp);
  }
  return out;
}

/**
 * Content fingerprint for one invention pathway (ids + tech/how/timing).
 * @param {object[]} inventions
 * @returns {string}
 */
export function pathwayContentFingerprint(inventions) {
  const parts = (inventions || [])
    .slice()
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))
    .map((n) => {
      const how = String(n.howText || "").trim();
      const timing =
        n.timingLevel ||
        (n.feasibilityPct != null ? `pct:${n.feasibilityPct}` : "");
      return `${n.id}:${n.techId || ""}:${how}:${timing}`;
    });
  return parts.join(";") || "empty";
}

/**
 * Offline heuristic score for a pathway (no AI).
 * Mild −1 on roles with mature how-text; concerns yellow-max.
 * @param {object[]} inventions
 * @param {number} year
 * @param {object} [opts]
 * @param {string[]} [opts.concernAngles]
 */
export function heuristicPathwayScore(inventions, year, opts = {}) {
  const howLen = inventions
    .map((n) => String(n.howText || "").trim())
    .join("\n")
    .length;
  const mature = inventions.some((n) => ideaMature(n, year));
  const delta = emptyCrisisDelta();
  if (mature && howLen >= 40) {
    delta.local = -1;
    delta.support = -1;
  } else if (howLen >= 20) {
    delta.local = -1;
  }
  const concerns = {};
  for (const angle of opts.concernAngles || []) {
    concerns[angle] = {
      level: mature ? "yellow" : inventions.length ? "yellow" : "red",
      reason: mature
        ? "Pathway touches this concern — confirm honesty."
        : "Pathway may not be enough yet.",
    };
  }
  return { crisisDelta: delta, concerns };
}

/**
 * Normalize AI / local score-pathway payload.
 * @param {unknown} raw
 */
export function normalizePathwayScore(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const cd = src.crisisDelta || src.deltas || {};
  const clampDelta = (v) => {
    const n = Math.round(Number(v) || 0);
    return Math.max(-2, Math.min(1, n));
  };
  const crisisDelta = {
    local: clampDelta(cd.local),
    global: clampDelta(cd.global),
    support: clampDelta(cd.support),
  };
  const concerns = {};
  const rawC = src.concerns && typeof src.concerns === "object" ? src.concerns : {};
  for (const [angle, row] of Object.entries(rawC)) {
    const level = String(row?.level || "").toLowerCase();
    if (level !== "red" && level !== "yellow" && level !== "green") continue;
    concerns[angle] = {
      level,
      reason: String(row?.reason || "").slice(0, 280),
    };
  }
  return { crisisDelta, concerns };
}

/**
 * Worst of red/yellow/green (red wins).
 * @param {"red"|"yellow"|"green"} a
 * @param {"red"|"yellow"|"green"} b
 */
export function worseLamp(a, b) {
  const rank = { red: 2, yellow: 1, green: 0 };
  const ra = rank[a] ?? 2;
  const rb = rank[b] ?? 2;
  return ra >= rb ? a : b;
}

/**
 * Apply cached pathway deltas to pressure + hex lamps.
 * Instant — no AI. Sets lampPending on givens reached by pending fingerprints.
 *
 * @param {object} board
 * @param {object} opts
 * @param {Record<string, number>} [opts.winMax]
 * @param {Record<string, number>|null} [opts.pressureBase] — override board.pressureBase
 * @returns {{ board: object, displayPressure: Record<string, number>, pendingGivenIds: string[], pathways: Array<{ fingerprint: string, inventions: object[], needsScore: boolean }> }}
 */
export function applyPathwayPressure(board, opts = {}) {
  const next = cloneBoard(board);
  const baseSrc =
    opts.pressureBase ||
    next.pressureBase ||
    {};
  if (!next.pressureBase) {
    next.pressureBase = Object.fromEntries(
      Object.entries(baseSrc).map(([k, v]) => [k, clampPressure(v)])
    );
  }

  const pathways = listInventionPathways(next).map((inventions) => {
    const fingerprint = pathwayContentFingerprint(inventions);
    const cached = next.pathwayImpacts[fingerprint];
    const needsScore = !cached || cached.pending === true;
    if (!cached) {
      next.pathwayImpacts[fingerprint] = {
        inventionIds: inventions.map((t) => t.id),
        crisisDelta: emptyCrisisDelta(),
        concerns: {},
        pending: true,
      };
    } else {
      next.pathwayImpacts[fingerprint] = {
        ...cached,
        inventionIds: inventions.map((t) => t.id),
      };
    }
    return { fingerprint, inventions, needsScore: !cached || Boolean(cached.pending) };
  });

  // Drop impacts for fingerprints no longer on the board
  const live = new Set(pathways.map((p) => p.fingerprint));
  for (const fp of Object.keys(next.pathwayImpacts)) {
    if (!live.has(fp)) delete next.pathwayImpacts[fp];
  }

  // Sum crisis deltas per crisis from pathways that reach it
  const displayPressure = {};
  for (const [key, v] of Object.entries(next.pressureBase || {})) {
    displayPressure[key] = clampPressure(v);
  }

  for (const t of Object.values(next.tiles)) {
    if (t.kind !== TILE_KIND.crisis || t.q == null) continue;
    const role = t.role || "local";
    const key = t.meterKey || t.name;
    let sum = 0;
    for (const { fingerprint, inventions } of pathways) {
      const impact = next.pathwayImpacts[fingerprint];
      if (!impact || impact.pending) continue;
      const seedId = inventions[0]?.id;
      if (!seedId) continue;
      if (!givensReachedFromInvention(next, seedId).includes(t.id)) continue;
      sum += Number(impact.crisisDelta?.[role]) || 0;
    }
    const base = Number(next.pressureBase?.[key] ?? 0);
    displayPressure[key] = clampPressure(base + sum);
  }

  const winMax = opts.winMax || {};
  const pendingGivenIds = new Set();
  const lights = [];

  for (const t of Object.values(next.tiles)) {
    if (t.kind === TILE_KIND.crisis && t.q != null) {
      const key = t.meterKey || t.name;
      const n = displayPressure[key] ?? clampPressure(next.pressureBase?.[key]);
      const band = crisisMeterLevel(n, winMax[key]);
      lights.push({
        id: t.id,
        level: bandToLamp(band),
        reason: `${n}/5 · ${band}`,
      });
    } else if (t.kind === TILE_KIND.concern && t.q != null) {
      let lamp = null;
      let reason = "Still unanswered.";
      let touching = false;
      const hasAnswer = Boolean(String(t.playerAnswer || "").trim());
      for (const { fingerprint, inventions } of pathways) {
        const impact = next.pathwayImpacts[fingerprint];
        if (!impact) continue;
        const seedId = inventions[0]?.id;
        if (!seedId) continue;
        if (!givensReachedFromInvention(next, seedId).includes(t.id)) continue;
        touching = true;
        if (impact.pending) {
          pendingGivenIds.add(t.id);
          continue;
        }
        const row = impact.concerns?.[t.angle];
        if (
          row?.level === "red" ||
          row?.level === "yellow" ||
          row?.level === "green"
        ) {
          lamp = lamp == null ? row.level : worseLamp(lamp, row.level);
          if (row.reason) reason = row.reason;
        } else {
          lamp = lamp == null ? "yellow" : worseLamp(lamp, "yellow");
        }
      }
      lights.push({
        id: t.id,
        level: touching ? lamp || "yellow" : "red",
        reason: touching
          ? reason
          : hasAnswer
            ? "Answer is on file — the light stays red until a pathway docks."
            : "Still unanswered.",
      });
    }
  }

  for (const { fingerprint, inventions } of pathways) {
    const impact = next.pathwayImpacts[fingerprint];
    if (!impact?.pending) continue;
    const seedId = inventions[0]?.id;
    if (!seedId) continue;
    for (const gid of givensReachedFromInvention(next, seedId)) {
      pendingGivenIds.add(gid);
    }
  }

  let lit = applyLights(next, lights);
  for (const t of Object.values(lit.tiles)) {
    if (t.kind !== TILE_KIND.crisis && t.kind !== TILE_KIND.concern) continue;
    if (t.q == null || t.r == null) continue;
    t.lampPending = pendingGivenIds.has(t.id);
  }

  return {
    board: lit,
    displayPressure,
    pendingGivenIds: [...pendingGivenIds],
    pathways,
  };
}

/**
 * Mark cached pathway scores pending when they reach a given (e.g. written answer changed).
 * @param {object} board
 * @param {string} givenId
 */
export function invalidatePathwaysTouchingGiven(board, givenId) {
  const next = cloneBoard(board);
  const impacts = next.pathwayImpacts || {};
  for (const [fp, impact] of Object.entries(impacts)) {
    const seedId = impact?.inventionIds?.[0];
    if (!seedId) continue;
    if (givensReachedFromInvention(next, seedId).includes(givenId)) {
      impacts[fp] = { ...impact, pending: true };
    }
  }
  next.pathwayImpacts = impacts;
  return next;
}

/**
 * True if any invention in this pathway is still re-timing.
 * Timing is part of the fingerprint — do not start score-pathway until it settles.
 * @param {object[]} inventions
 */
export function pathwayHasTimingPending(inventions) {
  return (inventions || []).some(
    (t) => t && t.kind === TILE_KIND.invention && t.timingPending
  );
}

/**
 * Reconcile live pathways with in-flight score jobs.
 * Start only pending fingerprints that are not already running and whose
 * members are not timingPending. Abort jobs whose fingerprint is gone
 * (or already settled). Keep live in-flight scores.
 *
 * @param {Array<{ fingerprint: string, inventions: object[], needsScore: boolean }>} pathways
 * @param {Iterable<string>} inflight
 * @returns {{ start: string[], abort: string[], keep: string[] }}
 */
export function diffPathwayScoreJobs(pathways, inflight) {
  const inflightSet = new Set(inflight || []);
  const byFp = new Map();
  for (const p of pathways || []) {
    if (p?.fingerprint) byFp.set(p.fingerprint, p);
  }

  const start = [];
  const keep = [];
  const abort = [];

  for (const fp of inflightSet) {
    const p = byFp.get(fp);
    if (!p || !p.needsScore) abort.push(fp);
    else keep.push(fp);
  }

  for (const p of byFp.values()) {
    if (!p.needsScore) continue;
    if (inflightSet.has(p.fingerprint)) continue;
    if (pathwayHasTimingPending(p.inventions)) continue;
    start.push(p.fingerprint);
  }

  return { start, abort, keep };
}

/**
 * Idea is honest for the calendar year if its claimed year ≤ currentYear
 * and feasibility is not explicitly red (pct >= 35 or null).
 * @param {object} actor — invention tile
 * @param {number} currentYear
 */
export function ideaMature(actor, currentYear) {
  if (!actor || actor.kind !== TILE_KIND.invention) return false;
  const y = Number(actor.year) || 2026;
  if (y > Number(currentYear)) return false;
  if (actor.feasibilityPct != null && Number(actor.feasibilityPct) < TIMING_RED_BELOW) {
    return false;
  }
  if (actor.timingLevel === "red") return false;
  return true;
}

/** AI / heuristic timing level → pct for the honesty bar. */
export const TIMING_LEVEL_PCT = {
  red: 20,
  yellow: 50,
  green: 85,
};

/** pct < this is red (25% product of two yellows is red). */
export const TIMING_RED_BELOW = 35;
/** pct < this (and ≥ TIMING_RED_BELOW) is yellow. */
export const TIMING_YELLOW_BELOW = 70;

/**
 * @param {"red"|"yellow"|"green"|string} level
 * @returns {number}
 */
export function timingLevelToPct(level) {
  const k = String(level || "").toLowerCase();
  return TIMING_LEVEL_PCT[k] ?? 50;
}

/**
 * @param {number|null|undefined} pct
 * @returns {"red"|"yellow"|"green"}
 */
export function timingPctToLevel(pct) {
  if (pct == null || Number.isNaN(Number(pct))) return "yellow";
  const n = Number(pct);
  if (n < TIMING_RED_BELOW) return "red";
  if (n < TIMING_YELLOW_BELOW) return "yellow";
  return "green";
}

/** Final displayed / gated honesty percent. */
export const TIMING_PCT_MIN = 1;
export const TIMING_PCT_MAX = 99;

/**
 * Clamp a timing percent to the 1–99 band used by HUD and gates.
 * @param {number|null|undefined} n
 * @returns {number|null}
 */
export function clampTimingPct(n) {
  if (n == null || Number.isNaN(Number(n))) return null;
  return Math.max(TIMING_PCT_MIN, Math.min(TIMING_PCT_MAX, Math.round(Number(n))));
}

/**
 * AI / heuristic honesty chance before R&D or convergence.
 * @param {object|null|undefined} tile
 * @returns {number|null}
 */
export function tileBaseTimingPct(tile) {
  if (!tile || tile.kind !== TILE_KIND.invention) return null;
  if (tile.feasibilityPct != null && !Number.isNaN(Number(tile.feasibilityPct))) {
    return Math.max(0, Math.min(100, Number(tile.feasibilityPct)));
  }
  const lv = tile.timingLevel;
  if (lv === "red" || lv === "yellow" || lv === "green") {
    return timingLevelToPct(lv);
  }
  return null;
}

/**
 * Sticky honesty multiplier on an invention (default 1).
 * Prefers `tile.convergenceFactor`; falls back to judged-pair cache for
 * in-progress boards minted before the field existed.
 * @param {object|null|undefined} board
 * @param {string} tileId
 */
export function convergenceFactorForTile(board, tileId) {
  if (!tileId) return 1;
  const tile = board?.tiles?.[tileId];
  const sticky = Number(tile?.convergenceFactor);
  if (tile?.convergenceFactor != null && Number.isFinite(sticky) && sticky > 0) {
    return sticky;
  }
  let f = 1;
  for (const row of Object.values(board?.convergences || {})) {
    if (row?.enhancedId === tileId) {
      const n = Number(row.factor);
      if (Number.isFinite(n) && n > 0) f *= n;
    }
  }
  return f;
}

/**
 * Settled honesty chance for one invention tile, or null if not judged yet.
 * Uses the tile's sticky convergenceFactor (survives lift). Board is unused
 * for the bump except as a legacy fallback inside convergenceFactorForTile.
 * @param {object|null|undefined} tile
 * @param {object|null} [board]
 * @returns {number|null}
 */
export function tileTimingPct(tile, board = null) {
  const base = tileBaseTimingPct(tile);
  if (base == null) return null;
  const sticky = Number(tile?.convergenceFactor);
  const fromTile =
    Number.isFinite(sticky) && sticky > 0 ? sticky : null;
  const factor =
    fromTile != null
      ? fromTile
      : board
        ? convergenceFactorForTile(board, tile.id)
        : 1;
  return clampTimingPct(base * factor);
}

/**
 * Product of R&D factors that edge-touch this invention cluster.
 * @param {object|null|undefined} board
 * @param {object[]} inventions
 */
export function rdFactorForPathway(board, inventions) {
  const ids = new Set((inventions || []).map((t) => t?.id).filter(Boolean));
  if (!ids.size) return 1;
  let f = 1;
  for (const t of Object.values(board?.tiles || {})) {
    if (t.kind !== TILE_KIND.rd) continue;
    if (t.q == null || t.r == null) continue;
    const n = Number(t.factor);
    if (!Number.isFinite(n) || n <= 0) continue;
    const touches = neighborTiles(board, t.id).some(
      (nb) => nb.kind === TILE_KIND.invention && ids.has(nb.id)
    );
    if (touches) f *= n;
  }
  return f;
}

/**
 * Combined chance for one bonded pathway = product of member chances.
 * Optional board applies convergences (per tile) then R&D (per cluster).
 * @param {object[]} inventions
 * @param {object|null} [board]
 * @returns {{ pct: number|null, level: "red"|"yellow"|"green", pending: boolean, rdFactor: number }}
 */
export function pathwayTimingChance(inventions, board = null) {
  const list = (inventions || []).filter(
    (t) => t && t.kind === TILE_KIND.invention
  );
  if (!list.length) {
    return { pct: null, level: "red", pending: false, rdFactor: 1 };
  }
  const pcts = [];
  let pending = false;
  for (const t of list) {
    if (t.timingPending) pending = true;
    const p = tileTimingPct(t, board);
    if (p == null) pending = true;
    else pcts.push(p);
  }
  if (!pcts.length) {
    return { pct: null, level: "yellow", pending: true, rdFactor: 1 };
  }
  const rdFactor = board ? rdFactorForPathway(board, list) : 1;
  const raw = pcts.reduce((acc, p) => acc * (p / 100), 1) * 100 * rdFactor;
  const pct = clampTimingPct(raw);
  return { pct, level: timingPctToLevel(pct), pending, rdFactor };
}

/**
 * Offline guess: complementary worlds (split converter) or distinct emTechs.
 * @param {object} a
 * @param {object} b
 */
export function heuristicConverges(a, b) {
  if (!a || !b || a.id === b.id) return false;
  if (a.kind !== TILE_KIND.invention || b.kind !== TILE_KIND.invention) {
    return false;
  }
  const pa = String(a.polarity || "");
  const pb = String(b.polarity || "");
  if (pa === "split" || pb === "split") return true;
  const ta = String(a.techId || "");
  const tb = String(b.techId || "");
  return Boolean(ta && tb && ta !== tb);
}

/**
 * Which of two adjacent inventions is less ready (usually the newly placed one).
 * @param {object} placed
 * @param {object} neighbor
 */
export function pickEnhancedId(placed, neighbor) {
  const pa = tileBaseTimingPct(placed);
  const pb = tileBaseTimingPct(neighbor);
  if (pa == null) return placed?.id;
  if (pb == null) return neighbor?.id;
  return pa <= pb ? placed.id : neighbor.id;
}

/**
 * Worst (lowest) on-board pathway product.
 * Empty field: yellow if tray has minted tiles, red if none minted.
 * @param {object|null|undefined} board
 * @returns {{ pct: number|null, level: "red"|"yellow"|"green", pending: boolean, count: number, rdFactor: number }}
 */
export function boardWorstPathwayTiming(board) {
  const pathways = listInventionPathways(board);
  const minted = Object.values(board?.tiles || {}).filter(
    (t) => t && t.kind === TILE_KIND.invention
  );
  if (!pathways.length) {
    return {
      pct: null,
      level: minted.length ? "yellow" : "red",
      pending: false,
      count: 0,
      rdFactor: 1,
    };
  }
  let worst = null;
  let pending = false;
  for (const invs of pathways) {
    const ch = pathwayTimingChance(invs, board);
    pending = pending || ch.pending;
    if (ch.pct == null) continue;
    if (!worst || ch.pct < worst.pct) {
      worst = {
        pct: ch.pct,
        level: ch.level,
        count: invs.length,
        rdFactor: ch.rdFactor,
      };
    }
  }
  if (!worst) {
    return {
      pct: null,
      level: "yellow",
      pending: true,
      count: pathways[0]?.length || 0,
      rdFactor: 1,
    };
  }
  return { ...worst, pending };
}

/**
 * Cache key for per-tile timing assess (no name).
 * @param {object} tile
 * @param {number} year
 */
export function tileTimingCacheKey(tile, year) {
  return [
    tile?.id || "",
    Number(year) || 0,
    String(tile?.techId || ""),
    String(tile?.howText || "").trim(),
  ].join("|");
}

/**
 * All on-field crisis/concern ids.
 * @param {object|null|undefined} board
 * @returns {string[]}
 */
export function allGivenIds(board) {
  return Object.values(board?.tiles || {})
    .filter(
      (t) =>
        (t.kind === TILE_KIND.crisis || t.kind === TILE_KIND.concern) &&
        t.q != null &&
        t.r != null
    )
    .map((t) => t.id);
}

/**
 * Connected on-field inventions from one invention (BFS along invention–invention edges).
 * Empty if tray / missing / not an invention.
 * @param {object|null|undefined} board
 * @param {string} tileId
 * @returns {object[]}
 */
export function inventionComponent(board, tileId) {
  const start = board?.tiles?.[tileId];
  if (
    !start ||
    start.kind !== TILE_KIND.invention ||
    start.q == null ||
    start.r == null
  ) {
    return [];
  }
  const byId = new Map();
  const queue = [start.id];
  byId.set(start.id, start);
  while (queue.length) {
    const id = queue.shift();
    for (const n of neighborTiles(board, id)) {
      if (n.kind !== TILE_KIND.invention) continue;
      if (n.q == null || n.r == null) continue;
      if (byId.has(n.id)) continue;
      byId.set(n.id, board.tiles[n.id] || n);
      queue.push(n.id);
    }
  }
  return [...byId.values()].sort((a, b) =>
    String(a.id).localeCompare(String(b.id))
  );
}

/**
 * Invention tiles reachable from a given by invention–invention paths.
 * Seeds = inventions sharing an edge with the given; flood-fill from there.
 * Crisis/concern tiles do not bridge paths.
 * @param {object|null|undefined} board
 * @param {string} givenId
 * @returns {object[]}
 */
export function clusterInventionsFromGiven(board, givenId) {
  const given = board?.tiles?.[givenId];
  if (
    !given ||
    (given.kind !== TILE_KIND.crisis && given.kind !== TILE_KIND.concern) ||
    given.q == null ||
    given.r == null
  ) {
    return [];
  }
  const byId = new Map();
  const queue = [];
  for (const n of neighborTiles(board, givenId)) {
    if (n.kind !== TILE_KIND.invention) continue;
    if (n.q == null || n.r == null) continue;
    if (byId.has(n.id)) continue;
    byId.set(n.id, board.tiles[n.id] || n);
    queue.push(n.id);
  }
  while (queue.length) {
    const id = queue.shift();
    for (const n of neighborTiles(board, id)) {
      if (n.kind !== TILE_KIND.invention) continue;
      if (n.q == null || n.r == null) continue;
      if (byId.has(n.id)) continue;
      byId.set(n.id, board.tiles[n.id] || n);
      queue.push(n.id);
    }
  }
  return [...byId.values()].sort((a, b) =>
    String(a.id).localeCompare(String(b.id))
  );
}

/**
 * Given ids adjacent to any tile in the invention component of tileId.
 * @param {object|null|undefined} board
 * @param {string} tileId
 * @returns {string[]}
 */
export function givensReachedFromInvention(board, tileId) {
  const component = inventionComponent(board, tileId);
  if (!component.length) return [];
  const givenIds = new Set();
  for (const inv of component) {
    for (const n of neighborTiles(board, inv.id)) {
      if (n.kind === TILE_KIND.crisis || n.kind === TILE_KIND.concern) {
        givenIds.add(n.id);
      }
    }
  }
  return [...givenIds].sort((a, b) => String(a).localeCompare(String(b)));
}

/**
 * Highlight set for UI: origin + inventions + givens in the pathway.
 * @param {object|null|undefined} board
 * @param {string} tileId
 * @returns {{ originId: string, inventionIds: string[], givenIds: string[] }|null}
 */
export function pathwayHighlight(board, tileId) {
  const tile = board?.tiles?.[tileId];
  if (!tile || tile.q == null || tile.r == null) return null;

  if (tile.kind === TILE_KIND.crisis || tile.kind === TILE_KIND.concern) {
    const invs = clusterInventionsFromGiven(board, tileId);
    return {
      originId: tileId,
      inventionIds: invs.map((t) => t.id),
      givenIds: [tileId],
    };
  }

  if (tile.kind === TILE_KIND.invention) {
    const invs = inventionComponent(board, tileId);
    const givenIds = givensReachedFromInvention(board, tileId);
    return {
      originId: tileId,
      inventionIds: invs.map((t) => t.id),
      givenIds,
    };
  }

  if (tile.kind === TILE_KIND.rd) {
    const seeds = neighborTiles(board, tileId).filter(
      (n) => n.kind === TILE_KIND.invention && n.q != null
    );
    const invIds = new Set();
    const givenIds = new Set();
    for (const seed of seeds) {
      for (const inv of inventionComponent(board, seed.id)) invIds.add(inv.id);
      for (const gid of givensReachedFromInvention(board, seed.id)) {
        givenIds.add(gid);
      }
    }
    return {
      originId: tileId,
      inventionIds: [...invIds],
      givenIds: [...givenIds],
    };
  }

  return null;
}

/**
 * Given ids whose pathway may have changed between before and after boards.
 * For an invention: union of givens reached from its component on both boards.
 * For a given: that given only (if on-field after).
 * When tileId is null, returns every on-field given on afterBoard.
 * @param {object|null} beforeBoard
 * @param {object} afterBoard
 * @param {string|null} tileId
 * @returns {string[]}
 */
export function affectedGivenIds(beforeBoard, afterBoard, tileId = null) {
  if (!tileId) return allGivenIds(afterBoard);

  const afterTile = afterBoard?.tiles?.[tileId];
  const beforeTile = beforeBoard?.tiles?.[tileId];
  const kind = afterTile?.kind || beforeTile?.kind;

  if (kind === TILE_KIND.crisis || kind === TILE_KIND.concern) {
    const ids = new Set();
    if (
      afterTile &&
      afterTile.q != null &&
      afterTile.r != null
    ) {
      ids.add(tileId);
    }
    if (
      beforeTile &&
      beforeTile.q != null &&
      beforeTile.r != null
    ) {
      ids.add(tileId);
    }
    return [...ids];
  }

  // Invention (or unknown): dirty every given whose pathway included this tile
  const ids = new Set([
    ...givensReachedFromInvention(beforeBoard, tileId),
    ...givensReachedFromInvention(afterBoard, tileId),
  ]);
  // Lifted with no remaining path: still re-check givens that used to touch
  // via component (already covered). If tile was off-board both sides, empty.
  return [...ids];
}

/**
 * Stable fingerprint of a crisis/concern's reachable invention pathway.
 * Used to skip re-eval when the cluster is unchanged after a move.
 * @param {object} board
 * @param {string} givenId
 * @param {number} year
 * @returns {string}
 */
export function givenClusterFingerprint(board, givenId, year) {
  const y = Number(year) || 0;
  const nabes = clusterInventionsFromGiven(board, givenId);
  const parts = nabes.map((n) => {
    const how = String(n.howText || "").trim();
    const timing =
      n.timingLevel ||
      (n.feasibilityPct != null ? `pct:${n.feasibilityPct}` : "");
    return `${n.id}:${n.techId || ""}:${how}:${timing}`;
  });
  const given = board?.tiles?.[givenId];
  if (given?.kind === TILE_KIND.concern) {
    const ans = String(given.playerAnswer || "").trim();
    return `${y}|${parts.join(";")}|ans:${ans}`;
  }
  return `${y}|${parts.join(";")}`;
}

/**
 * Filter candidate given ids to those whose cluster fingerprint ≠ last settle key.
 * @param {object} board
 * @param {string[]|null} ids — null = all on-field givens
 * @param {number} year
 * @returns {string[]}
 */
export function dirtyGivenIds(board, ids, year) {
  const candidates = ids?.length ? ids : allGivenIds(board);
  const dirty = [];
  for (const id of candidates) {
    const t = board?.tiles?.[id];
    if (!t) continue;
    if (t.kind !== TILE_KIND.crisis && t.kind !== TILE_KIND.concern) continue;
    const fp = givenClusterFingerprint(board, id, year);
    if (t.lampEvalKey !== fp) dirty.push(id);
  }
  return dirty;
}

/**
 * Stamp lampEvalKey on givens after a successful settle (mutates board clone).
 * @param {object} board
 * @param {string[]} ids
 * @param {number} year
 */
export function stampLampEvalKeys(board, ids, year) {
  const next = cloneBoard(board);
  for (const id of ids || []) {
    const t = next.tiles[id];
    if (!t) continue;
    if (t.kind !== TILE_KIND.crisis && t.kind !== TILE_KIND.concern) continue;
    t.lampEvalKey = givenClusterFingerprint(next, id, year);
  }
  return next;
}

/**
 * Build invention cluster from the reachable pathway of a given (no names).
 * @param {object} board
 * @param {object} given
 * @param {number} year
 */
export function clusterFromGiven(board, given, year) {
  const nabes = clusterInventionsFromGiven(board, given.id);
  const directIds = new Set(
    neighborTiles(board, given.id)
      .filter((n) => n.kind === TILE_KIND.invention)
      .map((n) => n.id)
  );
  const techIds = [];
  const seen = new Set();
  for (const n of nabes) {
    if (n.techId && !seen.has(n.techId)) {
      seen.add(n.techId);
      techIds.push(n.techId);
    }
  }
  const howParts = nabes
    .map((n) => String(n.howText || "").trim())
    .filter(Boolean);
  const matureCount = nabes.filter((n) => ideaMature(n, year)).length;
  let worstTiming = "green";
  let anyTiming = false;
  for (const n of nabes) {
    const lv = n.timingLevel;
    if (lv === "red" || lv === "yellow" || lv === "green") {
      anyTiming = true;
      worstTiming = worseLevel(worstTiming, lv);
    } else if (n.feasibilityPct != null) {
      anyTiming = true;
      const p = Number(n.feasibilityPct);
      const mapped = p < 35 ? "red" : p < 70 ? "yellow" : "green";
      worstTiming = worseLevel(worstTiming, mapped);
    }
  }
  return {
    inventions: nabes,
    directIds,
    techIds,
    howText: howParts.join("\n\n"),
    matureCount,
    anyTouch: nabes.length > 0,
    anyDirect: directIds.size > 0,
    worstTiming: anyTiming ? worstTiming : null,
  };
}

/**
 * Local fit prior — suggested techs + enough how-text for here-and-now.
 * @param {object} cluster
 * @param {object} opts
 * @param {string[]} [opts.suggested]
 * @param {string} [opts.scene]
 * @param {string} [opts.meterLabel]
 * @returns {{ level: "red"|"yellow"|"green", note: string }}
 */
export function assessLocalFitPrior(cluster, opts = {}) {
  if (!cluster?.anyTouch) {
    return { level: "red", note: "No invention touches this meter yet." };
  }
  const suggested = new Set(opts.suggested || []);
  const techIds = cluster.techIds || [];
  const howLen = String(cluster.howText || "").trim().length;
  const hits = techIds.filter((id) => suggested.has(id)).length;

  if (!techIds.length || howLen < 12) {
    return {
      level: "red",
      note: "Need a clear how-it-works on a pathway idea for local relief.",
    };
  }

  let level = "yellow";
  let note =
    "A pathway touches this meter — strengthen how it eases the harm people feel now.";

  if (hits === 0 && suggested.size) {
    level = "yellow";
    note =
      "None of the mission's suggested techs are on this pathway — can still help, but check local fit.";
  } else if (hits >= 2 || (hits >= 1 && techIds.length === 1)) {
    level = howLen >= 40 ? "green" : "yellow";
    note =
      level === "green"
        ? `Local fit: ${hits} suggested tech${hits === 1 ? "" : "s"} with a clear near-term mechanism.`
        : `Suggested tech on the pathway — spell how it eases the ground harm.`;
  } else if (howLen >= 40 && cluster.matureCount >= 1) {
    level = "green";
    note = "Mature idea with enough mechanism for here-and-now relief.";
  } else if (howLen >= 20) {
    level = "yellow";
    note = "Pathway ideas may ease local harm — AI will confirm honesty.";
  }

  // Soft scene / meter hint: if how mentions meter label words, nudge toward green
  const label = String(opts.meterLabel || "").toLowerCase();
  const blob = String(cluster.howText || "").toLowerCase();
  if (level === "yellow" && label && blob.includes(label.slice(0, 6)) && howLen >= 40) {
    level = "green";
    note = "Pathway speaks to this local meter with a clear mechanism.";
  }

  return { level, note };
}

/**
 * Support / public buy-in + scale-beyond-pilot (no resources/story/stack-count hard rules).
 * @param {object} cluster
 * @returns {{ level: "red"|"yellow"|"green", note: string }}
 */
export function assessSupportScalePrior(cluster) {
  if (!cluster?.anyTouch) {
    return { level: "red", note: "No invention touches public support yet." };
  }
  const how = String(cluster.howText || "").toLowerCase();
  const howLen = how.trim().length;
  if (howLen < 20) {
    return {
      level: "red",
      note: "Need clearer how-it-works before buy-in or scale is realistic.",
    };
  }

  const buyInRe =
    /\b(public|support|buy[- ]?in|permit|policy|mayor|council|community|legitimacy|trust|fund|partner|coalition|mandate|vote|consent)\b/i;
  const scaleRe =
    /\b(scale|city[- ]wide|program|expand|rollout|beyond (the )?pilot|district|system[- ]wide|replicate)\b/i;
  const oneOffRe =
    /\b(one[- ]off|single (site|clinic|school)|just (this|one)|pilot only|temporary)\b/i;

  const hasBuyIn = buyInRe.test(how);
  const hasScale = scaleRe.test(how);
  const oneOff = oneOffRe.test(how);

  if (cluster.worstTiming === "red") {
    return {
      level: "red",
      note: "Claims look too stretched to field or expand — revise timing honesty first.",
    };
  }

  if (hasBuyIn && hasScale && !oneOff && howLen >= 40) {
    return {
      level: "green",
      note: "Cluster names buy-in and expansion beyond a private patch.",
    };
  }
  if (hasBuyIn || hasScale || (howLen >= 40 && cluster.matureCount >= 1)) {
    return {
      level: "yellow",
      note: hasBuyIn
        ? "Some buy-in language — tighten how the pathway can field and expand."
        : hasScale
          ? "Scale language present — name who must say yes for public support."
          : "Touching ideas may earn support — name funding, permits, or expansion.",
    };
  }
  if (oneOff) {
    return {
      level: "yellow",
      note: "Looks like a one-off patch — public support wants a pathway that can field.",
    };
  }
  return {
    level: "yellow",
    note: CRISIS_ROLE_BLURBS.support
      ? `Touching but thin on ${CRISIS_ROLE_BLURBS.support}.`
      : "Touching but thin on public buy-in and scale.",
  };
}

/**
 * Root-cause / sustainable prior via assessSustainable (no inventionName).
 * @param {object} cluster
 * @param {object} opts
 * @param {object|null} [opts.mission]
 * @param {object|null} [opts.global]
 * @param {object[]} [opts.techObjects] — resolved tech rows {id}
 * @returns {{ level: "red"|"yellow"|"green", note: string }}
 */
export function assessGlobalSustainPrior(cluster, opts = {}) {
  if (!cluster?.anyTouch) {
    return { level: "red", note: "No invention touches the root-cause meter yet." };
  }
  const techs =
    opts.techObjects?.length > 0
      ? opts.techObjects
      : (cluster.techIds || []).map((id) => ({ id }));
  const sustain = assessSustainable({
    global: opts.global || null,
    mission: opts.mission || null,
    techs,
    inventionHow: cluster.howText || "",
    inventionImpact: "",
  });
  return { level: sustain.level, note: sustain.note };
}

/**
 * Concern prior — heuristic never awards green.
 * Nothing docked is always red, even with a saved written answer.
 * @param {object} cluster
 * @param {object|null} [given]
 * @returns {{ level: "red"|"yellow"|"green", note: string }}
 */
export function assessConcernPrior(cluster, given = null) {
  const hasAnswer = Boolean(String(given?.playerAnswer || "").trim());
  if (!cluster?.anyTouch) {
    return {
      level: "red",
      note: hasAnswer
        ? "Answer is on file — the light stays red until a pathway docks against this critic."
        : "Still unanswered — dock a pathway, or write a reply (the light stays red until something is docked).",
    };
  }
  if (cluster.matureCount >= 1) {
    return {
      level: "yellow",
      note: hasAnswer
        ? "A mature pathway touches this concern — evaluation will read the connected invent and your written answer."
        : "A mature pathway touches this concern — AI must confirm it is honestly addressed.",
    };
  }
  return {
    level: "yellow",
    note: hasAnswer
      ? "A pathway touches; evaluation will read it together with your written answer."
      : "A pathway touches but may not be enough yet.",
  };
}

/**
 * Full prior for one given tile.
 * @param {object} board
 * @param {object} given
 * @param {object} ctx
 * @param {number} ctx.year
 * @param {object|null} [ctx.mission]
 * @param {object|null} [ctx.global]
 * @param {string[]} [ctx.suggested]
 * @returns {{ level: "red"|"yellow"|"green", note: string, role: string|null, cluster: object }}
 */
export function assessGivenPrior(board, given, ctx = {}) {
  const year = Number(ctx.year) || 2026;
  const cluster = clusterFromGiven(board, given, year);

  if (given.kind === TILE_KIND.concern) {
    const prior = assessConcernPrior(cluster, given);
    return { ...prior, role: null, angle: given.angle || null, cluster };
  }

  const role = given.role || "local";
  if (role === "support") {
    const prior = assessSupportScalePrior(cluster);
    return { ...prior, role, cluster };
  }
  if (role === "global") {
    const prior = assessGlobalSustainPrior(cluster, {
      mission: ctx.mission,
      global: ctx.global,
    });
    return { ...prior, role, cluster };
  }
  // local (default)
  const prior = assessLocalFitPrior(cluster, {
    suggested: ctx.suggested || ctx.mission?.suggested || [],
    scene: ctx.mission?.scene || "",
    meterLabel: given.name || given.meterKey || "",
  });
  return { ...prior, role, cluster };
}

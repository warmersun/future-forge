/**
 * Traffic-light evaluation for crisis / concern hexes.
 * Heuristic runs instantly; AI verdicts overwrite via applyLights.
 */

import { crisisMeterLevel } from "../sim/collapse.js";
import {
  TILE_KIND,
  applyLights,
  cloneBoard,
  concernPoseText,
  concernReplyText,
} from "./board-state.js";
import {
  ideaMature,
  assessGivenPrior,
  clusterFromGiven,
  bandToLamp,
} from "./evaluate.js";

export { ideaMature, bandToLamp };

/**
 * Heuristic lamp for one given tile — uses cluster priors when mission ctx present.
 * @param {object} board
 * @param {object} given
 * @param {object} ctx
 * @param {number} ctx.year
 * @param {Record<string, number>} [ctx.pressure]
 * @param {Record<string, number>} [ctx.winMax]
 * @param {object|null} [ctx.mission]
 * @param {object|null} [ctx.global]
 * @param {string[]} [ctx.suggested]
 */
export function heuristicLamp(board, given, ctx = {}) {
  const year = Number(ctx.year) || 2026;

  // Prefer role-aware priors when we have mission context (or always for givens)
  if (given.kind === TILE_KIND.crisis || given.kind === TILE_KIND.concern) {
    const prior = assessGivenPrior(board, given, ctx);
    if (given.kind === TILE_KIND.concern) {
      return prior.level === "green" ? "yellow" : prior.level;
    }
    // Crisis: blend prior with pressure band so empty boards stay hot when pressure is high
    const key = given.meterKey || given.name;
    const cur = Number(ctx.pressure?.[key] ?? 2);
    const goal = ctx.winMax?.[key];
    const cluster = prior.cluster || clusterFromGiven(board, given, year);
    let out;
    if (!cluster.anyTouch) {
      const band = crisisMeterLevel(cur, goal);
      return bandToLamp(band);
    }
    // Prior already encodes fit / sustain / support; ease one step if mature
    let level = prior.level;
    if (cluster.matureCount >= 1 && level === "red") level = "yellow";
    return level;
  }

  return given.lamp || "red";
}

/**
 * Recompute all (or affected) given lamps with the heuristic.
 * @param {object} board
 * @param {object} ctx
 * @param {string[]|null} [onlyIds]
 */
export function applyHeuristicLights(board, ctx = {}, onlyIds = null) {
  const next = cloneBoard(board);
  const givens = Object.values(next.tiles).filter(
    (t) => t.kind === TILE_KIND.crisis || t.kind === TILE_KIND.concern
  );
  const lights = [];
  for (const g of givens) {
    if (onlyIds && !onlyIds.includes(g.id)) continue;
    const prior = assessGivenPrior(next, g, ctx);
    lights.push({
      id: g.id,
      level: heuristicLamp(next, g, ctx),
      reason: prior.note || "heuristic",
    });
  }
  return applyLights(next, lights);
}

/**
 * @deprecated Prefer cached pathway deltas. Kept for offline/tests that still call it.
 * Pressure relief when a crisis lamp is painted green by AI.
 * Ease toward winMax (or by 2).
 * @param {Record<string, number>} pressure
 * @param {object} crisisTile
 * @param {Record<string, number>} [winMax]
 * @param {"red"|"yellow"|"green"} level
 */
export function pressureAfterCrisisLamp(pressure, crisisTile, winMax = {}, level) {
  const next = { ...(pressure || {}) };
  const key = crisisTile.meterKey || crisisTile.name;
  if (key == null || next[key] == null) return next;
  if (level === "green") {
    const goal = winMax[key];
    if (goal != null) {
      next[key] = Math.min(next[key], Number(goal));
    } else {
      next[key] = Math.max(0, next[key] - 2);
    }
  } else if (level === "yellow") {
    next[key] = Math.max(0, next[key] - 1);
  }
  return next;
}

/**
 * Build evaluate-neighbors request context for /api/co-invent.
 * Each given gets the full reachable invention pathway (not 1-hop only).
 * neighbors[] keeps the legacy key; each entry has direct:true when docked on the given.
 * @param {object} board
 * @param {object} opts
 */
export function buildNeighborEvalContext(board, opts = {}) {
  const givenIds = opts.givenIds || null;
  const givens = Object.values(board?.tiles || {}).filter((t) => {
    if (t.kind !== TILE_KIND.crisis && t.kind !== TILE_KIND.concern) return false;
    if (givenIds && !givenIds.includes(t.id)) return false;
    return t.q != null && t.r != null;
  });

  const mission = opts.mission || null;
  const priorCtx = {
    year: opts.year,
    mission,
    global: opts.global || null,
    suggested: opts.suggested || mission?.suggested || [],
  };

  return {
    year: opts.year,
    place: opts.place || "",
    missionTitle: opts.missionTitle || "",
    grounding: opts.grounding || null,
    pressure: opts.pressure || {},
    winMax: opts.winMax || {},
    evalSeq: board?.evalSeq || 0,
    givens: givens.map((g) => {
      const prior = assessGivenPrior(board, g, priorCtx);
      const cluster = prior.cluster || clusterFromGiven(board, g, opts.year);
      const directIds = cluster.directIds || new Set();
      const inventions = cluster.inventions || [];
      return {
        id: g.id,
        kind: g.kind,
        name: g.name,
        role: g.role || null,
        angle: g.angle || null,
        lamp: g.lamp,
        challengeSpeech: concernPoseText(g).speech || null,
        challengeQuestion: concernPoseText(g).question || null,
        playerAnswer: concernReplyText(g).answer || null,
        answerQuality: concernReplyText(g).quality,
        pressure:
          g.kind === TILE_KIND.crisis
            ? opts.pressure?.[g.meterKey || g.name]
            : null,
        prior: {
          level: prior.level,
          note: prior.note,
        },
        pathway: {
          techIds: cluster.techIds || [],
          howText: cluster.howText || "",
          matureCount: cluster.matureCount || 0,
          worstTiming: cluster.worstTiming,
          anyTouch: Boolean(cluster.anyTouch),
          anyDirect: Boolean(cluster.anyDirect),
        },
        // Legacy key: full pathway (not 1-hop). direct marks edge contact with this given.
        neighbors: inventions.map((n) => ({
          id: n.id,
          techId: n.techId,
          polarity: n.polarity,
          year: n.year,
          howText: n.howText,
          feasibilityPct: n.feasibilityPct,
          timingLevel: n.timingLevel || null,
          mature: ideaMature(n, opts.year),
          direct: directIds.has(n.id),
        })),
      };
    }),
  };
}

/**
 * Normalize AI lights payload.
 * @param {unknown} raw
 * @returns {Array<{ id: string, level: string, reason: string }>}
 */
export function normalizeNeighborLights(raw) {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.lights)
      ? raw.lights
      : [];
  const out = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const id = String(item.id || "").trim();
    const level = String(item.level || "").toLowerCase();
    if (!id) continue;
    if (level !== "red" && level !== "yellow" && level !== "green") continue;
    out.push({
      id,
      level,
      reason: String(item.reason || "").slice(0, 280),
    });
  }
  return out;
}

export { applyLights };

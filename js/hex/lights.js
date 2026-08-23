/**
 * Traffic-light evaluation for crisis / concern hexes.
 * Heuristic runs instantly; AI verdicts overwrite via applyLights.
 */

import { crisisMeterLevel } from "../sim/collapse.js";
import {
  TILE_KIND,
  neighborTiles,
  applyLights,
  cloneBoard,
} from "./board-state.js";

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
  if (actor.feasibilityPct != null && Number(actor.feasibilityPct) < 35) {
    return false;
  }
  return true;
}

/**
 * Heuristic lamp for one given tile.
 * @param {object} board
 * @param {object} given
 * @param {object} ctx
 * @param {number} ctx.year
 * @param {Record<string, number>} [ctx.pressure]
 * @param {Record<string, number>} [ctx.winMax]
 */
export function heuristicLamp(board, given, ctx = {}) {
  const year = Number(ctx.year) || 2026;
  const nabes = neighborTiles(board, given.id).filter(
    (n) => n.kind === TILE_KIND.invention
  );
  const matureTouch = nabes.some((n) => ideaMature(n, year));
  const anyTouch = nabes.length > 0;

  if (given.kind === TILE_KIND.crisis) {
    const key = given.meterKey || given.name;
    const cur = Number(ctx.pressure?.[key] ?? 2);
    const goal = ctx.winMax?.[key];
    // Touching a mature idea eases one band
    let effective = cur;
    if (matureTouch) effective = Math.max(0, cur - 2);
    else if (anyTouch) effective = Math.max(0, cur - 1);
    const band = crisisMeterLevel(effective, goal);
    if (band === "cool") return "green";
    if (band === "warm") return "yellow";
    return "red";
  }

  if (given.kind === TILE_KIND.concern) {
    // Heuristic never awards green — AI must confirm
    if (matureTouch) return "yellow";
    if (anyTouch) return "yellow";
    return "red";
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
    lights.push({
      id: g.id,
      level: heuristicLamp(next, g, ctx),
      reason: "heuristic",
    });
  }
  return applyLights(next, lights);
}

/**
 * Map crisisMeterLevel / HUD cool|warm|hot → ryg for HUD echo.
 * @param {"cool"|"warm"|"hot"} band
 */
export function bandToLamp(band) {
  if (band === "cool") return "green";
  if (band === "warm") return "yellow";
  return "red";
}

/**
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

  return {
    year: opts.year,
    place: opts.place || "",
    missionTitle: opts.missionTitle || "",
    grounding: opts.grounding || null,
    pressure: opts.pressure || {},
    winMax: opts.winMax || {},
    evalSeq: board?.evalSeq || 0,
    givens: givens.map((g) => {
      const nabes = neighborTiles(board, g.id).filter(
        (n) => n.kind === TILE_KIND.invention
      );
      return {
        id: g.id,
        kind: g.kind,
        name: g.name,
        role: g.role || null,
        angle: g.angle || null,
        lamp: g.lamp,
        pressure:
          g.kind === TILE_KIND.crisis
            ? opts.pressure?.[g.meterKey || g.name]
            : null,
        neighbors: nabes.map((n) => ({
          id: n.id,
          name: n.name,
          techId: n.techId,
          polarity: n.polarity,
          year: n.year,
          howText: n.howText,
          feasibilityPct: n.feasibilityPct,
          mature: ideaMature(n, opts.year),
          dir: n.dir,
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

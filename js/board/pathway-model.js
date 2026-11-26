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
 * Pathway board document (future-forge.pathway-board/v2).
 * DOM-free. Fusion, wires, and forecast timing do not call a model.
 * Legacy hex tiles are projected onto board.tiles so economy and cloud saves stay compatible.
 */

import { TECHS } from "../data.js";
import { semanticDigest } from "../semantic-digest.js";
import { neighbor } from "../hex/hex-tile-grid.js";
import { collectorInventionIsFree } from "../ontology/collector-ontology.js";
import { crisisMeterLevel } from "../sim/collapse.js";

export const PATHWAY_BOARD_SCHEMA = "future-forge.pathway-board/v2";
export const CONVERGENCE_FACTOR = 1.25;
export const RD_FACTORS = [0.75, 1, 1.5, 2];

const WORLDS = new Set(["bits", "atoms", "split", "plain"]);

export function rollRdFactor(rng = Math.random) {
  const i = Math.floor(Number(rng()) * RD_FACTORS.length);
  return RD_FACTORS[Math.max(0, Math.min(RD_FACTORS.length - 1, i))] ?? 1;
}

export function formatRdFactor(factor) {
  const n = Number(factor);
  if (!Number.isFinite(n)) return "1×";
  return `${Math.round(n * 100) / 100}×`;
}

export function isPathwayBoard(board) {
  return Boolean(board && board.schema === PATHWAY_BOARD_SCHEMA);
}

export function createPathwayBoard(opts = {}) {
  return {
    schema: PATHWAY_BOARD_SCHEMA,
    seq: 1,
    rev: 1,
    techTracks: {},
    useCases: {},
    pathways: {},
    wires: {},
    crises: {},
    challengers: {},
    arguments: {},
    concernsRoster: [],
    concernsSummoned: false,
    pathwayImpacts: {},
    paidEaseRoles: {},
    rules: Array.isArray(opts.rules) ? opts.rules.map((r) => ({ ...r })) : [],
  };
}

function clone(board) {
  return structuredClone(board);
}

function bump(board) {
  board.rev = (Number(board.rev) || 0) + 1;
  return board;
}

function nextId(board, prefix) {
  const n = Number(board.seq) || 1;
  board.seq = n + 1;
  return `${prefix}-${n}`;
}

export function isUseCaseEarly(uc, questYear) {
  return Number(uc?.milestoneYear) > Number(questYear);
}

export function forecastWireState(uc, questYear) {
  return isUseCaseEarly(uc, questYear) ? "early" : "solid";
}

export function composePathwayHow(pathway) {
  const custom = String(pathway?.customHow || "").trim();
  if (custom) return custom;
  return (pathway?.ingredients || [])
    .map((ing) => String(ing.howText || "").trim())
    .filter(Boolean)
    .join("\n\n");
}

export function needsBridgeWarning(pathway, enforceWorlds = true) {
  if (!enforceWorlds) return false;
  const worlds = (pathway?.ingredients || []).map((ing) => ing.world);
  const bits = worlds.includes("bits");
  const atoms = worlds.includes("atoms");
  const bridge = worlds.includes("split") || worlds.includes("plain");
  return Boolean(bits && atoms && !bridge);
}

function worldOf(value, fallback = "bits") {
  return WORLDS.has(value) ? value : fallback;
}

function pctToTimingLevel(pct) {
  const n = Number(pct);
  if (!Number.isFinite(n)) return "yellow";
  if (n >= 68) return "green";
  if (n >= 40) return "yellow";
  return "red";
}

/**
 * Cap timing when any ingredient rests on a forecast that is still ahead.
 * Applies Convergence and R&D multipliers when present. Does not mutate milestoneStatus.
 */
export function effectiveTiming(pathway, useCases, questYear) {
  const earlyYears = [];
  for (const ing of pathway?.ingredients || []) {
    for (const id of ing.useCaseIds || []) {
      const uc = useCases?.[id];
      if (isUseCaseEarly(uc, questYear)) earlyYears.push(Number(uc.milestoneYear));
    }
  }
  if (earlyYears.length) {
    const year = Math.min(...earlyYears);
    return {
      timingLevel: "red",
      timingPct: 20,
      early: true,
      pending: false,
      timingReason: `Too early in ${questYear} — relies on ~${year} forecast`,
    };
  }
  const pending = (pathway?.ingredients || []).some((ing) => Boolean(ing.timingPending));
  const levels = (pathway?.ingredients || []).map((ing) => ing.timingLevel).filter(Boolean);
  const rank = { red: 0, yellow: 1, green: 2 };
  let worst = "green";
  for (const level of levels) {
    if ((rank[level] ?? 1) < (rank[worst] ?? 1)) worst = level;
  }
  if (!levels.length) worst = "yellow";

  const pcts = (pathway?.ingredients || [])
    .map((ing) => Number(ing.timingPct))
    .filter((n) => Number.isFinite(n));

  let combinedPct = pcts.length
    ? pcts.reduce((a, b) => a * b, 1) / 100 ** (pcts.length - 1)
    : null;

  const rdFactor = Number(pathway?.rdBoost?.factor);
  const hasRd = Number.isFinite(rdFactor) && rdFactor !== 1;
  const hasConv = Array.isArray(pathway?.convergences) && pathway.convergences.length > 0;

  if (combinedPct != null) {
    if (hasConv) combinedPct *= CONVERGENCE_FACTOR;
    if (hasRd) combinedPct *= rdFactor;
    combinedPct = Math.max(5, Math.min(99, Math.round(combinedPct)));
    if ((hasConv || hasRd) && worst !== "red") {
      worst = pctToTimingLevel(combinedPct);
    } else if (hasRd && rdFactor < 1 && combinedPct < 40) {
      worst = "red";
    } else if ((hasConv || (hasRd && rdFactor > 1)) && worst === "red" && combinedPct >= 45) {
      worst = pctToTimingLevel(combinedPct);
    }
  }

  const reasons = (pathway?.ingredients || [])
    .map((ing) => String(ing.timingReason || "").trim())
    .filter(Boolean);

  return {
    timingLevel: pending && worst !== "red" ? "yellow" : worst,
    timingPct: combinedPct,
    early: false,
    pending,
    timingReason: reasons[0] || "",
  };
}

export function acceptedArgumentsForPathway(board, pathway) {
  if (!board || !pathway) return [];
  return (pathway.argumentIds || [])
    .map((id) => board.arguments?.[id])
    .filter((a) => a && a.verdict === "accept" && a.claim)
    .map((a) => a.claim);
}

/**
 * Collect settled ingredient timing judgments and settled pathway crisis-score
 * reasons for `fact-check-argument`, putting `focusPathwayId` first so the
 * pathway the player is arguing for is never truncated out.
 *
 * @param {object|null|undefined} board
 * @param {string|null} [focusPathwayId]
 * @returns {{ timings: object[], pathways: object[] }}
 */
export function settledPathwayAssessments(board, focusPathwayId = null) {
  if (!isPathwayBoard(board)) return { timings: [], pathways: [] };
  const allPathways = Object.values(board.pathways || {});
  allPathways.sort((a, b) => {
    if (focusPathwayId) {
      if (a.id === focusPathwayId && b.id !== focusPathwayId) return -1;
      if (b.id === focusPathwayId && a.id !== focusPathwayId) return 1;
    }
    return (Number(a.createdOrder) || 0) - (Number(b.createdOrder) || 0);
  });

  const timings = [];
  const pathways = [];
  const seenFp = new Set();

  for (const pw of allPathways) {
    const howFallback = composePathwayHow(pw);
    for (const ing of pw.ingredients || []) {
      if (ing.timingPending) continue;
      const level = ing.timingLevel;
      if (level !== "red" && level !== "yellow" && level !== "green") continue;
      timings.push({
        tileId: ing.id,
        techId: ing.techId || null,
        howText: String(ing.howText || howFallback || "").slice(0, 400),
        level,
        reason: String(ing.timingReason || "").slice(0, 400),
      });
    }

    const fp = pathwayContentFingerprint(pw, board);
    if (seenFp.has(fp)) continue;
    seenFp.add(fp);
    const impact = board.pathwayImpacts?.[fp];
    if (!impact) continue;
    const crisisReasons = {};
    for (const [role, reason] of Object.entries(impact.crisisReasons || {})) {
      if (isImpactRolePending(impact, role)) continue;
      const text = String(reason || "").trim();
      if (text) crisisReasons[role] = text.slice(0, 280);
    }
    if (!Object.keys(crisisReasons).length) continue;
    pathways.push({
      fingerprint: fp,
      inventionIds: (pw.ingredients || []).map((ing) => ing.id),
      crisisReasons,
    });
  }

  return {
    timings: timings.slice(0, 8),
    pathways: pathways.slice(0, 4),
  };
}

export function pathwayContentFingerprint(pathway, board = null) {
  const parts = (pathway?.ingredients || [])
    .map((ing) => [
      ing.id,
      ing.techId || "",
      String(ing.howText || "").trim(),
      ing.timingLevel || "",
      ing.useCaseIds || [],
    ])
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  const acceptedClaims = board
    ? acceptedArgumentsForPathway(board, pathway)
    : pathway?.argumentIds || [];
  return semanticDigest("pathway-content-v1", [
    parts,
    String(pathway?.customHow || ""),
    acceptedClaims,
    pathway?.rdBoost?.factor || null,
  ]);
}

export function addTechTrack(board, techId) {
  const next = clone(board);
  const id = String(techId || "");
  if (!id) return next;
  if (!next.techTracks[id]) {
    const maxOrder = Object.values(next.techTracks).reduce(
      (m, t) => Math.max(m, Number(t?.addedOrder) || 0),
      0
    );
    next.techTracks[id] = {
      techId: id,
      addedOrder: maxOrder + 1,
      chartOpen: false,
      activeMilestoneIds: [],
      collectorCardIds: [],
    };
  }
  return bump(next);
}

export function removeTechTrack(board, techId) {
  const next = clone(board);
  const id = String(techId || "");
  if (!next.techTracks[id]) return next;
  delete next.techTracks[id];
  const usedUcIds = new Set();
  for (const pw of Object.values(next.pathways || {})) {
    for (const ing of pw.ingredients || []) {
      for (const ucId of ing.useCaseIds || []) usedUcIds.add(ucId);
    }
  }
  for (const [ucId, uc] of Object.entries(next.useCases || {})) {
    if (uc.techId === id && !usedUcIds.has(ucId)) {
      delete next.useCases[ucId];
    }
  }
  return bump(next);
}

export function setChartOpen(board, techId, open) {
  const next = addTechTrack(board, techId);
  next.techTracks[techId].chartOpen = Boolean(open);
  return next;
}

/**
 * Deal a milestone's use cases into Lane 2. Copies status; never rewrites it.
 */
export function dealMilestone(board, techId, milestone) {
  const next = addTechTrack(board, techId);
  const ms = milestone || {};
  const msId = String(ms.id || "");
  const track = next.techTracks[techId];
  if (msId && !track.activeMilestoneIds.includes(msId)) track.activeMilestoneIds.push(msId);
  if (ms.collectorCardId && !track.collectorCardIds.includes(ms.collectorCardId)) {
    track.collectorCardIds.push(ms.collectorCardId);
  }
  for (const uc of ms.useCases || []) {
    const id = String(uc.id || nextId(next, "uc"));
    if (next.useCases[id]) continue;
    next.useCases[id] = {
      id,
      techId,
      milestoneId: msId,
      milestoneLabel: String(ms.label || "").slice(0, 120),
      milestoneYear: Number(ms.year) || 2026,
      milestoneStatus: ms.status === "reached" ? "reached" : "predicted",
      title: String(uc.title || "Use case").slice(0, 80),
      blurb: String(uc.blurb || "").slice(0, 280),
      world: worldOf(uc.world, "bits"),
      origin: uc.origin || "catalog",
      collectorCardId: ms.collectorCardId || null,
    };
  }
  return bump(next);
}

export function removeUseCase(board, useCaseId) {
  const next = clone(board);
  const uc = next.useCases?.[useCaseId];
  if (!uc) return next;
  delete next.useCases[useCaseId];
  for (const pw of Object.values(next.pathways || {})) {
    for (const ing of pw.ingredients || []) {
      if (Array.isArray(ing.useCaseIds)) {
        ing.useCaseIds = ing.useCaseIds.filter((id) => id !== useCaseId);
      }
    }
  }
  if (uc.techId && uc.milestoneId && next.techTracks[uc.techId]) {
    const stillHasSibling = Object.values(next.useCases).some(
      (other) => other.techId === uc.techId && other.milestoneId === uc.milestoneId
    );
    if (!stillHasSibling) {
      next.techTracks[uc.techId].activeMilestoneIds = (
        next.techTracks[uc.techId].activeMilestoneIds || []
      ).filter((id) => id !== uc.milestoneId);
    }
  }
  return bump(next);
}

export function addCustomUseCase(board, partial = {}) {
  const next = partial.techId ? addTechTrack(board, partial.techId) : clone(board);
  let id = nextId(next, "uc-custom");
  while (next.useCases?.[id]) id = nextId(next, "uc-custom");
  next.useCases[id] = {
    id,
    techId: String(partial.techId || ""),
    milestoneId: partial.milestoneId || null,
    milestoneLabel: String(partial.milestoneLabel || "Custom").slice(0, 120),
    milestoneYear: Number(partial.milestoneYear) || Number(partial.year) || 2026,
    milestoneStatus: partial.milestoneStatus === "predicted" ? "predicted" : "reached",
    title: String(partial.title || "Custom use case").slice(0, 80),
    blurb: String(partial.blurb || partial.title || "").slice(0, 280),
    world: worldOf(partial.world, "bits"),
    origin: "custom",
    collectorCardId: null,
  };
  return { board: bump(next), id };
}

function ingredientFrom(next, partial, useCases) {
  const ids = (partial.useCaseIds || []).map(String);
  const first = useCases[ids[0]];
  return {
    id: partial.id || nextId(next, "ing"),
    techId: partial.techId !== undefined ? partial.techId : first?.techId ?? null,
    useCaseIds: ids,
    title: String(partial.title || first?.title || "Invention").slice(0, 80),
    howText: String(partial.howText || first?.blurb || "").slice(0, 4000),
    world: worldOf(partial.world || first?.world, partial.techId ? "bits" : "plain"),
    artUrl: partial.artUrl || null,
    artId: partial.artId ? String(partial.artId).slice(0, 140) : null,
    imagePrompt: partial.imagePrompt ? String(partial.imagePrompt).slice(0, 400) : "",
    artPending: Boolean(partial.artPending),
    timingPct: partial.timingPct ?? null,
    timingLevel: partial.timingLevel || null,
    timingReason: partial.timingReason || "",
    timingPending: Boolean(partial.timingPending),
    collectorCardId: partial.collectorCardId || first?.collectorCardId || null,
  };
}

export function createPathway(board, partial = {}) {
  const next = clone(board);
  const id = partial.id || nextId(next, "pw");
  const maxOrder = Object.values(next.pathways).reduce(
    (m, p) => Math.max(m, Number(p?.createdOrder) || 0),
    0
  );
  const ingredient = ingredientFrom(next, partial, next.useCases);
  next.pathways[id] = {
    id,
    createdOrder: maxOrder + 1,
    ingredients: [ingredient],
    customHow: "",
    convergences: [],
    rdBoost: null,
    argumentIds: [],
  };
  return { board: bump(next), pathwayId: id, ingredientId: ingredient.id };
}

function ensureTrackInPlace(next, techId) {
  const id = String(techId || "");
  if (!id || next.techTracks[id]) return;
  const maxOrder = Object.values(next.techTracks).reduce(
    (m, t) => Math.max(m, Number(t?.addedOrder) || 0),
    0
  );
  next.techTracks[id] = {
    techId: id,
    addedOrder: maxOrder + 1,
    chartOpen: false,
    activeMilestoneIds: [],
    collectorCardIds: [],
  };
}

/**
 * Atomically mint 1 or more staged Workbench ingredient partials into a single
 * Pathway (single-ingredient or pre-fused multi-ingredient). Auto-adds any newly
 * introduced emTech tracks to Lane 1 and computes Convergence synergies.
 *
 * @param {object} board
 * @param {object[]} partials
 * @param {{ id?: string, customHow?: string }} [opts]
 */
export function mintStagedDraftsToPathway(board, partials = [], opts = {}) {
  const list = Array.isArray(partials) ? partials.filter(Boolean) : [];
  if (!list.length) {
    return { board: clone(board), ok: false, pathwayId: null, ingredientIds: [] };
  }
  const next = clone(board);
  const id = opts.id || nextId(next, "pw");
  const maxOrder = Object.values(next.pathways).reduce(
    (m, p) => Math.max(m, Number(p?.createdOrder) || 0),
    0
  );
  const ingredients = list.map((p) => {
    const ing = ingredientFrom(next, p, next.useCases);
    if (ing.techId) ensureTrackInPlace(next, ing.techId);
    return ing;
  });
  next.pathways[id] = {
    id,
    createdOrder: maxOrder + 1,
    ingredients,
    customHow: String(opts.customHow || "").slice(0, 4000),
    convergences: convergenceRows(ingredients),
    rdBoost: null,
    argumentIds: [],
  };
  return {
    board: bump(next),
    ok: true,
    pathwayId: id,
    ingredientIds: ingredients.map((ing) => ing.id),
  };
}

/**
 * Fuse 1 or more staged Workbench ingredient partials directly into an existing Pathway.
 * Auto-adds any newly introduced emTech tracks to Lane 1 and recomputes Convergences.
 *
 * @param {object} board
 * @param {string} pathwayId
 * @param {object[]} partials
 */
export function fuseDraftIntoPathway(board, pathwayId, partials = []) {
  const list = Array.isArray(partials) ? partials.filter(Boolean) : [];
  const next = clone(board);
  const target = next.pathways?.[pathwayId];
  if (!target || !list.length) {
    return { board: next, ok: false, pathwayId: null, ingredientIds: [] };
  }
  const added = list.map((p) => {
    const ing = ingredientFrom(next, p, next.useCases);
    if (ing.techId) ensureTrackInPlace(next, ing.techId);
    return ing;
  });
  target.ingredients = [...target.ingredients, ...added];
  target.convergences = convergenceRows(target.ingredients);
  return {
    board: bump(next),
    ok: true,
    pathwayId,
    ingredientIds: added.map((ing) => ing.id),
  };
}

export function removePathway(board, pathwayId) {
  const next = clone(board);
  if (!next.pathways?.[pathwayId]) return next;
  delete next.pathways[pathwayId];
  for (const [wireId, wire] of Object.entries(next.wires || {})) {
    if (wire.pathwayId === pathwayId) delete next.wires[wireId];
  }
  for (const [chId, ch] of Object.entries(next.challengers || {})) {
    if (ch.pathwayId === pathwayId) delete next.challengers[chId];
  }
  for (const [argId, arg] of Object.entries(next.arguments || {})) {
    if (arg.pathwayId === pathwayId) delete next.arguments[argId];
  }
  return refreshCrisisLamps(bump(next)).board;
}

/**
 * Identify items that were explored/considered but are not connected to the active causal chain:
 * - When at least one Pathway is wired to a Crisis: unplugged pathways, use cases not feeding
 *   a wired pathway, and tech tracks not feeding a wired pathway are unused.
 * - When Pathways exist but none are wired yet: all pathways stay; use cases and tech tracks
 *   not feeding any pathway are unused (keeping focusedTechId if no tech is referenced yet).
 * - When no Pathways exist yet: all dealt use cases stay; extra tech tracks with zero dealt
 *   use cases are unused (keeping focusedTechId or the first tech when nothing has use cases).
 *
 * @param {object|null|undefined} board
 * @param {{ focusedTechId?: string|null }} [opts]
 */
export function findUnusedItems(board, opts = {}) {
  if (!isPathwayBoard(board)) {
    return { techIds: [], useCaseIds: [], pathwayIds: [], count: 0 };
  }
  const wires = Object.values(board.wires || {});
  const pathways = Object.values(board.pathways || {});
  const useCases = Object.values(board.useCases || {});
  const techIds = Object.keys(board.techTracks || {});

  const keepPathwayIds =
    wires.length > 0
      ? new Set(wires.map((w) => w.pathwayId).filter((id) => Boolean(board.pathways?.[id])))
      : new Set(pathways.map((p) => p.id));

  const unusedPathwayIds = pathways
    .filter((p) => !keepPathwayIds.has(p.id))
    .map((p) => p.id);

  const keepUseCaseIds = new Set();
  if (keepPathwayIds.size > 0) {
    for (const pwId of keepPathwayIds) {
      const pw = board.pathways?.[pwId];
      for (const ing of pw?.ingredients || []) {
        for (const ucId of ing.useCaseIds || []) {
          if (board.useCases?.[ucId]) keepUseCaseIds.add(ucId);
        }
      }
    }
  } else {
    for (const uc of useCases) keepUseCaseIds.add(uc.id);
  }

  const unusedUseCaseIds = useCases
    .filter((uc) => !keepUseCaseIds.has(uc.id))
    .map((uc) => uc.id);

  const keepTechIds = new Set();
  for (const pwId of keepPathwayIds) {
    const pw = board.pathways?.[pwId];
    for (const ing of pw?.ingredients || []) {
      if (ing.techId && board.techTracks?.[ing.techId]) keepTechIds.add(ing.techId);
    }
  }
  for (const ucId of keepUseCaseIds) {
    const uc = board.useCases?.[ucId];
    if (uc?.techId && board.techTracks?.[uc.techId]) keepTechIds.add(uc.techId);
  }
  // Never leave an unwired/early board with zero techs just because nothing has been wired yet.
  if (keepTechIds.size === 0 && wires.length === 0 && techIds.length > 0) {
    const fallback =
      opts.focusedTechId && board.techTracks?.[opts.focusedTechId]
        ? opts.focusedTechId
        : techIds[0];
    if (fallback) keepTechIds.add(fallback);
  }

  const unusedTechIds = techIds.filter((id) => !keepTechIds.has(id));
  const count = unusedTechIds.length + unusedUseCaseIds.length + unusedPathwayIds.length;
  return {
    techIds: unusedTechIds,
    useCaseIds: unusedUseCaseIds,
    pathwayIds: unusedPathwayIds,
    count,
  };
}

/**
 * Remove all unconnected items identified by `findUnusedItems`.
 * @param {object} board
 * @param {{ focusedTechId?: string|null }} [opts]
 */
export function pruneUnusedItems(board, opts = {}) {
  const unused = findUnusedItems(board, opts);
  if (!isPathwayBoard(board) || unused.count === 0) {
    return { board, removed: unused };
  }
  let next = clone(board);
  for (const pwId of unused.pathwayIds) {
    next = removePathway(next, pwId);
  }
  for (const ucId of unused.useCaseIds) {
    next = removeUseCase(next, ucId);
  }
  for (const techId of unused.techIds) {
    next = removeTechTrack(next, techId);
  }
  // Clean up orphan milestone flags on surviving tech tracks that no longer have dealt use cases.
  for (const track of Object.values(next.techTracks || {})) {
    if (!Array.isArray(track.activeMilestoneIds) || !track.activeMilestoneIds.length) continue;
    const liveMsIds = new Set(
      Object.values(next.useCases || {})
        .filter((uc) => uc.techId === track.techId && uc.milestoneId)
        .map((uc) => uc.milestoneId)
    );
    track.activeMilestoneIds = track.activeMilestoneIds.filter((id) => liveMsIds.has(id));
  }
  return { board: bump(next), removed: unused };
}

/**
 * True when two ingredients belong to genuinely synergistic emTech families
 * (via TECHS.pairs) or bridge distinct domains through a converter.
 */
export function pairConverges(a, b) {
  if (!a || !b || (a.id && b.id && a.id === b.id)) return false;
  if (!a.techId || !b.techId || a.techId === b.techId) return false;
  const techA = TECHS.find((t) => t.id === a.techId);
  const techB = TECHS.find((t) => t.id === b.techId);
  if (techA?.pairs?.includes(b.techId) || techB?.pairs?.includes(a.techId)) {
    return true;
  }
  if ((a.world === "split" && b.world !== "plain") || (b.world === "split" && a.world !== "plain")) {
    return true;
  }
  return false;
}

export function convergenceRows(ingredients) {
  const rows = [];
  const seenTechPairs = new Set();
  for (let i = 0; i < ingredients.length; i++) {
    for (let j = i + 1; j < ingredients.length; j++) {
      const a = ingredients[i];
      const b = ingredients[j];
      if (!pairConverges(a, b)) continue;
      const techPairKey = [a.techId, b.techId].sort().join("|");
      if (seenTechPairs.has(techPairKey)) continue;
      seenTechPairs.add(techPairKey);
      const techA = TECHS.find((t) => t.id === a.techId);
      const techB = TECHS.find((t) => t.id === b.techId);
      const nameA = techA?.name || a.title;
      const nameB = techB?.name || b.title;
      const pairKey = [a.id, b.id].sort().join("|");
      rows.push({
        pairKey,
        aId: a.id,
        bId: b.id,
        title: `${nameA} × ${nameB}`,
        reason: `Better ${nameA.toLowerCase()} makes ${nameB.toLowerCase()} more capable here, and demand from ${nameB.toLowerCase()} pulls ${nameA.toLowerCase()} forward.`,
        factor: CONVERGENCE_FACTOR,
      });
    }
  }
  return rows;
}

export function setPathwayConvergences(board, pathwayId, rows) {
  const next = clone(board);
  const pw = next.pathways?.[pathwayId];
  if (!pw) return next;
  pw.convergences = Array.isArray(rows) ? rows.map((r) => ({ ...r })) : [];
  return bump(next);
}

export function fusePathways(board, targetId, sourceId) {
  const next = clone(board);
  const target = next.pathways[targetId];
  const source = next.pathways[sourceId];
  if (!target || !source || targetId === sourceId) return { board: next, ok: false };
  target.ingredients = [...target.ingredients, ...source.ingredients];
  target.convergences = convergenceRows(target.ingredients);
  if (!String(target.customHow || "").trim() && String(source.customHow || "").trim()) {
    target.customHow = source.customHow;
  }
  if (!target.rdBoost && source.rdBoost) target.rdBoost = source.rdBoost;
  for (const argId of source.argumentIds || []) {
    if (!target.argumentIds.includes(argId)) target.argumentIds.push(argId);
    if (next.arguments[argId]) next.arguments[argId].pathwayId = targetId;
  }
  delete next.pathways[sourceId];

  const existingTargets = new Set(
    Object.values(next.wires)
      .filter((w) => w.pathwayId === targetId)
      .map((w) => w.crisisId)
  );
  for (const [wireId, wire] of Object.entries(next.wires)) {
    if (wire.pathwayId !== sourceId) continue;
    if (existingTargets.has(wire.crisisId)) {
      delete next.wires[wireId];
    } else {
      next.wires[wireId] = { ...wire, pathwayId: targetId };
      existingTargets.add(wire.crisisId);
    }
  }
  for (const ch of Object.values(next.challengers)) {
    if (ch.pathwayId === sourceId) ch.pathwayId = targetId;
  }
  return { board: bump(next), ok: true, pathwayId: targetId };
}

export function unfuseIngredient(board, pathwayId, ingredientId) {
  const next = clone(board);
  const pathway = next.pathways[pathwayId];
  if (!pathway) return { board: next, ok: false };
  const index = pathway.ingredients.findIndex((ing) => ing.id === ingredientId);
  if (index < 0) return { board: next, ok: false };
  const [ing] = pathway.ingredients.splice(index, 1);
  pathway.convergences = convergenceRows(pathway.ingredients);
  const spawnedId = nextId(next, "pw");
  const maxOrder = Object.values(next.pathways).reduce(
    (m, p) => Math.max(m, Number(p?.createdOrder) || 0),
    0
  );
  next.pathways[spawnedId] = {
    id: spawnedId,
    createdOrder: maxOrder + 1,
    ingredients: [ing],
    customHow: "",
    convergences: [],
    rdBoost: null,
    argumentIds: [],
  };
  if (!pathway.ingredients.length) {
    delete next.pathways[pathwayId];
    for (const [wireId, wire] of Object.entries(next.wires)) {
      if (wire.pathwayId === pathwayId) delete next.wires[wireId];
    }
    for (const [chId, ch] of Object.entries(next.challengers)) {
      if (ch.pathwayId === pathwayId) delete next.challengers[chId];
    }
  }
  return { board: bump(next), ok: true, pathwayId: spawnedId, ingredient: ing };
}

export function setPathwayHow(board, pathwayId, text) {
  const next = clone(board);
  const pathway = next.pathways[pathwayId];
  if (!pathway) return next;
  const trimmed = String(text || "").slice(0, 4000);
  if (pathway.ingredients.length === 1 && !pathway.customHow) {
    pathway.ingredients[0].howText = trimmed;
  } else {
    pathway.customHow = trimmed;
  }
  return bump(next);
}

export function setIngredientHow(board, pathwayId, ingredientId, text) {
  const next = clone(board);
  const ing = next.pathways[pathwayId]?.ingredients?.find((row) => row.id === ingredientId);
  if (!ing) return next;
  ing.howText = String(text || "").slice(0, 4000);
  return bump(next);
}

export function setIngredientTiming(board, pathwayId, ingredientId, patch = {}) {
  const next = clone(board);
  const ing = next.pathways[pathwayId]?.ingredients?.find((row) => row.id === ingredientId);
  if (!ing) return next;
  if (patch.timingLevel !== undefined) ing.timingLevel = patch.timingLevel;
  if (patch.timingPct !== undefined) ing.timingPct = patch.timingPct;
  if (patch.timingReason !== undefined) ing.timingReason = String(patch.timingReason || "").slice(0, 320);
  if (patch.timingPending !== undefined) ing.timingPending = Boolean(patch.timingPending);
  return bump(next);
}

export function setIngredientArt(
  board,
  pathwayId,
  ingredientId,
  artUrl,
  artPending = false,
  artId = undefined
) {
  const next = clone(board);
  const ing = next.pathways[pathwayId]?.ingredients?.find((row) => row.id === ingredientId);
  if (!ing) return next;
  if (artUrl !== undefined) ing.artUrl = artUrl;
  if (artId !== undefined) ing.artId = artId ? String(artId).slice(0, 140) : null;
  ing.artPending = Boolean(artPending);
  return bump(next);
}

export function isImpactRolePending(impact, role) {
  if (!impact || !impact.pending) return false;
  if (impact.pendingRoles && typeof impact.pendingRoles === "object") {
    return Boolean(impact.pendingRoles[role]);
  }
  return true;
}

export function plugWire(board, pathwayId, crisisId) {
  const next = clone(board);
  if (!next.pathways[pathwayId] || !next.crises[crisisId]) return { board: next, ok: false };
  const existing = Object.values(next.wires).find(
    (wire) => wire.pathwayId === pathwayId && wire.crisisId === crisisId
  );
  if (existing) return { board: next, ok: true, wireId: existing.id, already: true };
  const id = nextId(next, "wire");
  next.wires[id] = { id, pathwayId, crisisId };
  const role = next.crises[crisisId]?.role || "local";
  const impactKey = pathwayContentFingerprint(next.pathways[pathwayId], next);
  const prev = next.pathwayImpacts[impactKey];
  const alreadyScoredRole = Boolean(
    prev &&
      !prev.earlyBlocked &&
      !isImpactRolePending(prev, role) &&
      prev.crisisDelta &&
      Object.prototype.hasOwnProperty.call(prev.crisisDelta, role)
  );
  if (!alreadyScoredRole) {
    const pendingRoles =
      prev?.pendingRoles && typeof prev.pendingRoles === "object"
        ? { ...prev.pendingRoles }
        : prev?.pending
          ? Object.fromEntries(
              Object.values(next.wires || {})
                .filter((w) => w.pathwayId === pathwayId)
                .map((w) => [next.crises?.[w.crisisId]?.role || "local", true])
            )
          : {};
    pendingRoles[role] = true;
    next.pathwayImpacts[impactKey] = {
      ...(prev || {}),
      pathwayId,
      pendingRoles,
      pending: true,
    };
  }
  return { board: bump(next), ok: true, wireId: id, already: false };
}

export function unplugWire(board, wireId) {
  const next = clone(board);
  const wire = next.wires[wireId];
  if (!wire) return next;
  const removedRole = next.crises?.[wire.crisisId]?.role || "local";
  delete next.wires[wireId];
  for (const [id, ch] of Object.entries(next.challengers)) {
    if (ch.wireId === wireId) delete next.challengers[id];
  }
  const pathway = next.pathways?.[wire.pathwayId];
  if (pathway) {
    const fp = pathwayContentFingerprint(pathway, next);
    const impact = next.pathwayImpacts?.[fp];
    if (impact?.pendingRoles && impact.pendingRoles[removedRole]) {
      const stillNeedsRole = Object.values(next.wires || {}).some(
        (w) =>
          w.pathwayId === wire.pathwayId &&
          (next.crises?.[w.crisisId]?.role || "local") === removedRole
      );
      if (!stillNeedsRole) {
        const nextPendingRoles = { ...impact.pendingRoles };
        delete nextPendingRoles[removedRole];
        impact.pendingRoles = nextPendingRoles;
        impact.pending = Object.keys(nextPendingRoles).length > 0;
      }
    }
  }
  return refreshCrisisLamps(bump(next)).board;
}

export function seedCrises(board, crises) {
  const next = isPathwayBoard(board) ? clone(board) : createPathwayBoard();
  if (!isPathwayBoard(board) && board?.tiles) next.tiles = structuredClone(board.tiles);
  for (const row of crises || []) {
    const id = String(row.id || `crisis-${row.role || "local"}`);
    const lamp = row.lamp || "red";
    next.crises[id] = {
      id,
      role: row.role || "local",
      meterKey: row.meterKey || row.name || row.role,
      name: row.name || row.role || "Crisis",
      description: String(row.description || "").slice(0, 400),
      lamp,
      initialLamp: lamp,
    };
  }
  return bump(next);
}

export function attachRd(board, pathwayId, boost = {}) {
  const next = clone(board);
  const pathway = next.pathways[pathwayId];
  if (!pathway) return next;
  const factor =
    boost?.factor != null && Number.isFinite(Number(boost.factor))
      ? Number(boost.factor)
      : rollRdFactor(boost?.rng);
  pathway.rdBoost = {
    id: boost?.id || nextId(next, "rd"),
    factor,
    label: String(boost?.label || "R&D").slice(0, 80),
  };
  return bump(next);
}

export function attachArgument(board, pathwayId, argument) {
  const next = clone(board);
  const pathway = next.pathways[pathwayId];
  if (!pathway || !argument) return next;
  const id = argument.id || nextId(next, "arg");
  next.arguments[id] = {
    id,
    pathwayId,
    claim: String(argument.claim || "").slice(0, 400),
    verdict:
      argument.verdict === "accept"
        ? "accept"
        : argument.verdict === "pending"
          ? "pending"
          : "reject",
    reason: String(argument.reason || "").slice(0, 280),
    pending: Boolean(argument.pending || argument.verdict === "pending"),
  };
  if (!pathway.argumentIds.includes(id)) pathway.argumentIds.push(id);
  return bump(next);
}

export function settleArgument(board, argumentId, verdict, reason = "") {
  const next = clone(board);
  const arg = next.arguments?.[argumentId];
  if (!arg) return next;
  arg.verdict = verdict === "accept" ? "accept" : "reject";
  arg.reason = String(reason || "").slice(0, 280);
  arg.pending = false;
  return bump(next);
}

export function removeArgument(board, argumentId) {
  const next = clone(board);
  const arg = next.arguments?.[argumentId];
  if (!arg) return next;
  const pw = next.pathways?.[arg.pathwayId];
  if (pw && Array.isArray(pw.argumentIds)) {
    pw.argumentIds = pw.argumentIds.filter((id) => id !== argumentId);
  }
  delete next.arguments[argumentId];
  return bump(next);
}

export function summonChallenger(board, partial = {}) {
  const next = clone(board);
  const wire = next.wires[partial.wireId];
  if (!wire) return { board: next, ok: false };
  const id = partial.id || nextId(next, "ch");
  const pathway = next.pathways[wire.pathwayId];
  next.challengers[id] = {
    id,
    angle: partial.angle || "stakeholder",
    wireId: wire.id,
    pathwayId: wire.pathwayId,
    speech: String(partial.speech || "").slice(0, 600),
    question: String(partial.question || "").slice(0, 400),
    lamp: "red",
    posePending: Boolean(partial.posePending),
    playerAnswer: "",
    answerQuality: null,
    answerFeedback: "",
    answerPending: false,
    posedHowText: pathway ? composePathwayHow(pathway) : "",
    posedAgainstFingerprint: pathway ? pathwayContentFingerprint(pathway, next) : "",
  };
  next.concernsSummoned = true;
  if (!next.concernsRoster.includes(next.challengers[id].angle)) {
    next.concernsRoster.push(next.challengers[id].angle);
  }
  return { board: bump(next), ok: true, id };
}

export function setChallengerAnswer(board, challengerId, patch = {}) {
  const next = clone(board);
  const ch = next.challengers[challengerId];
  if (!ch) return next;
  if (patch.playerAnswer != null) ch.playerAnswer = String(patch.playerAnswer).slice(0, 2000);
  if (patch.answerQuality !== undefined) ch.answerQuality = patch.answerQuality;
  if (patch.answerFeedback != null) ch.answerFeedback = String(patch.answerFeedback).slice(0, 400);
  if (patch.answerPending != null) ch.answerPending = Boolean(patch.answerPending);
  if (patch.lamp) ch.lamp = patch.lamp;
  return bump(next);
}

/**
 * A roadblock clears by a written glance/hit, or by a changed pathway whose
 * re-score lamp for that angle is yellow or green.
 */
export function resolveChallengerLamp(ch, pathway, concernLamp, board = null) {
  const quality = String(ch?.answerQuality || "");
  if (quality === "hit") return "green";
  if (quality === "glance") return "yellow";
  const fp = pathway ? pathwayContentFingerprint(pathway, board) : "";
  const changed = Boolean(ch?.posedAgainstFingerprint) && fp !== ch.posedAgainstFingerprint;
  if (changed && (concernLamp === "yellow" || concernLamp === "green")) return concernLamp;
  if (quality === "miss" && !changed) return "red";
  return ch?.lamp === "yellow" || ch?.lamp === "green" ? ch.lamp : "red";
}

export function applyChallengerLamps(board, lampsByAngle = {}) {
  const next = clone(board);
  for (const ch of Object.values(next.challengers)) {
    const pathway = next.pathways[ch.pathwayId];
    ch.lamp = resolveChallengerLamp(ch, pathway, lampsByAngle[ch.angle], next);
  }
  return bump(next);
}

function clampMeter(n) {
  return Math.max(0, Math.min(5, Math.round(Number(n) || 0)));
}

function meterBandToLamp(band) {
  if (band === "cool") return "green";
  if (band === "warm") return "yellow";
  return "red";
}

function wiresOnCrisis(board, crisisId) {
  return Object.values(board?.wires || {}).filter(
    (wire) => wire && wire.crisisId === crisisId && board.pathways?.[wire.pathwayId]
  );
}

function primaryDeltaReason(rows) {
  const settled = (rows || []).filter((row) => String(row?.reason || "").trim());
  if (!settled.length) return "";
  settled.sort(
    (a, b) => Math.abs(Number(b.delta) || 0) - Math.abs(Number(a.delta) || 0)
  );
  return String(settled[0].reason || "").slice(0, 280);
}

/**
 * Lamp each crisis from ambient pressure plus every wired pathway's settled delta.
 * A crisis with no live wire is red. Pending scores contribute 0.
 * @param {object} board
 * @param {Record<string, number>} [winMax]
 * @returns {{ board: object, displayPressure: Record<string, number> }}
 */
export function refreshCrisisLamps(board, winMax = {}) {
  const next = clone(board);
  const displayPressure = {};
  for (const [key, value] of Object.entries(next.pressureBase || {})) {
    displayPressure[key] = clampMeter(value);
  }
  for (const crisis of Object.values(next.crises || {})) {
    const key = crisis.meterKey || crisis.name || crisis.role;
    const role = crisis.role || "local";
    const wires = wiresOnCrisis(next, crisis.id);
    if (!wires.length) {
      crisis.delta = null;
      crisis.reason = "";
      crisis.lamp = "red";
      continue;
    }
    let sum = 0;
    const reasons = [];
    const seenPathway = new Set();
    for (const wire of wires) {
      if (seenPathway.has(wire.pathwayId)) continue;
      seenPathway.add(wire.pathwayId);
      const pathway = next.pathways[wire.pathwayId];
      const fp = pathwayContentFingerprint(pathway, next);
      const impact = next.pathwayImpacts?.[fp];
      if (!impact || isImpactRolePending(impact, role)) continue;
      const delta = Number(impact.crisisDelta?.[role]);
      const n = Number.isFinite(delta) ? delta : 0;
      sum += n;
      const reason = impact.crisisReasons?.[role];
      if (reason) reasons.push({ delta: n, reason });
    }
    const base = Number(next.pressureBase?.[key] ?? 0);
    const level = clampMeter(base + sum);
    if (key) displayPressure[key] = level;
    crisis.delta = sum;
    crisis.reason = primaryDeltaReason(reasons);
    crisis.lamp = meterBandToLamp(crisisMeterLevel(level, winMax?.[key]));
  }
  return { board: next, displayPressure };
}

export function boardHolds(board, questYear) {
  if (!isPathwayBoard(board)) return false;
  if (!board.concernsSummoned) return false;
  const crises = Object.values(board.crises || {});
  if (!crises.length) return false;
  const wiredPathwayIds = new Set();
  for (const crisis of crises) {
    const wires = wiresOnCrisis(board, crisis.id);
    if (!wires.length) return false;
    if (crisis.lamp !== "yellow" && crisis.lamp !== "green") return false;
    for (const wire of wires) {
      wiredPathwayIds.add(wire.pathwayId);
      const pathway = board.pathways[wire.pathwayId];
      const fp = pathwayContentFingerprint(pathway, board);
      const impact = board.pathwayImpacts?.[fp];
      if (!impact || isImpactRolePending(impact, crisis.role || "local")) return false;
    }
  }
  for (const pathwayId of wiredPathwayIds) {
    const timing = effectiveTiming(board.pathways[pathwayId], board.useCases, questYear);
    if (timing.timingLevel === "red" || timing.early || timing.pending) return false;
  }
  const challengers = Object.values(board.challengers || {});
  if (!challengers.length) return false;
  return challengers.every(
    (ch) => !ch.answerPending && !ch.posePending && (ch.lamp === "yellow" || ch.lamp === "green")
  );
}

export function applyScoreToCrisis(board, crisisId, score, winMax = {}) {
  const next = clone(board);
  const crisis = next.crises?.[crisisId];
  if (!crisis) return next;
  const role = crisis.role || "local";
  const raw = Number(score?.crisisDelta?.[role] ?? score?.delta ?? 0);
  const delta = Number.isFinite(raw) ? raw : 0;
  const reason = String(score?.crisisReasons?.[role] || score?.reason || "").slice(0, 280);
  const seen = new Set();
  for (const wire of wiresOnCrisis(next, crisisId)) {
    if (seen.has(wire.pathwayId)) continue;
    seen.add(wire.pathwayId);
    const pathway = next.pathways[wire.pathwayId];
    const fp = pathwayContentFingerprint(pathway, next);
    const prev = next.pathwayImpacts?.[fp] || {};
    const nextPendingRoles =
      prev.pendingRoles && typeof prev.pendingRoles === "object" ? { ...prev.pendingRoles } : {};
    delete nextPendingRoles[role];
    next.pathwayImpacts[fp] = {
      ...prev,
      pathwayId: pathway.id,
      pendingRoles: nextPendingRoles,
      pending: Object.keys(nextPendingRoles).length > 0,
      crisisDelta: { ...(prev.crisisDelta || {}), [role]: delta },
      crisisReasons: { ...(prev.crisisReasons || {}), [role]: reason },
    };
  }
  return refreshCrisisLamps(bump(next), winMax).board;
}

/**
 * Pinned town rules for the top of Lane 4.
 * @param {object[]} rules
 */
export function setPinnedRules(board, rules) {
  const next = isPathwayBoard(board) ? clone(board) : createPathwayBoard();
  next.rules = (rules || [])
    .filter((rule) => rule && rule.status !== "removed")
    .map((rule) => ({
      id: rule.id,
      label: String(rule.label || rule.text || "").slice(0, 140),
      body: String(rule.body || "").slice(0, 280),
      kind: rule.kind || "policy",
    }));
  return bump(next);
}

function tileAt(tiles, q, r) {
  return Object.values(tiles).find((t) => t && t.q === q && t.r === r) || null;
}

function inventionIslands(tiles) {
  const placed = Object.values(tiles).filter(
    (t) => t && t.kind === "invention" && t.q != null && t.r != null
  );
  const seen = new Set();
  const islands = [];
  for (const start of placed) {
    if (seen.has(start.id)) continue;
    const island = [];
    const queue = [start];
    seen.add(start.id);
    while (queue.length) {
      const cur = queue.shift();
      island.push(cur);
      for (let d = 0; d < 6; d++) {
        const n = neighbor(cur.q, cur.r, d);
        const other = tileAt(tiles, n.q, n.r);
        if (!other || other.kind !== "invention" || seen.has(other.id)) continue;
        seen.add(other.id);
        queue.push(other);
      }
    }
    islands.push(island);
  }
  return islands;
}

/**
 * Convert a legacy hex snapshot into a pathway board without dropping tiles.
 * Placed islands become pathways. A crisis touch becomes a wire.
 */
export function migrateToPathwayBoard(legacy) {
  if (isPathwayBoard(legacy) && legacy.pathways) return clone(legacy);
  const next = createPathwayBoard();
  const tiles = legacy?.tiles || {};
  next.tiles = structuredClone(tiles);
  next.pressureBase = structuredClone(legacy?.pressureBase || {});
  next.concernTargetCount = legacy?.concernTargetCount ?? 1;
  next.concernRoster = Array.isArray(legacy?.concernRoster) ? [...legacy.concernRoster] : null;
  next.concernsSummoned = Boolean(legacy?.concernsSummoned);
  next.pathwayImpacts = structuredClone(legacy?.pathwayImpacts || {});
  next.paidEaseRoles = structuredClone(legacy?.pathwayEaseAwards || {});
  for (const t of Object.values(tiles)) {
    if (t?.kind !== "crisis") continue;
    const lamp = t.lamp || "red";
    next.crises[t.id] = {
      id: t.id,
      role: t.role || "local",
      meterKey: t.meterKey || t.name,
      name: t.name || t.role,
      description: String(t.description || "").slice(0, 400),
      lamp,
      initialLamp: lamp,
    };
  }
  const islands = inventionIslands(tiles);
  islands.forEach((island, index) => {
    const id = `pw-migrated-${index + 1}`;
    const ingredients = island.map((tile) => {
      if (tile.techId && !next.techTracks[tile.techId]) {
        next.techTracks[tile.techId] = {
          techId: tile.techId,
          addedOrder: Object.keys(next.techTracks).length + 1,
          chartOpen: false,
          activeMilestoneIds: [],
          collectorCardIds: tile.collectorCardId ? [tile.collectorCardId] : [],
        };
      }
      return {
        id: tile.id,
        techId: tile.techId || null,
        useCaseIds: [],
        title: String(tile.name || tile.techId || "Invention").slice(0, 80),
        howText: String(tile.howText || "").slice(0, 4000),
        world: worldOf(tile.polarity === "curve" ? "plain" : tile.polarity, tile.techId ? "bits" : "plain"),
        artUrl: tile.artUrl || null,
        artId: tile.artId || null,
        imagePrompt: String(tile.imagePrompt || "").slice(0, 400),
        artPending: false,
        timingPct: tile.feasibilityPct ?? tile.timingPct ?? null,
        timingLevel: tile.timingLevel || null,
        timingReason: tile.timingReason || "",
        timingPending: Boolean(tile.timingPending),
        collectorCardId: tile.collectorCardId || null,
      };
    });
    next.pathways[id] = {
      id,
      createdOrder: index + 1,
      ingredients,
      customHow: "",
      convergences: convergenceRows(ingredients),
      rdBoost: null,
      argumentIds: [],
    };
    for (const tile of island) {
      for (let d = 0; d < 6; d++) {
        const n = neighbor(tile.q, tile.r, d);
        const other = tileAt(tiles, n.q, n.r);
        if (other?.kind !== "crisis") continue;
        const wireId = `wire-${id}-${other.id}`;
        next.wires[wireId] = { id: wireId, pathwayId: id, crisisId: other.id };
      }
    }
  });
  for (const t of Object.values(tiles)) {
    if (t?.kind !== "concern") continue;
    const wire = Object.values(next.wires)[0];
    if (!wire) continue;
    next.challengers[t.id] = {
      id: t.id,
      angle: t.angle || "stakeholder",
      wireId: wire.id,
      pathwayId: wire.pathwayId,
      speech: String(t.speech || t.challengeSpeech || "").slice(0, 600),
      question: String(t.question || t.challengeQuestion || "").slice(0, 400),
      lamp: t.lamp || "red",
      posePending: Boolean(t.posePending),
      playerAnswer: String(t.playerAnswer || ""),
      answerQuality: t.answerQuality || null,
      answerFeedback: String(t.answerFeedback || ""),
      answerPending: Boolean(t.answerPending),
      posedHowText: String(t.posedHowText || ""),
      posedAgainstFingerprint: String(t.posedAgainstFingerprint || t.posedHowText || ""),
    };
  }
  return bump(next);
}

export function addDynamicConvergence(board, pathwayId, row = {}) {
  const next = clone(board);
  const pw = next.pathways?.[pathwayId];
  if (!pw) return next;
  const key = String(row.key || `${row.a || ""}|${row.b || ""}`);
  if ((pw.convergences || []).some((c) => c.key === key)) return next;
  pw.convergences = [
    ...(pw.convergences || []),
    {
      key,
      factor: Number(row.factor) || CONVERGENCE_FACTOR,
      reason: String(row.reason || "Combined capabilities reinforce each other.").slice(0, 240),
    },
  ];
  return bump(next);
}

/**
 * Project pathways onto legacy tiles so stack billing, Future Vision, and outcome summary stay synced.
 */
export function projectToTiles(board) {
  if (!isPathwayBoard(board)) return board;
  const next = clone(board);
  const tiles = { ...(next.tiles || {}) };
  for (const [id, tile] of Object.entries(tiles)) {
    if (tile?.kind === "invention" || tile?.kind === "concern") delete tiles[id];
  }
  const qYear = Number(next.questYear) || 2026;
  const wiredPathways = new Set(Object.values(next.wires || {}).map((w) => w.pathwayId));
  let slot = 0;
  for (const pathway of Object.values(next.pathways)) {
    const isApplied = wiredPathways.has(pathway.id);
    const pwTiming = effectiveTiming(pathway, next.useCases, qYear);
    const convMult =
      (Array.isArray(pathway.convergences) && pathway.convergences.length ? CONVERGENCE_FACTOR : 1) *
      (Number.isFinite(Number(pathway.rdBoost?.factor)) ? Number(pathway.rdBoost.factor) : 1);
    pathway.ingredients.forEach((ing, idx) => {
      const col = slot % 6;
      const row = 1 + Math.floor(slot / 6);
      slot += 1;
      const free = Boolean(
        ing.collectorCardId && collectorInventionIsFree(next, ing.collectorCardId, ing.id)
      );
      const ingEarly = (ing.useCaseIds || []).some((ucId) =>
        isUseCaseEarly(next.useCases?.[ucId], qYear)
      );
      tiles[ing.id] = {
        id: ing.id,
        kind: "invention",
        q: col,
        r: row,
        techId: ing.techId,
        polarity: ing.world === "plain" ? "curve" : ing.world,
        name: ing.title,
        howText: ing.howText,
        artUrl: ing.artUrl || null,
        artId: ing.artId || null,
        timingLevel: ingEarly ? "red" : ing.timingLevel,
        timingReason: ingEarly ? pwTiming.timingReason : ing.timingReason,
        feasibilityPct: ingEarly ? 20 : ing.timingPct,
        timingPending: Boolean(ing.timingPending),
        ...(idx === 0 && convMult !== 1 ? { convergenceFactor: convMult } : {}),
        collectorCardId: free ? ing.collectorCardId : null,
        origin: free ? "collector" : "pathway",
        applied: isApplied,
        year: qYear,
      };
    });
  }
  for (const crisis of Object.values(next.crises)) {
    const prev = tiles[crisis.id];
    tiles[crisis.id] = {
      ...(prev || {}),
      id: crisis.id,
      kind: "crisis",
      q: prev?.q ?? 1,
      r: prev?.r ?? 3,
      role: crisis.role,
      name: crisis.name,
      meterKey: crisis.meterKey,
      description: crisis.description,
      lamp: crisis.lamp,
      polarity: "curve",
    };
  }
  for (const ch of Object.values(next.challengers)) {
    tiles[ch.id] = {
      id: ch.id,
      kind: "concern",
      angle: ch.angle,
      q: 4,
      r: 3,
      lamp: ch.lamp,
      speech: ch.speech,
      question: ch.question,
      playerAnswer: ch.playerAnswer,
      answerQuality: ch.answerQuality,
      answerFeedback: ch.answerFeedback,
      answerPending: ch.answerPending,
      posePending: ch.posePending,
      polarity: "curve",
      name: ch.angle,
    };
  }
  next.tiles = tiles;
  next.concernsSummoned = Boolean(next.concernsSummoned);
  return next;
}

export function ingredientGroups(board) {
  if (!isPathwayBoard(board)) return null;
  return Object.values(board.pathways || {})
    .sort((a, b) => (a.createdOrder || 0) - (b.createdOrder || 0))
    .map((pathway) =>
      pathway.ingredients.map((ing) => ({
        id: ing.id,
        kind: "invention",
        techId: ing.techId,
        name: ing.title,
        howText: ing.howText,
        polarity: ing.world === "plain" ? "curve" : ing.world,
        timingLevel: ing.timingLevel,
        timingReason: ing.timingReason,
        feasibilityPct: ing.timingPct,
        artUrl: ing.artUrl,
        collectorCardId: ing.collectorCardId,
        q: 0,
        r: 0,
        pathwayId: pathway.id,
      }))
    );
}

export function pathwayForIngredientIds(board, inventions) {
  if (!isPathwayBoard(board)) return null;
  const ids = new Set((inventions || []).map((row) => row?.id).filter(Boolean));
  if (!ids.size) return null;
  return (
    Object.values(board.pathways || {}).find((pathway) => {
      const mine = pathway.ingredients.map((ing) => ing.id);
      return mine.length === ids.size && mine.every((id) => ids.has(id));
    }) || null
  );
}

/**
 * Pure deploy-drop calculation (DOM-free).
 * Matches attemptDeploy drop formula (game.js ~L1655–1665) + optional G2 will deltas.
 */

import { applyG2DeployDeltas } from "./economy.js";

/**
 * @param {object} opts
 * @param {object[]} opts.techs — selected tech objects with id, domain
 * @param {string} opts.inventionHow
 * @param {string} opts.inventionImpact
 * @param {string|null} opts.challengeVerdict
 * @param {string} opts.challengeAnswer
 * @param {string[]} [opts.suggested] — mission.suggested tech ids
 * @param {Array<[string,string]>} [opts.pairs] — synergy pairs
 * @param {string[]} [opts.domains] — domain ids in stack
 * @param {number} [opts.will] — political will (G2)
 * @param {boolean} [opts.budgetWill] — feature flag
 */
export function computeDeployDrop(opts) {
  const techs = opts.techs || [];
  const domains = opts.domains || [];
  const pairs = opts.pairs || [];
  const how = String(opts.inventionHow || "");
  const impact = String(opts.inventionImpact || "");
  const words = `${how} ${impact}`.trim().split(/\s+/).filter(Boolean).length;
  const answer = String(opts.challengeAnswer || "").trim();
  const suggested = new Set(opts.suggested || []);

  /** @type {{ id: string, label: string, amount: number }[]} */
  const parts = [];

  let drop = 1 + Math.min(2, Math.max(0, techs.length - 1));
  parts.push({
    id: "stack",
    label: `Stack size (${techs.length} tech${techs.length === 1 ? "" : "s"})`,
    amount: 1 + Math.min(2, Math.max(0, techs.length - 1)),
  });

  if (domains.length >= 2) {
    drop += 1;
    parts.push({ id: "domains", label: "Cross-domain mix", amount: 1 });
  }
  if (pairs.length) {
    drop += 1;
    parts.push({ id: "synergy", label: "Synergy pair present", amount: 1 });
  }
  if (words >= 40) {
    drop += 1;
    parts.push({ id: "words", label: "Story depth (≥40 words)", amount: 1 });
  }
  if (opts.challengeVerdict === "pass") {
    drop += 1;
    parts.push({ id: "verdict", label: "Challenge PASS", amount: 1 });
  }
  if (answer.length >= 60) {
    drop += 1;
    parts.push({ id: "answer", label: "Detailed challenge answer", amount: 1 });
  }
  if (techs.filter((t) => suggested.has(t.id)).length >= 2) {
    drop += 1;
    parts.push({ id: "suggested", label: "≥2 mission-suggested techs", amount: 1 });
  }

  if (opts.budgetWill) {
    const g2 = applyG2DeployDeltas(drop, Number(opts.will) || 0);
    drop = g2.drop;
    parts.push(...g2.parts);
  }

  return { drop, parts };
}

/* —— PR7 staged deploy (pilot → scale → new normal) —— */

/**
 * Freeze total crisis relief at unlock time (one baseline deploy pool).
 * @param {number} fullDrop
 */
export function freezeStagedDropPool(fullDrop) {
  const pool = Math.max(0, Math.floor(Number(fullDrop) || 0));
  return {
    stagedDropPool: pool,
    stagedDropRemaining: pool,
    dropPilotApplied: 0,
    dropScaleApplied: 0,
    dropNewNormalApplied: 0,
  };
}

/**
 * Pilot takes half the pool (ceil), at least 1 if pool > 0, never more than remaining.
 * @param {number} pool
 * @param {number} remaining
 */
export function pilotDropAmount(pool, remaining) {
  const p = Math.max(0, Math.floor(Number(pool) || 0));
  const r = Math.max(0, Math.floor(Number(remaining) || 0));
  if (p <= 0 || r <= 0) return 0;
  return Math.min(r, Math.max(1, Math.ceil(p / 2)));
}

/**
 * Scale spends whatever is left in the frozen pool (may be 0).
 * @param {number} remaining
 */
export function scaleDropAmount(remaining) {
  return Math.max(0, Math.floor(Number(remaining) || 0));
}

/**
 * New normal is a win-check step. Optional +1 only if will ≥ 4 and original pool ≥ 4.
 * @param {number} will
 * @param {number} pool
 */
export function newNormalExtraDrop(will, pool) {
  if ((Number(will) || 0) >= 4 && (Number(pool) || 0) >= 4) return 1;
  return 0;
}

/**
 * Apply one stage to a frozen pool snapshot (pure).
 * @param {"pilot"|"scale"|"new_normal"} stage
 * @param {{ stagedDropPool: number, stagedDropRemaining: number, dropPilotApplied?: number, dropScaleApplied?: number, dropNewNormalApplied?: number }} frozen
 * @param {{ will?: number }} [opts]
 */
export function applyStagedDropStep(stage, frozen, opts = {}) {
  const next = {
    stagedDropPool: frozen.stagedDropPool ?? 0,
    stagedDropRemaining: frozen.stagedDropRemaining ?? 0,
    dropPilotApplied: frozen.dropPilotApplied ?? 0,
    dropScaleApplied: frozen.dropScaleApplied ?? 0,
    dropNewNormalApplied: frozen.dropNewNormalApplied ?? 0,
  };
  let drop = 0;
  let partId = stage;
  let label = stage;

  if (stage === "pilot") {
    drop = pilotDropAmount(next.stagedDropPool, next.stagedDropRemaining);
    next.stagedDropRemaining = Math.max(0, next.stagedDropRemaining - drop);
    next.dropPilotApplied = drop;
    partId = "pilot";
    label = "Pilot fielding";
  } else if (stage === "scale") {
    drop = scaleDropAmount(next.stagedDropRemaining);
    next.stagedDropRemaining = 0;
    next.dropScaleApplied = drop;
    partId = "scale";
    label = "Scale rollout";
  } else if (stage === "new_normal") {
    drop = newNormalExtraDrop(opts.will ?? 0, next.stagedDropPool);
    next.dropNewNormalApplied = drop;
    partId = "new_normal_mandate";
    label = drop ? "New normal mandate (Will ≥ 4)" : "New normal (no extra drop)";
  } else {
    return { ok: false, error: "unknown_stage", frozen: next, drop: 0, parts: [] };
  }

  return {
    ok: true,
    frozen: next,
    drop,
    parts: drop > 0 || stage === "new_normal" ? [{ id: partId, label, amount: drop }] : [],
  };
}

/** Vision stage id from deploy stage after each successful step */
export function visionStageIdForDeployStage(deployStage) {
  const map = {
    none: "present",
    pilot: "prototype",
    scale: "transition",
    new_normal: "transformed",
  };
  return map[deployStage] || "present";
}

/**
 * First thinking request of a seat-turn costs 1 AP; further thinking that turn is free.
 * Judge / pose / vision stay a full AP each time (acting, not asking).
 */

export const AI_ALWAYS_CHARGE_MODES = new Set([
  "judge-challenge",
  "judge-scrutiny-move",
  "judge-contribution",
  "pose-challenge",
  "vision",
  "assess-feasibility",
]);

/**
 * @param {string} [mode]
 */
export function isAiSeasonTaxMode(mode) {
  const m = String(mode || "chat");
  return !AI_ALWAYS_CHARGE_MODES.has(m);
}

/**
 * AP to charge for this AI request on the current seat-turn.
 * Explicit reservedAp ≤ 0 (tutor) stays 0 and does not pay the season tax.
 *
 * @param {object|null|undefined} sim
 * @param {string} [mode]
 * @param {number} [requestedAp]
 * @returns {number}
 */
export function thinkingAiApCost(sim, mode, requestedAp = 1) {
  return applyThinkingAiCharge(sim, mode, requestedAp).cost;
}

/**
 * @param {object|null|undefined} sim
 * @param {string} [mode]
 * @param {number} [requestedAp]
 * @returns {{ cost: number, markPaid: boolean }}
 */
export function applyThinkingAiCharge(sim, mode, requestedAp = 1) {
  const requested = Number(requestedAp);
  if (!Number.isFinite(requested) || requested <= 0) {
    return { cost: 0, markPaid: false };
  }
  if (!isAiSeasonTaxMode(mode)) {
    return { cost: Math.max(0, Math.floor(requested)), markPaid: false };
  }
  if (sim?.aiTaxThisTurn) return { cost: 0, markPaid: false };
  return { cost: 1, markPaid: true };
}

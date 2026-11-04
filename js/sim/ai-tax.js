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
 * Thinking modes ignore a client reservedAp of 0 unless opts.tutor is set.
 *
 * @param {object|null|undefined} sim
 * @param {string} [mode]
 * @param {number} [requestedAp]
 * @param {{ tutor?: boolean }} [opts]
 * @returns {number}
 */
export function thinkingAiApCost(sim, mode, requestedAp = 1, opts = {}) {
  return applyThinkingAiCharge(sim, mode, requestedAp, opts).cost;
}

/**
 * @param {object|null|undefined} sim
 * @param {string} [mode]
 * @param {number} [requestedAp]
 * @param {{ tutor?: boolean }} [opts]
 * @returns {{ cost: number, markPaid: boolean }}
 */
export function applyThinkingAiCharge(sim, mode, requestedAp = 1, opts = {}) {
  if (opts.tutor) return { cost: 0, markPaid: false };
  if (!isAiSeasonTaxMode(mode)) {
    const requested = Number(requestedAp);
    const n = Number.isFinite(requested) ? Math.max(0, Math.floor(requested)) : 1;
    return { cost: n > 0 ? n : 1, markPaid: false };
  }
  if (sim?.aiTaxThisTurn) return { cost: 0, markPaid: false };
  return { cost: 1, markPaid: true };
}

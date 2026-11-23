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
 * Pure post-briefing workshop disclosure state ("crises" -> "invent" -> "active").
 * No DOM access; safe for Node tests and the browser.
 */

export const WORKSHOP_STAGES = Object.freeze({
  crises: "crises",
  invent: "invent",
  active: "active",
});

const PLAYER_TILE_KINDS = new Set(["invention", "rd", "argument"]);

/**
 * Count player-created activity on a hex board.
 * Unplaced AI spark cards do not count as a committed invention yet.
 *
 * @param {object|null|undefined} board
 * @returns {{ total: number, onBoard: number, committed: number }}
 */
export function boardPlayerActivity(board) {
  const tiles = Object.values(board?.tiles || {});
  let total = 0;
  let onBoard = 0;
  let committed = 0;
  for (const t of tiles) {
    if (!t || !PLAYER_TILE_KINDS.has(t.kind)) continue;
    total += 1;
    const placed = t.q != null && t.r != null;
    if (placed) onBoard += 1;
    const isUnplacedSpark = t.kind === "invention" && t.origin === "sparks" && !placed;
    if (!isUnplacedSpark) committed += 1;
  }
  return { total, onBoard, committed };
}

/**
 * Resolve which progressive-disclosure stage the workshop should display.
 *
 * - Tutorial runs bypass staging ("active") so scripted targets stay visible.
 * - Pending crisis-introduction cards always own Stage 0 ("crises").
 * - Restored Continue runs with saved progress or any committed/placed tile
 *   enter Stage 2 ("active").
 * - Fresh post-crisis runs with zero committed tiles stay in Stage 1 ("invent").
 *
 * @param {{
 *   crisisPending?: number,
 *   board?: object|null,
 *   inventionCount?: number,
 *   tutorialOpen?: boolean,
 *   restored?: boolean,
 *   concernsSummoned?: boolean,
 * }} [input]
 * @returns {"crises" | "invent" | "active"}
 */
export function resolveWorkshopStage(input = {}) {
  if (input.tutorialOpen) return WORKSHOP_STAGES.active;
  const pending = Math.max(0, Number(input.crisisPending) || 0);
  if (pending > 0) return WORKSHOP_STAGES.crises;
  if (input.concernsSummoned || input.board?.concernsSummoned) {
    return WORKSHOP_STAGES.active;
  }
  const activity = boardPlayerActivity(input.board);
  const explicitCount = Number.isFinite(Number(input.inventionCount))
    ? Math.max(0, Number(input.inventionCount))
    : 0;
  if (activity.committed > 0 || activity.onBoard > 0 || explicitCount > 0) {
    return WORKSHOP_STAGES.active;
  }
  if (input.restored) return WORKSHOP_STAGES.active;
  return WORKSHOP_STAGES.invent;
}

/**
 * Look Ahead should stay calm on Turn 0 and only draw bright primary attention
 * when a placed invention actually hits a yellow or red timing bar.
 *
 * @param {{ stage?: string, timingLevel?: string, onBoardCount?: number }} [input]
 * @returns {boolean}
 */
export function shouldHighlightLookAhead(input = {}) {
  if (input.stage !== WORKSHOP_STAGES.active) return false;
  if ((Number(input.onBoardCount) || 0) <= 0) return false;
  return input.timingLevel === "red" || input.timingLevel === "yellow";
}

/**
 * Live status badge for the short-screen Assessment tab.
 * Quiet ("") until Stage 2 so Turn 0 never flashes red alarm dots.
 *
 * @param {{ stage?: string, level?: string, pending?: boolean }} [input]
 * @returns {"" | "pending" | "red" | "yellow" | "green"}
 */
export function assessmentTabBadgeLevel(input = {}) {
  if (input.stage !== WORKSHOP_STAGES.active) return "";
  if (input.pending) return "pending";
  if (input.level === "red" || input.level === "yellow" || input.level === "green") {
    return input.level;
  }
  return "";
}

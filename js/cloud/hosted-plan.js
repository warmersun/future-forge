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

import { isLibraryCatalogEntry } from "../quest-catalog.js";

/**
 * Same rule as the server: a catalog lesson (account access) may skip the plan.
 * Library tiles, open quests, and paid tiles do not.
 * @param {object|null|undefined} tile
 */
export function catalogLessonSkipsPlan(tile) {
  if (!tile || typeof tile !== "object") return false;
  if (isLibraryCatalogEntry(tile)) return false;
  const raw = tile.access || tile.mission?.access;
  if (raw === "open" || raw === "paid") return false;
  if (raw === "account") return true;
  if (tile.isLearningModule === true || tile.mission?.isLearningModule === true) return true;
  if (tile.kind === "module") return true;
  return false;
}

/**
 * Hosted app (ff.warmersun.com): play needs a signed-in session, then plan
 * `cloud`. A catalog lesson may continue with sign-in alone. Self-host stays open.
 *
 * @param {{ cloudAi?: boolean, signedIn?: boolean, entitled?: boolean, lesson?: boolean }} input
 * @returns {boolean} true when this session may stay in the app
 */
export function hostedSessionAllowed(input = {}) {
  if (!input.cloudAi) return true;
  if (!input.signedIn) return false;
  if (input.entitled) return true;
  return Boolean(input.lesson);
}

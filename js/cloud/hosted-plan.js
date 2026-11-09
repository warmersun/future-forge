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
 * True when a tile's access level requires payment (the `content` plan).
 * Waived tiles (`catalog.free` or sponsored) and Library tiles do not bill the player.
 * @param {object|null|undefined} tile
 */
export function catalogTileRequiresContentPlan(tile) {
  if (!tile || typeof tile !== "object") return false;
  if (isLibraryCatalogEntry(tile)) return false;
  const raw = tile.access || tile.mission?.access || tile.tile?.access;
  if (raw !== "paid") return false;
  const ent = String(
    tile.entitlement || tile.mission?.entitlement || tile.tile?.entitlement || ""
  ).trim();
  if (ent === "catalog.free") return false;
  if (
    String(
      tile.sponsorName || tile.mission?.sponsorName || tile.tile?.sponsorName || ""
    ).trim()
  ) {
    return false;
  }
  return true;
}

/**
 * Same rule as the server: a catalog lesson (account access) may skip the plan.
 * Library tiles, open quests, and paid tiles that bill the player do not.
 * @param {object|null|undefined} tile
 */
export function catalogLessonSkipsPlan(tile) {
  if (!tile || typeof tile !== "object") return false;
  if (isLibraryCatalogEntry(tile)) return false;
  const raw = tile.access || tile.mission?.access || tile.tile?.access;
  if (raw === "open") return false;
  if (raw === "paid") return !catalogTileRequiresContentPlan(tile);
  if (raw === "account") return true;
  if (tile.isLearningModule === true || tile.mission?.isLearningModule === true) return true;
  if (tile.kind === "module") return true;
  return false;
}

/**
 * Hosted app (ff.warmersun.com): play needs a signed-in session.
 * A paid catalog quest (`paid: true`) requires the `content` plan (`content: true`).
 * A catalog lesson (`lesson: true`, account access) may continue with sign-in alone.
 * Self-host stays open.
 *
 * @param {{ cloudAi?: boolean, signedIn?: boolean, entitled?: boolean, content?: boolean, paid?: boolean, lesson?: boolean }} input
 * @returns {boolean} true when this session may stay in the app
 */
export function hostedSessionAllowed(input = {}) {
  if (!input.cloudAi) return true;
  if (!input.signedIn) return false;
  if (input.paid) {
    return typeof input.content === "boolean" ? input.content : Boolean(input.entitled);
  }
  if (input.entitled) return true;
  return Boolean(input.lesson);
}

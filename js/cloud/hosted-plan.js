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

/**
 * Spark / Workshop play-mode resolver (pure data, no UI).
 *
 * Spark = quieter tutorial / simplified solo.
 * Workshop = full solo game (unlocked after tutorial win).
 *
 * Storage:
 * - future-forge:playMode — last chosen mode after unlock ("spark"|"workshop")
 * - future-forge:hasCompletedSpark — "1" after tutorial completed (unlocks Workshop)
 */

export const PLAY_MODE_KEY = "future-forge:playMode";
export const HAS_COMPLETED_SPARK_KEY = "future-forge:hasCompletedSpark";

const VALID_MODES = new Set(["spark", "workshop"]);

/**
 * @param {Storage|null|undefined} storage
 * @returns {Storage|null}
 */
function resolveStorage(storage) {
  if (storage && typeof storage.getItem === "function") return storage;
  try {
    if (typeof globalThis !== "undefined" && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch {
    /* private mode / missing localStorage */
  }
  return null;
}

/**
 * Decide solo play mode.
 * Priority: forceMode → (if tutorial not done → spark) → valid storedMode → workshop.
 *
 * Before tutorial complete, Workshop is locked: always spark (ignore stored workshop).
 *
 * @param {{ storedMode?: string|null, hasCompletedSpark?: boolean, forceMode?: string|null }} [opts]
 * @param {Storage} [_storage]
 * @returns {"spark"|"workshop"}
 */
export function resolvePlayMode(
  { storedMode, hasCompletedSpark, forceMode } = {},
  _storage
) {
  if (VALID_MODES.has(forceMode)) return forceMode;
  // Tutorial not finished — Workshop locked
  if (!hasCompletedSpark) return "spark";
  if (VALID_MODES.has(storedMode)) return storedMode;
  // Completed, no stored preference → default Workshop
  return "workshop";
}

/**
 * Workshop is choosable only after tutorial completion.
 * @param {Storage} [storage]
 * @returns {boolean}
 */
export function canSelectWorkshop(storage) {
  return readHasCompletedSpark(storage);
}

/**
 * Feature profile for a play mode.
 * Spark turns off heavy systems; Workshop spreads base (today's full defaults)
 * and clears Spark-only flags.
 *
 * @param {"spark"|"workshop"} mode
 * @param {object} [baseFeatures] — typically GAME.features
 * @returns {object}
 */
export function featuresForPlayMode(mode, baseFeatures = {}) {
  if (mode === "spark") {
    return {
      ...baseFeatures,
      actionPoints: false,
      budgetWill: false,
      scrutinyCombat: false,
      deployStages: false,
      runReport: true,
      sparkPath: true,
      starterTechOnly: true,
      singleStoryFace: true,
      stackCap: 3,
    };
  }
  return {
    ...baseFeatures,
    sparkPath: false,
    starterTechOnly: false,
    singleStoryFace: false,
    stackCap: 6,
  };
}

/**
 * @param {Storage} [storage]
 * @returns {"spark"|"workshop"|null}
 */
export function readPlayMode(storage) {
  const s = resolveStorage(storage);
  if (!s) return null;
  const v = s.getItem(PLAY_MODE_KEY);
  return VALID_MODES.has(v) ? v : null;
}

/**
 * @param {"spark"|"workshop"} mode
 * @param {Storage} [storage]
 */
export function writePlayMode(mode, storage) {
  if (!VALID_MODES.has(mode)) return;
  const s = resolveStorage(storage);
  if (!s) return;
  s.setItem(PLAY_MODE_KEY, mode);
}

/**
 * @param {Storage} [storage]
 * @returns {boolean}
 */
export function readHasCompletedSpark(storage) {
  const s = resolveStorage(storage);
  if (!s) return false;
  return s.getItem(HAS_COMPLETED_SPARK_KEY) === "1";
}

/**
 * Mark tutorial complete; unlock Workshop and default stored mode to workshop.
 * @param {Storage} [storage]
 */
export function markSparkCompleted(storage) {
  const s = resolveStorage(storage);
  if (!s) return;
  s.setItem(HAS_COMPLETED_SPARK_KEY, "1");
  s.setItem(PLAY_MODE_KEY, "workshop");
}

/**
 * Reset tutorial progress — Workshop locks again; mode forced to Spark.
 * Does not wipe pins / scenario cache.
 * @param {Storage} [storage]
 */
export function resetSparkProgress(storage) {
  const s = resolveStorage(storage);
  if (!s) return;
  try {
    s.removeItem(HAS_COMPLETED_SPARK_KEY);
  } catch {
    /* ignore */
  }
  s.setItem(PLAY_MODE_KEY, "spark");
}

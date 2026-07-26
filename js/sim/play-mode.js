/**
 * Spark / Workshop play-mode resolver (pure data, no UI).
 * Solo first-run is Spark until first win; then Workshop (full game).
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
 * Priority: forceMode → valid storedMode → hasCompletedSpark → spark (default).
 *
 * @param {{ storedMode?: string|null, hasCompletedSpark?: boolean, forceMode?: string|null }} [opts]
 * @param {Storage} [storage] — unused for pure resolve; accepted for API symmetry
 * @returns {"spark"|"workshop"}
 */
export function resolvePlayMode(
  { storedMode, hasCompletedSpark, forceMode } = {},
  _storage
) {
  if (VALID_MODES.has(forceMode)) return forceMode;
  if (VALID_MODES.has(storedMode)) return storedMode;
  if (hasCompletedSpark) return "workshop";
  return "spark";
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
 * Mark first solo Spark win complete; prefer switching stored mode to workshop.
 * @param {Storage} [storage]
 */
export function markSparkCompleted(storage) {
  const s = resolveStorage(storage);
  if (!s) return;
  s.setItem(HAS_COMPLETED_SPARK_KEY, "1");
  s.setItem(PLAY_MODE_KEY, "workshop");
}

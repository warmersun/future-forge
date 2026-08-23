/**
 * Play-mode helpers. Spark/tutorial profile is retired — Workshop is the only solo path.
 * Storage key kept for one-time migration / ignore.
 */

export const HAS_COMPLETED_SPARK_KEY = "future-forge:hasCompletedSpark";

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
 * Feature profile for a play mode. Spark flags are ignored — always Workshop.
 * @param {"spark"|"workshop"|string} _mode
 * @param {object} [baseFeatures]
 * @returns {object}
 */
export function featuresForPlayMode(_mode, baseFeatures = {}) {
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
 * @returns {boolean}
 */
export function readHasCompletedSpark(storage) {
  const s = resolveStorage(storage);
  if (!s) return true;
  return s.getItem(HAS_COMPLETED_SPARK_KEY) === "1" || true;
}

/**
 * @param {Storage} [storage]
 */
export function markSparkCompleted(storage) {
  const s = resolveStorage(storage);
  if (!s) return;
  s.setItem(HAS_COMPLETED_SPARK_KEY, "1");
}

/**
 * @param {Storage} [storage]
 */
export function resetSparkProgress(storage) {
  const s = resolveStorage(storage);
  if (!s) return;
  s.removeItem(HAS_COMPLETED_SPARK_KEY);
}

/**
 * Workshop unlock banner — tutorial removed, never show.
 */
export function shouldShowWorkshopUnlock() {
  return false;
}

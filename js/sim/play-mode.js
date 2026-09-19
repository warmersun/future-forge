/**
 * Play-mode helpers. There is one Workshop for everyone — no tutorial, no depth profile.
 * The legacy Spark completion key is removed on load.
 */

export const LEGACY_SPARK_KEY = "future-forge:hasCompletedSpark";

/**
 * Feature profile for the single Workshop path.
 * @param {string} _mode — ignored; kept for call-site compatibility
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
 * Drop the retired tutorial flag so old profiles carry no dead keys.
 * @param {Storage|null|undefined} [storage]
 */
export function forgetLegacySparkKey(storage) {
  let s = storage;
  if (!s || typeof s.removeItem !== "function") {
    try {
      s = globalThis.localStorage;
    } catch {
      s = null;
    }
  }
  if (!s) return;
  try {
    s.removeItem(LEGACY_SPARK_KEY);
  } catch {
    /* private mode */
  }
}

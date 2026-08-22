/**
 * Spark / Workshop feature profiles + tutorial-completion storage.
 *
 * Spark = quiet tutorial (only "Start tutorial" runs).
 * Workshop = full Workshop solo loop (theme / surprise / daily / everything else).
 *
 * Storage (tutorial CTA only — not mode toggle):
 * - future-forge:hasCompletedSpark = "1" after finishing the tutorial once
 *   → hides "Start tutorial" until reset
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
 * Feature profile for a play mode.
 * @param {"spark"|"workshop"} mode
 * @param {object} [baseFeatures]
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
 * @returns {boolean}
 */
export function readHasCompletedSpark(storage) {
  const s = resolveStorage(storage);
  if (!s) return false;
  return s.getItem(HAS_COMPLETED_SPARK_KEY) === "1";
}

/**
 * Tutorial finished once — hide "Start tutorial" until reset.
 * @param {Storage} [storage]
 */
export function markSparkCompleted(storage) {
  const s = resolveStorage(storage);
  if (!s) return;
  s.setItem(HAS_COMPLETED_SPARK_KEY, "1");
}

/**
 * Show "Start tutorial" again (demo / replay).
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
}

/**
 * Outcome screen: show "Welcome to Workshop" only for this solo tutorial win.
 * @param {{ kind?: string, multiparty?: boolean, tutorialGraduation?: boolean }} opts
 * @returns {boolean}
 */
export function shouldShowWorkshopUnlock(opts = {}) {
  if (opts.kind !== "win") return false;
  if (opts.multiparty) return false;
  return Boolean(opts.tutorialGraduation);
}

/**
 * Spark / Workshop feature profiles (pure data, no UI).
 *
 * Spark = quiet tutorial profile (only used when player starts "Play tutorial").
 * Workshop = full solo game (default for all other solo play + theme/daily/surprise).
 * Multiplayer does not use these profiles.
 */

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

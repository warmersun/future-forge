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

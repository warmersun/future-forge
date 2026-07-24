/**
 * Win / collapse pure checks (DOM-free).
 */

import { maxPressure } from "./pressure.js";

/**
 * @param {Record<string, number>} pressure
 * @param {Record<string, number>} winMax — mission.winMax
 */
export function isWin(pressure, winMax = {}) {
  return Object.entries(winMax).every(([k, max]) => (pressure[k] ?? 0) <= max);
}

/**
 * @param {object} opts
 * @param {number} opts.year
 * @param {number} opts.collapseYear
 * @param {Record<string, number>} opts.pressure
 */
export function isCollapsed({ year, collapseYear, pressure }) {
  return year >= collapseYear || maxPressure(pressure) >= 5;
}

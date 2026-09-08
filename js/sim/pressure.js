/**
 * Pure crisis pressure helpers (DOM-free).
 */

/** @param {Record<string, number>} p */
export function clonePressure(p) {
  return { ...(p || {}) };
}

/**
 * Full Wait rise — matches shipped waitTurn behavior.
 * @param {Record<string, number>} pressure
 * @param {Record<string, number>} rise
 * @param {number} [cap=5]
 */
export function applyPressureRise(pressure, rise = {}, cap = 5) {
  const next = clonePressure(pressure);
  for (const k of Object.keys(next)) {
    const delta = rise[k] ?? 0;
    next[k] = Math.min(cap, (next[k] ?? 0) + delta);
  }
  return next;
}

/**
 * Apply rise once per calendar year jumped (End turn = 1, Wait = yearsPerTurn).
 * Whole numbers only — never splits a rise across years.
 * @param {Record<string, number>} pressure
 * @param {Record<string, number>} rise
 * @param {number} years
 * @param {number} [cap=5]
 */
export function applyPressureRiseYears(pressure, rise = {}, years = 1, cap = 5) {
  const n = Math.max(0, Math.floor(Number(years) || 0));
  let next = clonePressure(pressure);
  for (let i = 0; i < n; i++) next = applyPressureRise(next, rise, cap);
  return next;
}

/**
 * Predict pressure after one Wait without mutating.
 * Wait jumps `years` (default yearsPerTurn = 2) and applies rise once per year.
 * @param {Record<string, number>} pressure
 * @param {Record<string, number>} rise
 * @param {number} [years=2]
 */
export function previewPressureAfterWait(pressure, rise = {}, years = 2) {
  return applyPressureRiseYears(pressure, rise, years, 5);
}

/**
 * Allocate a deploy drop across meters (highest first).
 * Mirrors game.js attemptDeploy L1667–1683.
 * @param {Record<string, number>} pressure
 * @param {number} drop
 */
export function applyPressureDrop(pressure, drop) {
  const next = clonePressure(pressure);
  let remaining = Math.max(0, Math.floor(drop));
  const keys = Object.keys(next);
  const ordered = [...keys].sort((a, b) => (next[b] ?? 0) - (next[a] ?? 0));

  for (const k of ordered) {
    if (remaining <= 0) break;
    const can = next[k] ?? 0;
    const take = Math.min(can, Math.ceil(remaining / 2) || 1);
    next[k] = Math.max(0, can - take);
    remaining -= take;
  }
  for (const k of ordered) {
    if (remaining <= 0) break;
    if ((next[k] ?? 0) > 0) {
      next[k]--;
      remaining--;
    }
  }
  return next;
}

export function maxPressure(pressure = {}) {
  const vals = Object.values(pressure);
  if (!vals.length) return 0;
  return Math.max(0, ...vals);
}

export function totalPressure(pressure = {}) {
  return Object.values(pressure).reduce((a, b) => a + b, 0);
}

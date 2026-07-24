/**
 * Soft field-lock label helpers (PR11) — pure, used by room play UI and tests.
 */

export const STORY_LOCK_FIELDS = [
  ["inventionName", "mp-lock-name"],
  ["inventionHow", "mp-lock-how"],
  ["inventionImpact", "mp-lock-impact"],
];

/**
 * @param {object|null|undefined} lock — { displayName, until, playerId? }
 * @param {number} [now]
 * @returns {string} hint text or ""
 */
export function formatFieldLockHint(lock, now = Date.now()) {
  if (!lock || typeof lock !== "object") return "";
  if (!lock.until || lock.until <= now) return "";
  const name = String(lock.displayName || "Someone").trim() || "Someone";
  return `${name} is editing…`;
}

/**
 * Apply lock hints to a map of field → current label string (or DOM textContent setters).
 * @param {Record<string, {displayName?: string, until?: number}>} locks
 * @param {number} [now]
 * @returns {Record<string, string>} field → label
 */
export function fieldLockLabels(locks, now = Date.now()) {
  const src = locks && typeof locks === "object" ? locks : {};
  const out = {};
  for (const [field] of STORY_LOCK_FIELDS) {
    out[field] = formatFieldLockHint(src[field], now);
  }
  return out;
}

/**
 * Paint lock hint elements. elementsByField: { inventionHow: HTMLElement, ... }
 * @param {Record<string, {displayName?: string, until?: number}>} locks
 * @param {Record<string, { textContent?: string }|null|undefined>} elementsByField
 * @param {number} [now]
 */
export function paintFieldLockElements(locks, elementsByField, now = Date.now()) {
  const labels = fieldLockLabels(locks, now);
  for (const [field, text] of Object.entries(labels)) {
    const el = elementsByField?.[field];
    if (el) el.textContent = text;
  }
  return labels;
}

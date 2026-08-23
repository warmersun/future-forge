/**
 * Soft field-lock label helpers (PR11) — pure, used by room play UI and tests.
 */

export const STORY_LOCK_FIELDS = [
  ["inventionName", "mp-lock-name"],
  ["inventionHow", "mp-lock-how"],
  ["inventionImpact", "mp-lock-impact"],
  ["hexBoard", "mp-lock-board"],
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
/**
 * Resolve lock for a story field. Supports legacy keys (`inventionHow`) and
 * per-player keys (`playerId:inventionHow` with optional `field` property).
 */
export function resolveFieldLock(locks, field) {
  const src = locks && typeof locks === "object" ? locks : {};
  if (src[field]) return src[field];
  for (const [k, v] of Object.entries(src)) {
    if (!v || typeof v !== "object") continue;
    if (v.field === field) return v;
    if (k === field || k.endsWith(`:${field}`)) return v;
  }
  return null;
}

export function fieldLockLabels(locks, now = Date.now()) {
  const out = {};
  for (const [field] of STORY_LOCK_FIELDS) {
    out[field] = formatFieldLockHint(resolveFieldLock(locks, field), now);
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

/**
 * Stable browser session id for server-side usage / time-spent metrics.
 * Stored in localStorage; regenerated only if missing or unreadable.
 */

const STORAGE_KEY = "future-forge:clientSessionId";

/**
 * @returns {string}
 */
export function getClientSessionId() {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (id && /^[A-Za-z0-9._:-]{8,120}$/.test(id)) return id;
    id =
      (typeof crypto !== "undefined" && crypto.randomUUID?.()) ||
      `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    return (
      (typeof crypto !== "undefined" && crypto.randomUUID?.()) ||
      `c-${Date.now().toString(36)}`
    );
  }
}

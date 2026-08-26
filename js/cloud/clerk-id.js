/**
 * Clerk user id shape. Node-free so the browser (ghost links) can share it.
 * Do not import js/server/clerk-auth.mjs from client code — it uses node:async_hooks.
 */

/**
 * @param {string|null|undefined} userId
 * @returns {string|null}
 */
export function normalizeClerkUserId(userId) {
  if (userId == null) return null;
  const s = String(userId).trim().slice(0, 120);
  if (!s) return null;
  if (!/^[A-Za-z0-9._:-]+$/.test(s)) return null;
  return s;
}

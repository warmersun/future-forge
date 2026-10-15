/**
 * API paths the portal answers. Anything else under /api is a 404 before routing.
 * @param {string} pathOnly — request path without the query string
 * @returns {boolean}
 */
export function isPortalApiPath(pathOnly) {
  const p = String(pathOnly || "");
  if (p === "/api/health" || p.startsWith("/api/health/")) return true;
  if (p === "/api/me" || p.startsWith("/api/me/")) return true;
  if (p.startsWith("/api/u/")) return true;
  if (p === "/api/webhooks/clerk" || p.startsWith("/api/webhooks/clerk/")) return true;
  if (p === "/api/report" || p.startsWith("/api/report/")) return true;
  if (p === "/api/board" || p.startsWith("/api/board/")) return true;
  if (p === "/api/device" || p.startsWith("/api/device/")) return true;
  if (p === "/api/internal/ai/reserve") return true;
  // Official quest catalog (bucket or public URL) and single gated tiles.
  if (p === "/api/quests" || p.startsWith("/api/quests/")) return true;
  return false;
}

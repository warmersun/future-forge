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

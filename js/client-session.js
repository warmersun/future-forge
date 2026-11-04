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

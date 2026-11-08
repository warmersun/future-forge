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
 * One base URL for every remote content catalog (quests + trends).
 *
 * FF_CONTENT_BASE_URL points the app at an alternative content base.
 * Catalog URLs are derived from it:
 *   quests  → <base>quests/catalog.json  (modules, lessons, spotlights)
 *   trends  → <base>trends/catalog.json
 *
 * A specific FF_QUESTS_REMOTE_URL / FF_TRENDS_REMOTE_URL still wins.
 * Unset: live defaults (warmersun.com) are unchanged.
 */

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string|null} base URL ending in "/", or null when unset
 */
export function resolveContentBaseUrl(env = process.env) {
  const raw = env.FF_CONTENT_BASE_URL;
  if (raw === undefined) return null;
  const s = String(raw).trim();
  if (!s || s === "0" || /^off$/i.test(s) || /^false$/i.test(s)) return null;
  return s.endsWith("/") ? s : `${s}/`;
}

/**
 * @param {string} base
 * @param {"quests"|"trends"} kind
 */
export function contentCatalogUrl(base, kind) {
  return new URL(`${kind}/catalog.json`, base).href;
}


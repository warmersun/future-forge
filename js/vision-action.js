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
 * Last player action that should shape the next Future Vision still.
 * Shared so the workshop and the friends side panel send the same cause.
 */

const OPEN = { type: "open", tileId: "", techId: null };

/** @type {Map<string, { type: string, tileId: string, techId: string|null }>} */
const byKey = new Map();
let currentKey = "local";

function read(key) {
  return byKey.get(key) || { ...OPEN };
}

/**
 * Workshop and the friends panel share an action when they share a session id.
 * @param {string} key
 */
export function bindVisionActionKey(key) {
  currentKey = String(key || "local").slice(0, 120) || "local";
}

export function resetVisionAction() {
  byKey.set(currentKey, { ...OPEN });
}

/**
 * @param {{ type?: string, tileId?: string, techId?: string|null }} next
 */
export function noteVisionAction(next) {
  const type = String(next?.type || "open").slice(0, 40);
  const tileId = String(next?.tileId || "").slice(0, 80);
  const techId = next?.techId ? String(next.techId).slice(0, 80) : null;
  byKey.set(currentKey, { type, tileId, techId });
}

export function visionAction() {
  const action = read(currentKey);
  return { type: action.type, tileId: action.tileId, techId: action.techId };
}

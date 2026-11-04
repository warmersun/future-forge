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
 * Grok Voice roster for the co-inventor call.
 * Speech-to-speech built-ins. Ids are case-insensitive on the wire.
 */

export const VOICE_DEFAULT_ID = "eve";

export const VOICE_CHOICES = [
  { id: "eve", label: "Eve" },
  { id: "ara", label: "Ara" },
  { id: "rex", label: "Rex" },
  { id: "sal", label: "Sal" },
  { id: "leo", label: "Leo" },
];

/**
 * @param {unknown} raw
 * @returns {string} a known id, or "" when missing or not in the roster
 */
export function knownVoiceId(raw) {
  const id = String(raw ?? "").trim().toLowerCase();
  if (!id) return "";
  return VOICE_CHOICES.some((v) => v.id === id) ? id : "";
}

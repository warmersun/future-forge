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
 * E3 cloud pins. Max 3. No huge vision blobs.
 */

import { sanitizeQuestId } from "./cloud-save.mjs";

export const MAX_CLOUD_PINS = 3;
const SNAP_MAX = 8_000;

/**
 * @param {unknown} raw
 */
export function sanitizePin(raw) {
  if (!raw || typeof raw !== "object") return null;
  const missionId = sanitizeQuestId(raw.missionId || raw.mission_id);
  const globalId = sanitizeQuestId(raw.globalId || raw.global_id) || "theme";
  if (!missionId) return null;
  let snap = null;
  if (raw.missionSnapshot && typeof raw.missionSnapshot === "object") {
    const s = JSON.stringify(raw.missionSnapshot);
    if (s.length <= SNAP_MAX) snap = raw.missionSnapshot;
  }
  return {
    missionId,
    globalId,
    title: String(raw.title || "Pinned").slice(0, 100),
    place: String(raw.place || "").slice(0, 80),
    globalTitle: String(raw.globalTitle || raw.global_title || "").slice(0, 80),
    pinnedAt: Number(raw.pinnedAt || raw.pinned_at) || Date.now(),
    missionSnapshot: snap,
  };
}

/**
 * @param {unknown} raw
 */
export function sanitizePinList(raw) {
  const arr = Array.isArray(raw) ? raw : raw?.pins;
  if (!Array.isArray(arr)) return [];
  const out = [];
  const seen = new Set();
  for (const item of arr) {
    if (out.length >= MAX_CLOUD_PINS) break;
    const p = sanitizePin(item);
    if (!p || seen.has(p.missionId)) continue;
    seen.add(p.missionId);
    out.push(p);
  }
  return out;
}

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
 * Browser-safe: which quests get a leaderboard.
 * Theme shuffle / Surprise ids are gen-… — not the same job for everyone.
 */

export function questHasLeaderboard(questId) {
  const s = String(questId || "").trim();
  if (!s || s.length > 120) return false;
  if (s.startsWith("gen-")) return false;
  return /^[A-Za-z0-9._:-]+$/.test(s);
}

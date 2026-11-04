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
 * xAI realtime errors that must not kill a live call.
 * Server VAD already barges in; a cancel with no in-flight response is normal.
 * @param {unknown} err
 */
export function isRecoverableVoiceError(err) {
  const s = String(err?.message || err || "").toLowerCase();
  if (!s) return false;
  return (
    s.includes("no active response") ||
    s.includes("cancellation failed") ||
    s.includes("already cancelled") ||
    s.includes("response was cancelled") ||
    s.includes("nothing to cancel")
  );
}

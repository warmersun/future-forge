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
 * One open layer at a time. Claiming a non-modal overlay asks the tech modal to close.
 * @param {string} kind
 */
export function claimOverlay(kind) {
  if (typeof document === "undefined") return;
  document.dispatchEvent(
    new CustomEvent("ff-overlay-claim", { detail: { kind: String(kind || "") } })
  );
}

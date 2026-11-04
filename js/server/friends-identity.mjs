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
 * E4 Friends: typed name wins; chosen profile name fills in when the form is empty.
 * Never uses Clerk first/last name.
 */

export function clerkRoomDisplayName(opts = {}) {
  const typed = String(opts.displayName || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 24);
  if (typed && !typed.includes("@")) return typed;
  const profile = String(opts.profileDisplayName || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 24);
  if (profile && !profile.includes("@")) return profile;
  return opts.fallback || "Player";
}

export function stampRoomPlayer(player, ident) {
  const p = player && typeof player === "object" ? { ...player } : {};
  const userId = ident?.signedIn ? ident.userId : null;
  if (userId) p.clerkUserId = userId;
  else delete p.clerkUserId;
  return p;
}

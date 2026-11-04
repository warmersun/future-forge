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

// Same specifier as game.js (`./auth.js`) — a ?v= here would be a second module
// and title CTAs would never see the session JWT.
void import("./auth.js")
  .then((m) => m.initAuth())
  .catch((e) => console.warn("[clerk]", e?.message || e));
void import("./game.js?v=rating-4")
  .then((m) => m.init())
  .catch((e) => console.error("[game]", e?.message || e));

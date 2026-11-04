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

import { createHash, timingSafeEqual } from "node:crypto";

const expectedKey = process.env.PORTAL_SMOKE_API_KEY;

function matchesKey(supplied: string | null): boolean {
  if (!expectedKey || !supplied) return false;
  const expected = createHash("sha256").update(expectedKey).digest();
  const actual = createHash("sha256").update(supplied).digest();
  return timingSafeEqual(expected, actual);
}

export default {
  fetch(request: Request): Response {
    if (request.method !== "GET") {
      return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
    }
    if (!matchesKey(request.headers.get("x-api-key"))) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    return Response.json({ ok: true, message: "Authenticated by Neon Function" });
  },
};

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

import { test } from "node:test";
import assert from "node:assert/strict";
import { isPortalApiPath } from "./portal-api-paths.mjs";

test("portal answers the quest catalog and single tiles", () => {
  assert.equal(isPortalApiPath("/api/quests"), true);
  assert.equal(isPortalApiPath("/api/quests/spotlight-space-farcall-ferry-2026"), true);
});

test("portal keeps its existing API paths", () => {
  for (const p of ["/api/health", "/api/me", "/api/me/quests/x/score", "/api/u/abc", "/api/webhooks/clerk", "/api/report", "/api/board/x", "/api/device/start", "/api/internal/ai/reserve"]) {
    assert.equal(isPortalApiPath(p), true, p);
  }
});

test("portal still rejects other API paths", () => {
  for (const p of ["/api/questsx", "/api/rooms", "/api/predictions", "/api/internal/other", "", "/"]) {
    assert.equal(isPortalApiPath(p), false, p);
  }
});

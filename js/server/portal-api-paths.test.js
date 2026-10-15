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

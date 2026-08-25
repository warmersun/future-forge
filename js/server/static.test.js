import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  normalizePublicRel,
  isPublicRel,
  safePublicPath,
} from "./static.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("static allowlist", () => {
  it("serves index and public trees", () => {
    assert.equal(normalizePublicRel("/"), "index.html");
    assert.equal(normalizePublicRel("/index.html"), "index.html");
    assert.equal(isPublicRel("index.html"), true);
    assert.equal(isPublicRel("css/styles.css"), true);
    assert.equal(isPublicRel("js/main.js"), true);
    assert.equal(isPublicRel("js/game.js"), true);
    assert.equal(isPublicRel("js/auth.js"), true);
    assert.equal(isPublicRel("js/server/clerk-auth.mjs"), false);
    assert.equal(isPublicRel("js/multiplayer/ui.js"), true);
    assert.equal(isPublicRel("assets/problems/x.jpg"), true);
  });

  it("blocks secrets and server source", () => {
    assert.equal(isPublicRel(".env"), false);
    assert.equal(normalizePublicRel("/.env"), null);
    assert.equal(isPublicRel("server.mjs"), false);
    assert.equal(isPublicRel("package.json"), false);
    assert.equal(isPublicRel("package-lock.json"), false);
    assert.equal(isPublicRel("data/usage/summary.json"), false);
    assert.equal(isPublicRel("node_modules/ws/package.json"), false);
    assert.equal(isPublicRel("scripts/author-quest.mjs"), false);
    assert.equal(isPublicRel("js/rooms/room-manager.mjs"), false);
    assert.equal(isPublicRel("js/usage-metrics.mjs"), false);
    assert.equal(isPublicRel("js/server/static.mjs"), false);
    assert.equal(isPublicRel("js/meta.test.js"), false);
  });

  it("blocks path traversal and resolves under root only", () => {
    assert.equal(normalizePublicRel("/js/../../.env"), null);
    assert.equal(normalizePublicRel("/../.env"), null);
    assert.equal(safePublicPath(ROOT, "/.env"), null);
    assert.equal(safePublicPath(ROOT, "/server.mjs"), null);
    assert.equal(safePublicPath(ROOT, "/data/usage/summary.json"), null);
    const index = safePublicPath(ROOT, "/index.html");
    assert.ok(index);
    assert.ok(index.endsWith(`${path.sep}index.html`));
    const game = safePublicPath(ROOT, "/js/game.js");
    assert.ok(game && game.includes(`${path.sep}js${path.sep}game.js`));
  });
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseGhostQuery, ghostResult, ghostSharePath } from "./ghost.mjs";
import { officialPeriodUrl } from "./daily.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

/**
 * Static import specifiers in a shipped module (relative + bare).
 * @param {string} file
 * @returns {string[]}
 */
function importSpecifiers(file) {
  const text = fs.readFileSync(file, "utf8");
  const specs = [];
  const re =
    /(?:^|\n)\s*(?:import\s+(?:[^'"\n]+from\s+)?|export\s+\{[^}]*\}\s*from\s+)["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(text))) specs.push(m[1]);
  return specs;
}

/**
 * Walk relative imports from entry files. Fail if any file pulls node: builtins.
 * @param {string[]} entries
 */
function assertBrowserSafeGraph(entries) {
  const seen = new Set();
  const queue = entries.map((e) => path.resolve(HERE, e));
  const nodeImports = [];
  while (queue.length) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    if (!fs.existsSync(file)) {
      throw new Error(`missing module ${file}`);
    }
    for (const spec of importSpecifiers(file)) {
      if (spec.startsWith("node:")) {
        nodeImports.push(`${path.relative(HERE, file)} -> ${spec}`);
        continue;
      }
      if (spec.startsWith("http://") || spec.startsWith("https://")) continue;
      if (!spec.startsWith(".")) continue;
      const next = path.resolve(path.dirname(file), spec);
      const resolved = fs.existsSync(next) ? next : next;
      queue.push(resolved);
    }
  }
  assert.equal(
    nodeImports.length,
    0,
    `client graph pulled Node builtins:\n${nodeImports.join("\n")}`
  );
  assert.ok(seen.size >= entries.length);
}

describe("parseGhostQuery", () => {
  it("reads daily + beat user + year", () => {
    const g = parseGhostQuery(new URLSearchParams("daily=2026-08-25&beat=user_abc&year=2034"));
    assert.equal(g.daily, "2026-08-25");
    assert.equal(g.beat, "user_abc");
    assert.equal(g.year, 2034);
  });

  it("ghost date is the official Daily URL playTodayDaily fetches", () => {
    const g = parseGhostQuery(new URLSearchParams("daily=2026-08-20&beat=user_abc&year=2034"));
    assert.equal(officialPeriodUrl("daily", g), "/api/daily?date=2026-08-20");
    assert.notEqual(officialPeriodUrl("daily", g), "/api/daily");
  });

  it("ghost.mjs graph is browser-safe (no clerk-auth / node:async_hooks)", () => {
    const src = fs.readFileSync(path.join(HERE, "ghost.mjs"), "utf8");
    assert.equal(src.includes("clerk-auth.mjs"), false);
    assert.equal(src.includes("node:async_hooks"), false);
    assertBrowserSafeGraph(["ghost.mjs", "daily.mjs", "run-state.mjs"]);
  });
});

describe("ghostResult", () => {
  it("earlier hold year beats the ghost", () => {
    assert.equal(ghostResult({ yearReached: 2030 }, 2034).beat, true);
    assert.equal(ghostResult({ yearReached: 2040 }, 2034).beat, false);
  });
});

describe("ghostSharePath", () => {
  it("builds a query string", () => {
    assert.equal(
      ghostSharePath({ daily: "2026-08-25", beat: "user_1", year: 2034 }),
      "/?daily=2026-08-25&beat=user_1&year=2034"
    );
  });
});

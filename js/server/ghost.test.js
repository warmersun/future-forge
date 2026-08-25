import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseGhostQuery, ghostResult, ghostSharePath } from "./ghost.mjs";
import { officialPeriodUrl } from "./daily.mjs";

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

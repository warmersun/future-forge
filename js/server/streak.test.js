import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { dailyStreak } from "./streak.mjs";

describe("dailyStreak", () => {
  it("counts consecutive UTC days ending today", () => {
    assert.equal(dailyStreak(["2026-08-23", "2026-08-24", "2026-08-25"], "2026-08-25"), 3);
  });
  it("breaks on a missing day", () => {
    assert.equal(dailyStreak(["2026-08-23", "2026-08-25"], "2026-08-25"), 1);
  });
  it("ignores weekly period keys", () => {
    assert.equal(dailyStreak(["2026-W35", "2026-08-25"], "2026-08-25"), 1);
  });
  it("zero if today is missing", () => {
    assert.equal(dailyStreak(["2026-08-24"], "2026-08-25"), 0);
  });
});

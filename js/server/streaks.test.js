import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeStreak, localDateKey, sanitizeTimeZone, shiftDateKey } from "./streaks.mjs";

describe("sanitizeTimeZone", () => {
  it("keeps a real IANA zone and drops junk", () => {
    assert.equal(sanitizeTimeZone("America/Los_Angeles"), "America/Los_Angeles");
    assert.equal(sanitizeTimeZone("  UTC "), "UTC");
    assert.equal(sanitizeTimeZone("Not/AZone"), null);
    assert.equal(sanitizeTimeZone("America/Los_Angeles; DROP"), null);
    assert.equal(sanitizeTimeZone(""), null);
  });
});

describe("shiftDateKey", () => {
  it("walks civil dates across a month boundary", () => {
    assert.equal(shiftDateKey("2026-10-01", -1), "2026-09-30");
    assert.equal(shiftDateKey("2026-12-31", 1), "2027-01-01");
  });
});

describe("computeStreak", () => {
  const now = new Date("2026-10-10T15:00:00.000Z");

  it("counts a hold day once when two pathways end the same day", () => {
    const streak = computeStreak(
      ["2026-10-10T01:00:00.000Z", "2026-10-10T12:00:00.000Z"],
      "UTC",
      now
    );
    assert.equal(streak.current, 1);
    assert.equal(streak.best, 1);
    assert.equal(streak.today, true);
    assert.equal(streak.days.filter(Boolean).length, 1);
    assert.equal(streak.days.length, 7);
    assert.equal(streak.days[6], true);
  });

  it("keeps yesterday's run alive until local midnight", () => {
    const streak = computeStreak(["2026-10-09T18:00:00.000Z", "2026-10-08T18:00:00.000Z"], "UTC", now);
    assert.equal(streak.today, false);
    assert.equal(streak.current, 2);
    assert.equal(streak.best, 2);
  });

  it("breaks on a gap and still records the longer best", () => {
    const streak = computeStreak(
      [
        "2026-10-01T12:00:00.000Z",
        "2026-10-02T12:00:00.000Z",
        "2026-10-04T12:00:00.000Z",
      ],
      "UTC",
      new Date("2026-10-04T20:00:00.000Z")
    );
    assert.equal(streak.current, 1);
    assert.equal(streak.best, 2);
    assert.equal(streak.today, true);
  });

  it("buckets the same instant on a different local date", () => {
    const early = new Date("2026-10-10T02:00:00.000Z");
    const ended = ["2026-10-09T20:00:00.000Z", "2026-10-08T20:00:00.000Z"];
    const utc = computeStreak(ended, "UTC", early);
    const pt = computeStreak(ended, "America/Los_Angeles", early);
    assert.equal(localDateKey(early, "UTC"), "2026-10-10");
    assert.equal(localDateKey(early, "America/Los_Angeles"), "2026-10-09");
    assert.equal(utc.today, false);
    assert.equal(utc.current, 2);
    assert.equal(pt.today, true);
    assert.equal(pt.current, 2);
    assert.equal(pt.timeZone, "America/Los_Angeles");
  });

  it("is empty when nothing has been held", () => {
    const streak = computeStreak([], "UTC", now);
    assert.deepEqual(streak.days, [false, false, false, false, false, false, false]);
    assert.equal(streak.current, 0);
    assert.equal(streak.best, 0);
    assert.equal(streak.today, false);
  });

  it("falls back to UTC for a bad zone", () => {
    const streak = computeStreak(["2026-10-10T12:00:00.000Z"], "Not/AZone", now);
    assert.equal(streak.timeZone, "UTC");
    assert.equal(streak.current, 1);
  });
});

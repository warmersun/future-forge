import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  utcDayString,
  parseDailyDate,
  isoWeekPeriod,
  parseWeekPeriod,
  pickFromPool,
  dailyPoolFromTiles,
  isPlausibleYear,
  isBetterScore,
  sanitizeDisplayName,
  parseDailySubmit,
  rankBoard,
  WEEK_SALT,
} from "./daily.mjs";

describe("utc / parseDailyDate", () => {
  it("formats UTC YYYY-MM-DD", () => {
    assert.equal(utcDayString(new Date("2026-08-25T23:30:00Z")), "2026-08-25");
    assert.equal(parseDailyDate("2026-01-02"), "2026-01-02");
    assert.equal(parseDailyDate("nope", new Date("2026-08-25T00:00:00Z")), "2026-08-25");
  });
});

describe("isoWeekPeriod", () => {
  it("formats ISO week keys", () => {
    assert.equal(isoWeekPeriod(new Date("2026-08-25T12:00:00Z")), "2026-W35");
    assert.equal(parseWeekPeriod("2026-w34"), "2026-W34");
    assert.equal(parseWeekPeriod("", new Date("2026-08-25T00:00:00Z")), "2026-W35");
  });
  it("weekly pick differs from daily salt on the same pool", () => {
    const pool = ["a", "b", "c", "d", "e", "f", "g"];
    const day = pickFromPool(pool, "2026-08-25");
    const week = pickFromPool(pool, "2026-W35", WEEK_SALT);
    assert.ok(pool.includes(week));
    assert.equal(pickFromPool(pool, "2026-W35", WEEK_SALT), week);
    assert.notEqual(week, pickFromPool(pool, "2026-W35"));
  });
});

describe("dailyPoolFromTiles", () => {
  it("drops learning modules and keeps authored tiles", () => {
    const pool = dailyPoolFromTiles([
      { id: "open-1" },
      { id: "lesson-1", isLearningModule: true },
      { id: "open-2", mission: { isLearningModule: false } },
    ]);
    assert.deepEqual(
      pool.map((t) => t.id),
      ["open-1", "open-2"]
    );
  });
});

describe("pickFromPool", () => {
  it("is deterministic for a period", () => {
    const pool = ["a", "b", "c", "d"];
    const x = pickFromPool(pool, "2026-08-25");
    const y = pickFromPool(pool, "2026-08-25");
    assert.equal(x, y);
    assert.ok(pool.includes(x));
  });
  it("empty pool is null", () => {
    assert.equal(pickFromPool([], "2026-08-25"), null);
  });
});

describe("score / board", () => {
  it("earlier year beats later, then stars, then waits", () => {
    assert.equal(isBetterScore({ yearReached: 2030, stars: 1, waits: 9 }, { yearReached: 2034, stars: 5, waits: 0 }), true);
    assert.equal(isBetterScore({ yearReached: 2030, stars: 3, waits: 2 }, { yearReached: 2030, stars: 2, waits: 0 }), true);
    assert.equal(isBetterScore({ yearReached: 2030, stars: 3, waits: 1 }, { yearReached: 2030, stars: 3, waits: 4 }), true);
    assert.equal(isBetterScore({ yearReached: 2030, stars: 3, waits: 1 }, { yearReached: 2030, stars: 3, waits: 1 }), false);
  });

  it("rankBoard returns top N and your row", () => {
    const rows = [
      { clerkUserId: "user_slow", yearReached: 2040, stars: 5, waits: 0, displayName: "Slow" },
      { clerkUserId: "user_me", yearReached: 2031, stars: 2, waits: 1, displayName: "Me" },
      { clerkUserId: "user_ace", yearReached: 2028, stars: 1, waits: 3, displayName: "Ace" },
    ];
    const b = rankBoard(rows, { userId: "user_me", limit: 10 });
    assert.equal(b.top[0].displayName, "Ace");
    assert.equal(b.you.rank, 2);
    assert.equal(b.you.displayName, "Me");
  });
});

describe("parseDailySubmit", () => {
  const expected = { expectedQuestId: "q-today", period: "2026-08-25" };
  const runId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

  it("requires matching quest, plausible year, run id", () => {
    assert.equal(parseDailySubmit({ questId: "other", yearReached: 2030, runId }, expected).error, "wrong_daily");
    assert.equal(
      parseDailySubmit({ questId: "q-today", yearReached: 1999, runId }, expected).error,
      "impossible_year"
    );
    assert.equal(
      parseDailySubmit({ questId: "q-today", yearReached: 2030 }, expected).error,
      "run_required"
    );
    const ok = parseDailySubmit(
      { questId: "q-today", yearReached: 2034, stars: 3, waits: 2, runId, displayName: "Tamas" },
      expected
    );
    assert.equal(ok.ok, true);
    assert.equal(ok.row.displayName, "Tamas");
    assert.equal(ok.row.yearReached, 2034);
  });

  it("strips email-like display names", () => {
    assert.equal(sanitizeDisplayName("a@b.com"), "Inventor");
    assert.equal(sanitizeDisplayName("Tamas S."), "Tamas S.");
  });
});

describe("isPlausibleYear", () => {
  it("rejects junk", () => {
    assert.equal(isPlausibleYear(2030), true);
    assert.equal(isPlausibleYear(1800), false);
    assert.equal(isPlausibleYear("nope"), false);
  });
});

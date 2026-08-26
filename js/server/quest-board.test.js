import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  questHasLeaderboard,
  clipPathwayText,
  sanitizeStack,
  parseQuestScoreBody,
  bindQuestScoreFromRun,
  attachBoardExtras,
  rankBoard,
  rankPlayers,
  isBetterScore,
  boardScore,
  yearsTaken,
  BOARD_LIMIT,
  sanitizeDisplayName,
  isPlausibleYear,
  PATHWAY_TEXT_MAX,
  STILL_TOP_K,
} from "./quest-board.mjs";

describe("questHasLeaderboard", () => {
  it("rejects theme shuffle ids and junk", () => {
    assert.equal(questHasLeaderboard("gen-climate-ab12cd"), false);
    assert.equal(questHasLeaderboard(""), false);
    assert.equal(questHasLeaderboard("not a id"), false);
  });
  it("keeps catalog tiles", () => {
    assert.equal(questHasLeaderboard("lesson-gene-1"), true);
    assert.equal(questHasLeaderboard("spotlight.acme"), true);
  });
});

describe("parse + bind quest score", () => {
  const runId = "11111111-1111-4111-8111-111111111111";
  it("requires a board-eligible quest and run", () => {
    assert.equal(parseQuestScoreBody({}, "gen-x-1").ok, false);
    assert.equal(parseQuestScoreBody({ runId }, "lesson-1").ok, true);
    assert.equal(parseQuestScoreBody({ runId, questId: "other" }, "lesson-1").error, "wrong_quest");
  });
  it("ignores a client-supplied display name", () => {
    const parsed = parseQuestScoreBody(
      { runId, displayName: "Legal Name From Clerk", questId: "lesson-1" },
      "lesson-1"
    );
    assert.equal(parsed.ok, true);
    assert.equal("displayName" in parsed.row, false);
  });
  it("copies year/stars/waits from the owned run", () => {
    const parsed = parseQuestScoreBody(
      {
        runId,
        pathwayText: "Quay\n\nPump (AI)\nMoves water.",
        stack: ["ai"],
        place: "Quay",
        yearReached: 1999,
        stars: 5,
      },
      "lesson-1"
    );
    const bound = bindQuestScoreFromRun(
      parsed,
      {
        quest_id: "lesson-1",
        outcome: "hold",
        year_reached: 2031,
        stars: 2,
        waits: 4,
        place: "Quay",
      },
      { startYear: 2026 }
    );
    assert.equal(bound.ok, true);
    assert.equal(bound.row.yearReached, 2031);
    assert.equal(bound.row.startYear, 2026);
    assert.equal(bound.row.stars, 2);
    assert.equal(bound.row.waits, 4);
    assert.match(bound.row.pathwayText, /Moves water/);
  });
});

describe("clip + stack", () => {
  it("caps pathway text and stack", () => {
    assert.equal(clipPathwayText("  hi  "), "hi");
    assert.equal(clipPathwayText("x".repeat(PATHWAY_TEXT_MAX + 50)).length, PATHWAY_TEXT_MAX);
    assert.deepEqual(sanitizeStack(["ai", "ai", "bio", "nope id"]), ["ai", "bio"]);
  });
});

describe("attachBoardExtras", () => {
  it("marks stills and copies write-ups; top K is 3", () => {
    assert.equal(STILL_TOP_K, 3);
    const rows = [
      {
        clerkUserId: "user_a",
        displayName: "A",
        startYear: 2026,
        yearReached: 2028,
        stars: 3,
        waits: 1,
        pathwayText: "A how",
        place: "Here",
      },
      {
        clerkUserId: "user_b",
        displayName: "B",
        startYear: 2026,
        yearReached: 2030,
        stars: 2,
        waits: 2,
        pathwayText: "B how",
      },
    ];
    const ranked = rankBoard(rows, { userId: "user_b" });
    const board = attachBoardExtras(ranked, ["user_a"], rows);
    assert.equal(board.top[0].hasStill, true);
    assert.equal(board.top[0].pathwayText, "A how");
    assert.equal(board.top[1].hasStill, false);
    assert.equal(board.you.hasStill, false);
    assert.equal(board.you.pathwayText, "B how");
  });
});

describe("isBetterScore still drives replace", () => {
  const present = { startYear: 2026 };
  it("score is hold stars divided by years from present (same year = 1)", () => {
    assert.equal(yearsTaken({ ...present, yearReached: 2026 }), 1);
    assert.equal(yearsTaken({ ...present, yearReached: 2030 }), 4);
    assert.equal(boardScore({ ...present, yearReached: 2026, stars: 3 }), 3);
    assert.equal(boardScore({ ...present, yearReached: 2030, stars: 3 }), 0.75);
  });
  it("multiplies hold by inverse years; waits only break ties", () => {
    // 3★ in 4 years (0.75) loses to 1★ same-year (1)
    assert.equal(
      isBetterScore(
        { ...present, yearReached: 2026, stars: 1, waits: 9 },
        { ...present, yearReached: 2030, stars: 3, waits: 0 }
      ),
      true
    );
    // 3★ in 2 years beats 3★ in 4 years
    assert.equal(
      isBetterScore(
        { ...present, yearReached: 2028, stars: 3, waits: 4 },
        { ...present, yearReached: 2030, stars: 3, waits: 0 }
      ),
      true
    );
    // same product, fewer waits wins
    assert.equal(
      isBetterScore(
        { ...present, yearReached: 2028, stars: 3, waits: 1 },
        { ...present, yearReached: 2028, stars: 3, waits: 4 }
      ),
      true
    );
    // equal product and waits: first stays
    assert.equal(
      isBetterScore(
        { ...present, yearReached: 2028, stars: 3, waits: 1 },
        { ...present, yearReached: 2028, stars: 3, waits: 1 }
      ),
      false
    );
  });
  it("rankBoard returns top N and your row", () => {
    const rows = [
      { clerkUserId: "user_slow", startYear: 2026, yearReached: 2040, stars: 3, waits: 0, displayName: "Slow" },
      { clerkUserId: "user_me", startYear: 2026, yearReached: 2028, stars: 3, waits: 1, displayName: "Me" },
      { clerkUserId: "user_ace", startYear: 2026, yearReached: 2026, stars: 1, waits: 3, displayName: "Ace" },
    ];
    const b = rankBoard(rows, { userId: "user_me", limit: 10 });
    // Me: 3/2 = 1.5, Ace: 1/1 = 1, Slow: 3/14 ≈ 0.21
    assert.equal(b.top[0].displayName, "Me");
    assert.equal(b.you.rank, 1);
    assert.equal(b.you.displayName, "Me");
    assert.equal(b.top[1].displayName, "Ace");
  });
  it("rankPlayers sums per-quest scores and keeps top 10 inventors", () => {
    const present = { startYear: 2026 };
    const rows = [
      { clerkUserId: "user_a", displayName: "Ann", ...present, yearReached: 2026, stars: 3, waits: 1, questId: "q1" },
      { clerkUserId: "user_a", displayName: "Ann", ...present, yearReached: 2028, stars: 3, waits: 2, questId: "q2" },
      { clerkUserId: "user_b", displayName: "Bo", ...present, yearReached: 2026, stars: 3, waits: 0, questId: "q1" },
    ];
    const b = rankPlayers(rows, { userId: "user_b" });
    // Ann: 3 + 1.5 = 4.5; Bo: 3
    assert.equal(b.kind, "players");
    assert.equal(b.top[0].displayName, "Ann");
    assert.equal(b.top[0].quests, 2);
    assert.equal(b.top[0].score, 4.5);
    assert.equal(b.you.displayName, "Bo");
    assert.equal(b.you.rank, 2);
  });
  it("caps the public board at 10", () => {
    assert.equal(BOARD_LIMIT, 10);
    const rows = Array.from({ length: 15 }, (_, i) => ({
      clerkUserId: `user_${i}`,
      startYear: 2026,
      yearReached: 2026,
      stars: 3,
      waits: i,
      displayName: `P${i}`,
    }));
    const b = rankBoard(rows);
    assert.equal(b.top.length, 10);
    assert.equal(b.top[0].displayName, "P0");
  });
  it("omits unnamed rows from the public top but keeps you", () => {
    const rows = [
      {
        clerkUserId: "user_ghost",
        startYear: 2026,
        yearReached: 2026,
        stars: 3,
        waits: 0,
        hasDisplayName: false,
      },
      {
        clerkUserId: "user_named",
        startYear: 2026,
        yearReached: 2028,
        stars: 3,
        waits: 1,
        displayName: "Ada",
        hasDisplayName: true,
      },
    ];
    const b = rankBoard(rows, { userId: "user_ghost" });
    assert.equal(b.top.length, 1);
    assert.equal(b.top[0].displayName, "Ada");
    assert.equal(b.you.needsDisplayName, true);
    assert.equal(b.you.clerkUserId, "user_ghost");
    const namedYou = rankBoard(rows, { userId: "user_named" });
    assert.equal(namedYou.you.rank, 1);
    assert.equal(namedYou.you.needsDisplayName, undefined);
  });
  it("strips email-like display names and junk years", () => {
    assert.equal(sanitizeDisplayName("a@b.com"), "Inventor");
    assert.equal(sanitizeDisplayName("Tamas S."), "Tamas S.");
    assert.equal(isPlausibleYear(2030), true);
    assert.equal(isPlausibleYear(1800), false);
  });
});

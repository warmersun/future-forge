import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { rankBoard, isBetterScore } from "./daily.mjs";
import {
  questHasLeaderboard,
  clipPathwayText,
  sanitizeStack,
  parseQuestScoreBody,
  bindQuestScoreFromRun,
  attachBoardExtras,
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
    const bound = bindQuestScoreFromRun(parsed, {
      quest_id: "lesson-1",
      outcome: "hold",
      year_reached: 2031,
      stars: 2,
      waits: 4,
      place: "Quay",
    });
    assert.equal(bound.ok, true);
    assert.equal(bound.row.yearReached, 2031);
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
      { clerkUserId: "user_a", yearReached: 2028, stars: 3, waits: 1, pathwayText: "A how", place: "Here" },
      { clerkUserId: "user_b", yearReached: 2030, stars: 2, waits: 2, pathwayText: "B how" },
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
  it("earlier year wins", () => {
    assert.equal(isBetterScore({ yearReached: 2028, stars: 1, waits: 9 }, { yearReached: 2030, stars: 5, waits: 0 }), true);
  });
});

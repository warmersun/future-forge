import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseRunStateBody, applyContinueSnapshot, RUN_STATE_MAX_BYTES } from "./run-state.mjs";

describe("parseRunStateBody", () => {
  it("requires questId and strips data-URL art", () => {
    assert.equal(parseRunStateBody({}).ok, false);
    const parsed = parseRunStateBody({
      questId: "q1",
      year: 2030,
      tutor: true,
      board: {
        tiles: {
          a: { id: "a", artUrl: "data:image/png;base64,AAAA", artId: "art-1" },
        },
      },
    });
    assert.equal(parsed.ok, true);
    assert.equal(parsed.state.board.tiles.a.artUrl, null);
    assert.equal(parsed.state.board.tiles.a.artId, "art-1");
  });

  it("rejects oversized blobs", () => {
    const board = { tiles: { a: { id: "a", fluff: "x".repeat(RUN_STATE_MAX_BYTES) } } };
    assert.equal(parseRunStateBody({ questId: "q1", board }).ok, false);
  });

  it("keeps invent panel and chat lanes, drops data: chat", () => {
    const parsed = parseRunStateBody({
      questId: "q1",
      play: {
        inventionHow: "A dock that cools the street.",
        selectedTechIds: ["iot", "iot", "bad id!"],
        sideTab: "coinventor",
        tutorSessionActive: true,
        ap: 2,
      },
      chats: {
        tutor: [{ role: "user", content: "hello" }],
        coinventor: [{ role: "assistant", content: "data:image/png;base64,xx" }],
        activeHistoryKey: "tutor",
      },
    });
    assert.equal(parsed.ok, true);
    assert.equal(parsed.state.play.inventionHow.includes("dock"), true);
    assert.deepEqual(parsed.state.play.selectedTechIds, ["iot"]);
    assert.equal(parsed.state.play.sideTab, "coinventor");
    assert.equal(parsed.state.chats.tutor.length, 1);
    assert.equal(parsed.state.chats.coinventor.length, 0);
  });
});

describe("applyContinueSnapshot", () => {
  const live = {
    cloudRunId: null,
    hexBoard: { tiles: { fresh: { id: "fresh", kind: "crisis" } } },
    year: 2026,
    tutorSessionActive: false,
  };

  it("restores runId, board, and year and skips seed plus new run", () => {
    const saved = {
      runId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      board: { tiles: { saved: { id: "saved", kind: "invention" } } },
      year: 2034,
      tutor: true,
    };
    const next = applyContinueSnapshot(live, saved);
    assert.equal(next.cloudRunId, saved.runId);
    assert.equal(next.hexBoard.tiles.saved.kind, "invention");
    assert.equal(next.hexBoard.tiles.fresh, undefined);
    assert.equal(next.year, 2034);
    assert.equal(next.tutorSessionActive, true);
    assert.equal(next.skipSeed, true);
    assert.equal(next.skipNewRun, true);
  });

  it("without a board still keeps the existing run and reseeds", () => {
    const next = applyContinueSnapshot(live, { runId: "run_1", year: 2028 });
    assert.equal(next.cloudRunId, "run_1");
    assert.equal(next.skipSeed, false);
    assert.equal(next.skipNewRun, true);
    assert.equal(next.hexBoard.tiles.fresh.kind, "crisis");
  });

  it("passes play and chats through", () => {
    const next = applyContinueSnapshot(live, {
      runId: "r1",
      play: { inventionHow: "kept" },
      chats: { tutor: [], coinventor: [{ role: "user", content: "hi" }] },
    });
    assert.equal(next.play.inventionHow, "kept");
    assert.equal(next.chats.coinventor[0].content, "hi");
  });
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseRunStateBody, applyContinueSnapshot, sanitizeMissionStub, RUN_STATE_MAX_BYTES } from "./run-state.mjs";
import fs from "node:fs";

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

  it("keeps a theme mission stub on play.mission", () => {
    const parsed = parseRunStateBody({
      questId: "gen-air-abc123",
      play: {
        mission: {
          id: "gen-air-abc123",
          globalId: "air",
          title: "North Stack",
          place: "Cedar Bend",
          scene: "A mill town.",
          startYear: 2026,
          collapseYear: 2034,
        },
      },
    });
    assert.equal(parsed.ok, true);
    assert.equal(parsed.state.play.mission.id, "gen-air-abc123");
    assert.equal(parsed.state.play.mission.place, "Cedar Bend");
  });

  it("keeps a companion, a pinned bank, and a private reflection", () => {
    const tile = JSON.parse(
      fs.readFileSync(new URL("../../test/fixtures/quests/companion-moonshots-304.json", import.meta.url), "utf8")
    );
    const bank = JSON.parse(
      fs.readFileSync(new URL("../../test/fixtures/predictions/companion-dock-test.json", import.meta.url), "utf8")
    );
    const stub = sanitizeMissionStub({
      id: tile.id,
      access: "account",
      grounding: tile.grounding,
      companion: tile.companion,
    });
    assert.equal(stub.access, "account");
    assert.equal(stub.companion.claim, tile.companion.claim);
    assert.equal(stub.companion.exploration.premise.bankId, "companion-dock-test");
    assert.ok(stub.grounding.includes("fictional"));
    const parsed = parseRunStateBody({
      questId: tile.id,
      play: {
        mission: stub,
        predictionsBank: bank,
        reflection: "The power drop mattered.",
      },
    });
    assert.equal(parsed.ok, true);
    assert.equal(parsed.state.play.predictionsBank.id, "companion-dock-test");
    assert.equal(parsed.state.play.reflection, "The power drop mattered.");
    assert.equal(parsed.state.play.mission.companion.invitation, tile.companion.invitation);
  });

  it("rejects a predictions bank that is too large to pin", () => {
    const huge = {
      schema: "future-forge.predictions/v1",
      id: "too-big",
      title: "Too big",
      predictions: [
        {
          id: "row-1",
          year: 2026,
          kind: "milestone",
          headline: "x",
          detail: "y".repeat(120_000),
          claimBand: "now",
        },
      ],
    };
    const parsed = parseRunStateBody({
      questId: "q1",
      play: { predictionsBank: huge },
    });
    assert.equal(parsed.ok, false);
    assert.equal(parsed.error, "bank_too_large");
  });

  it("keeps idea sparks and R&D spark batches", () => {
    const parsed = parseRunStateBody({
      questId: "q1",
      play: {
        focusedTechId: "iot",
        ideas: {
          "q1|iot|2026|here": [
            { id: "dock", title: "Street dock", insertText: "A cooler on the curb." },
          ],
        },
        sparkBatches: {
          iot: { ids: ["inv-1", "inv-2"], titles: ["Street dock", "Shade sail"] },
        },
      },
    });
    assert.equal(parsed.ok, true);
    assert.equal(parsed.state.play.focusedTechId, "iot");
    assert.equal(parsed.state.play.ideas["q1|iot|2026|here"][0].title, "Street dock");
    assert.deepEqual(parsed.state.play.sparkBatches.iot.ids, ["inv-1", "inv-2"]);
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

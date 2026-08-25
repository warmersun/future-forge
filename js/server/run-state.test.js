import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseRunStateBody, RUN_STATE_MAX_BYTES } from "./run-state.mjs";

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
});

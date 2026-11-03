import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  announcementDelta,
  captureTurnIdentity,
  sameTurnOwner,
  shouldFollowScroll,
  terminalTurnView,
  UNFINISHED_STOP_NOTE,
  UNFINISHED_TIMEOUT_NOTE,
} from "./coinventor-turn.js";

describe("co-invent turn ownership", () => {
  it("locks a turn to run, seat, and lane", () => {
    const turn = captureTurnIdentity({
      requestId: "r1",
      runId: "run-a",
      seatId: "seat-1",
      lane: "tutor",
      mode: "chat",
    });
    assert.equal(sameTurnOwner(turn, { ...turn }), true);
    assert.equal(sameTurnOwner(turn, { ...turn, seatId: "seat-2" }), false);
    assert.equal(sameTurnOwner(turn, { ...turn, lane: "coinventor" }), false);
    assert.equal(sameTurnOwner(turn, { ...turn, runId: "run-b" }), false);
    assert.equal(sameTurnOwner(turn, { ...turn, requestId: "r2" }), false);
  });

  it("follows the thread only when the reader is near the bottom", () => {
    assert.equal(shouldFollowScroll(0), true);
    assert.equal(shouldFollowScroll(80), true);
    assert.equal(shouldFollowScroll(81), false);
  });

  it("announces completed sentences rather than every token", () => {
    assert.equal(announcementDelta("Hel", "Hello"), "");
    assert.equal(announcementDelta("Hello", "Hello there."), " there.");
    assert.equal(announcementDelta("Hello there.", "Hello there. Next"), "");
  });
});

describe("terminal turn view", () => {
  it("keeps a stopped preview and does not call it a timeout", () => {
    const stop = terminalTurnView({ aborted: true, stopReason: "stop", preview: "Half an answer" });
    assert.equal(stop.cancelled, true);
    assert.equal(stop.unfinishedNote, UNFINISHED_STOP_NOTE);
    assert.equal(stop.message, null);
    const empty = terminalTurnView({ aborted: true, stopReason: "lane", preview: "" });
    assert.equal(empty.unfinishedNote, null);
    assert.equal(empty.message, null);
  });

  it("labels a timeout without saying the learner stopped", () => {
    const preview = terminalTurnView({ aborted: true, stopReason: "timeout", preview: "Half" });
    assert.equal(preview.outcome, "timeout");
    assert.equal(preview.cancelled, true);
    assert.equal(preview.unfinishedNote, UNFINISHED_TIMEOUT_NOTE);
    assert.equal(preview.message, null);
    const bare = terminalTurnView({ aborted: true, stopReason: "timeout", preview: "" });
    assert.equal(bare.unfinishedNote, null);
    assert.match(bare.message, /timed out/i);
    assert.doesNotMatch(bare.message, /Stopped/);
  });

  it("shows a provider error instead of a stop note", () => {
    const snag = "The answer did not come back in a usable form. Try again.";
    const withPreview = terminalTurnView({
      aborted: false,
      preview: "Partial",
      errorMessage: snag,
    });
    assert.equal(withPreview.cancelled, false);
    assert.equal(withPreview.outcome, "error");
    assert.equal(withPreview.unfinishedNote, snag);
    assert.equal(withPreview.message, null);
    const bare = terminalTurnView({ aborted: false, preview: "", errorMessage: "" });
    assert.equal(bare.unfinishedNote, null);
    assert.match(bare.message, /snag/);
  });
});

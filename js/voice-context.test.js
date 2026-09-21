import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  voiceContextFingerprint,
  reduceVoiceTranscript,
  capVoiceHistory,
  emptyVoiceProposals,
} from "./voice-context.js";

const board = {
  year: 2032,
  place: "North Wharf",
  hexInvent: true,
  tutorMode: false,
  selectedTechIds: ["kelp"],
  availableTechs: [
    { id: "kelp", name: "Kelp" },
    { id: "iot", name: "IoT" },
  ],
  hexBoard: { pathways: [{ howText: "Baffles cut the wake." }] },
  pressure: { flood: 2, heat: 1 },
};

describe("voiceContextFingerprint", () => {
  it("is stable for the same board, including pressure key order", () => {
    const a = voiceContextFingerprint(board);
    const b = voiceContextFingerprint({
      ...board,
      pressure: { heat: 1, flood: 2 },
    });
    assert.equal(a, b);
  });

  it("changes when the stack or how-text changes", () => {
    const base = voiceContextFingerprint(board);
    const stack = voiceContextFingerprint({
      ...board,
      selectedTechIds: ["kelp", "iot"],
    });
    const how = voiceContextFingerprint({
      ...board,
      hexBoard: { pathways: [{ howText: "Baffles and sensors." }] },
    });
    assert.notEqual(base, stack);
    assert.notEqual(base, how);
  });

  it("changes when tiles move between pathways, not when the same ids stay put", () => {
    const placed = {
      ...board,
      hexBoard: {
        pathways: [
          { howText: "Baffles cut the wake.", inventionIds: ["a", "b"] },
          { howText: "", inventionIds: ["c"] },
        ],
      },
    };
    const base = voiceContextFingerprint(placed);
    const same = voiceContextFingerprint({
      ...placed,
      hexBoard: {
        pathways: [
          { howText: "Baffles cut the wake.", inventionIds: ["a", "b"] },
          { howText: "", inventionIds: ["c"] },
        ],
      },
    });
    const moved = voiceContextFingerprint({
      ...placed,
      hexBoard: {
        pathways: [
          { howText: "Baffles cut the wake.", inventionIds: ["a"] },
          { howText: "", inventionIds: ["b", "c"] },
        ],
      },
    });
    assert.equal(base, same);
    assert.notEqual(base, moved);
  });

  it("changes when the legacy invention name changes", () => {
    const legacy = { ...board, hexInvent: false, inventionName: "Kelp wall", inventionHow: "Baffles." };
    assert.notEqual(
      voiceContextFingerprint(legacy),
      voiceContextFingerprint({ ...legacy, inventionName: "Tide wall" })
    );
  });
});

describe("reduceVoiceTranscript", () => {
  it("attaches a proposal to the spoken bubble", () => {
    const spoken = reduceVoiceTranscript(
      { messages: [], captionIndex: null, pending: null },
      { type: "caption_final", text: "Try kelp baffles." }
    );
    assert.equal(spoken.messages.length, 1);
    const folded = reduceVoiceTranscript(spoken, {
      type: "proposals",
      message: "Suggested: Kelp",
      proposals: { ...emptyVoiceProposals(), addTechIds: ["kelp"] },
    });
    assert.equal(folded.messages.length, 1);
    assert.equal(folded.messages[0].content, "Try kelp baffles.");
    assert.deepEqual(folded.messages[0].proposals.addTechIds, ["kelp"]);
    assert.equal(folded.captionIndex, 0);
    const done = reduceVoiceTranscript(folded, { type: "turn_done" });
    assert.equal(done.messages.length, 1);
    assert.equal(done.captionIndex, null);
  });

  it("keeps both tool packets that arrive before the caption", () => {
    let state = { messages: [], captionIndex: null, pending: null };
    state = reduceVoiceTranscript(state, {
      type: "proposals",
      message: "Suggested: Kelp",
      proposals: { ...emptyVoiceProposals(), addTechIds: ["kelp"] },
    });
    state = reduceVoiceTranscript(state, {
      type: "proposals",
      message: "Baffles cut the wake.",
      proposals: { ...emptyVoiceProposals(), inventionHow: "Baffles cut the wake." },
    });
    assert.equal(state.messages.length, 0);
    assert.deepEqual(state.pending.proposals.addTechIds, ["kelp"]);
    assert.equal(state.pending.proposals.inventionHow, "Baffles cut the wake.");
    const spoken = reduceVoiceTranscript(state, {
      type: "caption_final",
      text: "Try kelp baffles.",
    });
    assert.equal(spoken.messages.length, 1);
    assert.deepEqual(spoken.messages[0].proposals.addTechIds, ["kelp"]);
    assert.equal(spoken.messages[0].proposals.inventionHow, "Baffles cut the wake.");
  });

  it("merges a later tool packet onto the spoken bubble", () => {
    let state = reduceVoiceTranscript(
      { messages: [], captionIndex: null, pending: null },
      { type: "caption_final", text: "Try kelp baffles." }
    );
    state = reduceVoiceTranscript(state, {
      type: "proposals",
      message: "Suggested: Kelp",
      proposals: { ...emptyVoiceProposals(), addTechIds: ["kelp"] },
    });
    state = reduceVoiceTranscript(state, {
      type: "proposals",
      message: "Baffles cut the wake.",
      proposals: { ...emptyVoiceProposals(), addTechIds: ["iot"], inventionHow: "Baffles cut the wake." },
    });
    assert.equal(state.messages.length, 1);
    assert.deepEqual(state.messages[0].proposals.addTechIds, ["kelp", "iot"]);
    assert.equal(state.messages[0].proposals.inventionHow, "Baffles cut the wake.");
    assert.equal(state.captionIndex, 0);
  });

  it("folds a proposal that arrives before the caption", () => {
    const held = reduceVoiceTranscript(
      { messages: [], captionIndex: null, pending: null },
      {
        type: "proposals",
        message: "Kelp baffles cut the wake.",
        proposals: { ...emptyVoiceProposals(), inventionHow: "Kelp baffles cut the wake." },
      }
    );
    assert.equal(held.messages.length, 0);
    assert.ok(held.pending);
    const spoken = reduceVoiceTranscript(held, {
      type: "caption_final",
      text: "Here is a how-it-works.",
    });
    assert.equal(spoken.messages.length, 1);
    assert.equal(spoken.messages[0].content, "Here is a how-it-works.");
    assert.equal(spoken.messages[0].proposals.inventionHow, "Kelp baffles cut the wake.");
  });

  it("does not add a bubble for end_tutoring alone", () => {
    const next = reduceVoiceTranscript(
      { messages: [], captionIndex: null, pending: null },
      { type: "proposals", message: "", proposals: null, endTutoring: true }
    );
    assert.equal(next.changed, false);
    assert.equal(next.messages.length, 0);
  });

  it("flushes a tool-only turn when the response ends", () => {
    const held = reduceVoiceTranscript(
      { messages: [], captionIndex: null, pending: null },
      {
        type: "proposals",
        message: "Suggested: IoT",
        proposals: { ...emptyVoiceProposals(), addTechIds: ["iot"] },
      }
    );
    const done = reduceVoiceTranscript(held, { type: "turn_done" });
    assert.equal(done.messages.length, 1);
    assert.equal(done.messages[0].content, "Suggested: IoT");
    assert.deepEqual(done.messages[0].proposals.addTechIds, ["iot"]);
  });
});

describe("capVoiceHistory", () => {
  it("keeps typed lines and the newest voice lines", () => {
    const messages = [{ role: "user", content: "typed", voice: false }];
    for (let i = 0; i < 30; i++) {
      messages.push({ role: i % 2 ? "assistant" : "user", content: `v${i}`, voice: true });
    }
    const capped = capVoiceHistory(messages, 24);
    assert.equal(capped[0].content, "typed");
    assert.equal(capped.length, 25);
    assert.equal(capped[1].content, "v6");
    assert.equal(capped.at(-1).content, "v29");
  });
});

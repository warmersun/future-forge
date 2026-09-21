import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  voiceContextFingerprint,
  reduceVoiceTranscript,
  beginAssistantSpeech,
  capVoiceHistory,
  commitUserVoiceCaption,
  emptyVoiceProposals,
  settleVoiceTurn,
  userTranscriptIsFinal,
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

  it("changes when guidance or the spotlight tech changes", () => {
    const base = voiceContextFingerprint(board);
    assert.notEqual(
      base,
      voiceContextFingerprint({ ...board, guidance: "Prefer the kelp baffles." })
    );
    assert.notEqual(
      base,
      voiceContextFingerprint({ ...board, spotlightTechId: "kelp" })
    );
    assert.notEqual(base, voiceContextFingerprint({ ...board, turn: 4 }));
    assert.notEqual(base, voiceContextFingerprint({ ...board, focusTechId: "iot" }));
    assert.notEqual(
      base,
      voiceContextFingerprint({ ...board, aiTutorContext: "Stay on one idea." })
    );
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
    assert.equal(done.captionIndex, 0);
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

describe("settleVoiceTurn", () => {
  it("folds a partial caption and a waiting proposal into one bubble", () => {
    const held = reduceVoiceTranscript(
      { messages: [], captionIndex: null, pending: null },
      {
        type: "proposals",
        message: "Baffles cut the wake.",
        proposals: { ...emptyVoiceProposals(), inventionHow: "Baffles cut the wake." },
      }
    );
    const settled = settleVoiceTurn({ ...held, asstCaption: "Try kelp baffles." });
    assert.equal(settled.messages.length, 1);
    assert.equal(settled.messages[0].content, "Try kelp baffles.");
    assert.equal(settled.messages[0].proposals.inventionHow, "Baffles cut the wake.");
    assert.equal(settled.asstCaption, "");
    assert.equal(settled.captionIndex, 0);
    assert.equal(settled.pending, null);
  });

  it("shows Apply buttons when the spoken caption never arrives", () => {
    const held = reduceVoiceTranscript(
      { messages: [], captionIndex: null, pending: null },
      {
        type: "proposals",
        message: "Suggested: Kelp",
        proposals: { ...emptyVoiceProposals(), addTechIds: ["kelp"] },
      }
    );
    const settled = settleVoiceTurn({ ...held, asstCaption: "" });
    assert.equal(settled.messages.length, 1);
    assert.deepEqual(settled.messages[0].proposals.addTechIds, ["kelp"]);
  });

  it("starts a new reply without attaching it to the previous bubble", () => {
    assert.equal(beginAssistantSpeech({ captionIndex: 2, asstCaption: "" }), null);
    assert.equal(beginAssistantSpeech({ captionIndex: 2, asstCaption: "Try" }), 2);
  });
});

describe("user voice captions", () => {
  const sentence = [
    "Of course, we need to buy them out of their debt, and then we need to give them",
    "Of course, we need to buy them out of their debt, and then we need to give them a way to capture",
    "Of course, we need to buy them out of their debt, and then we need to give them a way to capture the value of what they produce.",
  ];

  it("treats in_progress as interim and completed or a missing status as final", () => {
    assert.equal(userTranscriptIsFinal({ status: "in_progress" }), false);
    assert.equal(userTranscriptIsFinal({ status: "completed" }), true);
    assert.equal(userTranscriptIsFinal({}), true);
    assert.equal(userTranscriptIsFinal(null), true);
  });

  it("keeps one bubble when partials grow and then complete", () => {
    // Same gate as onVoiceEvent: commit only when the transcript is final.
    const apply = (messages, event) => {
      if (!userTranscriptIsFinal(event)) return { messages, changed: false };
      return commitUserVoiceCaption(messages, {
        text: event.transcript,
        itemId: event.item_id,
      });
    };
    let messages = [];
    for (const transcript of sentence) {
      const next = apply(messages, {
        transcript,
        item_id: "item-1",
        status: "in_progress",
      });
      assert.equal(next.changed, false);
      messages = next.messages;
    }
    assert.equal(messages.length, 0);
    const done = apply(messages, {
      transcript: sentence[2],
      item_id: "item-1",
      status: "completed",
    });
    assert.equal(done.changed, true);
    assert.equal(done.messages.length, 1);
    assert.equal(done.messages[0].role, "user");
    assert.equal(done.messages[0].voice, true);
    assert.equal(done.messages[0].itemId, "item-1");
    assert.equal(done.messages[0].content, sentence[2]);
  });

  it("replaces a corrected final for the same item", () => {
    const first = commitUserVoiceCaption([], {
      text: "buy them out of their debt",
      itemId: "item-1",
    });
    const corrected = commitUserVoiceCaption(first.messages, {
      text: "buy them out of their debt, then keep the value local",
      itemId: "item-1",
    });
    assert.equal(corrected.changed, true);
    assert.equal(corrected.messages.length, 1);
    assert.equal(
      corrected.messages[0].content,
      "buy them out of their debt, then keep the value local"
    );
  });

  it("appends a second utterance with a different item id", () => {
    const first = commitUserVoiceCaption([], { text: "First sentence.", itemId: "item-1" });
    const second = commitUserVoiceCaption(first.messages, {
      text: "Second sentence.",
      itemId: "item-2",
    });
    assert.equal(second.messages.length, 2);
    assert.equal(second.messages[0].content, "First sentence.");
    assert.equal(second.messages[1].content, "Second sentence.");
  });

  it("keeps a second utterance that repeats the same words", () => {
    const first = commitUserVoiceCaption([], { text: "Yes.", itemId: "item-1" });
    const second = commitUserVoiceCaption(first.messages, { text: "Yes.", itemId: "item-2" });
    assert.equal(second.changed, true);
    assert.equal(second.messages.length, 2);
    assert.equal(second.messages[0].itemId, "item-1");
    assert.equal(second.messages[1].itemId, "item-2");
    const repeatedTyped = commitUserVoiceCaption(
      [{ role: "user", content: "Yes." }],
      { text: "Yes.", itemId: "item-3" }
    );
    assert.equal(repeatedTyped.changed, true);
    assert.equal(repeatedTyped.messages.length, 2);
    assert.equal(repeatedTyped.messages[1].voice, true);
  });

  it("rewrites the spoken bubble after the co-inventor has replied", () => {
    const spoken = commitUserVoiceCaption([], {
      text: "buy them out of their debt",
      itemId: "item-1",
    });
    const withReply = spoken.messages.concat([
      { role: "assistant", content: "That gets at the root.", voice: true },
    ]);
    const corrected = commitUserVoiceCaption(withReply, {
      text: "buy them out of their debt, then keep the value local",
      itemId: "item-1",
    });
    assert.equal(corrected.changed, true);
    assert.equal(corrected.messages.length, 2);
    assert.equal(
      corrected.messages[0].content,
      "buy them out of their debt, then keep the value local"
    );
    assert.equal(corrected.messages[1].role, "assistant");
    assert.equal(corrected.messages[1].content, "That gets at the root.");
  });

  it("does not duplicate an identical final", () => {
    const first = commitUserVoiceCaption([], { text: "Same line.", itemId: "item-1" });
    const again = commitUserVoiceCaption(first.messages, {
      text: "Same line.",
      itemId: "item-1",
    });
    assert.equal(again.changed, false);
    assert.equal(again.messages.length, 1);
    const untagged = commitUserVoiceCaption([{ role: "user", content: "Same line." }], {
      text: "Same line.",
    });
    assert.equal(untagged.changed, false);
    assert.equal(untagged.messages.length, 1);
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

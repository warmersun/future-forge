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
  shouldFlushVoiceContextNow,
  planVoiceContextFlush,
  userTranscriptIsFinal,
  screenShowsVoiceHangup,
  voiceHangsUpOnScreenChange,
  voiceBlocksModeSwitch,
  tutorToggleLocked,
  hasVoiceMedia,
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

describe("screenShowsVoiceHangup", () => {
  it("is true only for workshop", () => {
    assert.equal(screenShowsVoiceHangup("workshop"), true);
    assert.equal(screenShowsVoiceHangup("outcome"), false);
    assert.equal(screenShowsVoiceHangup("quest-hub"), false);
    assert.equal(screenShowsVoiceHangup("title"), false);
    assert.equal(screenShowsVoiceHangup("challenge-step"), false);
    assert.equal(screenShowsVoiceHangup("deploy"), false);
    assert.equal(screenShowsVoiceHangup(""), false);
    assert.equal(screenShowsVoiceHangup(null), false);
  });
});

describe("voiceHangsUpOnScreenChange", () => {
  it("hangs up when leaving workshop for a screen that hides the waveform", () => {
    assert.equal(voiceHangsUpOnScreenChange("workshop", "outcome"), true);
    assert.equal(voiceHangsUpOnScreenChange("workshop", "quest-hub"), true);
    assert.equal(voiceHangsUpOnScreenChange("workshop", "challenge-step"), true);
    assert.equal(voiceHangsUpOnScreenChange("workshop", "deploy"), true);
  });

  it("keeps the call when the screen does not change or the workshop bar returns", () => {
    assert.equal(voiceHangsUpOnScreenChange("workshop", "workshop"), false);
    assert.equal(voiceHangsUpOnScreenChange("challenge-step", "challenge-step"), false);
    assert.equal(voiceHangsUpOnScreenChange("deploy", "deploy"), false);
    assert.equal(voiceHangsUpOnScreenChange("challenge-step", "workshop"), false);
    assert.equal(voiceHangsUpOnScreenChange("outcome", "workshop"), false);
  });

  it("hangs up when challenge and deploy swap, since each hides the other's bar", () => {
    assert.equal(voiceHangsUpOnScreenChange("challenge-step", "deploy"), true);
    assert.equal(voiceHangsUpOnScreenChange("deploy", "challenge-step"), true);
  });
});

describe("voiceBlocksModeSwitch", () => {
  it("blocks a live switch between tutoring and co-inventing", () => {
    assert.equal(voiceBlocksModeSwitch(true, "tutor", "coinventor"), true);
    assert.equal(voiceBlocksModeSwitch(true, "coinventor", "tutor"), true);
  });

  it("allows the same lane and an idle call", () => {
    assert.equal(voiceBlocksModeSwitch(true, "tutor", "tutor"), false);
    assert.equal(voiceBlocksModeSwitch(true, "coinventor", "coinventor"), false);
    assert.equal(voiceBlocksModeSwitch(false, "tutor", "coinventor"), false);
    assert.equal(voiceBlocksModeSwitch(false, "coinventor", "tutor"), false);
  });
});

describe("tutorToggleLocked", () => {
  it("stays locked when busy or not interactive, even if the call is idle", () => {
    assert.equal(
      tutorToggleLocked({
        busy: true,
        interactive: true,
        live: false,
        fromLane: "tutor",
        toLane: "coinventor",
      }),
      true
    );
    assert.equal(
      tutorToggleLocked({
        busy: false,
        interactive: false,
        live: false,
        fromLane: "coinventor",
        toLane: "tutor",
      }),
      true
    );
  });

  it("stays locked for a live lane change when the panel is free", () => {
    assert.equal(
      tutorToggleLocked({
        busy: false,
        interactive: true,
        live: true,
        fromLane: "tutor",
        toLane: "coinventor",
      }),
      true
    );
    assert.equal(
      tutorToggleLocked({
        busy: false,
        interactive: true,
        live: false,
        fromLane: "tutor",
        toLane: "coinventor",
      }),
      false
    );
  });
});

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

  it("changes when only metricsPending flips", () => {
    const base = voiceContextFingerprint(board);
    const pending = voiceContextFingerprint({ ...board, metricsPending: true });
    assert.notEqual(base, pending);
    assert.equal(
      pending,
      voiceContextFingerprint({ ...board, metricsPending: true })
    );
  });
});

describe("shouldFlushVoiceContextNow", () => {
  it("skips the first send and flushes when pending meters flip", () => {
    assert.equal(shouldFlushVoiceContextNow("", null, { metricsPending: true }), false);
    assert.equal(
      shouldFlushVoiceContextNow("fp", { metricsPending: false }, { metricsPending: true }),
      true
    );
    assert.equal(
      shouldFlushVoiceContextNow("fp", { metricsPending: true }, { metricsPending: false }),
      true
    );
    assert.equal(
      shouldFlushVoiceContextNow("fp", { metricsPending: true }, { metricsPending: true }),
      false
    );
  });
});

describe("planVoiceContextFlush", () => {
  it("drops a queued settled send when the live board matches the last snapshot", () => {
    assert.equal(
      planVoiceContextFlush({
        sentFp: "pending-same",
        pendingFp: "settled-intermediate",
        nextFp: "pending-same",
        sentMetricsPending: true,
        pendingMetricsPending: false,
        nextMetricsPending: true,
      }),
      "drop"
    );
  });

  it("flushes immediately when pending flips against the queued snapshot", () => {
    assert.equal(
      planVoiceContextFlush({
        sentFp: "sent-pending",
        pendingFp: "queued-settled",
        nextFp: "pending-new-pressure",
        sentMetricsPending: true,
        pendingMetricsPending: false,
        nextMetricsPending: true,
      }),
      "now"
    );
  });

  it("debounces an ordinary change and the first send", () => {
    assert.equal(
      planVoiceContextFlush({
        sentFp: "",
        pendingFp: "",
        nextFp: "first",
        nextMetricsPending: true,
      }),
      "debounce"
    );
    assert.equal(
      planVoiceContextFlush({
        sentFp: "sent",
        pendingFp: "",
        nextFp: "sent-plus-how",
        sentMetricsPending: false,
        nextMetricsPending: false,
      }),
      "debounce"
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

  it("folds lesson media onto the spoken bubble and unions a second call", () => {
    const picture = {
      images: [{ id: "img1", alt: "Software that can pay", url: "https://warmersun.com/i07.png" }],
      links: [{ id: "link1", label: "Page 07", url: "https://warmersun.com/p07.html" }],
    };
    const spoken = reduceVoiceTranscript(
      { messages: [], captionIndex: null, pending: null },
      { type: "caption_final", text: "A night helper can pay one ping." }
    );
    const shown = reduceVoiceTranscript(spoken, {
      type: "proposals",
      message: "",
      proposals: null,
      media: picture,
    });
    assert.equal(shown.messages.length, 1);
    assert.equal(shown.messages[0].content, "A night helper can pay one ping.");
    assert.equal(shown.messages[0].media.images[0].id, "img1");
    assert.equal(shown.messages[0].media.links[0].label, "Page 07");
    const again = reduceVoiceTranscript(shown, {
      type: "proposals",
      media: {
        images: [
          { id: "img1", alt: "Software that can pay", url: "https://warmersun.com/i07.png" },
          { id: "img2", alt: "Pilot", url: "https://warmersun.com/i08.png" },
          { id: "img3", alt: "Extra", url: "https://warmersun.com/i09.png" },
        ],
        links: [],
      },
    });
    assert.equal(again.messages.length, 1);
    assert.deepEqual(
      again.messages[0].media.images.map((item) => item.id),
      ["img1", "img2"]
    );
    assert.equal(hasVoiceMedia(again.messages[0].media), true);
  });

  it("keeps a picture that arrives before the caption, without calling it a draft", () => {
    const held = reduceVoiceTranscript(
      { messages: [], captionIndex: null, pending: null },
      {
        type: "proposals",
        message: "",
        proposals: null,
        media: {
          images: [{ id: "img1", alt: "Diagram", url: "https://warmersun.com/d.png" }],
          links: [],
        },
      }
    );
    assert.equal(held.messages.length, 0);
    assert.equal(held.pending.media.images[0].id, "img1");
    const spoken = reduceVoiceTranscript(held, {
      type: "caption_final",
      text: "Here is the diagram.",
    });
    assert.equal(spoken.messages[0].content, "Here is the diagram.");
    assert.equal(spoken.messages[0].media.images[0].url, "https://warmersun.com/d.png");
    const alone = reduceVoiceTranscript(held, { type: "turn_done" });
    assert.equal(alone.messages.length, 1);
    assert.equal(alone.messages[0].content, "");
    assert.equal(alone.messages[0].media.images.length, 1);
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

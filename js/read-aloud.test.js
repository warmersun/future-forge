import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  MIN_CHARS,
  TTS_MAX_CHARS,
  SPEAK_CHUNK_MAX,
  SPEAK_CHUNK_TARGET,
  normalizeSpeakText,
  formatHeadingForSpeech,
  stripSpeakTags,
  shouldShowReadAloud,
  cacheKeyFor,
  clampTtsText,
  splitSpeakChunks,
  _resetReadAloudForTests,
} from "./read-aloud.js";

describe("read-aloud helpers", () => {
  beforeEach(() => {
    _resetReadAloudForTests();
  });

  it("normalizes whitespace", () => {
    assert.equal(normalizeSpeakText("  hello   \n\n\n  world  "), "hello\n\nworld");
    assert.equal(normalizeSpeakText("a\u00a0b"), "a b");
  });

  it("min-length gate", () => {
    assert.equal(shouldShowReadAloud("short"), false);
    assert.equal(shouldShowReadAloud("x".repeat(MIN_CHARS)), true);
    assert.equal(shouldShowReadAloud("x".repeat(50), 40), true);
  });

  it("cache keys stable for same text/voice", () => {
    const a = cacheKeyFor("Hello world narrative text", "eve");
    const b = cacheKeyFor("Hello world narrative text", "eve");
    const c = cacheKeyFor("Hello world narrative text", "ara");
    assert.equal(a, b);
    assert.notEqual(a, c);
  });

  it("clamps overlong TTS text", () => {
    const long = "a".repeat(TTS_MAX_CHARS + 50);
    const clamped = clampTtsText(long);
    assert.ok(clamped.length <= TTS_MAX_CHARS);
    assert.ok(clamped.endsWith("…"));
  });

  it("does not clamp under limit", () => {
    const t = "A design-challenge scene about clean water and local invention.";
    assert.equal(clampTtsText(t), t);
  });

  it("punctuates headings and appends a pause tag", () => {
    assert.equal(formatHeadingForSpeech("Your job"), "Your job. [pause]");
    assert.equal(formatHeadingForSpeech("  The place  "), "The place. [pause]");
    assert.equal(formatHeadingForSpeech(""), "");
  });

  it("does not add a second period to a heading that already ends a sentence", () => {
    assert.equal(formatHeadingForSpeech("What's strained."), "What's strained. [pause]");
    assert.equal(formatHeadingForSpeech("Ready?"), "Ready? [pause]");
    assert.equal(formatHeadingForSpeech("Go!"), "Go! [pause]");
  });

  it("strips pause tags for device speech", () => {
    assert.equal(
      stripSpeakTags("Your job. [pause]\n\nPlain invent invitation in everyday words."),
      "Your job.\n\nPlain invent invitation in everyday words."
    );
    assert.equal(
      stripSpeakTags("Wait. [long-pause] Then the clinic radio clears."),
      "Wait. Then the clinic radio clears."
    );
    assert.equal(stripSpeakTags("No tags here."), "No tags here.");
  });
});

describe("splitSpeakChunks", () => {
  it("keeps short text as one chunk", () => {
    const t = "A design-challenge scene about clean water and local invention.";
    assert.deepEqual(splitSpeakChunks(t), [t]);
  });

  it("splits long prose on sentence ends", () => {
    const sentences = Array.from({ length: 16 }, (_, i) => {
      return `Sentence ${i + 1} tells a harbor design challenge about local inventors.`;
    });
    const text = sentences.join(" ");
    const chunks = splitSpeakChunks(text);
    assert.ok(chunks.length >= 3);
    const joined = chunks.join(" ");
    for (const s of sentences) {
      assert.ok(joined.includes(s), `missing: ${s}`);
    }
    for (const c of chunks) {
      assert.ok(c.length > 0);
      assert.match(c, /[.!?]$/);
    }
  });

  it("does not split mid-sentence under the max", () => {
    const a =
      "The first sentence is a complete thought about the clinic generator and the night shift.";
    const b =
      "The second sentence keeps going about fuel, batteries, and who pays for the next drum.";
    const c =
      "A third sentence names the midwife who waits for the radio to clear after the storm.";
    const text = [a, b, c].join(" ");
    const chunks = splitSpeakChunks(text, { target: 80, max: 200 });
    assert.ok(chunks.length >= 2);
    for (const chunk of chunks) {
      assert.equal(chunk.includes("generat") && chunk.includes("midwife") && chunk.length < a.length, false);
      assert.match(chunk.trim(), /[.!?]$/);
    }
  });

  it("treats paragraph breaks as boundaries", () => {
    const p1 =
      "First paragraph stays together as one spoken unit about the dock and the fog.";
    const p2 =
      "Second paragraph starts after the blank line and names the clinic radio.";
    const chunks = splitSpeakChunks(`${p1}\n\n${p2}`, { target: 40, max: 90 });
    assert.ok(chunks.length >= 2);
    assert.ok(chunks[0].includes("dock"));
    assert.ok(chunks.some((c) => c.includes("clinic radio")));
    assert.ok(!chunks[0].includes("clinic radio"));
  });

  it("packs toward the target instead of one sentence each", () => {
    const sentences = Array.from({ length: 8 }, () => "Short clause here.");
    const chunks = splitSpeakChunks(sentences.join(" "), {
      target: SPEAK_CHUNK_TARGET,
      max: SPEAK_CHUNK_MAX,
    });
    assert.ok(chunks.length < sentences.length);
    assert.ok(chunks[0].length >= SPEAK_CHUNK_TARGET || chunks.length === 1);
  });

  it("word-packs a run-on with no sentence end", () => {
    const words = Array.from({ length: 80 }, () => "harbor");
    const text = words.join(" ");
    const chunks = splitSpeakChunks(text, { target: 40, max: 60 });
    assert.ok(chunks.length >= 3);
    for (const c of chunks.slice(0, -1)) {
      assert.ok(c.length <= 60);
    }
    assert.equal(chunks.join(" "), text);
  });

  it("keeps a heading pause with the following sentence", () => {
    const heading = formatHeadingForSpeech("Your job");
    const body =
      "Plain invent invitation in everyday words names who is in trouble.";
    const text = `${heading}\n\n${body}`;
    const chunks = splitSpeakChunks(text, { target: 80, max: 200 });
    assert.ok(chunks.length >= 1);
    const joined = chunks.join(" ");
    assert.ok(joined.includes("[pause]"));
    assert.ok(joined.includes("Your job."));
    assert.ok(joined.includes("Plain invent invitation"));
    for (const c of chunks) {
      assert.ok(c.length > 0);
    }
  });
});

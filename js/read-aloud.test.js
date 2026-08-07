import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  MIN_CHARS,
  TTS_MAX_CHARS,
  normalizeSpeakText,
  shouldShowReadAloud,
  cacheKeyFor,
  clampTtsText,
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
});

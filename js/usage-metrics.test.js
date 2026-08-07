/**
 * Unit tests for usage metrics tracker.
 */
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  createUsageTracker,
  extractTokenUsage,
  normalizeSessionId,
  resolveUsageEnabled,
  usageTrackerFromEnv,
  utcDay,
} from "./usage-metrics.mjs";

describe("resolveUsageEnabled", () => {
  it("defaults to off", () => {
    assert.equal(resolveUsageEnabled([], {}), false);
    assert.equal(resolveUsageEnabled([], { FF_USAGE_ENABLED: "" }), false);
  });

  it("enables with --usage CLI flag", () => {
    assert.equal(resolveUsageEnabled(["--usage"], {}), true);
    assert.equal(resolveUsageEnabled(["--usage-tracking"], {}), true);
  });

  it("--no-usage wins over env and --usage", () => {
    assert.equal(
      resolveUsageEnabled(["--usage", "--no-usage"], { FF_USAGE_ENABLED: "1" }),
      false
    );
  });

  it("enables with FF_USAGE_ENABLED=1 when no CLI", () => {
    assert.equal(resolveUsageEnabled([], { FF_USAGE_ENABLED: "1" }), true);
    assert.equal(resolveUsageEnabled([], { FF_USAGE_ENABLED: "true" }), true);
    assert.equal(resolveUsageEnabled([], { FF_USAGE_ENABLED: "0" }), false);
  });
});

describe("usageTrackerFromEnv default off", () => {
  it("creates a disabled tracker without flags", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ff-usage-def-"));
    const t = usageTrackerFromEnv({ FF_USAGE_ENABLED: undefined }, dir, []);
    try {
      assert.equal(t.enabled, false);
      t.record({ type: "ai_text", mode: "chat", source: "ai", totalTokens: 9 });
      t.flush();
      assert.equal(fs.existsSync(path.join(dir, "summary.json")), false);
    } finally {
      t.close();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("enables with --usage argv", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ff-usage-on-"));
    const t = usageTrackerFromEnv({}, dir, ["--usage"]);
    try {
      assert.equal(t.enabled, true);
    } finally {
      t.close();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("extractTokenUsage", () => {
  it("reads Responses-style fields", () => {
    const u = extractTokenUsage({
      input_tokens: 100,
      output_tokens: 50,
      total_tokens: 150,
      input_tokens_details: { cached_tokens: 20 },
    });
    assert.equal(u.inputTokens, 100);
    assert.equal(u.outputTokens, 50);
    assert.equal(u.totalTokens, 150);
    assert.equal(u.cachedInputTokens, 20);
  });

  it("handles missing usage", () => {
    const u = extractTokenUsage(null);
    assert.equal(u.totalTokens, 0);
  });
});

describe("normalizeSessionId", () => {
  it("accepts uuid-like ids", () => {
    assert.equal(
      normalizeSessionId("a1b2c3d4-e5f6-7890-abcd-ef1234567890"),
      "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    );
  });
  it("rejects default and empty", () => {
    assert.equal(normalizeSessionId("default"), null);
    assert.equal(normalizeSessionId(""), null);
    assert.equal(normalizeSessionId(null), null);
  });
});

describe("createUsageTracker", () => {
  /** @type {string} */
  let tmp;
  /** @type {ReturnType<typeof createUsageTracker>} */
  let tracker;
  let clock;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ff-usage-"));
    clock = Date.parse("2026-07-26T12:00:00.000Z");
    tracker = createUsageTracker({
      dir: tmp,
      enabled: true,
      flushMs: 0,
      sessionIdleMs: 1000,
      now: () => clock,
      prices: {
        textInPerMTok: 1,
        textOutPerMTok: 2,
        image: 0.05,
        ttsPerMChar: 1,
      },
      warn: () => {},
    });
  });

  afterEach(() => {
    try {
      tracker.close();
    } catch {
      /* ignore */
    }
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("records ai_text tokens in summary and jsonl", () => {
    tracker.record({
      type: "ai_text",
      mode: "chat",
      source: "ai",
      model: "grok-4.5",
      inputTokens: 1000,
      outputTokens: 200,
      totalTokens: 1200,
      latencyMs: 400,
      ok: true,
    });
    tracker.flush();
    const s = tracker.getSummary();
    assert.equal(s.lifetime.aiTextCalls, 1);
    assert.equal(s.lifetime.inputTokens, 1000);
    assert.equal(s.lifetime.outputTokens, 200);
    assert.equal(s.lifetime.totalTokens, 1200);
    assert.equal(s.byMode.chat.calls, 1);
    assert.equal(s.byMode.chat.totalTokens, 1200);
    // cost: 1000/1e6 * 1 + 200/1e6 * 2 = 0.001 + 0.0004 = 0.0014
    assert.equal(s.lifetime.estimatedCostUsd, 0.0014);

    const day = utcDay(clock);
    const lines = fs
      .readFileSync(path.join(tmp, `events-${day}.jsonl`), "utf8")
      .trim()
      .split("\n");
    assert.ok(lines.length >= 2); // process_start + ai_text
    const last = JSON.parse(lines[lines.length - 1]);
    assert.equal(last.type, "ai_text");
    assert.equal(last.totalTokens, 1200);
  });

  it("local text does not add tokens", () => {
    tracker.record({
      type: "ai_text",
      mode: "chat",
      source: "local",
      model: null,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      ok: true,
    });
    const s = tracker.getSummary();
    assert.equal(s.lifetime.aiTextLocalCalls, 1);
    assert.equal(s.lifetime.aiTextCalls, 0);
    assert.equal(s.lifetime.totalTokens, 0);
    assert.equal(s.byMode.chat.localCalls, 1);
  });

  it("image cache does not increment imageLive", () => {
    tracker.record({
      type: "ai_image",
      kind: "vision",
      mode: "generate",
      source: "cache",
      imageCount: 0,
      ok: true,
    });
    tracker.record({
      type: "ai_image",
      kind: "vision",
      mode: "generate",
      source: "live",
      imageCount: 1,
      ok: true,
    });
    const s = tracker.getSummary();
    assert.equal(s.lifetime.imageLive, 1);
    assert.equal(s.lifetime.imageCacheHits, 1);
    assert.equal(s.byImageKind.vision.live, 1);
    assert.equal(s.byImageKind.vision.cache, 1);
    assert.equal(s.lifetime.estimatedCostUsd, 0.05);
  });

  it("records ai_tts live chars and cost; cache not billed", () => {
    tracker.record({
      type: "ai_tts",
      source: "ai",
      voice: "eve",
      charCount: 1000,
      bytes: 50_000,
      latencyMs: 1200,
      ok: true,
    });
    tracker.record({
      type: "ai_tts",
      source: "cache",
      voice: "eve",
      charCount: 1000,
      bytes: 50_000,
      latencyMs: 5,
      ok: true,
    });
    tracker.record({
      type: "ai_tts",
      source: "error",
      voice: "ara",
      charCount: 400,
      latencyMs: 800,
      ok: false,
    });
    const s = tracker.getSummary();
    assert.equal(s.lifetime.ttsLive, 1);
    assert.equal(s.lifetime.ttsCacheHits, 1);
    assert.equal(s.lifetime.ttsErrors, 1);
    assert.equal(s.lifetime.ttsChars, 1000);
    assert.equal(s.lifetime.ttsBytes, 100_000);
    assert.equal(s.byTtsVoice.eve.live, 1);
    assert.equal(s.byTtsVoice.eve.cache, 1);
    assert.equal(s.byTtsVoice.eve.chars, 1000);
    assert.equal(s.byTtsVoice.ara.errors, 1);
    // cost: 1000/1e6 * 1 = 0.001 (cache/error not billed)
    assert.equal(s.lifetime.estimatedCostUsd, 0.001);
    assert.equal(s.prices.ttsPerMChar, 1);

    const day = utcDay(clock);
    const lines = fs
      .readFileSync(path.join(tmp, `events-${day}.jsonl`), "utf8")
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l));
    const tts = lines.filter((e) => e.type === "ai_tts");
    assert.equal(tts.length, 3);
    assert.equal(tts[0].source, "ai");
    assert.equal(tts[0].charCount, 1000);
  });

  it("session touch + idle close accumulates duration", () => {
    tracker.touchSession("client-abc-001");
    clock += 5000;
    tracker.touchSession("client-abc-001");
    clock += 2000; // idle past 1000ms since last touch would be at +5000, so at +7000 idle is 2000
    tracker.sweepIdleSessions();
    const s = tracker.getSummary();
    assert.equal(s.lifetime.sessions, 1);
    assert.equal(s.lifetime.sessionDurationMs, 5000);
    assert.equal(s.activeSessions, 0);
  });

  it("summary survives reload from disk", () => {
    tracker.record({
      type: "ai_text",
      mode: "generate-scenarios",
      source: "ai",
      inputTokens: 500,
      outputTokens: 100,
      totalTokens: 600,
      ok: true,
    });
    tracker.record({
      type: "ai_tts",
      source: "ai",
      voice: "eve",
      charCount: 2500,
      bytes: 100_000,
      ok: true,
    });
    tracker.flush();
    tracker.close();

    const tracker2 = createUsageTracker({
      dir: tmp,
      enabled: true,
      flushMs: 0,
      now: () => clock,
      warn: () => {},
    });
    try {
      const s = tracker2.getSummary();
      assert.equal(s.lifetime.aiTextCalls, 1);
      assert.equal(s.lifetime.totalTokens, 600);
      assert.equal(s.lifetime.ttsLive, 1);
      assert.equal(s.lifetime.ttsChars, 2500);
      assert.equal(s.byTtsVoice.eve.live, 1);
      assert.equal(s.byTtsVoice.eve.chars, 2500);
      assert.equal(s.today.date, utcDay(clock));
      assert.equal(s.today.totalTokens, 600);
      assert.equal(s.today.ttsChars, 2500);
    } finally {
      tracker2.close();
    }
  });

  it("disabled tracker writes nothing", () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), "ff-usage-off-"));
    const off = createUsageTracker({
      dir: emptyDir,
      enabled: false,
      flushMs: 0,
      now: () => clock,
      warn: () => {},
    });
    try {
      off.record({
        type: "ai_text",
        mode: "chat",
        source: "ai",
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
      });
      off.touchSession("x");
      off.flush();
      assert.equal(fs.existsSync(path.join(emptyDir, "summary.json")), false);
      const files = fs.readdirSync(emptyDir);
      assert.equal(files.length, 0);
    } finally {
      off.close();
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });

  it("room start/end tracks duration", () => {
    tracker.roomStart("ABC123", { playerCount: 1 });
    clock += 10_000;
    tracker.roomEnd("ABC123", { playerCountPeak: 2 });
    const s = tracker.getSummary();
    assert.equal(s.lifetime.rooms, 1);
    assert.equal(s.lifetime.roomDurationMs, 10_000);
    assert.equal(s.activeRooms, 0);
  });
});

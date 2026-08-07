import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  normalizeTtsText,
  ttsCacheKey,
  createTtsCache,
} from "./tts-cache.mjs";

describe("tts-cache keys", () => {
  it("normalizes whitespace for stable keys", () => {
    assert.equal(normalizeTtsText("  a  \n\n\n b  "), "a\n\nb");
    const a = ttsCacheKey({ text: "Hello  world", voice: "eve", language: "en" });
    const b = ttsCacheKey({ text: "Hello world", voice: "eve", language: "en" });
    assert.equal(a, b);
  });

  it("same text+voice+lang → same key", () => {
    const a = ttsCacheKey({
      text: "Design challenge in Harborlight.",
      voice: "eve",
      language: "en",
    });
    const b = ttsCacheKey({
      text: "Design challenge in Harborlight.",
      voice: "Eve",
      language: "EN",
    });
    assert.equal(a, b);
    assert.match(a, /^[a-f0-9]{64}$/);
  });

  it("different voice or language → different key", () => {
    const base = { text: "Same story prose for inventors." };
    const a = ttsCacheKey({ ...base, voice: "eve", language: "en" });
    const b = ttsCacheKey({ ...base, voice: "ara", language: "en" });
    const c = ttsCacheKey({ ...base, voice: "eve", language: "es" });
    assert.notEqual(a, b);
    assert.notEqual(a, c);
  });
});

describe("createTtsCache", () => {
  /** @type {string} */
  let tmp;
  /** @type {ReturnType<typeof createTtsCache>} */
  let cache;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ff-tts-"));
    cache = createTtsCache({ dir: tmp, maxMemory: 8 });
  });

  afterEach(() => {
    try {
      fs.rmSync(tmp, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it("getOrCreate synthesizes once and serves disk/memory hits", async () => {
    const key = ttsCacheKey({ text: "Shared quest brief", voice: "eve", language: "en" });
    let calls = 0;
    const producer = async () => {
      calls += 1;
      return {
        buffer: Buffer.from("fake-mp3-bytes"),
        contentType: "audio/mpeg",
        voice: "eve",
        language: "en",
        charCount: 18,
      };
    };

    const first = await cache.getOrCreate(key, producer);
    assert.equal(first.cache, "miss");
    assert.equal(calls, 1);
    assert.ok(fs.existsSync(path.join(tmp, `${key}.mp3`)));

    const second = await cache.getOrCreate(key, producer);
    assert.equal(second.cache, "hit");
    assert.equal(calls, 1);
    assert.deepEqual(second.entry.buffer, Buffer.from("fake-mp3-bytes"));

    // Fresh cache instance sees disk
    const cache2 = createTtsCache({ dir: tmp, maxMemory: 8 });
    const third = await cache2.getOrCreate(key, producer);
    assert.equal(third.cache, "hit");
    assert.equal(calls, 1);
  });

  it("single-flight: concurrent getOrCreate share one producer", async () => {
    const key = ttsCacheKey({ text: "Concurrent read", voice: "eve", language: "en" });
    let calls = 0;
    let release;
    const gate = new Promise((r) => {
      release = r;
    });
    const producer = async () => {
      calls += 1;
      await gate;
      return {
        buffer: Buffer.from("shared"),
        contentType: "audio/mpeg",
        voice: "eve",
        language: "en",
        charCount: 15,
      };
    };

    const p1 = cache.getOrCreate(key, producer);
    const p2 = cache.getOrCreate(key, producer);
    // Let both enter before producer finishes
    await new Promise((r) => setImmediate(r));
    assert.equal(calls, 1);
    release();
    const [a, b] = await Promise.all([p1, p2]);
    assert.equal(calls, 1);
    assert.equal(a.entry.buffer.toString(), "shared");
    assert.equal(b.entry.buffer.toString(), "shared");
    // One miss (starter), one hit (waiter)
    const tags = [a.cache, b.cache].sort();
    assert.deepEqual(tags, ["hit", "miss"]);
  });
});

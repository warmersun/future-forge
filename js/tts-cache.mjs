/**
 * Server-side TTS audio cache — shared across all users/sessions.
 * Memory + disk; content-addressed by text + voice + language.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

/**
 * Collapse whitespace for stable cache keys (must match speakable text).
 * @param {string|null|undefined} s
 */
export function normalizeTtsText(s) {
  return String(s || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/**
 * Content-addressed cache key (sha256 hex).
 * Includes fixed param fingerprint so future options can bump the suffix.
 *
 * @param {{ text: string, voice?: string, language?: string, fingerprint?: string }} opts
 */
export function ttsCacheKey(opts) {
  const text = normalizeTtsText(opts.text);
  const voice = String(opts.voice || "eve").trim().toLowerCase() || "eve";
  const language = String(opts.language || "en").trim().toLowerCase() || "en";
  // fingerprint encodes synthesis options that affect output (normalize, speed, …)
  const fingerprint = String(opts.fingerprint || "norm=0").slice(0, 64);
  const material = `${text}\n|v=${voice}|lang=${language}|${fingerprint}`;
  return crypto.createHash("sha256").update(material, "utf8").digest("hex");
}

/**
 * @typedef {{
 *   buffer: Buffer,
 *   contentType: string,
 *   voice: string,
 *   language: string,
 *   charCount: number,
 *   key: string,
 * }} TtsCacheEntry
 */

/**
 * @param {{
 *   dir: string,
 *   maxMemory?: number,
 *   warn?: (msg: string) => void,
 * }} opts
 */
export function createTtsCache(opts) {
  const dir = opts.dir;
  const maxMemory = Number.isFinite(opts.maxMemory) ? Math.max(4, opts.maxMemory) : 64;
  const warn =
    typeof opts.warn === "function"
      ? opts.warn
      : (msg) => console.warn("[tts-cache]", msg);

  /** @type {Map<string, TtsCacheEntry & { at: number }>} */
  const memory = new Map();
  /** @type {Map<string, Promise<TtsCacheEntry>>} */
  const inflight = new Map();
  let ensured = false;

  function ensureDir() {
    if (ensured) return;
    try {
      fs.mkdirSync(dir, { recursive: true });
      ensured = true;
    } catch (e) {
      warn(`mkdir failed: ${e.message || e}`);
    }
  }

  function audioPath(key) {
    return path.join(dir, `${key}.mp3`);
  }

  function metaPath(key) {
    return path.join(dir, `${key}.json`);
  }

  /**
   * @param {string} key
   * @returns {TtsCacheEntry|null}
   */
  function getFromMemory(key) {
    const hit = memory.get(key);
    if (!hit) return null;
    // refresh LRU order
    memory.delete(key);
    memory.set(key, { ...hit, at: Date.now() });
    return {
      buffer: hit.buffer,
      contentType: hit.contentType,
      voice: hit.voice,
      language: hit.language,
      charCount: hit.charCount,
      key: hit.key,
    };
  }

  /**
   * @param {TtsCacheEntry} entry
   */
  function putMemory(entry) {
    memory.delete(entry.key);
    memory.set(entry.key, { ...entry, at: Date.now() });
    while (memory.size > maxMemory) {
      const oldest = memory.keys().next().value;
      if (oldest == null) break;
      memory.delete(oldest);
    }
  }

  /**
   * @param {string} key
   * @returns {TtsCacheEntry|null}
   */
  function getFromDisk(key) {
    ensureDir();
    const aPath = audioPath(key);
    if (!fs.existsSync(aPath)) return null;
    try {
      const buffer = fs.readFileSync(aPath);
      if (!buffer?.length) return null;
      let contentType = "audio/mpeg";
      let voice = "eve";
      let language = "en";
      let charCount = 0;
      const mPath = metaPath(key);
      if (fs.existsSync(mPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(mPath, "utf8"));
          if (meta.contentType) contentType = String(meta.contentType);
          if (meta.voice) voice = String(meta.voice);
          if (meta.language) language = String(meta.language);
          if (Number.isFinite(meta.charCount)) charCount = Number(meta.charCount);
        } catch {
          /* ignore bad meta */
        }
      }
      const entry = {
        key,
        buffer,
        contentType,
        voice,
        language,
        charCount,
      };
      putMemory(entry);
      return entry;
    } catch (e) {
      warn(`read failed ${key}: ${e.message || e}`);
      return null;
    }
  }

  /**
   * @param {TtsCacheEntry} entry
   */
  function putDisk(entry) {
    ensureDir();
    try {
      fs.writeFileSync(audioPath(entry.key), entry.buffer);
      fs.writeFileSync(
        metaPath(entry.key),
        JSON.stringify(
          {
            key: entry.key,
            contentType: entry.contentType,
            voice: entry.voice,
            language: entry.language,
            charCount: entry.charCount,
            bytes: entry.buffer.length,
            createdAt: new Date().toISOString(),
          },
          null,
          0
        ),
        "utf8"
      );
    } catch (e) {
      warn(`write failed ${entry.key}: ${e.message || e}`);
    }
  }

  /**
   * Sync lookup: memory then disk.
   * @param {string} key
   * @returns {TtsCacheEntry|null}
   */
  function get(key) {
    return getFromMemory(key) || getFromDisk(key);
  }

  /**
   * Store entry in memory + disk.
   * @param {TtsCacheEntry} entry
   */
  function set(entry) {
    putMemory(entry);
    putDisk(entry);
  }

  /**
   * Get cached entry or run producer once (single-flight per key).
   * Registers on `inflight` before any await so concurrent callers share one produce.
   * @param {string} key
   * @param {() => Promise<Omit<TtsCacheEntry, "key">>} producer
   * @returns {Promise<{ entry: TtsCacheEntry, cache: "hit"|"miss" }>}
   */
  async function getOrCreate(key, producer) {
    const existing = get(key);
    if (existing) {
      return { entry: existing, cache: "hit" };
    }

    const pending = inflight.get(key);
    if (pending) {
      const entry = await pending;
      return { entry, cache: "hit" };
    }

    /** @type {(v: TtsCacheEntry) => void} */
    let resolveJob;
    /** @type {(e: Error) => void} */
    let rejectJob;
    /** @type {Promise<TtsCacheEntry>} */
    const job = new Promise((res, rej) => {
      resolveJob = res;
      rejectJob = rej;
    });
    // Register before any await (single-thread safe against concurrent getOrCreate)
    inflight.set(key, job);

    try {
      const again = get(key);
      if (again) {
        resolveJob(again);
        return { entry: again, cache: "hit" };
      }

      const produced = await producer();
      const entry = {
        key,
        buffer: produced.buffer,
        contentType: produced.contentType || "audio/mpeg",
        voice: produced.voice || "eve",
        language: produced.language || "en",
        charCount: produced.charCount ?? 0,
      };
      if (!entry.buffer?.length) {
        throw new Error("TTS producer returned empty audio");
      }
      set(entry);
      resolveJob(entry);
      return { entry, cache: "miss" };
    } catch (e) {
      rejectJob(e instanceof Error ? e : new Error(String(e)));
      throw e;
    } finally {
      inflight.delete(key);
    }
  }

  return {
    dir,
    get,
    set,
    getOrCreate,
    /** @internal */
    _memorySize: () => memory.size,
    /** @internal */
    _inflightSize: () => inflight.size,
  };
}

/**
 * Server-side usage metrics for Future Forge hosting cost estimates.
 * Append-only JSONL events + atomic summary.json rollups.
 *
 * Never throws into the request path — disk errors are logged and ignored.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

/** @typedef {{
 *   aiTextCalls: number,
 *   aiTextLocalCalls: number,
 *   aiTextErrorCalls: number,
 *   inputTokens: number,
 *   outputTokens: number,
 *   totalTokens: number,
 *   imageLive: number,
 *   imageCacheHits: number,
 *   imageFollow: number,
 *   imageErrors: number,
 *   sessions: number,
 *   sessionDurationMs: number,
 *   rooms: number,
 *   roomDurationMs: number,
 *   estimatedCostUsd: number|null,
 * }} UsageCounters */

/**
 * @param {object} [opts]
 * @param {string} opts.dir
 * @param {boolean} [opts.enabled]
 * @param {number} [opts.flushMs]
 * @param {number} [opts.sessionIdleMs]
 * @param {{ textInPerMTok?: number, textOutPerMTok?: number, image?: number }} [opts.prices]
 * @param {() => number} [opts.now] — inject clock for tests
 * @param {(msg: string) => void} [opts.warn]
 */
export function createUsageTracker(opts = {}) {
  const dir = opts.dir || path.join(process.cwd(), "data", "usage");
  const enabled = opts.enabled !== false;
  const flushMs = Number.isFinite(opts.flushMs) ? opts.flushMs : 5000;
  const sessionIdleMs = Number.isFinite(opts.sessionIdleMs)
    ? opts.sessionIdleMs
    : 30 * 60 * 1000;
  const prices = {
    textInPerMTok: numOrNull(opts.prices?.textInPerMTok),
    textOutPerMTok: numOrNull(opts.prices?.textOutPerMTok),
    image: numOrNull(opts.prices?.image),
  };
  const nowFn = typeof opts.now === "function" ? opts.now : () => Date.now();
  const warn =
    typeof opts.warn === "function"
      ? opts.warn
      : (msg) => console.warn("[usage]", msg);

  const processId = crypto.randomUUID();
  const bootAt = nowFn();

  /** @type {Map<string, { startedAt: number, lastSeenAt: number }>} */
  const sessions = new Map();
  /** @type {Map<string, { startedAt: number, playerCountPeak: number }>} */
  const rooms = new Map();

  /** @type {UsageCounters} */
  let lifetime = emptyCounters();
  /** @type {UsageCounters & { date: string }} */
  let today = { ...emptyCounters(), date: utcDay(bootAt) };
  /** @type {Record<string, { calls: number, totalTokens: number, localCalls: number }>} */
  let byMode = Object.create(null);
  /** @type {Record<string, { live: number, cache: number, follow: number, errors: number }>} */
  let byImageKind = Object.create(null);

  let flushTimer = null;
  let sweepTimer = null;
  let closed = false;
  let dirty = false;

  if (enabled) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {
      warn(`mkdir failed: ${e.message || e}`);
    }
    loadSummaryFromDisk();
  }

  // process_start is recorded after load so it appears in this boot's events
  if (enabled) {
    appendEvent({
      type: "process_start",
      processId,
      bootAt: new Date(bootAt).toISOString(),
    });
    scheduleFlush();
    sweepTimer = setInterval(() => {
      try {
        sweepIdleSessions();
      } catch (e) {
        warn(`sweep failed: ${e.message || e}`);
      }
    }, 60_000);
    if (typeof sweepTimer.unref === "function") sweepTimer.unref();
  }

  function loadSummaryFromDisk() {
    const summaryPath = path.join(dir, "summary.json");
    try {
      if (!fs.existsSync(summaryPath)) return;
      const raw = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
      if (raw?.lifetime && typeof raw.lifetime === "object") {
        lifetime = mergeCounters(emptyCounters(), raw.lifetime);
      }
      if (raw?.today && typeof raw.today === "object") {
        const day = String(raw.today.date || "");
        if (day === utcDay(nowFn())) {
          today = {
            ...mergeCounters(emptyCounters(), raw.today),
            date: day,
          };
        }
      }
      if (raw?.byMode && typeof raw.byMode === "object") {
        byMode = { ...raw.byMode };
      }
      if (raw?.byImageKind && typeof raw.byImageKind === "object") {
        byImageKind = { ...raw.byImageKind };
      }
    } catch (e) {
      warn(`load summary failed: ${e.message || e}`);
    }
  }

  function ensureToday() {
    const d = utcDay(nowFn());
    if (today.date !== d) {
      today = { ...emptyCounters(), date: d };
    }
  }

  /**
   * @param {object} partial
   */
  function record(partial) {
    if (!enabled || closed) return;
    try {
      ensureToday();
      const { sessionId: rawSid, roomCode: rawRoom, ...rest } = partial;
      const event = {
        ...rest,
        ts: new Date(nowFn()).toISOString(),
        processId,
        sessionId: normalizeSessionId(rawSid),
        roomCode: rawRoom ? String(rawRoom).toUpperCase().slice(0, 16) : null,
      };

      applyEventToAggregates(event);
      appendEvent(event);
      dirty = true;
      scheduleFlush();
    } catch (e) {
      warn(`record failed: ${e.message || e}`);
    }
  }

  function applyEventToAggregates(event) {
    const type = event.type;
    if (type === "ai_text") {
      const src = event.source || "ai";
      const inT = n(event.inputTokens);
      const outT = n(event.outputTokens);
      const tot = n(event.totalTokens) || inT + outT;
      if (src === "local") {
        lifetime.aiTextLocalCalls += 1;
        today.aiTextLocalCalls += 1;
      } else if (src === "error") {
        lifetime.aiTextErrorCalls += 1;
        today.aiTextErrorCalls += 1;
        lifetime.aiTextCalls += 1;
        today.aiTextCalls += 1;
      } else {
        lifetime.aiTextCalls += 1;
        today.aiTextCalls += 1;
        lifetime.inputTokens += inT;
        lifetime.outputTokens += outT;
        lifetime.totalTokens += tot;
        today.inputTokens += inT;
        today.outputTokens += outT;
        today.totalTokens += tot;
      }
      const mode = String(event.mode || "unknown").slice(0, 64);
      if (!byMode[mode]) byMode[mode] = { calls: 0, totalTokens: 0, localCalls: 0 };
      if (src === "local") byMode[mode].localCalls += 1;
      else {
        byMode[mode].calls += 1;
        byMode[mode].totalTokens += tot;
      }
      recomputeCost(lifetime);
      recomputeCost(today);
      return;
    }

    if (type === "ai_image") {
      const kind = String(event.kind || "vision").slice(0, 32);
      if (!byImageKind[kind]) {
        byImageKind[kind] = { live: 0, cache: 0, follow: 0, errors: 0 };
      }
      const src = event.source || "live";
      if (src === "live") {
        const count = Math.max(0, n(event.imageCount) || 1);
        lifetime.imageLive += count;
        today.imageLive += count;
        byImageKind[kind].live += count;
        const inT = n(event.inputTokens);
        const outT = n(event.outputTokens);
        if (inT || outT) {
          lifetime.inputTokens += inT;
          lifetime.outputTokens += outT;
          lifetime.totalTokens += inT + outT;
          today.inputTokens += inT;
          today.outputTokens += outT;
          today.totalTokens += inT + outT;
        }
      } else if (src === "cache") {
        lifetime.imageCacheHits += 1;
        today.imageCacheHits += 1;
        byImageKind[kind].cache += 1;
      } else if (src === "follow") {
        lifetime.imageFollow += 1;
        today.imageFollow += 1;
        byImageKind[kind].follow += 1;
      } else if (src === "error") {
        lifetime.imageErrors += 1;
        today.imageErrors += 1;
        byImageKind[kind].errors += 1;
      }
      recomputeCost(lifetime);
      recomputeCost(today);
      return;
    }

    if (type === "session_end") {
      lifetime.sessions += 1;
      today.sessions += 1;
      const dur = Math.max(0, n(event.durationMs));
      lifetime.sessionDurationMs += dur;
      today.sessionDurationMs += dur;
      return;
    }

    if (type === "room_end") {
      lifetime.rooms += 1;
      today.rooms += 1;
      const dur = Math.max(0, n(event.durationMs));
      lifetime.roomDurationMs += dur;
      today.roomDurationMs += dur;
    }
  }

  function recomputeCost(counters) {
    const hasAny =
      prices.textInPerMTok != null ||
      prices.textOutPerMTok != null ||
      prices.image != null;
    if (!hasAny) {
      counters.estimatedCostUsd = null;
      return;
    }
    let cost = 0;
    if (prices.textInPerMTok != null) {
      cost += (counters.inputTokens / 1e6) * prices.textInPerMTok;
    }
    if (prices.textOutPerMTok != null) {
      cost += (counters.outputTokens / 1e6) * prices.textOutPerMTok;
    }
    if (prices.image != null) {
      cost += counters.imageLive * prices.image;
    }
    counters.estimatedCostUsd = Math.round(cost * 1e6) / 1e6;
  }

  function appendEvent(event) {
    if (!enabled) return;
    try {
      fs.mkdirSync(dir, { recursive: true });
      const day = utcDay(nowFn());
      const file = path.join(dir, `events-${day}.jsonl`);
      fs.appendFileSync(file, `${JSON.stringify(event)}\n`, { mode: 0o600 });
    } catch (e) {
      warn(`append event failed: ${e.message || e}`);
    }
  }

  function scheduleFlush() {
    if (!enabled || closed || flushMs <= 0) {
      if (enabled && !closed && dirty) flushSync();
      return;
    }
    if (flushTimer) return;
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flushSync();
    }, flushMs);
    if (typeof flushTimer.unref === "function") flushTimer.unref();
  }

  function flushSync() {
    if (!enabled || !dirty) return;
    dirty = false;
    try {
      fs.mkdirSync(dir, { recursive: true });
      const summary = getSummary();
      const summaryPath = path.join(dir, "summary.json");
      const tmp = `${summaryPath}.${processId}.tmp`;
      fs.writeFileSync(tmp, `${JSON.stringify(summary, null, 2)}\n`, {
        mode: 0o600,
      });
      fs.renameSync(tmp, summaryPath);
    } catch (e) {
      dirty = true;
      warn(`flush summary failed: ${e.message || e}`);
    }
  }

  /**
   * @param {string|null|undefined} sessionId
   */
  function touchSession(sessionId) {
    if (!enabled || closed) return;
    const id = normalizeSessionId(sessionId);
    if (!id) return;
    try {
      ensureToday();
      const t = nowFn();
      const existing = sessions.get(id);
      if (!existing) {
        sessions.set(id, { startedAt: t, lastSeenAt: t });
        record({ type: "session_start", sessionId: id });
      } else {
        existing.lastSeenAt = t;
      }
    } catch (e) {
      warn(`touchSession failed: ${e.message || e}`);
    }
  }

  function sweepIdleSessions(forceAll = false, reason = "idle") {
    if (!enabled || closed) return;
    const t = nowFn();
    for (const [id, s] of [...sessions.entries()]) {
      if (forceAll || t - s.lastSeenAt >= sessionIdleMs) {
        sessions.delete(id);
        const durationMs = Math.max(0, s.lastSeenAt - s.startedAt);
        // record without re-touching session
        try {
          ensureToday();
          const event = {
            ts: new Date(t).toISOString(),
            processId,
            type: "session_end",
            sessionId: id,
            roomCode: null,
            durationMs,
            reason,
          };
          applyEventToAggregates(event);
          appendEvent(event);
          dirty = true;
        } catch (e) {
          warn(`session_end failed: ${e.message || e}`);
        }
      }
    }
    if (dirty) scheduleFlush();
  }

  /**
   * @param {string} roomCode
   * @param {{ playerCount?: number }} [meta]
   */
  function roomStart(roomCode, meta = {}) {
    if (!enabled || closed) return;
    const code = String(roomCode || "").toUpperCase().slice(0, 16);
    if (!code) return;
    const t = nowFn();
    rooms.set(code, {
      startedAt: t,
      playerCountPeak: Math.max(1, n(meta.playerCount) || 1),
    });
    record({
      type: "room_start",
      roomCode: code,
      playerCount: Math.max(1, n(meta.playerCount) || 1),
    });
  }

  /**
   * @param {string} roomCode
   * @param {{ playerCountPeak?: number }} [meta]
   */
  function roomEnd(roomCode, meta = {}) {
    if (!enabled || closed) return;
    const code = String(roomCode || "").toUpperCase().slice(0, 16);
    if (!code) return;
    const prev = rooms.get(code);
    rooms.delete(code);
    const t = nowFn();
    const startedAt = prev?.startedAt ?? t;
    const peak = Math.max(
      prev?.playerCountPeak || 1,
      n(meta.playerCountPeak) || 1
    );
    record({
      type: "room_end",
      roomCode: code,
      durationMs: Math.max(0, t - startedAt),
      playerCountPeak: peak,
    });
  }

  /**
   * @param {string} roomCode
   * @param {number} playerCount
   */
  function roomTouchPlayers(roomCode, playerCount) {
    if (!enabled || closed) return;
    const code = String(roomCode || "").toUpperCase().slice(0, 16);
    const r = rooms.get(code);
    if (!r) return;
    r.playerCountPeak = Math.max(r.playerCountPeak, n(playerCount) || 0);
  }

  function getSummary() {
    ensureToday();
    recomputeCost(lifetime);
    recomputeCost(today);
    const t = nowFn();
    return {
      version: 1,
      updatedAt: new Date(t).toISOString(),
      process: {
        bootAt: new Date(bootAt).toISOString(),
        processId,
        uptimeSec: Math.floor((t - bootAt) / 1000),
      },
      lifetime: { ...lifetime },
      today: { ...today },
      byMode: { ...byMode },
      byImageKind: { ...byImageKind },
      activeSessions: sessions.size,
      activeRooms: rooms.size,
      prices: {
        textInPerMTok: prices.textInPerMTok,
        textOutPerMTok: prices.textOutPerMTok,
        image: prices.image,
      },
    };
  }

  function flush() {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    flushSync();
  }

  function close() {
    if (closed) return;
    try {
      sweepIdleSessions(true, "shutdown");
      for (const [code, r] of [...rooms.entries()]) {
        rooms.delete(code);
        try {
          ensureToday();
          const t = nowFn();
          const event = {
            ts: new Date(t).toISOString(),
            processId,
            type: "room_end",
            sessionId: null,
            roomCode: code,
            durationMs: Math.max(0, t - r.startedAt),
            playerCountPeak: r.playerCountPeak,
            reason: "shutdown",
          };
          applyEventToAggregates(event);
          appendEvent(event);
          dirty = true;
        } catch (e) {
          warn(`room_end shutdown failed: ${e.message || e}`);
        }
      }
      flush();
    } finally {
      closed = true;
      if (sweepTimer) {
        clearInterval(sweepTimer);
        sweepTimer = null;
      }
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
    }
  }

  return {
    record,
    touchSession,
    roomStart,
    roomEnd,
    roomTouchPlayers,
    sweepIdleSessions,
    getSummary,
    flush,
    close,
    /** Whether disk writes / session tracking are active */
    enabled,
    /** @internal test helpers */
    _dir: dir,
    _sessions: sessions,
    _rooms: rooms,
    _processId: processId,
  };
}

/**
 * Usage tracking is **off by default**.
 *
 * Enable with CLI `--usage` / `--usage-tracking`, or env `FF_USAGE_ENABLED=1`.
 * Force off with `--no-usage` (wins over env) or `FF_USAGE_ENABLED=0`.
 *
 * @param {string[]} [argv] — typically `process.argv.slice(2)`
 * @param {NodeJS.ProcessEnv|Record<string,string|undefined>} [env]
 * @returns {boolean}
 */
export function resolveUsageEnabled(argv = [], env = process.env) {
  const args = Array.isArray(argv) ? argv : [];
  // Explicit CLI wins
  if (args.includes("--no-usage")) return false;
  if (args.includes("--usage") || args.includes("--usage-tracking")) return true;

  const raw = env?.FF_USAGE_ENABLED;
  if (raw == null || raw === "") return false;
  const v = String(raw).trim().toLowerCase();
  if (v === "0" || v === "false" || v === "off" || v === "no") return false;
  if (v === "1" || v === "true" || v === "on" || v === "yes") return true;
  return false;
}

/**
 * Parse CLI + env tracker config. Tracking defaults to **off**.
 * @param {NodeJS.ProcessEnv|Record<string,string|undefined>} [env]
 * @param {string} [defaultDir]
 * @param {string[]} [argv] — defaults to `process.argv.slice(2)`
 */
export function usageTrackerFromEnv(
  env = process.env,
  defaultDir,
  argv = process.argv.slice(2)
) {
  const dir =
    env.FF_USAGE_DIR ||
    defaultDir ||
    path.join(process.cwd(), "data", "usage");
  const enabled = resolveUsageEnabled(argv, env);
  const flushMs = env.FF_USAGE_FLUSH_MS != null ? Number(env.FF_USAGE_FLUSH_MS) : 5000;
  const sessionIdleMs =
    env.FF_USAGE_SESSION_IDLE_MS != null
      ? Number(env.FF_USAGE_SESSION_IDLE_MS)
      : 30 * 60 * 1000;
  const prices = {
    textInPerMTok: numOrNull(env.FF_USAGE_PRICE_TEXT_IN_PER_MTOK),
    textOutPerMTok: numOrNull(env.FF_USAGE_PRICE_TEXT_OUT_PER_MTOK),
    image: numOrNull(env.FF_USAGE_PRICE_IMAGE),
  };
  return createUsageTracker({
    dir,
    enabled,
    flushMs: Number.isFinite(flushMs) ? flushMs : 5000,
    sessionIdleMs: Number.isFinite(sessionIdleMs) ? sessionIdleMs : 30 * 60 * 1000,
    prices,
  });
}

/**
 * Normalize Responses API / image usage blobs into flat token fields.
 * @param {object|null|undefined} usage
 */
export function extractTokenUsage(usage) {
  if (!usage || typeof usage !== "object") {
    return {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      cachedInputTokens: 0,
    };
  }
  const inputTokens = n(
    usage.input_tokens ?? usage.prompt_tokens ?? usage.inputTokens
  );
  const outputTokens = n(
    usage.output_tokens ?? usage.completion_tokens ?? usage.outputTokens
  );
  const totalTokens =
    n(usage.total_tokens ?? usage.totalTokens) || inputTokens + outputTokens;
  const cachedInputTokens = n(
    usage.input_tokens_details?.cached_tokens ??
      usage.prompt_tokens_details?.cached_tokens ??
      usage.cachedInputTokens
  );
  return { inputTokens, outputTokens, totalTokens, cachedInputTokens };
}

/** @param {unknown} sessionId */
export function normalizeSessionId(sessionId) {
  if (sessionId == null) return null;
  const s = String(sessionId).trim().slice(0, 120);
  if (!s || s === "default") return null;
  // reject obvious garbage
  if (!/^[A-Za-z0-9._:-]+$/.test(s)) return null;
  return s;
}

function emptyCounters() {
  return {
    aiTextCalls: 0,
    aiTextLocalCalls: 0,
    aiTextErrorCalls: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    imageLive: 0,
    imageCacheHits: 0,
    imageFollow: 0,
    imageErrors: 0,
    sessions: 0,
    sessionDurationMs: 0,
    rooms: 0,
    roomDurationMs: 0,
    estimatedCostUsd: null,
  };
}

function mergeCounters(base, raw) {
  const out = { ...base };
  for (const k of Object.keys(base)) {
    if (k === "estimatedCostUsd") {
      out[k] = raw[k] == null ? null : Number(raw[k]);
      if (!Number.isFinite(out[k])) out[k] = null;
      continue;
    }
    out[k] = n(raw[k]);
  }
  return out;
}

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) && x > 0 ? Math.floor(x) : 0;
}

function numOrNull(v) {
  if (v == null || v === "") return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

/** @param {number} ms */
export function utcDay(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

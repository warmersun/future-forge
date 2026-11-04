/*
Copyright © 2026 Warmer Sun Education, a sole proprietorship by Tamas Simon

This file is part of Future Forge.

Future Forge is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Future Forge is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Future Forge. If not, see <https://www.gnu.org/licenses/>.
*/

/**
 * Co-invent SSE protocol (v1). The browser opts in with Accept: text/event-stream.
 * Legacy callers keep a single JSON body. The flag defaults off.
 */

export const CO_INVENT_STREAM_VERSION = 1;
export const CO_INVENT_TURN_MS = 180_000;
export const STREAM_HEARTBEAT_MS = 15_000;

export const CONVERSATIONAL_STREAM_MODES = Object.freeze([
  "chat",
  "spark",
  "suggest-stack",
  "draft-name",
  "draft-how",
  "draft-impact",
  "push-further",
  "explain-techs",
  "art-of-the-possible",
  "sit",
  "scamper",
  "complete-picture",
]);

const MODE_SET = new Set(CONVERSATIONAL_STREAM_MODES);

const MAX_FRAME_BYTES = 64 * 1024;
const MAX_TOTAL_BYTES = 256 * 1024;
const MAX_PENDING_WRITES = 32;

/**
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} [env]
 */
export function coInventStreamEnabled(env = process.env) {
  return String(env.FF_CO_INVENT_STREAM || "") === "1";
}

/**
 * @param {string} [mode]
 */
export function isConversationalStreamMode(mode) {
  return MODE_SET.has(String(mode || "chat"));
}

/**
 * @param {{ headers?: Record<string, string|string[]|undefined> }} req
 * @param {string} [mode]
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} [env]
 */
export function coInventStreamRequested(req, mode, env = process.env) {
  if (!coInventStreamEnabled(env)) return false;
  if (!isConversationalStreamMode(mode)) return false;
  const raw = req?.headers?.accept ?? req?.headers?.Accept ?? "";
  const accept = Array.isArray(raw) ? raw.join(",") : String(raw);
  return accept.toLowerCase().includes("text/event-stream");
}

/**
 * @param {NodeJS.ProcessEnv|Record<string, string|undefined>} [env]
 */
export function coInventStreamHealth(env = process.env) {
  const on = coInventStreamEnabled(env);
  return {
    coInventStream: on,
    coInventStreamVersion: on ? CO_INVENT_STREAM_VERSION : null,
    coInventStreamModes: on ? [...CONVERSATIONAL_STREAM_MODES] : [],
  };
}

/**
 * @param {string} code
 */
export function safeStreamError(code) {
  const known = {
    malformed_output: "The answer did not come back in a usable form. Try again.",
    still_finishing: "Previous requests are still finishing.",
    interrupted: "Connection interrupted — unfinished answer",
    cancelled: "Stopped — unfinished answer",
    provider_failed: "The co-inventor hit a snag. Try again in a moment.",
    co_invent_failed: "The co-inventor hit a snag. Try again in a moment.",
  };
  return {
    code: known[code] ? code : "co_invent_failed",
    message: known[code] || known.co_invent_failed,
  };
}

/**
 * @param {import('node:http').ServerResponse} res
 * @param {{ requestId: string, mode: string, heartbeatMs?: number }} opts
 */
export function createCoInventSse(res, opts) {
  const requestId = String(opts.requestId || "").slice(0, 80);
  const mode = String(opts.mode || "chat").slice(0, 64);
  const heartbeatMs = opts.heartbeatMs ?? STREAM_HEARTBEAT_MS;
  let seq = 0;
  let opened = false;
  let terminal = false;
  let ended = false;
  let total = 0;
  let pending = 0;
  let gone = false;
  let sentText = false;
  /** @type {ReturnType<typeof setInterval> | null} */
  let timer = null;
  /** @type {string[]} */
  const queue = [];
  let draining = false;
  let failing = false;

  function cleanup() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function open() {
    if (opened || ended) return;
    opened = true;
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    });
    res.on?.("close", () => {
      if (!res.writableEnded) gone = true;
      cleanup();
    });
    if (heartbeatMs > 0) {
      timer = setInterval(() => {
        writeFrame(": keepalive\n\n");
      }, heartbeatMs);
      if (typeof timer.unref === "function") timer.unref();
    }
  }

  function writeFrame(frame) {
    if (ended || gone) return false;
    const bytes = Buffer.byteLength(frame);
    if (bytes > MAX_FRAME_BYTES || total + bytes > MAX_TOTAL_BYTES) {
      if (!failing) {
        failing = true;
        error({ code: "co_invent_failed", partial: sentText });
      } else {
        gone = true;
        cleanup();
      }
      return false;
    }
    if (pending >= MAX_PENDING_WRITES) {
      gone = true;
      cleanup();
      return false;
    }
    total += bytes;
    queue.push(frame);
    flush();
    return true;
  }

  function flush() {
    if (draining || ended) return;
    const frame = queue.shift();
    if (!frame) return;
    pending += 1;
    let ok = true;
    try {
      ok = res.write(frame, () => {
        pending = Math.max(0, pending - 1);
      });
    } catch {
      gone = true;
      pending = Math.max(0, pending - 1);
      cleanup();
      return;
    }
    if (ok === false) {
      draining = true;
      res.once?.("drain", () => {
        draining = false;
        pending = Math.max(0, pending - 1);
        flush();
      });
      return;
    }
    pending = Math.max(0, pending - 1);
    if (queue.length) flush();
  }

  function event(name, payload) {
    if (terminal || ended) return false;
    seq += 1;
    const body = { v: CO_INVENT_STREAM_VERSION, requestId, seq, mode, ...payload };
    return writeFrame(`event: ${name}\ndata: ${JSON.stringify(body)}\n\n`);
  }

  function start() {
    return event("start", {});
  }

  function status(phase) {
    if (phase !== "thinking" && phase !== "answering" && phase !== "finalizing") return false;
    return event("status", { phase });
  }

  function messageDelta(text) {
    const piece = String(text ?? "");
    if (!piece) return false;
    sentText = true;
    return event("message_delta", { text: piece });
  }

  function reasoningDelta(text) {
    const piece = String(text ?? "");
    if (!piece) return false;
    return event("reasoning_delta", { text: piece });
  }

  function result(value) {
    if (terminal) return false;
    const ok = event("result", { result: value });
    terminal = true;
    end();
    return ok;
  }

  function error(info = {}) {
    if (terminal) return false;
    const safe = safeStreamError(info.code || "co_invent_failed");
    const ok = event("error", {
      code: info.code && safeStreamError(info.code).code === info.code ? info.code : safe.code,
      message: safe.message,
      partial: Boolean(info.partial || sentText),
    });
    terminal = true;
    end();
    return ok;
  }

  function end() {
    if (ended) return;
    ended = true;
    cleanup();
    try {
      if (!res.writableEnded) res.end();
    } catch {
      /* socket already gone */
    }
  }

  return {
    open,
    start,
    status,
    messageDelta,
    reasoningDelta,
    result,
    error,
    end,
    get seq() {
      return seq;
    },
    get terminal() {
      return terminal;
    },
    get sentText() {
      return sentText;
    },
    get gone() {
      return gone;
    },
    accepting() {
      return opened && !terminal && !ended && !gone;
    },
  };
}

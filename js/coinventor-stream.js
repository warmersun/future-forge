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
 * Browser transport for POST /api/co-invent.
 * Accepts a streamed event sequence or, on the same response, a legacy JSON body.
 * Never resubmits.
 */

export const CO_INVENT_TURN_MS = 180_000;

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

/**
 * @param {string} [mode]
 */
export function isConversationalStreamMode(mode) {
  return CONVERSATIONAL_STREAM_MODES.includes(String(mode || "chat"));
}

const STATUS_PHASES = new Set(["thinking", "answering", "finalizing"]);

/**
 * @param {string} phase
 */
export function streamStatusLabel(phase) {
  if (phase === "answering") return "Answering…";
  if (phase === "finalizing") return "Finishing suggestions…";
  return "Thinking through your question…";
}

/**
 * Disclosure label for a reasoning trace. "Thinking" while it streams.
 * A settled trace names how long it ran.
 * @param {{ status?: string, thoughtMs?: number|null }} state
 */
export function reasoningDisclosureLabel(state = {}) {
  if (state.status === "thinking" || state.thoughtMs == null) {
    return state.status === "thinking" ? "Thinking" : "Thought";
  }
  const seconds = Math.max(1, Math.round(Number(state.thoughtMs) / 1000));
  return `Thought for ${seconds}s`;
}

const THOUGHT_BOUNDARY = /(?:[A-Za-z][.!?])["')\]]*(?:[ \t]+|\n+)|\n[ \t]*\n+/g;

/**
 * Split one reasoning chunk into finished thoughts plus the in-progress tail.
 * A sentence end or a blank line starts a new thought. Digits before a period
 * stay in the same thought, so "3.14" is not a break.
 * @param {string} text
 * @returns {string[]}
 */
function splitThoughtChunk(text) {
  const parts = [];
  let start = 0;
  for (const match of String(text || "").matchAll(THOUGHT_BOUNDARY)) {
    const after = match.index + match[0].length;
    if (after >= text.length || !/\S/.test(text.slice(after))) continue;
    const chunk = text.slice(start, after).trim();
    if (chunk) parts.push(chunk);
    start = after;
  }
  parts.push(String(text || "").slice(start).replace(/^[ \t\n]+/, ""));
  return parts;
}

/**
 * Append a reasoning delta and break out a new thought at a sentence or a blank line.
 * @param {string[]} texts
 * @param {string} delta
 * @returns {string[]}
 */
export function appendThoughts(texts, delta) {
  const list = Array.isArray(texts) ? texts.map((item) => String(item || "")) : [];
  const piece = String(delta || "");
  if (!piece) return list.map((item) => item.trim()).filter(Boolean);
  if (!list.length) list.push("");
  list[list.length - 1] += piece;
  const tail = list.pop();
  const next = [...list, ...splitThoughtChunk(tail)];
  return next.map((item) => item.trim()).filter(Boolean);
}

/**
 * Keep pinned open/closed choices. The newest thought stays open while thinking.
 * Earlier unpinned thoughts collapse.
 * @param {{ text?: string, open?: boolean, pinned?: boolean }[]} prev
 * @param {string[]} texts
 * @param {string} [status]
 */
export function mergeThoughtState(prev, texts, status) {
  const items = Array.isArray(prev) ? prev : [];
  const thinking = status === "thinking";
  const list = Array.isArray(texts) ? texts : [];
  return list.map((text, index) => {
    const old = items[index];
    const isLast = index === list.length - 1;
    const pinned = Boolean(old?.pinned);
    let open = old ? Boolean(old.open) : isLast && thinking;
    if (!pinned) open = isLast && thinking;
    return { text: String(text || ""), open, pinned };
  });
}

/**
 * Thoughts kept on the assistant message. Collapsed. Empty lines dropped.
 * Not sent back to the model.
 * @param {{ text?: string }[]} thoughts
 */
export function settledThoughts(thoughts) {
  return (Array.isArray(thoughts) ? thoughts : [])
    .map((thought) => ({ text: String(thought?.text || "").trim(), open: false, pinned: false }))
    .filter((thought) => thought.text);
}

/**
 * @param {typeof fetch} apiFetch
 * @param {object} body
 * @param {{ signal?: AbortSignal, onEvent?: (event: object) => void, requestId?: string }} [opts]
 */
export async function postCoInvent(apiFetch, body, opts = {}) {
  const res = await apiFetch("/api/co-invent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(body),
    signal: opts.signal,
  });
  opts.onResponse?.(res);
  return readCoInventResponse(res, opts);
}

/**
 * @param {Response} res
 * @param {{ onEvent?: (event: object) => void, signal?: AbortSignal }} [opts]
 */
export async function readCoInventResponse(res, opts = {}) {
  const ctype = String(res.headers?.get?.("content-type") || "");
  if (!ctype.toLowerCase().includes("text/event-stream")) {
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = { error: "bad_response", message: "The co-inventor hit a snag. Try again in a moment." };
    }
    return { kind: "json", status: res.status, ok: res.ok, data };
  }
  if (!res.body || typeof res.body.getReader !== "function") {
    return {
      kind: "error",
      status: res.status,
      ok: false,
      data: { error: "interrupted", message: "Connection interrupted — unfinished answer", partial: false },
    };
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  const parser = createSseParser({
    onEvent: opts.onEvent,
  });
  try {
    while (true) {
      if (opts.signal?.aborted) {
        try {
          await reader.cancel();
        } catch {
          /* already closed */
        }
        const err = new Error("aborted");
        err.name = "AbortError";
        throw err;
      }
      const step = await reader.read();
      if (step.done) break;
      parser.push(decoder.decode(step.value, { stream: true }));
    }
    parser.push(decoder.decode());
    parser.finish();
  } catch (e) {
    if (e?.name === "AbortError") throw e;
    if (e?.code === "sequence" || e?.code === "oversize") {
      return {
        kind: "error",
        status: res.status,
        ok: false,
        data: {
          error: "interrupted",
          message: "Connection interrupted — unfinished answer",
          partial: parser.sawText,
        },
      };
    }
    throw e;
  }
  if (!parser.terminal) {
    return {
      kind: "error",
      status: res.status,
      ok: false,
      data: {
        error: "interrupted",
        message: "Connection interrupted — unfinished answer",
        partial: parser.sawText,
      },
    };
  }
  if (parser.errorEvent) {
    return { kind: "error", status: res.status, ok: false, data: parser.errorEvent };
  }
  return { kind: "stream", status: res.status, ok: true, data: parser.result };
}

/**
 * @param {{ onEvent?: (event: object) => void, maxFrame?: number }} [opts]
 */
export function createSseParser(opts = {}) {
  const maxFrame = opts.maxFrame ?? 64 * 1024;
  let buffer = "";
  let expected = 1;
  let terminal = null;
  let result = null;
  let errorEvent = null;
  let sawText = false;
  const seen = new Set();

  function push(text) {
    buffer += String(text ?? "");
    while (true) {
      const split = buffer.indexOf("\n\n");
      const splitCr = buffer.indexOf("\r\n\r\n");
      let cut = -1;
      let width = 2;
      if (split >= 0 && (splitCr < 0 || split < splitCr)) {
        cut = split;
        width = 2;
      } else if (splitCr >= 0) {
        cut = splitCr;
        width = 4;
      }
      if (cut < 0) {
        if (buffer.length > maxFrame) {
          const err = new Error("oversize");
          err.code = "oversize";
          throw err;
        }
        return;
      }
      const raw = buffer.slice(0, cut);
      buffer = buffer.slice(cut + width);
      consumeFrame(raw);
    }
  }

  function consumeFrame(raw) {
    const lines = raw.split(/\r?\n/);
    let eventName = "message";
    const dataLines = [];
    for (const line of lines) {
      if (!line || line.startsWith(":")) continue;
      const idx = line.indexOf(":");
      const field = idx < 0 ? line : line.slice(0, idx);
      let value = idx < 0 ? "" : line.slice(idx + 1);
      if (value.startsWith(" ")) value = value.slice(1);
      if (field === "event") eventName = value;
      else if (field === "data") dataLines.push(value);
    }
    if (!dataLines.length) return;
    let payload;
    try {
      payload = JSON.parse(dataLines.join("\n"));
    } catch {
      const err = new Error("sequence");
      err.code = "sequence";
      throw err;
    }
    const seq = Number(payload.seq);
    if (!Number.isInteger(seq) || seq < 1) {
      const err = new Error("sequence");
      err.code = "sequence";
      throw err;
    }
    if (seen.has(seq)) return;
    if (seq !== expected) {
      const err = new Error("sequence");
      err.code = "sequence";
      throw err;
    }
    seen.add(seq);
    expected = seq + 1;
    if (eventName === "message_delta" && payload.text) sawText = true;
    if (eventName === "status" && payload.phase && !STATUS_PHASES.has(payload.phase)) return;
    opts.onEvent?.({ ...payload, event: eventName });
    if (eventName === "result") {
      terminal = "result";
      result = payload.result || {};
    } else if (eventName === "error") {
      terminal = "error";
      errorEvent = {
        error: payload.code || "co_invent_failed",
        message: payload.message || "The co-inventor hit a snag. Try again in a moment.",
        partial: Boolean(payload.partial),
      };
    }
  }

  function finish() {
    if (buffer.trim()) {
      const err = new Error("sequence");
      err.code = "sequence";
      throw err;
    }
  }

  return {
    push,
    finish,
    get terminal() {
      return terminal;
    },
    get result() {
      return result;
    },
    get errorEvent() {
      return errorEvent;
    },
    get sawText() {
      return sawText;
    },
  };
}

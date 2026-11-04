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
 * Incremental decoder for the public `message` string inside a co-invent JSON
 * object, plus the final structural checks the stream must not skip.
 * The existing semantic sanitizer stays authoritative after this parse.
 */

export const PUBLIC_MESSAGE_CAP = 4000;
export const MAX_PROVIDER_TEXT = 200_000;

const PUBLIC_RESULT_KEYS = [
  "source",
  "message",
  "proposals",
  "teaching",
  "endTutoring",
  "timing",
  "ideas",
  "lights",
  "angle",
  "angleLabel",
  "challengeSpeech",
  "challengeQuestion",
  "verdict",
  "lesson",
  "draftAnswer",
  "quality",
  "damage",
  "scenarios",
  "additive",
  "reason",
];

/**
 * @param {{ maxChars?: number, maxRaw?: number }} [opts]
 */
export function createMessageDecoder(opts = {}) {
  const maxChars = opts.maxChars ?? PUBLIC_MESSAGE_CAP;
  const maxRaw = opts.maxRaw ?? MAX_PROVIDER_TEXT;
  let buf = "";
  let i = 0;
  let phase = "start";
  let emitted = "";
  let stopped = false;
  let stopReason = null;
  let messageClosed = false;
  let depth = 0;
  let container = "object";
  /** @type {string[]} */
  const stack = [];
  let key = "";
  let escape = false;
  let unicode = "";
  let pendingHigh = "";
  let currentKey = "";
  let fenceSkipped = false;
  /** @type {Set<string>} */
  const rootKeys = new Set();
  let reading = "";

  function stop(reason) {
    if (stopped) return;
    stopped = true;
    stopReason = reason;
  }

  function take(text) {
    if (!text || messageClosed) return "";
    const room = maxChars - emitted.length;
    if (room <= 0) return "";
    const slice = text.length > room ? text.slice(0, room) : text;
    emitted += slice;
    return slice;
  }

  function emitCodeUnit(unit) {
    if (pendingHigh) {
      const high = pendingHigh;
      pendingHigh = "";
      const highN = high.charCodeAt(0);
      const lowN = unit.charCodeAt(0);
      if (lowN >= 0xdc00 && lowN <= 0xdfff && highN >= 0xd800 && highN <= 0xdbff) {
        return take(high + unit);
      }
      return take(high) + take(unit);
    }
    const n = unit.charCodeAt(0);
    if (n >= 0xd800 && n <= 0xdbff) {
      pendingHigh = unit;
      return "";
    }
    return take(unit);
  }

  function flushPendingHigh() {
    if (!pendingHigh) return "";
    const high = pendingHigh;
    pendingHigh = "";
    return take(high);
  }

  function push(chunk) {
    const before = emitted.length;
    if (stopped) {
      return { appended: "", messageClosed, stopped, stopReason, text: emitted };
    }
    buf += String(chunk ?? "");
    if (buf.length > maxRaw) stop("too_large");
    else pump();
    return {
      appended: emitted.slice(before),
      messageClosed,
      stopped,
      stopReason,
      text: emitted,
    };
  }

  function pump() {
    let guard = 0;
    while (!stopped && phase !== "done" && guard < buf.length + 8) {
      guard += 1;
      const at = i;
      const progressed = step();
      if (!progressed) break;
      if (i === at && phase !== "done") break;
    }
  }

  function step() {
    if (phase === "start") return stepStart();
    if (phase === "key-or-end") return stepKeyOrEnd();
    if (phase === "key") return stepString("key");
    if (phase === "colon") return stepColon();
    if (phase === "value") return stepValue();
    if (phase === "emit") return stepString("emit");
    if (phase === "skip-string") return stepString("skip");
    if (phase === "skip-number") return stepNumber();
    if (phase === "skip-literal") return stepLiteral();
    return false;
  }

  function stepStart() {
    while (i < buf.length && /\s/.test(buf[i])) i += 1;
    if (i >= buf.length) return false;
    if (!fenceSkipped && buf[i] === "`") {
      const rest = buf.slice(i);
      if (rest.length < 3) return "```".startsWith(rest) ? false : (stop("malformed"), true);
      if (!rest.startsWith("```")) {
        stop("malformed");
        return true;
      }
      const nl = buf.indexOf("\n", i);
      if (nl < 0) return false;
      i = nl + 1;
      fenceSkipped = true;
      return true;
    }
    if (buf[i] === "{") {
      i += 1;
      depth = 1;
      container = "object";
      stack.length = 0;
      stack.push("object");
      phase = "key-or-end";
      return true;
    }
    stop("malformed");
    return true;
  }

  function stepKeyOrEnd() {
    while (i < buf.length && /\s/.test(buf[i])) i += 1;
    if (i >= buf.length) return false;
    const ch = buf[i];
    if (ch === "}") {
      i += 1;
      stack.pop();
      depth -= 1;
      if (depth <= 0) {
        phase = "done";
        return true;
      }
      container = stack[stack.length - 1] || "object";
      phase = "key-or-end";
      return true;
    }
    if (ch === "]") {
      i += 1;
      stack.pop();
      depth -= 1;
      container = stack[stack.length - 1] || "object";
      phase = depth <= 0 ? "done" : "key-or-end";
      return true;
    }
    if (ch === ",") {
      i += 1;
      return true;
    }
    if (container === "array") {
      phase = "value";
      currentKey = "";
      return true;
    }
    if (ch === '"') {
      i += 1;
      key = "";
      escape = false;
      unicode = "";
      reading = "";
      phase = "key";
      return true;
    }
    stop("malformed");
    return true;
  }

  function stepColon() {
    while (i < buf.length && /\s/.test(buf[i])) i += 1;
    if (i >= buf.length) return false;
    if (buf[i] !== ":") {
      stop("malformed");
      return true;
    }
    i += 1;
    currentKey = key;
    if (depth === 1 && container === "object") {
      if (rootKeys.has(currentKey)) {
        stop("duplicate_key");
        return true;
      }
      rootKeys.add(currentKey);
    }
    phase = "value";
    return true;
  }

  function stepValue() {
    while (i < buf.length && /\s/.test(buf[i])) i += 1;
    if (i >= buf.length) return false;
    const ch = buf[i];
    const emitMessage = depth === 1 && currentKey === "message" && stack.length === 1;
    if (emitMessage) {
      if (ch !== '"') {
        stop("message_type");
        return true;
      }
      i += 1;
      escape = false;
      unicode = "";
      phase = "emit";
      return true;
    }
    if (ch === '"') {
      i += 1;
      escape = false;
      unicode = "";
      phase = "skip-string";
      return true;
    }
    if (ch === "{") {
      i += 1;
      depth += 1;
      stack.push("object");
      container = "object";
      phase = "key-or-end";
      return true;
    }
    if (ch === "[") {
      i += 1;
      depth += 1;
      stack.push("array");
      container = "array";
      phase = "key-or-end";
      return true;
    }
    if (ch === "-" || (ch >= "0" && ch <= "9")) {
      phase = "skip-number";
      return true;
    }
    if (ch === "t" || ch === "f" || ch === "n") {
      phase = "skip-literal";
      return true;
    }
    stop("malformed");
    return true;
  }

  function stepString(kind) {
    while (i < buf.length) {
      const ch = buf[i];
      if (escape) {
        if (unicode) {
          if (!/[0-9a-fA-F]/.test(ch)) {
            stop("bad_escape");
            return true;
          }
          unicode += ch;
          i += 1;
          if (unicode.length < 4) continue;
          const unit = String.fromCharCode(parseInt(unicode, 16));
          unicode = "";
          escape = false;
          if (kind === "key") key += unit;
          else if (kind === "emit") emitCodeUnit(unit);
          continue;
        }
        if (ch === "u") {
          unicode = "";
          i += 1;
          if (i >= buf.length) return false;
          continue;
        }
        const mapped = ESCAPES[ch];
        if (mapped == null) {
          stop("bad_escape");
          return true;
        }
        escape = false;
        i += 1;
        if (kind === "key") key += mapped;
        else if (kind === "emit") emitCodeUnit(mapped);
        continue;
      }
      if (ch === "\\") {
        if (i + 1 >= buf.length) return false;
        escape = true;
        i += 1;
        continue;
      }
      if (ch === '"') {
        i += 1;
        if (kind === "key") {
          phase = "colon";
          return true;
        }
        if (kind === "emit") {
          flushPendingHigh();
          messageClosed = true;
          phase = "key-or-end";
          return true;
        }
        phase = "key-or-end";
        return true;
      }
      i += 1;
      if (kind === "key") key += ch;
      else if (kind === "emit") emitCodeUnit(ch);
    }
    return false;
  }

  function stepNumber() {
    const start = i;
    while (i < buf.length && /[0-9eE+.\-]/.test(buf[i])) i += 1;
    if (i === start) {
      stop("malformed");
      return true;
    }
    if (i >= buf.length) return false;
    phase = "key-or-end";
    return true;
  }

  function stepLiteral() {
    const rest = buf.slice(i);
    for (const word of ["true", "false", "null"]) {
      if (rest.startsWith(word)) {
        i += word.length;
        phase = "key-or-end";
        return true;
      }
      if (word.startsWith(rest)) return false;
    }
    stop("malformed");
    return true;
  }

  return {
    push,
    text: () => emitted,
    raw: () => buf,
    stopped: () => stopped,
    stopReason: () => stopReason,
    messageClosed: () => messageClosed,
  };
}

const ESCAPES = {
  '"': '"',
  "\\": "\\",
  "/": "/",
  b: "\b",
  f: "\f",
  n: "\n",
  r: "\r",
  t: "\t",
};

/**
 * @param {string} text
 */
export function stripOneJsonFence(text) {
  let s = String(text ?? "").trim();
  if (!s.startsWith("```")) return s;
  s = s.replace(/^```(?:json)?[^\n]*\n?/i, "");
  s = s.replace(/\n?```\s*$/i, "");
  return s.trim();
}

/**
 * @param {string} text
 * @returns {boolean}
 */
export function jsonHasDuplicateKeys(text) {
  const s = String(text ?? "");
  let i = 0;
  function skipWs() {
    while (i < s.length && /\s/.test(s[i])) i += 1;
  }
  function parseValue() {
    skipWs();
    const ch = s[i];
    if (ch === "{") return parseObject();
    if (ch === "[") return parseArray();
    if (ch === '"') {
      readString();
      return false;
    }
    if (ch === "-" || (ch >= "0" && ch <= "9")) {
      while (i < s.length && /[0-9eE+.\-]/.test(s[i])) i += 1;
      return false;
    }
    if (s.startsWith("true", i)) i += 4;
    else if (s.startsWith("false", i)) i += 5;
    else if (s.startsWith("null", i)) i += 4;
    else i += 1;
    return false;
  }
  function readString() {
    i += 1;
    while (i < s.length) {
      if (s[i] === "\\") {
        i += 2;
        continue;
      }
      if (s[i] === '"') {
        i += 1;
        return;
      }
      i += 1;
    }
  }
  function parseObject() {
    i += 1;
    const seen = new Set();
    let dup = false;
    skipWs();
    if (s[i] === "}") {
      i += 1;
      return dup;
    }
    while (i < s.length) {
      skipWs();
      if (s[i] !== '"') break;
      const start = i;
      readString();
      const raw = s.slice(start, i);
      let name = raw;
      try {
        name = JSON.parse(raw);
      } catch {
        name = raw;
      }
      if (seen.has(name)) dup = true;
      seen.add(name);
      skipWs();
      if (s[i] === ":") i += 1;
      if (parseValue()) dup = true;
      skipWs();
      if (s[i] === ",") {
        i += 1;
        continue;
      }
      if (s[i] === "}") {
        i += 1;
        break;
      }
      break;
    }
    return dup;
  }
  function parseArray() {
    i += 1;
    let dup = false;
    skipWs();
    if (s[i] === "]") {
      i += 1;
      return dup;
    }
    while (i < s.length) {
      if (parseValue()) dup = true;
      skipWs();
      if (s[i] === ",") {
        i += 1;
        continue;
      }
      if (s[i] === "]") {
        i += 1;
        break;
      }
      break;
    }
    return dup;
  }
  return parseValue();
}

/**
 * @param {string} text
 * @returns {{ ok: true, value: object } | { ok: false, error: string }}
 */
export function parseModelJson(text) {
  const stripped = stripOneJsonFence(text);
  if (!stripped) return { ok: false, error: "empty" };
  if (jsonHasDuplicateKeys(stripped)) return { ok: false, error: "duplicate_key" };
  try {
    const value = JSON.parse(stripped);
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { ok: false, error: "not_object" };
    }
    return { ok: true, value };
  } catch {
    return { ok: false, error: "malformed" };
  }
}

/**
 * Allowlisted public result. Drops quota, inspect, and reasoning fields.
 * @param {object|null|undefined} result
 */
export function publicCoInventResult(result) {
  const src = result && typeof result === "object" ? result : {};
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const key of PUBLIC_RESULT_KEYS) {
    if (src[key] !== undefined) out[key] = src[key];
  }
  if (out.proposals && typeof out.proposals === "object") {
    const p = /** @type {Record<string, unknown>} */ (out.proposals);
    out.proposals = {
      addTechIds: p.addTechIds,
      removeTechIds: p.removeTechIds,
      inventionName: p.inventionName,
      inventionHow: p.inventionHow,
      inventionImpact: p.inventionImpact,
      howTarget: p.howTarget,
      howTechId: p.howTechId,
      scrutiny: p.scrutiny,
    };
  }
  return out;
}

/**
 * Final displayed message is the sanitized string. Preview must not invent text past it.
 * @param {string} preview
 * @param {string} finalMessage
 */
export function reconcilePreview(preview, finalMessage) {
  const finalText = String(finalMessage ?? "").slice(0, PUBLIC_MESSAGE_CAP);
  const prior = String(preview ?? "").slice(0, PUBLIC_MESSAGE_CAP);
  return { preview: prior, message: finalText, prefix: finalText.startsWith(prior) || prior.startsWith(finalText) };
}

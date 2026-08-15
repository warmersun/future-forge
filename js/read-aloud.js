/**
 * Read out loud — cloud TTS (xAI via /api/tts) with browser speechSynthesis fallback.
 * Shared single-player: only one narration at a time across the whole app.
 */

import { getClientSessionId } from "./client-session.js";

/** Hide control below this length (after normalize). */
export const MIN_CHARS = 100;

/** xAI TTS hard limit. */
export const TTS_MAX_CHARS = 15_000;

const LABEL_IDLE = "Read out loud";
const LABEL_LOADING = "Preparing…";
const LABEL_STOP = "Stop";

/** Inline SVGs (currentColor) — icon-only button face. */
const ICON_SPEAKER = `<svg class="read-aloud-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
const ICON_STOP = `<svg class="read-aloud-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M6 6h12v12H6z"/></svg>`;

/** @type {Map<HTMLElement, HostRecord>} */
const hosts = new Map();

/** @type {Map<string, string>} cacheKey → object URL */
const audioCache = new Map();

/** @type {HTMLAudioElement|null} */
let sharedAudio = null;

/** @type {AbortController|null} */
let inflight = null;

/** @type {HTMLElement|null} */
let activeContent = null;

/** @type {((msg: string) => void)|null} */
let toastFn = null;

/** Resolves the active play promise when stop interrupts playback. */
let playWaitResolve = null;

/**
 * @typedef {{
 *   contentEl: HTMLElement,
 *   bar: HTMLElement,
 *   btn: HTMLButtonElement,
 *   getText: () => string,
 *   minChars: number,
 *   lastText: string,
 * }} HostRecord
 */

/**
 * Optional global toast hook (game flashToast).
 * @param {(msg: string) => void} [fn]
 */
export function setReadAloudToast(fn) {
  toastFn = typeof fn === "function" ? fn : null;
}

/**
 * Collapse whitespace for length / speak / cache keys.
 * @param {string|null|undefined} s
 */
export function normalizeSpeakText(s) {
  return String(s || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/**
 * Plain text from a DOM node (skips script/style and optional selectors).
 * @param {Element|null|undefined} el
 * @param {{ skipSelector?: string }} [opts]
 */
export function plainTextFromEl(el, opts = {}) {
  if (!el) return "";
  const skip = opts.skipSelector || ".read-aloud-bar, script, style";
  const clone = el.cloneNode(true);
  if (clone instanceof Element) {
    clone.querySelectorAll(skip).forEach((n) => n.remove());
  }
  return normalizeSpeakText(clone.textContent || "");
}

/**
 * @param {string} text
 * @param {number} [minChars]
 */
export function shouldShowReadAloud(text, minChars = MIN_CHARS) {
  return normalizeSpeakText(text).length >= minChars;
}

/**
 * @param {string} text
 * @param {string} [voice]
 */
export function cacheKeyFor(text, voice = "eve") {
  const t = normalizeSpeakText(text).slice(0, TTS_MAX_CHARS);
  return `${voice}::${simpleHash(t)}::${t.length}`;
}

/**
 * Clamp for API.
 * @param {string} text
 */
export function clampTtsText(text) {
  const t = normalizeSpeakText(text);
  if (t.length <= TTS_MAX_CHARS) return t;
  return t.slice(0, TTS_MAX_CHARS - 1).trimEnd() + "…";
}

/**
 * Place bar as next sibling of content (under the text), lower-right via CSS.
 * @param {HTMLElement} contentEl
 * @param {HTMLElement} bar
 */
function placeBarUnder(contentEl, bar) {
  const parent = contentEl.parentNode;
  if (!parent) return;
  // Already correct
  if (contentEl.nextElementSibling === bar) return;
  parent.insertBefore(bar, contentEl.nextSibling);
}

/**
 * Attach / refresh a Read out loud control for a long-text content element.
 * Bar is inserted as **next** sibling (under the text) so content innerHTML paints are safe.
 *
 * @param {HTMLElement|null|undefined} contentEl
 * @param {{
 *   getText?: () => string,
 *   minChars?: number,
 *   toast?: (msg: string) => void,
 * }} [opts]
 */
export function attachReadAloud(contentEl, opts = {}) {
  if (!contentEl || typeof document === "undefined") return null;

  const getText =
    typeof opts.getText === "function"
      ? opts.getText
      : () => plainTextFromEl(contentEl);
  const minChars = Number.isFinite(opts.minChars) ? opts.minChars : MIN_CHARS;
  if (typeof opts.toast === "function") toastFn = opts.toast;

  let rec = hosts.get(contentEl);
  if (!rec) {
    const bar = document.createElement("div");
    bar.className = "read-aloud-bar";
    bar.hidden = true;
    if (contentEl.id) bar.dataset.readAloudFor = contentEl.id;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-ghost btn-sm btn-read-aloud";
    btn.setAttribute("aria-pressed", "false");
    setIconButton(btn, "idle");
    bar.appendChild(btn);

    placeBarUnder(contentEl, bar);

    rec = {
      contentEl,
      bar,
      btn,
      getText,
      minChars,
      lastText: "",
    };
    hosts.set(contentEl, rec);

    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      onHostClick(contentEl);
    });
  } else {
    rec.getText = getText;
    rec.minChars = minChars;
    // Migrate bars that were created above the content (older placement)
    placeBarUnder(contentEl, rec.bar);
  }

  refreshReadAloud(contentEl);
  return rec.bar;
}

/**
 * Re-evaluate visibility from current text; stop if active text changed.
 * @param {HTMLElement|null|undefined} contentEl
 */
/**
 * Drop hosts whose content node left the DOM (e.g. chat re-render).
 */
export function pruneDetachedReadAloud() {
  for (const [el, rec] of hosts) {
    if (el.isConnected) continue;
    if (activeContent === el) stopReadAloud();
    try {
      rec.bar.remove();
    } catch {
      /* already gone with parent */
    }
    hosts.delete(el);
  }
}

export function refreshReadAloud(contentEl) {
  const rec = contentEl && hosts.get(contentEl);
  if (!rec) return;

  const text = normalizeSpeakText(rec.getText());
  const hostHidden = Boolean(rec.contentEl.hidden);
  const show = !hostHidden && text.length >= rec.minChars;
  rec.bar.hidden = !show;

  if (activeContent === contentEl && rec.lastText && rec.lastText !== text) {
    stopReadAloud();
  }
  rec.lastText = text;

  if (!show && activeContent === contentEl) {
    stopReadAloud();
  }
}

/**
 * Stop any in-flight fetch / audio / browser speech and reset all buttons.
 */
export function stopReadAloud() {
  if (inflight) {
    try {
      inflight.abort();
    } catch {
      /* ignore */
    }
    inflight = null;
  }
  if (sharedAudio) {
    try {
      sharedAudio.pause();
      sharedAudio.removeAttribute("src");
      sharedAudio.load();
    } catch {
      /* ignore */
    }
  }
  if (typeof speechSynthesis !== "undefined") {
    try {
      speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  }
  if (playWaitResolve) {
    const r = playWaitResolve;
    playWaitResolve = null;
    try {
      r();
    } catch {
      /* ignore */
    }
  }
  activeContent = null;
  for (const rec of hosts.values()) {
    setBtnState(rec, "idle");
  }
}

/**
 * @param {HTMLElement} contentEl
 */
async function onHostClick(contentEl) {
  const rec = hosts.get(contentEl);
  if (!rec) return;

  if (activeContent === contentEl) {
    stopReadAloud();
    return;
  }

  const text = clampTtsText(rec.getText());
  if (text.length < rec.minChars) {
    refreshReadAloud(contentEl);
    return;
  }

  // Stop any other host first
  stopReadAloud();
  activeContent = contentEl;
  setBtnState(rec, "loading");

  try {
    await playCloudOrFallback(text, rec);
  } catch (e) {
    if (e?.name === "AbortError") return;
    console.warn("[read-aloud]", e?.message || e);
    notify(e?.message || "Could not read aloud.");
    if (activeContent === contentEl) {
      setBtnState(rec, "idle");
      activeContent = null;
    }
  }
}

/**
 * @param {string} text
 * @param {HostRecord} rec
 */
async function playCloudOrFallback(text, rec) {
  const key = cacheKeyFor(text);
  let url = audioCache.get(key);

  if (!url) {
    const ac = new AbortController();
    inflight = ac;
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          language: "en",
          clientSessionId: getClientSessionId(),
        }),
        signal: ac.signal,
      });

      if (res.status === 503 || res.status === 401) {
        // No cloud auth — browser fallback
        await playBrowserSpeech(text, rec);
        return;
      }

      if (!res.ok) {
        let msg = `TTS failed (${res.status})`;
        try {
          const j = await res.json();
          if (j?.error) msg = String(j.error);
        } catch {
          /* ignore */
        }
        // Try browser before giving up
        if (typeof speechSynthesis !== "undefined") {
          notify("Cloud voice unavailable — using device voice.");
          await playBrowserSpeech(text, rec);
          return;
        }
        throw new Error(msg);
      }

      const blob = await res.blob();
      url = URL.createObjectURL(blob);
      // Bound cache size
      if (audioCache.size > 24) {
        const first = audioCache.keys().next().value;
        const old = audioCache.get(first);
        audioCache.delete(first);
        if (old) {
          try {
            URL.revokeObjectURL(old);
          } catch {
            /* ignore */
          }
        }
      }
      audioCache.set(key, url);
    } finally {
      if (inflight === ac) inflight = null;
    }
  }

  if (activeContent !== rec.contentEl) return;

  const audio = ensureAudio();
  audio.src = url;
  setBtnState(rec, "playing");

  await new Promise((resolve, reject) => {
    playWaitResolve = () => {
      cleanup();
      resolve();
    };
    const onEnded = () => {
      cleanup();
      playWaitResolve = null;
      if (activeContent === rec.contentEl) {
        setBtnState(rec, "idle");
        activeContent = null;
      }
      resolve();
    };
    const onError = () => {
      cleanup();
      playWaitResolve = null;
      reject(new Error("Audio playback failed"));
    };
    const cleanup = () => {
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    const p = audio.play();
    if (p && typeof p.then === "function") {
      p.catch((err) => {
        cleanup();
        playWaitResolve = null;
        reject(err);
      });
    }
  });
}

/**
 * @param {string} text
 * @param {HostRecord} rec
 */
function playBrowserSpeech(text, rec) {
  return new Promise((resolve, reject) => {
    if (typeof speechSynthesis === "undefined" || typeof SpeechSynthesisUtterance === "undefined") {
      reject(new Error("Speech not available on this device"));
      return;
    }
    if (activeContent !== rec.contentEl) {
      resolve();
      return;
    }
    setBtnState(rec, "playing");
    playWaitResolve = () => resolve();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 1;
    u.onend = () => {
      playWaitResolve = null;
      if (activeContent === rec.contentEl) {
        setBtnState(rec, "idle");
        activeContent = null;
      }
      resolve();
    };
    u.onerror = (ev) => {
      playWaitResolve = null;
      if (ev?.error === "interrupted" || ev?.error === "canceled") {
        resolve();
        return;
      }
      reject(new Error("Device speech failed"));
    };
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  });
}

function ensureAudio() {
  if (!sharedAudio) {
    sharedAudio = new Audio();
    sharedAudio.preload = "auto";
  }
  return sharedAudio;
}

/**
 * Icon-only face + tooltip / aria-label for the full phrase.
 * @param {HTMLButtonElement} btn
 * @param {"idle"|"loading"|"playing"} state
 */
function setIconButton(btn, state) {
  if (state === "playing") {
    btn.innerHTML = ICON_STOP;
    btn.title = LABEL_STOP;
    btn.setAttribute("aria-label", LABEL_STOP);
    btn.setAttribute("aria-pressed", "true");
    btn.classList.remove("is-loading");
    return;
  }
  if (state === "loading") {
    btn.innerHTML = ICON_SPEAKER;
    btn.title = LABEL_LOADING;
    btn.setAttribute("aria-label", LABEL_LOADING);
    btn.setAttribute("aria-pressed", "false");
    btn.classList.add("is-loading");
    return;
  }
  btn.innerHTML = ICON_SPEAKER;
  btn.title = LABEL_IDLE;
  btn.setAttribute("aria-label", LABEL_IDLE);
  btn.setAttribute("aria-pressed", "false");
  btn.classList.remove("is-loading");
}

/**
 * @param {HostRecord} rec
 * @param {"idle"|"loading"|"playing"} state
 */
function setBtnState(rec, state) {
  const { btn } = rec;
  if (state === "loading") {
    btn.disabled = true;
    btn.setAttribute("aria-busy", "true");
    setIconButton(btn, "loading");
    return;
  }
  btn.disabled = false;
  btn.removeAttribute("aria-busy");
  setIconButton(btn, state === "playing" ? "playing" : "idle");
}

/**
 * @param {string} msg
 */
function notify(msg) {
  if (toastFn) {
    try {
      toastFn(msg);
      return;
    } catch {
      /* ignore */
    }
  }
  console.warn("[read-aloud]", msg);
}

/**
 * FNV-1a 32-bit hex for cache keys (not crypto).
 * @param {string} str
 */
function simpleHash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

/** @internal test helper — clear hosts/cache without DOM teardown */
export function _resetReadAloudForTests() {
  stopReadAloud();
  for (const url of audioCache.values()) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  }
  audioCache.clear();
  hosts.clear();
  sharedAudio = null;
  toastFn = null;
}

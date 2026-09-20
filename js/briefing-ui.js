/**
 * Quest briefing — captions + pager overlay Future Vision.
 * Walk: each beat swaps the same pane's still. Authored `imageUrl` wins, then
 * the theme postcard. Imagine only when a beat has `imagePrompt`. Does not
 * write those URLs into VisionRenderer.currentUrl.
 * Start inventing restores invent/pathway vision and a compact recap.
 * Invent column stays title + board (tools stay live).
 */

import { attachReadAloud, pruneDetachedReadAloud } from "./read-aloud.js";
import { escapeHtml, renderMarkdownSafe } from "./md-lite.js";
import { apiFetch } from "./auth.js";
import { getClientSessionId } from "./client-session.js";
import { dataUrlToBlobUrl } from "./vision.js";
import {
  briefBeatArtId,
  briefBeatAuthoredUrl,
  briefBeatImagePrompt,
  briefBeatStillUrl,
  briefBeatWantsImagine,
  captionMdFromBeatBody,
  compactRecapFromBeats,
  outcomeJobFromMission,
  resolveBriefBeats,
  splitMarkdownSections,
} from "./brief-beats.js";

const STORAGE_PREFIX = "ff.briefing.done.";
const SPEAK_MIN = 12;
const ART_CACHE_CAP = 24;

/** @type {WeakMap<HTMLElement, BriefingRecord>} */
const records = new WeakMap();

let lastPaint = null;
let keysBound = false;
let artGen = 0;

/** @type {Map<string, string>} */
const artCache = new Map();
/** @type {Map<string, Promise<string>>} */
const artInflight = new Map();

/**
 * @typedef {{
 *   visionRoot: HTMLElement,
 *   sceneEl: HTMLElement|null,
 *   missionId: string,
 *   fingerprint: string,
 *   beats: object[],
 *   briefMd: string,
 *   jobLine: string,
 *   place: string,
 *   globalId: string,
 *   index: number,
 *   mode: "walk" | "off",
 *   onChange: ((snap: BriefingSnapshot) => void) | null,
 * }} BriefingRecord
 */

/**
 * @typedef {{
 *   used: boolean,
 *   active: boolean,
 *   mode: string,
 *   index: number,
 *   beats: object[],
 *   beat: object | null,
 *   jobLine: string,
 *   missionId: string,
 * }} BriefingSnapshot
 */

export function briefingStorageKey(missionId) {
  const id = String(missionId || "").trim().slice(0, 80);
  if (!id) return "";
  return `${STORAGE_PREFIX}${id}`;
}

export function isBriefingDismissed(missionId, storage) {
  const key = briefingStorageKey(missionId);
  if (!key) return false;
  const store = storage || (typeof sessionStorage !== "undefined" ? sessionStorage : null);
  try {
    return store?.getItem?.(key) === "1";
  } catch {
    return false;
  }
}

export function setBriefingDismissed(missionId, done, storage) {
  const key = briefingStorageKey(missionId);
  if (!key) return;
  const store = storage || (typeof sessionStorage !== "undefined" ? sessionStorage : null);
  try {
    if (done) store?.setItem?.(key, "1");
    else store?.removeItem?.(key);
  } catch {
    /* private mode */
  }
}

export function lastBriefingPaint() {
  return lastPaint;
}

/** True when this Future Vision canvas is showing the cartoon walk. */
export function briefingOwnsRoot(root) {
  return Boolean(root?.classList?.contains?.("is-briefing"));
}

/** Left-column copy when there is no briefMd/scene walk. */
export function sceneCopyFromMission(mission) {
  return String(
    mission?.briefMd || mission?.scene || mission?.problem || mission?.description || ""
  ).trim();
}

/**
 * Persistent "Your job" in the challenge banner (solo + Friends). Skippers still see the outcome.
 * @param {HTMLElement|null|undefined} el
 * @param {object|null|undefined} mission
 * @param {{ summary?: string, beats?: object[] }} [opts]
 */
export function paintQuestJob(el, mission, opts = {}) {
  if (!el) return "";
  const line = outcomeJobFromMission(mission, opts);
  if (!line) {
    el.hidden = true;
    el.setAttribute?.("hidden", "");
    el.textContent = "";
    return "";
  }
  el.hidden = false;
  el.removeAttribute?.("hidden");
  el.innerHTML = `<span class="quest-job-kicker">Your job</span> ${escapeHtml(line)}`;
  return line;
}

/**
 * Drop overlay so a new Quest cannot inherit the previous one.
 * @param {{ missionId?: string, clearDismissed?: boolean, storage?: Storage }} [opts]
 */
export function resetQuestBriefing(opts = {}) {
  artGen += 1;
  lastPaint = emptySnap();
  if (typeof document !== "undefined") {
    document.querySelectorAll(".quest-briefing-overlay").forEach((el) => el.remove());
    document.querySelectorAll(".quest-briefing-replay").forEach((el) => el.remove());
    document.querySelectorAll(".vision-canvas-wrap.is-briefing").forEach((el) => {
      el.classList.remove("is-briefing");
      delete el.dataset.briefingKey;
      records.delete(el);
    });
    document
      .querySelectorAll(".challenge-banner.is-briefing-walk, .challenge-banner.is-briefing-recap")
      .forEach((el) => {
        el.classList.remove("is-briefing-walk", "is-briefing-recap");
      });
    document
      .querySelectorAll(
        ".quest-briefing-host, #ws-mission-scene, #hs-play-mission-scene, #mp-mission-scene"
      )
      .forEach((el) => {
        el.classList.remove("quest-briefing-host", "quest-brief");
        delete el.dataset.briefingKey;
        el.innerHTML = "";
        el.hidden = false;
      });
  }
  if (opts.clearDismissed) {
    clearAllBriefingDismissed(opts.storage);
  } else if (opts.missionId) {
    setBriefingDismissed(opts.missionId, false, opts.storage);
  }
}

function clearAllBriefingDismissed(storage) {
  const store =
    storage || (typeof sessionStorage !== "undefined" ? sessionStorage : null);
  if (!store?.key || typeof store.length !== "number") return;
  try {
    const keys = [];
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) keys.push(k);
    }
    for (const k of keys) store.removeItem(k);
  } catch {
    /* private mode */
  }
}

/**
 * Overlay captions on Future Vision. Left `sceneEl` is cleared (board stays).
 *
 * @param {HTMLElement|null|undefined} visionRoot — `.vision-canvas-wrap`
 * @param {object|null|undefined} mission
 * @param {{
 *   sceneEl?: HTMLElement|null,
 *   summary?: string,
 *   globalId?: string,
 *   onChange?: (snap: BriefingSnapshot) => void,
 *   storage?: Storage,
 * }} [opts]
 */
export function paintQuestBriefing(visionRoot, mission, opts = {}) {
  const empty = emptySnap();
  if (!visionRoot) {
    lastPaint = empty;
    return empty;
  }

  const briefMd = String(mission?.briefMd || "").trim();
  const scene = String(mission?.scene || "").trim();
  const sceneEl = opts.sceneEl || null;
  if (sceneEl) {
    sceneEl.innerHTML = "";
    sceneEl.hidden = true;
  }

  if (!briefMd && !scene) {
    unmountOverlay(visionRoot);
    lastPaint = empty;
    if (sceneEl) {
      sceneEl.hidden = false;
      sceneEl.textContent = sceneCopyFromMission(mission);
      sceneEl.closest?.(".challenge-banner")?.classList?.remove?.(
        "is-briefing-walk",
        "is-briefing-recap"
      );
    }
    return empty;
  }

  const beats = resolveBriefBeats(mission, {
    summary: opts.summary,
    title: mission?.title,
  });
  if (!beats.length) {
    unmountOverlay(visionRoot);
    lastPaint = empty;
    if (sceneEl) {
      sceneEl.hidden = false;
      sceneEl.textContent = scene || mission?.problem || mission?.description || "";
    }
    return empty;
  }

  const missionId = String(mission?.id || "").trim() || "quest";
  const fingerprint = `${missionId}|${beats.map((b) => b.id).join(",")}`;
  const jobLine = outcomeJobFromMission(mission, {
    summary: opts.summary,
    title: mission?.title,
    beats,
    encourageCopy: mission?.spotlight?.encourageCopy,
  });
  const place = String(mission?.place || "").trim();
  const globalId = String(opts.globalId || mission?.globalId || "").trim();
  const dismissed = isBriefingDismissed(missionId, opts.storage);

  let rec = records.get(visionRoot);
  if (!rec || rec.fingerprint !== fingerprint) {
    rec = {
      visionRoot,
      sceneEl,
      missionId,
      fingerprint,
      beats,
      briefMd: briefMd || scene,
      jobLine,
      place,
      globalId,
      index: 0,
      mode: dismissed ? "off" : "walk",
      onChange: typeof opts.onChange === "function" ? opts.onChange : null,
    };
    records.set(visionRoot, rec);
    bindHost(visionRoot);
  } else {
    rec.beats = beats;
    rec.briefMd = briefMd || scene;
    rec.jobLine = jobLine;
    rec.place = place;
    rec.globalId = globalId;
    rec.missionId = missionId;
    rec.sceneEl = sceneEl;
    if (typeof opts.onChange === "function") rec.onChange = opts.onChange;
  }

  if (rec.index >= rec.beats.length) rec.index = Math.max(0, rec.beats.length - 1);
  if (rec.index < 0) rec.index = 0;

  paintDom(rec);
  bindKeys();
  if (rec.mode === "walk") requestBeatArt(rec, rec.index, true);
  const snap = snapshot(rec);
  lastPaint = snap;
  return snap;
}

function emptySnap() {
  return {
    used: false,
    active: false,
    mode: "",
    index: 0,
    beats: [],
    beat: null,
    jobLine: "",
    missionId: "",
  };
}

function snapshot(rec) {
  const beat = rec.mode === "walk" ? rec.beats[rec.index] || null : null;
  return {
    used: true,
    active: rec.mode === "walk",
    mode: rec.mode,
    index: rec.index,
    beats: rec.beats,
    beat,
    jobLine: rec.jobLine,
    missionId: rec.missionId,
  };
}

function unmountOverlay(root) {
  if (!root) return;
  root.querySelectorAll(".quest-briefing-overlay").forEach((el) => el.remove());
  root.classList.remove("is-briefing");
  delete root.dataset.briefingKey;
  records.delete(root);
  removeReplayChip(root);
  const banner =
    root.closest?.(".workshop-layout")?.querySelector?.(".challenge-banner") || null;
  banner?.classList?.remove?.("is-briefing-walk", "is-briefing-recap");
}

function clearBriefing(el) {
  if (!el) return;
  el.querySelectorAll?.(".quest-briefing-overlay")?.forEach?.((n) => n.remove());
  el.classList.remove("quest-briefing-host", "quest-brief", "is-briefing");
  delete el.dataset.briefingKey;
  records.delete(el);
}

function bindHost(root) {
  if (root.dataset.briefingBound === "1") return;
  root.dataset.briefingBound = "1";
  root.addEventListener("click", (ev) => {
    const btn = ev.target?.closest?.("[data-brief]");
    if (!btn || !root.contains(btn)) return;
    ev.preventDefault();
    const rec = records.get(root);
    if (!rec) return;
    onBriefAction(rec, btn.getAttribute("data-brief"), btn.getAttribute("data-brief-i"));
  });
}

function bindKeys() {
  if (keysBound || typeof document === "undefined") return;
  keysBound = true;
  document.addEventListener("keydown", (ev) => {
    if (ev.defaultPrevented || ev.altKey || ev.ctrlKey || ev.metaKey) return;
    const tag = String(ev.target?.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return;
    if (ev.target?.isContentEditable) return;
    const rec = activeWalkRecord();
    if (!rec) return;
    if (ev.key === "ArrowRight" || ev.key === " ") {
      ev.preventDefault();
      step(rec, 1);
    } else if (ev.key === "ArrowLeft") {
      ev.preventDefault();
      step(rec, -1);
    }
  });
}

function activeWalkRecord() {
  if (typeof document === "undefined") return null;
  for (const el of document.querySelectorAll(".vision-canvas-wrap.is-briefing")) {
    const rec = records.get(el);
    if (rec?.mode === "walk" && el.offsetParent !== null) return rec;
  }
  return null;
}

function onBriefAction(rec, action, indexRaw) {
  switch (action) {
    case "back":
      step(rec, -1);
      break;
    case "next":
      step(rec, 1);
      break;
    case "done":
    case "invent":
      rec.mode = "off";
      setBriefingDismissed(rec.missionId, true);
      commit(rec);
      break;
    case "replay":
      rec.mode = "walk";
      rec.index = 0;
      setBriefingDismissed(rec.missionId, false);
      commit(rec);
      break;
    case "dot": {
      const i = Number(indexRaw);
      if (Number.isInteger(i) && i >= 0 && i < rec.beats.length) {
        rec.mode = "walk";
        rec.index = i;
        commit(rec);
      }
      break;
    }
    default:
      break;
  }
}

function step(rec, delta) {
  if (rec.mode !== "walk") return;
  const next = rec.index + delta;
  if (next < 0) return;
  if (next >= rec.beats.length) {
    rec.mode = "off";
    setBriefingDismissed(rec.missionId, true);
    commit(rec);
    return;
  }
  rec.index = next;
  commit(rec);
}

function commit(rec) {
  paintDom(rec);
  if (rec.mode === "walk") requestBeatArt(rec, rec.index, true);
  const snap = snapshot(rec);
  lastPaint = snap;
  try {
    rec.onChange?.(snap);
  } catch {
    /* ignore */
  }
}

function bannerFromRec(rec) {
  const fromScene = rec?.sceneEl?.closest?.(".challenge-banner");
  if (fromScene) return fromScene;
  return rec?.visionRoot?.closest?.(".workshop-layout")?.querySelector?.(".challenge-banner") || null;
}

function syncBannerMode(rec) {
  const banner = bannerFromRec(rec);
  if (!banner?.classList) return;
  const walk = rec.mode === "walk";
  const recap = rec.mode === "off";
  banner.classList.toggle("is-briefing-walk", walk);
  banner.classList.toggle("is-briefing-recap", recap);
}

function paintDom(rec) {
  const root = rec.visionRoot;
  const paintKey = `${rec.fingerprint}|${rec.mode}|${rec.index}`;
  syncBannerMode(rec);

  if (rec.mode === "off") {
    root.querySelectorAll(".quest-briefing-overlay").forEach((el) => el.remove());
    root.classList.remove("is-briefing");
    root.dataset.briefingKey = paintKey;
    paintLeftBrief(rec);
    ensureReplayChip(rec);
    pruneDetachedReadAloud();
    return;
  }

  if (rec.sceneEl) {
    rec.sceneEl.innerHTML = "";
    rec.sceneEl.hidden = true;
    rec.sceneEl.classList.remove("quest-brief");
  }
  removeReplayChip(root);
  root.classList.add("is-briefing");
  if (root.dataset.briefingKey === paintKey && root.querySelector(".quest-briefing-overlay")) {
    return;
  }
  root.dataset.briefingKey = paintKey;

  let overlay = root.querySelector(".quest-briefing-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "quest-briefing-overlay";
    root.appendChild(overlay);
  }
  overlay.innerHTML = renderWalk(rec);

  pruneDetachedReadAloud();
  const speak = overlay.querySelector(".quest-briefing-speak");
  if (speak) attachReadAloud(speak, { minChars: SPEAK_MIN });
}

/**
 * Compact recap in the invent column; full story stays behind a disclosure.
 * @param {BriefingRecord} rec
 */
function paintLeftBrief(rec) {
  const el = rec.sceneEl;
  if (!el) return;
  el.hidden = false;
  el.classList.add("quest-brief");
  el.classList.remove("quest-briefing-host");
  el.innerHTML = renderRecap(rec);
  const speak = el.querySelector(".quest-brief-recap-speak");
  if (speak) attachReadAloud(speak, { minChars: SPEAK_MIN });
  const full = el.querySelector(".quest-brief-full-body");
  if (full) attachReadAloud(full, { minChars: SPEAK_MIN });
}

function recapSection(title, body) {
  const text = String(body || "").trim();
  if (!text) return "";
  return `<section class="quest-brief-recap-item">
      <h3 class="quest-brief-recap-title">${escapeHtml(title)}</h3>
      <p>${escapeHtml(text)}</p>
    </section>`;
}

/**
 * Full-story markdown without Your job — the banner already has that line.
 * @param {string} [briefMd]
 */
function essayWithoutJob(briefMd) {
  const sections = splitMarkdownSections(briefMd).filter((s) => s.role !== "job");
  if (!sections.length) return "";
  return sections
    .map((s) => {
      const heading = s.title ? `## ${s.title}` : "";
      return [heading, s.body].filter(Boolean).join("\n\n");
    })
    .join("\n\n")
    .trim();
}

function renderRecap(rec) {
  const recap = compactRecapFromBeats(rec.beats);
  const sections =
    recapSection("The place", recap.place) +
    recapSection("The bigger problem", recap.strain);
  const essay = essayWithoutJob(rec.briefMd);
  const full = essay
    ? `<details class="quest-brief-full">
        <summary>Read the whole story</summary>
        <div class="quest-brief-full-body">${renderMarkdownSafe(essay)}</div>
      </details>`
    : "";
  return `<div class="quest-brief-recap">
      <div class="quest-brief-recap-speak">${sections}</div>
      ${full}
    </div>`;
}

function ensureReplayChip(rec) {
  const bar = rec.visionRoot.closest(".side-pane")?.querySelector(".vision-stage-bar");
  if (!bar) return;
  let btn = bar.querySelector(".quest-briefing-replay");
  if (!btn) {
    btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-ghost btn-sm quest-briefing-replay";
    btn.setAttribute("data-brief", "replay");
    btn.textContent = "Replay briefing";
    bar.appendChild(btn);
    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      const live = records.get(rec.visionRoot);
      if (live) onBriefAction(live, "replay", null);
    });
  }
  btn.hidden = false;
}

function removeReplayChip(root) {
  const bar = root?.closest?.(".side-pane")?.querySelector(".vision-stage-bar");
  bar?.querySelectorAll(".quest-briefing-replay").forEach((el) => el.remove());
}

function renderWalk(rec) {
  const n = rec.beats.length;
  const i = rec.index;
  const beat = rec.beats[i];
  const last = i >= n - 1;
  const dots = rec.beats
    .map(
      (b, di) =>
        `<button type="button" class="quest-briefing-dot${
          di === i ? " is-active" : ""
        }" data-brief="dot" data-brief-i="${di}" aria-label="Beat ${di + 1}: ${escapeHtml(
          b.title || ""
        )}" ${di === i ? 'aria-current="step"' : ""}></button>`
    )
    .join("");
  const caption = overlayCaptionHtml(beat);
  const kicker = beat?.title
    ? `<div class="quest-briefing-kicker"><span class="quest-briefing-title">${escapeHtml(
        beat.title
      )}</span></div>`
    : "";
  return `${kicker}<div class="quest-briefing-speak">
      <div class="quest-briefing-body" aria-live="polite">${caption}</div>
    </div>
    <div class="quest-briefing-nav">
      <div class="quest-briefing-pager">
        <button type="button" class="quest-briefing-arrow" data-brief="back" ${
          i === 0 ? "disabled" : ""
        } aria-label="Previous">&lt;</button>
        <div class="quest-briefing-dots" role="tablist" aria-label="Briefing steps">${dots}</div>
        <button type="button" class="quest-briefing-arrow" data-brief="${
          last ? "invent" : "next"
        }" aria-label="${last ? "Start inventing" : "Next"}">&gt;</button>
      </div>
      ${
        last
          ? `<button type="button" class="quest-briefing-invent" data-brief="invent">Start inventing</button>`
          : `<span class="quest-briefing-invent-spacer" aria-hidden="true"></span>`
      }
    </div>`;
}

function overlayCaptionHtml(beat) {
  const raw = String(beat?.bodyMd || "").trim();
  if (!raw) return "";
  const md = captionMdFromBeatBody(raw);
  const parts = md.split(/\n\s*\n/).filter(Boolean).slice(0, 4);
  return renderMarkdownSafe(parts.join("\n\n"));
}

function artIdFor(rec, beat) {
  if (!beat) return "";
  return briefBeatArtId({
    missionId: rec.missionId,
    beatId: beat.id,
    place: rec.place,
  });
}

function requestBeatArt(rec, index, prefetchNext = false) {
  if (typeof document === "undefined") return;
  const beat = rec.beats[index];
  if (!beat || rec.mode !== "walk") return;
  const authored = briefBeatAuthoredUrl(beat);
  if (authored) {
    applyCartoonFrame(rec, index, authored);
  } else {
    const cached = artCache.get(artIdFor(rec, beat));
    if (cached) {
      applyCartoonFrame(rec, index, cached);
    } else {
      const fallback = briefBeatStillUrl(beat, { globalId: rec.globalId });
      if (fallback) applyCartoonFrame(rec, index, fallback);
      if (briefBeatWantsImagine(beat)) {
        fetchBeatArt(
          artIdFor(rec, beat),
          briefBeatImagePrompt(beat, { place: rec.place })
        ).then((url) => {
          if (url) applyCartoonFrame(rec, index, url);
        });
      }
    }
  }
  if (prefetchNext && index + 1 < rec.beats.length) {
    const next = rec.beats[index + 1];
    const nextAuthored = briefBeatAuthoredUrl(next);
    if (nextAuthored) {
      prefetchStillUrl(nextAuthored);
    } else if (next && briefBeatWantsImagine(next) && !artCache.has(artIdFor(rec, next))) {
      fetchBeatArt(
        artIdFor(rec, next),
        briefBeatImagePrompt(next, { place: rec.place })
      );
    } else if (next) {
      const nextStill = briefBeatAuthoredUrl(next) || briefBeatStillUrl(next, { globalId: rec.globalId });
      if (nextStill) prefetchStillUrl(nextStill);
    }
  }
}

function prefetchStillUrl(url) {
  const src = String(url || "").trim();
  if (!src || typeof Image === "undefined") return;
  const pre = new Image();
  pre.src = src;
}

function stillSrcForDisplay(url) {
  const src = String(url || "").trim();
  if (!src) return "";
  if (!src.startsWith("data:")) return src;
  return dataUrlToBlobUrl(src) || "";
}

function rememberArt(id, url) {
  if (!id || !url) return;
  const prev = artCache.get(id);
  if (prev && prev.startsWith("blob:") && prev !== url) {
    try {
      URL.revokeObjectURL(prev);
    } catch {
      /* ignore */
    }
  }
  artCache.set(id, url);
  while (artCache.size > ART_CACHE_CAP) {
    const oldest = artCache.keys().next().value;
    const oldUrl = artCache.get(oldest);
    artCache.delete(oldest);
    if (oldUrl && String(oldUrl).startsWith("blob:")) {
      try {
        URL.revokeObjectURL(oldUrl);
      } catch {
        /* ignore */
      }
    }
  }
}

function fetchBeatArt(id, prompt) {
  if (!id) return Promise.resolve("");
  if (artCache.has(id)) return Promise.resolve(artCache.get(id) || "");
  const hit = artInflight.get(id);
  if (hit) return hit;
  const gen = artGen;
  const pending = (async () => {
    try {
      const res = await apiFetch("/api/idea-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          prompt,
          kind: "brief",
          clientSessionId: getClientSessionId(),
        }),
      });
      const data = await res.json();
      const url = data?.ok && data.imageUrl ? String(data.imageUrl) : "";
      const display = stillSrcForDisplay(url);
      if (gen !== artGen) return "";
      if (display) rememberArt(id, display);
      return display;
    } catch {
      return "";
    } finally {
      artInflight.delete(id);
    }
  })();
  artInflight.set(id, pending);
  return pending;
}

/**
 * Show this beat's frame on Future Vision without touching VisionRenderer.currentUrl.
 * @param {BriefingRecord} rec
 * @param {number} index
 * @param {string} url
 */
function applyCartoonFrame(rec, index, url) {
  const src = stillSrcForDisplay(url);
  if (!src) return;
  if (records.get(rec.visionRoot) !== rec) return;
  if (rec.mode !== "walk" || rec.index !== index) return;
  const img = rec.visionRoot.querySelector(".vision-image");
  if (!img) return;
  const ph = rec.visionRoot.querySelector(".vision-placeholder");
  if (ph) ph.hidden = true;
  const loading = rec.visionRoot.querySelector(".vision-loading");
  if (loading) loading.hidden = true;
  img.hidden = false;
  if (img.getAttribute("src") === src) return;

  const swap = () => {
    if (records.get(rec.visionRoot) !== rec) return;
    if (rec.mode !== "walk" || rec.index !== index) return;
    if (img.getAttribute("src") === src) {
      img.classList.remove("is-briefing-fade");
      return;
    }
    img.classList.add("is-briefing-fade");
    const show = () => img.classList.remove("is-briefing-fade");
    img.onload = show;
    img.src = src;
    if (img.complete) show();
  };

  if (typeof Image === "undefined" || src.startsWith("data:") || src.startsWith("blob:")) {
    swap();
    return;
  }
  const pre = new Image();
  pre.onload = swap;
  pre.onerror = swap;
  pre.src = src;
  if (pre.complete) swap();
}

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
 * Public quest taste marks. Down, up, and love (two thumbs).
 * Eligibility is local until a signed-in player reports the finished briefing.
 * Counts come only from a successful Cloud tally read.
 */

import { apiFetch, isClerkSignedIn, openCloudSignIn } from "./auth.js";

const BRIEFED_KEY = "future-forge:briefedQuests";
const QUEST_ID_RE = /^[A-Za-z0-9._:-]{1,120}$/;
const MAX_BRIEFED = 500;

/** @type {Map<string, { down: number, up: number, love: number, mine: string|null, loaded: boolean }>} */
const tallies = new Map();
/** @type {Set<string>} */
const postedBriefed = new Set();
/** Bumped when a vote is sent so an older tally read cannot paint over it. */
let tallyRevision = 0;
/** @type {(message: string) => void} */
let notify = () => {};

const MARKS = [
  { id: "down", label: "Not for me" },
  { id: "up", label: "I like this" },
  { id: "love", label: "Love this" },
];

/**
 * @param {(message: string) => void} fn
 */
export function setQuestRatingNotifier(fn) {
  notify = typeof fn === "function" ? fn : () => {};
}

/**
 * @returns {Storage|null}
 */
function defaultStore() {
  try {
    if (typeof localStorage !== "undefined" && localStorage) return localStorage;
  } catch {
    /* private mode */
  }
  return null;
}

/**
 * @param {unknown} raw
 * @returns {string}
 */
function questId(raw) {
  const id = String(raw || "").trim();
  return QUEST_ID_RE.test(id) ? id : "";
}

/**
 * @param {string} s
 */
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;"
  );
}

function thumbSvg(down) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"${
    down ? ' class="is-down"' : ""
  }><path d="M8.2 10.2V20H5.4A1.4 1.4 0 0 1 4 18.6v-7A1.4 1.4 0 0 1 5.4 10.2h2.8zm1.3 9.8h6.3a2 2 0 0 0 2-1.55l1.3-5.7a1.7 1.7 0 0 0-1.66-2.08H14V6.4c0-1.15-.78-2.15-1.9-2.35-.48-.08-.86.32-.72.78L9.5 10.4v9.6z"/></svg>`;
}

function markIcon(id) {
  if (id === "down") return thumbSvg(true);
  if (id === "love") {
    return `<span class="quest-rate-love" aria-hidden="true">${thumbSvg(false)}${thumbSvg(false)}</span>`;
  }
  return thumbSvg(false);
}

/**
 * @param {Storage|null|undefined} [storage]
 * @returns {string[]}
 */
export function readBriefedQuestIds(storage) {
  const store = storage === undefined ? defaultStore() : storage;
  if (!store) return [];
  try {
    const parsed = JSON.parse(store.getItem(BRIEFED_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    const out = [];
    const seen = new Set();
    for (const item of parsed) {
      const id = questId(item);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * @param {string} missionId
 * @param {Storage|null|undefined} [storage]
 */
export function isQuestBriefed(missionId, storage) {
  const id = questId(missionId);
  if (!id) return false;
  return readBriefedQuestIds(storage).includes(id);
}

/**
 * Remember that this player finished the briefing. Replay does not undo it.
 * Posts to the account once per page when already signed in.
 * @param {string} missionId
 * @param {{ storage?: Storage|null, post?: boolean }} [opts]
 * @returns {boolean}
 */
export function markQuestBriefed(missionId, opts = {}) {
  const id = questId(missionId);
  if (!id) return false;
  const store = opts.storage === undefined ? defaultStore() : opts.storage;
  if (store) {
    const ids = readBriefedQuestIds(store);
    if (!ids.includes(id)) {
      ids.push(id);
      try {
        store.setItem(BRIEFED_KEY, JSON.stringify(ids.slice(-MAX_BRIEFED)));
      } catch {
        /* private mode */
      }
    }
  }
  if (opts.post !== false) void postBriefedIfSignedIn(id);
  return true;
}

/**
 * @param {string} id
 */
async function postBriefedIfSignedIn(id) {
  if (!isClerkSignedIn() || postedBriefed.has(id)) return;
  postedBriefed.add(id);
  try {
    const res = await apiFetch(`/api/me/quests/${encodeURIComponent(id)}/briefed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    if (!res.ok) postedBriefed.delete(id);
  } catch {
    postedBriefed.delete(id);
  }
}

/**
 * @param {string} id
 * @returns {{ down: number, up: number, love: number, mine: string|null, loaded: boolean }}
 */
export function cachedQuestTally(id) {
  return (
    tallies.get(id) || { down: 0, up: 0, love: 0, mine: null, loaded: false }
  );
}

/**
 * @param {string} id
 * @param {{ down?: number, up?: number, love?: number, mine?: string|null, loaded?: boolean }} tally
 */
export function rememberQuestTally(id, tally) {
  const key = questId(id);
  if (!key) return;
  tallies.set(key, {
    down: Number(tally.down) || 0,
    up: Number(tally.up) || 0,
    love: Number(tally.love) || 0,
    mine: tally.mine || null,
    loaded: Boolean(tally.loaded),
  });
}

/**
 * @param {{
 *   questId: string,
 *   tally?: { down?: number, up?: number, love?: number, mine?: string|null, loaded?: boolean },
 *   eligible?: boolean,
 *   signedIn?: boolean,
 *   large?: boolean,
 * }} opts
 */
export function ratingControlHtml(opts) {
  const id = questId(opts.questId);
  if (!id) return "";
  const tally = opts.tally || cachedQuestTally(id);
  const loaded = Boolean(tally.loaded);
  const down = Number(tally.down) || 0;
  const up = Number(tally.up) || 0;
  const love = Number(tally.love) || 0;
  const counts = { down, up, love };
  const total = down + up + love;
  const peak = Math.max(down, up, love);
  const mine = tally.mine || null;
  const eligible = opts.eligible ?? isQuestBriefed(id);
  const signedIn = opts.signedIn ?? isClerkSignedIn();
  const buttons = MARKS.map((mark) => {
    const count = counts[mark.id];
    const leading = loaded && peak > 0 && count === peak;
    const selected = mine === mark.id;
    const countHtml = loaded
      ? `<span class="quest-rate-count">${count}</span>`
      : "";
    const label = loaded ? `${mark.label}, ${count}` : mark.label;
    const classes = [
      "quest-rate-btn",
      selected ? "is-mine" : "",
      leading ? "is-leading" : "",
      eligible ? "" : "is-locked",
    ]
      .filter(Boolean)
      .join(" ");
    if (!eligible) {
      return `<span class="${classes}" title="Finish the briefing to rate."><span class="visually-hidden">${esc(
        mark.label
      )}</span>${markIcon(mark.id)}${countHtml}</span>`;
    }
    const title = signedIn ? mark.label : "Sign in to rate";
    return `<button type="button" class="${classes}" data-rate="${mark.id}" aria-pressed="${
      selected ? "true" : "false"
    }" aria-label="${esc(label)}" title="${esc(title)}">${markIcon(mark.id)}${countHtml}</button>`;
  }).join("");
  const note =
    loaded && total === 0
      ? `<p class="quest-rate-note">No ratings yet</p>`
      : "";
  const kicker = opts.large
    ? `<p class="quest-rate-kicker">Rate this Quest</p>`
    : "";
  return `<div class="quest-rate${opts.large ? " quest-rate--lg" : ""}" data-quest-rate="${esc(
    id
  )}" data-eligible="${eligible ? "1" : "0"}" data-loaded="${loaded ? "1" : "0"}">${kicker}<div class="quest-rate-row" role="group" aria-label="${
    eligible ? "Rate this Quest" : "Quest ratings. Finish the briefing to rate."
  }">${buttons}</div>${note}</div>`;
}

/**
 * @param {string[]} ids
 */
export async function fetchQuestRatings(ids) {
  const clean = [];
  const seen = new Set();
  for (const raw of ids || []) {
    const id = questId(raw);
    if (!id || seen.has(id) || clean.length >= 80) continue;
    seen.add(id);
    clean.push(id);
  }
  if (!clean.length) return { ok: true, ratings: {} };
  try {
    const res = await apiFetch(`/api/quests/ratings?ids=${clean.join(",")}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ratings) return { ok: false };
    return { ok: true, ratings: data.ratings };
  } catch {
    return { ok: false };
  }
}

/**
 * @param {ParentNode|null|undefined} root
 */
export async function refreshQuestRatingHosts(root) {
  if (!root?.querySelectorAll) return;
  const hosts = [...root.querySelectorAll("[data-quest-rate]")];
  const ids = [...new Set(hosts.map((host) => questId(host.getAttribute("data-quest-rate"))))].filter(Boolean);
  if (!ids.length) return;
  const revision = tallyRevision;
  const result = await fetchQuestRatings(ids);
  if (!result.ok || revision !== tallyRevision) return;
  for (const id of ids) {
    const row = result.ratings[id] || {};
    rememberQuestTally(id, {
      down: row.down,
      up: row.up,
      love: row.love,
      mine: Object.prototype.hasOwnProperty.call(row, "mine") ? row.mine : null,
      loaded: true,
    });
  }
  repaintQuestRatings(root, ids);
}

/**
 * @param {ParentNode} root
 * @param {string[]} ids
 */
function repaintQuestRatings(root, ids) {
  for (const id of ids) {
    const sel = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(id) : id.replace(/"/g, "");
    root.querySelectorAll(`[data-quest-rate="${sel}"]`).forEach((host) => {
      const large = host.classList?.contains("quest-rate--lg");
      const eligible = host.getAttribute("data-eligible") === "1";
      const html = ratingControlHtml({ questId: id, large, eligible });
      host.outerHTML = html;
    });
  }
}

/**
 * @param {string} questIdRaw
 * @param {"down"|"up"|"love"} choice
 */
export async function submitQuestRating(questIdRaw, choice) {
  const id = questId(questIdRaw);
  if (!id || !MARKS.some((mark) => mark.id === choice)) {
    return { ok: false, error: "invalid_rating" };
  }
  const current = cachedQuestTally(id).mine;
  const rating = current === choice ? null : choice;
  const revision = ++tallyRevision;
  try {
    const res = await apiFetch(`/api/me/quests/${encodeURIComponent(id)}/rating`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, status: res.status, error: data.error || "rating_failed" };
    }
    if (revision !== tallyRevision) return { ok: true };
    const tally = {
      down: Number(data.down) || 0,
      up: Number(data.up) || 0,
      love: Number(data.love) || 0,
      mine: data.mine || null,
      loaded: true,
    };
    rememberQuestTally(id, tally);
    return { ok: true, tally };
  } catch {
    return { ok: false, error: "rating_failed" };
  }
}

/**
 * @param {Document} doc
 */
export function bindQuestRatingClicks(doc) {
  if (!doc?.addEventListener || doc.documentElement?.dataset.questRateBound === "1") return;
  if (doc.documentElement) doc.documentElement.dataset.questRateBound = "1";
  doc.addEventListener("click", (ev) => {
    const btn = ev.target?.closest?.("[data-rate]");
    const host = btn?.closest?.("[data-quest-rate]");
    if (!btn || !host || host.getAttribute("data-eligible") !== "1") return;
    ev.preventDefault();
    ev.stopPropagation();
    const id = host.getAttribute("data-quest-rate") || "";
    const choice = btn.getAttribute("data-rate") || "";
    if (!isClerkSignedIn()) {
      openCloudSignIn();
      return;
    }
    if (host.getAttribute("data-pending") === "1") return;
    host.setAttribute("data-pending", "1");
    void submitQuestRating(id, choice).then((result) => {
      if (!result.ok) {
        host.removeAttribute("data-pending");
        if (result.status === 401) openCloudSignIn();
        else if (result.error === "briefing_required") notify("Finish the briefing to rate.");
        else notify("Could not save that rating.");
        return;
      }
      if (doc.querySelectorAll) repaintQuestRatings(doc, [id]);
    });
  });
}

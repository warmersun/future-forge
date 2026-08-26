/**
 * Per-quest leaderboard: eligibility, rank, submit parse, still caps.
 */

import { sanitizeQuestId } from "./cloud-save.mjs";
import { questHasLeaderboard as clientHasBoard } from "../cloud/quest-board.js";

export const STILL_TOP_K = 3;
export const STILL_MAX_BYTES = 1_500_000;
export const PATHWAY_TEXT_MAX = 4000;
export const STACK_MAX = 12;
export const BOARD_LIMIT = 20;

export function isPlausibleYear(year) {
  const y = Number(year);
  return Number.isInteger(y) && y >= 2020 && y <= 2200;
}

/**
 * Lower year (earlier hold) wins, then more stars, then fewer waits.
 * @param {{ yearReached?: number|null, stars?: number|null, waits?: number|null }} row
 */
export function scoreTuple(row) {
  const year = Number.isFinite(Number(row?.yearReached)) ? Number(row.yearReached) : 9999;
  const stars = Number.isFinite(Number(row?.stars)) ? Number(row.stars) : 0;
  const waits = Number.isFinite(Number(row?.waits)) ? Number(row.waits) : 9999;
  return [year, -stars, waits];
}

/**
 * True if `a` should replace `b` (strictly better). Equal keeps existing.
 * @param {object} a
 * @param {object} b
 */
export function isBetterScore(a, b) {
  if (!b) return true;
  const ta = scoreTuple(a);
  const tb = scoreTuple(b);
  for (let i = 0; i < ta.length; i++) {
    if (ta[i] < tb[i]) return true;
    if (ta[i] > tb[i]) return false;
  }
  return false;
}

/**
 * @param {unknown} raw
 */
export function sanitizeDisplayName(raw) {
  const s = String(raw || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 40);
  if (!s || s.includes("@")) return "Inventor";
  return s;
}

/**
 * @param {object[]} rows
 * @param {{ userId?: string|null, limit?: number }} [opts]
 */
export function rankBoard(rows, opts = {}) {
  const list = (Array.isArray(rows) ? rows : []).map((r, i) => ({ ...r, _i: i }));
  list.sort((a, b) => {
    if (isBetterScore(a, b)) return -1;
    if (isBetterScore(b, a)) return 1;
    return a._i - b._i;
  });
  const limit = Math.min(50, Math.max(1, Number(opts.limit) || BOARD_LIMIT));
  const top = list.slice(0, limit).map((r, idx) => ({
    rank: idx + 1,
    displayName: r.displayName || r.display_name || "Inventor",
    yearReached: r.yearReached ?? r.year_reached ?? null,
    stars: r.stars ?? 0,
    waits: r.waits ?? 0,
    clerkUserId: r.clerkUserId || r.clerk_user_id || null,
  }));
  const uid = opts.userId || null;
  let you = null;
  if (uid) {
    const idx = list.findIndex((r) => (r.clerkUserId || r.clerk_user_id) === uid);
    if (idx >= 0) {
      const r = list[idx];
      you = {
        rank: idx + 1,
        displayName: r.displayName || r.display_name || "Inventor",
        yearReached: r.yearReached ?? r.year_reached ?? null,
        stars: r.stars ?? 0,
        waits: r.waits ?? 0,
        clerkUserId: r.clerkUserId || r.clerk_user_id || uid,
      };
    }
  }
  return { top, you };
}

export function questHasLeaderboard(questId) {
  const id = sanitizeQuestId(questId);
  if (!id) return false;
  return clientHasBoard(id);
}

export function clipPathwayText(raw) {
  return String(raw || "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, PATHWAY_TEXT_MAX);
}

export function sanitizeStack(raw) {
  const list = Array.isArray(raw) ? raw : [];
  const out = [];
  const seen = new Set();
  for (const item of list) {
    if (out.length >= STACK_MAX) break;
    const id = sanitizeQuestId(item);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/**
 * @param {unknown} body
 * @param {string} expectedQuestId
 */
export function parseQuestScoreBody(body, expectedQuestId) {
  const src = body && typeof body === "object" ? body : {};
  const questId = sanitizeQuestId(src.questId || src.quest_id || expectedQuestId);
  if (!questId || !questHasLeaderboard(questId)) {
    return { ok: false, error: "no_board" };
  }
  if (expectedQuestId && questId !== expectedQuestId) {
    return { ok: false, error: "wrong_quest" };
  }
  const runId =
    typeof src.runId === "string" && /^[0-9a-f-]{36}$/i.test(src.runId.trim())
      ? src.runId.trim()
      : null;
  if (!runId) return { ok: false, error: "run_required" };
  return {
    ok: true,
    row: {
      questId,
      runId,
      displayName: sanitizeDisplayName(src.displayName || src.display_name),
      place: String(src.place || "").trim().slice(0, 200),
      stack: sanitizeStack(src.stack),
      pathwayText: clipPathwayText(src.pathwayText || src.pathway_text),
    },
  };
}

/**
 * Copy year/stars/waits from the owned run. Ignore client score fields.
 */
export function bindQuestScoreFromRun(parsed, owned) {
  if (!parsed?.ok || !parsed.row) return { ok: false, error: "run_required" };
  if (!owned) return { ok: false, error: "run_required" };
  const questId = String(owned.quest_id || owned.questId || "");
  if (questId !== parsed.row.questId) return { ok: false, error: "run_required" };
  const outcome = String(owned.outcome || "");
  if (outcome !== "hold" && outcome !== "partial") {
    return { ok: false, error: "hold_required" };
  }
  const yearReached = owned.year_reached ?? owned.yearReached;
  if (!isPlausibleYear(yearReached)) return { ok: false, error: "impossible_year" };
  const starsRaw = Number(owned.stars);
  const waitsRaw = Number(owned.waits);
  return {
    ok: true,
    row: {
      ...parsed.row,
      yearReached: Math.trunc(Number(yearReached)),
      stars: Number.isFinite(starsRaw) ? Math.max(0, Math.min(5, Math.trunc(starsRaw))) : 0,
      waits: Number.isFinite(waitsRaw) ? Math.max(0, Math.min(10_000, Math.trunc(waitsRaw))) : 0,
      place: parsed.row.place || owned.place || "",
      stack: parsed.row.stack,
      pathwayText: parsed.row.pathwayText,
    },
  };
}

/**
 * @param {{ top: object[], you: object|null }} board
 * @param {Set<string>|string[]} stillUserIds
 * @param {object[]} [scoreRows] full rows with pathwayText
 */
export function attachBoardExtras(board, stillUserIds, scoreRows = []) {
  const stills = stillUserIds instanceof Set ? stillUserIds : new Set(stillUserIds || []);
  const byUser = new Map();
  for (const r of scoreRows) {
    const id = r.clerkUserId || r.clerk_user_id;
    if (id) byUser.set(id, r);
  }
  const decorate = (row) => {
    if (!row) return row;
    const id = row.clerkUserId;
    const src = (id && byUser.get(id)) || {};
    return {
      ...row,
      hasStill: Boolean(id && stills.has(id)),
      pathwayText: src.pathwayText || src.pathway_text || row.pathwayText || "",
      place: src.place || row.place || "",
      stack: src.stack || row.stack || [],
    };
  };
  return {
    top: (board.top || []).map(decorate),
    you: decorate(board.you),
  };
}

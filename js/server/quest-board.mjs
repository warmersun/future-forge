/**
 * Per-quest leaderboard: eligibility, rank, submit parse, still caps.
 */

import { sanitizeQuestId } from "./cloud-save.mjs";
import { questHasLeaderboard as clientHasBoard } from "../cloud/quest-board.js";

export const STILL_TOP_K = 3;
export const STILL_MAX_BYTES = 1_500_000;
export const PATHWAY_TEXT_MAX = 4000;
export const STACK_MAX = 12;
export const BOARD_LIMIT = 10;

export function isPlausibleYear(year) {
  const y = Number(year);
  return Number.isInteger(y) && y >= 2020 && y <= 2200;
}

/**
 * Honesty of the hold (stars). Collapse never ranks.
 * @param {{ stars?: number|null }} row
 */
export function holdWeight(row) {
  const stars = Number(row?.stars);
  return Number.isFinite(stars) ? Math.max(0, stars) : 0;
}

/**
 * Years from the quest's present to the hold. Same-year hold counts as 1
 * (never divide by zero).
 * @param {{ yearReached?: number|null, startYear?: number|null }} row
 */
export function yearsTaken(row) {
  const solved = Number(row?.yearReached ?? row?.year_reached);
  const present = Number(row?.startYear ?? row?.start_year);
  if (!Number.isFinite(solved)) return 1;
  if (!Number.isFinite(present)) return 1;
  return Math.max(1, Math.trunc(solved) - Math.trunc(present));
}

/**
 * stars × 1/years. Integer cross-multiply elsewhere so ranking stays exact.
 * @param {object} row
 */
export function boardScore(row) {
  return holdWeight(row) / yearsTaken(row);
}

export function formatBoardScore(row) {
  const s = boardScore(row);
  if (!Number.isFinite(s)) return "0";
  return String(Math.round(s * 1000) / 1000);
}

/**
 * True if `a` should replace `b` (strictly better). Equal keeps existing.
 * Product score first (hold / years); waits only break ties.
 * @param {object} a
 * @param {object} b
 */
export function isBetterScore(a, b) {
  if (!b) return true;
  const left = holdWeight(a) * yearsTaken(b);
  const right = holdWeight(b) * yearsTaken(a);
  if (left > right) return true;
  if (left < right) return false;
  const wa = Number.isFinite(Number(a?.waits)) ? Number(a.waits) : 9999;
  const wb = Number.isFinite(Number(b?.waits)) ? Number(b.waits) : 9999;
  return wa < wb;
}

export function scoreTuple(row) {
  const waits = Number.isFinite(Number(row?.waits)) ? Number(row.waits) : 9999;
  return [-boardScore(row), waits];
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
  const publicRow = (r, rank) => ({
    rank,
    displayName: r.displayName || r.display_name || "Inventor",
    score: boardScore(r),
    startYear: r.startYear ?? r.start_year ?? null,
    yearReached: r.yearReached ?? r.year_reached ?? null,
    stars: r.stars ?? 0,
    waits: r.waits ?? 0,
    years: yearsTaken(r),
    clerkUserId: r.clerkUserId || r.clerk_user_id || null,
  });
  const top = list.slice(0, limit).map((r, idx) => publicRow(r, idx + 1));
  const uid = opts.userId || null;
  let you = null;
  if (uid) {
    const idx = list.findIndex((r) => (r.clerkUserId || r.clerk_user_id) === uid);
    if (idx >= 0) you = publicRow(list[idx], idx + 1);
  }
  return { top, you };
}

/**
 * One row per inventor: sum of per-quest scores (★ / years).
 * Tie-break: more quests, then fewer waits.
 * @param {object[]} rows quest_scores rows
 */
export function aggregatePlayers(rows) {
  const byUser = new Map();
  for (const r of Array.isArray(rows) ? rows : []) {
    const id = r.clerkUserId || r.clerk_user_id;
    if (!id) continue;
    const cur = byUser.get(id) || {
      clerkUserId: id,
      displayName: "Inventor",
      score: 0,
      waits: 0,
      quests: 0,
      _i: byUser.size,
    };
    cur.score += boardScore(r);
    cur.waits += Number.isFinite(Number(r.waits)) ? Number(r.waits) : 0;
    cur.quests += 1;
    const name = sanitizeDisplayName(r.displayName || r.display_name);
    if (name && name !== "Inventor") cur.displayName = name;
    byUser.set(id, cur);
  }
  return [...byUser.values()];
}

/**
 * @param {object} a
 * @param {object} b
 */
export function isBetterPlayer(a, b) {
  if (!b) return true;
  const sa = Number(a?.score) || 0;
  const sb = Number(b?.score) || 0;
  if (sa > sb) return true;
  if (sa < sb) return false;
  const qa = Number(a?.quests) || 0;
  const qb = Number(b?.quests) || 0;
  if (qa > qb) return true;
  if (qa < qb) return false;
  const wa = Number.isFinite(Number(a?.waits)) ? Number(a.waits) : 9999;
  const wb = Number.isFinite(Number(b?.waits)) ? Number(b.waits) : 9999;
  return wa < wb;
}

/**
 * @param {object[]} rows quest_scores rows
 * @param {{ userId?: string|null, limit?: number }} [opts]
 */
export function rankPlayers(rows, opts = {}) {
  const list = aggregatePlayers(rows);
  list.sort((a, b) => {
    if (isBetterPlayer(a, b)) return -1;
    if (isBetterPlayer(b, a)) return 1;
    return a._i - b._i;
  });
  const limit = Math.min(50, Math.max(1, Number(opts.limit) || BOARD_LIMIT));
  const publicRow = (r, rank) => ({
    rank,
    displayName: r.displayName || "Inventor",
    score: r.score,
    quests: r.quests,
    waits: r.waits,
    clerkUserId: r.clerkUserId || null,
  });
  const top = list.slice(0, limit).map((r, idx) => publicRow(r, idx + 1));
  const uid = opts.userId || null;
  let you = null;
  if (uid) {
    const idx = list.findIndex((r) => r.clerkUserId === uid);
    if (idx >= 0) you = publicRow(list[idx], idx + 1);
  }
  return { kind: "players", top, you };
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
 * startYear is the quest present (catalog), not client-supplied.
 * @param {{ ok?: boolean, row?: object }} parsed
 * @param {object|null} owned
 * @param {{ startYear?: number|null }} [opts]
 */
export function bindQuestScoreFromRun(parsed, owned, opts = {}) {
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
  const solved = Math.trunc(Number(yearReached));
  let startYear = opts.startYear ?? owned.start_year ?? owned.startYear;
  if (!isPlausibleYear(startYear) || Math.trunc(Number(startYear)) > solved) {
    startYear = solved;
  } else {
    startYear = Math.trunc(Number(startYear));
  }
  const starsRaw = Number(owned.stars);
  const waitsRaw = Number(owned.waits);
  return {
    ok: true,
    row: {
      ...parsed.row,
      yearReached: solved,
      startYear,
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

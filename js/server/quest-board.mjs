/**
 * Per-quest leaderboard: eligibility, submit parse, still caps.
 * Ranking tuples live in daily.mjs (scoreTuple / isBetterScore / rankBoard).
 */

import { sanitizeQuestId } from "./cloud-save.mjs";
import { sanitizeDisplayName, bindDailyScoreFromRun } from "./daily.mjs";
import { questHasLeaderboard as clientHasBoard } from "../cloud/quest-board.js";

export const STILL_TOP_K = 3;
export const STILL_MAX_BYTES = 1_500_000;
export const PATHWAY_TEXT_MAX = 4000;
export const STACK_MAX = 12;

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
  const bound = bindDailyScoreFromRun(parsed, owned);
  if (!bound.ok) return bound;
  return {
    ok: true,
    row: {
      ...bound.row,
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

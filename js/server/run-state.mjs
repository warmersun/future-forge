/**
 * C3 continue-board: slim snapshot, no data-URL art.
 */

import { sanitizeQuestId } from "./cloud-save.mjs";
import { boardForWire } from "../hex/board-state.js";

export const RUN_STATE_MAX_BYTES = 120_000;

function looksInline(s) {
  return typeof s === "string" && s.startsWith("data:");
}

/**
 * @param {unknown} body
 * @returns {{ ok: true, state: object } | { ok: false, error: string }}
 */
export function parseRunStateBody(body) {
  const src = body && typeof body === "object" ? body : {};
  const questId = sanitizeQuestId(src.questId || src.quest_id);
  if (!questId) return { ok: false, error: "invalid_quest" };
  let board = src.board && typeof src.board === "object" ? src.board : null;
  if (board) {
    try {
      board = boardForWire(board);
    } catch {
      board = null;
    }
  }
  const year = Number(src.year);
  const state = {
    questId,
    year: Number.isFinite(year) ? Math.trunc(year) : null,
    tutor: Boolean(src.tutor),
    runId: typeof src.runId === "string" ? src.runId.slice(0, 40) : null,
    board,
  };
  const raw = JSON.stringify(state);
  if (raw.length > RUN_STATE_MAX_BYTES) return { ok: false, error: "too_large" };
  if (looksInline(raw)) return { ok: false, error: "inline_art" };
  return { ok: true, state };
}

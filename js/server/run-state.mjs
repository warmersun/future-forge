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

/**
 * Apply a GET /api/me/run-state snapshot onto live play fields.
 * Callers must skip seedFromMission when skipSeed is true, skip POST /api/me/runs/start
 * when skipNewRun is true, then paint the hex workshop from live.hexBoard.
 *
 * @param {{ cloudRunId?: string|null, hexBoard?: object|null, year?: number, tutorSessionActive?: boolean }} live
 * @param {{ runId?: string|null, board?: object|null, year?: number|null, tutor?: boolean }} snapshot
 */
export function applyContinueSnapshot(live, snapshot) {
  const next = {
    cloudRunId: live?.cloudRunId ?? null,
    hexBoard: live?.hexBoard ?? null,
    year: live?.year ?? null,
    tutorSessionActive: Boolean(live?.tutorSessionActive),
    skipSeed: false,
    skipNewRun: false,
  };
  if (!snapshot || typeof snapshot !== "object") return next;
  next.skipNewRun = true;
  if (snapshot.runId) next.cloudRunId = String(snapshot.runId);
  if (snapshot.board && typeof snapshot.board === "object") {
    next.hexBoard = snapshot.board;
    next.skipSeed = true;
  }
  const y = Number(snapshot.year);
  if (Number.isFinite(y)) next.year = Math.trunc(y);
  if (typeof snapshot.tutor === "boolean") next.tutorSessionActive = snapshot.tutor;
  return next;
}

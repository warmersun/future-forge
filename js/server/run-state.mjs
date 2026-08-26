/**
 * C3 continue: workshop snapshot (hex + invent panel + chats). No data-URL art.
 */

import { sanitizeQuestId } from "./cloud-save.mjs";
import { boardForWire } from "../hex/board-state.js";

export const RUN_STATE_MAX_BYTES = 400_000;
export const CHAT_LANE_MAX = 80;
export const CHAT_CONTENT_MAX = 4000;
export const PLAY_STRING_MAX = 8000;
export const TECH_IDS_MAX = 24;

function looksInline(s) {
  return typeof s === "string" && s.startsWith("data:");
}

function clipStr(raw, max) {
  if (raw == null) return "";
  return String(raw).slice(0, max);
}

function optionalInt(raw, min, max) {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  if (i < min || i > max) return null;
  return i;
}

function sanitizeTechIds(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  const seen = new Set();
  for (const item of raw) {
    if (out.length >= TECH_IDS_MAX) break;
    const id = sanitizeQuestId(item);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function sanitizePressure(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  try {
    const json = JSON.stringify(raw);
    if (json.length > 8_000 || looksInline(json)) return null;
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * @param {unknown} raw
 * @returns {object|null}
 */
export function sanitizePlay(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const sideTab = raw.sideTab === "coinventor" ? "coinventor" : "vision";
  const play = {
    inventionName: clipStr(raw.inventionName, 200),
    inventionHow: clipStr(raw.inventionHow, PLAY_STRING_MAX),
    inventionImpact: clipStr(raw.inventionImpact, PLAY_STRING_MAX),
    selectedTechIds: sanitizeTechIds(raw.selectedTechIds),
    learnOrder: sanitizeTechIds(raw.learnOrder),
    domainFilter: clipStr(raw.domainFilter || "all", 40) || "all",
    sideTab,
    waits: optionalInt(raw.waits, 0, 99),
    turn: optionalInt(raw.turn, 0, 200),
    pressure: sanitizePressure(raw.pressure),
    ap: optionalInt(raw.ap, 0, 20),
    apMax: optionalInt(raw.apMax, 1, 20),
    budget: optionalInt(raw.budget, 0, 99),
    will: optionalInt(raw.will, 0, 99),
    tutorSessionActive: Boolean(raw.tutorSessionActive),
  };
  return play;
}

function sanitizeLane(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    if (out.length >= CHAT_LANE_MAX) break;
    if (!item || typeof item !== "object") continue;
    const role = item.role === "assistant" ? "assistant" : item.role === "user" ? "user" : null;
    if (!role) continue;
    let content = clipStr(item.content, CHAT_CONTENT_MAX);
    if (looksInline(content) || content.includes("data:image")) continue;
    out.push({ role, content });
  }
  return out;
}

/**
 * @param {unknown} raw
 * @returns {object|null}
 */
export function sanitizeChats(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const active =
    raw.activeHistoryKey === "tutor" || raw.activeHistoryKey === "coinventor"
      ? raw.activeHistoryKey
      : "coinventor";
  return {
    tutor: sanitizeLane(raw.tutor),
    coinventor: sanitizeLane(raw.coinventor),
    activeHistoryKey: active,
  };
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
    play: sanitizePlay(src.play),
    chats: sanitizeChats(src.chats),
  };
  const raw = JSON.stringify(state);
  if (raw.length > RUN_STATE_MAX_BYTES) return { ok: false, error: "too_large" };
  if (looksInline(raw) || raw.includes("data:image")) return { ok: false, error: "inline_art" };
  return { ok: true, state };
}

export { applyContinueSnapshot } from "../cloud/continue.js";

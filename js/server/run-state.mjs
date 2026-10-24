/**
 * C3 continue: workshop snapshot (hex + invent panel + chats). No data-URL art.
 */

import { sanitizeQuestId } from "./cloud-save.mjs";
import { boardForWire } from "../hex/board-state.js";
import { parseCompanion } from "../companion.js";
import { BANK_PIN_MAX_BYTES, isRefId } from "../companion-context.js";
import { validatePredictionsBank } from "../sim/world-foresight.js";
import { prepareRunWorld } from "../sim/run-world.js";
import { validateContinueWorld } from "../cloud/continue.js";

function validPackageRef(ref, questId) {
  const id = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/;
  return ref && typeof ref === "object" && !Array.isArray(ref) &&
    typeof ref.packageId === "string" && id.test(ref.packageId) &&
    typeof ref.questId === "string" && id.test(ref.questId) &&
    typeof ref.revision === "string" && /^sha256:[0-9a-f]{64}$/.test(ref.revision) &&
    (!questId || ref.questId === questId);
}

function refForWire(ref) {
  return { packageId: ref.packageId, revision: ref.revision, questId: ref.questId };
}

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
/**
 * Theme-generated missions are not in GET /api/quests. Keep a stub so Continue
 * can start without the hosted catalog.
 * @param {unknown} raw
 */
export function sanitizeMissionStub(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const id = sanitizeQuestId(raw.id);
  if (!id) return null;
  const stub = {
    id,
    globalId: clipStr(raw.globalId, 80) || null,
    title: clipStr(raw.title, 200),
    place: clipStr(raw.place, 200),
    scene: clipStr(raw.scene, PLAY_STRING_MAX),
    startYear: optionalInt(raw.startYear, 2020, 2200),
    collapseYear: optionalInt(raw.collapseYear, 2020, 2300),
    yearsPerTurn: optionalInt(raw.yearsPerTurn, 1, 10),
    pressure: sanitizePressure(raw.pressure),
    pressureRise: sanitizePressure(raw.pressureRise),
    winMax: sanitizePressure(raw.winMax),
    pressureDesc: sanitizePressure(raw.pressureDesc),
    suggested: sanitizeTechIds(raw.suggested),
    source: clipStr(raw.source, 40) || "play",
    isLearningModule: Boolean(raw.isLearningModule),
  };
  if (raw.predictionBankId != null) {
    if (!isRefId(raw.predictionBankId)) stub.packageRefError = "package_dependency_missing";
    else stub.predictionBankId = raw.predictionBankId;
  }
  if (raw.packageRef != null) {
    if (!validPackageRef(raw.packageRef, id)) stub.packageRefError = "package_reference_forbidden";
    else stub.packageRef = refForWire(raw.packageRef);
  }
  if (raw.runWorld?.trust === "local-import") {
    const pinned = sanitizePinnedBank(raw.runWorld.bank);
    const ready = prepareRunWorld(raw, { year: raw.startYear });
    if (pinned.error) stub.predictionsBankError = pinned.error;
    else if (!ready.ok) stub.packageRefError = ready.error;
    else stub.runWorld = ready.world;
  }
  if (Array.isArray(raw.crisisRoles)) {
    stub.crisisRoles = raw.crisisRoles.map((x) => clipStr(x, 40)).filter(Boolean).slice(0, 8);
  }
  if (typeof raw.module === "string") stub.module = clipStr(raw.module, 120);
  if (raw.lesson != null) stub.lesson = optionalInt(raw.lesson, 0, 99);
  if (raw.totalLessons != null) stub.totalLessons = optionalInt(raw.totalLessons, 0, 99);
  const access = raw.access === "open" || raw.access === "account" || raw.access === "paid" ? raw.access : "";
  if (access) stub.access = access;
  if (raw.companion && typeof raw.companion === "object" && !Array.isArray(raw.companion)) {
    const parsed = parseCompanion(raw.companion, { access: access || "open" });
    if (parsed.ok) stub.companion = parsed.value;
    else if (raw.companion.exploration?.premise?.mode === "assumed") stub.packageRefError = "legacy_world_unresolved";
  }
  if (typeof raw.grounding === "string") {
    const grounding = raw.grounding.trim().slice(0, 3000);
    if (grounding && !looksInline(grounding)) stub.grounding = grounding;
  }
  return stub;
}

function sanitizePinnedBank(raw) {
  if (raw == null) return { bank: null, error: null };
  if (typeof raw !== "object" || Array.isArray(raw)) return { bank: null, error: "bank_invalid" };
  let json = "";
  try {
    json = JSON.stringify(raw);
  } catch {
    return { bank: null, error: "bank_invalid" };
  }
  if (looksInline(json)) return { bank: null, error: "bank_invalid" };
  if (Buffer.byteLength(json, "utf8") > BANK_PIN_MAX_BYTES) return { bank: null, error: "bank_too_large" };
  const validated = validatePredictionsBank(raw);
  if (!validated.ok || !validated.bank) return { bank: null, error: "bank_invalid" };
  return { bank: validated.bank, error: null };
}

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
    mission: sanitizeMissionStub(raw.mission),
    focusedTechId: sanitizeQuestId(raw.focusedTechId),
    ideas: sanitizeIdeaCache(raw.ideas),
    sparkBatches: sanitizeSparkBatches(raw.sparkBatches),
  };
  const suppliedRef = raw.packageRef ?? play.mission?.packageRef;
  if (suppliedRef != null) {
    if (!validPackageRef(suppliedRef, play.mission?.id)) play.packageRefError = "package_reference_forbidden";
    else if (play.mission?.packageRef && JSON.stringify(refForWire(suppliedRef)) !== JSON.stringify(play.mission.packageRef)) {
      play.packageRefError = "package_reference_forbidden";
    } else if (play.mission?.runWorld?.trust !== "local-import") play.packageRef = refForWire(suppliedRef);
  }
  const pinned = sanitizePinnedBank(raw.predictionsBank);
  if (pinned.error) play.predictionsBankError = pinned.error;
  else if (pinned.bank && !play.packageRef) play.predictionsBank = pinned.bank;
  if (typeof raw.reflection === "string") {
    const reflection = clipStr(raw.reflection, 2000);
    if (reflection.trim() && !looksInline(reflection)) play.reflection = reflection;
  }
  return play;
}

function sanitizeIdeaCache(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out = {};
  let n = 0;
  for (const [key, list] of Object.entries(raw)) {
    if (n >= 20) break;
    const k = clipStr(key, 200);
    if (!k || looksInline(k)) continue;
    if (!Array.isArray(list)) continue;
    const ideas = [];
    for (const item of list.slice(0, 6)) {
      if (!item || typeof item !== "object") continue;
      const title = clipStr(item.title, 80);
      const insert = clipStr(item.insertText || item.howText || item.blurb, 400);
      if (!title) continue;
      let imagePrompt = clipStr(item.imagePrompt, 400);
      if (looksInline(imagePrompt) || imagePrompt.includes("data:image")) imagePrompt = "";
      ideas.push({
        id: clipStr(item.id, 80) || `idea-${ideas.length}`,
        title,
        blurb: clipStr(item.blurb || insert, 160),
        insertText: insert,
        howText: clipStr(item.howText, 400),
        imagePrompt,
      });
    }
    if (!ideas.length) continue;
    out[k] = ideas;
    n += 1;
  }
  return Object.keys(out).length ? out : null;
}

function sanitizeSparkBatches(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out = {};
  let n = 0;
  for (const [techId, batch] of Object.entries(raw)) {
    if (n >= 24) break;
    const id = sanitizeQuestId(techId);
    if (!id || !batch || typeof batch !== "object") continue;
    const ids = Array.isArray(batch.ids)
      ? batch.ids.map((x) => clipStr(x, 80)).filter(Boolean).slice(0, 12)
      : [];
    const titles = Array.isArray(batch.titles)
      ? batch.titles.map((x) => clipStr(x, 80)).filter(Boolean).slice(0, 12)
      : [];
    if (!ids.length) continue;
    out[id] = { ids, titles };
    n += 1;
  }
  return Object.keys(out).length ? out : null;
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
  // A previously failed snapshot is not a fresh legacy game. Keep its failure
  // explicit rather than dropping the marker and allowing a default calendar.
  const savedWorld = validateContinueWorld(src);
  if (!savedWorld.ok) return { ok: false, error: savedWorld.error };
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
  const error = state.play?.packageRefError || state.play?.mission?.packageRefError ||
    state.play?.predictionsBankError || state.play?.mission?.predictionsBankError;
  if (error) return { ok: false, error };
  const ref = state.play?.packageRef || state.play?.mission?.packageRef;
  if (ref && ref.questId !== questId) return { ok: false, error: "package_reference_forbidden" };
  if (!ref && state.play?.mission?.companion?.exploration?.premise?.mode === "assumed") {
    const restored = prepareRunWorld(state.play.mission, { restoring: true,
      restoreBank: state.play.mission.runWorld?.bank || state.play.predictionsBank, year: state.year });
    if (!restored.ok) return { ok: false, error: restored.error };
  }
  const cleaned = stripDataDeep(state);
  const raw = JSON.stringify(cleaned);
  if (Buffer.byteLength(raw, "utf8") > RUN_STATE_MAX_BYTES) return { ok: false, error: "too_large" };
  return { ok: true, state: cleaned };
}

function stripDataDeep(value) {
  if (typeof value === "string") {
    if (value.startsWith("data:") || /data:image/i.test(value)) return "";
    return value;
  }
  if (Array.isArray(value)) return value.map(stripDataDeep);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = stripDataDeep(v);
    return out;
  }
  return value;
}

export { applyContinueSnapshot } from "../cloud/continue.js";

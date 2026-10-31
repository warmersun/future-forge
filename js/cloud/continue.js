/**
 * C3 continue: apply a GET /api/me/run-state snapshot onto live play fields.
 * Browser-safe. Server parse/strip lives in js/server/run-state.mjs.
 *
 * Callers must skip seedFromMission when skipSeed is true, skip POST /api/me/runs/start
 * when skipNewRun is true, then paint the hex workshop from live.hexBoard and overlay play/chats.
 */

import { boardForWire } from "../hex/board-state.js?v=crisis-role-3";
import { normalizeMission } from "../mission-normalize.js";
import { prepareRunWorld } from "../sim/run-world.js";
import { parseCompanion } from "../companion.js";
import { legacyWorldUnresolved } from "../companion-context.js";

const LEGACY_WORLD_ERRORS = new Set([
  "legacy_world_unresolved", "saved_bank_missing", "saved_bank_invalid",
  "bank_invalid", "bank_too_large", "bank_mismatch", "missing_row",
]);

/** Validate the raw save BEFORE catalog normalization or any live-state changes.
 * A replacement catalog companion must never hide a malformed saved premise.
 * Package references are resolved separately by resolvePackageContinueMission.
 */
export function validateContinueWorld(snapshot, fallbackMission = null) {
  const saved = snapshot?.play?.mission || snapshot?.mission;
  const ref = snapshot?.packageRef || snapshot?.play?.packageRef || saved?.packageRef;
  const error = snapshot?.play?.packageRefError || snapshot?.play?.predictionsBankError ||
    saved?.packageRefError || saved?.predictionsBankError;
  if (error) {
    if (!ref && LEGACY_WORLD_ERRORS.has(error)) return legacyWorldUnresolved();
    return { ok: false, error: String(error), message: "The saved world is unavailable. Preserve or export the save for recovery; retry the same release or start a new run separately." };
  }
  if (ref) return { ok: true };
  const mission = saved?.companion ? saved : fallbackMission || saved;
  if (mission?.companion?.exploration?.premise?.mode !== "assumed") return { ok: true };
  const companion = parseCompanion(mission.companion, { access: mission.access || "open" });
  if (!companion.ok) return legacyWorldUnresolved();
  const play = snapshot?.play;
  // An explicitly present invalid/null bank cannot fall through to another copy.
  const restoreBank = play && Object.hasOwn(play, "predictionsBank")
    ? play.predictionsBank : snapshot?.predictionsBank;
  return prepareRunWorld({ ...mission, companion: companion.value }, {
    restoring: true, restoreBank, year: snapshot?.year ?? mission.startYear,
  });
}

function sameRef(a, b) {
  return a && b && a.packageId === b.packageId && a.revision === b.revision && a.questId === b.questId;
}

/** Use the server-resolved mission, or fetch the exact saved revision. Never
 * overlay a saved stub onto authoritative package contents or use today's ID match.
 * Local imports remain local and do not request official package authority.
 */
export async function resolvePackageContinueMission(snapshot, fetchTile) {
  const saved = snapshot?.play?.mission;
  const ref = snapshot?.packageRef || snapshot?.play?.packageRef || saved?.packageRef;
  const idRe = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/;
  if (!ref || typeof ref.packageId !== "string" || !idRe.test(ref.packageId) ||
      typeof ref.questId !== "string" || !idRe.test(ref.questId) ||
      typeof ref.revision !== "string" || !/^sha256:[0-9a-f]{64}$/.test(ref.revision) ||
      ref.questId !== snapshot?.questId) return null;
  const local = saved?.runWorld?.trust === "local-import";
  if (saved?.id === snapshot.questId && sameRef(ref, saved.packageRef)) {
    const ready = prepareRunWorld(saved, { year: snapshot.year });
    if (ready.ok && (local || ready.world.trust === "official")) {
      return normalizeMission(saved, saved.globalId);
    }
  }
  if (local) return null;
  const tile = await fetchTile(snapshot.questId, structuredClone(ref));
  const authoritative = tile?.mission;
  if (!authoritative || authoritative.id !== snapshot.questId || !sameRef(ref, authoritative.packageRef)) return null;
  const ready = prepareRunWorld(authoritative, { year: snapshot.year });
  if (!ready.ok || ready.world.trust !== "official") return null;
  return normalizeMission(authoritative, authoritative.globalId);
}

export function slimMissionForContinue(m) {
  if (!m?.id) return null;
  return {
    id: m.id,
    ...(m.packageRefError ? { packageRefError: m.packageRefError } : {}),
    ...(m.predictionsBankError ? { predictionsBankError: m.predictionsBankError } : {}),
    ...(m.predictionBankId != null ? { predictionBankId: structuredClone(m.predictionBankId) } : {}),
    ...(m.packageRef != null ? { packageRef: structuredClone(m.packageRef) } : {}),
    // Imported packages are not official releases; retain their local world.
    ...(m.runWorld?.trust === "local-import" ? { runWorld: structuredClone(m.runWorld) } : {}),
    globalId: m.globalId || null,
    title: m.title || "",
    place: m.place || "",
    scene: m.scene || "",
    startYear: m.startYear,
    collapseYear: m.collapseYear,
    yearsPerTurn: m.yearsPerTurn,
    pressure: m.pressure,
    pressureRise: m.pressureRise,
    winMax: m.winMax,
    pressureDesc: m.pressureDesc,
    crisisRoles: m.crisisRoles,
    suggested: m.suggested,
    source: m.source || "play",
    isLearningModule: Boolean(m.isLearningModule),
    module: m.module,
    lesson: m.lesson,
    totalLessons: m.totalLessons,
    ...(m.access === "open" || m.access === "account" || m.access === "paid"
      ? { access: m.access }
      : {}),
    ...(typeof m.grounding === "string" && m.grounding && !m.grounding.startsWith("data:")
      ? { grounding: m.grounding.slice(0, 3000) }
      : {}),
    ...(m.companion && typeof m.companion === "object" ? { companion: m.companion } : {}),
  };
}


function isInlineDataString(s) {
  if (typeof s !== "string" || !s) return false;
  return s.startsWith("data:") || /data:image/i.test(s);
}

/** Drop data: / data:image strings so Continue PUT never sends Imagine stills. */
export function stripInlineData(value) {
  if (typeof value === "string") return isInlineDataString(value) ? "" : value;
  if (Array.isArray(value)) return value.map(stripInlineData);
  if (value && typeof value === "object") {
    const out = Array.isArray(value) ? [] : {};
    for (const [k, v] of Object.entries(value)) out[k] = stripInlineData(v);
    return out;
  }
  return value;
}

/**
 * Client PUT body: wire-safe board (no data-URL art) + stripped play/chats.
 * @param {object} raw
 */
export function snapshotForWire(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  let board = src.board && typeof src.board === "object" ? src.board : null;
  if (board) {
    try {
      board = boardForWire(board);
    } catch {
      board = null;
    }
  }
  const play = src.play && typeof src.play === "object" ? { ...src.play } : null;
  if (play?.mission?.id) play.mission = slimMissionForContinue(play.mission);
  const officialRef = play?.mission?.runWorld?.trust === "local-import"
    ? null : play?.packageRef || play?.mission?.packageRef;
  if (officialRef) {
    play.packageRef = structuredClone(officialRef);
    delete play.predictionsBank;
    delete play.runWorld;
  }
  return stripInlineData({
    ...src,
    board,
    play,
    chats: src.chats && typeof src.chats === "object" ? src.chats : null,
  });
}

/**
 * @param {{ cloudRunId?: string|null, hexBoard?: object|null, year?: number, tutorSessionActive?: boolean }} live
 * @param {{ runId?: string|null, board?: object|null, year?: number|null, tutor?: boolean, play?: object|null, chats?: object|null }} snapshot
 */
export function applyContinueSnapshot(live, snapshot) {
  const next = {
    cloudRunId: live?.cloudRunId ?? null,
    hexBoard: live?.hexBoard ?? null,
    year: live?.year ?? null,
    tutorSessionActive: Boolean(live?.tutorSessionActive),
    skipSeed: false,
    skipNewRun: false,
    play: null,
    chats: null,
  };
  if (!snapshot || typeof snapshot !== "object") return next;
  const checked = validateContinueWorld(snapshot);
  if (!checked.ok) return { ...next, error: checked.error, message: checked.message };
  next.skipNewRun = true;
  if (snapshot.runId) next.cloudRunId = String(snapshot.runId);
  if (snapshot.board && typeof snapshot.board === "object") {
    next.hexBoard = snapshot.board;
    next.skipSeed = true;
  }
  const y = Number(snapshot.year);
  if (Number.isFinite(y)) next.year = Math.trunc(y);
  if (typeof snapshot.tutor === "boolean") next.tutorSessionActive = snapshot.tutor;
  if (snapshot.play && typeof snapshot.play === "object") next.play = snapshot.play;
  if (snapshot.chats && typeof snapshot.chats === "object") next.chats = snapshot.chats;
  if (typeof snapshot.play?.tutorSessionActive === "boolean") {
    next.tutorSessionActive = snapshot.play.tutorSessionActive;
  }
  return next;
}

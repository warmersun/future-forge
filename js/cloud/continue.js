/**
 * C3 continue: apply a GET /api/me/run-state snapshot onto live play fields.
 * Browser-safe. Server parse/strip lives in js/server/run-state.mjs.
 *
 * Callers must skip seedFromMission when skipSeed is true, skip POST /api/me/runs/start
 * when skipNewRun is true, then paint the hex workshop from live.hexBoard and overlay play/chats.
 */

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

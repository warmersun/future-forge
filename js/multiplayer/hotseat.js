/**
 * Hotseat — pass-and-play wrapper around mp-session (rev 6 coopetition).
 * Client-only; no server.
 */

import {
  createMpLobby,
  setMpMission,
  startMpMission,
  setFirstPlayer,
  applyMpAction,
  activeSeat,
  activeSeatId,
  activeForge,
  getOpenTable,
  MIN_PLAYERS,
  MAX_PLAYERS,
} from "../sim/mp-session.js";

/**
 * @param {string[]} names
 */
export function createHotseatSession(names = ["Alex", "Bea"]) {
  const session = createMpLobby(names, { mode: "hotseat" });
  // Clamp 2–6
  if (session.seats.length < MIN_PLAYERS) {
    /* createMpLobby pads */
  }
  return session;
}

export { activeSeat, activeSeatId, activeForge, getOpenTable, MIN_PLAYERS, MAX_PLAYERS };

export function rotateSeat(session, delta = 1) {
  // Manual pass without End Turn is discouraged; still allow for device handoff UI
  // that mirrors end_turn when the player is done.
  if (!session?.seatOrder?.length) return session;
  const n = session.seatOrder.length;
  const next = ((session.activeIndex + delta) % n + n) % n;
  // Prefer applyMpAction end_turn for proper AP refill — this is display-only rotate if not started
  if (!session.place) {
    return { ...session, activeIndex: next };
  }
  // If mission started, use end_turn semantics via apply
  const r = applyMpAction(session, { type: "end_turn" });
  return r.ok ? r.session : session;
}

export function setActiveSeat(session, index) {
  if (!session?.seatOrder?.length) return session;
  const i = Math.max(0, Math.min(Number(index) || 0, session.seatOrder.length - 1));
  return { ...session, activeIndex: i };
}

export function setHotseatMission(session, mission, globalId) {
  return setMpMission(session, mission, globalId);
}

export function startHotseatMission(session, firstPlayer = "host") {
  let s = setFirstPlayer(session, firstPlayer);
  return startMpMission(s);
}

/**
 * @param {object} session
 * @param {object} action
 * @param {string|null} [seatId]
 * @param {object} [opts]
 */
export function hotseatApplyAction(session, action, seatId = null, opts = {}) {
  return applyMpAction(session, action, seatId, opts);
}

export function serializeHotseat(session) {
  return JSON.stringify({
    schemaVersion: session.schemaVersion,
    mode: session.mode,
    seats: session.seats,
    seatOrder: session.seatOrder,
    activeIndex: session.activeIndex,
    firstPlayerId: session.firstPlayerId,
    round: session.round,
    place: session.place,
    forges: session.forges,
    missionMeta: session.missionMeta,
    settings: session.settings,
    version: session.version,
    ranking: session.ranking,
  });
}

export function deserializeHotseat(raw) {
  const data = typeof raw === "string" ? JSON.parse(raw) : raw;
  return {
    schemaVersion: data.schemaVersion || 2,
    mode: data.mode || "hotseat",
    seats: data.seats || [],
    seatOrder: data.seatOrder || (data.seats || []).map((s) => s.id),
    activeIndex: data.activeIndex || 0,
    firstPlayerId: data.firstPlayerId || null,
    round: data.round || 1,
    place: data.place || null,
    forges: data.forges || {},
    missionMeta: data.missionMeta || null,
    settings: data.settings || { mode: "hotseat", apMax: 3 },
    version: data.version || 0,
    ranking: data.ranking || null,
    log: data.log || [],
  };
}

/** @deprecated legacy name — session.sim no longer used */
export function getLegacySimShim(session) {
  const f = activeForge(session);
  const p = session.place;
  if (!f || !p) return null;
  return {
    year: p.year,
    turn: p.turn,
    waits: p.waits,
    pressure: p.pressure,
    mission: p.mission,
    ap: f.ap,
    apMax: f.apMax,
    budget: f.budget,
    will: f.will,
    inventionName: f.inventionName,
    inventionHow: f.inventionHow,
    inventionImpact: f.inventionImpact,
    selectedTechIds: (f.stack || []).map((x) => x.techId),
    lastNews: p.lastNews,
  };
}

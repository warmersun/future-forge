/**
 * PR12 — Hotseat / pass-and-play (client-only, no server).
 * Shared invention; seats rotate; only active seat may act.
 */

import { createSimState, cloneSimState, friendsFeatureFlags } from "../sim/state.js";
import { applyAction } from "../sim/actions.js";
import { techById } from "../data.js";

/**
 * @typedef {object} HotseatSeat
 * @property {string} id
 * @property {string} displayName
 * @property {string|null} role
 */

/**
 * @typedef {object} HotseatSession
 * @property {HotseatSeat[]} seats
 * @property {number} activeIndex
 * @property {object|null} sim
 * @property {number} simVersion
 * @property {object|null} missionMeta
 * @property {object} settings
 */

/**
 * @param {string[]} names
 * @returns {HotseatSession}
 */
export function createHotseatSession(names = ["Player 1", "Player 2"]) {
  const seats = (names.length ? names : ["Player 1", "Player 2"]).slice(0, 5).map((n, i) => ({
    id: `seat-${i}`,
    displayName: String(n || `Player ${i + 1}`).slice(0, 24),
    role: i === 0 ? "host" : "polymath",
  }));
  return {
    seats,
    activeIndex: 0,
    sim: null,
    simVersion: 0,
    missionMeta: null,
    settings: {
      mode: "hotseat",
      apMax: 3,
      sharedInvention: true,
      scrutinyCombat: false,
      deployStages: false,
    },
    fieldLocks: {}, // optional cosmetic for parity
  };
}

export function activeSeat(session) {
  if (!session?.seats?.length) return null;
  const i = Math.max(0, Math.min(session.activeIndex, session.seats.length - 1));
  return session.seats[i];
}

export function rotateSeat(session, delta = 1) {
  if (!session?.seats?.length) return session;
  const n = session.seats.length;
  const next = ((session.activeIndex + delta) % n + n) % n;
  return { ...session, activeIndex: next };
}

export function setActiveSeat(session, index) {
  if (!session?.seats?.length) return session;
  const i = Math.max(0, Math.min(Number(index) || 0, session.seats.length - 1));
  return { ...session, activeIndex: i };
}

export function setHotseatMission(session, mission, globalId) {
  return {
    ...session,
    missionMeta: { mission, globalId: globalId || mission?.globalId },
  };
}

export function startHotseatMission(session) {
  const mission = session.missionMeta?.mission;
  if (!mission) return { ok: false, error: "mission_required", session };
  const global = { id: session.missionMeta.globalId || mission.globalId };
  const sim = createSimState(mission, global, {
    features: friendsFeatureFlags({
      multiplayer: false, // hotseat is local pass-and-play
      scrutinyCombat: Boolean(session.settings.scrutinyCombat),
      deployStages: Boolean(session.settings.deployStages),
    }),
    apMax: session.settings.apMax || 3,
  });
  // Keep multiplayer false but still shared invent
  sim.featureFlags = { ...sim.featureFlags, multiplayer: false };
  return {
    ok: true,
    session: {
      ...session,
      sim,
      simVersion: 1,
    },
  };
}

/**
 * Apply action only if seatId is the active seat (or seatId omitted = active).
 */
export function hotseatApplyAction(session, action, seatId = null) {
  if (!session?.sim) return { ok: false, error: "not_started", session };
  const active = activeSeat(session);
  if (!active) return { ok: false, error: "no_seat", session };
  if (seatId != null && seatId !== active.id) {
    return { ok: false, error: "not_active_seat", session, activeSeatId: active.id };
  }

  const type = action?.type;
  if (type === "buffer_write" || type === "write_commit") {
    const field = action.payload?.field;
    const value = action.payload?.value;
    if (field && ["inventionName", "inventionHow", "inventionImpact"].includes(field)) {
      const sim = cloneSimState(session.sim);
      sim[field] = String(value ?? "").slice(0, field === "inventionName" ? 120 : 4000);
      if (type === "buffer_write") {
        return {
          ok: true,
          session: { ...session, sim, simVersion: session.simVersion + 1 },
          events: [{ type: "buffer_write", field, seatId: active.id }],
        };
      }
      // write_commit falls through to applyAction after local field set
      session = { ...session, sim };
    }
  }

  const result = applyAction(session.sim, action, {
    features: session.sim.featureFlags || friendsFeatureFlags(),
    apMax: session.sim.apMax,
    techById,
  });
  if (!result.ok) {
    return { ok: false, error: result.error || "rejected", session };
  }
  return {
    ok: true,
    session: {
      ...session,
      sim: result.sim,
      simVersion: session.simVersion + 1,
    },
    events: result.events || [],
  };
}

/** Serializable snapshot for tests / optional localStorage */
export function serializeHotseat(session) {
  return JSON.stringify({
    seats: session.seats,
    activeIndex: session.activeIndex,
    sim: session.sim,
    simVersion: session.simVersion,
    missionMeta: session.missionMeta,
    settings: session.settings,
  });
}

export function deserializeHotseat(raw) {
  const data = typeof raw === "string" ? JSON.parse(raw) : raw;
  return {
    seats: data.seats || [],
    activeIndex: data.activeIndex || 0,
    sim: data.sim || null,
    simVersion: data.simVersion || 0,
    missionMeta: data.missionMeta || null,
    settings: data.settings || { mode: "hotseat", apMax: 3 },
    fieldLocks: {},
  };
}

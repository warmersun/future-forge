/**
 * Sync action economy (DOM-free). Async AI is reserved/resolved by the host (game.js / room).
 */

import { GAME } from "../data.js";
import { applyPressureRise, clonePressure } from "./pressure.js";
import { isCollapsed } from "./collapse.js";

/**
 * @param {object} sim — mutable sim slice (pressure, year, turn, waits, ap, …)
 * @param {{ type: string, payload?: object }} action
 * @param {{ features?: object, apMax?: number }} [opts]
 * @returns {{ ok: boolean, error?: string, events?: object[], sim: object }}
 */
export function applyAction(sim, action, opts = {}) {
  const features = opts.features || GAME.features || {};
  const apMax = opts.apMax ?? GAME.apMax ?? 3;
  const apOn = Boolean(features.actionPoints);
  const next = { ...sim, pressure: clonePressure(sim.pressure) };
  const events = [];
  const type = action?.type;

  const spendAp = (n) => {
    if (!apOn) return true;
    if ((next.ap ?? 0) < n) return false;
    next.ap -= n;
    next.apSpentThisTurn = (next.apSpentThisTurn || 0) + n;
    return true;
  };

  if (type === "select_tech") {
    const id = action.payload?.techId;
    if (!id) return { ok: false, error: "missing tech", sim };
    const ids = [...(next.selectedTechIds || [])];
    if (ids.includes(id)) return { ok: true, events: [], sim: next };
    if (ids.length >= 6) return { ok: false, error: "stack full", sim };
    if (apOn && !spendAp(1)) return { ok: false, error: "no_ap", sim };
    ids.push(id);
    next.selectedTechIds = ids;
    events.push({ type: "tech_added", techId: id });
    return { ok: true, events, sim: next };
  }

  if (type === "deselect_tech") {
    const id = action.payload?.techId;
    next.selectedTechIds = (next.selectedTechIds || []).filter((x) => x !== id);
    events.push({ type: "tech_removed", techId: id });
    return { ok: true, events, sim: next };
  }

  if (type === "write_commit") {
    const freeLeft = Math.max(0, 2 - (next.writeCommitsThisTurn || 0));
    const changed = Boolean(action.payload?.changed);
    if (!changed) return { ok: true, events: [], sim: next };
    if (apOn && freeLeft <= 0 && !spendAp(1)) {
      return { ok: false, error: "no_ap_buffer", sim };
    }
    next.writeCommitsThisTurn = (next.writeCommitsThisTurn || 0) + 1;
    events.push({ type: "write_commit" });
    return { ok: true, events, sim: next };
  }

  if (type === "open_learn") {
    if (apOn && next.learnOpenedThisTurn) {
      if (!spendAp(1)) return { ok: false, error: "no_ap", sim };
    }
    next.learnOpenedThisTurn = true;
    return { ok: true, events: [{ type: "open_learn" }], sim: next };
  }

  if (type === "reserve_ai") {
    const cost = action.payload?.reservedAp ?? 1;
    if (apOn && cost > 0 && !spendAp(cost)) return { ok: false, error: "no_ap", sim };
    next.turnPhase = "ai_pending";
    next.pendingAi = {
      clientActionId: action.payload?.clientActionId || null,
      mode: action.payload?.mode || "chat",
      reservedAp: cost,
    };
    return { ok: true, events: [{ type: "ai_reserved", mode: next.pendingAi.mode }], sim: next };
  }

  if (type === "resolve_ai" || type === "reject_ai") {
    if (type === "reject_ai" && next.pendingAi?.reservedAp && apOn) {
      next.ap = Math.min(apMax, (next.ap || 0) + next.pendingAi.reservedAp);
    }
    next.pendingAi = null;
    if (next.turnPhase === "ai_pending") next.turnPhase = "act";
    return { ok: true, events: [{ type }], sim: next };
  }

  if (type === "enter_challenge") {
    if (apOn && !spendAp(1)) return { ok: false, error: "no_ap", sim };
    next.turnPhase = "scrutiny";
    return { ok: true, events: [{ type: "enter_challenge" }], sim: next };
  }

  if (type === "abandon_scrutiny") {
    next.turnPhase = "act";
    return { ok: true, events: [{ type: "abandon_scrutiny" }], sim: next };
  }

  if (type === "end_turn") {
    if (apOn) {
      const spent = next.apSpentThisTurn || 0;
      const phase = next.turnPhase || "act";
      if (spent < 1 && phase === "act") {
        return { ok: false, error: "end_turn_noop", sim };
      }
    }
    next.turn = (next.turn || 0) + 1;
    next.ap = apMax;
    next.apSpentThisTurn = 0;
    next.writeCommitsThisTurn = 0;
    next.learnOpenedThisTurn = false;
    events.push({ type: "end_turn" });
    return { ok: true, events, sim: next };
  }

  if (type === "wait") {
    const phase = next.turnPhase || "act";
    if (phase === "scrutiny" || phase === "between_stages") {
      return { ok: false, error: "wait_blocked_phase", sim };
    }
    const mission = action.payload?.mission || {};
    const step = mission.yearsPerTurn || GAME.yearsPerTurn || 2;
    const rise = mission.pressureRise || {};
    next.year = (next.year || GAME.startYear) + step;
    next.waits = (next.waits || 0) + 1;
    next.turn = (next.turn || 0) + 1;
    next.pressure = applyPressureRise(next.pressure, rise);
    next.ap = apMax;
    next.apSpentThisTurn = 0;
    next.writeCommitsThisTurn = 0;
    next.learnOpenedThisTurn = false;
    next.challengePassed = false;
    next.challengeVerdict = null;
    // sticky: hadChallengeAttempt / lastChallengeVerdict unchanged
    events.push({ type: "wait", year: next.year });
    if (
      isCollapsed({
        year: next.year,
        collapseYear: mission.collapseYear || next.year + 99,
        pressure: next.pressure,
      })
    ) {
      events.push({ type: "collapsed" });
    }
    return { ok: true, events, sim: next };
  }

  if (type === "mark_challenge_attempt") {
    next.hadChallengeAttempt = true;
    if (action.payload?.verdict) {
      next.lastChallengeVerdict = action.payload.verdict;
      next.challengeVerdict = action.payload.verdict;
    }
    return { ok: true, events: [{ type: "challenge_attempt" }], sim: next };
  }

  return { ok: false, error: `unknown_action:${type}`, sim };
}

/** Snapshot fields the action layer cares about from the game state object */
export function simSliceFromState(state) {
  return {
    year: state.year,
    turn: state.turn,
    waits: state.waits || 0,
    pressure: clonePressure(state.pressure),
    ap: state.ap ?? GAME.apMax ?? 3,
    apMax: state.apMax ?? GAME.apMax ?? 3,
    apSpentThisTurn: state.apSpentThisTurn || 0,
    writeCommitsThisTurn: state.writeCommitsThisTurn || 0,
    learnOpenedThisTurn: state.learnOpenedThisTurn || false,
    turnPhase: state.turnPhase || "act",
    selectedTechIds: [...(state.selectedTechIds || [])],
    pendingAi: state.pendingAi || null,
    challengePassed: state.challengePassed,
    challengeVerdict: state.challengeVerdict,
    hadChallengeAttempt: state.hadChallengeAttempt || false,
    lastChallengeVerdict: state.lastChallengeVerdict || null,
  };
}

export function applySimSliceToState(state, slice) {
  state.year = slice.year;
  state.turn = slice.turn;
  state.waits = slice.waits;
  state.pressure = clonePressure(slice.pressure);
  state.ap = slice.ap;
  state.apMax = slice.apMax;
  state.apSpentThisTurn = slice.apSpentThisTurn;
  state.writeCommitsThisTurn = slice.writeCommitsThisTurn;
  state.learnOpenedThisTurn = slice.learnOpenedThisTurn;
  state.turnPhase = slice.turnPhase;
  state.selectedTechIds = [...(slice.selectedTechIds || [])];
  state.pendingAi = slice.pendingAi;
  state.challengePassed = slice.challengePassed;
  state.challengeVerdict = slice.challengeVerdict;
  state.hadChallengeAttempt = slice.hadChallengeAttempt;
  state.lastChallengeVerdict = slice.lastChallengeVerdict;
}

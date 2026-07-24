/**
 * Sync action economy (DOM-free). Async AI is reserved/resolved by the host (game.js / room).
 */

import { GAME } from "../data.js";
import { applyPressureRise, clonePressure } from "./pressure.js";
import { isCollapsed } from "./collapse.js";
import {
  techCost,
  techBudgetRefund,
  maybeFrontierRiskTick,
} from "./economy.js";

/**
 * @param {object} sim — mutable sim slice (pressure, year, turn, waits, ap, budget, will, …)
 * @param {{ type: string, payload?: object }} action
 * @param {{ features?: object, apMax?: number, techById?: (id: string) => object|null }} [opts]
 * @returns {{ ok: boolean, error?: string, events?: object[], sim: object }}
 */
export function applyAction(sim, action, opts = {}) {
  const features = opts.features || GAME.features || {};
  const apMax = opts.apMax ?? GAME.apMax ?? 3;
  const apOn = Boolean(features.actionPoints);
  const bwOn = Boolean(features.budgetWill);
  const maxBudget = GAME.maxBudget ?? 10;
  const maxWill = GAME.maxWill ?? 5;
  const techById = opts.techById || (() => null);
  const next = {
    ...sim,
    pressure: clonePressure(sim.pressure),
    techAddedThisTurn: { ...(sim.techAddedThisTurn || {}) },
  };
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

    const tech = action.payload?.tech || techById(id);
    const cost = techCost(tech);
    if (bwOn) {
      if ((next.budget ?? 0) < cost.budget) return { ok: false, error: "no_budget", sim };
      if ((next.will ?? 0) < cost.will) return { ok: false, error: "no_will", sim };
      next.budget -= cost.budget;
      next.will -= cost.will;
      next.techAddedThisTurn[id] = cost;
    }
    ids.push(id);
    next.selectedTechIds = ids;
    events.push({ type: "tech_added", techId: id, cost });
    return { ok: true, events, sim: next };
  }

  if (type === "deselect_tech") {
    const id = action.payload?.techId;
    next.selectedTechIds = (next.selectedTechIds || []).filter((x) => x !== id);
    if (bwOn && next.techAddedThisTurn?.[id]) {
      const cost = next.techAddedThisTurn[id];
      const refund = techBudgetRefund(cost);
      next.budget = Math.min(maxBudget, (next.budget ?? 0) + refund);
      delete next.techAddedThisTurn[id];
      events.push({ type: "tech_removed", techId: id, budgetRefund: refund });
    } else {
      events.push({ type: "tech_removed", techId: id });
    }
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

  if (type === "lobby") {
    if (apOn && !spendAp(1)) return { ok: false, error: "no_ap", sim };
    if (bwOn) {
      if ((next.budget ?? 0) < 1) return { ok: false, error: "no_budget", sim };
      next.budget -= 1;
      next.will = Math.min(maxWill, (next.will ?? 0) + 1);
    }
    events.push({ type: "lobby", will: next.will, budget: next.budget });
    return { ok: true, events, sim: next };
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

  if (type === "challenge_income") {
    // After judge: pass/partial → +1 budget +1 will; fail → will −1
    if (!bwOn) return { ok: true, events: [], sim: next };
    const verdict = action.payload?.verdict;
    if (verdict === "pass" || verdict === "partial") {
      next.budget = Math.min(maxBudget, (next.budget ?? 0) + 1);
      next.will = Math.min(maxWill, (next.will ?? 0) + 1);
      events.push({ type: "challenge_income", kind: "success" });
    } else if (verdict === "fail") {
      next.will = Math.max(0, (next.will ?? 0) - 1);
      events.push({ type: "challenge_income", kind: "fail" });
    }
    return { ok: true, events, sim: next };
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
    next.techAddedThisTurn = {};
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

    // Frontier risk tick (G2)
    if (bwOn && action.payload?.techs) {
      const risk = maybeFrontierRiskTick(
        next.pressure,
        action.payload.techs,
        action.payload.stretchLevel || "yellow",
        action.payload.riskSeed ||
          `${mission.id || "m"}:${next.waits}:${next.turn}`
      );
      if (risk) {
        next.pressure = risk.pressure;
        events.push({ type: "frontier_risk", meter: risk.meter });
      }
    }

    next.ap = apMax;
    next.apSpentThisTurn = 0;
    next.writeCommitsThisTurn = 0;
    next.learnOpenedThisTurn = false;
    next.techAddedThisTurn = {};
    next.challengePassed = false;
    next.challengeVerdict = null;
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

  if (type === "deploy") {
    // payload: { apCost, budgetCost } — computed by host via deployActionCost
    const apCost = action.payload?.apCost ?? 1;
    const budgetCost = action.payload?.budgetCost ?? 1;
    if (apOn && apCost > 0 && !spendAp(apCost)) {
      return { ok: false, error: "no_ap", sim };
    }
    if (bwOn) {
      if ((next.budget ?? 0) < budgetCost) {
        return { ok: false, error: "no_budget", sim };
      }
      next.budget -= budgetCost;
    }
    events.push({
      type: "deploy",
      apCost: apOn ? apCost : 0,
      budgetCost: bwOn ? budgetCost : 0,
    });
    return { ok: true, events, sim: next };
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
    budget: state.budget ?? GAME.startingBudget ?? 5,
    will: state.will ?? GAME.startingWill ?? 3,
    techAddedThisTurn: { ...(state.techAddedThisTurn || {}) },
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
  state.budget = slice.budget;
  state.will = slice.will;
  state.techAddedThisTurn = { ...(slice.techAddedThisTurn || {}) };
}

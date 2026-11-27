/*
Copyright © 2026 Warmer Sun Education, a sole proprietorship by Tamas Simon

This file is part of Future Forge.

Future Forge is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Future Forge is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Future Forge. If not, see <https://www.gnu.org/licenses/>.
*/

/**
 * Sync Moves + 100% reversible Allocated Capacity layer (DOM-free).
 * Thinking, AI chat, Workbench ideation, editing, and summoning roadblocks cost 0 Moves.
 */

import { GAME } from "../data.js";
import { applyPressureRiseYears, clonePressure } from "./pressure.js";
import { isCollapsed } from "./collapse.js";
import {
  aiMoveCost,
  allocatedCapacity,
  availableCapacity,
  techCost,
  pathwayEaseGrant,
  clonePathwayEasePaid,
  readSyncRdCount,
} from "./economy.js";
import { bulletinHighlight, foresightForYear } from "./world-foresight.js";
import { bankForRun } from "./run-world.js";
import {
  cloneRules,
  liveRulesOrSeed,
  writeLobbyRule,
  setRuleStatus,
  removeLobbyRule,
} from "./policy-rules.js";

function paidTechIds(sim) {
  const freeSet = new Set(sim.freeTechIds || []);
  return (sim.selectedTechIds || []).filter((id) => !freeSet.has(id));
}

function ensureCapacityCaps(sim, techById) {
  const used = allocatedCapacity({
    techIds: paidTechIds(sim),
    techById,
    rdCount: sim.rdCount || 0,
  });
  if (sim.budgetCap == null) {
    sim.budgetCap = (Number(sim.budget ?? GAME.startingBudget ?? 5) || 0) + used.budget;
  }
  if (sim.willCap == null) {
    sim.willCap = (Number(sim.will ?? GAME.startingWill ?? 3) || 0) + used.will;
  }
  return used;
}

function syncAllocatedCapacity(sim, techById) {
  ensureCapacityCaps(sim, techById);
  const used = allocatedCapacity({
    techIds: paidTechIds(sim),
    techById,
    rdCount: sim.rdCount || 0,
  });
  const avail = availableCapacity(
    { budget: sim.budgetCap, will: sim.willCap },
    used
  );
  sim.budget = avail.budget;
  sim.will = avail.will;
  return { used, avail };
}

/**
 * @param {object} sim — sim slice (pressure, year, turn, waits, ap, budget, budgetCap, will, willCap, rdCount, …)
 * @param {{ type: string, payload?: object }} action
 * @param {{ features?: object, apMax?: number, techById?: (id: string) => object|null }} [opts]
 * @returns {{ ok: boolean, error?: string, events?: object[], sim: object }}
 */
export function applyAction(sim, action, opts = {}) {
  const features = opts.features || GAME.features || {};
  const apMax = opts.apMax ?? sim.apMax ?? GAME.apMax ?? 3;
  const apOn = Boolean(features.actionPoints);
  const bwOn = Boolean(features.budgetWill);
  const maxBudget = GAME.maxBudget ?? 10;
  const maxWill = GAME.maxWill ?? 5;
  const techById = opts.techById || (() => null);
  const next = {
    ...sim,
    pressure: clonePressure(sim.pressure),
    selectedTechIds: [...(sim.selectedTechIds || [])],
    freeTechIds: [...(sim.freeTechIds || [])],
    rdCount: Math.max(0, Math.floor(Number(sim.rdCount) || 0)),
  };
  const lookupTech = (id) =>
    (action?.payload?.tech && action.payload.tech.id === id ? action.payload.tech : null) ||
    techById(id);

  if (bwOn) {
    ensureCapacityCaps(next, lookupTech);
  }
  const events = [];
  const type = action?.type;

  const spendMove = (n) => {
    if (!apOn || n <= 0) return true;
    if ((next.ap ?? 0) < n) return false;
    next.ap -= n;
    next.apSpentThisTurn = (next.apSpentThisTurn || 0) + n;
    return true;
  };

  if (type === "select_tech") {
    const id = action.payload?.techId;
    if (!id) return { ok: false, error: "missing tech", sim };
    const free = Boolean(action.payload?.free);
    const bill = Boolean(action.payload?.bill);
    const ids = [...next.selectedTechIds];
    const freeSet = new Set(next.freeTechIds);
    const already = ids.includes(id);
    const tech = action.payload?.tech || techById(id);
    const cost = techCost(tech);

    if (already && bill) {
      if (!freeSet.has(id)) return { ok: true, events: [], sim: next };
      if (apOn && !spendMove(1)) return { ok: false, error: "no_ap", sim };
      if (bwOn) {
        syncAllocatedCapacity(next, lookupTech);
        if ((next.budget ?? 0) < cost.budget) return { ok: false, error: "no_budget", sim };
        if ((next.will ?? 0) < cost.will) return { ok: false, error: "no_will", sim };
      }
      freeSet.delete(id);
      next.freeTechIds = [...freeSet];
      if (bwOn) syncAllocatedCapacity(next, lookupTech);
      events.push({ type: "tech_added", techId: id, cost });
      return { ok: true, events, sim: next };
    }
    if (already) return { ok: true, events: [], sim: next };

    const stackCap =
      typeof features.stackCap === "number" && features.stackCap > 0
        ? features.stackCap
        : 6;
    if (ids.length >= stackCap) return { ok: false, error: "stack full", sim };

    if (free) {
      ids.push(id);
      freeSet.add(id);
      next.selectedTechIds = ids;
      next.freeTechIds = [...freeSet];
      events.push({
        type: "tech_added",
        techId: id,
        cost: { budget: 0, will: 0, free: true },
      });
      return { ok: true, events, sim: next };
    }

    if (apOn && !spendMove(1)) return { ok: false, error: "no_ap", sim };
    if (bwOn) {
      syncAllocatedCapacity(next, lookupTech);
      if ((next.budget ?? 0) < cost.budget) return { ok: false, error: "no_budget", sim };
      if ((next.will ?? 0) < cost.will) return { ok: false, error: "no_will", sim };
    }
    ids.push(id);
    next.selectedTechIds = ids;
    if (bwOn) syncAllocatedCapacity(next, lookupTech);
    events.push({ type: "tech_added", techId: id, cost });
    return { ok: true, events, sim: next };
  }

  if (type === "deselect_tech") {
    const id = action.payload?.techId;
    const wasSelected = next.selectedTechIds.includes(id);
    const wasFree = next.freeTechIds.includes(id);
    const beforeBudget = next.budget ?? 0;
    const beforeWill = next.will ?? 0;
    next.selectedTechIds = next.selectedTechIds.filter((x) => x !== id);
    next.freeTechIds = next.freeTechIds.filter((x) => x !== id);
    if (bwOn && wasSelected && !wasFree) {
      syncAllocatedCapacity(next, lookupTech);
      const budgetRefund = Math.max(0, (next.budget ?? 0) - beforeBudget);
      const willRefund = Math.max(0, (next.will ?? 0) - beforeWill);
      events.push({
        type: "tech_removed",
        techId: id,
        budgetRefund,
        willRefund,
      });
    } else {
      events.push({ type: "tech_removed", techId: id });
    }
    return { ok: true, events, sim: next };
  }

  if (type === "write_commit") {
    // Thinking & editing are always free (0 Moves).
    if (!action.payload?.changed) return { ok: true, events: [], sim: next };
    events.push({ type: "write_commit" });
    return { ok: true, events, sim: next };
  }

  if (type === "open_learn") {
    // Learning & exploring are always free (0 Moves).
    return { ok: true, events: [{ type: "open_learn" }], sim: next };
  }

  if (type === "lobby") {
    // 1 Move, 0 Budget → write/suspend/restore/remove a local rule + +1 Goodwill capacity.
    const payload = action.payload || {};
    let rules = liveRulesOrSeed(next.rules, next.mission?.rules, next.year);
    let ruleEvent = null;
    if (payload.write && typeof payload.write === "object") {
      const written = writeLobbyRule(rules, {
        ...payload.write,
        year: next.year,
      });
      if (!written.ok) return { ok: false, error: written.error, sim };
      rules = written.rules;
      ruleEvent = { op: "write", rule: written.rule };
    } else if (payload.suspend) {
      const s = setRuleStatus(rules, payload.suspend, "suspended");
      if (!s.ok) return { ok: false, error: s.error, sim };
      rules = s.rules;
      ruleEvent = { op: "suspend", rule: s.rule };
    } else if (payload.restore) {
      const s = setRuleStatus(rules, payload.restore, "active");
      if (!s.ok) return { ok: false, error: s.error, sim };
      rules = s.rules;
      ruleEvent = { op: "restore", rule: s.rule };
    } else if (payload.remove) {
      const gone = removeLobbyRule(rules, payload.remove);
      if (!gone.ok) return { ok: false, error: gone.error, sim };
      rules = gone.rules;
      ruleEvent = { op: "remove", rule: gone.rule };
    }
    if (apOn && !spendMove(1)) return { ok: false, error: "no_ap", sim };
    if (bwOn) {
      next.willCap = Math.min(maxWill, (next.willCap ?? GAME.startingWill ?? 3) + 1);
      syncAllocatedCapacity(next, lookupTech);
    }
    next.rules = rules;
    events.push({
      type: "lobby",
      will: next.will,
      willCap: next.willCap,
      budget: next.budget,
      budgetCap: next.budgetCap,
      ...(ruleEvent || {}),
    });
    return { ok: true, events, sim: next };
  }

  if (type === "mint_rd") {
    // 1 Move + 1 Budget capacity (freed if the R&D Pathway is removed).
    if (apOn && (next.ap ?? 0) < 1) return { ok: false, error: "no_ap", sim };
    if (bwOn) {
      syncAllocatedCapacity(next, lookupTech);
      if ((next.budget ?? 0) < 1) return { ok: false, error: "no_budget", sim };
    }
    if (apOn && !spendMove(1)) return { ok: false, error: "no_ap", sim };
    next.rdCount = (next.rdCount || 0) + 1;
    if (bwOn) syncAllocatedCapacity(next, lookupTech);
    events.push({ type: "mint_rd", ap: next.ap, budget: next.budget, rdCount: next.rdCount });
    return { ok: true, events, sim: next };
  }

  if (type === "remove_rd" || type === "sync_rd_count") {
    const count =
      type === "sync_rd_count"
        ? readSyncRdCount(action.payload)
        : Math.max(0, (next.rdCount || 0) - Math.max(1, Math.floor(Number(action.payload?.amount) || 1)));
    next.rdCount = count;
    if (bwOn) syncAllocatedCapacity(next, lookupTech);
    events.push({ type, rdCount: next.rdCount, budget: next.budget });
    return { ok: true, events, sim: next };
  }

  if (type === "reserve_ai") {
    const mode = action.payload?.mode || "chat";
    const cost = aiMoveCost(mode);
    if (apOn && cost > 0 && !spendMove(cost)) return { ok: false, error: "no_ap", sim };
    const prevPhase = next.turnPhase || "act";
    next.turnPhase = "ai_pending";
    let resumePhase = prevPhase === "ai_pending" ? "act" : prevPhase;
    if (
      mode === "judge-scrutiny-move" ||
      mode === "judge-challenge" ||
      prevPhase === "scrutiny"
    ) {
      resumePhase = "scrutiny";
    }
    next.pendingAi = {
      clientActionId: action.payload?.clientActionId || null,
      mode,
      reservedAp: cost,
      resumePhase,
    };
    return { ok: true, events: [{ type: "ai_reserved", mode: next.pendingAi.mode }], sim: next };
  }

  if (type === "resolve_ai" || type === "reject_ai") {
    const pending = next.pendingAi;
    if (type === "reject_ai" && pending?.reservedAp && apOn) {
      const refund = pending.reservedAp;
      next.ap = Math.min(apMax, (next.ap || 0) + refund);
      next.apSpentThisTurn = Math.max(0, (next.apSpentThisTurn || 0) - refund);
    }
    const resume = pending?.resumePhase || "act";
    next.pendingAi = null;
    if (next.turnPhase === "ai_pending") next.turnPhase = resume;
    return { ok: true, events: [{ type }], sim: next };
  }

  if (type === "enter_challenge") {
    // Summoning / viewing roadblocks is free (0 Moves); submitting a defense spends 1 Move.
    next.turnPhase = "scrutiny";
    return { ok: true, events: [{ type: "enter_challenge" }], sim: next };
  }

  if (type === "refund_ap") {
    const n = Math.max(0, Math.floor(Number(action.payload?.amount) || 1));
    if (apOn && n > 0) {
      next.ap = Math.min(apMax, (next.ap || 0) + n);
      next.apSpentThisTurn = Math.max(0, (next.apSpentThisTurn || 0) - n);
    }
    return { ok: true, events: [{ type: "refund_ap", amount: n }], sim: next };
  }

  if (type === "abandon_scrutiny") {
    next.turnPhase = "act";
    return { ok: true, events: [{ type: "abandon_scrutiny" }], sim: next };
  }

  if (type === "challenge_income") {
    // Positive-only Goodwill capacity growth: pass/partial → +1 Goodwill capacity; fail never shrinks Goodwill.
    if (!bwOn) return { ok: true, events: [], sim: next };
    const verdict = action.payload?.verdict;
    if (verdict === "pass" || verdict === "partial") {
      next.willCap = Math.min(maxWill, (next.willCap ?? GAME.startingWill ?? 3) + 1);
      syncAllocatedCapacity(next, lookupTech);
      events.push({ type: "challenge_income", kind: "success", will: next.will, willCap: next.willCap });
    }
    return { ok: true, events, sim: next };
  }

  if (type === "pathway_income") {
    if (!bwOn) return { ok: true, events: [], sim: next };
    const grant = pathwayEaseGrant({
      paid: next.pathwayEasePaid,
      crisisDelta: action.payload?.crisisDelta,
      skip: Boolean(action.payload?.skip),
    });
    next.pathwayEasePaid = grant.paid;
    if (grant.amount > 0) {
      next.budgetCap = Math.min(maxBudget, (next.budgetCap ?? GAME.startingBudget ?? 5) + grant.amount);
      syncAllocatedCapacity(next, lookupTech);
    }
    events.push({
      type: "pathway_income",
      amount: grant.amount,
      roles: grant.roles,
      budget: next.budget,
      budgetCap: next.budgetCap,
    });
    return { ok: true, events, sim: next };
  }

  if (type === "end_turn") {
    // Solo +1 yr: always allowed (no end_turn_noop gate), refreshes Moves, ticks year +1 & crises once.
    next.turn = (next.turn || 0) + 1;
    next.ap = apMax;
    next.apSpentThisTurn = 0;
    const yearBefore = next.year;
    next.year = (next.year || GAME.startYear || 2026) + 1;
    const endRise =
      action.payload?.mission?.pressureRise || next.mission?.pressureRise || {};
    next.pressure = applyPressureRiseYears(next.pressure, endRise, 1);
    const pinnedPool = next.runWorld?.packageRef
      ? bankForRun(next)?.predictions || []
      : bankForRun(next)?.predictions || action.payload?.predictionsPool;
    const highlights = foresightForYear(next.year, {
      techIds: next.selectedTechIds || [],
      globalId: next.globalId || next.mission?.globalId,
      seed: `${next.mission?.id || "solo"}:y${next.year}`,
      ...(Array.isArray(pinnedPool) ? { pool: pinnedPool } : {}),
    });
    next.lastYearBulletin = {
      fromYear: yearBefore,
      toYear: next.year,
      highlights: highlights.map(bulletinHighlight),
    };
    events.push({ type: "end_turn" });
    events.push({
      type: "year_tick",
      fromYear: yearBefore,
      toYear: next.year,
      bulletin: next.lastYearBulletin,
    });
    if (
      isCollapsed({
        year: next.year,
        collapseYear:
          action.payload?.mission?.collapseYear ||
          next.mission?.collapseYear ||
          next.year + 99,
        pressure: next.pressure,
      })
    ) {
      events.push({ type: "collapsed" });
    }
    return { ok: true, events, sim: next };
  }

  if (type === "wait") {
    const phase = next.turnPhase || "act";
    if (phase === "scrutiny" || phase === "between_stages") {
      return { ok: false, error: "wait_blocked_phase", sim };
    }
    const mission = action.payload?.mission || {};
    const rawYears = Number(action.payload?.years);
    const step =
      Number.isInteger(rawYears) && rawYears >= 1 && rawYears <= 4
        ? rawYears
        : mission.yearsPerTurn || GAME.yearsPerTurn || 2;
    const rise = mission.pressureRise || {};
    const yearBeforeWait = next.year;
    next.year = (next.year || GAME.startYear) + step;
    next.waits = (next.waits || 0) + 1;
    next.turn = (next.turn || 0) + 1;
    next.pressure = applyPressureRiseYears(next.pressure, rise, step);

    next.ap = apMax;
    next.apSpentThisTurn = 0;
    next.challengePassed = false;
    next.challengeVerdict = null;
    const pinnedPool = next.runWorld?.packageRef
      ? bankForRun(next)?.predictions || []
      : bankForRun(next)?.predictions || mission.runWorld?.bank?.predictions ||
        action.payload?.predictionsPool || mission.pinnedPredictionsBank?.predictions;
    const highlights = foresightForYear(next.year, {
      techIds: next.selectedTechIds || action.payload?.techs?.map((t) => t.id) || [],
      globalId: mission.globalId || next.globalId,
      seed: `${mission.id || "solo"}:y${next.year}:wait`,
      ...(Array.isArray(pinnedPool) ? { pool: pinnedPool } : {}),
    });
    next.lastYearBulletin = {
      fromYear: yearBeforeWait,
      toYear: next.year,
      highlights: highlights.map(bulletinHighlight),
    };
    events.push({ type: "wait", year: next.year });
    events.push({
      type: "year_tick",
      fromYear: yearBeforeWait,
      toYear: next.year,
      bulletin: next.lastYearBulletin,
    });
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
    const apCost = action.payload?.apCost ?? 1;
    if (apOn && apCost > 0 && !spendMove(apCost)) {
      return { ok: false, error: "no_ap", sim };
    }
    events.push({
      type: "deploy",
      apCost: apOn ? apCost : 0,
      budgetCost: 0,
    });
    return { ok: true, events, sim: next };
  }

  return { ok: false, error: `unknown_action:${type}`, sim };
}

/** Snapshot fields the action layer cares about from the game state object */
export function simSliceFromState(state) {
  const budgetCap = state.budgetCap ?? state.mission?.resources?.startingBudget ?? GAME.startingBudget ?? 5;
  const willCap = state.willCap ?? state.mission?.resources?.startingWill ?? GAME.startingWill ?? 3;
  return {
    year: state.year,
    turn: state.turn,
    waits: state.waits || 0,
    pressure: clonePressure(state.pressure),
    ap: state.ap ?? GAME.apMax ?? 3,
    apMax: state.apMax ?? GAME.apMax ?? 3,
    apSpentThisTurn: state.apSpentThisTurn || 0,
    turnPhase: state.turnPhase || "act",
    selectedTechIds: [...(state.selectedTechIds || [])],
    freeTechIds: [...(state.freeTechIds || [])],
    pendingAi: state.pendingAi || null,
    challengePassed: state.challengePassed,
    challengeVerdict: state.challengeVerdict,
    hadChallengeAttempt: state.hadChallengeAttempt || false,
    lastChallengeVerdict: state.lastChallengeVerdict || null,
    budget: state.budget ?? budgetCap,
    budgetCap,
    will: state.will ?? willCap,
    willCap,
    rdCount: Math.max(0, Math.floor(Number(state.rdCount) || 0)),
    pathwayEasePaid: clonePathwayEasePaid(state.pathwayEasePaid),
    lastYearBulletin: state.lastYearBulletin
      ? {
          ...state.lastYearBulletin,
          highlights: [...(state.lastYearBulletin.highlights || [])],
        }
      : null,
    mission: state.mission || null,
    globalId: state.global?.id || state.globalId || null,
    ...(Array.isArray(state.rules) ? { rules: cloneRules(state.rules) } : {}),
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
  state.turnPhase = slice.turnPhase;
  state.selectedTechIds = [...(slice.selectedTechIds || [])];
  state.freeTechIds = [...(slice.freeTechIds || [])];
  state.pendingAi = slice.pendingAi;
  state.challengePassed = slice.challengePassed;
  state.challengeVerdict = slice.challengeVerdict;
  state.hadChallengeAttempt = slice.hadChallengeAttempt;
  state.lastChallengeVerdict = slice.lastChallengeVerdict;
  state.budget = slice.budget;
  if (slice.budgetCap != null) state.budgetCap = slice.budgetCap;
  state.will = slice.will;
  if (slice.willCap != null) state.willCap = slice.willCap;
  if (slice.rdCount != null) state.rdCount = slice.rdCount;
  if ("pathwayEasePaid" in slice) {
    state.pathwayEasePaid = clonePathwayEasePaid(slice.pathwayEasePaid);
  }
  if ("lastYearBulletin" in slice) {
    state.lastYearBulletin = slice.lastYearBulletin
      ? {
          ...slice.lastYearBulletin,
          highlights: [...(slice.lastYearBulletin.highlights || [])],
        }
      : null;
  }
  if ("rules" in slice) {
    state.rules = cloneRules(slice.rules);
  }
}

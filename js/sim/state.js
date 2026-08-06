/**
 * Authoritative SimState factory (solo + friends rooms).
 * DOM-free. Vision / co-inventor instances stay client-only.
 */

import { GAME } from "../data.js";
import { clonePressure } from "./pressure.js";

/**
 * @param {object} mission — normalized mission
 * @param {object|null} global — theme
 * @param {object} [opts]
 * @param {object} [opts.features] — feature flags snapshot
 * @param {number} [opts.apMax]
 * @param {number} [opts.startingBudget]
 * @param {number} [opts.startingWill]
 */
export function createSimState(mission, global = null, opts = {}) {
  const features = {
    runReport: true,
    actionPoints: true,
    budgetWill: true,
    scrutinyCombat: false, // friends default: essay
    deployStages: false, // friends default: single deploy
    multiplayer: true,
    ...(GAME.features || {}),
    ...(opts.features || {}),
  };
  const apMax = opts.apMax ?? mission?.apMax ?? GAME.apMax ?? 3;
  const budget =
    opts.startingBudget ??
    mission?.startingBudget ??
    GAME.startingBudget ??
    5;
  const will =
    opts.startingWill ?? mission?.startingWill ?? GAME.startingWill ?? 3;

  return {
    schemaVersion: 1,
    screen: "workshop",
    turnPhase: "act",
    globalId: global?.id || mission?.globalId || null,
    mission: mission ? cloneMission(mission) : null,
    year: mission?.startYear ?? GAME.startYear ?? 2026,
    turn: 0,
    waits: 0,
    pressure: clonePressure(mission?.pressure || {}),
    selectedTechIds: [],
    learnOrder: [],
    inventionName: "",
    inventionHow: "",
    inventionImpact: "",
    storyFace: "how",
    domainFilter: "all",
    ap: apMax,
    apMax,
    apSpentThisTurn: 0,
    writeCommitsThisTurn: 0,
    learnOpenedThisTurn: false,
    budget,
    will,
    techAddedThisTurn: {},
    actionsThisTurn: [],
    pendingAi: null,
    aiTiming: null,
    challengePassed: false,
    challengeAngle: null,
    challengeText: "",
    challengeQuestion: "",
    challengeAnswer: "",
    challengeFeedback: "",
    challengeVerdict: null,
    challengeFails: 0,
    hadChallengeAttempt: false,
    lastChallengeVerdict: null,
    hostResolvedScrutiny: false,
    scrutiny: null,
    deployUnlocked: false,
    deployStage: "none",
    stagedDropPool: 0,
    stagedDropRemaining: 0,
    dropPilotApplied: 0,
    dropScaleApplied: 0,
    dropNewNormalApplied: 0,
    deployFieldPaid: false,
    elegancePivotPenalty: false,
    outcome: null,
    lastNews: "",
    waitReport: "",
    /** Active round market news (shifts emTech Budget/Will costs). Null until first round completes. */
    marketNews: null,
    featureFlags: {
      actionPoints: Boolean(features.actionPoints),
      budgetWill: Boolean(features.budgetWill),
      scrutinyCombat: Boolean(features.scrutinyCombat),
      deployStages: Boolean(features.deployStages),
      multiplayer: Boolean(features.multiplayer),
    },
  };
}

export function cloneMission(m) {
  if (!m) return null;
  return {
    ...m,
    pressure: clonePressure(m.pressure),
    pressureRise: { ...(m.pressureRise || {}) },
    winMax: { ...(m.winMax || {}) },
    suggested: [...(m.suggested || [])],
    briefMd: m.briefMd ? String(m.briefMd) : "",
    spotlight: m.spotlight && typeof m.spotlight === "object" ? { ...m.spotlight } : null,
    ...(m.resources && typeof m.resources === "object"
      ? { resources: { ...m.resources } }
      : {}),
  };
}

export function cloneSimState(sim) {
  if (!sim) return null;
  return {
    ...sim,
    mission: cloneMission(sim.mission),
    pressure: clonePressure(sim.pressure),
    selectedTechIds: [...(sim.selectedTechIds || [])],
    learnOrder: [...(sim.learnOrder || [])],
    techAddedThisTurn: { ...(sim.techAddedThisTurn || {}) },
    actionsThisTurn: [...(sim.actionsThisTurn || [])],
    pendingAi: sim.pendingAi ? { ...sim.pendingAi } : null,
    aiTiming: sim.aiTiming ? { ...sim.aiTiming } : null,
    scrutiny: sim.scrutiny
      ? {
          ...sim.scrutiny,
          encounters: (sim.scrutiny.encounters || []).map((e) => ({ ...e })),
        }
      : null,
    outcome: sim.outcome ? { ...sim.outcome } : null,
    marketNews: sim.marketNews
      ? {
          ...sim.marketNews,
          techIds: sim.marketNews.techIds ? [...sim.marketNews.techIds] : undefined,
          domains: sim.marketNews.domains ? [...sim.marketNews.domains] : undefined,
        }
      : null,
    featureFlags: { ...(sim.featureFlags || {}) },
  };
}

/** Friends-room default feature flags (party pace) */
export function friendsFeatureFlags(overrides = {}) {
  return {
    runReport: true,
    actionPoints: true,
    budgetWill: true,
    scrutinyCombat: false,
    deployStages: false,
    multiplayer: true,
    ...overrides,
  };
}

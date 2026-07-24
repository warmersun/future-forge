/**
 * Multiplayer coopetition session (DOM-free).
 * Shared place + personal forges + turn-based seat order.
 * Rev 6 rules: open table, layer emTech, Scale updates place, no same-turn retry.
 */

import { GAME, techById } from "../data.js";
import { cloneMission, friendsFeatureFlags } from "./state.js";
import {
  applyPressureRise,
  applyPressureDrop,
  clonePressure,
  totalPressure,
} from "./pressure.js";
import { isCollapsed, isWin } from "./collapse.js";
import { techCost, techBudgetRefund, deployActionCost } from "./economy.js";
import {
  computeDeployDrop,
  rollDeploySuccess,
  freezeStagedDropPool,
} from "./deploy.js";
import { rankSurvivors } from "./mp-rank.js";

const MAX_PLAYERS = 6;
const MIN_PLAYERS = 2;

/**
 * @param {string[]|{id:string,displayName:string,isHost?:boolean}[]} namesOrSeats
 * @param {object} [opts]
 */
export function createMpLobby(namesOrSeats = ["Alex", "Bea"], opts = {}) {
  let seats;
  if (
    Array.isArray(namesOrSeats) &&
    namesOrSeats.length &&
    typeof namesOrSeats[0] === "object" &&
    namesOrSeats[0]?.id
  ) {
    seats = namesOrSeats.slice(0, MAX_PLAYERS).map((s, i) => ({
      id: String(s.id),
      displayName: String(s.displayName || `Player ${i + 1}`).slice(0, 24),
      isHost: Boolean(s.isHost) || i === 0,
    }));
    // ensure exactly one host flag if none
    if (!seats.some((s) => s.isHost) && seats[0]) seats[0].isHost = true;
  } else {
    const list = (namesOrSeats.length ? namesOrSeats : ["Alex", "Bea"])
      .map((n) => String(n || "").trim())
      .filter(Boolean)
      .slice(0, MAX_PLAYERS);
    while (list.length < MIN_PLAYERS) list.push(`Player ${list.length + 1}`);
    seats = list.map((n, i) => ({
      id: `seat-${i}`,
      displayName: n.slice(0, 24),
      isHost: i === 0,
    }));
  }

  const host = seats.find((s) => s.isHost) || seats[0];

  return {
    schemaVersion: 2,
    mode: opts.mode || "hotseat",
    seats,
    seatOrder: seats.map((s) => s.id),
    activeIndex: Math.max(0, seats.findIndex((s) => s.id === host?.id)),
    firstPlayerId: host?.id || seats[0]?.id,
    round: 1,
    place: null,
    forges: {},
    missionMeta: null,
    settings: {
      apMax: opts.apMax ?? GAME.apMax ?? 3,
      minPlayers: MIN_PLAYERS,
      maxPlayers: MAX_PLAYERS,
      turnBased: true,
      personalInventions: true,
      sharedPlace: true,
      openTable: true,
      layerEmTechOnOthers: true,
      actorPaysCosts: true,
      waitEndsTurn: true,
      maxWaitsPerSeatTurn: 1,
      deployStages: true,
      multiplayer: true,
      ...opts.settings,
    },
    version: 0,
    ranking: null,
    log: [],
  };
}

/** Public JSON-safe snapshot of an mp session (no functions). */
export function publicMpState(session) {
  if (!session) return null;
  return {
    schemaVersion: session.schemaVersion,
    mode: session.mode,
    seats: (session.seats || []).map((s) => ({ ...s })),
    seatOrder: [...(session.seatOrder || [])],
    activeIndex: session.activeIndex,
    firstPlayerId: session.firstPlayerId,
    round: session.round,
    place: session.place
      ? {
          ...session.place,
          mission: cloneMission(session.place.mission),
          pressure: clonePressure(session.place.pressure),
        }
      : null,
    forges: Object.fromEntries(
      Object.entries(session.forges || {}).map(([k, f]) => [
        k,
        {
          ...f,
          stack: (f.stack || []).map((x) => ({ ...x })),
          techAddedThisTurn: { ...(f.techAddedThisTurn || {}) },
        },
      ])
    ),
    missionMeta: session.missionMeta
      ? {
          mission: cloneMission(session.missionMeta.mission),
          globalId: session.missionMeta.globalId,
        }
      : null,
    settings: { ...(session.settings || {}) },
    version: session.version,
    ranking: session.ranking
      ? {
          ...session.ranking,
          rows: (session.ranking.rows || []).map((r) => ({ ...r })),
        }
      : null,
    openTable: getOpenTable(session),
    activeSeatId: activeSeatId(session),
  };
}

export function activeSeatId(session) {
  const order = session.seatOrder || [];
  if (!order.length) return null;
  const i = Math.max(0, Math.min(session.activeIndex || 0, order.length - 1));
  return order[i];
}

export function activeSeat(session) {
  const id = activeSeatId(session);
  return session.seats?.find((s) => s.id === id) || null;
}

export function activeForge(session) {
  const id = activeSeatId(session);
  return id ? session.forges?.[id] || null : null;
}

export function setMpMission(session, mission, globalId) {
  return {
    ...session,
    missionMeta: {
      mission: cloneMission(mission),
      globalId: globalId || mission?.globalId || null,
    },
  };
}

/**
 * Designate first player before start. seatId | "host" | "random"
 */
export function setFirstPlayer(session, choice = "host") {
  const seats = session.seats || [];
  if (!seats.length) return session;
  let id = seats[0].id;
  if (choice === "host") {
    id = seats.find((s) => s.isHost)?.id || seats[0].id;
  } else if (choice === "random") {
    id = seats[Math.floor(Math.random() * seats.length)].id;
  } else if (seats.some((s) => s.id === choice)) {
    id = choice;
  }
  const order = [...(session.seatOrder || seats.map((s) => s.id))];
  const idx = order.indexOf(id);
  return {
    ...session,
    firstPlayerId: id,
    activeIndex: idx >= 0 ? idx : 0,
  };
}

function createForge(seat, settings) {
  const apMax = settings.apMax ?? 3;
  return {
    seatId: seat.id,
    displayName: seat.displayName,
    ap: apMax,
    apMax,
    budget: GAME.startingBudget ?? 5,
    will: GAME.startingWill ?? 3,
    apSpentThisTurn: 0,
    writeCommitsThisTurn: 0,
    techAddedThisTurn: {}, // techId -> { cost, targetSeatId }
    inventionName: "",
    inventionHow: "",
    inventionImpact: "",
    /** @type {{ techId: string, addedBy: string }[]} */
    stack: [],
    abandoned: false,
    turnPhase: "act", // act | scrutiny | pilot_ready | scale_ready | done
    challengePassed: false,
    challengeVerdict: null,
    challengeAnswer: "",
    hadChallengeAttempt: false,
    lastChallengeVerdict: null,
    deployStage: "none", // none | pilot_ok | scaled
    pilotFailedThisTurn: false,
    scaleFailedThisTurn: false,
    waitedThisTurn: false,
    stagedDropPool: 0,
    impactDropTotal: 0,
    successfulScales: 0,
    landedSolvingScale: false,
    contributionBudgetSpent: 0,
    contributionApSpent: 0,
    contributionWillSpent: 0,
    lastNews: "",
  };
}

export function startMpMission(session) {
  const mission = session.missionMeta?.mission;
  if (!mission) return { ok: false, error: "mission_required", session };
  if ((session.seats || []).length < MIN_PLAYERS) {
    return { ok: false, error: "min_players", session };
  }

  const forges = {};
  for (const seat of session.seats) {
    forges[seat.id] = createForge(seat, session.settings);
  }

  // Ensure activeIndex points at firstPlayer
  let next = setFirstPlayer(session, session.firstPlayerId || "host");
  const place = {
    mission: cloneMission(mission),
    globalId: session.missionMeta.globalId || mission.globalId || null,
    year: mission.startYear ?? GAME.startYear ?? 2026,
    waits: 0,
    turn: 0,
    pressure: clonePressure(mission.pressure || {}),
    lastNews: "Mission started — invent, challenge, Pilot, then Scale the place.",
    status: "playing", // playing | won | partial_locked | collapsed
    collapseYear: mission.collapseYear ?? 2036,
  };

  // Refill active forge AP (already full)
  next = {
    ...next,
    forges,
    place,
    version: (session.version || 0) + 1,
    round: 1,
    ranking: null,
    log: [{ type: "mission_start", year: place.year }],
  };
  return { ok: true, session: next };
}

function cloneForge(f) {
  if (!f) return null;
  return {
    ...f,
    stack: (f.stack || []).map((x) => ({ ...x })),
    techAddedThisTurn: { ...(f.techAddedThisTurn || {}) },
  };
}

function cloneSession(session) {
  const forges = {};
  for (const [k, v] of Object.entries(session.forges || {})) {
    forges[k] = cloneForge(v);
  }
  return {
    ...session,
    seats: (session.seats || []).map((s) => ({ ...s })),
    seatOrder: [...(session.seatOrder || [])],
    forges,
    place: session.place
      ? {
          ...session.place,
          mission: cloneMission(session.place.mission),
          pressure: clonePressure(session.place.pressure),
        }
      : null,
    missionMeta: session.missionMeta
      ? {
          mission: cloneMission(session.missionMeta.mission),
          globalId: session.missionMeta.globalId,
        }
      : null,
    settings: { ...(session.settings || {}) },
    log: [...(session.log || [])],
    ranking: session.ranking
      ? {
          ...session.ranking,
          rows: (session.ranking.rows || []).map((r) => ({ ...r })),
        }
      : null,
  };
}

function stackTechIds(forge) {
  return (forge.stack || []).map((x) => x.techId);
}

function stackTechs(forge) {
  return stackTechIds(forge)
    .map((id) => techById(id))
    .filter(Boolean);
}

function domainsOf(techs) {
  return [...new Set(techs.map((t) => t.domain).filter(Boolean))];
}

function passToNext(session) {
  const n = session.seatOrder.length;
  if (!n) return session;
  const prev = session.activeIndex || 0;
  const nextIdx = (prev + 1) % n;
  const wrapped = nextIdx <= prev && session.place?.status === "playing";
  const next = cloneSession(session);
  next.activeIndex = nextIdx;
  if (wrapped) next.round = (next.round || 1) + 1;

  const sid = next.seatOrder[nextIdx];
  const forge = next.forges[sid];
  if (forge) {
    forge.ap = forge.apMax;
    forge.apSpentThisTurn = 0;
    forge.writeCommitsThisTurn = 0;
    forge.techAddedThisTurn = {};
    forge.pilotFailedThisTurn = false;
    forge.scaleFailedThisTurn = false;
    forge.waitedThisTurn = false;
  }
  next.place.turn = (next.place.turn || 0) + 1;
  next.version = (session.version || 0) + 1;
  next.log = [
    ...(session.log || []),
    { type: "seat_turn_start", seatId: sid, round: next.round },
  ];
  return next;
}

function finishEndTurn(session) {
  return passToNext(session);
}

/**
 * Apply multiplayer action for the active seat (or seatId if matches active).
 * @param {object} session
 * @param {{ type: string, payload?: object }} action
 * @param {string|null} [seatId]
 * @param {object} [opts]
 * @param {() => number} [opts.rng]
 */
export function applyMpAction(session, action, seatId = null, opts = {}) {
  if (!session?.place) return { ok: false, error: "not_started", session };
  if (session.place.status === "won" || session.place.status === "collapsed") {
    return { ok: false, error: "run_over", session };
  }

  const activeId = activeSeatId(session);
  if (!activeId) return { ok: false, error: "no_seat", session };
  if (seatId != null && seatId !== activeId) {
    return { ok: false, error: "not_active_seat", session, activeSeatId: activeId };
  }

  const type = action?.type;
  const payload = action?.payload || {};
  const rng = opts.rng || Math.random;
  let s = cloneSession(session);
  const actor = s.forges[activeId];
  if (!actor) return { ok: false, error: "no_forge", session };

  const apOn = true;
  const bwOn = true;
  const maxBudget = GAME.maxBudget ?? 10;
  const maxWill = GAME.maxWill ?? 5;
  const events = [];

  const spendAp = (forge, n) => {
    if (!apOn || n <= 0) return true;
    if ((forge.ap ?? 0) < n) return false;
    forge.ap -= n;
    forge.apSpentThisTurn = (forge.apSpentThisTurn || 0) + n;
    return true;
  };

  // —— Writes (own forge only) ——
  if (type === "buffer_write" || type === "write_commit") {
    if (actor.abandoned) return { ok: false, error: "abandoned", session };
    const field = payload.field;
    if (!["inventionName", "inventionHow", "inventionImpact"].includes(field)) {
      return { ok: false, error: "bad_field", session };
    }
    const max = field === "inventionName" ? 120 : 4000;
    actor[field] = String(payload.value ?? "").slice(0, max);
    if (type === "write_commit" && payload.changed) {
      const freeLeft = Math.max(0, 2 - (actor.writeCommitsThisTurn || 0));
      if (freeLeft <= 0 && !spendAp(actor, 1)) {
        return { ok: false, error: "no_ap", session };
      }
      actor.writeCommitsThisTurn = (actor.writeCommitsThisTurn || 0) + 1;
    }
    events.push({ type, field, seatId: activeId });
    s.version = (session.version || 0) + 1;
    return { ok: true, session: s, events };
  }

  // —— AP pay / refund (AI co-inventor on hotseat; rooms use server reserve) ——
  if (type === "pay_ap") {
    const n = Math.max(0, Math.floor(Number(payload.amount) || 1));
    if (n > 0 && !spendAp(actor, n)) return { ok: false, error: "no_ap", session };
    events.push({ type: "pay_ap", amount: n, seatId: activeId });
    s.version = (session.version || 0) + 1;
    return { ok: true, session: s, events };
  }
  if (type === "refund_ap") {
    const n = Math.max(0, Math.floor(Number(payload.amount) || 1));
    actor.ap = Math.min(actor.apMax || 3, (actor.ap || 0) + n);
    events.push({ type: "refund_ap", amount: n, seatId: activeId });
    s.version = (session.version || 0) + 1;
    return { ok: true, session: s, events };
  }

  // —— Abandon ——
  if (type === "abandon") {
    if (actor.abandoned) return { ok: false, error: "already_abandoned", session };
    if (actor.deployStage === "scaled") {
      return { ok: false, error: "already_scaled", session };
    }
    actor.abandoned = true;
    actor.turnPhase = "act";
    actor.lastNews = "Abandoned own invention — can layer emTech on others.";
    events.push({ type: "abandon", seatId: activeId });
    s.version = (session.version || 0) + 1;
    s.log = [...(s.log || []), { type: "abandon", seatId: activeId }];
    return { ok: true, session: s, events };
  }

  // —— Layer / select tech ——
  if (type === "select_tech" || type === "layer_tech") {
    const techId = payload.techId;
    if (!techId) return { ok: false, error: "missing_tech", session };
    const targetSeatId =
      type === "layer_tech"
        ? payload.targetSeatId
        : payload.targetSeatId || activeId;
    if (!targetSeatId || !s.forges[targetSeatId]) {
      return { ok: false, error: "bad_target", session };
    }
    const target = s.forges[targetSeatId];
    if (target.abandoned && targetSeatId === activeId) {
      return { ok: false, error: "abandoned", session };
    }
    // Can layer on abandoned others' forges? Yes — stack still exists for history/help mid-race if they had stack before abandon. If abandoned empty, still allow layers for contribution path on active forges only.
    if (target.abandoned && targetSeatId !== activeId) {
      return { ok: false, error: "target_abandoned", session };
    }
    if (target.deployStage === "scaled") {
      return { ok: false, error: "target_already_scaled", session };
    }
    if (targetSeatId !== activeId && actor.abandoned === false) {
      // non-abandoned can still layer on others (rules allow)
    }
    if (targetSeatId !== activeId) {
      // additive only on others — must use layer path (select_tech with other target is OK)
    } else if (actor.abandoned) {
      return { ok: false, error: "abandoned", session };
    }

    const ids = stackTechIds(target);
    if (ids.includes(techId)) return { ok: false, error: "already_on_stack", session };
    if (ids.length >= 6) return { ok: false, error: "stack_full", session };

    const tech = payload.tech || techById(techId);
    if (!tech) return { ok: false, error: "unknown_tech", session };
    const cost = techCost(tech);

    if (!spendAp(actor, 1)) return { ok: false, error: "no_ap", session };
    if (bwOn) {
      if ((actor.budget ?? 0) < cost.budget) return { ok: false, error: "no_budget", session };
      if ((actor.will ?? 0) < cost.will) return { ok: false, error: "no_will", session };
      actor.budget -= cost.budget;
      actor.will -= cost.will;
    }

    target.stack = [...(target.stack || []), { techId, addedBy: activeId }];
    actor.techAddedThisTurn[`${targetSeatId}:${techId}`] = {
      cost,
      targetSeatId,
      techId,
    };

    if (targetSeatId !== activeId) {
      actor.contributionApSpent = (actor.contributionApSpent || 0) + 1;
      actor.contributionBudgetSpent =
        (actor.contributionBudgetSpent || 0) + (cost.budget || 0);
      actor.contributionWillSpent =
        (actor.contributionWillSpent || 0) + (cost.will || 0);
    }

    events.push({
      type: targetSeatId === activeId ? "tech_added" : "tech_layered",
      techId,
      targetSeatId,
      addedBy: activeId,
      cost,
    });
    s.version = (session.version || 0) + 1;
    return { ok: true, session: s, events };
  }

  if (type === "deselect_tech" || type === "unlayer_tech") {
    const techId = payload.techId;
    const targetSeatId = payload.targetSeatId || activeId;
    const target = s.forges[targetSeatId];
    if (!target) return { ok: false, error: "bad_target", session };

    const entry = (target.stack || []).find((x) => x.techId === techId);
    if (!entry) return { ok: false, error: "not_on_stack", session };

    if (targetSeatId === activeId) {
      // Owner may remove any tech from own stack
      if (actor.abandoned) return { ok: false, error: "abandoned", session };
    } else {
      // Helper may only unlayer what they added
      if (entry.addedBy !== activeId) {
        return { ok: false, error: "not_your_layer", session };
      }
    }

    target.stack = target.stack.filter((x) => x.techId !== techId);
    const key = `${targetSeatId}:${techId}`;
    if (bwOn && actor.techAddedThisTurn?.[key]) {
      const cost = actor.techAddedThisTurn[key].cost;
      const refund = techBudgetRefund(cost);
      actor.budget = Math.min(maxBudget, (actor.budget ?? 0) + refund);
      delete actor.techAddedThisTurn[key];
      events.push({ type: "tech_removed", techId, targetSeatId, budgetRefund: refund });
    } else {
      events.push({ type: "tech_removed", techId, targetSeatId });
    }
    s.version = (session.version || 0) + 1;
    return { ok: true, session: s, events };
  }

  // —— Challenge (mandatory before pilot) ——
  if (type === "enter_challenge") {
    if (actor.abandoned) return { ok: false, error: "abandoned", session };
    if (actor.challengePassed || actor.deployStage === "pilot_ok" || actor.deployStage === "scaled") {
      return { ok: false, error: "already_past_challenge", session };
    }
    if (!spendAp(actor, 1)) return { ok: false, error: "no_ap", session };
    actor.turnPhase = "scrutiny";
    events.push({ type: "enter_challenge", seatId: activeId });
    s.version = (session.version || 0) + 1;
    return { ok: true, session: s, events };
  }

  if (type === "submit_challenge") {
    if (actor.abandoned) return { ok: false, error: "abandoned", session };
    if (actor.turnPhase !== "scrutiny" && !payload.force) {
      // allow submit if they enter+submit in one action via force after enter
      return { ok: false, error: "not_in_challenge", session };
    }
    const answer = String(payload.answer ?? actor.challengeAnswer ?? "").trim();
    actor.challengeAnswer = answer;
    actor.hadChallengeAttempt = true;

    // Local lightweight judge for hotseat / tests (AI can override via payload.verdict)
    let verdict = payload.verdict;
    if (!verdict) {
      const words = answer.split(/\s+/).filter(Boolean).length;
      if (words >= 40) verdict = "pass";
      else if (words >= 15) verdict = "partial";
      else verdict = "fail";
    }

    actor.lastChallengeVerdict = verdict;
    actor.challengeVerdict = verdict;
    actor.hadChallengeAttempt = true;

    if (verdict === "pass" || verdict === "partial") {
      actor.challengePassed = true;
      actor.turnPhase = "act";
      actor.deployStage = "none"; // ready to pilot
      if (bwOn) {
        actor.budget = Math.min(maxBudget, (actor.budget ?? 0) + 1);
        actor.will = Math.min(maxWill, (actor.will ?? 0) + 1);
      }
      // Freeze drop pool at challenge success for later Scale application
      const techs = stackTechs(actor);
      const dropInfo = computeDeployDrop({
        techs,
        inventionHow: actor.inventionHow,
        inventionImpact: actor.inventionImpact,
        challengeVerdict: verdict,
        challengeAnswer: answer,
        suggested: s.place.mission?.suggested || [],
        pairs: [],
        domains: domainsOf(techs),
        will: actor.will,
        budgetWill: true,
      });
      const frozen = freezeStagedDropPool(dropInfo.drop);
      actor.stagedDropPool = frozen.stagedDropPool;
      events.push({ type: "challenge_pass", verdict, dropPool: actor.stagedDropPool });
    } else {
      actor.challengePassed = false;
      actor.turnPhase = "act";
      if (bwOn) actor.will = Math.max(0, (actor.will ?? 0) - 1);
      events.push({ type: "challenge_fail", verdict });
    }
    s.version = (session.version || 0) + 1;
    return { ok: true, session: s, events };
  }

  // —— Pilot (personal, no place update) ——
  if (type === "attempt_pilot") {
    if (actor.abandoned) return { ok: false, error: "abandoned", session };
    if (!actor.challengePassed) return { ok: false, error: "challenge_required", session };
    if (actor.deployStage === "pilot_ok" || actor.deployStage === "scaled") {
      return { ok: false, error: "pilot_already_done", session };
    }
    if (actor.pilotFailedThisTurn) {
      return { ok: false, error: "retry_next_turn", session };
    }

    const techs = stackTechs(actor);
    // Deploy stages cost 0 AP (solo key decision); field budget still applies.
    const cost = deployActionCost(techs, { will: actor.will });
    if ((actor.budget ?? 0) < cost.budget) return { ok: false, error: "no_budget", session };
    actor.budget -= cost.budget;
    actor.apSpentThisTurn = (actor.apSpentThisTurn || 0) + 1; // marks engagement for end_turn

    const level = payload.feasibilityLevel || "yellow";
    const roll = rollDeploySuccess(level, rng);
    if (!roll.ok) {
      actor.pilotFailedThisTurn = true;
      actor.lastNews = `Pilot failed (rolled ${roll.roll} vs ${roll.pct}%). Retry next seat-turn.`;
      events.push({ type: "pilot_fail", ...roll });
      s.version = (session.version || 0) + 1;
      s.place.lastNews = `${actor.displayName}'s Pilot failed.`;
      return { ok: true, session: s, events };
    }

    actor.deployStage = "pilot_ok";
    actor.lastNews = "Pilot succeeded — Scale ready (updates the place).";
    // Refresh pool in case stack grew after challenge
    const dropInfo = computeDeployDrop({
      techs,
      inventionHow: actor.inventionHow,
      inventionImpact: actor.inventionImpact,
      challengeVerdict: actor.challengeVerdict,
      challengeAnswer: actor.challengeAnswer,
      suggested: s.place.mission?.suggested || [],
      pairs: [],
      domains: domainsOf(techs),
      will: actor.will,
      budgetWill: true,
    });
    actor.stagedDropPool = Math.max(actor.stagedDropPool || 0, dropInfo.drop);
    events.push({ type: "pilot_ok", ...roll, dropPool: actor.stagedDropPool });
    s.place.lastNews = `${actor.displayName} piloted successfully — ready to Scale.`;
    s.version = (session.version || 0) + 1;
    return { ok: true, session: s, events };
  }

  // —— Scale (updates shared place on success) ——
  if (type === "attempt_scale") {
    if (actor.abandoned) return { ok: false, error: "abandoned", session };
    if (actor.deployStage !== "pilot_ok") {
      return { ok: false, error: "pilot_required", session };
    }
    if (actor.deployStage === "scaled") {
      return { ok: false, error: "already_scaled", session };
    }
    if (actor.scaleFailedThisTurn) {
      return { ok: false, error: "retry_next_turn", session };
    }
    if (s.place.status === "won") {
      return { ok: false, error: "race_over", session };
    }

    // Scale: 0 AP; 1 Budget field cost when budget remains
    if ((actor.budget ?? 0) < 1) return { ok: false, error: "no_budget", session };
    actor.budget -= 1;
    actor.apSpentThisTurn = (actor.apSpentThisTurn || 0) + 1;

    // Scale rolls on scale-ish feasibility; default yellow
    const level = payload.feasibilityLevel || payload.scaleLevel || "yellow";
    const roll = rollDeploySuccess(level, rng);
    if (!roll.ok) {
      actor.scaleFailedThisTurn = true;
      actor.lastNews = `Scale failed (rolled ${roll.roll} vs ${roll.pct}%). Retry next seat-turn.`;
      events.push({ type: "scale_fail", ...roll });
      s.place.lastNews = `${actor.displayName}'s Scale failed — place unchanged.`;
      s.version = (session.version || 0) + 1;
      return { ok: true, session: s, events };
    }

    // Apply FULL drop pool to shared place (Pilot was personal only)
    const drop = Math.max(1, actor.stagedDropPool || 1);
    const before = totalPressure(s.place.pressure);
    s.place.pressure = applyPressureDrop(s.place.pressure, drop);
    const after = totalPressure(s.place.pressure);
    const actual = Math.max(0, before - after);

    actor.deployStage = "scaled";
    actor.successfulScales = (actor.successfulScales || 0) + 1;
    actor.impactDropTotal = (actor.impactDropTotal || 0) + actual;
    actor.lastNews = `Scaled! Removed ${actual} pressure from the place.`;

    const winMax = s.place.mission?.winMax || {};
    const solved = isWin(s.place.pressure, winMax);

    if (solved) {
      actor.landedSolvingScale = true;
      s.place.status = "won";
      s.place.lastNews = `${actor.displayName} Scaled and essentially solved the crisis! Race over.`;
      s.ranking = rankSurvivors(s);
      events.push({
        type: "scale_ok",
        drop: actual,
        pool: drop,
        solved: true,
        ...roll,
      });
      events.push({ type: "race_won", seatId: activeId });
    } else {
      s.place.status = "playing";
      s.place.lastNews = `${actor.displayName} Scaled (partial). Place improved — others may still Scale.`;
      events.push({
        type: "scale_ok",
        drop: actual,
        pool: drop,
        solved: false,
        ...roll,
      });
    }

    s.version = (session.version || 0) + 1;
    s.log = [
      ...(s.log || []),
      { type: "scale_ok", seatId: activeId, drop: actual, solved },
    ];
    return { ok: true, session: s, events };
  }

  // —— End turn ——
  if (type === "end_turn") {
    if ((actor.apSpentThisTurn || 0) < 1 && actor.turnPhase === "act") {
      // Allow end turn after failed attempts or writes-only: require some engagement OR free pass with spent
      // Writers: buffer_write doesn't spend apSpent — allow end if they wrote or spent or challenged
      const wrote =
        (actor.inventionName || actor.inventionHow || actor.inventionImpact || "").length > 0;
      if (!wrote && (actor.apSpentThisTurn || 0) < 1 && !actor.pilotFailedThisTurn && !actor.scaleFailedThisTurn) {
        return { ok: false, error: "end_turn_noop", session };
      }
    }
    events.push({ type: "end_turn", seatId: activeId });
    s = finishEndTurn(s);
    s.log = [...(session.log || []), { type: "end_turn", seatId: activeId }];
    return { ok: true, session: s, events };
  }

  // —— Wait (shared calendar; ends seat-turn) ——
  if (type === "wait") {
    if (actor.waitedThisTurn) return { ok: false, error: "wait_once", session };
    if (actor.turnPhase === "scrutiny") {
      return { ok: false, error: "wait_blocked_phase", session };
    }
    const mission = s.place.mission || {};
    const step = mission.yearsPerTurn || GAME.yearsPerTurn || 2;
    const rise = mission.pressureRise || {};
    s.place.year = (s.place.year || GAME.startYear) + step;
    s.place.waits = (s.place.waits || 0) + 1;
    s.place.pressure = applyPressureRise(s.place.pressure, rise);
    actor.waitedThisTurn = true;
    s.place.lastNews = `${actor.displayName} waited — year ${s.place.year}. Pressure rose.`;

    events.push({ type: "wait", year: s.place.year, seatId: activeId });

    if (
      isCollapsed({
        year: s.place.year,
        collapseYear: s.place.collapseYear || mission.collapseYear || 2099,
        pressure: s.place.pressure,
      })
    ) {
      s.place.status = "collapsed";
      s.place.lastNews = "The place collapsed. Nobody wins.";
      s.ranking = null;
      events.push({ type: "collapsed" });
      s.version = (session.version || 0) + 1;
      return { ok: true, session: s, events };
    }

    // Wait ends seat-turn
    s = passToNext(s);
    return { ok: true, session: s, events };
  }

  return { ok: false, error: `unknown_action:${type}`, session };
}

export function getOpenTable(session) {
  if (!session?.forges) return [];
  return (session.seatOrder || []).map((id) => {
    const f = session.forges[id];
    const seat = session.seats.find((x) => x.id === id);
    return {
      seatId: id,
      displayName: seat?.displayName || f?.displayName || id,
      active: id === activeSeatId(session),
      inventionName: f?.inventionName || "",
      inventionHow: f?.inventionHow || "",
      inventionImpact: f?.inventionImpact || "",
      stack: (f?.stack || []).map((x) => ({
        ...x,
        tech: techById(x.techId),
      })),
      abandoned: Boolean(f?.abandoned),
      deployStage: f?.deployStage || "none",
      challengePassed: Boolean(f?.challengePassed),
      challengeVerdict: f?.challengeVerdict || null,
      budget: f?.budget ?? 0,
      will: f?.will ?? 0,
      ap: f?.ap ?? 0,
      apMax: f?.apMax ?? 3,
      impactDropTotal: f?.impactDropTotal || 0,
      contributionBudgetSpent: f?.contributionBudgetSpent || 0,
    };
  });
}

export { MIN_PLAYERS, MAX_PLAYERS, friendsFeatureFlags };

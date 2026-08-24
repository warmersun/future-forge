/**
 * Hotseat ↔ solo workshop bridge.
 * Solo invent / challenge / deploy UI is reused; only seat focus differs.
 */

import {
  createHotseatSession,
  setHotseatQuest,
  startHotseatQuest,
  hotseatApplyAction,
  activeSeatId,
  activeSeat,
} from "./hotseat.js";
import { cloneMission } from "../sim/state.js";
import { clonePressure } from "../sim/pressure.js";
import { inventYear, inventWaits } from "../sim/mp-session.js";
import { preferIncomingHexBoard } from "../hex/board-state.js";
import {
  deriveInventPhase,
  inventPhaseToUiPhase,
  isInventContentFrozen,
  isHexBoardFrozen,
  allowedActions,
} from "../sim/invent-phase.js";

/** Map invent deployStage → solo deployStage string */
export function inventToSoloDeployStage(ds) {
  if (ds === "pilot_ok" || ds === "pilot") return "pilot";
  if (ds === "scaled" || ds === "scale") return "scale";
  if (ds === "new_normal") return "new_normal";
  return "none";
}

export function soloToInventDeployStage(ds) {
  if (ds === "pilot") return "pilot_ok";
  if (ds === "scale") return "scaled";
  if (ds === "new_normal") return "new_normal";
  return "none";
}

/**
 * @returns {object} bridge API
 */
export function createHotseatBridge() {
  /** @type {object|null} */
  let session = null;
  /** seat whose invention is displayed */
  let viewSeatId = null;

  function getSession() {
    return session;
  }

  function getActiveId() {
    return session ? activeSeatId(session) : null;
  }

  function getViewId() {
    return viewSeatId || getActiveId();
  }

  function invent(id) {
    const sid = id || getViewId();
    return session?.invents?.[sid] || null;
  }

  function activeInvent() {
    const id = getActiveId();
    return id ? session?.invents?.[id] : null;
  }

  function isHotseat() {
    return Boolean(session?.place);
  }

  function isMyTurn() {
    if (!isHotseat()) return true;
    // Active seat exists and place is still playing
    return Boolean(getActiveId() && session?.place?.status === "playing");
  }

  function viewingOther() {
    return isHotseat() && getViewId() !== getActiveId();
  }

  /**
   * Lifecycle of a personal invent (viewed invent).
   * @returns {"none"|"invent"|"challenge"|"deploy"|"scaled"|"locked"}
   *
   * invent    — still writing; active seat may add story + layer tech (helper pays)
   * challenge — owner in scrutiny; invent soft-frozen; helpers watch only
   * deploy    — **Challenge passed locks the invention** (story + stack frozen forever).
   *             Active seat may still **Pilot / Scale** that invent (they pay).
   * scaled    — finished; browse only
   * locked    — abandoned / missing
   */
  function forgePhase(id) {
    const f = invent(id);
    if (!f) return "none";
    return inventPhaseToUiPhase(deriveInventPhase(f));
  }

  function inventPhaseOf(id) {
    return deriveInventPhase(invent(id));
  }

  function viewedPhase() {
    return forgePhase(getViewId());
  }

  /**
   * Story/prose edits (how / life / name) — **invent phase only**.
   * Challenge and post-challenge freeze the written invent.
   */
  function canContributeStory() {
    if (!isHotseat()) return true;
    if (!isMyTurn()) return false;
    const f = invent(getViewId());
    if (!f || f.abandoned) return false;
    return !isInventContentFrozen(f);
  }


  /**
   * Owner-only: enter Challenge on their own invent (still in invent, not locked).
   * Not used for Pilot/Scale — see canRunDeploy.
   */
  function canFaceChallenge() {
    if (!isHotseat()) return true;
    if (!isMyTurn()) return false;
    if (getViewId() !== getActiveId()) return false;
    const f = invent(getViewId());
    if (!f || f.abandoned) return false;
    const phase = inventPhaseOf(getViewId());
    // Owner: Face from invent or after fail (challenge_locked); resume mid-challenge
    return (
      phase === "invent" ||
      phase === "concerns" ||
      phase === "challenge_locked" ||
      phase === "challenge"
    );
  }

  function canOpenDeployBay() {
    if (!isHotseat()) return true;
    if (!isMyTurn()) return false;
    if (getViewId() !== getActiveId()) return false;
    const phase = inventPhaseOf(getViewId());
    return phase === "deploy_ready" || phase === "scale_ready";
  }

  /**
   * Stack / emTech layering — **invent phase only**.
   * Passing Challenge locks the invention: no more layers for anyone.
   */
  function canEditStack() {
    if (!isHotseat()) return true;
    if (!isMyTurn()) return false;
    if (!session || session.place?.status !== "playing") return false;
    const f = invent(getViewId());
    if (!f || f.abandoned) return false;
    return !isInventContentFrozen(f);
  }

  /** Layering after Face Challenge is not allowed — use canRunDeploy for Pilot/Scale. */
  function canHelpDeploy() {
    return false;
  }

  /**
   * Active seat may Pilot / Scale a **deploy-ready** invent they are viewing
   * (own or someone else's). Invention is already locked; they pay fielding costs.
   * Challenge remains owner-only.
   */
  function canRunDeploy() {
    if (!isHotseat()) return true;
    if (!isMyTurn()) return false;
    if (!session || session.place?.status !== "playing") return false;
    const f = invent(getViewId());
    if (!f || f.abandoned) return false;
    const phase = inventPhaseOf(getViewId());
    const actor = activeInvent();
    const acts = allowedActions({
      inventPhase: phase,
      isOwner: getViewId() === getActiveId(),
      isActive: true,
      pilotLockedThisTurn: Boolean(actor?.pilotFailedThisTurn),
      scaleLockedThisTurn: Boolean(actor?.scaleFailedThisTurn),
      placePlaying: true,
    });
    return acts.pilot || acts.scale;
  }

  /**
   * Push session place + viewed invent + active resources into solo state.
   * @param {object} state — game.js state
   * @param {object} [opts]
   */
  function hydrateSoloState(state, opts = {}) {
    const prevViewSeatId = state.mp?.viewSeatId;
    if (!session?.place) return;
    const place = session.place;
    const vId = getViewId();
    const aId = getActiveId();
    const view = session.invents[vId];
    const actor = session.invents[aId] || view;
    if (!view || !actor) return;

    const phase = forgePhase(vId);
    state.mp = {
      mode: "hotseat",
      viewSeatId: vId,
      activeSeatId: aId,
      viewingOther: vId !== aId,
      forgePhase: phase,
            canContributeStory: canContributeStory(),
      canFaceChallenge: canFaceChallenge(),
      canEditStack: canEditStack(),
      canHelpDeploy: canHelpDeploy(),
      canRunDeploy: canRunDeploy(),
      inventLocked:
        phase === "deploy" ||
        phase === "scaled" ||
        phase === "challenge" ||
        phase === "challenge_locked",
    };

    state.mission = cloneMission(place.mission);
    // Theme / non-learning quests: never carry module lesson chrome into invent
    if (state.mission && state.mission.isLearningModule !== true) {
      delete state.mission.module;
      delete state.mission.lesson;
      delete state.mission.totalLessons;
      delete state.mission.aiTutorContext;
      delete state.mission.isLearningModule;
    }
    state.global = opts.global || state.global;
    if (!state.global && place.globalId) {
      state.global = { id: place.globalId };
    }
    // Invent calendar is personal (viewed invent) — not the shared place baseline
    state.year = inventYear(view, place);
    state.waits = inventWaits(view, place);
    state.turn = place.turn || 0;
    state.pressure = clonePressure(place.pressure);
    state.lastNews = place.lastNews || "";
    state.marketNews = place.marketNews
      ? {
          ...place.marketNews,
          techIds: place.marketNews.techIds ? [...place.marketNews.techIds] : undefined,
          domains: place.marketNews.domains ? [...place.marketNews.domains] : undefined,
        }
      : null;
    if (place.lastYearBulletin) state.lastYearBulletin = place.lastYearBulletin;

    // Invention = viewed invent
    state.inventionName = view.inventionName || "";
    state.inventionHow = view.inventionHow || "";
    state.inventionImpact = view.inventionImpact || "";
    if (view.hexBoard && typeof view.hexBoard === "object") {
      const seatChanged = Boolean(
        prevViewSeatId && vId && prevViewSeatId !== vId
      );
      const takeIncoming = preferIncomingHexBoard(
        state.hexBoard,
        view.hexBoard,
        {
          forceIncoming: Boolean(opts.forceHexBoard || seatChanged),
          keepLocal: Boolean(opts.keepLocalHexBoard),
        }
      );
      if (takeIncoming) {
        try {
          state.hexBoard = JSON.parse(JSON.stringify(view.hexBoard));
        } catch {
          state.hexBoard = view.hexBoard;
        }
      }
    }
    state.selectedTechIds = (view.stack || []).map((x) => x.techId);
    state.challengePassed = Boolean(view.challengePassed);
    state.challengeLocked = Boolean(view.challengeLocked);
    state.challengeVerdict = view.challengeVerdict;
    state.challengeAnswer = view.challengeAnswer || "";
    state.hadChallengeAttempt = Boolean(view.hadChallengeAttempt);
    state.lastChallengeVerdict = view.lastChallengeVerdict;
    state.challengeFails = view.challengeFails || 0;
    state.deployStage = inventToSoloDeployStage(view.deployStage);
    state.deployUnlocked = Boolean(
      view.challengePassed || (view.deployStage && view.deployStage !== "none")
    );
    state.stagedDropPool = view.stagedDropPool || 0;
    state.stagedDropRemaining =
      view.deployStage === "pilot_ok"
        ? view.stagedDropPool || 0
        : view.deployStage === "scaled" || view.deployStage === "new_normal"
          ? 0
          : view.stagedDropPool || 0;
    const deployDone =
      view.deployStage === "scaled" || view.deployStage === "new_normal";
    state.dropPilotApplied =
      view.deployStage === "pilot_ok" || deployDone ? 1 : 0;
    state.dropScaleApplied = deployDone ? 1 : 0;
    state.dropNewNormalApplied = view.deployStage === "new_normal" ? 1 : 0;

    // Resources = always the active player (who is paying)
    state.ap = actor.ap;
    state.apMax = actor.apMax;
    state.budget = actor.budget;
    state.will = actor.will;
    state.apSpentThisTurn = actor.apSpentThisTurn || 0;
    state.writeCommitsThisTurn = actor.writeCommitsThisTurn || 0;
    state.techAddedThisTurn = { ...(actor.techAddedThisTurn || {}) };
    // Screen phase: owner of the viewed invent, or active actor if viewing self
    const phaseSrc = vId === aId ? actor : view;
    if (
      view.challengePassed ||
      view.deployStage === "pilot_ok" ||
      view.deployStage === "scaled" ||
      view.deployStage === "new_normal"
    ) {
      state.turnPhase = "between_stages";
    } else if (phaseSrc.turnPhase === "scrutiny" || view.turnPhase === "scrutiny") {
      state.turnPhase = "scrutiny";
    } else {
      state.turnPhase = "act";
    }
  }

  /**
   * Write solo state back into session (view invention + active resources + place).
   * @param {object} state
   */
  function syncSoloToSession(state) {
    if (!session?.place) return session;
    const vId = getViewId();
    const aId = getActiveId();
    const view = session.invents[vId];
    const actor = session.invents[aId];
    if (!view || !actor) return session;

    // Place (shared crisis + baseline year only — invent calendars live on invents)
    session.place.turn = state.turn || 0;
    session.place.pressure = clonePressure(state.pressure);
    session.place.lastNews = state.lastNews || session.place.lastNews;

    // Personal invent calendar for the viewed invent (feasibility / AI timing use this)
    view.year = state.year;
    view.waits = state.waits || 0;

    // Invention freeze: only pure invent phase may write story + stack back
    const inventOpen = !isInventContentFrozen(view);
    if (inventOpen) {
      const prev = new Map((view.stack || []).map((x) => [x.techId, x.addedBy]));
      view.stack = (state.selectedTechIds || []).map((techId) => ({
        techId,
        addedBy: prev.get(techId) || aId,
      }));
      view.inventionName = state.inventionName || "";
      view.inventionHow = state.inventionHow || "";
      view.inventionImpact = state.inventionImpact || "";
    }
    // Hex board stays editable until pathway held / fielded
    if (state.hexBoard && !isHexBoardFrozen(view)) {
      try {
        view.hexBoard = JSON.parse(JSON.stringify(state.hexBoard));
        view.concernsSummoned = Boolean(state.hexBoard.concernsSummoned);
      } catch {
        view.hexBoard = state.hexBoard;
      }
    }

    // Challenge progress: owner only (entering / resolving scrutiny on their idea)
    if (vId === aId) {
      view.challengeVerdict = state.challengeVerdict;
      view.challengeAnswer = state.challengeAnswer || "";
      view.hadChallengeAttempt = Boolean(state.hadChallengeAttempt);
      view.lastChallengeVerdict = state.lastChallengeVerdict;
      view.challengeFails = state.challengeFails || 0;
      // Mirror both directions so "Back to invent" (reopen) can clear the lock
      view.challengePassed = Boolean(state.challengePassed);
      if (state.turnPhase === "scrutiny") view.turnPhase = "scrutiny";
      else if (state.challengePassed || state.deployUnlocked) view.turnPhase = "between_stages";
      else if (state.turnPhase === "act") view.turnPhase = "act";
      // Reopened invent: clear Pilot progress (never un-scale a finished invent)
      if (!state.challengePassed && state.turnPhase !== "scrutiny" && view.deployStage !== "scaled") {
        view.deployStage = "none";
        view.stagedDropPool = 0;
      }
    }

    // Deploy progress only while Challenge is still passed (reopen clears this)
    if (state.challengePassed) {
      view.challengePassed = true;
      view.deployStage = soloToInventDeployStage(state.deployStage);
      view.stagedDropPool = state.stagedDropPool || view.stagedDropPool || 0;
      view.turnPhase = "between_stages";
      if (view.deployStage === "scaled") {
        view.successfulScales = Math.max(1, view.successfulScales || 0);
      }
    }

    // Active resources always (who is paying for layer / Pilot / Scale)
    actor.ap = state.ap;
    actor.apMax = state.apMax;
    actor.budget = state.budget;
    actor.will = state.will;
    actor.apSpentThisTurn = state.apSpentThisTurn || 0;
    actor.writeCommitsThisTurn = state.writeCommitsThisTurn || 0;
    actor.techAddedThisTurn = { ...(state.techAddedThisTurn || {}) };
    if (aId === vId) {
      actor.turnPhase = view.turnPhase;
    }

    session.version = (session.version || 0) + 1;
    return session;
  }

  function startFromPick(names, mission, globalId) {
    let s = createHotseatSession(names);
    s = setHotseatQuest(s, mission, globalId);
    const started = startHotseatQuest(s);
    if (!started.ok) return { ok: false, error: started.error };
    session = started.session;
    viewSeatId = activeSeatId(session);
    return { ok: true, session };
  }

  function setViewSeat(seatId) {
    if (!session?.invents?.[seatId]) return false;
    viewSeatId = seatId;
    return true;
  }

  function cycleView(delta = 1) {
    if (!session?.seatOrder?.length) return null;
    const order = session.seatOrder;
    const cur = Math.max(0, order.indexOf(getViewId()));
    const next = order[(cur + delta + order.length) % order.length];
    viewSeatId = next;
    return next;
  }

  /**
   * Layer tech onto viewed invent, paid by active (via applyMpAction).
   * Blocked during challenge phase.
   */
  function layerTechOnView(techId, tech) {
    if (!session) return { ok: false, error: "no_session" };
    if (!canEditStack()) {
      const phase = forgePhase(getViewId());
      return {
        ok: false,
        error:
          phase === "challenge" || phase === "challenge_locked"
            ? "challenge_locked"
            : phase === "scaled"
              ? "already_scaled"
              : "stack_locked",
      };
    }
    const target = getViewId();
    const active = getActiveId();
    const action =
      target === active
        ? { type: "select_tech", payload: { techId, tech } }
        : { type: "layer_tech", payload: { techId, targetSeatId: target, tech } };
    const r = hotseatApplyAction(session, action, active);
    if (r.ok) session = r.session;
    return r;
  }

  function removeTechFromView(techId) {
    if (!session) return { ok: false, error: "no_session" };
    const target = getViewId();
    const active = getActiveId();
    const r = hotseatApplyAction(
      session,
      { type: "deselect_tech", payload: { techId, targetSeatId: target } },
      active
    );
    if (r.ok) session = r.session;
    return r;
  }

  /** End turn / pass device — rotate active, snap view to new active */
  function passDevice() {
    if (!session) return { ok: false, error: "no_session" };
    const r = hotseatApplyAction(session, { type: "end_turn" }, getActiveId());
    if (!r.ok) return r;
    session = r.session;
    viewSeatId = activeSeatId(session);
    return {
      ok: true,
      session,
      seat: activeSeat(session),
      events: r.events || [],
    };
  }

  function waitShared(payload) {
    if (!session) return { ok: false, error: "no_session" };
    // Wait advances the *active seat's* invent only — not while helping on another invent
    if (viewingOther()) {
      return { ok: false, error: "wait_own_invent_only", session };
    }
    const r = hotseatApplyAction(session, { type: "wait", payload }, getActiveId());
    if (r.ok) {
      session = r.session;
      viewSeatId = activeSeatId(session);
    }
    return r; // includes events (e.g. market_news on seat wrap)
  }

  /**
   * Owner reopens their invent after Challenge/Pilot ("Back to invent").
   * Unlocks story + stack; clears challenge pass and pilot progress.
   */
  function reopenInvent() {
    if (!session) return { ok: false, error: "no_session" };
    const active = getActiveId();
    // Always reopen the active seat's own invent (owner-only on server)
    const r = hotseatApplyAction(
      session,
      { type: "reopen_invent", payload: { targetSeatId: active } },
      active
    );
    if (r.ok) {
      session = r.session;
      viewSeatId = active;
    }
    return r;
  }

  /** Apply any mp-session action as the active seat (challenge pass/fail, pilot, …). */
  function applyActiveAction(action) {
    if (!session) return { ok: false, error: "no_session" };
    const active = getActiveId();
    if (!active) return { ok: false, error: "no_seat" };
    const r = hotseatApplyAction(session, action, active);
    if (r.ok) session = r.session;
    return r;
  }

  function clear() {
    session = null;
    viewSeatId = null;
  }

  function seatSummaries() {
    if (!session) return [];
    return (session.seatOrder || []).map((id) => {
      const seat = session.seats.find((s) => s.id === id);
      const f = session.invents[id];
      const phase = forgePhase(id);
      return {
        id,
        displayName: seat?.displayName || id,
        active: id === getActiveId(),
        viewing: id === getViewId(),
        abandoned: Boolean(f?.abandoned),
        // Hotseat is one device — seats are never "left the room"
        connected: true,
        stackCount: (f?.stack || []).length,
        inventionName: f?.inventionName || "",
        year: inventYear(f, session.place),
        waits: inventWaits(f, session.place),
        deployStage: f?.deployStage || "none",
        challengePassed: Boolean(f?.challengePassed),
        phase,
        budget: f?.budget,
        will: f?.will,
      };
    });
  }

  return {
    getSession,
    setSession: (s) => {
      session = s;
      if (s && !viewSeatId) viewSeatId = activeSeatId(s);
    },
    getActiveId,
    getViewId,
    isHotseat,
    canContributeStory,
    canFaceChallenge,
    canEditStack,
    canHelpDeploy,
    canRunDeploy,
    forgePhase,
    viewedPhase,
    isMyTurn,
    viewingOther,
    hydrateSoloState,
    syncSoloToSession,
    startFromPick,
    setViewSeat,
    cycleView,
    applyActiveAction,
    inventPhaseOf,
    canOpenDeployBay,
    layerTechOnView,
    removeTechFromView,
    passDevice,
    waitShared,
    reopenInvent,
    clear,
    seatSummaries,
    activeSeat: () => (session ? activeSeat(session) : null),
  };
}

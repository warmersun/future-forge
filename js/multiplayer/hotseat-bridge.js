/**
 * Hotseat ↔ solo workshop bridge.
 * Solo invent / challenge / deploy UI is reused; only seat focus differs.
 */

import {
  createHotseatSession,
  setHotseatMission,
  startHotseatMission,
  hotseatApplyAction,
  activeSeatId,
  activeSeat,
} from "./hotseat.js";
import { cloneMission } from "../sim/state.js";
import { clonePressure } from "../sim/pressure.js";
import { forgeInventYear, forgeInventWaits } from "../sim/mp-session.js";

/** Map forge deployStage → solo deployStage string */
export function forgeToSoloDeployStage(ds) {
  if (ds === "pilot_ok" || ds === "pilot") return "pilot";
  if (ds === "scaled" || ds === "scale") return "scale";
  if (ds === "new_normal") return "new_normal";
  return "none";
}

export function soloToForgeDeployStage(ds) {
  if (ds === "pilot") return "pilot_ok";
  if (ds === "scale" || ds === "new_normal") return "scaled";
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

  function forge(id) {
    const sid = id || getViewId();
    return session?.forges?.[sid] || null;
  }

  function activeForge() {
    const id = getActiveId();
    return id ? session?.forges?.[id] : null;
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
   * Lifecycle of a personal invent (viewed forge).
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
    const f = forge(id);
    if (!f) return "none";
    if (f.abandoned) return "locked";
    if (f.deployStage === "scaled" || f.deployStage === "new_normal") return "scaled";
    if (f.challengePassed || f.deployStage === "pilot_ok" || f.deployStage === "pilot") {
      return "deploy";
    }
    if (f.turnPhase === "scrutiny") return "challenge";
    return "invent";
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
    const f = forge(getViewId());
    if (!f || f.abandoned) return false;
    // Challenge started → invent frozen (owner + helpers)
    if (
      f.turnPhase === "scrutiny" ||
      f.challengePassed ||
      f.deployStage === "pilot_ok" ||
      f.deployStage === "scaled"
    ) {
      return false;
    }
    return forgePhase(getViewId()) === "invent";
  }

  /** @deprecated use canContributeStory — kept for callers */
  function canEditProse() {
    return canContributeStory();
  }

  /**
   * Owner-only: enter Challenge on their own invent (still in invent, not locked).
   * Not used for Pilot/Scale — see canRunDeploy.
   */
  function canFaceChallenge() {
    if (!isHotseat()) return true;
    if (!isMyTurn()) return false;
    if (getViewId() !== getActiveId()) return false;
    const f = forge(getViewId());
    if (!f || f.abandoned) return false;
    const phase = forgePhase(getViewId());
    // Owner may enter challenge from invent, or return to deploy bay after pass
    if (phase === "scaled" || phase === "locked") return false;
    if (phase === "challenge") return true; // resume own scrutiny
    if (phase === "deploy") return true; // open deploy bay on own invent
    return phase === "invent";
  }

  /**
   * Stack / emTech layering — **invent phase only**.
   * Passing Challenge locks the invention: no more layers for anyone.
   */
  function canEditStack() {
    if (!isHotseat()) return true;
    if (!isMyTurn()) return false;
    if (!session || session.place?.status !== "playing") return false;
    const f = forge(getViewId());
    if (!f || f.abandoned) return false;
    if (
      f.turnPhase === "scrutiny" ||
      f.challengePassed ||
      f.deployStage === "pilot_ok" ||
      f.deployStage === "scaled"
    ) {
      return false;
    }
    return forgePhase(getViewId()) === "invent";
  }

  /**
   * @deprecated layering after challenge is not allowed — use canRunDeploy for Pilot/Scale.
   */
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
    const f = forge(getViewId());
    if (!f || f.abandoned) return false;
    return forgePhase(getViewId()) === "deploy";
  }

  /**
   * Push session place + viewed forge + active resources into solo state.
   * @param {object} state — game.js state
   * @param {object} [opts]
   */
  function hydrateSoloState(state, opts = {}) {
    if (!session?.place) return;
    const place = session.place;
    const vId = getViewId();
    const aId = getActiveId();
    const view = session.forges[vId];
    const actor = session.forges[aId] || view;
    if (!view || !actor) return;

    const phase = forgePhase(vId);
    state.mp = {
      mode: "hotseat",
      viewSeatId: vId,
      activeSeatId: aId,
      viewingOther: vId !== aId,
      forgePhase: phase,
      canEditProse: canContributeStory(),
      canContributeStory: canContributeStory(),
      canFaceChallenge: canFaceChallenge(),
      canEditStack: canEditStack(),
      canHelpDeploy: canHelpDeploy(),
      canRunDeploy: canRunDeploy(),
      inventLocked: phase === "deploy" || phase === "scaled" || phase === "challenge",
    };

    state.mission = cloneMission(place.mission);
    state.global = opts.global || state.global;
    if (!state.global && place.globalId) {
      state.global = { id: place.globalId };
    }
    // Invent calendar is personal (viewed forge) — not the shared place baseline
    state.year = forgeInventYear(view, place);
    state.waits = forgeInventWaits(view, place);
    state.turn = place.turn || 0;
    state.pressure = clonePressure(place.pressure);
    state.lastNews = place.lastNews || "";

    // Invention = viewed forge
    state.inventionName = view.inventionName || "";
    state.inventionHow = view.inventionHow || "";
    state.inventionImpact = view.inventionImpact || "";
    state.selectedTechIds = (view.stack || []).map((x) => x.techId);
    state.challengePassed = Boolean(view.challengePassed);
    state.challengeVerdict = view.challengeVerdict;
    state.challengeAnswer = view.challengeAnswer || "";
    state.hadChallengeAttempt = Boolean(view.hadChallengeAttempt);
    state.lastChallengeVerdict = view.lastChallengeVerdict;
    state.challengeFails = view.challengeFails || 0;
    state.deployStage = forgeToSoloDeployStage(view.deployStage);
    state.deployUnlocked = Boolean(view.challengePassed || view.deployStage !== "none");
    state.stagedDropPool = view.stagedDropPool || 0;
    state.stagedDropRemaining =
      view.deployStage === "pilot_ok"
        ? view.stagedDropPool || 0
        : view.deployStage === "scaled"
          ? 0
          : view.stagedDropPool || 0;
    state.dropPilotApplied = view.deployStage === "pilot_ok" || view.deployStage === "scaled" ? 1 : 0;
    state.dropScaleApplied = view.deployStage === "scaled" ? 1 : 0;

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
    if (view.challengePassed || view.deployStage === "pilot_ok" || view.deployStage === "scaled") {
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
    const view = session.forges[vId];
    const actor = session.forges[aId];
    if (!view || !actor) return session;

    // Place (shared crisis + baseline year only — invent calendars live on forges)
    session.place.turn = state.turn || 0;
    session.place.pressure = clonePressure(state.pressure);
    session.place.lastNews = state.lastNews || session.place.lastNews;

    // Personal invent calendar for the viewed forge (feasibility / AI timing use this)
    view.year = state.year;
    view.waits = state.waits || 0;

    // Invention freeze: after Challenge starts or passes, story + stack no longer write back
    const inventOpen =
      !view.challengePassed &&
      view.turnPhase !== "scrutiny" &&
      view.deployStage !== "scaled" &&
      view.deployStage !== "pilot_ok";
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
      view.deployStage = soloToForgeDeployStage(state.deployStage);
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
    s = setHotseatMission(s, mission, globalId);
    const started = startHotseatMission(s);
    if (!started.ok) return { ok: false, error: started.error };
    session = started.session;
    viewSeatId = activeSeatId(session);
    return { ok: true, session };
  }

  function setViewSeat(seatId) {
    if (!session?.forges?.[seatId]) return false;
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
   * Layer tech onto viewed forge, paid by active (via applyMpAction).
   * Blocked during challenge phase.
   */
  function layerTechOnView(techId, tech) {
    if (!session) return { ok: false, error: "no_session" };
    if (!canEditStack()) {
      const phase = forgePhase(getViewId());
      return {
        ok: false,
        error:
          phase === "challenge"
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
    return { ok: true, session, seat: activeSeat(session) };
  }

  function waitShared(payload) {
    if (!session) return { ok: false, error: "no_session" };
    const r = hotseatApplyAction(session, { type: "wait", payload }, getActiveId());
    if (r.ok) {
      session = r.session;
      viewSeatId = activeSeatId(session);
    }
    return r;
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

  function clear() {
    session = null;
    viewSeatId = null;
  }

  function seatSummaries() {
    if (!session) return [];
    return (session.seatOrder || []).map((id) => {
      const seat = session.seats.find((s) => s.id === id);
      const f = session.forges[id];
      const phase = forgePhase(id);
      return {
        id,
        displayName: seat?.displayName || id,
        active: id === getActiveId(),
        viewing: id === getViewId(),
        abandoned: Boolean(f?.abandoned),
        stackCount: (f?.stack || []).length,
        inventionName: f?.inventionName || "",
        year: forgeInventYear(f, session.place),
        waits: forgeInventWaits(f, session.place),
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
    canEditProse,
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

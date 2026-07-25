/**
 * Online room ↔ solo workshop bridge.
 * Same invent / challenge / deploy screens as hotseat; state is server-authoritative.
 */

import { cloneMission } from "../sim/state.js";
import { clonePressure } from "../sim/pressure.js";
import { forgeInventYear, forgeInventWaits } from "../sim/mp-session.js";
import { forgeToSoloDeployStage, soloToForgeDeployStage } from "./hotseat-bridge.js";

/**
 * @returns {object} bridge API
 */
export function createRoomBridge() {
  /** @type {import('./client.js').RoomClient|null} */
  let client = null;
  /** seat / player id whose invent is displayed */
  let viewSeatId = null;
  /** @type {Set<Function>} */
  const listeners = new Set();

  function attach(roomClient) {
    client = roomClient || null;
    if (client && !viewSeatId) {
      viewSeatId = myId();
    }
  }

  function clear() {
    client = null;
    viewSeatId = null;
  }

  function snap() {
    return client?.snapshot || null;
  }

  function mp() {
    return snap()?.mp || null;
  }

  function isRoom() {
    const s = snap();
    return Boolean(s?.mp?.place || s?.phase === "playing" || s?.phase === "outcome");
  }

  function myId() {
    return snap()?.you?.id || client?.session?.playerId || null;
  }

  function getActiveId() {
    return snap()?.activeSeatId || mp()?.activeSeatId || null;
  }

  function getViewId() {
    return viewSeatId || myId() || getActiveId();
  }

  function setViewSeat(id) {
    if (!mp()?.forges?.[id] && !snap()?.forges?.[id]) return false;
    viewSeatId = id;
    return true;
  }

  function forge(id) {
    const sid = id || getViewId();
    return mp()?.forges?.[sid] || snap()?.forges?.[sid] || null;
  }

  function isMyTurn() {
    if (!isRoom()) return true;
    const a = getActiveId();
    const me = myId();
    return Boolean(a && me && a === me && (snap()?.place?.status === "playing" || snap()?.phase === "playing"));
  }

  function viewingOther() {
    return isRoom() && getViewId() !== myId();
  }

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
   * Story/prose edits — invent phase only.
   * Entering Challenge (turnPhase scrutiny) freezes story for everyone,
   * including helpers layering on that invent.
   */
  function canContributeStory() {
    if (!isRoom()) return true;
    if (!isMyTurn()) return false;
    const f = forge(getViewId());
    if (!f || f.abandoned) return false;
    // Face the challenge locks invent immediately (scrutiny), before pass/fail
    if (
      f.turnPhase === "scrutiny" ||
      f.challengePassed ||
      f.deployStage === "pilot_ok" ||
      f.deployStage === "scaled" ||
      forgePhase(getViewId()) === "challenge"
    ) {
      return false;
    }
    return forgePhase(getViewId()) === "invent";
  }

  function canFaceChallenge() {
    if (!isRoom()) return true;
    if (!isMyTurn()) return false;
    // Only your own invent for Challenge
    if (getViewId() !== myId()) return false;
    const f = forge(getViewId());
    if (!f || f.abandoned) return false;
    const phase = forgePhase(getViewId());
    if (phase === "scaled" || phase === "locked") return false;
    return phase === "invent" || phase === "challenge" || phase === "deploy";
  }

  function canEditStack() {
    if (!isRoom()) return true;
    if (!isMyTurn()) return false;
    if (snap()?.place?.status !== "playing" && snap()?.phase !== "playing") return false;
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

  function canHelpDeploy() {
    return false;
  }

  function canRunDeploy() {
    if (!isRoom()) return true;
    if (!isMyTurn()) return false;
    if (snap()?.place?.status !== "playing" && snap()?.phase !== "playing") return false;
    const f = forge(getViewId());
    if (!f || f.abandoned) return false;
    return forgePhase(getViewId()) === "deploy";
  }

  function seatSummaries() {
    const s = snap();
    const m = mp();
    if (!s || !m) return [];
    const order = m.seatOrder || (s.players || []).map((p) => p.id);
    return order.map((id) => {
      const p = (s.players || []).find((x) => x.id === id);
      const f = m.forges?.[id];
      const phase = forgePhase(id);
      return {
        id,
        displayName: p?.displayName || id,
        active: id === getActiveId(),
        viewing: id === getViewId(),
        abandoned: Boolean(f?.abandoned),
        stackCount: (f?.stack || []).length,
        inventionName: f?.inventionName || "",
        deployStage: f?.deployStage || "none",
        challengePassed: Boolean(f?.challengePassed),
        phase,
        budget: f?.budget,
        will: f?.will,
      };
    });
  }

  function activeSeat() {
    const id = getActiveId();
    if (!id) return null;
    const p = (snap()?.players || []).find((x) => x.id === id);
    return { id, displayName: p?.displayName || id };
  }

  function hydrateSoloState(state, opts = {}) {
    const s = snap();
    const m = mp();
    const place = s?.place || m?.place;
    if (!place) return;
    const vId = getViewId();
    const aId = getActiveId();
    const view = m?.forges?.[vId];
    const actor = m?.forges?.[aId] || view;
    if (!view || !actor) return;

    const phase = forgePhase(vId);
    state.mp = {
      mode: "room",
      code: s.code,
      viewSeatId: vId,
      activeSeatId: aId,
      mySeatId: myId(),
      viewingOther: vId !== myId(),
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
    // Invent calendar is personal (viewed forge) — feasibility / AI timing use this
    state.year = forgeInventYear(view, place);
    state.waits = forgeInventWaits(view, place);
    state.turn = place.turn || m.round || 0;
    state.pressure = clonePressure(place.pressure);
    state.lastNews = place.lastNews || "";

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
    // Live challenge follow-along fields
    if (view.challengeAngle) state.challengeAngle = view.challengeAngle;
    if (view.challengeSpeech) state.challengeText = view.challengeSpeech;
    if (view.challengeQuestion) state.challengeQuestion = view.challengeQuestion;
    state.challengeJudging = Boolean(view.challengeJudging);
    if (view.challengeMoveMode) state.scrutinyMoveMode = view.challengeMoveMode;
    // Always apply (including empty) so sticky local feedback (e.g. sidestep) clears
    // when switching seats / following another player's challenge.
    state.challengeFeedback = view.challengeFeedback || "";
    if (view.scrutinyPublic) {
      try {
        state.scrutiny = JSON.parse(JSON.stringify(view.scrutinyPublic));
      } catch {
        state.scrutiny = view.scrutinyPublic;
      }
    }
    // Shared vision revision (followers re-peek when this bumps)
    state.mpVisionRev = view.visionRev || 0;
    state.mpVisionSessionId = view.visionSessionId || "";
    state.deployStage = forgeToSoloDeployStage(view.deployStage);
    // Don't clobber a local unlock while submit_challenge is in flight
    const scrutinyCleared =
      view.scrutinyPublic?.encounters?.length &&
      view.scrutinyPublic.encounters.every((e) => e.cleared);
    if (view.challengePassed || view.deployStage !== "none" || scrutinyCleared) {
      state.deployUnlocked = true;
    } else if (view.turnPhase !== "scrutiny") {
      state.deployUnlocked = false;
    }
    state.stagedDropPool = view.stagedDropPool || state.stagedDropPool || 0;
    state.stagedDropRemaining =
      view.deployStage === "pilot_ok"
        ? view.stagedDropPool || 0
        : view.deployStage === "scaled"
          ? 0
          : view.stagedDropPool || 0;
    state.dropPilotApplied = view.deployStage === "pilot_ok" || view.deployStage === "scaled" ? 1 : 0;
    state.dropScaleApplied = view.deployStage === "scaled" ? 1 : 0;

    // Resources = always *you* (the local player), who pays
    const me = m.forges?.[myId()] || actor;
    state.ap = me.ap;
    state.apMax = me.apMax;
    state.budget = me.budget;
    state.will = me.will;
    state.apSpentThisTurn = me.apSpentThisTurn || 0;
    state.writeCommitsThisTurn = me.writeCommitsThisTurn || 0;
    state.techAddedThisTurn = { ...(me.techAddedThisTurn || {}) };

    if (view.challengePassed || view.deployStage === "pilot_ok" || view.deployStage === "scaled") {
      state.turnPhase = "between_stages";
    } else if (view.turnPhase === "scrutiny" || me.turnPhase === "scrutiny") {
      state.turnPhase = "scrutiny";
    } else {
      state.turnPhase = "act";
    }
  }

  /**
   * Send action to room server. Returns { ok } or throws.
   */
  function send(action) {
    if (!client) throw new Error("no_room_client");
    client.sendAction(action);
    return { ok: true };
  }

  function onUpdate(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function notify() {
    for (const fn of listeners) {
      try {
        fn(snap());
      } catch (e) {
        console.error("[room-bridge]", e);
      }
    }
  }

  return {
    attach,
    clear,
    isRoom,
    isHotseat: () => false,
    getSession: () => mp(),
    getActiveId,
    getViewId,
    myId,
    setViewSeat,
    forge,
    isMyTurn,
    viewingOther,
    forgePhase,
    viewedPhase,
    canContributeStory,
    canEditProse: canContributeStory,
    canFaceChallenge,
    canEditStack,
    canHelpDeploy,
    canRunDeploy,
    seatSummaries,
    activeSeat,
    hydrateSoloState,
    /** Room state is server-owned; local sync is no-op except notify. */
    syncSoloToSession: () => mp(),
    send,
    onUpdate,
    notify,
    client: () => client,
    soloToForgeDeployStage,
  };
}

/**
 * Online room ↔ solo workshop bridge.
 * Same invent / challenge / deploy screens as hotseat; state is server-authoritative.
 */

import { cloneMission } from "../sim/state.js";
import { clonePressure } from "../sim/pressure.js";
import { inventYear, inventWaits } from "../sim/mp-session.js";
import {
  deriveInventPhase,
  inventPhaseToUiPhase,
  isInventContentFrozen,
  allowedActions,
} from "../sim/invent-phase.js";
import { inventToSoloDeployStage, soloToInventDeployStage } from "./hotseat-bridge.js";

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
    const s = snap();
    if (s?.activeSeatId) return s.activeSeatId;
    const m = mp();
    if (m?.activeSeatId) return m.activeSeatId;
    // Fallback: derive from activeIndex + seatOrder (older snapshots)
    if (m?.seatOrder?.length && m.activeIndex != null) {
      const i = Math.max(0, Math.min(m.activeIndex, m.seatOrder.length - 1));
      return m.seatOrder[i] || null;
    }
    return null;
  }

  function getViewId() {
    return viewSeatId || myId() || getActiveId();
  }

  function setViewSeat(id) {
    if (!mp()?.invents?.[id] && !snap()?.invents?.[id]) return false;
    viewSeatId = id;
    return true;
  }

  function invent(id) {
    const sid = id || getViewId();
    return mp()?.invents?.[sid] || snap()?.invents?.[sid] || null;
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
   * Story/prose edits — invent phase only.
   * Entering Challenge (turnPhase scrutiny) freezes story for everyone,
   * including helpers layering on that invent.
   */
  function canContributeStory() {
    if (!isRoom()) return true;
    if (!isMyTurn()) return false;
    const f = invent(getViewId());
    if (!f || f.abandoned) return false;
    // challenge / challenge_locked / deploy / fielded all freeze story
    return !isInventContentFrozen(f);
  }

  function canFaceChallenge() {
    if (!isRoom()) return true;
    if (!isMyTurn()) return false;
    // Only your own invent for Challenge
    if (getViewId() !== myId()) return false;
    const f = invent(getViewId());
    if (!f || f.abandoned) return false;
    const phase = inventPhaseOf(getViewId());
    // Owner may Face from invent or after fail (challenge_locked); resume mid-challenge
    return phase === "invent" || phase === "challenge_locked" || phase === "challenge";
  }

  /** Owner may open deploy bay when invent is deploy_ready / scale_ready */
  function canOpenDeployBay() {
    if (!isRoom()) return true;
    if (!isMyTurn()) return false;
    if (getViewId() !== myId()) return false;
    const phase = inventPhaseOf(getViewId());
    return phase === "deploy_ready" || phase === "scale_ready";
  }

  function canEditStack() {
    if (!isRoom()) return true;
    if (!isMyTurn()) return false;
    if (snap()?.place?.status !== "playing" && snap()?.phase !== "playing") return false;
    const f = invent(getViewId());
    if (!f || f.abandoned) return false;
    return !isInventContentFrozen(f);
  }

  function canHelpDeploy() {
    return false;
  }

  function canRunDeploy() {
    if (!isRoom()) return true;
    if (!isMyTurn()) return false;
    if (snap()?.place?.status !== "playing" && snap()?.phase !== "playing") return false;
    const f = invent(getViewId());
    if (!f || f.abandoned) return false;
    const phase = inventPhaseOf(getViewId());
    const actor = invent(myId());
    const acts = allowedActions({
      inventPhase: phase,
      isOwner: getViewId() === myId(),
      isActive: true,
      pilotLockedThisTurn: Boolean(actor?.pilotFailedThisTurn),
      scaleLockedThisTurn: Boolean(actor?.scaleFailedThisTurn),
      placePlaying: true,
    });
    return acts.pilot || acts.scale;
  }

  function seatSummaries() {
    const s = snap();
    const m = mp();
    if (!s || !m) return [];
    const order = m.seatOrder || (s.players || []).map((p) => p.id);
    return order.map((id) => {
      const p = (s.players || []).find((x) => x.id === id);
      const f = m.invents?.[id];
      const phase = forgePhase(id);
      // Presence: player.connected from WS; invent.connected also cleared on disconnect
      const connected =
        p != null
          ? Boolean(p.connected)
          : f?.connected !== false;
      return {
        id,
        displayName: p?.displayName || f?.displayName || id,
        active: id === getActiveId(),
        viewing: id === getViewId(),
        abandoned: Boolean(f?.abandoned),
        connected,
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
    const view = m?.invents?.[vId];
    const actor = m?.invents?.[aId] || view;
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
    state.global = opts.global || state.global;
    if (!state.global && place.globalId) {
      state.global = { id: place.globalId };
    }
    // Invent calendar is personal (viewed invent) — feasibility / AI timing use this
    state.year = inventYear(view, place);
    state.waits = inventWaits(view, place);
    state.turn = place.turn || m.round || 0;
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

    state.inventionName = view.inventionName || "";
    state.inventionHow = view.inventionHow || "";
    state.inventionImpact = view.inventionImpact || "";
    state.selectedTechIds = (view.stack || []).map((x) => x.techId);
    state.challengePassed = Boolean(view.challengePassed);
    state.challengeLocked = Boolean(view.challengeLocked);
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
    state.deployStage = inventToSoloDeployStage(view.deployStage);
    // Always derive from *viewed* invent — never leave sticky unlock across seats
    state.deployUnlocked = Boolean(
      view.challengePassed ||
        (view.deployStage && view.deployStage !== "none")
    );
    state.stagedDropPool = view.stagedDropPool || state.stagedDropPool || 0;
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

    // Resources = always *you* (the local player), who pays
    const me = m.invents?.[myId()] || actor;
    state.ap = me.ap;
    state.apMax = me.apMax;
    state.budget = me.budget;
    state.will = me.will;
    state.apSpentThisTurn = me.apSpentThisTurn || 0;
    state.writeCommitsThisTurn = me.writeCommitsThisTurn || 0;
    state.techAddedThisTurn = { ...(me.techAddedThisTurn || {}) };

    if (
      view.challengePassed ||
      view.deployStage === "pilot_ok" ||
      view.deployStage === "scaled" ||
      view.deployStage === "new_normal"
    ) {
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
    invent,
    isMyTurn,
    viewingOther,
    forgePhase,
    viewedPhase,
    canContributeStory,
        canFaceChallenge,
    canOpenDeployBay,
    inventPhaseOf,
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
    soloToInventDeployStage,
  };
}

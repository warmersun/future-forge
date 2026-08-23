/**
 * Personal invention lifecycle (multiplayer / hotseat).
 * Single source of truth helpers — pure, DOM-free.
 *
 * invent → challenge → (pass|sidestep) → deploy_ready → scale_ready → fielded
 *                 └─ fail → challenge_locked (owner-only retry)
 * reopen_invent (owner, explicit) → invent from locked phases (not fielded)
 *
 * Note: invent "challenge" is the scrutiny gate (Face Challenge), not a Quest
 * (theme → local crisis episode).
 */

export const INVENT_PHASES = [
  "invent",
  "challenge",
  "challenge_locked",
  "deploy_ready",
  "scale_ready",
  "fielded",
  "abandoned",
  // Hex invent aliases
  "concerns",
  "resolved",
];

/**
 * Derive invent phase from invent fields (compat with legacy flags).
 * Prefers invent.inventPhase when present and consistent enough.
 * @param {object|null|undefined} f
 * @returns {string}
 */
export function deriveInventPhase(f) {
  if (!f) return "invent";
  if (f.abandoned) return "abandoned";

  // Hex pathway held → fielded/resolved
  if (f.pathwayHeld || f.inventPhase === "resolved") return "fielded";

  const staged = f.deployStage || "none";
  if (staged === "scaled" || staged === "new_normal") return "fielded";
  if (staged === "pilot_ok" || staged === "pilot") return "scale_ready";

  // Explicit written phase (server) for locked-after-fail
  if (f.inventPhase === "challenge_locked" || f.challengeLocked) {
    if (!f.challengePassed) return "challenge_locked";
  }

  // Hex: concerns summoned maps to deploy_ready (post-challenge play)
  if (f.inventPhase === "concerns" || f.hexBoard?.concernsSummoned || f.concernsSummoned) {
    if (f.challengePassed || f.concernsSummoned || f.hexBoard?.concernsSummoned) {
      return "deploy_ready";
    }
  }

  if (f.challengePassed) return "deploy_ready";

  if (f.turnPhase === "scrutiny" || f.inventPhase === "challenge") return "challenge";

  if (f.inventPhase === "challenge_locked") return "challenge_locked";

  return "invent";
}

/**
 * Story + stack are frozen except in invent phase.
 * Hex board stays editable through concerns/deploy_ready until resolved.
 * @param {object|null|undefined} f
 */
export function isInventContentFrozen(f) {
  const p = deriveInventPhase(f);
  return p !== "invent";
}

/**
 * Hex board edits allowed while inventing or after concerns (until fielded).
 * @param {object|null|undefined} f
 */
export function isHexBoardFrozen(f) {
  const p = deriveInventPhase(f);
  return p === "fielded" || p === "abandoned";
}

/**
 * @param {object} opts
 * @param {string} opts.inventPhase
 * @param {boolean} opts.isOwner — viewer is invent owner
 * @param {boolean} opts.isActive — actor is active seat
 * @param {boolean} [opts.pilotLockedThisTurn]
 * @param {boolean} [opts.scaleLockedThisTurn]
 * @param {boolean} [opts.placePlaying]
 */
export function allowedActions(opts = {}) {
  const phase = opts.inventPhase || "invent";
  const isOwner = Boolean(opts.isOwner);
  const isActive = Boolean(opts.isActive);
  const placePlaying = opts.placePlaying !== false;
  const pilotLocked = Boolean(opts.pilotLockedThisTurn);
  const scaleLocked = Boolean(opts.scaleLockedThisTurn);

  const none = {
    editStory: false,
    editStack: false,
    editBoard: false,
    faceChallenge: false,
    fightChallenge: false,
    reopenInvent: false,
    pilot: false,
    scale: false,
    abandon: false,
    summonConcerns: false,
    declareHold: false,
  };
  if (!placePlaying || phase === "abandoned") {
    return { ...none, browse: true };
  }

  const edit = isActive && phase === "invent";
  const boardEdit =
    isActive &&
    isOwner &&
    (phase === "invent" ||
      phase === "deploy_ready" ||
      phase === "concerns" ||
      phase === "scale_ready");
  return {
    browse: true,
    editStory: edit,
    editStack: edit,
    editBoard: boardEdit,
    summonConcerns: isActive && isOwner && phase === "invent",
    declareHold:
      isActive &&
      isOwner &&
      (phase === "deploy_ready" || phase === "concerns" || phase === "scale_ready"),
    faceChallenge:
      isActive &&
      isOwner &&
      (phase === "invent" || phase === "challenge_locked"),
    fightChallenge: isActive && isOwner && phase === "challenge",
    reopenInvent:
      isActive &&
      isOwner &&
      (phase === "challenge" ||
        phase === "challenge_locked" ||
        phase === "deploy_ready" ||
        phase === "scale_ready"),
    pilot: isActive && phase === "deploy_ready" && !pilotLocked,
    scale: isActive && phase === "scale_ready" && !scaleLocked,
    abandon:
      isActive &&
      isOwner &&
      phase !== "fielded" &&
      phase !== "abandoned",
  };
}

/**
 * Apply a lifecycle event → inventPhase + legacy field patch.
 * @param {object} invent — current invent (not mutated)
 * @param {string} event
 * @param {object} [payload]
 * @returns {{ ok: boolean, inventPhase?: string, patch?: object, error?: string }}
 */
export function applyInventPhaseEvent(invent, event, payload = {}) {
  const f = invent || {};
  const phase = deriveInventPhase(f);

  switch (event) {
    case "enter_challenge": {
      if (phase !== "invent" && phase !== "challenge_locked" && phase !== "challenge") {
        return { ok: false, error: "cannot_enter_challenge", inventPhase: phase };
      }
      return {
        ok: true,
        inventPhase: "challenge",
        patch: {
          inventPhase: "challenge",
          challengeLocked: false,
          turnPhase: "scrutiny",
          challengePassed: false,
        },
      };
    }
    case "challenge_pass": {
      // Idempotent if already past challenge
      if (phase === "deploy_ready" || phase === "scale_ready" || phase === "fielded") {
        return { ok: true, inventPhase: phase, patch: {} };
      }
      // Allow from live challenge or locked-after-fail (force clear / re-submit)
      if (phase !== "challenge" && phase !== "challenge_locked") {
        return { ok: false, error: "not_in_challenge", inventPhase: phase };
      }
      return {
        ok: true,
        inventPhase: "deploy_ready",
        patch: {
          inventPhase: "deploy_ready",
          challengeLocked: false,
          challengePassed: true,
          turnPhase: "act",
          deployStage: "none",
          challengeClearMode: payload.clearMode || "defend",
        },
      };
    }
    case "challenge_sidestep": {
      if (phase === "deploy_ready" || phase === "scale_ready" || phase === "fielded") {
        return { ok: true, inventPhase: phase, patch: {} };
      }
      if (phase !== "challenge" && phase !== "challenge_locked") {
        return { ok: false, error: "not_in_challenge", inventPhase: phase };
      }
      return {
        ok: true,
        inventPhase: "deploy_ready",
        patch: {
          inventPhase: "deploy_ready",
          challengeLocked: false,
          challengePassed: true,
          turnPhase: "act",
          deployStage: "none",
          challengeClearMode: "sidestep",
        },
      };
    }
    case "challenge_fail": {
      if (phase === "challenge_locked") {
        return {
          ok: true,
          inventPhase: "challenge_locked",
          patch: {
            inventPhase: "challenge_locked",
            challengeLocked: true,
            challengePassed: false,
            turnPhase: "act",
            deployStage: "none",
          },
        };
      }
      if (phase !== "challenge") {
        return { ok: false, error: "not_in_challenge", inventPhase: phase };
      }
      return {
        ok: true,
        inventPhase: "challenge_locked",
        patch: {
          inventPhase: "challenge_locked",
          challengeLocked: true,
          challengePassed: false,
          turnPhase: "act", // seat can End turn; content stays frozen
          deployStage: "none",
        },
      };
    }
    case "pilot_ok": {
      if (phase !== "deploy_ready") {
        // Already piloted — idempotent no-op
        if (phase === "scale_ready" || phase === "fielded") {
          return { ok: true, inventPhase: phase, patch: {} };
        }
        return { ok: false, error: "not_deploy_ready", inventPhase: phase };
      }
      return {
        ok: true,
        inventPhase: "scale_ready",
        patch: {
          inventPhase: "scale_ready",
          deployStage: "pilot_ok",
          challengePassed: true,
        },
      };
    }
    case "pilot_fail": {
      // invent phase unchanged
      return { ok: true, inventPhase: phase, patch: {} };
    }
    case "scale_ok": {
      if (phase === "fielded") {
        return { ok: true, inventPhase: phase, patch: {} };
      }
      if (phase !== "scale_ready") {
        return { ok: false, error: "not_scale_ready", inventPhase: phase };
      }
      return {
        ok: true,
        inventPhase: "fielded",
        patch: {
          inventPhase: "fielded",
          deployStage: payload.deployStage || "new_normal",
          challengePassed: true,
        },
      };
    }
    case "scale_fail": {
      return { ok: true, inventPhase: phase, patch: {} };
    }
    case "reopen_invent": {
      if (phase === "fielded") {
        return { ok: false, error: "already_scaled", inventPhase: phase };
      }
      if (phase === "invent") {
        return { ok: true, inventPhase: "invent", patch: {} };
      }
      if (phase === "abandoned") {
        return { ok: false, error: "abandoned", inventPhase: phase };
      }
      return {
        ok: true,
        inventPhase: "invent",
        patch: {
          inventPhase: "invent",
          challengeLocked: false,
          challengePassed: false,
          turnPhase: "act",
          deployStage: "none",
          stagedDropPool: 0,
          challengeClearMode: null,
        },
      };
    }
    case "abandon": {
      return {
        ok: true,
        inventPhase: "abandoned",
        patch: {
          inventPhase: "abandoned",
          abandoned: true,
          turnPhase: "act",
        },
      };
    }
    case "summon_concerns": {
      if (phase !== "invent" && phase !== "challenge_locked") {
        return { ok: false, error: "cannot_summon", inventPhase: phase };
      }
      return {
        ok: true,
        inventPhase: "deploy_ready",
        patch: {
          inventPhase: "concerns",
          concernsSummoned: true,
          challengePassed: true,
          challengeLocked: false,
          turnPhase: "act",
          ...(payload.hexBoard ? { hexBoard: payload.hexBoard } : {}),
        },
      };
    }
    case "declare_hold":
    case "pathway_holds": {
      if (
        phase !== "deploy_ready" &&
        phase !== "scale_ready" &&
        phase !== "concerns"
      ) {
        return { ok: false, error: "not_ready", inventPhase: phase };
      }
      return {
        ok: true,
        inventPhase: "fielded",
        patch: {
          inventPhase: "resolved",
          pathwayHeld: true,
          deployStage: "scaled",
          challengePassed: true,
          ...(payload.hexBoard ? { hexBoard: payload.hexBoard } : {}),
        },
      };
    }
    case "board_commit": {
      if (isHexBoardFrozen(f)) {
        return { ok: false, error: "frozen", inventPhase: phase };
      }
      return {
        ok: true,
        inventPhase: phase,
        patch: payload.hexBoard ? { hexBoard: payload.hexBoard } : {},
      };
    }
    default:
      return { ok: false, error: "unknown_event", inventPhase: phase };
  }
}

/**
 * Coarse UI phase used by seat tabs.
 * challenge_locked is distinct from live challenge so room routing does not
 * re-open combat chrome after a failed Face Challenge.
 * @param {string} inventPhase
 */
export function inventPhaseToUiPhase(inventPhase) {
  switch (inventPhase) {
    case "challenge":
      return "challenge";
    case "challenge_locked":
      return "challenge_locked";
    case "deploy_ready":
    case "scale_ready":
      return "deploy";
    case "fielded":
      return "scaled";
    case "abandoned":
      return "locked";
    case "invent":
    default:
      return "invent";
  }
}

/**
 * Apply patch onto a invent clone.
 * @param {object} invent
 * @param {object} patch
 */
export function applyInventPatch(invent, patch) {
  if (!invent || !patch) return invent;
  return { ...invent, ...patch };
}

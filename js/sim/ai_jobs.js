/**
 * Pure AI job reserve / resolve / reject + friends-room quota accounting.
 * DOM-free. Network I/O stays at the server boundary.
 */

import { GAME } from "../data.js";

/** Design defaults for friends rooms */
export const ROOM_AI_QUOTAS = {
  roomSessionCoInvent: 80,
  roomVision: 12,
  perPlayerPerMin: 4,
  perPlayerPerSession: 25,
  /** Pose/judge share a single-flight room lock */
  poseJudgeModes: new Set([
    "pose-challenge",
    "judge-challenge",
    "judge-scrutiny-move",
  ]),
};

/**
 * @param {object} [overrides]
 */
export function createRoomAiQuotaState(overrides = {}) {
  return {
    roomCoInventUsed: 0,
    roomVisionUsed: 0,
    /** @type {Record<string, { session: number, windowStart: number, windowCount: number }>} */
    byPlayer: {},
    /** clientActionId → job meta (for idempotency) */
    jobsByClientId: {},
    /** Single-flight pose/judge */
    poseJudgeBusy: false,
    poseJudgeClientActionId: null,
    ...overrides,
  };
}

function playerBucket(quota, playerId, now) {
  if (!quota.byPlayer[playerId]) {
    quota.byPlayer[playerId] = {
      session: 0,
      windowStart: now,
      windowCount: 0,
    };
  }
  const b = quota.byPlayer[playerId];
  if (now - b.windowStart >= 60_000) {
    b.windowStart = now;
    b.windowCount = 0;
  }
  return b;
}

/**
 * Check whether a co-invent request may proceed (no mutation).
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function canReserveRoomAi(quota, playerId, mode, opts = {}) {
  const limits = { ...ROOM_AI_QUOTAS, ...(opts.limits || {}) };
  const now = opts.now ?? Date.now();
  const isVision = mode === "vision" || opts.kind === "vision";
  const usedRoom = isVision ? quota.roomVisionUsed : quota.roomCoInventUsed;
  const roomCap = isVision ? limits.roomVision : limits.roomSessionCoInvent;
  if (usedRoom >= roomCap) {
    return { ok: false, error: "room_quota" };
  }
  const b = playerBucket(quota, playerId, now);
  if (b.session >= limits.perPlayerPerSession) {
    return { ok: false, error: "player_session_quota" };
  }
  if (b.windowCount >= limits.perPlayerPerMin) {
    return { ok: false, error: "player_rate_quota" };
  }
  if (limits.poseJudgeModes.has(mode) && quota.poseJudgeBusy) {
    return { ok: false, error: "pose_judge_busy" };
  }
  return { ok: true };
}

/**
 * Record a successful reserve against quotas (mutates quota).
 */
export function recordRoomAiReserve(quota, playerId, mode, opts = {}) {
  const now = opts.now ?? Date.now();
  const isVision = mode === "vision" || opts.kind === "vision";
  if (isVision) quota.roomVisionUsed += 1;
  else quota.roomCoInventUsed += 1;
  const b = playerBucket(quota, playerId, now);
  b.session += 1;
  b.windowCount += 1;
  if (ROOM_AI_QUOTAS.poseJudgeModes.has(mode)) {
    quota.poseJudgeBusy = true;
    quota.poseJudgeClientActionId = opts.clientActionId || null;
  }
}

/**
 * Clear pose/judge single-flight after resolve/reject.
 */
export function clearPoseJudgeBusy(quota, clientActionId = null) {
  if (
    clientActionId &&
    quota.poseJudgeClientActionId &&
    quota.poseJudgeClientActionId !== clientActionId
  ) {
    return;
  }
  quota.poseJudgeBusy = false;
  quota.poseJudgeClientActionId = null;
}

/**
 * Reserve AI on sim (AP) — pure. Does not touch room quotas.
 * @param {object} sim
 * @param {{ clientActionId?: string, mode?: string, reservedAp?: number }} payload
 * @param {{ features?: object, apMax?: number }} [opts]
 */
export function reserveAiOnSim(sim, payload = {}, opts = {}) {
  const features = opts.features || sim.featureFlags || GAME.features || {};
  const apOn = Boolean(features.actionPoints);
  const apMax = opts.apMax ?? sim.apMax ?? GAME.apMax ?? 3;
  const cost = payload.reservedAp ?? 1;
  const next = {
    ...sim,
    pressure: { ...(sim.pressure || {}) },
    techAddedThisTurn: { ...(sim.techAddedThisTurn || {}) },
  };
  if (apOn && cost > 0) {
    if ((next.ap ?? 0) < cost) {
      return { ok: false, error: "no_ap", sim };
    }
    next.ap -= cost;
    next.apSpentThisTurn = (next.apSpentThisTurn || 0) + cost;
  }
  next.turnPhase = "ai_pending";
  next.pendingAi = {
    clientActionId: payload.clientActionId || null,
    mode: payload.mode || "chat",
    reservedAp: cost,
    playerId: payload.playerId || null,
  };
  return {
    ok: true,
    events: [{ type: "ai_reserved", mode: next.pendingAi.mode, clientActionId: next.pendingAi.clientActionId }],
    sim: next,
  };
}

/**
 * Resolve AI successfully — clears pending, restores phase.
 */
export function resolveAiOnSim(sim, opts = {}) {
  const next = {
    ...sim,
    pressure: { ...(sim.pressure || {}) },
    techAddedThisTurn: { ...(sim.techAddedThisTurn || {}) },
    pendingAi: null,
  };
  if (next.turnPhase === "ai_pending") next.turnPhase = "act";
  return {
    ok: true,
    events: [{ type: "resolve_ai", clientActionId: opts.clientActionId || null }],
    sim: next,
  };
}

/**
 * Reject AI — refund reserved AP, clear pending.
 */
export function rejectAiOnSim(sim, opts = {}) {
  const features = opts.features || sim.featureFlags || GAME.features || {};
  const apOn = Boolean(features.actionPoints);
  const apMax = opts.apMax ?? sim.apMax ?? GAME.apMax ?? 3;
  const next = {
    ...sim,
    pressure: { ...(sim.pressure || {}) },
    techAddedThisTurn: { ...(sim.techAddedThisTurn || {}) },
  };
  const refund = next.pendingAi?.reservedAp || 0;
  if (apOn && refund > 0) {
    next.ap = Math.min(apMax, (next.ap || 0) + refund);
  }
  const clientActionId = next.pendingAi?.clientActionId || opts.clientActionId || null;
  next.pendingAi = null;
  if (next.turnPhase === "ai_pending") next.turnPhase = "act";
  return {
    ok: true,
    events: [{ type: "reject_ai", clientActionId, refundedAp: refund }],
    sim: next,
    refundedAp: refund,
  };
}

/**
 * Full room-aware reserve: quotas + sim AP. Idempotent on clientActionId.
 * @returns {{ ok: boolean, error?: string, sim?: object, events?: object[], quota?: object, idempotent?: boolean }}
 */
export function reserveRoomAiJob(sim, quota, playerId, payload = {}, opts = {}) {
  const clientActionId = payload.clientActionId || null;
  if (clientActionId && quota.jobsByClientId[clientActionId]) {
    const prev = quota.jobsByClientId[clientActionId];
    if (prev.status === "pending" || prev.status === "resolved") {
      return {
        ok: true,
        idempotent: true,
        sim,
        events: [],
        job: prev,
      };
    }
  }

  const mode = payload.mode || "chat";
  const gate = canReserveRoomAi(quota, playerId, mode, opts);
  if (!gate.ok) return { ok: false, error: gate.error, sim, quota };

  // Room-level pending blocks another reserve while any AI is in flight for AP consistency
  if (sim.pendingAi && !opts.allowConcurrent) {
    return { ok: false, error: "ai_busy", sim, quota };
  }

  const reserved = reserveAiOnSim(
    sim,
    { ...payload, playerId, clientActionId },
    opts
  );
  if (!reserved.ok) return { ...reserved, quota };

  recordRoomAiReserve(quota, playerId, mode, {
    now: opts.now,
    clientActionId,
    kind: opts.kind,
  });

  if (clientActionId) {
    quota.jobsByClientId[clientActionId] = {
      status: "pending",
      playerId,
      mode,
      reservedAp: payload.reservedAp ?? 1,
      createdAt: opts.now ?? Date.now(),
    };
  }

  return {
    ok: true,
    sim: reserved.sim,
    events: reserved.events,
    quota,
    job: clientActionId ? quota.jobsByClientId[clientActionId] : null,
  };
}

/**
 * Complete a room AI job successfully.
 */
export function resolveRoomAiJob(sim, quota, clientActionId = null, opts = {}) {
  const resolved = resolveAiOnSim(sim, { clientActionId });
  if (clientActionId && quota.jobsByClientId[clientActionId]) {
    quota.jobsByClientId[clientActionId].status = "resolved";
  }
  clearPoseJudgeBusy(quota, clientActionId);
  return { ...resolved, quota };
}

/**
 * Fail a room AI job and refund AP.
 */
export function rejectRoomAiJob(sim, quota, clientActionId = null, opts = {}) {
  const rejected = rejectAiOnSim(sim, { ...opts, clientActionId });
  if (clientActionId && quota.jobsByClientId[clientActionId]) {
    quota.jobsByClientId[clientActionId].status = "rejected";
  }
  clearPoseJudgeBusy(quota, clientActionId);
  return { ...rejected, quota };
}

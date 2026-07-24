import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createRoomAiQuotaState,
  canReserveRoomAi,
  reserveRoomAiJob,
  resolveRoomAiJob,
  rejectRoomAiJob,
  ROOM_AI_QUOTAS,
} from "./ai_jobs.js";
import { createSimState, friendsFeatureFlags } from "./state.js";

const mission = {
  id: "m1",
  globalId: "climate",
  title: "T",
  place: "P",
  startYear: 2026,
  collapseYear: 2034,
  pressure: { Floods: 2 },
  pressureRise: { Floods: 1 },
  winMax: { Floods: 1 },
  scene: "s",
  suggested: ["ai"],
};

function freshSim() {
  return createSimState(mission, { id: "climate" }, { features: friendsFeatureFlags() });
}

describe("ai_jobs quotas", () => {
  it("allows reserve under limits and spends AP", () => {
    const sim = freshSim();
    const quota = createRoomAiQuotaState();
    const startAp = sim.ap;
    const r = reserveRoomAiJob(
      sim,
      quota,
      "p1",
      { mode: "chat", reservedAp: 1, clientActionId: "c1" },
      { features: sim.featureFlags }
    );
    assert.equal(r.ok, true);
    assert.equal(r.sim.ap, startAp - 1);
    assert.equal(r.sim.turnPhase, "ai_pending");
    assert.equal(r.sim.pendingAi.mode, "chat");
    assert.equal(quota.roomCoInventUsed, 1);
    assert.equal(quota.byPlayer.p1.session, 1);
  });

  it("rejects over per-player/min without spending AP", () => {
    const sim = freshSim();
    const quota = createRoomAiQuotaState();
    const now = 1_000_000;
    for (let i = 0; i < ROOM_AI_QUOTAS.perPlayerPerMin; i++) {
      const r = reserveRoomAiJob(
        sim,
        quota,
        "p1",
        { mode: "chat", reservedAp: 0, clientActionId: `pre-${i}` },
        { features: sim.featureFlags, now, allowConcurrent: true }
      );
      assert.equal(r.ok, true);
      // resolve so next can proceed if concurrent not needed
      Object.assign(sim, resolveRoomAiJob(r.sim, quota, `pre-${i}`).sim);
    }
    const apBefore = sim.ap;
    const blocked = reserveRoomAiJob(
      sim,
      quota,
      "p1",
      { mode: "chat", reservedAp: 1, clientActionId: "over" },
      { features: sim.featureFlags, now }
    );
    assert.equal(blocked.ok, false);
    assert.equal(blocked.error, "player_rate_quota");
    assert.equal(sim.ap, apBefore);
  });

  it("rejects player session quota", () => {
    const sim = freshSim();
    const quota = createRoomAiQuotaState();
    const now = 2_000_000;
    // burn session with reservedAp 0 and allow concurrent false by resolving each
    for (let i = 0; i < ROOM_AI_QUOTAS.perPlayerPerSession; i++) {
      // advance minute window so only session matters
      const t = now + i * 61_000;
      const r = reserveRoomAiJob(
        sim,
        quota,
        "p2",
        { mode: "chat", reservedAp: 0, clientActionId: `s-${i}` },
        { features: sim.featureFlags, now: t }
      );
      assert.equal(r.ok, true, r.error);
      Object.assign(sim, resolveRoomAiJob(r.sim, quota, `s-${i}`).sim);
    }
    const blocked = reserveRoomAiJob(
      sim,
      quota,
      "p2",
      { mode: "chat", reservedAp: 1, clientActionId: "s-over" },
      { features: sim.featureFlags, now: now + 99 * 61_000 }
    );
    assert.equal(blocked.ok, false);
    assert.equal(blocked.error, "player_session_quota");
  });

  it("single-flight pose/judge", () => {
    const sim = freshSim();
    const quota = createRoomAiQuotaState();
    const a = reserveRoomAiJob(
      sim,
      quota,
      "p1",
      { mode: "pose-challenge", reservedAp: 1, clientActionId: "pose1" },
      { features: sim.featureFlags }
    );
    assert.equal(a.ok, true);
    assert.equal(quota.poseJudgeBusy, true);
    // second player cannot pose while busy (even with allowConcurrent for AP)
    const sim2 = { ...a.sim, pendingAi: null, turnPhase: "act" };
    const b = reserveRoomAiJob(
      sim2,
      quota,
      "p2",
      { mode: "judge-challenge", reservedAp: 1, clientActionId: "j1" },
      { features: sim.featureFlags, allowConcurrent: true }
    );
    assert.equal(b.ok, false);
    assert.equal(b.error, "pose_judge_busy");
    const done = resolveRoomAiJob(a.sim, quota, "pose1");
    assert.equal(done.ok, true);
    assert.equal(quota.poseJudgeBusy, false);
  });

  it("reject refunds AP", () => {
    const sim = freshSim();
    const quota = createRoomAiQuotaState();
    const startAp = sim.ap;
    const r = reserveRoomAiJob(
      sim,
      quota,
      "p1",
      { mode: "chat", reservedAp: 1, clientActionId: "fail1" },
      { features: sim.featureFlags }
    );
    assert.equal(r.sim.ap, startAp - 1);
    const rej = rejectRoomAiJob(r.sim, quota, "fail1", { features: sim.featureFlags });
    assert.equal(rej.ok, true);
    assert.equal(rej.sim.ap, startAp);
    assert.equal(rej.sim.pendingAi, null);
  });

  it("idempotent clientActionId does not double-spend", () => {
    const sim = freshSim();
    const quota = createRoomAiQuotaState();
    const a = reserveRoomAiJob(
      sim,
      quota,
      "p1",
      { mode: "chat", reservedAp: 1, clientActionId: "same" },
      { features: sim.featureFlags }
    );
    const b = reserveRoomAiJob(
      a.sim,
      quota,
      "p1",
      { mode: "chat", reservedAp: 1, clientActionId: "same" },
      { features: sim.featureFlags }
    );
    assert.equal(b.ok, true);
    assert.equal(b.idempotent, true);
    assert.equal(a.sim.ap, b.sim.ap);
    assert.equal(quota.roomCoInventUsed, 1);
  });

  it("canReserveRoomAi is pure", () => {
    const quota = createRoomAiQuotaState();
    const a = canReserveRoomAi(quota, "x", "chat");
    assert.equal(a.ok, true);
    assert.equal(quota.roomCoInventUsed, 0);
  });
});

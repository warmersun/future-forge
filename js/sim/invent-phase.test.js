import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  deriveInventPhase,
  isInventContentFrozen,
  allowedActions,
  applyInventPhaseEvent,
  inventPhaseToUiPhase,
} from "./invent-phase.js";

describe("invent-phase", () => {
  it("derives invent / challenge / deploy / fielded from legacy fields", () => {
    assert.equal(deriveInventPhase({}), "invent");
    assert.equal(deriveInventPhase({ turnPhase: "scrutiny" }), "challenge");
    assert.equal(
      deriveInventPhase({ challengePassed: true, deployStage: "none" }),
      "deploy_ready"
    );
    assert.equal(deriveInventPhase({ deployStage: "pilot_ok" }), "scale_ready");
    assert.equal(deriveInventPhase({ deployStage: "new_normal" }), "fielded");
    assert.equal(deriveInventPhase({ abandoned: true }), "abandoned");
  });

  it("challenge_locked freezes content and is not invent", () => {
    const f = {
      inventPhase: "challenge_locked",
      challengeLocked: true,
      challengePassed: false,
      turnPhase: "act",
    };
    assert.equal(deriveInventPhase(f), "challenge_locked");
    assert.equal(isInventContentFrozen(f), true);
    assert.equal(isInventContentFrozen({ turnPhase: "act" }), false);
  });

  it("fail event → challenge_locked; reopen → invent", () => {
    const mid = { turnPhase: "scrutiny", challengePassed: false };
    const fail = applyInventPhaseEvent(mid, "challenge_fail");
    assert.equal(fail.ok, true);
    assert.equal(fail.inventPhase, "challenge_locked");
    assert.equal(fail.patch.challengePassed, false);
    assert.equal(fail.patch.challengeLocked, true);

    const re = applyInventPhaseEvent(
      { ...mid, ...fail.patch },
      "reopen_invent"
    );
    assert.equal(re.ok, true);
    assert.equal(re.inventPhase, "invent");
    assert.equal(re.patch.challengeLocked, false);
  });

  it("fail → re-enter clears lock into live challenge", () => {
    const fail = applyInventPhaseEvent({ turnPhase: "scrutiny" }, "challenge_fail");
    const locked = { ...fail.patch };
    assert.equal(deriveInventPhase(locked), "challenge_locked");
    const ent = applyInventPhaseEvent(locked, "enter_challenge");
    assert.equal(ent.ok, true);
    assert.equal(ent.inventPhase, "challenge");
    assert.equal(ent.patch.challengeLocked, false);
    assert.equal(ent.patch.turnPhase, "scrutiny");
    assert.equal(deriveInventPhase({ ...locked, ...ent.patch }), "challenge");
  });

  it("pass and sidestep → deploy_ready", () => {
    const ch = { turnPhase: "scrutiny" };
    const pass = applyInventPhaseEvent(ch, "challenge_pass", { clearMode: "defend" });
    assert.equal(pass.inventPhase, "deploy_ready");
    assert.equal(pass.patch.challengePassed, true);

    const side = applyInventPhaseEvent(ch, "challenge_sidestep");
    assert.equal(side.inventPhase, "deploy_ready");
    assert.equal(side.patch.challengeClearMode, "sidestep");
  });

  it("rejects illegal phase jumps", () => {
    assert.equal(applyInventPhaseEvent({}, "challenge_pass").ok, false);
    assert.equal(applyInventPhaseEvent({}, "challenge_pass").error, "not_in_challenge");
    assert.equal(applyInventPhaseEvent({}, "challenge_sidestep").ok, false);
    assert.equal(applyInventPhaseEvent({}, "challenge_fail").ok, false);
    assert.equal(applyInventPhaseEvent({}, "scale_ok").ok, false);
    assert.equal(applyInventPhaseEvent({}, "pilot_ok").ok, false);

    // Idempotent no-ops when already past
    const past = applyInventPhaseEvent(
      { challengePassed: true, deployStage: "none" },
      "challenge_pass"
    );
    assert.equal(past.ok, true);
    assert.equal(past.inventPhase, "deploy_ready");
    assert.deepEqual(past.patch, {});
  });

  it("pilot fail leaves deploy_ready; scale fail leaves scale_ready", () => {
    const d = applyInventPhaseEvent(
      { challengePassed: true, deployStage: "none" },
      "pilot_fail"
    );
    assert.equal(d.inventPhase, "deploy_ready");

    const s = applyInventPhaseEvent({ deployStage: "pilot_ok" }, "scale_fail");
    assert.equal(s.inventPhase, "scale_ready");
  });

  it("pilot ok → scale_ready; scale ok → fielded", () => {
    const p = applyInventPhaseEvent(
      { challengePassed: true, deployStage: "none" },
      "pilot_ok"
    );
    assert.equal(p.inventPhase, "scale_ready");
    const sc = applyInventPhaseEvent(
      { deployStage: "pilot_ok" },
      "scale_ok",
      { deployStage: "new_normal" }
    );
    assert.equal(sc.inventPhase, "fielded");
  });

  it("full lifecycle invent → fielded", () => {
    let inv = {};
    inv = { ...inv, ...applyInventPhaseEvent(inv, "enter_challenge").patch };
    assert.equal(deriveInventPhase(inv), "challenge");
    inv = { ...inv, ...applyInventPhaseEvent(inv, "challenge_pass").patch };
    assert.equal(deriveInventPhase(inv), "deploy_ready");
    inv = { ...inv, ...applyInventPhaseEvent(inv, "pilot_ok").patch };
    assert.equal(deriveInventPhase(inv), "scale_ready");
    inv = {
      ...inv,
      ...applyInventPhaseEvent(inv, "scale_ok", { deployStage: "new_normal" }).patch,
    };
    assert.equal(deriveInventPhase(inv), "fielded");
  });

  it("allowedActions: only owner faces challenge; helpers pilot when deploy_ready", () => {
    const ownerInvent = allowedActions({
      inventPhase: "invent",
      isOwner: true,
      isActive: true,
    });
    assert.equal(ownerInvent.faceChallenge, true);
    assert.equal(ownerInvent.editStory, true);

    const helperInvent = allowedActions({
      inventPhase: "invent",
      isOwner: false,
      isActive: true,
    });
    assert.equal(helperInvent.faceChallenge, false);
    assert.equal(helperInvent.editStory, true);

    const lockedFail = allowedActions({
      inventPhase: "challenge_locked",
      isOwner: true,
      isActive: true,
    });
    assert.equal(lockedFail.faceChallenge, true);
    assert.equal(lockedFail.editStory, false);

    const helperLocked = allowedActions({
      inventPhase: "challenge_locked",
      isOwner: false,
      isActive: true,
    });
    assert.equal(helperLocked.faceChallenge, false);
    assert.equal(helperLocked.editStory, false);

    const pilot = allowedActions({
      inventPhase: "deploy_ready",
      isOwner: false,
      isActive: true,
      pilotLockedThisTurn: false,
    });
    assert.equal(pilot.pilot, true);
    assert.equal(pilot.scale, false);

    const pilotLocked = allowedActions({
      inventPhase: "deploy_ready",
      isOwner: true,
      isActive: true,
      pilotLockedThisTurn: true,
    });
    assert.equal(pilotLocked.pilot, false);
  });

  it("hex concerns stay inventable and do not open deploy", () => {
    const summoned = {
      inventPhase: "invent",
      concernsSummoned: true,
      hexBoard: { concernsSummoned: true, tiles: {} },
      challengePassed: false,
      deployStage: "none",
    };
    assert.equal(deriveInventPhase(summoned), "concerns");
    assert.equal(isInventContentFrozen(summoned), false);
    assert.equal(inventPhaseToUiPhase("concerns"), "invent");

    const leakedPass = { ...summoned, challengePassed: true };
    assert.equal(deriveInventPhase(leakedPass), "concerns");

    const helper = allowedActions({
      inventPhase: "concerns",
      isOwner: false,
      isActive: true,
    });
    assert.equal(helper.editBoard, true);
    assert.equal(helper.editStack, true);
    assert.equal(helper.pilot, false);
    assert.equal(helper.faceChallenge, false);
  });

  it("ui phase mapping keeps challenge_locked distinct from live challenge", () => {
    assert.equal(inventPhaseToUiPhase("challenge"), "challenge");
    assert.equal(inventPhaseToUiPhase("challenge_locked"), "challenge_locked");
    assert.equal(inventPhaseToUiPhase("deploy_ready"), "deploy");
    assert.equal(inventPhaseToUiPhase("fielded"), "scaled");
  });

  it("reopen rejected when fielded", () => {
    const r = applyInventPhaseEvent({ deployStage: "new_normal" }, "reopen_invent");
    assert.equal(r.ok, false);
    assert.equal(r.error, "already_scaled");
  });
});

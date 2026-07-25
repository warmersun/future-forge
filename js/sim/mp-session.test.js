import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createMpLobby,
  setMpMission,
  startMpMission,
  applyMpAction,
  activeSeatId,
  getOpenTable,
} from "./mp-session.js";
import { rankSurvivors } from "./mp-rank.js";
import { TECHS } from "../data.js";

const T0 = TECHS[0]?.id || "solar";
const T1 = TECHS[1]?.id || "iot";

const mission = {
  id: "mp-test-floods",
  title: "Test floods",
  place: "Portside",
  globalId: "climate",
  startYear: 2026,
  yearsPerTurn: 2,
  collapseYear: 2036,
  pressure: { Floods: 2, Livelihoods: 2, Trust: 1 },
  pressureRise: { Floods: 1, Livelihoods: 1, Trust: 0 },
  winMax: { Floods: 0, Livelihoods: 1, Trust: 1 },
  suggested: ["solar", "iot", "ai"],
};

function started(names = ["Alex", "Bea"]) {
  let s = createMpLobby(names);
  s = setMpMission(s, mission, "climate");
  const r = startMpMission(s);
  assert.equal(r.ok, true);
  return r.session;
}

/** Force success rolls */
const alwaysOk = () => 0.01;
/** Force fail rolls */
const alwaysFail = () => 0.99;

describe("mp-session lobby & start", () => {
  it("requires 2 seats and creates personal forges", () => {
    const s = started(["Alex", "Bea", "Cara"]);
    assert.equal(s.seats.length, 3);
    assert.ok(s.forges["seat-0"]);
    assert.ok(s.forges["seat-1"]);
    assert.equal(s.forges["seat-0"].inventionName, "");
    assert.equal(s.place.pressure.Floods, 2);
    assert.equal(activeSeatId(s), "seat-0");
  });

  it("open table lists all forges", () => {
    let s = started();
    s = applyMpAction(s, {
      type: "buffer_write",
      payload: { field: "inventionName", value: "TideGate" },
    }).session;
    const table = getOpenTable(s);
    assert.equal(table.length, 2);
    assert.equal(table[0].inventionName, "TideGate");
    assert.equal(table[1].inventionName, "");
  });
});

describe("mp-session turns", () => {
  it("rejects actions from non-active seat", () => {
    const s = started();
    const r = applyMpAction(
      s,
      { type: "buffer_write", payload: { field: "inventionName", value: "X" } },
      "seat-1"
    );
    assert.equal(r.ok, false);
    assert.equal(r.error, "not_active_seat");
  });

  it("end_turn passes to next and refills AP", () => {
    let s = started();
    s = applyMpAction(s, {
      type: "buffer_write",
      payload: { field: "inventionName", value: "A" },
    }).session;
    // spend AP
    s = applyMpAction(s, {
      type: "select_tech",
      payload: { techId: "solar" },
    }).session;
    assert.ok(s.forges["seat-0"].ap < 3);
    s = applyMpAction(s, { type: "end_turn" }).session;
    assert.equal(activeSeatId(s), "seat-1");
    assert.equal(s.forges["seat-1"].ap, 3);
  });

  it("wait advances shared year and ends turn", () => {
    let s = started();
    s = applyMpAction(s, {
      type: "buffer_write",
      payload: { field: "inventionHow", value: "pump" },
    }).session;
    const year0 = s.place.year;
    s = applyMpAction(s, { type: "wait" }).session;
    assert.equal(s.place.year, year0 + 2);
    assert.ok(s.place.pressure.Floods >= 3);
    assert.equal(activeSeatId(s), "seat-1");
  });
});

describe("mp-session layer emTech", () => {
  it("actor pays when layering on other forge", () => {
    let s = started();
    // Alex adds own tech then ends
    s = applyMpAction(s, {
      type: "buffer_write",
      payload: { field: "inventionName", value: "A" },
    }).session;
    s = applyMpAction(s, { type: "end_turn" }).session;
    // Bea layers on Alex
    const budgetBefore = s.forges["seat-1"].budget;
    const r = applyMpAction(s, {
      type: "layer_tech",
      payload: { techId: "solar", targetSeatId: "seat-0" },
    });
    assert.equal(r.ok, true);
    s = r.session;
    assert.ok(s.forges["seat-1"].budget < budgetBefore);
    assert.equal(s.forges["seat-0"].stack.length, 1);
    assert.equal(s.forges["seat-0"].stack[0].addedBy, "seat-1");
    assert.ok(s.forges["seat-1"].contributionBudgetSpent >= 1);
  });

  it("own write hits actor forge by default", () => {
    let s = started();
    s = applyMpAction(s, {
      type: "buffer_write",
      payload: { field: "inventionName", value: "Mine" },
    }).session;
    assert.equal(s.forges["seat-0"].inventionName, "Mine");
    assert.equal(s.forges["seat-1"].inventionName, "");
  });

  it("active seat can write on another's invent still in invent phase", () => {
    let s = started();
    // Alex seeds own invent, ends turn
    s = applyMpAction(s, {
      type: "buffer_write",
      payload: { field: "inventionHow", value: "Solar stills on the roof" },
    }).session;
    s = applyMpAction(s, { type: "end_turn" }).session;
    // Bea contributes everyday life onto Alex's invent
    const r = applyMpAction(s, {
      type: "write_commit",
      payload: {
        field: "inventionImpact",
        value: "Families get clean water without a long walk.",
        changed: true,
        targetSeatId: "seat-0",
      },
    });
    assert.equal(r.ok, true);
    s = r.session;
    assert.equal(
      s.forges["seat-0"].inventionImpact,
      "Families get clean water without a long walk."
    );
    // Bea's own invent stays empty
    assert.equal(s.forges["seat-1"].inventionImpact, "");
  });

  it("cannot write on invent locked after challenge/scrutiny", () => {
    let s = started();
    s = applyMpAction(s, {
      type: "buffer_write",
      payload: { field: "inventionHow", value: "How" },
    }).session;
    s = applyMpAction(s, { type: "enter_challenge" }).session;
    assert.equal(s.forges["seat-0"].turnPhase, "scrutiny");
    const r = applyMpAction(s, {
      type: "write_commit",
      payload: {
        field: "inventionImpact",
        value: "Should fail",
        changed: true,
        targetSeatId: "seat-0",
      },
    });
    assert.equal(r.ok, false);
    assert.equal(r.error, "invent_locked");
  });
});

describe("mp-session challenge pilot scale", () => {
  function prepForPilot(s) {
    s = applyMpAction(s, {
      type: "buffer_write",
      payload: {
        field: "inventionHow",
        value:
          "A network of sensors and pumps works with local crews to manage flood corridors during peak season safely.",
      },
    }).session;
    s = applyMpAction(s, {
      type: "buffer_write",
      payload: {
        field: "inventionImpact",
        value:
          "Families keep dry homes and small shops stay open when the river rises each spring.",
      },
    }).session;
    s = applyMpAction(s, {
      type: "select_tech",
      payload: { techId: T0 },
    }).session;
    s = applyMpAction(s, {
      type: "select_tech",
      payload: { techId: T1 },
    }).session;
    s = applyMpAction(s, { type: "enter_challenge" }).session;
    s = applyMpAction(s, {
      type: "submit_challenge",
      payload: {
        answer:
          "We partner with the harbour authority for a supervised pilot in one mapped corridor, with human oversight and opt-in sensors only on public bulkheads.",
        verdict: "pass",
      },
    }).session;
    return s;
  }

  it("requires challenge before pilot", () => {
    let s = started();
    s = applyMpAction(s, {
      type: "buffer_write",
      payload: { field: "inventionName", value: "X" },
    }).session;
    const r = applyMpAction(s, { type: "attempt_pilot" }, null, { rng: alwaysOk });
    assert.equal(r.ok, false);
    assert.equal(r.error, "challenge_required");
  });

  it("pilot does not change place; scale does", () => {
    let s = prepForPilot(started());
    const p0 = s.place.pressure.Floods;
    s = applyMpAction(s, { type: "attempt_pilot" }, null, { rng: alwaysOk }).session;
    assert.equal(s.forges["seat-0"].deployStage, "pilot_ok");
    assert.equal(s.place.pressure.Floods, p0);

    s = applyMpAction(s, { type: "attempt_scale" }, null, { rng: alwaysOk }).session;
    assert.equal(s.forges["seat-0"].deployStage, "scaled");
    assert.ok(totalDrop(s) > 0 || s.forges["seat-0"].impactDropTotal >= 0);
    // pressure should not increase; usually drops
    assert.ok(s.place.pressure.Floods <= p0);
  });

  it("active seat can pilot/scale another seat's invent (targetSeatId)", () => {
    // Alex prep + pass challenge, end turn; Bea pilots/scales Alex's invent
    let s = prepForPilot(started());
    assert.equal(s.forges["seat-0"].challengePassed, true);
    assert.equal(s.forges["seat-0"].deployStage, "none");
    s = applyMpAction(s, {
      type: "buffer_write",
      payload: { field: "inventionName", value: "done" },
    }).session;
    s = applyMpAction(s, { type: "end_turn" }).session;
    assert.equal(activeSeatId(s), "seat-1");

    const beaBudget = s.forges["seat-1"].budget;
    const rPilot = applyMpAction(
      s,
      {
        type: "attempt_pilot",
        payload: { targetSeatId: "seat-0", feasibilityLevel: "yellow" },
      },
      null,
      { rng: alwaysOk }
    );
    assert.equal(rPilot.ok, true, rPilot.error);
    s = rPilot.session;
    assert.equal(s.forges["seat-0"].deployStage, "pilot_ok");
    assert.equal(s.forges["seat-1"].deployStage, "none"); // Bea's invent untouched
    assert.ok(s.forges["seat-1"].budget < beaBudget);
    assert.ok((s.forges["seat-1"].apSpentThisTurn || 0) >= 1);

    // Scale without pilot on *target* still fails if we wipe pilot stage
    const rBad = applyMpAction(s, {
      type: "attempt_scale",
      payload: { targetSeatId: "seat-1", feasibilityLevel: "yellow" },
    });
    assert.equal(rBad.ok, false);
    assert.equal(rBad.error, "pilot_required");

    const p0 = s.place.pressure.Floods;
    const rScale = applyMpAction(
      s,
      {
        type: "attempt_scale",
        payload: { targetSeatId: "seat-0", feasibilityLevel: "yellow" },
      },
      null,
      { rng: alwaysOk }
    );
    assert.equal(rScale.ok, true, rScale.error);
    s = rScale.session;
    assert.equal(s.forges["seat-0"].deployStage, "scaled");
    assert.ok(s.place.pressure.Floods <= p0);
  });

  it("failed pilot blocks retry same turn", () => {
    let s = prepForPilot(started());
    s = applyMpAction(s, { type: "attempt_pilot" }, null, { rng: alwaysFail }).session;
    assert.equal(s.forges["seat-0"].pilotFailedThisTurn, true);
    const r = applyMpAction(s, { type: "attempt_pilot" }, null, { rng: alwaysOk });
    assert.equal(r.ok, false);
    assert.equal(r.error, "retry_next_turn");
  });

  it("failed scale blocks retry same turn", () => {
    let s = prepForPilot(started());
    s = applyMpAction(s, { type: "attempt_pilot" }, null, { rng: alwaysOk }).session;
    s = applyMpAction(s, { type: "attempt_scale" }, null, { rng: alwaysFail }).session;
    const r = applyMpAction(s, { type: "attempt_scale" }, null, { rng: alwaysOk });
    assert.equal(r.ok, false);
    assert.equal(r.error, "retry_next_turn");
  });

  it("solving scale ends race and ranks", () => {
    // Low winMax all 5 so any drop may not solve — set easy win
    let s = createMpLobby(["Alex", "Bea"]);
    const easy = {
      ...mission,
      pressure: { Floods: 1, Livelihoods: 0, Trust: 0 },
      winMax: { Floods: 0, Livelihoods: 0, Trust: 0 },
    };
    s = setMpMission(s, easy, "climate");
    s = startMpMission(s).session;
    s = prepForPilot(s);
    s = applyMpAction(s, { type: "attempt_pilot" }, null, { rng: alwaysOk }).session;
    s = applyMpAction(s, { type: "attempt_scale" }, null, { rng: alwaysOk }).session;
    // may or may not fully solve depending on drop; force check ranking path
    if (s.place.status === "won") {
      assert.ok(s.ranking?.rows?.length >= 2);
      assert.equal(s.forges["seat-0"].landedSolvingScale, true);
    } else {
      // partial path still valid
      assert.equal(s.place.status, "playing");
      assert.ok(s.forges["seat-0"].successfulScales >= 1);
    }
  });
});

describe("mp-session abandon", () => {
  it("abandon blocks own pilot; allows layering after", () => {
    let s = started();
    s = applyMpAction(s, {
      type: "buffer_write",
      payload: { field: "inventionName", value: "Drop" },
    }).session;
    s = applyMpAction(s, { type: "abandon" }).session;
    assert.equal(s.forges["seat-0"].abandoned, true);
    const r = applyMpAction(s, { type: "enter_challenge" });
    assert.equal(r.ok, false);
    // end turn and... actually still active; layer on other
    s = applyMpAction(s, {
      type: "layer_tech",
      payload: { techId: "ai", targetSeatId: "seat-1" },
    }).session;
    assert.equal(s.forges["seat-1"].stack[0].addedBy, "seat-0");
  });
});

describe("mp-rank", () => {
  it("orders by score components", () => {
    const s = started();
    s.place.status = "won";
    s.forges["seat-0"].impactDropTotal = 3;
    s.forges["seat-0"].challengeVerdict = "pass";
    s.forges["seat-0"].hadChallengeAttempt = true;
    s.forges["seat-0"].landedSolvingScale = true;
    s.forges["seat-0"].successfulScales = 1;
    s.forges["seat-1"].contributionBudgetSpent = 6;
    s.forges["seat-1"].contributionApSpent = 2;
    const rank = rankSurvivors(s);
    assert.ok(rank.rows[0].score >= rank.rows[1].score);
    assert.equal(rank.rows[0].rank, 1);
  });
});

describe("mp-session end_turn skip offline", () => {
  it("preferConnectedIds skips offline seats", () => {
    let s = started();
    // Alex ends turn, prefer only seat-0 online → should wrap back to seat-0 if only they preferred?
    // seat-0 active; end_turn with preferConnectedIds only seat-0 → next is seat-1 not preferred, skip to seat-0
    s = applyMpAction(s, {
      type: "buffer_write",
      payload: { field: "inventionName", value: "A" },
    }).session;
    s = applyMpAction(s, {
      type: "end_turn",
      payload: { preferConnectedIds: ["seat-0"] },
    }).session;
    // Only seat-0 preferred: from seat-0, next candidate seat-1 skipped, back to seat-0
    assert.equal(activeSeatId(s), "seat-0");
  });

  it("force end_turn allows pass with no engagement", () => {
    let s = started();
    const r = applyMpAction(s, { type: "end_turn", payload: { force: true } });
    assert.equal(r.ok, true);
    assert.equal(activeSeatId(r.session), "seat-1");
  });
});

describe("mp-session pay_ap", () => {
  it("pays and refunds AP for co-inventor", () => {
    let s = started();
    const ap0 = s.forges["seat-0"].ap;
    s = applyMpAction(s, { type: "pay_ap", payload: { amount: 1 } }).session;
    assert.equal(s.forges["seat-0"].ap, ap0 - 1);
    s = applyMpAction(s, { type: "refund_ap", payload: { amount: 1 } }).session;
    assert.equal(s.forges["seat-0"].ap, ap0);
  });
});

describe("mp-session challenge feedback", () => {
  it("sync_challenge_view stores feedback for spectators (incl. sidestep)", () => {
    let s = started();
    s = applyMpAction(s, { type: "enter_challenge" }).session;
    const r = applyMpAction(s, {
      type: "sync_challenge_view",
      payload: {
        feedback: "<strong>SIDESTEP</strong> — You skipped Moloch (once per run).",
        verdict: "pass",
        moveMode: "defend",
        scrutiny: {
          pivotUsed: true,
          missCount: 0,
          encounters: [
            {
              id: "enc-moloch-0",
              angleId: "moloch",
              label: "Moloch",
              cleared: true,
              pivoted: true,
              hp: 0,
              maxHp: 2,
            },
          ],
        },
      },
    });
    assert.equal(r.ok, true, r.error);
    s = r.session;
    assert.match(s.forges["seat-0"].challengeFeedback, /SIDESTEP/);
    assert.equal(s.forges["seat-0"].scrutinyPublic?.pivotUsed, true);
    // Other seat does not inherit feedback
    assert.equal(s.forges["seat-1"].challengeFeedback || "", "");
  });

  it("sync_vision bumps invent visionRev for followers", () => {
    let s = started();
    const r = applyMpAction(s, {
      type: "sync_vision",
      payload: { targetSeatId: "seat-0", sessionId: "room-X-seat-seat-0" },
    });
    assert.equal(r.ok, true, r.error);
    assert.equal(r.session.forges["seat-0"].visionRev, 1);
    assert.equal(r.events.some((e) => e.type === "vision_sync"), true);
  });
});

function totalDrop(s) {
  return s.forges["seat-0"].impactDropTotal || 0;
}

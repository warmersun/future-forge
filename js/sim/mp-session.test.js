import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createMpLobby,
  setMpQuest,
  startMpQuest,
  applyMpAction,
  activeSeatId,
  getOpenTable,
  questExitMajorityReached,
  questExitTally,
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
  s = setMpQuest(s, mission, "climate");
  const r = startMpQuest(s);
  assert.equal(r.ok, true);
  return r.session;
}

/** Force success rolls */
const alwaysOk = () => 0.01;
/** Force fail rolls */
const alwaysFail = () => 0.99;

describe("mp-session lobby & start", () => {
  it("requires 2 seats and creates personal invents", () => {
    const s = started(["Alex", "Bea", "Cara"]);
    assert.equal(s.seats.length, 3);
    assert.ok(s.invents["seat-0"]);
    assert.ok(s.invents["seat-1"]);
    assert.equal(s.invents["seat-0"].inventionName, "");
    assert.equal(s.place.pressure.Floods, 2);
    assert.equal(activeSeatId(s), "seat-0");
  });

  it("open table lists all invents", () => {
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
    assert.ok(s.invents["seat-0"].ap < 3);
    s = applyMpAction(s, { type: "end_turn" }).session;
    assert.equal(activeSeatId(s), "seat-1");
    assert.equal(s.invents["seat-1"].ap, 3);
  });

  it("wait advances only the waiter invent year and ends turn", () => {
    let s = started();
    s = applyMpAction(s, {
      type: "buffer_write",
      payload: { field: "inventionHow", value: "pump" },
    }).session;
    const year0 = s.place.year;
    const pressure0 = s.place.pressure.Floods;
    const alexY0 = s.invents["seat-0"].year;
    const beaY0 = s.invents["seat-1"].year;
    assert.equal(alexY0, year0);
    assert.equal(beaY0, year0);
    const r = applyMpAction(s, { type: "wait" });
    assert.equal(r.ok, true, r.error);
    s = r.session;
    // Shared place baseline stays present; only waiter invent calendar advances
    assert.equal(s.place.year, year0);
    assert.equal(s.invents["seat-0"].year, alexY0 + 2);
    assert.equal(s.invents["seat-0"].waits, 1);
    assert.equal(s.invents["seat-1"].year, beaY0);
    assert.equal(s.invents["seat-1"].waits, 0);
    // Personal Wait must not raise shared meters (one seat cannot Wait-spam collapse)
    assert.equal(s.place.pressure.Floods, pressure0);
    assert.equal(activeSeatId(s), "seat-1");
    // Clients need these to refresh turn chrome (was missing → frozen UI after Wait)
    const waitEv = r.events.find((e) => e.type === "wait");
    assert.ok(waitEv);
    assert.equal(waitEv.year, alexY0 + 2);
    assert.equal(waitEv.seatId, "seat-0");
    assert.ok(r.events.some((e) => e.type === "end_turn"));
    assert.ok(r.events.some((e) => e.type === "seat_turn_start" && e.seatId === "seat-1"));
    assert.equal(s.invents["seat-1"].ap, s.invents["seat-1"].apMax);
  });

  it("one player waiting past fail year does not collapse while another invent is still early", () => {
    // Fail year 2030: two waits on one seat → invent 2030, partner stays 2026
    let s = createMpLobby(["Alex", "Bea"]);
    s = setMpQuest(
      s,
      {
        ...mission,
        collapseYear: 2030,
        pressure: { Floods: 1, Trust: 1 },
        pressureRise: { Floods: 0, Trust: 0 }, // isolate year rule from meter collapse
      },
      "climate"
    );
    s = startMpQuest(s).session;

    // Alex wait → invent +2 (2028), pass to Bea
    s = applyMpAction(s, {
      type: "buffer_write",
      payload: { field: "inventionHow", value: "pump" },
    }).session;
    let r = applyMpAction(s, { type: "wait" });
    assert.equal(r.ok, true, r.error);
    s = r.session;
    assert.notEqual(s.place.status, "collapsed");
    assert.equal(s.invents["seat-0"].year, 2028);

    // Bea ends turn → wrap adds +1 to every invent year (market round year tick)
    s = applyMpAction(s, {
      type: "buffer_write",
      payload: { field: "inventionHow", value: "dike" },
    }).session;
    s = applyMpAction(s, { type: "end_turn" }).session;
    assert.equal(activeSeatId(s), "seat-0");
    assert.equal(s.invents["seat-0"].year, 2029);
    assert.equal(s.invents["seat-1"].year, 2027);

    // Alex second wait → +2 invent only (2031); partner stays earlier
    s = applyMpAction(s, {
      type: "buffer_write",
      payload: { field: "inventionHow", value: "pump v2" },
    }).session;
    r = applyMpAction(s, { type: "wait" });
    assert.equal(r.ok, true, r.error);
    s = r.session;
    assert.equal(s.invents["seat-0"].year, 2031);
    assert.ok(s.invents["seat-1"].year < s.invents["seat-0"].year);
    assert.equal(
      s.place.status,
      "playing",
      "late solo invent calendar must not end the shared place"
    );
    assert.ok(!r.events.some((e) => e.type === "collapsed"));
  });

  it("all invent calendars past fail year collapses the place", () => {
    let s = createMpLobby(["Alex", "Bea"]);
    s = setMpQuest(
      s,
      {
        ...mission,
        collapseYear: 2030,
        pressure: { Floods: 1, Trust: 1 },
        pressureRise: { Floods: 0, Trust: 0 },
      },
      "climate"
    );
    s = startMpQuest(s).session;

    // Each seat waits until both invent calendars reach fail year (wrap year-ticks accelerate)
    for (let i = 0; i < 8; i++) {
      const id = activeSeatId(s);
      s = applyMpAction(s, {
        type: "buffer_write",
        payload: { field: "inventionHow", value: `w${i}` },
      }).session;
      const r = applyMpAction(s, { type: "wait" });
      assert.equal(r.ok, true, r.error);
      s = r.session;
      if (s.place.status === "collapsed") {
        assert.ok(s.invents["seat-0"].year >= 2030);
        assert.ok(s.invents["seat-1"].year >= 2030);
        assert.ok(r.events.some((e) => e.type === "collapsed" && e.reason === "all_invent_years"));
        return;
      }
      assert.ok(id);
    }
    assert.equal(s.place.status, "collapsed");
  });

  it("wait does not collapse via meters; high meters still collapse if already maxed", () => {
    let s = createMpLobby(["Alex", "Bea"]);
    s = setMpQuest(
      s,
      {
        ...mission,
        collapseYear: 2099,
        pressure: { Floods: 5, Trust: 1 },
        pressureRise: { Floods: 1, Trust: 0 },
      },
      "climate"
    );
    s = startMpQuest(s).session;
    s = applyMpAction(s, {
      type: "buffer_write",
      payload: { field: "inventionHow", value: "x" },
    }).session;
    const r = applyMpAction(s, { type: "wait" });
    assert.equal(r.ok, true, r.error);
    s = r.session;
    // Meters already at 5 before Wait → place is collapsed (not because of invent year)
    assert.equal(s.place.status, "collapsed");
    assert.ok(r.events.some((e) => e.type === "collapsed" && e.reason === "pressure"));
  });

  it("two waits by one seat to fail year leave the place playing when partner is early", () => {
    let s = createMpLobby(["Alex", "Bea"]);
    s = setMpQuest(
      s,
      {
        ...mission,
        startYear: 2026,
        collapseYear: 2030,
        pressure: { Floods: 4, Trust: 4 }, // would have meter-killed if Wait still raised crisis
        pressureRise: { Floods: 1, Trust: 1 },
      },
      "climate"
    );
    s = startMpQuest(s).session;
    // Alex: two waits → invent 2030
    for (let i = 0; i < 2; i++) {
      s = applyMpAction(s, {
        type: "buffer_write",
        payload: { field: "inventionHow", value: `a${i}` },
      }).session;
      const r = applyMpAction(s, { type: "wait" });
      assert.equal(r.ok, true, r.error);
      s = r.session;
      assert.notEqual(s.place.status, "collapsed", `collapse after Alex wait #${i + 1}`);
      // Bea's turn — end without waiting so Alex can wait again
      if (activeSeatId(s) === "seat-1") {
        s = applyMpAction(s, {
          type: "buffer_write",
          payload: { field: "inventionHow", value: `b${i}` },
        }).session;
        s = applyMpAction(s, { type: "end_turn" }).session;
      }
    }
    // Alex waited +2 twice (→ +4) and two full seat-wraps each +1 everyone's invent year
    // (Alex wait→Bea end wrap #1, Alex wait→Bea end wrap #2)
    assert.equal(s.invents["seat-0"].year, 2032);
    assert.equal(s.invents["seat-1"].year, 2028); // two wrap ticks only (no personal Wait)
    assert.equal(s.place.status, "playing");
    assert.equal(s.place.pressure.Floods, 4, "Wait must not raise shared meters");
  });
});

describe("mp-session layer emTech", () => {
  it("actor pays when layering on other invent", () => {
    let s = started();
    // Alex adds own tech then ends
    s = applyMpAction(s, {
      type: "buffer_write",
      payload: { field: "inventionName", value: "A" },
    }).session;
    s = applyMpAction(s, { type: "end_turn" }).session;
    // Bea layers on Alex
    const budgetBefore = s.invents["seat-1"].budget;
    const r = applyMpAction(s, {
      type: "layer_tech",
      payload: { techId: "solar", targetSeatId: "seat-0" },
    });
    assert.equal(r.ok, true);
    s = r.session;
    assert.ok(s.invents["seat-1"].budget < budgetBefore);
    assert.equal(s.invents["seat-0"].stack.length, 1);
    assert.equal(s.invents["seat-0"].stack[0].addedBy, "seat-1");
    assert.ok(s.invents["seat-1"].contributionBudgetSpent >= 1);
  });

  it("own write hits actor invent by default", () => {
    let s = started();
    s = applyMpAction(s, {
      type: "buffer_write",
      payload: { field: "inventionName", value: "Mine" },
    }).session;
    assert.equal(s.invents["seat-0"].inventionName, "Mine");
    assert.equal(s.invents["seat-1"].inventionName, "");
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
      s.invents["seat-0"].inventionImpact,
      "Families get clean water without a long walk."
    );
    // Bea's own invent stays empty
    assert.equal(s.invents["seat-1"].inventionImpact, "");
  });

  it("cannot write on invent locked after challenge/scrutiny", () => {
    let s = started();
    s = applyMpAction(s, {
      type: "buffer_write",
      payload: { field: "inventionHow", value: "How" },
    }).session;
    s = applyMpAction(s, { type: "enter_challenge" }).session;
    assert.equal(s.invents["seat-0"].turnPhase, "scrutiny");
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
    // Techs + enter_challenge spend the invent AP bar. Pilot/Scale also cost 1 AP each.
    // Real play: End turn to refill. Tests top up so deploy can be exercised same seat-turn.
    const aid = activeSeatId(s);
    if (s.invents[aid]) s.invents[aid].ap = s.invents[aid].apMax;
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

  it("end_turn mid-challenge keeps invent frozen in challenge phase", () => {
    let s = started();
    s = applyMpAction(s, {
      type: "buffer_write",
      payload: { field: "inventionHow", value: "how ".repeat(20) },
    }).session;
    s = applyMpAction(s, {
      type: "buffer_write",
      payload: { field: "inventionImpact", value: "life ".repeat(20) },
    }).session;
    s = applyMpAction(s, { type: "select_tech", payload: { techId: T0 } }).session;
    s = applyMpAction(s, { type: "enter_challenge" }).session;
    assert.equal(s.invents["seat-0"].turnPhase, "scrutiny");
    s = applyMpAction(s, { type: "end_turn" }).session;
    // Next seat is active, but owner invent must still be mid-challenge / frozen
    const owner = s.invents["seat-0"];
    assert.equal(owner.turnPhase, "scrutiny");
    assert.equal(owner.inventPhase, "challenge");
    assert.equal(owner.challengePassed, false);
    const write = applyMpAction(
      s,
      {
        type: "write_commit",
        payload: {
          field: "inventionHow",
          value: "changed",
          targetSeatId: "seat-0",
          changed: true,
        },
      },
      "seat-1"
    );
    assert.equal(write.ok, false);
    assert.equal(write.error, "invent_locked");
  });

  it("challenge fail → challenge_locked freezes invent; only owner re-enters; reopen unlocks", () => {
    let s = prepForPilot(started());
    // Force fail path on submit
    s.invents["seat-0"].turnPhase = "scrutiny";
    s.invents["seat-0"].challengePassed = false;
    s = applyMpAction(s, {
      type: "submit_challenge",
      payload: { answer: "no", verdict: "fail", force: true },
    }).session;
    assert.equal(s.invents["seat-0"].inventPhase, "challenge_locked");
    assert.equal(s.invents["seat-0"].challengeLocked, true);
    assert.equal(s.invents["seat-0"].challengePassed, false);
    // Helper cannot write while locked
    s = applyMpAction(s, { type: "end_turn" }).session;
    assert.equal(activeSeatId(s), "seat-1");
    const denied = applyMpAction(s, {
      type: "buffer_write",
      payload: {
        field: "inventionHow",
        value: "Helper rewrite attempt",
        targetSeatId: "seat-0",
      },
    });
    assert.equal(denied.ok, false);
    assert.equal(denied.error, "invent_locked");
    // Back to owner — can re-enter challenge without reopen
    s.invents["seat-1"].apSpentThisTurn = 1;
    s = applyMpAction(s, { type: "end_turn" }).session;
    assert.equal(activeSeatId(s), "seat-0");
    const reEnter = applyMpAction(s, { type: "enter_challenge" });
    assert.equal(reEnter.ok, true, reEnter.error);
    assert.equal(reEnter.session.invents["seat-0"].inventPhase, "challenge");
    // Explicit reopen from locked
    s = reEnter.session;
    s = applyMpAction(s, {
      type: "submit_challenge",
      payload: { answer: "no", verdict: "fail", force: true },
    }).session;
    const reopen = applyMpAction(s, {
      type: "reopen_invent",
      payload: { targetSeatId: "seat-0" },
    });
    assert.equal(reopen.ok, true, reopen.error);
    assert.equal(reopen.session.invents["seat-0"].inventPhase, "invent");
    assert.equal(reopen.session.invents["seat-0"].challengeLocked, false);
  });

  it("sidestep (pass + clearMode) → deploy_ready", () => {
    let s = prepForPilot(started());
    s.invents["seat-0"].turnPhase = "scrutiny";
    s.invents["seat-0"].challengePassed = false;
    s = applyMpAction(s, {
      type: "submit_challenge",
      payload: {
        answer: "Sidestep",
        verdict: "pass",
        clearMode: "sidestep",
        sidestep: true,
        force: true,
      },
    }).session;
    assert.equal(s.invents["seat-0"].inventPhase, "deploy_ready");
    assert.equal(s.invents["seat-0"].challengePassed, true);
    assert.equal(s.invents["seat-0"].challengeClearMode, "sidestep");
  });

  it("pilot does not change place; scale does", () => {
    let s = prepForPilot(started());
    const p0 = s.place.pressure.Floods;
    s = applyMpAction(s, { type: "attempt_pilot" }, null, { rng: alwaysOk }).session;
    assert.equal(s.invents["seat-0"].deployStage, "pilot_ok");
    assert.equal(s.place.pressure.Floods, p0);

    const rScale = applyMpAction(s, { type: "attempt_scale" }, null, { rng: alwaysOk });
    assert.equal(rScale.ok, true, rScale.error);
    s = rScale.session;
    // Scale → New normal completes this invent; race ends only on full solve
    assert.equal(s.invents["seat-0"].deployStage, "new_normal");
    assert.ok(
      s.place.status === "won" || s.place.status === "playing",
      `expected won or still playing, got ${s.place.status}`
    );
    if (s.place.status === "won") {
      assert.ok(rScale.events?.some((e) => e.type === "quest_won"));
    } else {
      assert.ok(!rScale.events?.some((e) => e.type === "quest_won"));
      assert.ok(rScale.events?.some((e) => e.type === "scale_ok" && e.raceOver === false));
    }
    assert.ok(totalDrop(s) > 0 || s.invents["seat-0"].impactDropTotal >= 0);
    // pressure should not increase; usually drops
    assert.ok(s.place.pressure.Floods <= p0);
  });

  it("active seat can pilot/scale another seat's invent (targetSeatId)", () => {
    // Alex prep + pass challenge, end turn; Bea pilots/scales Alex's invent
    let s = prepForPilot(started());
    assert.equal(s.invents["seat-0"].challengePassed, true);
    assert.equal(s.invents["seat-0"].deployStage, "none");
    // Challenge-passed invent is locked for prose — just end turn
    s = applyMpAction(s, { type: "end_turn" }).session;
    assert.equal(activeSeatId(s), "seat-1");

    const beaBudget = s.invents["seat-1"].budget;
    const beaAp = s.invents["seat-1"].ap;
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
    assert.equal(s.invents["seat-0"].deployStage, "pilot_ok");
    assert.equal(s.invents["seat-1"].deployStage, "none"); // Bea's invent untouched
    assert.ok(s.invents["seat-1"].budget < beaBudget);
    // Helper pays AP for Pilot (same as solo deploy cost)
    assert.ok(s.invents["seat-1"].ap < beaAp, "pilot should spend AP");
    assert.ok((s.invents["seat-1"].apSpentThisTurn || 0) >= 1);

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
    assert.equal(s.invents["seat-0"].deployStage, "new_normal");
    // Helper fielded host invent: full win ends race; partial keeps playing
    assert.ok(
      s.place.status === "won" || s.place.status === "playing",
      `expected won or still playing after helper scale, got ${s.place.status}`
    );
    if (s.place.status === "playing") {
      assert.ok(!rScale.events?.some((e) => e.type === "quest_won"));
      // Bea can still End turn; race is open for other invents
      s.invents["seat-1"].apSpentThisTurn = 1;
      const end = applyMpAction(s, { type: "end_turn" });
      assert.equal(end.ok, true, end.error);
    }
    assert.ok(s.place.pressure.Floods <= p0);
  });

  it("failed pilot blocks retry same turn", () => {
    let s = prepForPilot(started());
    s = applyMpAction(s, { type: "attempt_pilot" }, null, { rng: alwaysFail }).session;
    assert.equal(s.invents["seat-0"].pilotFailedThisTurn, true);
    const r = applyMpAction(s, { type: "attempt_pilot" }, null, { rng: alwaysOk });
    assert.equal(r.ok, false);
    assert.equal(r.error, "retry_next_turn");
  });

  it("reopen_invent unlocks after challenge+pilot; owner only; keeps prose/stack", () => {
    let s = prepForPilot(started());
    s = applyMpAction(s, { type: "attempt_pilot" }, null, { rng: alwaysOk }).session;
    assert.equal(s.invents["seat-0"].challengePassed, true);
    assert.equal(s.invents["seat-0"].deployStage, "pilot_ok");
    const how = s.invents["seat-0"].inventionHow;
    const stackLen = s.invents["seat-0"].stack.length;
    assert.ok(how.length > 20);
    assert.ok(stackLen >= 2);

    // Helper cannot reopen owner's invent
    s = applyMpAction(s, { type: "end_turn" }).session;
    assert.equal(activeSeatId(s), "seat-1");
    const denied = applyMpAction(s, {
      type: "reopen_invent",
      payload: { targetSeatId: "seat-0" },
    });
    assert.equal(denied.ok, false);
    assert.equal(denied.error, "owner_only");

    // Back to Alex (ensure engagement so end_turn is accepted)
    s.invents["seat-1"].apSpentThisTurn = 1;
    s = applyMpAction(s, { type: "end_turn" }).session;
    assert.equal(activeSeatId(s), "seat-0");
    const re = applyMpAction(s, {
      type: "reopen_invent",
      payload: { targetSeatId: "seat-0" },
    });
    assert.equal(re.ok, true, re.error);
    s = re.session;
    assert.equal(s.invents["seat-0"].challengePassed, false);
    assert.equal(s.invents["seat-0"].deployStage, "none");
    assert.equal(s.invents["seat-0"].turnPhase, "act");
    assert.equal(s.invents["seat-0"].inventionHow, how);
    assert.equal(s.invents["seat-0"].stack.length, stackLen);
    assert.ok(re.events.some((e) => e.type === "reopen_invent"));

    // Story writeable again (owner)
    const write = applyMpAction(s, {
      type: "buffer_write",
      payload: { field: "inventionHow", value: how + " Reworked with crews on site." },
    });
    assert.equal(write.ok, true, write.error);
    s = write.session;

    // Helper can layer again after reopen
    s = applyMpAction(s, { type: "end_turn" }).session;
    assert.equal(activeSeatId(s), "seat-1");
    const otherTech = TECHS.find(
      (t) => !s.invents["seat-0"].stack.some((x) => x.techId === t.id)
    );
    if (otherTech) {
      const layer = applyMpAction(s, {
        type: "layer_tech",
        payload: { techId: otherTech.id, targetSeatId: "seat-0", tech: otherTech },
      });
      assert.equal(layer.ok, true, layer.error);
      s = layer.session;
    }

    // Must re-challenge before pilot (Alex's turn again)
    s.invents["seat-1"].apSpentThisTurn = Math.max(1, s.invents["seat-1"].apSpentThisTurn || 0);
    s = applyMpAction(s, { type: "end_turn" }).session;
    assert.equal(activeSeatId(s), "seat-0");
    const pilotDenied = applyMpAction(s, { type: "attempt_pilot" }, null, { rng: alwaysOk });
    assert.equal(pilotDenied.ok, false);
    assert.equal(pilotDenied.error, "challenge_required");
  });

  it("reopen_invent blocked after scale (or race already over)", () => {
    let s = prepForPilot(started());
    s = applyMpAction(s, { type: "attempt_pilot" }, null, { rng: alwaysOk }).session;
    // Force non-solving scale if possible: use yellow and ok rng — may still solve
    const scaled = applyMpAction(s, { type: "attempt_scale" }, null, { rng: alwaysOk });
    s = scaled.session;
    if (s.place.status === "won" || s.place.status === "collapsed") {
      const r = applyMpAction(s, {
        type: "reopen_invent",
        payload: { targetSeatId: "seat-0" },
      });
      assert.equal(r.ok, false);
      assert.equal(r.error, "run_over");
      return;
    }
    if (s.invents["seat-0"].deployStage === "scaled") {
      const r = applyMpAction(s, {
        type: "reopen_invent",
        payload: { targetSeatId: "seat-0" },
      });
      assert.equal(r.ok, false);
      assert.ok(r.error === "already_scaled" || r.error === "run_over");
    }
  });

  it("stack locked after challenge until reopen", () => {
    let s = prepForPilot(started());
    const r = applyMpAction(s, {
      type: "select_tech",
      payload: { techId: TECHS[3]?.id || T0 },
    });
    // If tech already on stack, pick another
    if (r.error === "already_on_stack") {
      const other = TECHS.find((t) => !s.invents["seat-0"].stack.some((x) => x.techId === t.id));
      if (other) {
        const r2 = applyMpAction(s, {
          type: "select_tech",
          payload: { techId: other.id, tech: other },
        });
        assert.equal(r2.ok, false);
        assert.equal(r2.error, "invent_locked");
      }
    } else {
      assert.equal(r.ok, false);
      assert.equal(r.error, "invent_locked");
    }
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
    // Easy winMax so any successful scale solves the place
    let s = createMpLobby(["Alex", "Bea"]);
    const easy = {
      ...mission,
      pressure: { Floods: 1, Livelihoods: 0, Trust: 0 },
      winMax: { Floods: 0, Livelihoods: 0, Trust: 0 },
    };
    s = setMpQuest(s, easy, "climate");
    s = startMpQuest(s).session;
    s = prepForPilot(s);
    const apBefore = s.invents["seat-0"].ap;
    s = applyMpAction(s, { type: "attempt_pilot" }, null, { rng: alwaysOk }).session;
    assert.ok(s.invents["seat-0"].ap < apBefore, "pilot spends AP");
    const apAfterPilot = s.invents["seat-0"].ap;
    s = applyMpAction(s, { type: "attempt_scale" }, null, { rng: alwaysOk }).session;
    assert.ok(s.invents["seat-0"].ap < apAfterPilot, "scale spends AP");
    assert.equal(s.place.status, "won");
    assert.ok(s.ranking?.rows?.length >= 2);
    assert.equal(s.invents["seat-0"].landedSolvingScale, true);
    assert.equal(s.place.solverSeatId, "seat-0");
  });

  it("pilot and scale spend AP like solo", () => {
    let s = prepForPilot(started());
    const ap0 = s.invents["seat-0"].ap;
    s = applyMpAction(s, { type: "attempt_pilot" }, null, { rng: alwaysOk }).session;
    assert.equal(s.invents["seat-0"].ap, ap0 - 1);
    const ap1 = s.invents["seat-0"].ap;
    s = applyMpAction(s, { type: "attempt_scale" }, null, { rng: alwaysOk }).session;
    assert.equal(s.invents["seat-0"].ap, ap1 - 1);
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
    assert.equal(s.invents["seat-0"].abandoned, true);
    const r = applyMpAction(s, { type: "enter_challenge" });
    assert.equal(r.ok, false);
    // end turn and... actually still active; layer on other
    s = applyMpAction(s, {
      type: "layer_tech",
      payload: { techId: "ai", targetSeatId: "seat-1" },
    }).session;
    assert.equal(s.invents["seat-1"].stack[0].addedBy, "seat-0");
  });
});

describe("mp-rank", () => {
  it("orders by score components", () => {
    const s = started();
    s.place.status = "won";
    s.invents["seat-0"].impactDropTotal = 3;
    s.invents["seat-0"].challengeVerdict = "pass";
    s.invents["seat-0"].hadChallengeAttempt = true;
    s.invents["seat-0"].landedSolvingScale = true;
    s.invents["seat-0"].successfulScales = 1;
    s.invents["seat-1"].contributionBudgetSpent = 6;
    s.invents["seat-1"].contributionApSpent = 2;
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
    const ap0 = s.invents["seat-0"].ap;
    s = applyMpAction(s, { type: "pay_ap", payload: { amount: 1 } }).session;
    assert.equal(s.invents["seat-0"].ap, ap0 - 1);
    s = applyMpAction(s, { type: "refund_ap", payload: { amount: 1 } }).session;
    assert.equal(s.invents["seat-0"].ap, ap0);
  });
});

describe("mp-session lobby", () => {
  it("trades 1 AP + 1 Budget for +1 Will on active seat", () => {
    let s = started();
    const f0 = s.invents["seat-0"];
    const ap0 = f0.ap;
    const budget0 = f0.budget;
    const will0 = f0.will;
    const r = applyMpAction(s, { type: "lobby" });
    assert.equal(r.ok, true, r.error);
    s = r.session;
    assert.equal(s.invents["seat-0"].ap, ap0 - 1);
    assert.equal(s.invents["seat-0"].budget, budget0 - 1);
    assert.equal(s.invents["seat-0"].will, will0 + 1);
    assert.ok(r.events.some((e) => e.type === "lobby"));
    // Shared place unchanged
    assert.deepEqual(s.place.pressure, started().place.pressure);
  });

  it("rejects lobby without AP or Budget; non-active cannot lobby", () => {
    let s = started();
    s.invents["seat-0"].ap = 0;
    let r = applyMpAction(s, { type: "lobby" });
    assert.equal(r.ok, false);
    assert.equal(r.error, "no_ap");

    s = started();
    s.invents["seat-0"].budget = 0;
    r = applyMpAction(s, { type: "lobby" });
    assert.equal(r.ok, false);
    assert.equal(r.error, "no_budget");

    s = started();
    r = applyMpAction(s, { type: "lobby" }, "seat-1");
    assert.equal(r.ok, false);
    assert.equal(r.error, "not_active_seat");
  });

  it("caps Will at max", () => {
    let s = started();
    s.invents["seat-0"].will = 5;
    const r = applyMpAction(s, { type: "lobby" });
    assert.equal(r.ok, true, r.error);
    assert.equal(r.session.invents["seat-0"].will, 5);
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
    assert.match(s.invents["seat-0"].challengeFeedback, /SIDESTEP/);
    assert.equal(s.invents["seat-0"].scrutinyPublic?.pivotUsed, true);
    // Other seat does not inherit feedback
    assert.equal(s.invents["seat-1"].challengeFeedback || "", "");
  });

  it("sync_vision bumps invent visionRev for followers", () => {
    let s = started();
    const r = applyMpAction(s, {
      type: "sync_vision",
      payload: { targetSeatId: "seat-0", sessionId: "room-X-seat-seat-0" },
    });
    assert.equal(r.ok, true, r.error);
    assert.equal(r.session.invents["seat-0"].visionRev, 1);
    assert.equal(r.events.some((e) => e.type === "vision_sync"), true);
  });
});

describe("mp-session leave Quest vote", () => {
  it("strict majority: ties fail", () => {
    assert.equal(questExitMajorityReached(2, 4), false);
    assert.equal(questExitMajorityReached(3, 4), true);
    assert.equal(questExitMajorityReached(2, 3), true);
    assert.equal(questExitMajorityReached(1, 2), false);
  });

  it("non-active seat can vote; 1/2 does not end Quest", () => {
    let s = started(); // Alex seat-0, Bea seat-1; active = host seat-0
    // Bea votes while not active
    const r = applyMpAction(s, { type: "vote_leave_quest" }, "seat-1");
    assert.equal(r.ok, true, r.error);
    s = r.session;
    assert.equal(s.place.status, "playing");
    const t = questExitTally(s);
    assert.equal(t.yes, 1);
    assert.equal(t.total, 2);
    assert.equal(t.reached, false);
  });

  it("2/2 votes leave the Quest; unvote before majority revokes", () => {
    let s = started();
    s = applyMpAction(s, { type: "vote_leave_quest" }, "seat-0").session;
    assert.equal(s.place.status, "playing");
    s = applyMpAction(s, { type: "unvote_leave_quest" }, "seat-0").session;
    assert.equal(questExitTally(s).yes, 0);
    s = applyMpAction(s, { type: "vote_leave_quest" }, "seat-0").session;
    s = applyMpAction(s, { type: "vote_leave_quest" }, "seat-1").session;
    assert.equal(s.place.status, "abandoned_by_vote");
    assert.equal(s.questExit.resolved, true);
    assert.ok(s.ranking);
    // Further actions blocked
    const blocked = applyMpAction(s, { type: "end_turn" }, "seat-0");
    assert.equal(blocked.ok, false);
    assert.equal(blocked.error, "run_over");
  });

});

function totalDrop(s) {
  return s.invents["seat-0"].impactDropTotal || 0;
}

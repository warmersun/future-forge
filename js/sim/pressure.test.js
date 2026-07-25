import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyPressureRise,
  applyPressureDrop,
  previewPressureAfterWait,
  maxPressure,
} from "./pressure.js";
import { computeDeployDrop } from "./deploy.js";
import { isWin, isCollapsed, isMpPlaceCollapsed } from "./collapse.js";
import { scoreRun } from "./scoring.js";
import { applyAction } from "./actions.js";
import { techCost, applyG2DeployDeltas, deployActionCost } from "./economy.js";
import { GAME } from "../data.js";

describe("pressure", () => {
  it("applies full Wait rise (portside-style)", () => {
    const rise = { Floods: 1, Livelihoods: 1, Trust: 0 };
    const next = applyPressureRise({ Floods: 2, Livelihoods: 2, Trust: 1 }, rise);
    assert.deepEqual(next, { Floods: 3, Livelihoods: 3, Trust: 1 });
  });

  it("preview matches rise", () => {
    const p = { A: 2, B: 0 };
    assert.deepEqual(previewPressureAfterWait(p, { A: 1, B: 1 }), { A: 3, B: 1 });
  });

  it("drop allocates highest first", () => {
    const next = applyPressureDrop({ Floods: 4, Livelihoods: 2, Trust: 1 }, 3);
    assert.ok(maxPressure(next) < 5);
    assert.ok(next.Floods <= 4);
  });
});

describe("deploy drop", () => {
  it("matches baseline stack formula", () => {
    const techs = [
      { id: "a", domain: "power" },
      { id: "b", domain: "automator" },
      { id: "c", domain: "power" },
    ];
    const { drop, parts } = computeDeployDrop({
      techs,
      domains: ["power", "automator"],
      pairs: [["a", "b"]],
      inventionHow: "word ".repeat(30),
      inventionImpact: "word ".repeat(20),
      challengeVerdict: "pass",
      challengeAnswer: "x".repeat(60),
      suggested: ["a", "b"],
    });
    // 1+min(2,2)=3 stack + domain + synergy + words + pass + answer + suggested = 9
    assert.equal(drop, 9);
    assert.ok(parts.length >= 5);
  });
});

describe("collapse / win", () => {
  it("detects win and collapse", () => {
    assert.equal(isWin({ Floods: 1 }, { Floods: 2 }), true);
    assert.equal(isWin({ Floods: 3 }, { Floods: 2 }), false);
    assert.equal(isCollapsed({ year: 2030, collapseYear: 2032, pressure: { A: 5 } }), true);
    assert.equal(isCollapsed({ year: 2032, collapseYear: 2032, pressure: { A: 1 } }), true);
  });

  it("mp place year-fail only when all invents are late", () => {
    const base = {
      seatOrder: ["a", "b"],
      place: {
        year: 2026,
        collapseYear: 2030,
        pressure: { Floods: 1 },
        mission: { startYear: 2026, collapseYear: 2030 },
      },
      forges: {
        a: { year: 2030, abandoned: false },
        b: { year: 2026, abandoned: false },
      },
    };
    assert.equal(isMpPlaceCollapsed(base), false);
    // Missing year on partner counts as present (start), not place.year
    base.forges.b = { abandoned: false };
    assert.equal(isMpPlaceCollapsed(base), false);
    base.forges.b = { year: 2030, abandoned: false };
    assert.equal(isMpPlaceCollapsed(base), true);
    // Pressure still ends everyone regardless of years
    base.forges.b.year = 2026;
    base.place.pressure = { Floods: 5 };
    assert.equal(isMpPlaceCollapsed(base), true);
  });
});

describe("scoring", () => {
  it("awards three stars for early honest win", () => {
    const r = scoreRun({
      kind: "win",
      year: 2026,
      startYear: 2026,
      yearsPerTurn: 2,
      waits: 0,
      challengeVerdict: "pass",
      hadChallengeAttempt: true,
      timingLevel: "green",
      inventionHow: "A supervised pilot with human-in-the-loop review.",
      synergyPairCount: 1,
      domainCount: 2,
      suggestedHitCount: 2,
      challengeAnswerWords: 90,
    });
    assert.equal(r.stars, 3);
    assert.equal(r.v, 1);
  });

  it("collapse without attempt is zero stars", () => {
    const r = scoreRun({
      kind: "collapse",
      year: 2034,
      startYear: 2026,
      yearsPerTurn: 2,
      waits: 4,
      hadChallengeAttempt: false,
      challengeVerdict: null,
      timingLevel: "yellow",
      inventionHow: "",
      synergyPairCount: 0,
      domainCount: 1,
      suggestedHitCount: 0,
      challengeAnswerWords: 0,
    });
    assert.equal(r.stars, 0);
  });
});

describe("actions", () => {
  const base = () => ({
    year: 2026,
    turn: 0,
    waits: 0,
    pressure: { Floods: 2, Livelihoods: 2, Trust: 1 },
    ap: 3,
    apMax: 3,
    apSpentThisTurn: 0,
    writeCommitsThisTurn: 0,
    learnOpenedThisTurn: false,
    turnPhase: "act",
    selectedTechIds: [],
    pendingAi: null,
    challengePassed: false,
    challengeVerdict: null,
    hadChallengeAttempt: false,
    lastChallengeVerdict: null,
    budget: 5,
    will: 3,
    techAddedThisTurn: {},
  });

  it("select_tech spends AP", () => {
    const r = applyAction(base(), { type: "select_tech", payload: { techId: "solar" } }, {
      features: { actionPoints: true },
    });
    assert.equal(r.ok, true);
    assert.equal(r.sim.ap, 2);
    assert.deepEqual(r.sim.selectedTechIds, ["solar"]);
  });

  it("end_turn does not raise pressure", () => {
    const s = base();
    s.apSpentThisTurn = 1;
    s.ap = 2;
    const r = applyAction(s, { type: "end_turn" }, { features: { actionPoints: true } });
    assert.equal(r.ok, true);
    assert.equal(r.sim.year, 2026);
    assert.equal(r.sim.waits, 0);
    assert.deepEqual(r.sim.pressure, { Floods: 2, Livelihoods: 2, Trust: 1 });
    assert.equal(r.sim.ap, 3);
    assert.equal(r.sim.turn, 1);
  });

  it("wait full-ticks crisis and burns AP", () => {
    const r = applyAction(
      base(),
      {
        type: "wait",
        payload: {
          mission: {
            yearsPerTurn: 2,
            pressureRise: { Floods: 1, Livelihoods: 1, Trust: 0 },
            collapseYear: 2036,
          },
        },
      },
      { features: { actionPoints: true }, apMax: GAME.apMax }
    );
    assert.equal(r.ok, true);
    assert.equal(r.sim.year, 2028);
    assert.equal(r.sim.waits, 1);
    assert.deepEqual(r.sim.pressure, { Floods: 3, Livelihoods: 3, Trust: 1 });
    assert.equal(r.sim.ap, 3);
  });

  it("select_tech spends budget when budgetWill on", () => {
    const tech = { id: "solar", readyYear: 2026, curve: "mature" };
    const s = base();
    s.budget = 5;
    s.will = 3;
    const r = applyAction(
      s,
      { type: "select_tech", payload: { techId: "solar", tech } },
      { features: { actionPoints: true, budgetWill: true } }
    );
    assert.equal(r.ok, true);
    assert.equal(r.sim.budget, 4);
    assert.equal(r.sim.ap, 2);
  });

  it("lobby trades budget for will", () => {
    const s = base();
    s.budget = 5;
    s.will = 3;
    s.ap = 3;
    const r = applyAction(
      s,
      { type: "lobby" },
      { features: { actionPoints: true, budgetWill: true } }
    );
    assert.equal(r.ok, true);
    assert.equal(r.sim.budget, 4);
    assert.equal(r.sim.will, 4);
    assert.equal(r.sim.ap, 2);
  });

  it("deploy action spends AP and budget", () => {
    const s = base();
    s.ap = 2;
    s.budget = 3;
    s.will = 3;
    const r = applyAction(
      s,
      { type: "deploy", payload: { apCost: 1, budgetCost: 2 } },
      { features: { actionPoints: true, budgetWill: true } }
    );
    assert.equal(r.ok, true);
    assert.equal(r.sim.ap, 1);
    assert.equal(r.sim.budget, 1);
  });
});

describe("economy", () => {
  it("techCost does not inflate all steep techs to 2", () => {
    const steep = techCost({ id: "x", readyYear: 2026, curve: "steep" });
    assert.equal(steep.budget, 1);
  });

  it("G2 deploy deltas only will≥4 / will===0", () => {
    assert.equal(applyG2DeployDeltas(5, 4).drop, 6);
    assert.equal(applyG2DeployDeltas(5, 0).drop, 4);
    assert.equal(applyG2DeployDeltas(5, 2).drop, 5);
  });

  it("deploy field cost scales with stack and discounts high will", () => {
    const one = deployActionCost([{ id: "a", readyYear: 2026, curve: "mature" }], { will: 2 });
    assert.equal(one.ap, 1);
    assert.equal(one.budget, 1);

    const three = deployActionCost(
      [
        { id: "a", readyYear: 2026, curve: "mature" },
        { id: "b", readyYear: 2026, curve: "mature" },
        { id: "c", readyYear: 2026, curve: "mature" },
      ],
      { will: 2 }
    );
    assert.equal(three.budget, 2);

    const threeMandate = deployActionCost(
      [
        { id: "a", readyYear: 2026, curve: "mature" },
        { id: "b", readyYear: 2026, curve: "mature" },
        { id: "c", readyYear: 2026, curve: "mature" },
      ],
      { will: 4 }
    );
    assert.equal(threeMandate.budget, 1);
  });
});

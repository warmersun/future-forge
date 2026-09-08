import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MISSIONS, localScenariosForGlobal } from "../data.js";
import { validateQuestTile } from "../quest-tile.js";
import {
  ARCHETYPES,
  applyEconomyPatchToTile,
  clockFacts,
  evaluateQuestEconomy,
  extractKnobs,
  untreatedClockBlurb,
  untreatedWaitTimeline,
  yearlyCrisisClock,
  pickTechs,
  planPath,
  planTiles,
  heavyAiBill,
  recommendQuestEconomy,
  simulateArchetype,
  YIELD_BANDS,
} from "./quest-economy.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

function loadGeneSeq() {
  const raw = readFileSync(
    join(ROOT, "quests/spotlight-gene-seq.json"),
    "utf8"
  );
  const tile = JSON.parse(raw);
  const v = validateQuestTile(tile);
  assert.equal(v.ok, true, (v.details || []).join(", "));
  return v;
}

describe("extractKnobs", () => {
  it("reads structured mission resources and meters", () => {
    const v = loadGeneSeq();
    const k = extractKnobs(v);
    assert.equal(k.apMax, 4);
    assert.equal(k.budget, 8);
    assert.equal(k.will, 4);
    assert.equal(k.startYear, 2026);
    assert.equal(k.collapseYear, 2032);
    assert.equal(k.meters.length, 2);
    assert.equal(k.meters[0].role, "local");
    assert.equal(k.meters[1].role, "support");
    assert.equal(k.meters[1].key, "Fear");
    assert.equal(k.suggested[0], "gene-sequencing");
  });

  it("applies overrides without mutating the tile", () => {
    const v = loadGeneSeq();
    const k = extractKnobs(v, {
      resources: { apMax: 2, startingBudget: 1, startingWill: 0 },
      pressure: { local: { pressure: 3 } },
    });
    assert.equal(k.apMax, 2);
    assert.equal(k.budget, 1);
    assert.equal(k.will, 0);
    assert.equal(k.meters.find((m) => m.role === "local").start, 3);
    assert.equal(v.mission.resources.apMax, 4);
  });

  it("accepts built-in MISSIONS entries", () => {
    const port = MISSIONS.find((m) => m.id === "portside-floods");
    const k = extractKnobs(port);
    assert.equal(k.meters.length, 3);
    assert.equal(k.apMax, 3);
    assert.equal(k.budget, 5);
  });
});

describe("pickTechs / planPath", () => {
  it("starts with the suggested spotlight tech", () => {
    const techs = pickTechs(["gene-sequencing"], 2);
    assert.equal(techs[0].id, "gene-sequencing");
    assert.equal(techs.length, 2);
  });

  it("two-meter quests are 1 tile in 1 pathway", () => {
    const k = extractKnobs(loadGeneSeq());
    const plan = planPath(k, ARCHETYPES[0]);
    assert.equal(plan.tileCount, 1);
    assert.equal(plan.pathwayCount, 1);
    assert.deepEqual([...plan.pathways[0].reaches].sort(), ["local", "support"]);
  });

  it("local+global quests are two pathways (local now, global after a year)", () => {
    const port = extractKnobs(MISSIONS.find((m) => m.id === "portside-floods"));
    const plan = planTiles(port, ARCHETYPES[0]);
    assert.equal(plan.tileCount, 2);
    assert.equal(plan.pathwayCount, 2);
    assert.deepEqual(plan.pathways[0].reaches.filter((r) => r === "global"), []);
    assert.deepEqual(plan.pathways[1].reaches, ["global"]);
    assert.equal(plan.twoAct, true);
  });
});

describe("clockFacts", () => {
  it("counts safe end-turns before collapseYear", () => {
    const k = extractKnobs(loadGeneSeq());
    const c = clockFacts(k);
    assert.equal(c.yearTicksSafe, 5);
    assert.equal(c.waitsUntilRed, 2);
    assert.equal(c.startingRed, false);
    assert.ok(c.meters.length >= 1);
    assert.equal(typeof c.meters[0].waitsUntilCollapse, "number");
  });
});

describe("untreatedWaitTimeline", () => {
  it("climbs rise 1 from 2 to lose on Wait 3", () => {
    const k = extractKnobs(MISSIONS.find((m) => m.id === "portside-floods"));
    const floods = k.meters.find((m) => /flood/i.test(m.label) || m.role === "local");
    assert.ok(floods);
    assert.equal(floods.start, 3);
    assert.equal(floods.rise, 1);
    const tl = untreatedWaitTimeline(k);
    assert.equal(tl[0].waits, 0);
    assert.equal(tl[0].year, k.startYear);
    assert.equal(tl[0].collapsed, false);
    const lose = tl.find((p) => p.collapsed);
    assert.ok(lose);
    assert.equal(lose.reason, "meter");
    assert.equal(lose.pressure[floods.key], 5);
    assert.equal(lose.waits, 1);
    const blurb = untreatedClockBlurb(k, tl);
    assert.match(blurb, /hit 5/);
    assert.match(blurb, /Wait 1/);
  });

  it("keeps a 0-rise meter flat", () => {
    const k = extractKnobs(MISSIONS.find((m) => m.id === "portside-floods"));
    const flat = k.meters.find((m) => (m.rise || 0) === 0);
    if (!flat) return;
    const tl = untreatedWaitTimeline(k);
    const lose = tl.find((p) => p.collapsed) || tl.at(-1);
    assert.equal(lose.pressure[flat.key], flat.start);
  });

  it("can lose on fail year before meters hit 5", () => {
    const k = extractKnobs(loadGeneSeq());
    k.collapseYear = k.startYear + 2;
    k.yearsPerTurn = 2;
    for (const m of k.meters) m.rise = 0;
    const tl = untreatedWaitTimeline(k);
    const lose = tl.find((p) => p.collapsed);
    assert.ok(lose);
    assert.equal(lose.reason, "calendar");
    assert.equal(lose.year, k.collapseYear);
    assert.ok(maxPressureOf(lose.pressure) < 5);
  });
});

function maxPressureOf(pressure) {
  return Math.max(0, ...Object.values(pressure || {}).map((n) => Number(n) || 0));
}

describe("yearlyCrisisClock", () => {
  it("adds rise every calendar year (never +0.5)", () => {
    const k = extractKnobs(MISSIONS.find((m) => m.id === "portside-floods"));
    const floods = k.meters.find((m) => m.role === "local");
    const rows = yearlyCrisisClock(k);
    const at = (y) => rows.find((r) => r.year === y);
    assert.equal(at(2026).pressure[floods.key], 3);
    assert.equal(at(2027).pressure[floods.key], 4);
    assert.equal(at(2027).event, "tick");
    assert.equal(at(2028).pressure[floods.key], 5);
    assert.equal(at(2028).collapsed, true);
    for (const row of rows) {
      for (const v of Object.values(row.pressure)) {
        assert.equal(v, Math.round(v));
      }
    }
  });
});

describe("simulateArchetype", () => {
  it("solves gene-seq for solo-ai without Waiting", () => {
    const k = extractKnobs(loadGeneSeq());
    const r = simulateArchetype(k, ARCHETYPES.find((a) => a.id === "solo-ai"));
    assert.equal(r.blocked, null);
    assert.equal(r.survive, true);
    assert.equal(r.fullSolve, true);
    assert.equal(r.waits, 0);
    assert.equal(r.tileCount, 1);
    assert.equal(r.pathwayCount, 1);
    assert.equal(r.pathways[0].tiles[0].id, "gene-sequencing");
    assert.equal(r.aiAp, 2);
    assert.equal(r.aiBill.length, 7);
    assert.equal(r.year, 2026);
    assert.equal(r.turnsUsed, 1);
    assert.equal(r.aiBill.filter((row) => row.ap > 0).length, 2);
    assert.equal(r.aiBill.find((row) => row.mode === "chat").ap, 1);
    assert.equal(r.aiBill.find((row) => row.mode === "judge-challenge").ap, 1);
    assert.ok(r.aiBill.some((row) => row.mode === "idea-sparks"));
    assert.ok(r.aiBill.some((row) => row.step.startsWith("Coach")));
    assert.ok(r.timeline.length >= 2);
    assert.equal(r.tiles[0].id, "gene-sequencing");
  });

  it("solo-no-ai survives gene-seq (two meters, mature tech)", () => {
    const k = extractKnobs(loadGeneSeq());
    const r = simulateArchetype(k, ARCHETYPES.find((a) => a.id === "solo-no-ai"));
    assert.equal(r.survive, true);
    assert.equal(r.sparkAp, 0);
    assert.equal(r.aiAp, 0);
    assert.deepEqual(r.aiBill, []);
    assert.ok(r.apSpent >= 1);
    assert.equal(r.tileCount, 1);
    assert.equal(r.pathwayCount, 1);
  });

  it("Juniper Wells is two-act: local 2026, global after a year tick", () => {
    const pack = localScenariosForGlobal("climate", { count: 4, salt: 0 });
    const mission = pack.find(
      (m) => /Juniper/i.test(m.place || "") || /Juniper/i.test(m.title || "")
    );
    assert.ok(mission, "Night heat pins Juniper Wells should be in the climate pack");
    const k = extractKnobs(mission);
    const heat = k.meters.find((m) => m.role === "local");
    const flares = k.meters.find((m) => m.role === "global");
    assert.equal(heat.start, 3);
    assert.equal(flares.start, 2);
    const noAi = simulateArchetype(k, ARCHETYPES.find((a) => a.id === "solo-no-ai"));
    const ai = simulateArchetype(k, ARCHETYPES.find((a) => a.id === "solo-ai"));
    assert.equal(noAi.survive, true);
    assert.equal(ai.survive, true);
    assert.equal(noAi.pathwayCount, 2);
    assert.equal(noAi.endTurns, 1);
    assert.equal(noAi.year, 2027);
    assert.equal(ai.year, 2027);
    assert.equal(noAi.verdict, "challenging");
    assert.equal(ai.verdict, "challenging");
    const report = evaluateQuestEconomy(mission, { recommend: false });
    assert.equal(report.questVerdict, "challenging");
    assert.equal(report.aiYearGap, 0);
  });

  it("portside uses 2 tiles / 2 pathways (local then global)", () => {
    const k = extractKnobs(MISSIONS.find((m) => m.id === "portside-floods"));
    const r = simulateArchetype(k, ARCHETYPES.find((a) => a.id === "solo-no-ai"));
    assert.equal(r.tileCount, 2);
    assert.equal(r.pathwayCount, 2);
    assert.equal(r.pathways[0].tiles.length, 1);
    assert.equal(r.pathways[1].tiles.length, 1);
    assert.equal(r.endTurns, 1);
    assert.equal(r.year, 2027);
    assert.equal(r.survive, true);
    assert.equal(r.verdict, "challenging");
  });

  it("Friends Wait does not raise shared meters (path never waits)", () => {
    const k = extractKnobs(loadGeneSeq());
    const r = simulateArchetype(
      k,
      ARCHETYPES.find((a) => a.id === "friends-no-ai")
    );
    assert.equal(r.waits, 0);
    for (const m of k.meters) {
      assert.ok(
        (r.pressure[m.key] ?? 0) <= m.start,
        "Friends relief should not raise meters"
      );
    }
  });

  it("blocks when budget cannot pay an early-curve tech", () => {
    const k = extractKnobs(loadGeneSeq(), {
      resources: { apMax: 4, startingBudget: 0, startingWill: 4 },
    });
    // quantum is early/expensive if we force it
    k.suggested = ["quantum"];
    const r = simulateArchetype(k, ARCHETYPES.find((a) => a.id === "solo-no-ai"));
    assert.ok(r.blocked);
    assert.equal(r.blocked.resource, "budget");
    assert.ok(r.verdict === "too_hard" || r.verdict === "impossible");
  });
});

describe("heavyAiBill", () => {
  it("charges a season tax plus judge, not 1 AP per utterance", () => {
    const bill = heavyAiBill({ tileCount: 1, pathwayCount: 1 });
    assert.equal(bill.length, 7);
    assert.equal(bill.reduce((n, r) => n + r.ap, 0), 2);
    assert.equal(bill[0].ap, 1);
    assert.ok(bill.slice(1, -1).every((row) => row.ap === 0));
    assert.equal(bill.at(-1).mode, "judge-challenge");
    assert.equal(bill.at(-1).ap, 1);
  });

  it("skips chat AP on a learning-module tutor path", () => {
    const bill = heavyAiBill({
      tileCount: 1,
      pathwayCount: 1,
      isLearningModule: true,
    });
    const paid = bill.filter((r) => r.ap > 0);
    assert.ok(paid.some((r) => r.mode === "idea-sparks"));
    assert.ok(paid.every((r) => r.mode !== "chat" || r.ap === 0));
    assert.ok(paid.length < 7);
  });
});

describe("evaluateQuestEconomy", () => {
  it("returns four archetypes and a recommendation object", () => {
    const report = evaluateQuestEconomy(loadGeneSeq());
    assert.ok(report.archetypes["solo-no-ai"]);
    assert.ok(report.archetypes["solo-ai"]);
    assert.ok(report.archetypes["friends-no-ai"]);
    assert.ok(report.archetypes["friends-ai"]);
    assert.ok(report.recommendation);
    assert.equal(typeof report.questVerdict, "string");
    assert.equal(report.archetypes["solo-ai"].survive, true);
    assert.ok(Array.isArray(report.untreated));
    assert.ok(report.untreated.length >= 2);
    assert.equal(typeof report.untreatedBlurb, "string");
  });
});

describe("recommendQuestEconomy / applyEconomyPatchToTile", () => {
  it("eases an unaffordable start into schema bounds", () => {
    const v = loadGeneSeq();
    const broke = extractKnobs(v, {
      resources: { apMax: 2, startingBudget: 0, startingWill: 0 },
    });
    broke.suggested = ["quantum"];
    const rec = recommendQuestEconomy(broke);
    assert.equal(rec.needed, true);
    if (rec.patch.resources?.startingBudget != null) {
      assert.ok(rec.patch.resources.startingBudget >= 1);
      assert.ok(rec.patch.resources.startingBudget <= 10);
    }
    assert.ok(
      rec.afterVerdict.soloNoAi === "challenging" ||
        rec.afterVerdict.soloNoAi === "too_easy" ||
        rec.afterVerdict.soloAi === "challenging" ||
        rec.afterVerdict.soloAi === "too_easy" ||
        rec.steps.length > 0
    );
  });

  it("patches only allowlisted keys on the tile", () => {
    const tile = JSON.parse(
      readFileSync(join(ROOT, "quests/spotlight-gene-seq.json"), "utf8")
    );
    const title = tile.title;
    const next = applyEconomyPatchToTile(tile, {
      resources: { apMax: 3, startingBudget: 6 },
      pressure: { local: { pressure: 3, pressureRise: 1 } },
      collapseYear: 2034,
    });
    assert.equal(next.title, title);
    assert.equal(next.resources.apMax, 3);
    assert.equal(next.resources.startingBudget, 6);
    assert.equal(next.mission.pressure.local.pressure, 3);
    assert.equal(next.mission.collapseYear, 2034);
    assert.equal(tile.resources.apMax, 4);
    const v = validateQuestTile(next);
    assert.equal(v.ok, true, (v.details || []).join(", "));
  });

  it("yield bands stay inside clamp −2..+1", () => {
    for (const band of Object.values(YIELD_BANDS)) {
      for (const n of Object.values(band)) {
        assert.ok(n >= -2 && n <= 1);
      }
    }
  });
});

/**
 * Tests for hex cluster priors, timing map, affected given ids.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  seedCrisisTiles,
  mintInventionTile,
  mintRdTile,
  addTile,
  placeTile,
  liftTile,
  discardTile,
  createEmptyBoard,
  putConvergence,
  pruneStaleConvergences,
} from "./board-state.js";
import {
  timingLevelToPct,
  timingPctToLevel,
  pathwayTimingChance,
  boardWorstPathwayTiming,
  boardPathwayReevaluating,
  tileTimingPct,
  tileBaseTimingPct,
  clampTimingPct,
  rdFactorForPathway,
  heuristicConverges,
  pickEnhancedId,
  affectedGivenIds,
  assessLocalFitPrior,
  assessSupportScalePrior,
  assessGlobalSustainPrior,
  assessGivenPrior,
  assessConcernPrior,
  invalidatePathwaysTouchingGiven,
  ideaMature,
  tileTimingCacheKey,
  givenClusterFingerprint,
  dirtyGivenIds,
  stampLampEvalKeys,
  clusterFromGiven,
  clusterInventionsFromGiven,
  pathwayHighlight,
  applyPathwayPressure,
  heuristicPathwayScore,
  normalizePathwayScore,
  blendPathwayScore,
  pickPrimaryCrisisReason,
  pathwayContentFingerprint,
  crisisDeltaValues,
  crisisDeltaReasons,
  reasonsForCrisisTile,
  reasonsForConcernTile,
  pickScoreChipTiles,
  formatSignedDelta,
  pathwayScoreLabel,
  crisisMeterTooltipBits,
  listInventionPathways,
  islandHowKey,
  resolveIslandHow,
  islandHowForAi,
  setIslandHow,
  rekeyIslandHow,
  visionPathwaysFromBoard,
  visionGivensFromBoard,
  visionPeopleMood,
  pickConcernSpawn,
  clampConcernLamp,
  concernInventChanged,
  boardBondsLevel,
  hexPathwayPanel,
  bandToLamp,
  diffPathwayScoreJobs,
  pathwayHasTimingPending,
} from "./evaluate.js";
import { crisisMeterLevel } from "../sim/collapse.js";
import { buildNeighborEvalContext, applyHeuristicLights } from "./lights.js";
import { TILE_KIND } from "./board-state.js";

describe("timingLevelToPct", () => {
  it("maps ryg to bar bands", () => {
    assert.equal(timingLevelToPct("red"), 20);
    assert.equal(timingLevelToPct("yellow"), 50);
    assert.equal(timingLevelToPct("green"), 85);
    assert.ok(timingLevelToPct("red") < 35);
    assert.ok(timingLevelToPct("yellow") >= 35 && timingLevelToPct("yellow") < 70);
    assert.ok(timingLevelToPct("green") >= 70);
  });
});

describe("ideaMature", () => {
  it("treats red timing / low pct as immature", () => {
    assert.equal(
      ideaMature({ kind: "invention", year: 2026, feasibilityPct: 20 }, 2026),
      false
    );
    assert.equal(
      ideaMature({ kind: "invention", year: 2026, timingLevel: "red" }, 2026),
      false
    );
    assert.equal(
      ideaMature(
        { kind: "invention", year: 2026, feasibilityPct: 50, timingLevel: "yellow" },
        2026
      ),
      true
    );
  });
});

describe("pathway timing product", () => {
  function inv(id, opts = {}) {
    return mintInventionTile({
      id,
      techId: "ai",
      howText: `${id} how.`,
      year: 2026,
      feasibilityPct: opts.feasibilityPct ?? 50,
      timingLevel: opts.timingLevel ?? "yellow",
      ...opts,
    });
  }

  function placeOk(board, id, q, r) {
    const res = placeTile(board, id, q, r);
    assert.equal(res.ok, true, `place ${id} at ${q},${r}`);
    return res.board;
  }

  it("maps 25 below red and 72 as green", () => {
    assert.equal(timingPctToLevel(25), "red");
    assert.equal(timingPctToLevel(34), "red");
    assert.equal(timingPctToLevel(35), "yellow");
    assert.equal(timingPctToLevel(69), "yellow");
    assert.equal(timingPctToLevel(70), "green");
    assert.equal(timingPctToLevel(72), "green");
  });

  it("50 × 50 bonded = 25 red", () => {
    let board = createEmptyBoard();
    board = addTile(board, inv("a"));
    board = addTile(board, inv("b"));
    board = placeOk(board, "a", 0, 0);
    board = placeOk(board, "b", -1, 0);
    const ch = pathwayTimingChance(listInventionPathways(board)[0]);
    assert.equal(ch.pct, 25);
    assert.equal(ch.level, "red");
    assert.equal(ch.pending, false);
    const worst = boardWorstPathwayTiming(board);
    assert.equal(worst.pct, 25);
    assert.equal(worst.level, "red");
    assert.equal(worst.count, 2);
  });

  it("85 × 85 bonded ≈ 72 green", () => {
    const a = inv("a", { feasibilityPct: 85, timingLevel: "green" });
    const b = inv("b", { feasibilityPct: 85, timingLevel: "green" });
    const ch = pathwayTimingChance([a, b]);
    assert.equal(ch.pct, 72);
    assert.equal(ch.level, "green");
  });

  it("disconnected pair stays 50 yellow each (worst 50)", () => {
    let board = createEmptyBoard();
    board = addTile(board, inv("a"));
    board = addTile(board, inv("b"));
    board = placeOk(board, "a", 0, 0);
    board = placeOk(board, "b", 3, 0);
    const paths = listInventionPathways(board);
    assert.equal(paths.length, 2);
    const worst = boardWorstPathwayTiming(board);
    assert.equal(worst.pct, 50);
    assert.equal(worst.level, "yellow");
    assert.equal(worst.count, 1);
  });

  it("pending member does not yield a settled green", () => {
    const a = inv("a", { feasibilityPct: 85, timingLevel: "green" });
    a.timingPending = true;
    const b = inv("b", { feasibilityPct: 85, timingLevel: "green" });
    const ch = pathwayTimingChance([a, b]);
    assert.equal(ch.pct, 72);
    assert.equal(ch.pending, true);
    assert.ok(!(ch.level === "green" && !ch.pending));
  });

  it("tray-only is yellow; empty board is red", () => {
    let board = createEmptyBoard();
    assert.equal(boardWorstPathwayTiming(board).level, "red");
    board = addTile(board, inv("tray"));
    const t = boardWorstPathwayTiming(board);
    assert.equal(t.level, "yellow");
    assert.equal(t.pct, null);
    assert.equal(t.count, 0);
  });
});

describe("boardPathwayReevaluating", () => {
  function placeOk(board, id, q, r) {
    const res = placeTile(board, id, q, r);
    assert.equal(res.ok, true, `place ${id} at ${q},${r}`);
    return res.board;
  }

  it("false on empty board", () => {
    assert.equal(boardPathwayReevaluating(createEmptyBoard()), false);
    assert.equal(boardPathwayReevaluating(null), false);
  });

  it("true when a given has lampPending", () => {
    let board = seedCrisisTiles({
      crisisRoles: ["local"],
      pressure: { Floods: 1 },
    });
    board.tiles["crisis-local"].lampPending = true;
    assert.equal(boardPathwayReevaluating(board), true);
  });

  it("true when a placed invention is timingPending", () => {
    let board = createEmptyBoard();
    board = addTile(
      board,
      mintInventionTile({
        id: "a",
        techId: "ai",
        howText: "a how.",
        year: 2026,
        feasibilityPct: 50,
        timingLevel: "yellow",
      })
    );
    board = placeOk(board, "a", 0, 0);
    board.tiles.a.timingPending = true;
    assert.equal(boardPathwayReevaluating(board), true);
  });

  it("false when lamps and timing are settled", () => {
    let board = seedCrisisTiles({
      crisisRoles: ["local"],
      pressure: { Floods: 1 },
    });
    board = addTile(
      board,
      mintInventionTile({
        id: "a",
        techId: "ai",
        howText: "a how.",
        year: 2026,
        feasibilityPct: 50,
        timingLevel: "yellow",
        timingPending: false,
      })
    );
    board = placeOk(board, "a", 0, 0);
    assert.equal(board.tiles["crisis-local"].lampPending, false);
    assert.equal(boardPathwayReevaluating(board), false);
  });

  it("invention timingPending alone is enough; invention lampPending is ignored", () => {
    const inv = mintInventionTile({
      id: "x",
      techId: "ai",
      howText: "Pilot.",
      timingPending: false,
      timingLevel: "yellow",
      feasibilityPct: 50,
    });
    inv.lampPending = true;
    let board = createEmptyBoard();
    board = addTile(board, inv);
    board = placeOk(board, "x", 0, 0);
    assert.equal(boardPathwayReevaluating(board), false);
  });
});

describe("affectedGivenIds", () => {
  it("includes the crisis you left when moving away", () => {
    let board = seedCrisisTiles({
      crisisRoles: ["local", "support"],
      pressure: { Floods: 2, Trust: 2 },
    });
    const local = board.tiles["crisis-local"];
    const support = board.tiles["crisis-support"];
    board = addTile(
      board,
      mintInventionTile({
        id: "ai1",
        techId: "ai",
        howText: "Sensors alert crews along the corridor.",
        year: 2026,
      })
    );
    board = placeTile(board, "ai1", local.q - 1, local.r).board;
    const before = board;
    // Move next to support (away from local)
    const after = placeTile(before, "ai1", support.q + 1, support.r).board;
    const ids = affectedGivenIds(before, after, "ai1");
    assert.ok(ids.includes("crisis-local"), `expected local in ${ids}`);
    assert.ok(ids.includes("crisis-support"), `expected support in ${ids}`);
  });

  it("on lift includes previous neighbors", () => {
    let board = seedCrisisTiles({
      crisisRoles: ["local"],
      pressure: { Floods: 2 },
    });
    const local = board.tiles["crisis-local"];
    board = addTile(
      board,
      mintInventionTile({ id: "ai1", techId: "ai", howText: "Pilot filters.", year: 2026 })
    );
    board = placeTile(board, "ai1", local.q - 1, local.r).board;
    const before = board;
    const after = liftTile(before, "ai1").board;
    const ids = affectedGivenIds(before, after, "ai1");
    assert.deepEqual(ids, ["crisis-local"]);
  });
});

describe("cluster priors", () => {
  const airMission = {
    id: "smog",
    globalId: "air",
    suggested: ["iot", "solar", "battery"],
    scene:
      "Asthma days close schools along the truck corridor. The corridor still runs at rush hour.",
  };

  it("local fit: suggested tech + how → not red", () => {
    const cluster = {
      anyTouch: true,
      techIds: ["iot"],
      howText: "Sensors and alerts warn families before the corridor peak.",
      matureCount: 1,
      worstTiming: "green",
    };
    const r = assessLocalFitPrior(cluster, {
      suggested: airMission.suggested,
      meterLabel: "Floods",
    });
    assert.notEqual(r.level, "red");
  });

  it("local fit: no touch → red", () => {
    const r = assessLocalFitPrior({ anyTouch: false, techIds: [], howText: "" });
    assert.equal(r.level, "red");
  });

  it("support stays yellow without buy-in/scale substance", () => {
    const r = assessSupportScalePrior({
      anyTouch: true,
      techIds: ["ai"],
      howText: "A filter box sits in one classroom.",
      matureCount: 1,
      worstTiming: "green",
    });
    assert.ok(r.level === "yellow" || r.level === "red", r.level + " " + r.note);
    assert.notEqual(r.level, "green");
  });

  it("support green when buy-in and scale language present", () => {
    const r = assessSupportScalePrior({
      anyTouch: true,
      techIds: ["ai", "networks"],
      howText:
        "City council partners fund a district rollout with public support so the pilot can scale city-wide.",
      matureCount: 1,
      worstTiming: "green",
    });
    assert.equal(r.level, "green");
  });

  it("global wraps assessSustainable — filtration-only air not green", () => {
    const cluster = {
      anyTouch: true,
      techIds: ["materials", "iot"],
      howText:
        "We seal school windows and install HEPA filters and indoor air purifiers so kids do not inhale smoke.",
      matureCount: 1,
      worstTiming: "yellow",
    };
    const r = assessGlobalSustainPrior(cluster, {
      mission: airMission,
      global: { id: "air", title: "Air Pollution", kind: "now" },
    });
    assert.notEqual(r.level, "green", r.note);
  });
});

describe("assessGivenPrior + buildNeighborEvalContext", () => {
  it("attaches prior by role and omits neighbor names", () => {
    let board = seedCrisisTiles({
      crisisRoles: ["local", "global", "support"],
      pressure: { Here: 2, Root: 2, Trust: 2 },
      suggested: ["solar"],
    });
    const local = board.tiles["crisis-local"];
    board = addTile(
      board,
      mintInventionTile({
        id: "inv1",
        techId: "solar",
        name: "ShouldNotAppear",
        howText: "Shore power cuts idle diesel at the school gate during rush hour.",
        year: 2026,
        feasibilityPct: 85,
        timingLevel: "green",
      })
    );
    board = placeTile(board, "inv1", local.q - 1, local.r).board;
    const prior = assessGivenPrior(board, board.tiles["crisis-local"], {
      year: 2026,
      mission: { suggested: ["solar"], scene: "Corridor smoke." },
    });
    assert.equal(prior.role, "local");
    assert.ok(prior.cluster.anyTouch);

    const ctx = buildNeighborEvalContext(board, {
      year: 2026,
      mission: { suggested: ["solar"] },
      pressure: { Here: 2, Root: 2, Trust: 2 },
    });
    const g = ctx.givens.find((x) => x.id === "crisis-local");
    assert.ok(g.prior);
    assert.equal(g.neighbors[0].name, undefined);
    assert.equal(g.neighbors[0].techId, "solar");
    assert.ok(!JSON.stringify(g.neighbors).includes("ShouldNotAppear"));
  });
});

describe("tileTimingCacheKey", () => {
  it("keys on id year tech how — not name", () => {
    const a = tileTimingCacheKey(
      { id: "1", techId: "ai", howText: "x", name: "A" },
      2026
    );
    const b = tileTimingCacheKey(
      { id: "1", techId: "ai", howText: "x", name: "B" },
      2026
    );
    assert.equal(a, b);
  });
});

describe("givenClusterFingerprint + dirtyGivenIds", () => {
  it("stable when cluster unchanged; changes when neighbor or howText changes", () => {
    let board = seedCrisisTiles({
      crisisRoles: ["local", "support"],
      pressure: { Floods: 2, Trust: 2 },
    });
    const local = board.tiles["crisis-local"];
    board = addTile(
      board,
      mintInventionTile({
        id: "inv-a",
        techId: "ai",
        howText: "Sensors alert crews.",
        year: 2026,
        timingLevel: "green",
      })
    );
    board = placeTile(board, "inv-a", local.q - 1, local.r).board;
    const fp1 = givenClusterFingerprint(board, "crisis-local", 2026);
    const fp2 = givenClusterFingerprint(board, "crisis-local", 2026);
    assert.equal(fp1, fp2);

    board.tiles["inv-a"].howText = "Different mechanism.";
    const fp3 = givenClusterFingerprint(board, "crisis-local", 2026);
    assert.notEqual(fp1, fp3);
  });

  it("A→B then also A→C: only C is dirty when B already stamped", () => {
    let board = seedCrisisTiles({
      crisisRoles: ["local", "support"],
      pressure: { Floods: 2, Trust: 2 },
    });
    const local = board.tiles["crisis-local"];
    const support = board.tiles["crisis-support"];
    board = addTile(
      board,
      mintInventionTile({
        id: "inv-a",
        techId: "iot",
        howText: "Pilot sensors on the corridor.",
        year: 2026,
        timingLevel: "yellow",
      })
    );
    board = placeTile(board, "inv-a", local.q - 1, local.r).board;
    board = stampLampEvalKeys(board, ["crisis-local"], 2026);
    assert.deepEqual(dirtyGivenIds(board, ["crisis-local"], 2026), []);

    // New bond on support while local cluster unchanged
    board = addTile(
      board,
      mintInventionTile({
        id: "inv-c",
        techId: "ai",
        howText: "Public dashboard for buy-in.",
        year: 2026,
        timingLevel: "green",
      })
    );
    board = placeTile(board, "inv-c", support.q + 1, support.r).board;
    const dirty = dirtyGivenIds(
      board,
      ["crisis-local", "crisis-support"],
      2026
    );
    assert.deepEqual(dirty, ["crisis-support"]);
  });

  it("year change dirties stamped givens", () => {
    let board = seedCrisisTiles({
      crisisRoles: ["local"],
      pressure: { Floods: 2 },
    });
    board = stampLampEvalKeys(board, ["crisis-local"], 2026);
    assert.deepEqual(dirtyGivenIds(board, ["crisis-local"], 2026), []);
    assert.deepEqual(dirtyGivenIds(board, ["crisis-local"], 2028), [
      "crisis-local",
    ]);
  });
});

describe("heuristic with priors", () => {
  it("untouched local stays red", () => {
    let board = seedCrisisTiles({
      crisisRoles: ["local"],
      pressure: { Floods: 4 },
      winMax: { Floods: 2 },
    });
    board = applyHeuristicLights(board, {
      year: 2026,
      pressure: { Floods: 4 },
      winMax: { Floods: 2 },
      mission: { suggested: ["iot"] },
    });
    assert.equal(board.tiles["crisis-local"].lamp, "red");
  });
});

describe("invention tiles are not light-eval subjects", () => {
  it("invention timingPending does not imply lampPending snake subject", () => {
    const inv = mintInventionTile({
      id: "x",
      techId: "ai",
      howText: "Pilot.",
      timingPending: true,
      timingLevel: "yellow",
    });
    assert.equal(inv.kind, TILE_KIND.invention);
    assert.equal(inv.lampPending, undefined);
    // dirtyGivenIds never includes inventions
    let board = seedCrisisTiles({
      crisisRoles: ["local"],
      pressure: { Floods: 1 },
    });
    board = addTile(board, inv);
    const dirty = dirtyGivenIds(board, ["x", "crisis-local"], 2026);
    assert.ok(!dirty.includes("x"));
    assert.ok(dirty.includes("crisis-local"));
  });
});

describe("pathway clusters (BFS)", () => {
  function placeOk(board, id, q, r) {
    const res = placeTile(board, id, q, r);
    assert.equal(res.ok, true, `place ${id} at ${q},${r}: ${JSON.stringify(res.blockers)}`);
    return res.board;
  }

  it("2-hop chain: cluster and pathway.howText include the far invention", () => {
    let board = seedCrisisTiles({
      crisisRoles: ["local"],
      pressure: { Floods: 2 },
    });
    const local = board.tiles["crisis-local"];
    // local at (1,3): seed at (0,3), far at (-1,3)
    board = addTile(
      board,
      mintInventionTile({
        id: "near",
        techId: "ai",
        howText: "Near dock sensors.",
        year: 2026,
        timingLevel: "green",
      })
    );
    board = addTile(
      board,
      mintInventionTile({
        id: "far",
        techId: "networks",
        howText: "Far mesh relays the alert city-wide.",
        year: 2026,
        timingLevel: "yellow",
      })
    );
    board = placeOk(board, "near", local.q - 1, local.r);
    board = placeOk(board, "far", local.q - 2, local.r);

    const cluster = clusterFromGiven(board, board.tiles["crisis-local"], 2026);
    assert.equal(cluster.inventions.length, 2);
    assert.ok(cluster.inventions.some((t) => t.id === "far"));
    assert.ok(cluster.howText.includes("Far mesh"));
    assert.ok(cluster.directIds.has("near"));
    assert.ok(!cluster.directIds.has("far"));

    const ctx = buildNeighborEvalContext(board, {
      year: 2026,
      pressure: { Floods: 2 },
    });
    const g = ctx.givens[0];
    assert.ok(g.pathway.howText.includes("Far mesh"));
    assert.equal(g.neighbors.length, 2);
    const far = g.neighbors.find((n) => n.id === "far");
    const near = g.neighbors.find((n) => n.id === "near");
    assert.equal(far.direct, false);
    assert.equal(near.direct, true);
    assert.equal(far.name, undefined);
  });

  it("path does not go through a given", () => {
    let board = seedCrisisTiles({
      crisisRoles: ["local", "support"],
      pressure: { Floods: 2, Trust: 2 },
    });
    const local = board.tiles["crisis-local"];
    const support = board.tiles["crisis-support"];
    board = addTile(
      board,
      mintInventionTile({
        id: "only-local",
        techId: "ai",
        howText: "Local relief sensors.",
        year: 2026,
      })
    );
    board = addTile(
      board,
      mintInventionTile({
        id: "only-support",
        techId: "ai",
        howText: "Public buy-in dashboard.",
        year: 2026,
      })
    );
    board = placeOk(board, "only-local", local.q - 1, local.r);
    board = placeOk(board, "only-support", support.q + 1, support.r);

    const localCluster = clusterInventionsFromGiven(board, "crisis-local");
    const supportCluster = clusterInventionsFromGiven(board, "crisis-support");
    assert.deepEqual(
      localCluster.map((t) => t.id),
      ["only-local"]
    );
    assert.deepEqual(
      supportCluster.map((t) => t.id),
      ["only-support"]
    );
  });

  it("two inventions both adjacent to a given but not to each other", () => {
    let board = seedCrisisTiles({
      crisisRoles: ["local"],
      pressure: { Floods: 2 },
    });
    const local = board.tiles["crisis-local"];
    // (0,3) and (2,3) both neighbor (1,3), not each other
    board = addTile(
      board,
      mintInventionTile({ id: "west", techId: "ai", howText: "West dock.", year: 2026 })
    );
    board = addTile(
      board,
      mintInventionTile({ id: "east", techId: "ai", howText: "East dock.", year: 2026 })
    );
    board = placeOk(board, "west", local.q - 1, local.r);
    board = placeOk(board, "east", local.q + 1, local.r);
    const ids = clusterInventionsFromGiven(board, "crisis-local").map((t) => t.id);
    assert.deepEqual(ids, ["east", "west"]);
  });

  it("placing a bridge invention dirties givens on both former components", () => {
    let board = seedCrisisTiles({
      crisisRoles: ["local", "support"],
      pressure: { Floods: 2, Trust: 2 },
    });
    const local = board.tiles["crisis-local"];
    const support = board.tiles["crisis-support"];
    board = addTile(
      board,
      mintInventionTile({
        id: "inv-a",
        techId: "ai",
        howText: "A side.",
        year: 2026,
        timingLevel: "green",
      })
    );
    board = addTile(
      board,
      mintInventionTile({
        id: "inv-c",
        techId: "ai",
        howText: "C side.",
        year: 2026,
        timingLevel: "green",
      })
    );
    board = placeOk(board, "inv-a", local.q - 1, local.r); // (0,3)
    board = placeOk(board, "inv-c", support.q + 1, support.r); // (3,3)
    board = stampLampEvalKeys(board, ["crisis-local", "crisis-support"], 2026);
    assert.deepEqual(
      dirtyGivenIds(board, ["crisis-local", "crisis-support"], 2026),
      []
    );

    // Bridge around the crises: (0,3)-(1,2)-(2,2)-(3,2)-(3,3)
    board = addTile(
      board,
      mintInventionTile({
        id: "b1",
        techId: "ai",
        howText: "Bridge 1.",
        year: 2026,
        timingLevel: "yellow",
      })
    );
    board = addTile(
      board,
      mintInventionTile({
        id: "b2",
        techId: "ai",
        howText: "Bridge 2.",
        year: 2026,
        timingLevel: "yellow",
      })
    );
    board = addTile(
      board,
      mintInventionTile({
        id: "b3",
        techId: "ai",
        howText: "Bridge 3.",
        year: 2026,
        timingLevel: "yellow",
      })
    );
    const before = board;
    board = placeOk(board, "b1", 1, 2);
    board = placeOk(board, "b2", 2, 2);
    board = placeOk(board, "b3", 3, 2);

    // After full bridge, both givens' pathways include the far side
    const localIds = clusterInventionsFromGiven(board, "crisis-local").map(
      (t) => t.id
    );
    assert.ok(localIds.includes("inv-c"), `local should reach inv-c: ${localIds}`);
    const supportIds = clusterInventionsFromGiven(board, "crisis-support").map(
      (t) => t.id
    );
    assert.ok(supportIds.includes("inv-a"), `support should reach inv-a: ${supportIds}`);

    const dirty = dirtyGivenIds(
      board,
      ["crisis-local", "crisis-support"],
      2026
    );
    assert.ok(dirty.includes("crisis-local"), `dirty=${dirty}`);
    assert.ok(dirty.includes("crisis-support"), `dirty=${dirty}`);

    // affectedGivenIds on last bridge place should include both
    const affected = affectedGivenIds(before, board, "b3");
    assert.ok(
      affected.includes("crisis-local") || affected.includes("crisis-support"),
      `affected=${affected}`
    );
  });

  it("fingerprint changes when a 2-hop howText changes", () => {
    let board = seedCrisisTiles({
      crisisRoles: ["local"],
      pressure: { Floods: 2 },
    });
    const local = board.tiles["crisis-local"];
    board = addTile(
      board,
      mintInventionTile({
        id: "near",
        techId: "ai",
        howText: "Near.",
        year: 2026,
        timingLevel: "green",
      })
    );
    board = addTile(
      board,
      mintInventionTile({
        id: "far",
        techId: "ai",
        howText: "Far original.",
        year: 2026,
        timingLevel: "green",
      })
    );
    board = placeOk(board, "near", local.q - 1, local.r);
    board = placeOk(board, "far", local.q - 2, local.r);
    const fp1 = givenClusterFingerprint(board, "crisis-local", 2026);
    board.tiles["far"].howText = "Far revised mechanism.";
    const fp2 = givenClusterFingerprint(board, "crisis-local", 2026);
    assert.notEqual(fp1, fp2);
  });

  it("crisis packet has role/pressure; concern has angle/speech/question", () => {
    let board = seedCrisisTiles({
      crisisRoles: ["local"],
      pressure: { Floods: 3 },
    });
    const local = board.tiles["crisis-local"];
    board = addTile(
      board,
      mintInventionTile({
        id: "inv1",
        techId: "ai",
        name: "SecretName",
        howText: "Pilot.",
        year: 2026,
      })
    );
    board = placeOk(board, "inv1", local.q - 1, local.r);
    board = addTile(board, {
      id: "concern-moloch",
      kind: TILE_KIND.concern,
      q: local.q - 1,
      r: local.r + 1,
      polarity: "curve",
      name: "Moloch",
      angle: "moloch",
      lamp: "red",
      challengeSpeech: "Freeriders eat the pilot.",
      challengeQuestion: "Who defects when the meter is free?",
      playerAnswer: "A bonded escrow pays only after proof.",
      answerQuality: "hit",
    });
    // concern at (0,4) neighbors inv at (0,3)
    const ctx = buildNeighborEvalContext(board, {
      year: 2026,
      pressure: { Floods: 3 },
      winMax: { Floods: 2 },
      givenIds: ["crisis-local", "concern-moloch"],
    });
    const crisis = ctx.givens.find((g) => g.id === "crisis-local");
    const concern = ctx.givens.find((g) => g.id === "concern-moloch");
    assert.equal(crisis.role, "local");
    assert.equal(crisis.pressure, 3);
    assert.equal(crisis.challengeSpeech, null);
    assert.ok(crisis.pathway);
    assert.equal(concern.angle, "moloch");
    assert.equal(concern.challengeSpeech, "Freeriders eat the pilot.");
    assert.equal(
      concern.challengeQuestion,
      "Who defects when the meter is free?"
    );
    assert.equal(concern.playerAnswer, "A bonded escrow pays only after proof.");
    assert.equal(concern.answerQuality, "hit");
    assert.ok(concern.pathway);
    assert.ok(!JSON.stringify(ctx).includes("SecretName"));
  });

  it("pathwayHighlight for invention includes reached givens", () => {
    let board = seedCrisisTiles({
      crisisRoles: ["local"],
      pressure: { Floods: 2 },
    });
    const local = board.tiles["crisis-local"];
    board = addTile(
      board,
      mintInventionTile({ id: "near", techId: "ai", howText: "N", year: 2026 })
    );
    board = addTile(
      board,
      mintInventionTile({ id: "far", techId: "ai", howText: "F", year: 2026 })
    );
    board = placeOk(board, "near", local.q - 1, local.r);
    board = placeOk(board, "far", local.q - 2, local.r);
    const hl = pathwayHighlight(board, "far");
    assert.equal(hl.originId, "far");
    assert.ok(hl.inventionIds.includes("near"));
    assert.ok(hl.inventionIds.includes("far"));
    assert.deepEqual(hl.givenIds, ["crisis-local"]);
  });
});

describe("island inventHow", () => {
  function placeOk(board, id, q, r) {
    const res = placeTile(board, id, q, r);
    assert.equal(res.ok, true, JSON.stringify(res.blockers));
    return res.board;
  }

  function twoAiBoard() {
    let board = seedCrisisTiles({
      crisisRoles: ["local"],
      pressure: { Floods: 2 },
    });
    board = addTile(
      board,
      mintInventionTile({ id: "a", techId: "ai", howText: "Part A.", year: 2026 })
    );
    board = addTile(
      board,
      mintInventionTile({ id: "b", techId: "ai", howText: "Part B.", year: 2026 })
    );
    return board;
  }

  it("unset defaults to concat of member howTexts; stored essay is used instead", () => {
    let board = twoAiBoard();
    const local = board.tiles["crisis-local"];
    board = placeOk(board, "a", local.q - 1, local.r);
    board = placeOk(board, "b", local.q - 2, local.r);
    const invs = [board.tiles.a, board.tiles.b];
    const unset = resolveIslandHow(board, invs);
    assert.equal(unset.stored, false);
    assert.equal(unset.source, "concat");
    assert.equal(islandHowForAi(board, invs), "");
    assert.match(unset.text, /Part A/);
    assert.match(unset.text, /Part B/);
    assert.equal(unset.key, islandHowKey(invs));
    board = setIslandHow(board, invs, "The pair radios the crest together.", "user");
    const set = resolveIslandHow(board, invs);
    assert.equal(set.stored, true);
    assert.equal(set.text, "The pair radios the crest together.");
    assert.equal(islandHowForAi(board, invs), "The pair radios the crest together.");
    assert.equal(set.source, "user");
    assert.equal(board.tiles.a.howText, "Part A.");
    assert.equal(board.tiles.b.howText, "Part B.");
  });

  it("visionPathwaysFromBoard is one inventHow per island, no invention name", () => {
    const lookup = (id) =>
      id === "ai"
        ? { id: "ai", name: "AI", summary: "Models" }
        : id === "iot"
          ? { id: "iot", name: "IoT", summary: "Sensors" }
          : null;
    let board = twoAiBoard();
    board = addTile(
      board,
      mintInventionTile({ id: "c", techId: "iot", howText: "Part C.", year: 2026 })
    );
    const local = board.tiles["crisis-local"];
    board = placeOk(board, "a", local.q - 1, local.r);
    board = placeOk(board, "b", local.q - 2, local.r);
    board = placeOk(board, "c", local.q + 1, local.r);
    board = setIslandHow(
      board,
      [board.tiles.a, board.tiles.b],
      "The pair radios the crest.",
      "user"
    );
    const paths = visionPathwaysFromBoard(board, lookup);
    assert.equal(paths.length, 2);
    const pair = paths.find((p) => p.techs.some((t) => t.id === "ai"));
    const iot = paths.find((p) => p.techs.some((t) => t.id === "iot"));
    assert.equal(pair.howText, "The pair radios the crest.");
    assert.equal(iot.howText, "");
    assert.equal(
      paths.every((p) => p.inventionName == null && p.name == null),
      true
    );
  });

  it("visionPathwaysFromBoard marks isolated islands as idea and docked as applied", () => {
    const lookup = (id) => ({ id, name: id });
    let board = twoAiBoard();
    const local = board.tiles["crisis-local"];
    board = placeOk(board, "a", local.q - 1, local.r);
    board = placeOk(board, "b", -3, -3);
    board = setIslandHow(board, [board.tiles.a], "Docked sensors.", "user");
    board = setIslandHow(board, [board.tiles.b], "Only a thought.", "user");
    const paths = visionPathwaysFromBoard(board, lookup);
    const docked = paths.find((p) => p.howText === "Docked sensors.");
    const idea = paths.find((p) => p.howText === "Only a thought.");
    assert.equal(docked.status, "applied");
    assert.equal(docked.touching.some((g) => g.kind === "crisis"), true);
    assert.equal(idea.status, "idea");
    assert.equal(idea.touching.length, 0);
    const givens = visionGivensFromBoard(board, paths);
    const localGiven = givens.find((g) => g.id === "crisis-local");
    assert.equal(localGiven.applied, true);
    assert.equal(givens.every((g) => g.kind === "crisis" || g.kind === "concern"), true);
  });

  it("visionPeopleMood follows the local crisis lamp, else ordinary faces", () => {
    let board = seedCrisisTiles({
      crisisRoles: ["global", "support"],
      pressure: { Roots: 2, Trust: 2 },
    });
    assert.equal(visionPeopleMood(board), "neutral");
    board = seedCrisisTiles({
      crisisRoles: ["local"],
      pressure: { Floods: 3 },
    });
    board.tiles["crisis-local"].lamp = "red";
    assert.equal(visionPeopleMood(board), "sad");
    board.tiles["crisis-local"].lamp = "green";
    assert.equal(visionPeopleMood(board), "happy");
    board.tiles["crisis-local"].lamp = "yellow";
    assert.equal(visionPeopleMood(board), "concerned");
    const givens = visionGivensFromBoard(board);
    assert.equal(givens.find((g) => g.role === "local").lamp, "yellow");
  });

  it("saving island inventHow changes the pathway fingerprint so scores re-run", () => {
    let board = twoAiBoard();
    const local = board.tiles["crisis-local"];
    board = placeOk(board, "a", local.q - 1, local.r);
    board = placeOk(board, "b", local.q - 2, local.r);
    const invs = [board.tiles.a, board.tiles.b];
    const fpBefore = pathwayContentFingerprint(invs, board);
    board.pathwayImpacts = {
      [fpBefore]: {
        inventionIds: ["a", "b"],
        crisisDelta: { local: -1, global: 0, support: 0 },
        concerns: {},
        pending: false,
      },
    };
    let applied = applyPathwayPressure(board, { winMax: { Floods: 2 } });
    assert.equal(applied.pathways[0].needsScore, false);

    board = setIslandHow(applied.board, invs, "The pair radios the crest together.", "user");
    const fpAfter = pathwayContentFingerprint(invs, board);
    assert.notEqual(fpAfter, fpBefore);
    applied = applyPathwayPressure(board, { winMax: { Floods: 2 } });
    assert.equal(applied.pathways[0].fingerprint, fpAfter);
    assert.equal(applied.pathways[0].needsScore, true);
    assert.equal(applied.board.pathwayImpacts[fpAfter].pending, true);
    assert.equal(applied.board.pathwayImpacts[fpBefore], undefined);
  });

  it("caches the exact tile set across split and re-dock; fragments fall back to their parts", () => {
    let board = twoAiBoard();
    const local = board.tiles["crisis-local"];
    board = placeOk(board, "a", local.q - 1, local.r);
    board = placeOk(board, "b", local.q - 2, local.r);
    board = setIslandHow(board, [board.tiles.a, board.tiles.b], "Together.", "user");
    const pairKey = islandHowKey([board.tiles.a, board.tiles.b]);

    board = liftTile(board, "b").board;
    board = placeOk(board, "b", local.q + 2, local.r);
    board = rekeyIslandHow(board);
    const aSplit = resolveIslandHow(board, [board.tiles.a]);
    const bSplit = resolveIslandHow(board, [board.tiles.b]);
    assert.equal(aSplit.stored, false);
    assert.equal(aSplit.text, "Part A.");
    assert.equal(bSplit.stored, false);
    assert.equal(bSplit.text, "Part B.");
    assert.equal(board.islandHow[pairKey]?.text, "Together.");

    board = liftTile(board, "a").board;
    board = placeOk(board, "a", local.q - 3, local.r);
    board = rekeyIslandHow(board);
    assert.equal(resolveIslandHow(board, [board.tiles.a]).text, "Part A.");
    assert.equal(board.islandHow[pairKey]?.text, "Together.");

    board = liftTile(board, "b").board;
    board = placeOk(board, "b", local.q - 4, local.r);
    board = rekeyIslandHow(board);
    const restored = resolveIslandHow(board, [board.tiles.a, board.tiles.b]);
    assert.equal(restored.text, "Together.");
    assert.equal(board.tiles.a.howText, "Part A.");
    assert.equal(board.tiles.b.howText, "Part B.");
  });

  it("docking a second tile drops the solo essay; combined defaults to concat of parts", () => {
    let board = twoAiBoard();
    const local = board.tiles["crisis-local"];
    board = placeOk(board, "a", local.q - 1, local.r);
    board = setIslandHow(board, [board.tiles.a], "Solo A.", "user");
    board = placeOk(board, "b", local.q - 2, local.r);
    board = rekeyIslandHow(board);
    assert.equal(board.islandHow[islandHowKey([board.tiles.a])], undefined);
    const merged = resolveIslandHow(board, [board.tiles.a, board.tiles.b]);
    assert.equal(merged.stored, false);
    assert.match(merged.text, /Part A/);
    assert.match(merged.text, /Part B/);
    assert.equal(merged.text.includes("Solo A."), false);

    board = liftTile(board, "b").board;
    board = placeOk(board, "b", local.q + 2, local.r);
    board = rekeyIslandHow(board);
    assert.equal(resolveIslandHow(board, [board.tiles.a]).text, "Part A.");
    assert.equal(resolveIslandHow(board, [board.tiles.b]).text, "Part B.");
  });

  it("writing a pair essay drops member keys; first-time merge defaults to parts not stored fragments", () => {
    let board = twoAiBoard();
    const local = board.tiles["crisis-local"];
    board = placeOk(board, "a", local.q - 1, local.r);
    board = placeOk(board, "b", local.q + 2, local.r);
    board = setIslandHow(board, [board.tiles.a], "Island A.", "user");
    board = setIslandHow(board, [board.tiles.b], "Island B.", "user");
    board = liftTile(board, "b").board;
    board = placeOk(board, "b", local.q - 2, local.r);
    board = rekeyIslandHow(board);
    const merged = resolveIslandHow(board, [board.tiles.a, board.tiles.b]);
    assert.equal(merged.stored, false);
    assert.match(merged.text, /Part A/);
    assert.match(merged.text, /Part B/);
    assert.equal(merged.text.includes("Island A."), false);
    assert.equal(merged.text.includes("Island B."), false);
    assert.equal(board.islandHow[islandHowKey([board.tiles.a])], undefined);
    assert.equal(board.islandHow[islandHowKey([board.tiles.b])], undefined);

    const pairKey = islandHowKey([board.tiles.a, board.tiles.b]);
    board.islandHow = {
      ...board.islandHow,
      [islandHowKey([board.tiles.a])]: { text: "Solo leftover.", source: "user" },
    };
    board = setIslandHow(board, [board.tiles.a, board.tiles.b], "Together.", "user");
    assert.equal(board.islandHow[islandHowKey([board.tiles.a])], undefined);
    assert.equal(board.islandHow[pairKey]?.text, "Together.");

    const tossed = discardTile(board, "b");
    assert.equal(tossed.ok, true);
    board = rekeyIslandHow(tossed.board);
    assert.equal(board.islandHow[pairKey], undefined);
    assert.equal(board.islandHow[islandHowKey([{ id: "b" }])], undefined);
    assert.equal(resolveIslandHow(board, [board.tiles.a]).text, "Part A.");
  });
});

describe("pickConcernSpawn", () => {
  function placeOk(board, id, q, r) {
    const res = placeTile(board, id, q, r);
    assert.equal(res.ok, true, JSON.stringify(res.blockers));
    return res.board;
  }

  it("one island picks a vacant neighbor of that island", () => {
    let board = seedCrisisTiles({
      crisisRoles: ["local"],
      pressure: { Floods: 2 },
    });
    board = addTile(
      board,
      mintInventionTile({ id: "a", techId: "ai", howText: "A", year: 2026 })
    );
    board = placeOk(board, "a", 0, 0);
    const spawn = pickConcernSpawn(board);
    const neighbors = [
      [1, 0],
      [1, -1],
      [0, -1],
      [-1, 0],
      [-1, 1],
      [0, 1],
    ];
    assert.ok(
      neighbors.some(([q, r]) => spawn.q === q && spawn.r === r),
      `spawn ${spawn.q},${spawn.r} should neighbor 0,0`
    );
    assert.deepEqual(spawn.inventionIds, ["a"]);
    assert.ok(spawn.fingerprints[0].includes("a:"));
  });

  it("two islands pick a hex that sees both when one exists", () => {
    let board = seedCrisisTiles({
      crisisRoles: ["local"],
      pressure: { Floods: 2 },
    });
    board = addTile(
      board,
      mintInventionTile({ id: "a", techId: "ai", howText: "A", year: 2026 })
    );
    board = addTile(
      board,
      mintInventionTile({ id: "b", techId: "drones", howText: "B", year: 2026 })
    );
    board = placeOk(board, "a", 0, 0);
    board = placeOk(board, "b", 2, 0);
    const spawn = pickConcernSpawn(board);
    assert.equal(spawn.q, 1);
    assert.equal(spawn.r, 0);
    assert.ok(spawn.inventionIds.includes("a"));
    assert.ok(spawn.inventionIds.includes("b"));
    assert.equal(spawn.fingerprints.length, 2);
  });

  it("no inventions: isolated empty cell", () => {
    const board = seedCrisisTiles({
      crisisRoles: ["local"],
      pressure: { Floods: 2 },
    });
    const spawn = pickConcernSpawn(board);
    assert.equal(spawn.inventionIds.length, 0);
    assert.equal(board.tiles["crisis-local"].q === spawn.q && board.tiles["crisis-local"].r === spawn.r, false);
  });
});

describe("clampConcernLamp", () => {
  it("refuses an upgrade without allowImprove; always allows worsen", () => {
    assert.equal(clampConcernLamp("red", "yellow", false), "red");
    assert.equal(clampConcernLamp("red", "yellow", true), "yellow");
    assert.equal(clampConcernLamp("green", "red", false), "red");
  });

  it("concernInventChanged is true when current island is not a posed snapshot", () => {
    const invs = [{ id: "a", techId: "ai", howText: "New.", timingLevel: "green" }];
    assert.equal(
      concernInventChanged({ posedFingerprints: ["other"] }, invs),
      true
    );
    const fp = pathwayContentFingerprint(invs);
    assert.equal(
      concernInventChanged({ posedFingerprints: [fp] }, invs),
      false
    );
  });
});

describe("applyPathwayPressure (cached scores)", () => {
  function placeOk(board, id, q, r) {
    const res = placeTile(board, id, q, r);
    assert.equal(res.ok, true, `place ${id} at ${q},${r}: ${JSON.stringify(res.blockers)}`);
    return res.board;
  }

  it("empty board: no pathways to score; lamp matches HUD band; pressure = base", () => {
    let board = seedCrisisTiles({
      crisisRoles: ["local", "support"],
      pressure: { Floods: 1, Trust: 4 },
    });
    const winMax = { Floods: 2, Trust: 2 };
    const applied = applyPathwayPressure(board, { winMax });
    assert.equal(applied.pathways.length, 0);
    assert.equal(applied.pathways.filter((p) => p.needsScore).length, 0);
    assert.deepEqual(applied.displayPressure, { Floods: 1, Trust: 4 });
    assert.equal(
      applied.board.tiles["crisis-local"].lamp,
      bandToLamp(crisisMeterLevel(1, 2))
    );
    assert.equal(
      applied.board.tiles["crisis-support"].lamp,
      bandToLamp(crisisMeterLevel(4, 2))
    );
    assert.equal(applied.board.tiles["crisis-local"].lamp, "green"); // cool
    assert.equal(applied.board.tiles["crisis-support"].lamp, "red"); // hot
    assert.equal(applied.board.tiles["crisis-local"].lampPending, false);
  });

  it("moving empty crisis does not create pathway score work", () => {
    let board = seedCrisisTiles({
      crisisRoles: ["local"],
      pressure: { Floods: 2 },
    });
    board = applyPathwayPressure(board, { winMax: { Floods: 2 } }).board;
    const before = board.tiles["crisis-local"];
    // Relocate crisis hex (geometry only)
    board = {
      ...board,
      tiles: {
        ...board.tiles,
        "crisis-local": { ...before, q: before.q + 2, r: before.r },
      },
    };
    const applied = applyPathwayPressure(board, { winMax: { Floods: 2 } });
    assert.equal(applied.pathways.length, 0);
    assert.deepEqual(applied.displayPressure, { Floods: 2 });
    assert.equal(
      applied.board.tiles["crisis-local"].lamp,
      bandToLamp(crisisMeterLevel(2, 2))
    );
  });

  it("dock onto second crisis uses cached delta without needsScore", () => {
    let board = seedCrisisTiles({
      crisisRoles: ["local", "support"],
      pressure: { Floods: 3, Trust: 3 },
    });
    const local = board.tiles["crisis-local"];
    const support = board.tiles["crisis-support"];
    board = addTile(
      board,
      mintInventionTile({
        id: "ai1",
        techId: "ai",
        howText: "Corridor sensors alert crews before flood crest.",
        year: 2026,
        timingLevel: "yellow",
      })
    );
    board = placeOk(board, "ai1", local.q - 1, local.r);
    const fp = pathwayContentFingerprint([board.tiles.ai1]);
    board.pathwayImpacts[fp] = {
      inventionIds: ["ai1"],
      crisisDelta: { local: -1, global: 0, support: -1 },
      concerns: {},
      pending: false,
    };
    let applied = applyPathwayPressure(board, {
      winMax: { Floods: 2, Trust: 2 },
    });
    assert.equal(applied.pathways.length, 1);
    assert.equal(applied.pathways[0].needsScore, false);
    assert.equal(applied.displayPressure.Floods, 2); // 3 + (-1)
    assert.equal(applied.displayPressure.Trust, 3); // not reached

    // Move dock to support — same fingerprint, cache applies to support
    board = placeOk(applied.board, "ai1", support.q + 1, support.r);
    applied = applyPathwayPressure(board, {
      winMax: { Floods: 2, Trust: 2 },
    });
    assert.equal(applied.pathways.length, 1);
    assert.equal(applied.pathways[0].needsScore, false);
    assert.equal(applied.displayPressure.Floods, 3); // no longer reached
    assert.equal(applied.displayPressure.Trust, 2); // 3 + (-1)
  });

  it("splitting a chain creates a new fingerprint that needs score", () => {
    let board = seedCrisisTiles({
      crisisRoles: ["local"],
      pressure: { Floods: 3 },
    });
    const local = board.tiles["crisis-local"];
    board = addTile(
      board,
      mintInventionTile({
        id: "a",
        techId: "ai",
        howText: "Near hop.",
        year: 2026,
        timingLevel: "yellow",
      })
    );
    board = addTile(
      board,
      mintInventionTile({
        id: "b",
        techId: "ai",
        howText: "Far hop.",
        year: 2026,
        timingLevel: "yellow",
      })
    );
    board = placeOk(board, "a", local.q - 1, local.r);
    board = placeOk(board, "b", local.q - 2, local.r);
    const chain = listInventionPathways(board)[0];
    const chainFp = pathwayContentFingerprint(chain);
    board.pathwayImpacts[chainFp] = {
      inventionIds: ["a", "b"],
      crisisDelta: { local: -1, global: 0, support: 0 },
      concerns: {},
      pending: false,
    };
    let applied = applyPathwayPressure(board, { winMax: { Floods: 2 } });
    assert.equal(applied.pathways.length, 1);
    assert.equal(applied.pathways[0].needsScore, false);

    // Lift far tile → split: near stays docked; far in tray (not a pathway)
    board = liftTile(applied.board, "b").board;
    applied = applyPathwayPressure(board, { winMax: { Floods: 2 } });
    assert.equal(applied.pathways.length, 1);
    const soloFp = pathwayContentFingerprint([applied.board.tiles.a]);
    assert.notEqual(soloFp, chainFp);
    assert.equal(applied.pathways[0].fingerprint, soloFp);
    assert.equal(applied.pathways[0].needsScore, true);
    assert.equal(applied.board.pathwayImpacts[soloFp].pending, true);
    assert.equal(applied.board.pathwayImpacts[chainFp], undefined);
  });

  it("isolated invention needs score but does not spin crisis lamps", () => {
    let board = seedCrisisTiles({
      crisisRoles: ["local"],
      pressure: { Floods: 3 },
    });
    board = addTile(
      board,
      mintInventionTile({
        id: "island",
        techId: "ai",
        howText: "A far-field sensor still off the crisis cluster.",
        year: 2026,
        timingLevel: "yellow",
      })
    );
    board = placeOk(board, "island", -3, -3);
    const applied = applyPathwayPressure(board, { winMax: { Floods: 2 } });
    assert.equal(applied.pathways.length, 1);
    assert.equal(applied.pathways[0].needsScore, true);
    assert.deepEqual(applied.pendingGivenIds, []);
    assert.equal(applied.board.tiles["crisis-local"].lampPending, false);
    assert.equal(applied.displayPressure.Floods, 3);
  });

  it("normalizePathwayScore clamps deltas", () => {
    const n = normalizePathwayScore({
      crisisDelta: { local: -9, global: 3, support: 0.4 },
      concerns: { moloch: { level: "yellow", reason: "ok" } },
    });
    assert.equal(n.crisisDelta.local, -2);
    assert.equal(n.crisisDelta.global, 1);
    assert.equal(n.crisisDelta.support, 0);
    assert.equal(n.concerns.moloch.level, "yellow");
  });

  it("normalizePathwayScore accepts nested {delta, reason} and legacy numbers", () => {
    const nested = normalizePathwayScore({
      crisisDelta: {
        local: { delta: -1, reason: "The noon cooler keeps class in the rooms." },
        global: { delta: 0, reason: "Nothing names the substation contract." },
        support: { delta: 1, reason: "Kids still go home to dead coolers." },
      },
    });
    assert.equal(nested.crisisDelta.local, -1);
    assert.match(nested.crisisReasons.local, /noon cooler/);
    assert.equal(nested.crisisReasons.global.startsWith("Nothing names"), true);

    const sibling = normalizePathwayScore({
      crisisDelta: { local: -1, global: 0, support: 0 },
      crisisReasons: { local: "Sibling why." },
    });
    assert.equal(sibling.crisisDelta.local, -1);
    assert.equal(sibling.crisisReasons.local, "Sibling why.");

    const clipped = normalizePathwayScore({
      crisisDelta: {
        local: { delta: 0, reason: "x".repeat(400) },
      },
    });
    assert.equal(clipped.crisisReasons.local.length, 160);
  });

  it("heuristicPathwayScore gives mild relief for mature how-text", () => {
    const inventions = [
      {
        kind: "invention",
        year: 2026,
        howText: "A clear forty-character mechanism for local flood sensors.",
        timingLevel: "green",
        feasibilityPct: 85,
      },
    ];
    const unanswered = heuristicPathwayScore(inventions, 2026, {
      concernAngles: ["moloch"],
    });
    assert.equal(unanswered.crisisDelta.local, -1);
    assert.equal(unanswered.concerns.moloch.level, "red");
    assert.ok(unanswered.crisisReasons.local);
    assert.notEqual(unanswered.crisisReasons.local.toLowerCase(), "heuristic");
    assert.match(unanswered.concerns.moloch.reason, /unanswered/i);

    const answered = heuristicPathwayScore(inventions, 2026, {
      concernAngles: ["moloch"],
      concernAnswers: { moloch: "A bonded escrow pays only after proof." },
    });
    assert.equal(answered.concerns.moloch.level, "yellow");
  });

  it("heuristicPathwayScore can worsen support for a hostile stack", () => {
    const score = heuristicPathwayScore(
      [
        {
          kind: "invention",
          year: 2026,
          howText:
            "A neighborhood nuclear reactor runs the flood pumps at the quay.",
          timingLevel: "green",
          feasibilityPct: 85,
        },
      ],
      2026
    );
    assert.equal(score.crisisDelta.local, -1);
    assert.equal(score.crisisDelta.support, 1);
    assert.match(score.crisisReasons.support, /next door|honest this year/i);
  });

  it("reasonsForCrisisTile lists every reaching island", () => {
    let board = seedCrisisTiles({
      crisisRoles: ["local"],
      pressure: { Floods: 3 },
    });
    board = addTile(
      board,
      mintInventionTile({
        id: "ai1",
        techId: "ai",
        howText: "Cooler.",
        year: 2026,
        timingLevel: "green",
      })
    );
    board = addTile(
      board,
      mintInventionTile({
        id: "dr1",
        techId: "drones",
        howText: "Scout.",
        year: 2026,
        timingLevel: "green",
      })
    );
    const local = board.tiles["crisis-local"];
    board = placeOk(board, "ai1", local.q - 1, local.r);
    const res = placeTile(board, "dr1", local.q + 1, local.r);
    assert.equal(res.ok, true, JSON.stringify(res.blockers));
    board = res.board;
    const fpA = pathwayContentFingerprint([board.tiles.ai1]);
    const fpB = pathwayContentFingerprint([board.tiles.dr1]);
    board.pathwayImpacts[fpA] = {
      inventionIds: ["ai1"],
      crisisDelta: { local: -1, global: 0, support: 0 },
      crisisReasons: { local: "The noon cooler keeps class in the rooms.", global: "", support: "" },
      concerns: {},
      pending: false,
    };
    board.pathwayImpacts[fpB] = {
      inventionIds: ["dr1"],
      crisisDelta: { local: 0, global: 0, support: 0 },
      crisisReasons: { local: "This island never names the heat.", global: "", support: "" },
      concerns: {},
      pending: false,
    };
    const applied = applyPathwayPressure(board, { winMax: { Floods: 2 } });
    const rows = reasonsForCrisisTile(applied.board, applied.board.tiles["crisis-local"]);
    assert.equal(rows.length, 2);
    assert.equal(rows.some((r) => r.delta === -1 && /cooler/i.test(r.reason)), true);
    assert.equal(rows.some((r) => r.delta === 0 && /never names/i.test(r.reason)), true);
    assert.match(applied.board.tiles["crisis-local"].lampReason, /cooler/i);
    assert.equal(/never names/i.test(applied.board.tiles["crisis-local"].lampReason), false);
    assert.equal(applied.board.tiles["crisis-local"].lampReason.includes("3/5"), false);
    const tip = crisisMeterTooltipBits(applied.board, "Floods");
    assert.match(tip, /2 pathways/);
    assert.match(tip, /cooler/i);
  });

  it("blendPathwayScore does not attach heuristic copy to a mismatched AI delta", () => {
    const local = heuristicPathwayScore(
      [
        {
          kind: "invention",
          year: 2026,
          howText: "A clear forty-character mechanism for local flood sensors.",
          timingLevel: "green",
          feasibilityPct: 85,
        },
      ],
      2026
    );
    assert.equal(local.crisisDelta.local, -1);
    const blended = blendPathwayScore(
      {
        crisisDelta: { local: 1, global: 0, support: 0 },
        crisisReasons: { local: "", global: "", support: "" },
        concerns: {},
      },
      local
    );
    assert.equal(blended.crisisDelta.local, 1);
    assert.equal(blended.crisisReasons.local, "");
    assert.ok(blended.crisisReasons.global);
  });

  it("blendPathwayScore fills a role only when AI and heuristic deltas match", () => {
    const local = heuristicPathwayScore(
      [
        {
          kind: "invention",
          year: 2026,
          howText: "A clear forty-character mechanism for local flood sensors.",
          timingLevel: "green",
          feasibilityPct: 85,
        },
      ],
      2026
    );
    const blended = blendPathwayScore(
      {
        crisisDelta: { local: -1, global: 0, support: 0 },
        crisisReasons: { local: "", global: "", support: "" },
        concerns: {},
      },
      local
    );
    assert.equal(blended.crisisDelta.local, -1);
    assert.equal(blended.crisisReasons.local, local.crisisReasons.local);
  });

  it("pickPrimaryCrisisReason prefers max |delta|", () => {
    const pick = pickPrimaryCrisisReason([
      { delta: 0, reason: "Never names the heat.", pending: false },
      { delta: -2, reason: "The noon cooler keeps class in the rooms.", pending: false },
    ]);
    assert.match(pick.reason, /cooler/);
    assert.equal(pick.primary.delta, -2);
  });

  it("pickScoreChipTiles prefers large crisis moves then concerns", () => {
    const picked = pickScoreChipTiles(
      [
        { kind: "concern", tileId: "c1", level: "yellow" },
        { kind: "crisis", tileId: "a", absDelta: 0 },
        { kind: "crisis", tileId: "b", absDelta: 2 },
        { kind: "concern", tileId: "c2", level: "red" },
      ],
      3
    );
    assert.deepEqual(
      picked.map((x) => x.tileId),
      ["b", "a", "c2"]
    );
  });

  it("pathwayScoreLabel and formatSignedDelta", () => {
    assert.equal(pathwayScoreLabel([{ techId: "ai" }, { techId: "iot" }]), "ai · iot");
    assert.equal(formatSignedDelta(-1), "-1");
    assert.equal(formatSignedDelta(1), "+1");
    assert.deepEqual(crisisDeltaValues({ local: { delta: -2 } }).local, -2);
    assert.equal(crisisDeltaReasons({ local: { reason: "Hi." } }).local, "Hi.");
  });
});

describe("ambient crisis lamps + Bonds coverage", () => {
  function placeOk(board, id, q, r) {
    const res = placeTile(board, id, q, r);
    assert.equal(res.ok, true, JSON.stringify(res.blockers));
    return res.board;
  }

  it("undocking an easing island restores ambient pressure color", () => {
    let board = seedCrisisTiles({
      crisisRoles: ["local"],
      pressure: { Floods: 3 },
    });
    const winMax = { Floods: 2 };
    board = addTile(
      board,
      mintInventionTile({
        id: "ai1",
        techId: "ai",
        howText: "Sensors.",
        year: 2026,
        timingLevel: "green",
      })
    );
    const local = board.tiles["crisis-local"];
    board = placeOk(board, "ai1", local.q - 1, local.r);
    const fp = pathwayContentFingerprint([board.tiles.ai1]);
    board.pathwayImpacts[fp] = {
      inventionIds: ["ai1"],
      crisisDelta: { local: -1, global: 0, support: 0 },
      concerns: {},
      pending: false,
      concernKey: "",
    };
    let applied = applyPathwayPressure(board, { winMax });
    assert.equal(applied.displayPressure.Floods, 2);
    assert.equal(applied.board.tiles["crisis-local"].lamp, "green");

    applied = applyPathwayPressure(liftTile(applied.board, "ai1").board, {
      winMax,
    });
    assert.equal(applied.displayPressure.Floods, 3);
    assert.equal(
      applied.board.tiles["crisis-local"].lamp,
      bandToLamp(crisisMeterLevel(3, 2))
    );
  });

  it("Wait-risen ambient shows on an untouched crisis hex", () => {
    let board = seedCrisisTiles({
      crisisRoles: ["local", "support"],
      pressure: { Floods: 2, Trust: 1 },
    });
    board.pressureBase = { Floods: 4, Trust: 1 };
    const applied = applyPathwayPressure(board, {
      winMax: { Floods: 2, Trust: 2 },
    });
    assert.equal(applied.displayPressure.Floods, 4);
    assert.equal(applied.board.tiles["crisis-local"].lamp, "red");
    assert.equal(applied.board.tiles["crisis-support"].lamp, "green");
  });

  it("positive support delta can heat a touching support hex", () => {
    let board = seedCrisisTiles({
      crisisRoles: ["support"],
      pressure: { Trust: 2 },
    });
    const support = board.tiles["crisis-support"];
    board = addTile(
      board,
      mintInventionTile({
        id: "rx",
        techId: "energy",
        howText: "Reactor.",
        year: 2026,
        timingLevel: "green",
      })
    );
    board = placeOk(board, "rx", support.q - 1, support.r);
    const fp = pathwayContentFingerprint([board.tiles.rx]);
    board.pathwayImpacts[fp] = {
      inventionIds: ["rx"],
      crisisDelta: { local: 0, global: 0, support: 1 },
      concerns: {},
      pending: false,
      concernKey: "",
    };
    const applied = applyPathwayPressure(board, { winMax: { Trust: 2 } });
    assert.equal(applied.displayPressure.Trust, 3);
    assert.equal(
      applied.board.tiles["crisis-support"].lamp,
      bandToLamp(crisisMeterLevel(3, 2))
    );
  });

  it("Bonds is red until every crisis hex touches some island; union can cover", () => {
    let board = seedCrisisTiles({
      crisisRoles: ["local", "support"],
      pressure: { Floods: 2, Trust: 2 },
    });
    assert.equal(boardBondsLevel(board).level, "red");

    board = addTile(
      board,
      mintInventionTile({ id: "a", techId: "ai", howText: "A", year: 2026 })
    );
    const local = board.tiles["crisis-local"];
    board = placeOk(board, "a", local.q - 1, local.r);
    assert.equal(boardBondsLevel(board).level, "red");

    board = addTile(
      board,
      mintInventionTile({
        id: "b",
        techId: "drones",
        howText: "B",
        year: 2026,
      })
    );
    const support = board.tiles["crisis-support"];
    board = placeOk(board, "b", support.q + 1, support.r);
    assert.equal(boardBondsLevel(board).level, "green");
  });

  it("Bonds turns red if a concern is isolated from every island", () => {
    let board = seedCrisisTiles({
      crisisRoles: ["local"],
      pressure: { Floods: 2 },
    });
    board = addTile(
      board,
      mintInventionTile({ id: "a", techId: "ai", howText: "A", year: 2026 })
    );
    const local = board.tiles["crisis-local"];
    board = placeOk(board, "a", local.q, local.r - 1);
    assert.equal(boardBondsLevel(board).level, "green");
    board = addTile(board, {
      id: "concern-moloch",
      kind: TILE_KIND.concern,
      q: local.q + 4,
      r: local.r,
      polarity: "curve",
      name: "Moloch",
      angle: "moloch",
      lamp: "red",
    });
    assert.equal(boardBondsLevel(board).level, "red");
    assert.match(boardBondsLevel(board).note, /1 hex/);
  });

  it("overall pathway is red when Bonds is red even if coverage is not", () => {
    let board = seedCrisisTiles({
      crisisRoles: ["local", "support"],
      pressure: { Floods: 0, Trust: 0 },
    });
    board.tiles["crisis-local"].lamp = "green";
    board.tiles["crisis-support"].lamp = "green";
    board = addTile(
      board,
      mintInventionTile({
        id: "a",
        techId: "ai",
        howText: "A",
        year: 2026,
        timingLevel: "green",
        feasibilityPct: 85,
      })
    );
    const local = board.tiles["crisis-local"];
    board = placeOk(board, "a", local.q - 1, local.r);
    const panel = hexPathwayPanel(board);
    assert.equal(panel.bonds.level, "red");
    assert.equal(panel.overall, "red");
  });
});

describe("diffPathwayScoreJobs", () => {
  const inv = (id, timingPending = false) => ({
    id,
    kind: TILE_KIND.invention,
    timingPending,
  });
  const path = (fingerprint, inventions, needsScore) => ({
    fingerprint,
    inventions,
    needsScore,
  });

  it("live A inflight + new B starts B and aborts none", () => {
    const r = diffPathwayScoreJobs(
      [path("A", [inv("a")], true), path("B", [inv("b")], true)],
      ["A"]
    );
    assert.deepEqual(r.start, ["B"]);
    assert.deepEqual(r.abort, []);
    assert.deepEqual(r.keep, ["A"]);
  });

  it("A inflight + join into AB aborts A and starts AB", () => {
    const r = diffPathwayScoreJobs(
      [path("AB", [inv("a"), inv("b")], true)],
      ["A"]
    );
    assert.deepEqual(r.abort, ["A"]);
    assert.deepEqual(r.start, ["AB"]);
    assert.deepEqual(r.keep, []);
  });

  it("AB inflight + lift B aborts AB and starts solo A", () => {
    const r = diffPathwayScoreJobs([path("A", [inv("a")], true)], ["AB"]);
    assert.deepEqual(r.abort, ["AB"]);
    assert.deepEqual(r.start, ["A"]);
    assert.deepEqual(r.keep, []);
  });

  it("timingPending pathway is not startable; settled sibling is", () => {
    const r = diffPathwayScoreJobs(
      [
        path("pending", [inv("a", true)], true),
        path("ready", [inv("b", false)], true),
      ],
      []
    );
    assert.deepEqual(r.start, ["ready"]);
    assert.deepEqual(r.abort, []);
    assert.equal(pathwayHasTimingPending([inv("a", true)]), true);
    assert.equal(pathwayHasTimingPending([inv("b", false)]), false);
  });
});



describe("assessConcernPrior + written answers", () => {
  it("undocked stays red even with a hit answer; dock without answer stays red", () => {
    const empty = { anyTouch: false, matureCount: 0 };
    const answered = { playerAnswer: "Named the bond and who pays." };
    const red = assessConcernPrior(empty, answered);
    assert.equal(red.level, "red");
    assert.match(red.note, /stays red/i);

    const touching = { anyTouch: true, matureCount: 1 };
    const stillRed = assessConcernPrior(touching, {});
    assert.equal(stillRed.level, "red");
    assert.match(stillRed.note, /docking is not enough/i);

    const yellow = assessConcernPrior(touching, answered);
    assert.equal(yellow.level, "yellow");
  });
});

describe("invalidatePathwaysTouchingGiven", () => {
  function placeOk(board, id, q, r) {
    const res = placeTile(board, id, q, r);
    assert.equal(res.ok, true, JSON.stringify(res.blockers));
    return res.board;
  }

  it("marks touching pathway scores pending so a new answer can rescore", () => {
    let board = seedCrisisTiles({
      crisisRoles: ["local"],
      pressure: { Floods: 3 },
    });
    board = addTile(board, {
      id: "concern-moloch",
      kind: TILE_KIND.concern,
      q: board.tiles["crisis-local"].q,
      r: board.tiles["crisis-local"].r + 2,
      polarity: "curve",
      name: "Moloch",
      angle: "moloch",
      lamp: "red",
    });
    const concern = board.tiles["concern-moloch"];
    board = addTile(
      board,
      mintInventionTile({
        id: "ai1",
        techId: "ai",
        howText: "Shared ledger.",
        year: 2026,
        timingLevel: "green",
      })
    );
    board = placeOk(board, "ai1", concern.q - 1, concern.r);
    const fp = pathwayContentFingerprint([board.tiles.ai1]);
    board.pathwayImpacts[fp] = {
      inventionIds: ["ai1"],
      crisisDelta: { local: 0, global: 0, support: 0 },
      concerns: { moloch: { level: "green", reason: "Holds." } },
      pending: false,
    };
    board = invalidatePathwaysTouchingGiven(board, "concern-moloch");
    assert.equal(board.pathwayImpacts[fp].pending, false);
    assert.equal(board.pathwayImpacts[fp].concernsPending, true);
  });

  it("undocking after an answer returns the lamp to red", () => {
    let board = seedCrisisTiles({
      crisisRoles: ["local"],
      pressure: { Floods: 3 },
    });
    board = addTile(board, {
      id: "concern-moloch",
      kind: TILE_KIND.concern,
      q: board.tiles["crisis-local"].q - 3,
      r: board.tiles["crisis-local"].r,
      polarity: "curve",
      name: "Moloch",
      angle: "moloch",
      lamp: "red",
      playerAnswer: "Bonded escrow after proof.",
      answerQuality: "hit",
    });
    const concern = board.tiles["concern-moloch"];
    board = addTile(
      board,
      mintInventionTile({
        id: "ai1",
        techId: "ai",
        howText: "Shared ledger.",
        year: 2026,
        timingLevel: "green",
      })
    );
    board = placeOk(board, "ai1", concern.q + 1, concern.r);
    let applied = applyPathwayPressure(board, { winMax: { Floods: 2 } });
    assert.equal(applied.board.tiles["concern-moloch"].lamp, "yellow");
    applied = { board: liftTile(applied.board, "ai1").board };
    applied = applyPathwayPressure(applied.board, { winMax: { Floods: 2 } });
    assert.equal(applied.board.tiles["concern-moloch"].lamp, "red");
    assert.equal(
      applied.board.tiles["concern-moloch"].playerAnswer.includes("escrow"),
      true
    );
  });

  it("docking a concern onto a scored pathway without an answer stays red", () => {
    let board = seedCrisisTiles({
      crisisRoles: ["local"],
      pressure: { Floods: 3 },
    });
    board = addTile(
      board,
      mintInventionTile({
        id: "ai1",
        techId: "ai",
        howText: "Shared ledger for flood sensors.",
        year: 2026,
        timingLevel: "green",
      })
    );
    const local = board.tiles["crisis-local"];
    board = placeOk(board, "ai1", local.q - 1, local.r);
    const fp = pathwayContentFingerprint([board.tiles.ai1]);
    board.pathwayImpacts[fp] = {
      inventionIds: ["ai1"],
      crisisDelta: { local: -1, global: 0, support: 0 },
      concerns: {},
      pending: false,
      concernKey: "",
    };
    board = addTile(board, {
      id: "concern-moloch",
      kind: TILE_KIND.concern,
      q: local.q - 1,
      r: local.r + 1,
      polarity: "curve",
      name: "Moloch",
      angle: "moloch",
      lamp: "red",
    });
    const applied = applyPathwayPressure(board, { winMax: { Floods: 2 } });
    assert.equal(applied.board.tiles["concern-moloch"].lamp, "red");
    assert.equal(applied.pathways[0].needsScore, false);
    assert.equal(applied.board.pathwayImpacts[fp].pending, false);
    assert.equal(applied.board.tiles["crisis-local"].lampPending, false);
    assert.equal(applied.board.tiles["concern-moloch"].lampPending, false);
  });

  it("how-text change while concern is isolated does not score that concern", () => {
    let board = seedCrisisTiles({
      crisisRoles: ["local"],
      pressure: { Floods: 3 },
    });
    board = addTile(
      board,
      mintInventionTile({
        id: "ai1",
        techId: "ai",
        howText: "Original.",
        year: 2026,
        timingLevel: "green",
      })
    );
    const local = board.tiles["crisis-local"];
    board = placeOk(board, "ai1", local.q - 1, local.r);
    board = addTile(board, {
      id: "concern-moloch",
      kind: TILE_KIND.concern,
      q: local.q + 3,
      r: local.r,
      polarity: "curve",
      name: "Moloch",
      angle: "moloch",
      lamp: "red",
    });
    board.tiles.ai1.howText = "Revised mechanism for the quay.";
    const applied = applyPathwayPressure(board, { winMax: { Floods: 2 } });
    assert.equal(applied.board.tiles["concern-moloch"].lamp, "red");
    assert.equal(applied.board.tiles["concern-moloch"].lampPending, false);
    assert.equal(applied.pathways[0].needsScore, true);
    assert.ok(applied.pendingGivenIds.includes("crisis-local"));
    assert.ok(!applied.pendingGivenIds.includes("concern-moloch"));
  });

  it("lifting a pathway tile while a concern is docked rescores that island", () => {
    let board = seedCrisisTiles({
      crisisRoles: ["local"],
      pressure: { Floods: 3 },
    });
    board = addTile(
      board,
      mintInventionTile({
        id: "a",
        techId: "ai",
        howText: "One.",
        year: 2026,
        timingLevel: "green",
      })
    );
    board = addTile(
      board,
      mintInventionTile({
        id: "b",
        techId: "ai",
        howText: "Two.",
        year: 2026,
        timingLevel: "green",
      })
    );
    const local = board.tiles["crisis-local"];
    board = placeOk(board, "a", local.q - 1, local.r);
    board = placeOk(board, "b", local.q - 2, local.r);
    board = addTile(board, {
      id: "concern-moloch",
      kind: TILE_KIND.concern,
      q: local.q - 1,
      r: local.r + 1,
      polarity: "curve",
      name: "Moloch",
      angle: "moloch",
      lamp: "red",
      posedFingerprints: ["old-snap"],
    });
    const chainFp = pathwayContentFingerprint([board.tiles.a, board.tiles.b]);
    board.pathwayImpacts[chainFp] = {
      inventionIds: ["a", "b"],
      crisisDelta: { local: -1, global: 0, support: 0 },
      concerns: {},
      pending: false,
      concernKey: "moloch:",
    };
    board = liftTile(board, "b").board;
    const applied = applyPathwayPressure(board, { winMax: { Floods: 2 } });
    assert.equal(applied.pathways[0].needsScore, true);
    assert.equal(applied.board.tiles["concern-moloch"].lamp, "red");
    assert.ok(applied.pendingGivenIds.includes("crisis-local"));
    assert.ok(applied.pendingGivenIds.includes("concern-moloch"));
  });

  it("moving an unanswered concern does not re-pend crisis lamps", () => {
    let board = seedCrisisTiles({
      crisisRoles: ["local"],
      pressure: { Floods: 3 },
    });
    board = addTile(
      board,
      mintInventionTile({
        id: "ai1",
        techId: "ai",
        howText: "Shared ledger for flood sensors.",
        year: 2026,
        timingLevel: "green",
      })
    );
    const local = board.tiles["crisis-local"];
    board = placeOk(board, "ai1", local.q - 1, local.r);
    const fp = pathwayContentFingerprint([board.tiles.ai1]);
    board.pathwayImpacts[fp] = {
      inventionIds: ["ai1"],
      crisisDelta: { local: -1, global: 0, support: 0 },
      concerns: {},
      pending: false,
      concernKey: "",
    };
    board = addTile(board, {
      id: "concern-moloch",
      kind: TILE_KIND.concern,
      q: local.q + 2,
      r: local.r,
      polarity: "curve",
      name: "Moloch",
      angle: "moloch",
      lamp: "red",
    });
    let applied = applyPathwayPressure(board, { winMax: { Floods: 2 } });
    assert.equal(applied.board.tiles["crisis-local"].lampPending, false);
    assert.equal(applied.pathways[0].needsScore, false);

    const concern = applied.board.tiles["concern-moloch"];
    applied = applyPathwayPressure(
      {
        ...applied.board,
        tiles: {
          ...applied.board.tiles,
          "concern-moloch": {
            ...concern,
            q: local.q - 1,
            r: local.r + 1,
          },
        },
      },
      { winMax: { Floods: 2 } }
    );
    assert.equal(applied.pathways[0].needsScore, false);
    assert.equal(applied.board.pathwayImpacts[fp].pending, false);
    assert.equal(applied.board.tiles["crisis-local"].lampPending, false);
    assert.equal(applied.board.tiles["concern-moloch"].lamp, "red");
  });

  it("settled docked concern score does not stay pending after clone", () => {
    let board = seedCrisisTiles({
      crisisRoles: ["local"],
      pressure: { Floods: 3 },
    });
    board = addTile(
      board,
      mintInventionTile({
        id: "ai1",
        techId: "ai",
        howText: "Shared ledger for flood sensors.",
        year: 2026,
        timingLevel: "green",
      })
    );
    const local = board.tiles["crisis-local"];
    board = placeOk(board, "ai1", local.q - 1, local.r);
    board = addTile(board, {
      id: "concern-moloch",
      kind: TILE_KIND.concern,
      q: local.q - 1,
      r: local.r + 1,
      polarity: "curve",
      name: "Moloch",
      angle: "moloch",
      lamp: "red",
    });
    const fp = pathwayContentFingerprint([board.tiles.ai1]);
    const concernKey = "moloch:";
    board.pathwayImpacts[fp] = {
      inventionIds: ["ai1"],
      crisisDelta: { local: -1, global: 0, support: 0 },
      concerns: { moloch: { level: "red", reason: "Still unanswered — docking is not enough." } },
      pending: false,
      concernKey,
    };
    const applied = applyPathwayPressure(board, { winMax: { Floods: 2 } });
    assert.equal(applied.pathways[0].needsScore, false);
    assert.equal(applied.board.pathwayImpacts[fp].pending, false);
    assert.equal(applied.board.pathwayImpacts[fp].concernKey, concernKey);
    assert.equal(applied.board.tiles["concern-moloch"].lampPending, false);
    assert.equal(applied.board.tiles["concern-moloch"].lamp, "red");
  });
});

describe("R&D and convergence timing", () => {
  function inv(id, opts = {}) {
    return mintInventionTile({
      id,
      techId: opts.techId || "ai",
      howText: `${id} how.`,
      year: 2026,
      feasibilityPct: opts.feasibilityPct ?? 50,
      timingLevel: opts.timingLevel ?? "yellow",
      polarity: opts.polarity,
      ...opts,
    });
  }

  function placeOk(board, id, q, r) {
    const res = placeTile(board, id, q, r);
    assert.equal(res.ok, true, `place ${id} at ${q},${r}`);
    return res.board;
  }

  it("does not overwrite base feasibilityPct when applying convergence", () => {
    let board = createEmptyBoard();
    board = addTile(board, inv("a"));
    board = addTile(board, inv("b"));
    board = placeOk(board, "a", 0, 0);
    board = placeOk(board, "b", -1, 0);
    board = putConvergence(board, "a", "b", {
      enhancedId: "a",
      factor: 1.25,
      title: "Shared grid",
      reason: "One unblocks the other.",
    });
    assert.equal(board.tiles.a.feasibilityPct, 50);
    assert.equal(board.tiles.b.feasibilityPct, 50);
    assert.equal(board.tiles.a.convergenceFactor, 1.25);
    assert.equal(board.tiles.b.convergenceFactor, 1.25);
    assert.equal(tileBaseTimingPct(board.tiles.a), 50);
    assert.equal(tileTimingPct(board.tiles.a, board), 63);
    assert.equal(tileTimingPct(board.tiles.b, board), 63);
  });

  it("stacks touching R&D as a product and clamps to 99", () => {
    let board = createEmptyBoard();
    board = addTile(board, inv("a"));
    board = addTile(board, mintRdTile({ id: "rd1", factor: 2 }));
    board = addTile(board, mintRdTile({ id: "rd2", factor: 1.5 }));
    board = placeOk(board, "a", 0, 0);
    board = placeOk(board, "rd1", 1, 0);
    board = placeOk(board, "rd2", 0, 1);
    const path = listInventionPathways(board)[0];
    assert.equal(
      path.every((t) => t.kind === TILE_KIND.invention),
      true
    );
    assert.equal(rdFactorForPathway(board, path), 3);
    const ch = pathwayTimingChance(path, board);
    assert.equal(ch.rdFactor, 3);
    assert.equal(ch.pct, 99);
    assert.equal(clampTimingPct(150), 99);
    assert.equal(clampTimingPct(0), 1);
  });

  it("one R&D tile multiplies every cluster it touches", () => {
    let board = createEmptyBoard();
    board = addTile(board, inv("a"));
    board = addTile(board, inv("b", { techId: "solar" }));
    board = addTile(board, mintRdTile({ id: "rd", factor: 2 }));
    board = placeOk(board, "a", 0, 0);
    board = placeOk(board, "b", 2, 0);
    board = placeOk(board, "rd", 1, 0);
    const paths = listInventionPathways(board);
    assert.equal(paths.length, 2);
    for (const path of paths) {
      const ch = pathwayTimingChance(path, board);
      assert.equal(ch.rdFactor, 2);
      assert.equal(ch.pct, 99);
    }
  });

  it("keeps the honesty bump after lift and does not stack on re-dock", () => {
    let board = createEmptyBoard();
    board = addTile(board, inv("a"));
    board = addTile(board, inv("b"));
    board = placeOk(board, "a", 0, 0);
    board = placeOk(board, "b", -1, 0);
    board = putConvergence(board, "a", "b", {
      factor: 1.25,
    });
    assert.equal(Object.keys(board.convergences).length, 1);
    board = liftTile(board, "a").board;
    board = liftTile(board, "b").board;
    board = pruneStaleConvergences(board);
    assert.equal(Object.keys(board.convergences).length, 1);
    assert.equal(board.tiles.a.convergenceFactor, 1.25);
    assert.equal(board.tiles.b.convergenceFactor, 1.25);
    assert.equal(tileTimingPct(board.tiles.a, board), 63);
    assert.equal(tileTimingPct(board.tiles.b, board), 63);
    board = placeOk(board, "a", 0, 0);
    board = placeOk(board, "b", -1, 0);
    board = putConvergence(board, "a", "b", {
      factor: 1.25,
    });
    assert.equal(board.tiles.a.convergenceFactor, 1.25);
    assert.equal(board.tiles.b.convergenceFactor, 1.25);
    assert.equal(tileTimingPct(board.tiles.a, board), 63);
    assert.equal(tileTimingPct(board.tiles.b, board), 63);
  });

  it("keeps the sticky 1.25x after a later timing re-score", () => {
    let board = createEmptyBoard();
    board = addTile(board, inv("a"));
    board = addTile(board, inv("b"));
    board = placeOk(board, "a", 0, 0);
    board = placeOk(board, "b", -1, 0);
    board = putConvergence(board, "a", "b", {
      enhancedId: "a",
      factor: 1.25,
    });
    board.tiles.a.feasibilityPct = 80;
    assert.equal(tileBaseTimingPct(board.tiles.a), 80);
    assert.equal(tileTimingPct(board.tiles.a, board), 99);
    assert.equal(tileTimingPct(board.tiles.b, board), 63);
  });

  it("heuristic converges on complementary polarity or distinct techs", () => {
    const same = inv("a");
    const clone = inv("b");
    assert.equal(heuristicConverges(same, clone), false);
    const otherTech = inv("c", { techId: "solar" });
    assert.equal(heuristicConverges(same, otherTech), true);
    const split = inv("d", { polarity: "split" });
    assert.equal(heuristicConverges(same, split), true);
    const placed = inv("low", { feasibilityPct: 40 });
    const nabe = inv("high", { feasibilityPct: 80, techId: "solar" });
    assert.equal(pickEnhancedId(placed, nabe), "low");
  });
});

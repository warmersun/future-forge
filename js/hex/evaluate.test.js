/**
 * Tests for hex cluster priors, timing map, affected given ids.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  seedCrisisTiles,
  mintInventionTile,
  addTile,
  placeTile,
  liftTile,
  createEmptyBoard,
} from "./board-state.js";
import {
  timingLevelToPct,
  timingPctToLevel,
  pathwayTimingChance,
  boardWorstPathwayTiming,
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
  pathwayContentFingerprint,
  listInventionPathways,
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

  it("heuristicPathwayScore gives mild relief for mature how-text", () => {
    const score = heuristicPathwayScore(
      [
        {
          kind: "invention",
          year: 2026,
          howText: "A clear forty-character mechanism for local flood sensors.",
          timingLevel: "green",
          feasibilityPct: 85,
        },
      ],
      2026,
      { concernAngles: ["moloch"] }
    );
    assert.equal(score.crisisDelta.local, -1);
    assert.equal(score.concerns.moloch.level, "yellow");
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
  it("undocked stays red even with a hit answer; touch is yellow", () => {
    const empty = { anyTouch: false, matureCount: 0 };
    const answered = { playerAnswer: "Named the bond and who pays." };
    const red = assessConcernPrior(empty, answered);
    assert.equal(red.level, "red");
    assert.match(red.note, /stays red/i);

    const touching = { anyTouch: true, matureCount: 1 };
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
    assert.equal(board.pathwayImpacts[fp].pending, true);
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
});

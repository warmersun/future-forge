import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createEmptyBoard,
  seedCrisisTiles,
  mintInventionTile,
  placeTile,
  liftTile,
  summonConcerns,
  summonOneConcern,
  remainingConcernAngles,
  concernAnglesOnBoard,
  ensureConcernRoster,
  sampleConcernRoster,
  neighborTiles,
  boardHolds,
  techIdsFromBoard,
  deriveBoardProse,
  addTile,
  removeUnplacedTiles,
  applyLights,
  TILE_KIND,
  CONCERN_ANGLES,
} from "./board-state.js";
import { clampChallengerCount } from "../data.js";
import { polarityForTech, TECH_POLARITY } from "./polarity.js";
import {
  applyHeuristicLights,
  ideaMature,
  normalizeNeighborLights,
  buildNeighborEvalContext,
} from "./lights.js";
import { BITS, ATOMS } from "./hex-tile-grid.js";

test("polarity map covers catalog families", () => {
  assert.equal(polarityForTech("ai"), BITS);
  assert.equal(polarityForTech("drones"), ATOMS);
  assert.equal(polarityForTech("iot"), "split");
  assert.equal(TECH_POLARITY.synbio, "split");
  assert.equal(TECH_POLARITY["gene-sequencing"], BITS);
});

test("seedCrisisTiles respects omitted roles", () => {
  const board = seedCrisisTiles({
    crisisRoles: ["local", "support"],
    pressure: { Outbreak: 2, Fear: 1 },
  });
  const crises = Object.values(board.tiles).filter((t) => t.kind === TILE_KIND.crisis);
  assert.equal(crises.length, 2);
  assert.ok(board.tiles["crisis-local"]);
  assert.ok(board.tiles["crisis-support"]);
  assert.equal(board.tiles["crisis-global"], undefined);
});

test("placeTile refuses bits against atoms", () => {
  let board = createEmptyBoard();
  const ai = mintInventionTile({ id: "ai1", techId: "ai", name: "Go" });
  const drones = mintInventionTile({ id: "dr1", techId: "drones", name: "Hop" });
  board = addTile(board, ai);
  board = addTile(board, drones);
  let r = placeTile(board, "ai1", 0, 0);
  assert.equal(r.ok, true);
  board = r.board;
  r = placeTile(board, "dr1", 1, 0);
  assert.equal(r.ok, false);
});

test("placeTile allows split converter between bits and atoms", () => {
  let board = createEmptyBoard();
  board = addTile(board, mintInventionTile({ id: "ai1", techId: "ai", name: "AI" }));
  board = addTile(board, mintInventionTile({ id: "iot1", techId: "iot", name: "IoT" }));
  board = addTile(board, mintInventionTile({ id: "dr1", techId: "drones", name: "Drones" }));
  board = placeTile(board, "iot1", 0, 0).board;
  // AI west of IoT (bits face)
  let r = placeTile(board, "ai1", -1, 0);
  assert.equal(r.ok, true);
  board = r.board;
  // Drones east of IoT (atoms face)
  r = placeTile(board, "dr1", 1, 0);
  assert.equal(r.ok, true);
});

test("invention may always sit against crisis (curve)", () => {
  let board = seedCrisisTiles({
    crisisRoles: ["local"],
    pressure: { Floods: 3 },
  });
  const inv = mintInventionTile({ id: "ai1", techId: "ai", name: "Alert" });
  board = addTile(board, inv);
  const crisis = board.tiles["crisis-local"];
  const r = placeTile(board, "ai1", crisis.q - 1, crisis.r);
  assert.equal(r.ok, true);
});

test("summonConcerns preserves scrutiny analysis, safeguard, and art", () => {
  let board = seedCrisisTiles({
    crisisRoles: ["local"],
    pressure: { Floods: 2 },
  });
  board = summonConcerns(board, null, {
    moloch: {
      analysis: "Freeriders win.",
      safeguard: "Align incentives.",
      artUrl: "assets/challengers/moloch.jpg",
      imagePrompt: "street race to the bottom",
    },
    nature: {
      analysis: "Storms do not care.",
      safeguard: "Cap energy and monitor.",
      artUrl: "assets/challengers/nature.jpg",
      imagePrompt: "storm over the quay",
    },
  });
  const moloch = board.tiles["concern-moloch"];
  assert.equal(moloch.analysis, "Freeriders win.");
  assert.equal(moloch.safeguard, "Align incentives.");
  assert.equal(moloch.artUrl, "assets/challengers/moloch.jpg");
  assert.equal(moloch.imagePrompt, "street race to the bottom");
  const nature = board.tiles["concern-nature"];
  assert.equal(nature.analysis, "Storms do not care.");
  assert.equal(nature.artUrl, "assets/challengers/nature.jpg");
  // Angles without enrich stay null art / analysis
  assert.equal(board.tiles["concern-ethicist"].analysis, null);
  assert.equal(board.tiles["concern-ethicist"].artUrl, null);
  assert.equal(board.concernsSummoned, true);
});

test("summonOneConcern is one-by-one, isolated, and gates concernsSummoned", () => {
  let board = seedCrisisTiles({
    crisisRoles: ["local"],
    pressure: { Floods: 2 },
  });
  board = addTile(
    board,
    mintInventionTile({ id: "ai1", techId: "ai", name: "Alert", howText: "Sensors." })
  );
  board = placeTile(board, "ai1", 0, 0).board;
  board.concernTargetCount = 4;
  board.concernRoster = CONCERN_ANGLES.slice();
  assert.deepEqual(remainingConcernAngles(board).sort(), [
    "ethicist",
    "moloch",
    "nature",
    "stakeholder",
  ]);
  assert.equal(board.concernsSummoned, false);

  let r = summonOneConcern(board, "moloch", {
    analysis: "Freeriders.",
    safeguard: "Align.",
    artUrl: "assets/challengers/moloch.jpg",
  });
  assert.equal(r.ok, true);
  board = r.board;
  assert.equal(board.concernsSummoned, false);
  assert.equal(concernAnglesOnBoard(board).length, 1);
  assert.ok(board.tiles["concern-moloch"]);
  assert.equal(board.tiles["concern-moloch"].analysis, "Freeriders.");
  assert.equal(
    neighborTiles(board, "concern-moloch").length,
    0,
    "new concern must not touch any tile"
  );

  r = summonOneConcern(board, "moloch", {});
  assert.equal(r.ok, false);
  assert.equal(r.error, "already_summoned");

  for (const angle of ["nature", "ethicist", "stakeholder"]) {
    r = summonOneConcern(board, angle, { analysis: angle });
    assert.equal(r.ok, true);
    board = r.board;
    assert.equal(neighborTiles(board, `concern-${angle}`).length, 0);
  }
  assert.equal(board.concernsSummoned, true);
  assert.equal(remainingConcernAngles(board).length, 0);
});

test("default challengerCount 1: one summon completes concernsSummoned", () => {
  let board = seedCrisisTiles({
    crisisRoles: ["local"],
    pressure: { Floods: 1 },
  });
  assert.equal(board.concernTargetCount, 1);
  board.concernRoster = ["nature"];
  assert.deepEqual(remainingConcernAngles(board), ["nature"]);
  const r = summonOneConcern(board, "nature", { analysis: "Done." });
  assert.equal(r.ok, true);
  board = r.board;
  assert.equal(board.concernsSummoned, true);
  assert.equal(remainingConcernAngles(board).length, 0);
  assert.equal(neighborTiles(board, "concern-nature").length, 0);
});

test("target 3: summoned after three roster angles; fourth never required", () => {
  let board = seedCrisisTiles(
    { crisisRoles: ["local"], pressure: { Floods: 1 } },
    { challengerCount: 3 }
  );
  assert.equal(board.concernTargetCount, 3);
  board.concernRoster = ["moloch", "ethicist", "stakeholder"];
  assert.equal(remainingConcernAngles(board).length, 3);

  for (const angle of board.concernRoster) {
    const r = summonOneConcern(board, angle, { analysis: angle });
    assert.equal(r.ok, true);
    board = r.board;
  }
  assert.equal(board.concernsSummoned, true);
  assert.equal(concernAnglesOnBoard(board).length, 3);
  assert.equal(board.tiles["concern-nature"], undefined);

  const rejected = summonOneConcern(board, "nature", {});
  assert.equal(rejected.ok, false);
  assert.equal(rejected.error, "not_in_roster");
});

test("sampleConcernRoster never duplicates and clampChallengerCount bounds 1..4", () => {
  assert.equal(clampChallengerCount(0), 1);
  assert.equal(clampChallengerCount(99), 4);
  assert.equal(clampChallengerCount(2.6), 3);
  assert.equal(clampChallengerCount("x"), 1);
  const roster = sampleConcernRoster(4, () => 0.5);
  assert.equal(roster.length, 4);
  assert.equal(new Set(roster).size, 4);
  for (const a of roster) assert.ok(CONCERN_ANGLES.includes(a));
  assert.equal(sampleConcernRoster(1, () => 0).length, 1);
});

test("boardHolds requires concerns and no red lamps", () => {
  let board = seedCrisisTiles({
    crisisRoles: ["local"],
    pressure: { Floods: 1 },
  });
  board = applyLights(board, [{ id: "crisis-local", level: "green" }]);
  assert.equal(boardHolds(board), false);
  board = summonConcerns(board);
  board = applyLights(board, [
    { id: "crisis-local", level: "yellow" },
    { id: "concern-nature", level: "yellow" },
    { id: "concern-moloch", level: "green" },
    { id: "concern-ethicist", level: "yellow" },
    { id: "concern-stakeholder", level: "green" },
  ]);
  assert.equal(boardHolds(board), true);
  board = applyLights(board, [{ id: "concern-moloch", level: "red" }]);
  assert.equal(boardHolds(board), false);
});

test("lift invention is allowed; lift crisis is not", () => {
  let board = seedCrisisTiles({
    crisisRoles: ["local"],
    pressure: { Floods: 2 },
  });
  board = addTile(
    board,
    mintInventionTile({ id: "ai1", techId: "ai", name: "X", q: 0, r: 0 })
  );
  board = placeTile(board, "ai1", 0, 0).board;
  assert.equal(liftTile(board, "ai1").ok, true);
  assert.equal(liftTile(board, "crisis-local").ok, false);
});

test("techIdsFromBoard counts only placed field inventions", () => {
  let board = createEmptyBoard();
  board = addTile(
    board,
    mintInventionTile({
      id: "a",
      techId: "ai",
      name: "Desk",
      howText: "Routes alerts.",
    })
  );
  board = addTile(
    board,
    mintInventionTile({ id: "b", techId: "ai", name: "Copy" })
  );
  // Tray only — not on stack yet
  assert.deepEqual(techIdsFromBoard(board), []);
  board = placeTile(board, "a", 0, 0).board;
  assert.deepEqual(techIdsFromBoard(board), ["ai"]);
  const prose = deriveBoardProse(board);
  assert.match(prose.inventionName, /Desk/);
  assert.match(prose.inventionHow, /Routes alerts/);
});

test("removeUnplacedTiles drops tray tiles only", () => {
  let board = createEmptyBoard();
  board = addTile(
    board,
    mintInventionTile({ id: "tray1", techId: "ai", name: "A", origin: "sparks" })
  );
  board = addTile(
    board,
    mintInventionTile({ id: "tray2", techId: "ai", name: "B", origin: "sparks" })
  );
  board = addTile(
    board,
    mintInventionTile({ id: "field1", techId: "ai", name: "C", origin: "sparks" })
  );
  board = placeTile(board, "field1", 1, 1).board;
  board = removeUnplacedTiles(board, ["tray1", "tray2", "field1", "missing"]);
  assert.equal(board.tiles["tray1"], undefined);
  assert.equal(board.tiles["tray2"], undefined);
  assert.ok(board.tiles["field1"]);
  assert.equal(board.tiles["field1"].q, 1);
  assert.equal(board.tiles["field1"].r, 1);
});

test("mintInventionTile stores origin", () => {
  const spark = mintInventionTile({ techId: "ai", name: "S", origin: "sparks" });
  const custom = mintInventionTile({ techId: "ai", name: "C", origin: "custom" });
  assert.equal(spark.origin, "sparks");
  assert.equal(custom.origin, "custom");
});

test("heuristic lights: untouched concern is red; mature touch yellow", () => {
  let board = seedCrisisTiles({
    crisisRoles: ["local"],
    pressure: { Floods: 4 },
    winMax: { Floods: 2 },
  });
  board = summonConcerns(board);
  board = applyHeuristicLights(board, {
    year: 2026,
    pressure: { Floods: 4 },
    winMax: { Floods: 2 },
  });
  assert.equal(board.tiles["concern-nature"].lamp, "red");

  const inv = mintInventionTile({
    id: "ai1",
    techId: "ai",
    name: "Help",
    year: 2026,
  });
  board = addTile(board, inv);
  const nature = board.tiles["concern-nature"];
  board = placeTile(board, "ai1", nature.q - 1, nature.r).board;
  board = applyHeuristicLights(board, {
    year: 2026,
    pressure: { Floods: 4 },
    winMax: { Floods: 2 },
  });
  assert.equal(board.tiles["concern-nature"].lamp, "yellow");
});

test("ideaMature respects future year and low feasibility", () => {
  assert.equal(
    ideaMature({ kind: "invention", year: 2030, feasibilityPct: 80 }, 2026),
    false
  );
  assert.equal(
    ideaMature({ kind: "invention", year: 2026, feasibilityPct: 10 }, 2026),
    false
  );
  assert.equal(
    ideaMature({ kind: "invention", year: 2026, feasibilityPct: 50 }, 2026),
    true
  );
});

test("normalizeNeighborLights filters junk", () => {
  const lights = normalizeNeighborLights({
    lights: [
      { id: "crisis-local", level: "GREEN", reason: "ok" },
      { id: "x", level: "blue" },
      { level: "red" },
    ],
  });
  assert.equal(lights.length, 1);
  assert.equal(lights[0].level, "green");
});

test("buildNeighborEvalContext lists neighbors", () => {
  let board = seedCrisisTiles({
    crisisRoles: ["local"],
    pressure: { Floods: 2 },
  });
  board = addTile(
    board,
    mintInventionTile({ id: "ai1", techId: "ai", name: "N", year: 2026 })
  );
  const c = board.tiles["crisis-local"];
  board = placeTile(board, "ai1", c.q - 1, c.r).board;
  const ctx = buildNeighborEvalContext(board, {
    year: 2026,
    pressure: { Floods: 2 },
    place: "Portside",
  });
  assert.equal(ctx.givens.length, 1);
  assert.equal(ctx.givens[0].neighbors.length, 1);
  assert.equal(ctx.givens[0].neighbors[0].techId, "ai");
});

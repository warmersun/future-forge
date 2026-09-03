import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createEmptyBoard,
  seedCrisisTiles,
  mintInventionTile,
  mintRdTile,
  unplacedRdTiles,
  putConvergence,
  pruneStaleConvergences,
  rollRdFactor,
  RD_FACTORS,
  formatFactor,
  isPortableTile,
  placeTile,
  liftTile,
  discardTile,
  summonConcerns,
  summonOneConcern,
  remainingConcernAngles,
  concernAnglesOnBoard,
  ensureConcernRoster,
  sampleConcernRoster,
  neighborTiles,
  boardHolds,
  summarizePathwayForBoard,
  techIdsFromBoard,
  unplacedInventionsForTech,
  techIdsWithUnplacedInventions,
  deriveBoardProse,
  addTile,
  preferIncomingHexBoard,
  boardForWire,
  mergeBoardArt,
  removeUnplacedTiles,
  applyLights,
  setLampPending,
  cloneBoard,
  TILE_KIND,
  CONCERN_ANGLES,
  concernPoseText,
  concernReplyText,
  setConcernReply,
  mintConcernTiles,
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

test("preferIncomingHexBoard keeps a richer local mint over a stale subset", () => {
  const local = {
    tiles: { a: { id: "a" }, b: { id: "b" }, c: { id: "c" } },
  };
  const incoming = { tiles: { a: { id: "a" }, b: { id: "b" } } };
  assert.equal(preferIncomingHexBoard(local, incoming), false);
  assert.equal(preferIncomingHexBoard(incoming, local), true);
  assert.equal(preferIncomingHexBoard(local, incoming, { forceIncoming: true }), true);
  assert.equal(preferIncomingHexBoard(incoming, local, { keepLocal: true }), false);
});

test("boardForWire strips inline data URLs and keeps artId", () => {
  const board = {
    tiles: {
      inv: {
        id: "inv",
        kind: "invention",
        artUrl: "data:image/jpeg;base64,/9j/aaaa",
        artId: "idea-abc",
        imagePrompt: "dock crane",
      },
      moloch: {
        id: "concern-moloch",
        kind: "concern",
        artUrl: "assets/challengers/moloch.jpg",
      },
    },
  };
  const wire = boardForWire(board);
  assert.equal(wire.tiles.inv.artUrl, null);
  assert.equal(wire.tiles.inv.artId, "idea-abc");
  assert.equal(wire.tiles.moloch.artUrl, "assets/challengers/moloch.jpg");
  assert.equal(board.tiles.inv.artUrl.startsWith("data:"), true);
});

test("mergeBoardArt restores local data URLs onto a stripped wire board", () => {
  const local = {
    tiles: {
      inv: {
        id: "inv",
        artUrl: "data:image/jpeg;base64,/9j/local",
        artId: "idea-abc",
      },
    },
  };
  const incoming = {
    tiles: {
      inv: { id: "inv", artUrl: null, artId: "idea-abc", q: 1, r: 2 },
    },
  };
  const merged = mergeBoardArt(incoming, local);
  assert.equal(merged.tiles.inv.artUrl, "data:image/jpeg;base64,/9j/local");
  assert.equal(merged.tiles.inv.q, 1);
});

test("mergeBoardArt keeps local timing when the wire board has none", () => {
  const local = {
    tiles: {
      inv: {
        id: "inv",
        kind: "invention",
        timingLevel: "green",
        timingPending: true,
        feasibilityPct: 85,
        timingForKey: "inv|2026|ai|how",
      },
    },
  };
  const incoming = {
    tiles: {
      inv: { id: "inv", kind: "invention", timingLevel: null, timingPending: false },
    },
  };
  const merged = mergeBoardArt(incoming, local);
  assert.equal(merged.tiles.inv.timingLevel, "green");
  assert.equal(merged.tiles.inv.timingPending, true);
  assert.equal(merged.tiles.inv.feasibilityPct, 85);
});

test("preferIncomingHexBoard keeps a local field drop over a same-id tray snapshot", () => {
  const local = {
    tiles: {
      crisis: { id: "crisis", kind: "crisis", q: 0, r: 0 },
      inv: { id: "inv", kind: "invention", techId: "drones", q: 1, r: 0 },
    },
  };
  const incoming = {
    tiles: {
      crisis: { id: "crisis", kind: "crisis", q: 0, r: 0 },
      inv: { id: "inv", kind: "invention", techId: "drones" },
    },
  };
  assert.equal(preferIncomingHexBoard(local, incoming), false);
  assert.equal(preferIncomingHexBoard(local, incoming, { forceIncoming: true }), true);
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

test("seedCrisisTiles copies pressureDesc onto tiles", () => {
  const board = seedCrisisTiles({
    crisisRoles: ["local"],
    pressure: { Outbreak: 2 },
    pressureDesc: { Outbreak: "The fever pattern is real and invisible." },
  });
  assert.equal(
    board.tiles["crisis-local"].description,
    "The fever pattern is real and invisible."
  );
});

test("seedCrisisTiles defaults missing description to empty string", () => {
  const board = seedCrisisTiles({
    crisisRoles: ["local"],
    pressure: { Outbreak: 2 },
  });
  assert.equal(board.tiles["crisis-local"].description, "");
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

test("summonConcerns preserves pose speech, question, and art", () => {
  let board = seedCrisisTiles({
    crisisRoles: ["local"],
    pressure: { Floods: 2 },
  });
  board = summonConcerns(board, null, {
    moloch: {
      challengeSpeech: "Freeriders win.",
      challengeQuestion: "Who defects when the pilot is free?",
      artUrl: "assets/challengers/moloch.jpg",
      imagePrompt: "street race to the bottom",
    },
    nature: {
      challengeSpeech: "Storms do not care.",
      challengeQuestion: "What breaks in a bad week?",
      artUrl: "assets/challengers/nature.jpg",
      imagePrompt: "storm over the quay",
    },
  });
  const moloch = board.tiles["concern-moloch"];
  assert.equal(moloch.challengeSpeech, "Freeriders win.");
  assert.equal(moloch.challengeQuestion, "Who defects when the pilot is free?");
  assert.equal(moloch.artUrl, "assets/challengers/moloch.jpg");
  assert.equal(moloch.imagePrompt, "street race to the bottom");
  const nature = board.tiles["concern-nature"];
  assert.equal(nature.challengeSpeech, "Storms do not care.");
  assert.equal(nature.artUrl, "assets/challengers/nature.jpg");
  // Angles without enrich stay null art / speech
  assert.equal(board.tiles["concern-ethicist"].challengeSpeech, null);
  assert.equal(board.tiles["concern-ethicist"].artUrl, null);
  assert.equal(board.concernsSummoned, true);
});

test("concernPoseText reads speech/question and falls back from analysis", () => {
  assert.deepEqual(
    concernPoseText({
      challengeSpeech: "Attack.",
      challengeQuestion: "Why?",
    }),
    { speech: "Attack.", question: "Why?" }
  );
  assert.equal(
    concernPoseText({ analysis: "Legacy attack." }).speech,
    "Legacy attack."
  );
});

test("summonOneConcern with spawn lands on that hex and stores the posed snapshot", () => {
  let board = seedCrisisTiles({
    crisisRoles: ["local"],
    pressure: { Floods: 2 },
  });
  board = addTile(
    board,
    mintInventionTile({ id: "ai1", techId: "ai", howText: "Sensors on the quay." })
  );
  board = placeTile(board, "ai1", 0, 0).board;
  board.concernRoster = ["moloch"];
  board.concernTargetCount = 1;
  const r = summonOneConcern(board, "moloch", {
    challengeSpeech: "Freeriders.",
    spawnQ: 1,
    spawnR: 0,
    posedInventionIds: ["ai1"],
    posedFingerprints: ["snap"],
    posedHowText: "Sensors on the quay.",
  });
  assert.equal(r.ok, true);
  const t = r.board.tiles["concern-moloch"];
  assert.equal(t.q, 1);
  assert.equal(t.r, 0);
  assert.equal(t.lamp, "red");
  assert.deepEqual(t.posedInventionIds, ["ai1"]);
  assert.equal(t.posedHowText, "Sensors on the quay.");
  assert.ok(neighborTiles(r.board, "concern-moloch").some((n) => n.id === "ai1"));
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
    challengeSpeech: "Freeriders.",
    challengeQuestion: "Who defects?",
    artUrl: "assets/challengers/moloch.jpg",
  });
  assert.equal(r.ok, true);
  board = r.board;
  assert.equal(board.concernsSummoned, false);
  assert.equal(concernAnglesOnBoard(board).length, 1);
  assert.ok(board.tiles["concern-moloch"]);
  assert.equal(board.tiles["concern-moloch"].challengeSpeech, "Freeriders.");
  assert.equal(board.tiles["concern-moloch"].challengeQuestion, "Who defects?");
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
  assert.match(prose.inventionName, /ai/);
  assert.match(prose.inventionHow, /Routes alerts/);
  assert.equal(prose.inventionImpact.includes("green"), false);
  assert.equal(prose.inventionImpact.includes("Board lights"), false);
});

test("summarizePathwayForBoard uses placed tiles only, in year then hex order", () => {
  let board = createEmptyBoard();
  board = addTile(
    board,
    mintInventionTile({
      id: "tray",
      techId: "ai",
      name: "Tray idea",
      howText: "Should not appear.",
    })
  );
  board = addTile(
    board,
    mintInventionTile({
      id: "late",
      techId: "bio",
      name: "Later dock",
      howText: "Cleans the quay.",
      year: 2032,
    })
  );
  board = addTile(
    board,
    mintInventionTile({
      id: "early",
      techId: "ai",
      name: "First dock",
      howText: "Routes alerts.",
      year: 2028,
    })
  );
  board = placeTile(board, "late", 0, 1).board;
  board = placeTile(board, "early", 1, 0).board;
  const sum = summarizePathwayForBoard(board, {
    place: "Quay",
    year: 2032,
    techTitle: (id) => (id === "ai" ? "AI" : id === "bio" ? "Bio" : id),
  });
  assert.equal(sum.stack.join(","), "ai,bio");
  assert.match(sum.text, /Quay · held in 2032/);
  assert.match(sum.text, /First dock \(AI\)/);
  assert.match(sum.text, /Routes alerts/);
  assert.match(sum.text, /Later dock \(Bio\)/);
  assert.equal(sum.text.includes("Should not appear"), false);
  const earlyAt = sum.text.indexOf("First dock");
  const lateAt = sum.text.indexOf("Later dock");
  assert.ok(earlyAt >= 0 && lateAt > earlyAt);
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

test("discardTile removes tray and placed inventions", () => {
  let board = createEmptyBoard();
  board = addTile(
    board,
    mintInventionTile({ id: "tray1", techId: "ai", name: "A", origin: "sparks" })
  );
  board = addTile(
    board,
    mintInventionTile({ id: "field1", techId: "ai", name: "B", origin: "sparks" })
  );
  board = placeTile(board, "field1", 1, 1).board;
  let r = discardTile(board, "tray1");
  assert.equal(r.ok, true);
  board = r.board;
  assert.equal(board.tiles["tray1"], undefined);
  assert.ok(board.tiles["field1"]);
  r = discardTile(board, "field1");
  assert.equal(r.ok, true);
  board = r.board;
  assert.equal(board.tiles["field1"], undefined);
});

test("discardTile refuses crisis, concern, and missing", () => {
  let board = seedCrisisTiles({
    crisisRoles: ["local"],
    pressure: { Floods: 2 },
  });
  board = summonConcerns(board, null, {
    moloch: { challengeSpeech: "Freeriders win." },
  });
  const crisis = discardTile(board, "crisis-local");
  assert.equal(crisis.ok, false);
  assert.ok(crisis.board.tiles["crisis-local"]);
  const concern = discardTile(board, "concern-moloch");
  assert.equal(concern.ok, false);
  assert.ok(concern.board.tiles["concern-moloch"]);
  const missing = discardTile(board, "nope");
  assert.equal(missing.ok, false);
  assert.equal(missing.board, board);
});

test("mintInventionTile stores origin", () => {
  const spark = mintInventionTile({ techId: "ai", name: "S", origin: "sparks" });
  const custom = mintInventionTile({ techId: "ai", name: "C", origin: "custom" });
  assert.equal(spark.origin, "sparks");
  assert.equal(custom.origin, "custom");
});

test("unplacedInventionsForTech filters by tech and tray", () => {
  let board = createEmptyBoard();
  board = addTile(
    board,
    mintInventionTile({ id: "d1", techId: "drones", name: "D1", origin: "sparks" })
  );
  board = addTile(
    board,
    mintInventionTile({ id: "d2", techId: "drones", name: "D2", origin: "sparks" })
  );
  board = addTile(
    board,
    mintInventionTile({ id: "b1", techId: "batteries", name: "B1", origin: "sparks" })
  );
  board = addTile(
    board,
    mintInventionTile({ id: "b2", techId: "batteries", name: "B2", origin: "sparks" })
  );
  board = addTile(
    board,
    mintInventionTile({ id: "b3", techId: "batteries", name: "B3", origin: "custom" })
  );
  board = placeTile(board, "b1", 0, 0).board;

  assert.deepEqual(
    unplacedInventionsForTech(board, "drones").map((t) => t.id).sort(),
    ["d1", "d2"]
  );
  assert.deepEqual(
    unplacedInventionsForTech(board, "batteries").map((t) => t.id).sort(),
    ["b2", "b3"]
  );
  assert.deepEqual(unplacedInventionsForTech(board, null), []);
  assert.equal(
    unplacedInventionsForTech(board, "batteries").some((t) => t.id === "b1"),
    false
  );

  board = liftTile(board, "b1").board;
  assert.deepEqual(
    unplacedInventionsForTech(board, "batteries").map((t) => t.id).sort(),
    ["b1", "b2", "b3"]
  );
});

test("techIdsWithUnplacedInventions lists tray techs including custom", () => {
  let board = createEmptyBoard();
  board = addTile(
    board,
    mintInventionTile({ id: "d1", techId: "drones", name: "D1", origin: "sparks" })
  );
  board = addTile(
    board,
    mintInventionTile({ id: "b1", techId: "batteries", name: "B1", origin: "sparks" })
  );
  board = addTile(
    board,
    mintInventionTile({ id: "b2", techId: "batteries", name: "B2", origin: "custom" })
  );
  assert.deepEqual(techIdsWithUnplacedInventions(board), ["drones", "batteries"]);

  board = placeTile(board, "d1", 0, 0).board;
  assert.deepEqual(techIdsWithUnplacedInventions(board), ["batteries"]);

  board = liftTile(board, "d1").board;
  assert.deepEqual(techIdsWithUnplacedInventions(board), ["drones", "batteries"]);
});

test("heuristic lights: untouched concern is red; mature touch without answer stays red", () => {
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
  assert.equal(board.tiles["concern-nature"].lamp, "red");
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

test("setLampPending freezes lamp color; applyLights clears pending", () => {
  let board = seedCrisisTiles({
    crisisRoles: ["local"],
    pressure: { Floods: 2 },
  });
  assert.equal(board.tiles["crisis-local"].lamp, "yellow");
  assert.equal(board.tiles["crisis-local"].lampPending, false);

  board = setLampPending(board, ["crisis-local"], true);
  assert.equal(board.tiles["crisis-local"].lamp, "yellow");
  assert.equal(board.tiles["crisis-local"].lampPending, true);

  board = applyLights(board, [
    { id: "crisis-local", level: "green", reason: "eased" },
  ]);
  assert.equal(board.tiles["crisis-local"].lamp, "green");
  assert.equal(board.tiles["crisis-local"].lampPending, false);
});

test("setLampPending null ids marks all on-field givens", () => {
  let board = seedCrisisTiles({
    crisisRoles: ["local", "support"],
    pressure: { Floods: 2, Trust: 2 },
  });
  board = setLampPending(board, null, true);
  assert.equal(board.tiles["crisis-local"].lampPending, true);
  assert.equal(board.tiles["crisis-support"].lampPending, true);
  assert.equal(board.tiles["crisis-local"].lamp, "yellow");
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

test("seedCrisisTiles sets pressureBase; cloneBoard round-trips pathway cache", () => {
  const board = seedCrisisTiles({
    crisisRoles: ["local", "support"],
    pressure: { Floods: 2, Trust: 3 },
  });
  assert.deepEqual(board.pressureBase, { Floods: 2, Trust: 3 });
  assert.deepEqual(board.pathwayImpacts, {});

  board.pathwayImpacts["a:ai:how:yellow"] = {
    inventionIds: ["inv-1"],
    crisisDelta: { local: -1, global: 0, support: 0 },
    concerns: { moloch: { level: "yellow", reason: "Touching." } },
    pending: false,
    concernKey: "moloch:Bonded escrow",
  };
  const copy = cloneBoard(board);
  assert.deepEqual(copy.pressureBase, { Floods: 2, Trust: 3 });
  assert.deepEqual(copy.pathwayImpacts["a:ai:how:yellow"].crisisDelta, {
    local: -1,
    global: 0,
    support: 0,
  });
  assert.deepEqual(copy.pathwayImpacts["a:ai:how:yellow"].crisisReasons, {
    local: "",
    global: "",
    support: "",
  });
  assert.equal(copy.pathwayImpacts["a:ai:how:yellow"].concerns.moloch.level, "yellow");
  assert.equal(copy.pathwayImpacts["a:ai:how:yellow"].pending, false);
  assert.equal(
    copy.pathwayImpacts["a:ai:how:yellow"].concernKey,
    "moloch:Bonded escrow"
  );
  // Mutating clone must not touch original
  copy.pressureBase.Floods = 9;
  copy.pathwayImpacts["a:ai:how:yellow"].crisisDelta.local = 0;
  copy.pathwayImpacts["a:ai:how:yellow"].crisisReasons.local = "mutated";
  assert.equal(board.pressureBase.Floods, 2);
  assert.equal(board.pathwayImpacts["a:ai:how:yellow"].crisisDelta.local, -1);
  assert.equal(board.pathwayImpacts["a:ai:how:yellow"].crisisReasons?.local || "", "");
});

test("cloneBoard clamps nested crisisDelta and clips reasons", () => {
  const board = seedCrisisTiles({
    crisisRoles: ["local"],
    pressure: { Floods: 2 },
  });
  board.pathwayImpacts["nested"] = {
    inventionIds: ["inv-1"],
    crisisDelta: {
      local: { delta: -9, reason: "x".repeat(400) },
      global: { delta: 3, reason: "Too much." },
      support: 0,
    },
    concerns: {},
    pending: false,
  };
  const copy = cloneBoard(board);
  assert.equal(copy.pathwayImpacts.nested.crisisDelta.local, -2);
  assert.equal(copy.pathwayImpacts.nested.crisisDelta.global, 1);
  assert.equal(copy.pathwayImpacts.nested.crisisReasons.local.length, 160);
  assert.equal(copy.pathwayImpacts.nested.crisisReasons.global, "Too much.");
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
  assert.equal(ctx.givens[0].neighbors[0].name, undefined);
  assert.equal(ctx.givens[0].neighbors[0].direct, true);
  assert.ok(ctx.givens[0].pathway);
  assert.equal(ctx.givens[0].pathway.anyTouch, true);
  assert.ok(ctx.givens[0].prior);
  assert.ok(["red", "yellow", "green"].includes(ctx.givens[0].prior.level));
});


test("mintConcernTiles and setConcernReply keep playerAnswer and quality", () => {
  const [tile] = mintConcernTiles({
    moloch: {
      challengeSpeech: "Freeriders.",
      challengeQuestion: "Who defects?",
      playerAnswer: "A bonded escrow pays only after proof.",
      answerQuality: "hit",
      answerFeedback: "Named the bond.",
    },
  }).filter((c) => c.angle === "moloch");
  assert.equal(tile.playerAnswer.includes("escrow"), true);
  assert.equal(tile.answerQuality, "hit");
  const reply = concernReplyText(tile);
  assert.equal(reply.quality, "hit");
  assert.equal(reply.answer.includes("escrow"), true);

  let board = seedCrisisTiles({ crisisRoles: ["local"], pressure: { Floods: 2 } });
  board = summonConcerns(board);
  board = setConcernReply(board, "concern-moloch", {
    playerAnswer: "City hall co-signs the meter.",
    answerQuality: "glance",
    answerFeedback: "Partial.",
    answerPending: false,
  });
  const saved = concernReplyText(board.tiles["concern-moloch"]);
  assert.equal(saved.quality, "glance");
  assert.equal(saved.answer.includes("co-signs"), true);
  const copy = cloneBoard(board);
  assert.equal(copy.tiles["concern-moloch"].playerAnswer, board.tiles["concern-moloch"].playerAnswer);
});

test("heuristic lights: written answer does not ease an undocked concern", () => {
  let board = seedCrisisTiles({
    crisisRoles: ["local"],
    pressure: { Floods: 4 },
    winMax: { Floods: 2 },
  });
  board = summonConcerns(board);
  board = setConcernReply(board, "concern-nature", {
    playerAnswer: "We monitor runoff and cap the pump hours.",
    answerQuality: "hit",
    answerFeedback: "Solid.",
  });
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

  board = liftTile(board, "ai1").board;
  board = applyHeuristicLights(board, {
    year: 2026,
    pressure: { Floods: 4 },
    winMax: { Floods: 2 },
  });
  assert.equal(board.tiles["concern-nature"].lamp, "red");
  assert.equal(
    concernReplyText(board.tiles["concern-nature"]).answer.includes("runoff"),
    true
  );
});

test("mintRdTile rolls a legal factor and stays in the tray", () => {
  const factors = new Set();
  for (let i = 0; i < 4; i++) {
    factors.add(rollRdFactor(() => i / 4));
  }
  assert.deepEqual([...factors].sort((a, b) => a - b), [...RD_FACTORS]);
  const tile = mintRdTile({ id: "rd1", factor: 1.5, rng: () => 0 });
  assert.equal(tile.kind, TILE_KIND.rd);
  assert.equal(tile.name, "R&D");
  assert.equal(tile.factor, 1.5);
  assert.equal(tile.polarity, "curve");
  assert.equal(isPortableTile(tile), true);
  assert.equal(formatFactor(0.75), "0.75×");
  assert.equal(formatFactor(2), "2×");
  let board = createEmptyBoard();
  board = addTile(board, tile);
  assert.equal(unplacedRdTiles(board).length, 1);
  const placed = placeTile(board, "rd1", 0, 0);
  assert.equal(placed.ok, true);
  assert.equal(unplacedRdTiles(placed.board).length, 0);
});

test("pruneStaleConvergences keeps a judged pair after lift; drops it after discard", () => {
  let board = createEmptyBoard();
  board = addTile(
    board,
    mintInventionTile({ id: "a", techId: "ai", howText: "A." })
  );
  board = addTile(
    board,
    mintInventionTile({ id: "b", techId: "ai", howText: "B." })
  );
  let res = placeTile(board, "a", 0, 0);
  assert.equal(res.ok, true);
  board = res.board;
  res = placeTile(board, "b", -1, 0);
  assert.equal(res.ok, true);
  board = res.board;
  board = putConvergence(board, "a", "b", {
    enhancedId: "a",
    factor: 1.25,
    title: "Shared grid",
    reason: "One unblocks the other.",
  });
  assert.equal(Object.keys(board.convergences).length, 1);
  assert.equal(board.tiles.a.convergenceFactor, 1.25);
  assert.equal(board.tiles.b.convergenceFactor, 1.25);
  board = liftTile(board, "a").board;
  board = liftTile(board, "b").board;
  board = pruneStaleConvergences(board);
  assert.equal(Object.keys(board.convergences).length, 1);
  assert.equal(board.tiles.a.convergenceFactor, 1.25);
  assert.equal(board.tiles.b.convergenceFactor, 1.25);
  board = placeTile(board, "a", 0, 0).board;
  board = placeTile(board, "b", -1, 0).board;
  board = putConvergence(board, "a", "b", { factor: 1.25 });
  assert.equal(board.tiles.a.convergenceFactor, 1.25);
  assert.equal(board.tiles.b.convergenceFactor, 1.25);
  const tossed = discardTile(board, "b");
  assert.equal(tossed.ok, true);
  board = tossed.board;
  assert.equal(Object.keys(board.convergences).length, 0);
  assert.equal(board.tiles.a.convergenceFactor, 1.25);
});

/**
 * Integration: Continue round-trips hex board + ideas tray
 * (R&D, AI sparks, user mint) with data-URL art stripped — not rejected.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  addTile,
  createEmptyBoard,
  mintInventionTile,
  mintRdTile,
  unplacedInventionsForTech,
  unplacedRdTiles,
  TILE_KIND,
} from "../hex/board-state.js";
import { snapshotForWire } from "../cloud/continue.js";
import {
  parseRunStateBody,
  applyContinueSnapshot,
  RUN_STATE_MAX_BYTES,
} from "./run-state.mjs";

const DATA = "data:image/png;base64," + "A".repeat(800);

function buildWorkshopBoard() {
  let board = createEmptyBoard();
  board = addTile(board, {
    id: "crisis-local",
    kind: TILE_KIND.crisis,
    q: 0,
    r: 0,
    role: "local",
    name: "Here and now",
    lamp: "red",
  });
  board = addTile(board, mintRdTile({ id: "rd-tray", factor: 1.5, year: 2028 }));
  board = addTile(
    board,
    mintInventionTile({
      id: "inv-spark",
      techId: "iot",
      name: "Street dock",
      howText: "A cooler on the curb for the night market.",
      year: 2028,
      artUrl: DATA,
      artId: "art-spark",
      origin: "sparks",
    })
  );
  board = addTile(
    board,
    mintInventionTile({
      id: "inv-custom",
      techId: "iot",
      name: "My mill fan",
      howText: "A neighborhood fan that dumps heat into the canal.",
      year: 2028,
      artUrl: DATA,
      artId: "art-custom",
      origin: "custom",
    })
  );
  board = addTile(
    board,
    mintInventionTile({
      id: "inv-placed",
      techId: "iot",
      name: "Docked cooler",
      howText: "On the field.",
      year: 2028,
      q: 1,
      r: 0,
      origin: "sparks",
    })
  );
  return board;
}

describe("Continue hex + ideas tray round-trip", () => {
  it("raw board with data:image art is huge / would have failed the old PUT", () => {
    const board = buildWorkshopBoard();
    const raw = JSON.stringify({ questId: "q1", board });
    assert.ok(
      raw.includes("data:image"),
      "fixture must include inline art like Ask-for-ideas / Mint tile"
    );
    assert.ok(
      raw.length > 400 || raw.includes("data:image"),
      "inline art is what used to 413 or inline_art the whole snapshot"
    );
  });

  it("snapshotForWire + parse keeps R&D, AI idea, user mint, and placed tile", () => {
    const board = buildWorkshopBoard();
    const wire = snapshotForWire({
      questId: "gen-air-test",
      year: 2028,
      tutor: false,
      runId: "run-1",
      board,
      play: {
        focusedTechId: "iot",
        sparkBatches: {
          iot: { ids: ["inv-spark"], titles: ["Street dock"] },
        },
        ideas: {
          "gen-air-test|iot|2028|place": [
            { id: "dock", title: "Street dock", insertText: "A cooler on the curb." },
          ],
        },
      },
    });
    assert.ok(!JSON.stringify(wire).includes("data:image"));
    assert.ok(JSON.stringify(wire).length < RUN_STATE_MAX_BYTES);

    const parsed = parseRunStateBody({
      questId: "gen-air-test",
      year: 2028,
      board, // still has data: URLs — server must strip, not reject
      play: wire.play,
    });
    assert.equal(parsed.ok, true, parsed.error);
    const hex = parsed.state.board;
    assert.ok(hex.tiles["crisis-local"], "crisis stays on-field");
    assert.equal(unplacedRdTiles(hex).some((t) => t.id === "rd-tray"), true);
    const tray = unplacedInventionsForTech(hex, "iot");
    const spark = tray.find((t) => t.id === "inv-spark");
    const custom = tray.find((t) => t.id === "inv-custom");
    assert.ok(spark, "AI idea stays in tray");
    assert.equal(spark.origin, "sparks");
    assert.ok(spark.howText.includes("curb"));
    assert.ok(!String(spark.artUrl || "").startsWith("data:"));
    assert.equal(spark.artId, "art-spark");
    assert.ok(custom, "user mint stays in tray");
    assert.equal(custom.origin, "custom");
    assert.ok(custom.howText.includes("canal"));
    const placed = hex.tiles["inv-placed"];
    assert.equal(placed.q, 1);
    assert.equal(placed.r, 0);
    assert.equal(parsed.state.play.focusedTechId, "iot");
    assert.deepEqual(parsed.state.play.sparkBatches.iot.ids, ["inv-spark"]);

    const restored = applyContinueSnapshot(
      { cloudRunId: null, hexBoard: createEmptyBoard(), year: 2026, tutorSessionActive: false },
      parsed.state
    );
    assert.equal(restored.skipSeed, true);
    assert.equal(unplacedRdTiles(restored.hexBoard).some((t) => t.id === "rd-tray"), true);
    const restoredTray = unplacedInventionsForTech(restored.hexBoard, "iot");
    assert.ok(restoredTray.some((t) => t.origin === "sparks"));
    assert.ok(restoredTray.some((t) => t.origin === "custom"));
  });
});

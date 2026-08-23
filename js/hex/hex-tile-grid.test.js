import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BITS,
  ATOMS,
  EDGE,
  facePolarity,
  canDock,
  makeGrid,
  hexToPixel,
  rectSlots,
} from "./hex-tile-grid.js";

test("split hex: left bits, right atoms", () => {
  assert.equal(facePolarity("split", EDGE.W), BITS);
  assert.equal(facePolarity("split", EDGE.NW), BITS);
  assert.equal(facePolarity("split", EDGE.SW), BITS);
  assert.equal(facePolarity("split", EDGE.E), ATOMS);
  assert.equal(facePolarity("split", EDGE.NE), ATOMS);
  assert.equal(facePolarity("split", EDGE.SE), ATOMS);
});

test("AI (bits) docks on IoT bits face, not atoms face", () => {
  // From IoT: west face is bits, east face is atoms.
  assert.equal(canDock("split", BITS, EDGE.W), true);
  assert.equal(canDock("split", BITS, EDGE.E), false);
  // From AI: looking east into IoT's west (bits) works; looking west into IoT's east (atoms) fails.
  assert.equal(canDock(BITS, "split", EDGE.E), true);
  assert.equal(canDock(BITS, "split", EDGE.W), false);
});

test("drones (atoms) dock on IoT atoms face, not bits face", () => {
  // IoT east face is atoms: drones sit to the east, looking west.
  assert.equal(canDock("split", ATOMS, EDGE.E), true);
  assert.equal(canDock("split", ATOMS, EDGE.W), false);
  assert.equal(canDock(ATOMS, "split", EDGE.W), true);
  assert.equal(canDock(ATOMS, "split", EDGE.E), false);
});

test("AI will not dock on drones", () => {
  assert.equal(canDock(BITS, ATOMS, EDGE.E), false);
  assert.equal(canDock(BITS, ATOMS, EDGE.W), false);
});

test("grid occupy rejects AI on IoT atoms side", () => {
  const g = makeGrid();
  assert.equal(g.occupy(0, 0, { id: "iot", polarity: "split" }).ok, true);
  // East of IoT is atoms
  const east = g.occupy(1, 0, { id: "ai", polarity: BITS });
  assert.equal(east.ok, false);
  // West of IoT is bits
  const west = g.occupy(-1, 0, { id: "ai", polarity: BITS });
  assert.equal(west.ok, true);
});

test("curve docks to an idea or a constraint, not into empty polarity", () => {
  assert.equal(canDock("curve", ATOMS, EDGE.W), true);
  assert.equal(canDock("curve", BITS, EDGE.E), true);
  const g = makeGrid();
  g.occupy(0, 0, { id: "hop", polarity: ATOMS });
  assert.equal(g.occupy(1, 0, { id: "trend", polarity: "curve" }).ok, true);
});

test("rectSlots fills a rectangle that fits the board viewBox", () => {
  const view = { size: 100, origin: { x: 180, y: 120 }, viewW: 1400, viewH: 900 };
  const slots = rectSlots({ rows: 5, cols: 7, q0: 0 });
  assert.equal(slots.length, 35);
  const halfW = (Math.sqrt(3) / 2) * view.size;
  const xs = (row) =>
    slots.filter((s) => s.r === row).map((s) => hexToPixel(s.q, s.r, view.size, view.origin).x);
  const top = xs(0);
  const bottom = xs(4);
  assert.equal(top.length, 7);
  assert.equal(bottom.length, 7);
  assert.ok(Math.abs(Math.min(...top) - Math.min(...bottom)) < 1e-6);
  assert.ok(Math.abs(Math.max(...top) - Math.max(...bottom)) < 1e-6);
  for (const s of slots) {
    const { x, y } = hexToPixel(s.q, s.r, view.size, view.origin);
    assert.ok(x - halfW >= 0, `left clip q=${s.q} r=${s.r}`);
    assert.ok(x + halfW <= view.viewW, `right clip q=${s.q} r=${s.r}`);
    assert.ok(y - view.size >= 0, `top clip q=${s.q} r=${s.r}`);
    assert.ok(y + view.size <= view.viewH, `bottom clip q=${s.q} r=${s.r}`);
  }
});

test("extra left hexes on rows 2 and 4 stay inside the viewBox", () => {
  const view = { size: 100, origin: { x: 180, y: 120 }, viewW: 1400, viewH: 900 };
  const slots = rectSlots({ rows: 5, cols: 7, q0: 0, extraLeftRows: [1, 3] });
  assert.equal(slots.length, 37);
  assert.equal(slots.filter((s) => s.r === 1).length, 8);
  assert.equal(slots.filter((s) => s.r === 3).length, 8);
  assert.ok(slots.some((s) => s.q === -1 && s.r === 1));
  assert.ok(slots.some((s) => s.q === -2 && s.r === 3));
  const halfW = (Math.sqrt(3) / 2) * view.size;
  for (const s of slots) {
    const { x, y } = hexToPixel(s.q, s.r, view.size, view.origin);
    assert.ok(x - halfW >= 0, `left clip q=${s.q} r=${s.r}`);
    assert.ok(x + halfW <= view.viewW, `right clip q=${s.q} r=${s.r}`);
    assert.ok(y - view.size >= 0, `top clip q=${s.q} r=${s.r}`);
    assert.ok(y + view.size <= view.viewH, `bottom clip q=${s.q} r=${s.r}`);
  }
});

test("grid occupy accepts drones on IoT atoms side", () => {
  const g = makeGrid();
  g.occupy(0, 0, { id: "iot", polarity: "split" });
  assert.equal(g.occupy(1, 0, { id: "drones", polarity: ATOMS }).ok, true);
  const edges = g.bonds();
  assert.equal(edges.length, 1);
  assert.equal(edges[0].polarity, ATOMS);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  layoutHexLabel,
  estimateTextWidth,
  maxLabelWidth,
  ellipsize,
} from "./hex-label.js";

test("short name → one line, not truncated", () => {
  const layout = layoutHexLabel("Staff Loss", { size: 100, hasBar: false });
  assert.equal(layout.lines.length, 1);
  assert.equal(layout.lines[0], "Staff Loss");
  assert.equal(layout.truncated, false);
  assert.ok(estimateTextWidth(layout.lines[0], layout.fontSize) <= layout.maxWidth);
});

test("Clock-Out Cluster Board wraps to two lines without cropping Boar", () => {
  const layout = layoutHexLabel("Clock-Out Cluster Board", {
    size: 100,
    hasBar: true,
  });
  assert.ok(layout.lines.length <= 2);
  const joined = layout.lines.join(" ");
  assert.ok(!joined.includes("Boar") || joined.includes("Board"));
  assert.ok(joined.includes("Board") || joined.includes("…"));
  // Prefer full word when it fits
  if (!layout.truncated) {
    assert.ok(layout.lines.some((l) => l.includes("Board")));
    assert.ok(!layout.lines.some((l) => /Boar$/.test(l) && !/Board/.test(l)));
  }
  for (const line of layout.lines) {
    assert.ok(
      estimateTextWidth(line, layout.fontSize) <= layout.maxWidth + 0.5,
      `line too wide: ${line}`
    );
  }
});

test("Night Roster Gap Simulation fits without mid-word Simul crop", () => {
  const layout = layoutHexLabel("Night Roster Gap Simulation", {
    size: 100,
    hasBar: true,
  });
  assert.ok(layout.lines.length <= 2);
  const joined = layout.lines.join(" ");
  assert.ok(!/\bSimul\b/.test(joined));
  if (!layout.truncated) {
    assert.ok(joined.includes("Simulation") || joined.includes("Simulat"));
  }
  for (const line of layout.lines) {
    assert.ok(estimateTextWidth(line, layout.fontSize) <= layout.maxWidth + 0.5);
  }
});

test("60-char title → at most two lines; ellipsis if needed; width ≤ max", () => {
  const title = "A".repeat(60);
  const layout = layoutHexLabel(title, { size: 100, hasBar: true });
  assert.ok(layout.lines.length <= 2);
  assert.equal(layout.truncated, true);
  assert.ok(layout.lines[layout.lines.length - 1].endsWith("…"));
  for (const line of layout.lines) {
    assert.ok(estimateTextWidth(line, layout.fontSize) <= layout.maxWidth + 0.5);
  }
});

test("empty name handled", () => {
  const layout = layoutHexLabel("", { size: 100, hasBar: true });
  assert.equal(layout.lines.length, 1);
  assert.equal(layout.lines[0], "");
  assert.equal(layout.truncated, false);
  assert.ok(layout.barY != null);
});

test("feasibility bar sits under last line", () => {
  const layout = layoutHexLabel("Night Fear", { size: 100, hasBar: true, cy: 200 });
  assert.ok(layout.barY != null);
  assert.ok(layout.barY > layout.lineYs[layout.lineYs.length - 1]);
});

test("maxLabelWidth is ~82% of flat-to-flat", () => {
  const size = 100;
  const expected = Math.sqrt(3) * size * 0.82;
  assert.ok(Math.abs(maxLabelWidth(size) - expected) < 0.01);
});

test("ellipsize respects max width", () => {
  const fs = 14;
  const maxW = 80;
  const out = ellipsize("Night Roster Gap Simulation", fs, maxW);
  assert.ok(out.endsWith("…"));
  assert.ok(estimateTextWidth(out, fs) <= maxW + 0.5);
});

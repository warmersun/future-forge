import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateCapabilityTrend } from "./capability-trend.js";
import {
  buildTrendChartConfig,
  formatTrendValue,
  destroyTrendChart,
} from "./trend-chart.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(
  __dirname,
  "../test/fixtures/trends/gene-seq-cost-per-genome.json"
);

describe("trend-chart", () => {
  const trend = validateCapabilityTrend(
    JSON.parse(fs.readFileSync(FIXTURE, "utf8"))
  ).trend;

  it("formatTrendValue handles ranges", () => {
    assert.match(formatTrendValue(1000, "USD"), /1,?000/);
    assert.match(formatTrendValue(1e25), /e\+/i);
  });

  it("buildTrendChartConfig uses log Y and linear X", () => {
    const cfg = buildTrendChartConfig(trend, {
      yearNow: 2026,
      yearNext: 2028,
      spotlight: true,
    });
    assert.equal(cfg.options.scales.y.type, "logarithmic");
    assert.equal(cfg.options.scales.x.type, "linear");
    assert.equal(cfg.options.scales.x.min, 2001);
    assert.equal(cfg.options.scales.x.max, 2036);
    assert.ok(cfg.data.datasets[0].data.every((p) => p.y > 0));
    assert.equal(cfg.data.datasets[1].data.length, 2); // reached
    assert.equal(cfg.data.datasets[2].data.length, 1); // predicted
    const ann = cfg.options.plugins.annotation.annotations;
    assert.equal(ann.nowLine.xMin, 2026);
    assert.equal(ann.nextLine.xMin, 2028);
  });

  it("tooltip filter hides curve points", () => {
    const cfg = buildTrendChartConfig(trend, { yearNow: 2026, yearNext: 2028 });
    const filter = cfg.options.plugins.tooltip.filter;
    assert.equal(filter({ datasetIndex: 0 }), false);
    assert.equal(filter({ datasetIndex: 1 }), true);
  });

  it("destroyTrendChart tolerates null", () => {
    destroyTrendChart(null);
    destroyTrendChart({ destroy() {} });
  });
});

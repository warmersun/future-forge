import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateCapabilityTrend, valueAtYear } from "./capability-trend.js";
import {
  buildTrendChartConfig,
  formatTrendValue,
  destroyTrendChart,
  trendValueInDomain,
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

  it("keeps Wait defaults and offers a dashed Quest-year model", () => {
    const defaults = buildTrendChartConfig(trend, { yearNow: 2026, yearNext: 2028 });
    assert.equal(defaults.data.datasets[0].label, "Trend");
    assert.equal(defaults.data.datasets[0].borderDash, undefined);
    assert.equal(defaults.options.plugins.annotation.annotations.nowLine.label.content, "now");
    assert.ok(defaults.options.plugins.annotation.annotations.nextLine);
    const cfg = buildTrendChartConfig(trend, {
      yearNow: 2026, nowLabel: "Quest year", dashedModel: true,
    });
    assert.deepEqual(cfg.data.datasets.map((d) => d.label), ["Trend model", "Reached", "Predicted"]);
    assert.deepEqual(cfg.data.datasets[0].borderDash, [6, 4]);
    const annotations = cfg.options.plugins.annotation.annotations;
    assert.equal(annotations.nowLine.xMin, 2026);
    assert.equal(annotations.nowLine.xMax, 2026);
    assert.equal(annotations.nowLine.label.content, "Quest year");
    assert.equal(annotations.nextLine, undefined);
  });

  it("extends display only, and omits current values outside the domain", () => {
    for (const year of [1990, 2050]) {
      const cfg = buildTrendChartConfig(trend, {
        yearNow: year, displayMin: Math.min(year, trend.domain.start),
        displayMax: Math.max(year, trend.domain.end),
      });
      assert.ok(cfg.options.scales.x.min <= year && cfg.options.scales.x.max >= year);
      assert.ok(cfg.data.datasets[0].data.every((p) => p.x >= trend.domain.start && p.x <= trend.domain.end));
      assert.equal(trendValueInDomain(trend, year), null);
    }
    assert.equal(trendValueInDomain(trend, trend.domain.start), valueAtYear(trend, trend.domain.start));
    assert.equal(trendValueInDomain(trend, trend.domain.end), valueAtYear(trend, trend.domain.end));
    assert.equal(trendValueInDomain(trend, null), null);
  });

  it("retains descending values, off-curve markers and authored statuses", () => {
    const input = structuredClone(trend);
    input.milestones = [
      { year: 2030, date: "2030", value: 12345, status: "reached", label: "Reached later" },
      { year: 2005, date: "2005", value: 3, status: "predicted", label: "Predicted earlier" },
    ];
    const cfg = buildTrendChartConfig(input, { yearNow: 2020, explorerTicks: true });
    const curve = cfg.data.datasets[0].data;
    assert.ok(curve[0].y > curve.at(-1).y);
    assert.deepEqual(cfg.data.datasets[1].data.map((m) => [m.x, m.y, m.status]), [[2030, 12345, "reached"]]);
    assert.deepEqual(cfg.data.datasets[2].data.map((m) => [m.x, m.y, m.status]), [[2005, 3, "predicted"]]);
    assert.notEqual(valueAtYear(input, 2030), 12345);
    assert.equal(input.milestones[1].status, "predicted");
    const ticks = cfg.options.scales.y.ticks.callback;
    assert.notEqual(ticks(1.2), "");
    assert.notEqual(ticks(1.3), "");
    assert.notEqual(ticks(100.1), ticks(100.2));
    assert.equal(ticks(0), "");
    assert.equal(ticks(-1), "");
    assert.equal(buildTrendChartConfig(input).options.scales.y.ticks.callback(1.2), "");
  });

  it("notifies with the laid-out chart for initial and later layouts", () => {
    const received = [];
    const cfg = buildTrendChartConfig(trend, { onLayout: (chart) => received.push(chart) });
    const plugin = cfg.plugins.find((p) => p.id === "trendChartLayout");
    const chart = { scales: { x: { getPixelForValue: (y) => y - 2000 } }, chartArea: { left: 40, right: 500 } };
    plugin.afterLayout(chart);
    chart.chartArea.right = 300;
    plugin.afterLayout(chart);
    assert.equal(received.length, 2);
    assert.equal(received[1].scales.x.getPixelForValue(2026), 26);
    assert.equal(received[1].chartArea.right, 300);
    assert.equal(buildTrendChartConfig(trend).plugins, undefined);
  });

  it("destroyTrendChart tolerates null", () => {
    destroyTrendChart(null);
    destroyTrendChart({ destroy() {} });
  });
});

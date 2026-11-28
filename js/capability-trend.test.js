/*
Copyright © 2026 Warmer Sun Education, a sole proprietorship by Tamas Simon

This file is part of Future Forge.

Future Forge is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Future Forge is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Future Forge. If not, see <https://www.gnu.org/licenses/>.
*/

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseTrendJson,
  validateCapabilityTrend,
  yearFromDate,
  valueAtYear,
  sampleCurve,
  mergeTrendsForStack,
  CAPABILITY_TREND_SCHEMA,
} from "./capability-trend.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(
  __dirname,
  "../test/fixtures/trends/gene-seq-cost-per-genome.json"
);
const FIXTURE_AI = path.join(
  __dirname,
  "../test/fixtures/trends/ai-training-flops-frontier.json"
);

describe("capability-trend", () => {
  it("yearFromDate parses year and ISO", () => {
    assert.equal(yearFromDate("2014"), 2014);
    assert.ok(Math.abs(yearFromDate("2015-01-01") - 2015) < 0.01);
    assert.ok(yearFromDate("2015-07-01") > 2015.4);
    assert.equal(yearFromDate(""), null);
  });

  it("validates gene-seq fixture", () => {
    const raw = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
    const r = validateCapabilityTrend(raw);
    assert.equal(r.ok, true);
    assert.equal(r.trend.schema, CAPABILITY_TREND_SCHEMA);
    assert.equal(r.trend.techId, "gene-sequencing");
    assert.equal(r.trend.compounding.kind, "halving");
    assert.equal(r.trend.milestones.length, 3);
    assert.equal(r.trend.domain.start, 2001);
    assert.equal(r.trend.domain.end, 2036);
  });

  it("validates ai cagr fixture", () => {
    const raw = JSON.parse(fs.readFileSync(FIXTURE_AI, "utf8"));
    const r = validateCapabilityTrend(raw);
    assert.equal(r.ok, true);
    assert.equal(r.trend.compounding.kind, "cagr");
    assert.ok(r.trend.compounding.annualRate > 0);
  });

  it("rejects bad techId and non-positive values", () => {
    const raw = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
    const badTech = validateCapabilityTrend({ ...raw, techId: "nope" });
    assert.equal(badTech.ok, false);
    assert.ok(badTech.details.some((d) => d.startsWith("bad_techId")));

    const badVal = validateCapabilityTrend({
      ...raw,
      anchor: { date: "2015", value: 0 },
    });
    assert.equal(badVal.ok, false);
  });

  it("parseTrendJson handles invalid JSON", () => {
    assert.equal(parseTrendJson("{nope").ok, false);
    assert.equal(parseTrendJson("[]").ok, false);
  });

  it("valueAtYear / sampleCurve stay positive for halving", () => {
    const raw = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
    const { trend } = validateCapabilityTrend(raw);
    const v2015 = valueAtYear(trend, 2015);
    const v2016_5 = valueAtYear(trend, 2016.5);
    assert.ok(v2015 > 0);
    assert.ok(Math.abs(v2015 - 4000) < 1);
    // one halving period later → ~2000
    assert.ok(Math.abs(v2016_5 - 2000) < 1);
    const samples = sampleCurve(trend, 20);
    assert.ok(samples.length >= 10);
    assert.ok(samples.every((p) => p.y > 0));
  });

  it("mergeTrendsForStack filters, overlays quest, spotlights, caps", () => {
    const gene = validateCapabilityTrend(
      JSON.parse(fs.readFileSync(FIXTURE, "utf8"))
    ).trend;
    const ai = validateCapabilityTrend(
      JSON.parse(fs.readFileSync(FIXTURE_AI, "utf8"))
    ).trend;

    assert.deepEqual(
      mergeTrendsForStack({
        catalog: [gene, ai],
        selectedTechIds: [],
      }),
      []
    );

    const onlyGene = mergeTrendsForStack({
      catalog: [gene, ai],
      selectedTechIds: ["gene-sequencing"],
    });
    assert.equal(onlyGene.length, 1);
    assert.equal(onlyGene[0].id, gene.id);

    const questOverride = {
      ...gene,
      name: "Quest override name",
      id: gene.id,
    };
    const merged = mergeTrendsForStack({
      catalog: [gene, ai],
      questTrends: [questOverride],
      spotlightTrendIds: [gene.id],
      selectedTechIds: ["gene-sequencing", "ai"],
      spotlightTechId: "gene-sequencing",
    });
    assert.equal(merged.length, 2);
    assert.equal(merged[0].id, gene.id);
    assert.equal(merged[0].spotlight, true);
    assert.equal(merged[0].name, "Quest override name");
    assert.equal(merged[0].source, "quest");

    const capped = mergeTrendsForStack({
      catalog: Array.from({ length: 12 }, (_, i) => ({
        ...gene,
        id: `t-${i}`,
        name: `Trend ${String(i).padStart(2, "0")}`,
      })),
      selectedTechIds: ["gene-sequencing"],
      limit: 8,
    });
    assert.equal(capped.length, 8);

    const allEmptyStack = mergeTrendsForStack({
      catalog: [gene, ai],
      selectedTechIds: [],
      includeAll: true,
    });
    assert.equal(allEmptyStack.length, 2);
    assert.ok(allEmptyStack.some((t) => t.id === gene.id));
    assert.ok(allEmptyStack.some((t) => t.id === ai.id));

    const allUncapped = mergeTrendsForStack({
      catalog: Array.from({ length: 12 }, (_, i) => ({
        ...gene,
        id: `all-${i}`,
        name: `All ${String(i).padStart(2, "0")}`,
      })),
      selectedTechIds: [],
      includeAll: true,
      limit: 8,
    });
    assert.equal(allUncapped.length, 12);

    const noCurve = validateCapabilityTrend({
      schema: CAPABILITY_TREND_SCHEMA,
      id: "quantum-random-number-generation",
      techId: "quantum-internet",
      axis: "speed",
      name: "Hardware quantum random numbers",
      summary:
        "Quantum random number generators turn single-photon detection into unpredictable encryption keys.",
      capability: "Generate physical randomness from quantum photon fluctuations.",
      trendSummary:
        "Commercial quantum entropy cards now ship for data centers and telecom key seeding.",
      milestones: [
        {
          id: "qrng-2026",
          label: "Commercial entropy cards ship",
          date: "2026",
          status: "reached",
          useCases: [
            {
              title: "Hardware key seeding",
              blurb: "Seed municipal and clinic encryption keys from quantum photon entropy.",
              world: "bits",
            },
          ],
        },
      ],
    });
    assert.equal(noCurve.ok, true);
    assert.equal(noCurve.trend.hasCurve, false);
    assert.equal(valueAtYear(noCurve.trend, 2026), null);
    assert.deepEqual(sampleCurve(noCurve.trend, 10), []);

    const curvesOnly = mergeTrendsForStack({
      catalog: [gene, noCurve.trend],
      selectedTechIds: ["gene-sequencing", "quantum-internet"],
      curvesOnly: true,
    });
    assert.deepEqual(
      curvesOnly.map((t) => t.id),
      [gene.id]
    );
  });

  it("rejects partial curve fields, missing trendSummary, and missing useCases", () => {
    const raw = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
    const partial = validateCapabilityTrend({
      id: "partial-curve",
      techId: "ai",
      name: "Partial",
      summary: "Summary text.",
      capability: "Partial curve.",
      trendSummary: "Short trajectory.",
      unit: "units",
      milestones: [
        {
          label: "Step one",
          date: "2026",
          status: "reached",
          useCases: [{ title: "Use", blurb: "Blurb" }],
        },
      ],
    });
    assert.equal(partial.ok, false);
    assert.ok(partial.details.includes("partial_curve_fields"));

    const noSummary = validateCapabilityTrend({ ...raw, trendSummary: "" });
    assert.equal(noSummary.ok, false);
    assert.ok(noSummary.details.includes("missing_trendSummary"));

    const noUses = validateCapabilityTrend({
      ...raw,
      useCases: undefined,
      milestones: raw.milestones.map(({ useCases: _u, ...m }) => m),
    });
    assert.equal(noUses.ok, false);
    assert.ok(noUses.details.includes("missing_use_cases"));
  });
});

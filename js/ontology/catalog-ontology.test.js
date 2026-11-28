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
import { TECHS } from "../data.js";
import {
  catalogTrack,
  trendRateSummary,
  mergeExternalMilestones,
} from "./catalog-ontology.js";
import { resolveTechTrack, authoredStatus, selectPlayableMilestones } from "./index.js";

describe("catalog ontology", () => {
  it("resolves every catalog tech with a reached and a predicted milestone in under 5ms", () => {
    const t0 = performance.now();
    for (const tech of TECHS) {
      const track = catalogTrack(tech.id);
      assert.ok(track, tech.id);
      assert.equal(track.world, tech.polarity);
      const reached = track.milestones.filter((m) => m.status === "reached" && m.year <= 2026);
      const predicted = track.milestones.filter((m) => m.status === "predicted" && m.year > 2026);
      assert.ok(reached.length >= 1, tech.id);
      assert.ok(predicted.length >= 1, tech.id);
      for (const m of track.milestones) {
        assert.ok(m.useCases.length >= 2, `${tech.id} ${m.id}`);
        assert.ok(m.useCases.length <= 3, `${tech.id} ${m.id}`);
      }
    }
    assert.ok(performance.now() - t0 < 5, "catalog resolve should stay under 5ms");
  });

  it("describes a halving trend as a plain rate", () => {
    const text = trendRateSummary({
      name: "Training cost",
      unit: "$ / model",
      compounding: { kind: "halving", periodYears: 1.5 },
    });
    assert.equal(text, "Cost halves about every 18 months");
  });

  it("does not relabel a predicted bank row when the year is still ahead", () => {
    const base = catalogTrack("ai");
    const merged = mergeExternalMilestones(base, [
      {
        id: "edge-later",
        year: 2029,
        kind: "prediction",
        techIds: ["ai"],
        headline: "Offline agents hold a week of tutoring",
        claimBand: "near",
        sourceNote: "test bank",
      },
    ]);
    const row = merged.milestones.find((m) => m.id.includes("edge-later"));
    assert.equal(row.status, "predicted");
    assert.equal(row.origin, "bank");
    assert.equal(authoredStatus(row), "predicted");
  });

  it("resolveTechTrack keeps predicted status after a year argument", () => {
    const track = resolveTechTrack("drones", { predictions: [], trends: [] });
    const forecast = track.milestones.find((m) => m.status === "predicted");
    assert.ok(forecast.year > 2026);
    assert.equal(authoredStatus(forecast), "predicted");
  });

  it("curates all 29 catalog techs with non-boilerplate labels and parses ISO trend milestone dates", () => {
    for (const tech of TECHS) {
      const track = catalogTrack(tech.id);
      for (const m of track.milestones) {
        assert.doesNotMatch(m.label, /is already a local tool/i, tech.id);
      }
    }
    const seq = catalogTrack("gene-sequencing");
    const merged = mergeExternalMilestones(seq, [], [
      {
        id: "gene-seq-cost-per-genome",
        techId: "gene-sequencing",
        capability: "Affordable whole-genome sequencing",
        unit: "USD / genome",
        milestones: [
          { id: "hundred-dollar", label: "$100 genome", date: "2027", value: 100, status: "predicted" },
        ],
      },
    ]);
    const hit = merged.milestones.find((m) => m.label === "$100 genome");
    assert.ok(hit);
    assert.equal(hit.year, 2027);
    assert.equal(hit.status, "predicted");

    const playable = selectPlayableMilestones(
      [
        { id: "t-1999", year: 1999, label: "~$25/bp", status: "reached", origin: "trend" },
        { id: "t-2015", year: 2015, label: "Twist $0.10", status: "reached", origin: "trend" },
        { id: "h-2018", year: 2018, label: "History", status: "reached", origin: "catalog", isHistoryAnchor: true },
        { id: "c-2026", year: 2026, label: "Catalog 2026", status: "reached", origin: "catalog" },
        { id: "q-2026", year: 2026, label: "Quest 2026", status: "reached", origin: "quest" },
        { id: "c-2029", year: 2029, label: "Catalog forecast", status: "predicted", origin: "catalog" },
        { id: "b-2031", year: 2031, label: "Bank forecast", status: "predicted", origin: "bank" },
      ],
      2026
    );
    assert.deepEqual(
      playable.map((m) => m.id),
      ["q-2026", "c-2029", "b-2031"]
    );
  });

  it("uses v2 authored milestone useCases and filters playable milestones by activeCapabilityId", () => {
    const base = catalogTrack("quantum-internet");
    const qrng = {
      id: "quantum-random-number-generation",
      techId: "quantum-internet",
      name: "Hardware quantum random numbers",
      capability: "Physical randomness from quantum photons.",
      trendSummary: "Commercial quantum entropy cards ship for hardware key seeding.",
      hasCurve: false,
      milestones: [
        {
          id: "qrng-2026",
          label: "Commercial entropy cards ship",
          date: "2026",
          year: 2026,
          status: "reached",
          useCases: [
            { title: "Clinic key seeding", blurb: "Seed local medical record keys from quantum entropy.", world: "bits" },
          ],
        },
      ],
    };
    const qkd = {
      id: "qkd-fiber-distance-km",
      techId: "quantum-internet",
      name: "Fiber quantum key distance",
      capability: "Exchange tamper-evident encryption keys over optical fiber.",
      trendSummary: "Twin-field fiber quantum key distribution reached 1,002 km.",
      hasCurve: true,
      milestones: [
        {
          id: "qkd-2023",
          label: "1,002 km twin-field fiber link",
          date: "2023",
          year: 2023,
          status: "reached",
          useCases: [
            { title: "Metro hospital ring", blurb: "Link regional hospitals over tamper-evident fiber.", world: "bits" },
          ],
        },
      ],
    };
    const merged = mergeExternalMilestones(base, [], [qrng, qkd]);
    const activeQrng = selectPlayableMilestones(merged.milestones, 2026, new Set(), {
      activeCapabilityId: "quantum-random-number-generation",
    });
    const qrngMs = activeQrng.find((m) => m.capabilityId === "quantum-random-number-generation");
    assert.ok(qrngMs);
    assert.equal(qrngMs.useCases[0].title, "Clinic key seeding");
    assert.equal(activeQrng.some((m) => m.capabilityId === "qkd-fiber-distance-km"), false);
  });
});

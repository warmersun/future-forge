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
import {
  resolveTechTrack,
  isForecastEarly,
  milestonePlayable,
  buildBackcastCandidates,
  matchIdeaToOntology,
} from "./index.js";

describe("resolveTechTrack", () => {
  it("prefers structured quest ontology over the catalog label", () => {
    const track = resolveTechTrack("ai", {
      quest: {
        ontology: [
          {
            techId: "ai",
            capability: "Room-owned exam tutor",
            trendSummary: "Fits on a secondhand laptop.",
            milestones: [
              {
                year: 2026,
                label: "Offline exam help is real",
                status: "reached",
                useCases: [
                  { title: "Stairwell tutor", blurb: "Night school, no cloud." },
                  { title: "Form check", blurb: "Custody of the learner's words." },
                ],
              },
            ],
          },
        ],
      },
    });
    const questRow = track.milestones.find((m) => m.label === "Offline exam help is real");
    assert.ok(questRow);
    assert.equal(questRow.origin, "quest");
    assert.equal(questRow.status, "reached");
    assert.equal(track.capability, "Room-owned exam tutor");
    assert.equal(isForecastEarly(questRow, 2026), false);
    assert.equal(milestonePlayable(questRow, 2026), true);
  });

  it("parses spotlight grounding when no ontology block is present", () => {
    const track = resolveTechTrack("ai", {
      quest: {
        spotlight: { techId: "ai" },
        startYear: 2026,
        grounding: `## Technology
- **emTech:** ai
- **Product category:** Edge tutors

## Capabilities
On-device exam help.

## Trends & predictions
Forecast, not a lock.

## Milestone
Around 2026 private tutoring fits a laptop.

## Unlocks Use Case(s)
Room-only tutoring that stays in the stairwell.

## Applications
A device cart with a volunteer runbook.
`,
      },
    });
    assert.ok(track.milestones.some((m) => m.origin === "quest" && m.status === "reached"));
    const forecast = track.milestones.find((m) => m.status === "predicted");
    assert.equal(isForecastEarly(forecast, 2026), true);
    assert.equal(milestonePlayable(forecast, forecast.year), true);
    assert.equal(forecast.status, "predicted");
  });

  it("matches a tech-free idea to a grounded emTech, milestone, and use case, or flags beyondForecasts", () => {
    const candidates = buildBackcastCandidates({
      howText: "Portable field pathogen sequencer gives same-shift reads at border clinics.",
      title: "Clinic Swab Sequencer",
      year: 2026,
    });
    assert.ok(candidates.catalogTechIds.length >= 25);
    assert.ok(candidates.tracks.some((t) => t.techId === "gene-sequencing"));

    const reachedMatch = matchIdeaToOntology({
      howText: "Portable clinic pathogen sequencer reads swabs on site within one shift.",
      title: "Clinic Swab Sequencer",
      techId: null,
      year: 2026,
      timingLevel: "green",
      timingReason: "Portable field sequencers exist in 2026.",
    });
    assert.equal(reachedMatch.techId, "gene-sequencing");
    assert.equal(reachedMatch.beyondForecasts, false);
    assert.ok(reachedMatch.milestone);
    assert.ok(reachedMatch.milestone.year <= 2026);
    assert.ok(reachedMatch.useCase?.title);

    const sciFiGap = matchIdeaToOntology({
      howText: "Instant mind upload chip transfers every teacher's memory in 2 seconds.",
      title: "Mind Upload Chip",
      techId: "bci",
      year: 2026,
      timingLevel: "red",
      timingReason: "Mind upload is sci-fi and beyond known forecasts.",
    });
    assert.equal(sciFiGap.beyondForecasts, true);
    assert.equal(sciFiGap.milestone, null);
    assert.match(sciFiGap.gapReason, /sci-fi|beyond/i);
  });

  it("leaves ideas without a supported catalog match unresolved", () => {
    const opts = {
      howText: "Qzxy qwzx jxzz.",
      world: "atoms",
      quest: { spotlight: { techId: "battery" } },
      aiBackcast: { techId: "not-in-catalog" },
      timingLevel: "red",
    };
    assert.deepEqual(buildBackcastCandidates(opts).tracks, []);
    const match = matchIdeaToOntology(opts);
    assert.equal(match.techId, null);
    assert.equal(match.milestone, null);
    assert.equal(match.useCase, null);
  });
});

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
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseGrounding, parseGroundingTechId } from "./grounding-parser.js";
import { resolveTechTrack } from "./index.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

const SAMPLE = `
## Technology
- **emTech:** ai
- **Product category:** Open-weight, edge-runnable language assistants

## Capabilities
Explain a stuck exam step on hardware a community controls.

## Trends & predictions
**Forecast (not lock):** offline tutoring on secondhand laptops becomes routine.

## Milestone
Around 2026, capable open-weight models make private classroom assistance realistic.

## Unlocks Use Case(s)
Room-only tutoring that never crosses a monitored gateway; form and rights help with custody of the learner's words.

## Applications
Shared device carts with a volunteer runbook.

## Honest limits
Keep human review on legal answers.
`;

describe("grounding parser", () => {
  it("reads the spotlight chain into a quest milestone and use cases", () => {
    const parsed = parseGrounding(SAMPLE, { world: "bits" });
    assert.equal(parsed.techId, "ai");
    assert.equal(parseGroundingTechId(SAMPLE), "ai");
    assert.equal(parsed.milestones.length, 1);
    assert.equal(parsed.milestones[0].status, "reached");
    assert.equal(parsed.milestones[0].year, 2026);
    assert.equal(parsed.milestones[0].origin, "quest");
    assert.equal(parsed.milestones[0].useCases.length, 2);
    assert.deepEqual(parsed.applicationHints, ["Shared device carts with a volunteer runbook"]);
    assert.match(parsed.capability, /edge-runnable/);
  });

  it("parses every shipped quest grounding without throwing", () => {
    const dir = join(root, "quests");
    const files = readdirSync(dir).filter((name) => name.endsWith(".json"));
    assert.ok(files.length >= 1);
    for (const name of files) {
      const quest = JSON.parse(readFileSync(join(dir, name), "utf8"));
      const parsed = parseGrounding(quest.grounding || "");
      assert.ok(parsed);
      if (quest.grounding) {
        assert.ok(parsed.techId, name);
        assert.ok(parsed.milestones.length >= 1, name);
      }
      const techId = quest.spotlight?.techId || parsed.techId;
      if (techId) {
        const track = resolveTechTrack(techId, { quest });
        assert.ok(track?.milestones?.length, name);
      }
    }
  });
});

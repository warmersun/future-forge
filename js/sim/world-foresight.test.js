import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TECHS } from "../data.js";
import {
  WORLD_FORESIGHT_EVENTS,
  validateWorldForesightBank,
  foresightForYear,
  foresightCapabilityContext,
  applyForesightToClaimStretch,
} from "./world-foresight.js";
import { detectClaimStretch } from "../data.js";

describe("world-foresight bank", () => {
  it("validates against TECHS", () => {
    const r = validateWorldForesightBank(
      WORLD_FORESIGHT_EVENTS,
      TECHS.map((t) => t.id)
    );
    assert.equal(r.ok, true, r.errors?.slice(0, 5).join("; "));
    assert.ok(r.count >= 50);
  });

  it("foresightForYear returns 3–6 items deterministically", () => {
    const a = foresightForYear(2030, { seed: "t", limit: 5 });
    const b = foresightForYear(2030, { seed: "t", limit: 5 });
    assert.deepEqual(
      a.map((x) => x.id),
      b.map((x) => x.id)
    );
    assert.ok(a.length >= 3 && a.length <= 6);
  });

  it("AGI-style claims stay red before prediction year", () => {
    const techs = [TECHS.find((t) => t.id === "ai")].filter(Boolean);
    const how =
      "Our AGI system runs fully autonomous judgment with no human oversight for all clinic decisions overnight.";
    const base = detectClaimStretch(how, techs, 2026);
    const ctx = foresightCapabilityContext(2026, techs);
    const adj = applyForesightToClaimStretch(base, how, ctx);
    assert.equal(adj.level, "red");
  });

  it("supervised copilot language can stay non-red with foresight near", () => {
    const techs = [TECHS.find((t) => t.id === "ai")].filter(Boolean);
    const how =
      "A supervised AI copilot drafts triage notes with human in the loop for the clinic pilot partnership.";
    const base = detectClaimStretch(how, techs, 2026);
    const ctx = foresightCapabilityContext(2026, techs);
    const adj = applyForesightToClaimStretch(base, how, ctx);
    assert.notEqual(adj.level, "red");
  });

  it("local claim stretch does not worsen for same claims one year later", () => {
    const techs = [TECHS.find((t) => t.id === "ai"), TECHS.find((t) => t.id === "solar")].filter(
      Boolean
    );
    const how =
      "A community solar + supervised AI pilot partnership schedules clinic loads with human oversight.";
    const rank = { red: 0, yellow: 1, green: 2 };
    for (const y of [2026, 2028, 2030]) {
      const a = applyForesightToClaimStretch(
        detectClaimStretch(how, techs, y),
        how,
        foresightCapabilityContext(y, techs)
      );
      const b = applyForesightToClaimStretch(
        detectClaimStretch(how, techs, y + 1),
        how,
        foresightCapabilityContext(y + 1, techs)
      );
      assert.ok(
        (rank[b.level] ?? 1) >= (rank[a.level] ?? 1),
        `year ${y}→${y + 1}: ${a.level} → ${b.level}`
      );
    }
  });
});

/**
 * Synthetic companions for the other source moves.
 * Test data only. Not discoveries and not published forecasts.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseCompanion, publicCompanionSlice, stageCopy } from "./companion.js";
import { buildSourceInquiry } from "./companion-context.js";
import { validatePredictionsBank } from "./sim/world-foresight.js";

const doc = JSON.parse(
  fs.readFileSync(new URL("../test/fixtures/companions/synthetic-moves.json", import.meta.url), "utf8")
);
const bank = validatePredictionsBank(
  JSON.parse(
    fs.readFileSync(new URL("../test/fixtures/predictions/companion-dock-test.json", import.meta.url), "utf8")
  )
).bank;

describe("synthetic move companions", () => {
  it("is labeled test data", () => {
    assert.match(doc.label, /Synthetic test data/);
    assert.equal(doc.bankId, "companion-dock-test");
    assert.deepEqual(
      doc.companions.map((row) => row.companion.move),
      ["milestone", "trend", "idea", "prediction"]
    );
  });

  for (const row of doc.companions) {
    it(`${row.companion.move} parses, shows the claim, and grants the dock row`, () => {
      assert.match(row.label, /Synthetic test data/);
      assert.match(row.companion.claim, /Synthetic test data/);
      const parsed = parseCompanion(row.companion, { access: "open" });
      assert.equal(parsed.ok, true, parsed.details?.join(","));
      const stage = stageCopy(parsed.value);
      assert.equal(stage.quote, "");
      assert.equal(stage.claim, row.companion.claim);
      assert.equal(stage.linkLabel, "Read the piece");
      assert.match(stage.linkUrl, /^https:\/\/example.com\//);
      const slice = publicCompanionSlice(parsed.value);
      assert.equal(Object.hasOwn(slice, "exploration"), false);
      assert.equal(slice.claim, row.companion.claim);
      const inquiry = buildSourceInquiry(parsed.value, {
        mode: "assess-feasibility",
        bank,
        year: 2026,
      });
      assert.equal(inquiry.claim, row.companion.claim);
      assert.equal(inquiry.premise.mode, "assumed");
      assert.equal(inquiry.premise.bankId, "companion-dock-test");
      assert.equal(inquiry.premise.grants[0].predictionId, "dock-inspection-2026");
      assert.equal(inquiry.premise.grants[0].status, "due");
      assert.equal(Object.hasOwn(inquiry, "pressureLinks"), false);
    });
  }
});

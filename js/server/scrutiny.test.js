import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeScrutinyAngle,
  sanitizeScrutiny,
  localScrutinyProposals,
  SCRUTINY_ANGLES,
} from "./scrutiny.mjs";

describe("sanitizeScrutinyAngle", () => {
  it("keeps analysis, safeguard, and imagePrompt", () => {
    const out = sanitizeScrutinyAngle({
      analysis: "A ".repeat(700),
      safeguard: "B ".repeat(300),
      imagePrompt: "C ".repeat(250),
    });
    assert.ok(out);
    assert.equal(out.analysis.length, 1200);
    assert.equal(out.safeguard.length, 400);
    assert.equal(out.imagePrompt.length, 400);
  });

  it("returns null when empty", () => {
    assert.equal(sanitizeScrutinyAngle({}), null);
    assert.equal(sanitizeScrutinyAngle(null), null);
  });
});

describe("sanitizeScrutiny", () => {
  it("returns all four angles and maps policy→stakeholder", () => {
    const out = sanitizeScrutiny({
      moloch: { analysis: "m", safeguard: "ms" },
      ethicist: { analysis: "e", safeguard: "es", imagePrompt: "ep" },
      policy: { analysis: "p", safeguard: "ps" },
      nature: { analysis: "n", safeguard: "ns" },
    });
    assert.ok(out.moloch);
    assert.ok(out.ethicist.imagePrompt);
    assert.equal(out.stakeholder.analysis, "p");
    assert.ok(out.nature);
  });
});

describe("localScrutinyProposals", () => {
  it("returns four angles with analysis, safeguard, imagePrompt", () => {
    const scrutiny = localScrutinyProposals({
      place: "Lagos",
      inventionName: "Cool Path",
      inventionHow: "Sensors alert crews.",
    });
    for (const angle of SCRUTINY_ANGLES) {
      const row = scrutiny[angle];
      assert.ok(row.analysis.includes("Lagos") || row.analysis.includes("Cool Path"));
      assert.ok(row.safeguard.length > 20);
      assert.ok(row.imagePrompt.length > 20);
    }
  });
});

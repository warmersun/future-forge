import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  leanCoInventContext,
  inventDraftFieldsForContext,
} from "./lean-coinvent-context.js";

const leftoverSnap = {
  year: 2025,
  place: "Old Place",
  grounding: null,
  missionTitle: "Payout before the ice truck leaves",
  missionScene: "Mira dumps meltwater.",
  inventionName: "LeftoverName",
  inventionHow: "board-wide how should not win",
  inventionImpact: "A leftover everyday-life paragraph.",
  selectedTechIds: ["ai"],
  techsForIds: (ids) => ids.map((id) => ({ id, name: id })),
  selectedTechs: () => [{ id: "ai", name: "AI" }],
  challenge: { title: "Payout", problem: "Mira dumps meltwater." },
};

describe("leanCoInventContext assess-feasibility", () => {
  it("omits inventionName even when extra sends null and snap has a leftover name", () => {
    const ctx = leanCoInventContext(
      "assess-feasibility",
      {
        inventionHow: "stablecoin wallet gives instant settlement",
        inventionName: null,
        selectedTechIds: ["crypto"],
        year: 2026,
        place: "Saltpier Market (fictive)",
      },
      leftoverSnap
    );
    assert.equal(Object.hasOwn(ctx, "inventionName"), false);
    assert.ok(!JSON.stringify(ctx).includes("LeftoverName"));
    assert.equal(ctx.inventionHow, "stablecoin wallet gives instant settlement");
    assert.deepEqual(ctx.selectedTechIds, ["crypto"]);
    assert.equal(ctx.year, 2026);
  });

  it("does not inherit snap.inventionImpact when the caller omits impact", () => {
    const ctx = leanCoInventContext(
      "assess-feasibility",
      {
        inventionHow: "Pilot corridor sensors.",
        selectedTechIds: ["iot"],
        year: 2026,
      },
      leftoverSnap
    );
    assert.equal(Object.hasOwn(ctx, "inventionImpact"), false);
    assert.ok(!JSON.stringify(ctx).includes("everyday-life"));
  });

  it("omits empty explicit impact and keeps a non-empty explicit impact", () => {
    const empty = leanCoInventContext(
      "assess-feasibility",
      { inventionHow: "x", inventionImpact: "", selectedTechIds: ["ai"] },
      leftoverSnap
    );
    assert.equal(Object.hasOwn(empty, "inventionImpact"), false);

    const kept = leanCoInventContext(
      "assess-feasibility",
      {
        inventionHow: "x",
        inventionImpact: "Same-day stall payout.",
        selectedTechIds: ["ai"],
      },
      leftoverSnap
    );
    assert.equal(kept.inventionImpact, "Same-day stall payout.");
  });
});

describe("leanCoInventContext other lean modes", () => {
  it("strips inventionName from score-pathway extra spread", () => {
    const ctx = leanCoInventContext(
      "score-pathway",
      {
        inventionName: "SecretName",
        pathway: { howText: "The pair radios the crest.", inventions: [] },
      },
      leftoverSnap
    );
    assert.equal(Object.hasOwn(ctx, "inventionName"), false);
    assert.ok(!JSON.stringify(ctx).includes("SecretName"));
    assert.equal(ctx.pathway.howText, "The pair radios the crest.");
  });

  it("pose/judge default branch does not re-add snap.inventionName", () => {
    const ctx = leanCoInventContext(
      "pose-challenge",
      { challengeAngle: "moloch", pathway: { inventions: [] } },
      leftoverSnap
    );
    assert.equal(Object.hasOwn(ctx, "inventionName"), false);
    assert.ok(!JSON.stringify(ctx).includes("LeftoverName"));
  });
});

describe("inventDraftFieldsForContext", () => {
  it("omits name/how/impact keys on hex instead of sending null", () => {
    const hex = inventDraftFieldsForContext({
      hexInvent: true,
      inventionName: "Nope",
      inventionHow: "legacy how",
      inventionImpact: "legacy impact",
    });
    assert.deepEqual(hex, {});
    assert.equal(Object.hasOwn(hex, "inventionName"), false);
    assert.equal(Object.hasOwn(hex, "inventionHow"), false);
    assert.equal(Object.hasOwn(hex, "inventionImpact"), false);
  });

  it("keeps draft fields for non-hex invent", () => {
    const legacy = inventDraftFieldsForContext({
      hexInvent: false,
      inventionName: "TideGate",
      inventionHow: "Sensors radio the crest.",
      inventionImpact: "Crews leave before the tide.",
    });
    assert.equal(legacy.inventionName, "TideGate");
    assert.equal(legacy.inventionHow, "Sensors radio the crest.");
    assert.equal(legacy.inventionImpact, "Crews leave before the tide.");
  });
});

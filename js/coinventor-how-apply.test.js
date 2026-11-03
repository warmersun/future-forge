import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  pathwayReadyForHow,
  pathwayTilesForHow,
  hexHowTargetsPathway,
  hexHowApplyCopy,
  howAppliedLabel,
  draftQuoteForBubble,
  captureHowProvenance,
  howApplyDecision,
} from "./coinventor-how-apply.js";

describe("hex how apply copy", () => {
  it("offers the mint box until a pathway is placed", () => {
    assert.equal(pathwayReadyForHow(null), false);
    assert.equal(pathwayReadyForHow({}), false);
    assert.equal(pathwayReadyForHow({ hexBoard: { pathways: [] } }), false);
    const empty = hexHowApplyCopy(false);
    assert.equal(empty.label, "Use as how it works");
    assert.match(empty.title, /How it works/);
    assert.equal(howAppliedLabel("mint"), "Used as how it works");
  });

  it("names the pathway once one is placed", () => {
    assert.equal(
      pathwayReadyForHow({ hexBoard: { pathways: [{ howText: "" }] } }),
      true
    );
    const placed = hexHowApplyCopy(true);
    assert.equal(placed.label, "Set as this pathway's how");
    assert.match(placed.title, /placed pathway/);
    assert.equal(howAppliedLabel("pathway"), "Saved as this pathway's how");
  });

  it("does not claim a pathway when the draft's emTech is not on it", () => {
    const context = {
      hexBoard: {
        inventions: [
          { id: "tile-a", techId: "seawall", onBoard: true },
        ],
        pathways: [{ inventionIds: ["tile-a"], howText: "The old seawall line." }],
      },
    };
    assert.equal(pathwayReadyForHow(context, "kelp"), false);
    assert.equal(pathwayReadyForHow(context, "seawall"), true);
    assert.equal(pathwayReadyForHow(context), true);
    const two = {
      hexBoard: {
        pathways: [{ inventionIds: ["a"] }, { inventionIds: ["b"] }],
      },
    };
    assert.equal(pathwayReadyForHow(two), false);
  });

  it("writes only the island that contains the hinted emTech", () => {
    const seawall = [{ id: "tile-a", techId: "seawall" }];
    const kelp = [{ id: "tile-b", techId: "kelp" }];
    assert.equal(pathwayTilesForHow([seawall], "kelp"), null);
    assert.equal(pathwayTilesForHow([seawall, kelp], "kelp"), kelp);
    assert.equal(pathwayTilesForHow([seawall], null), seawall);
    assert.equal(pathwayTilesForHow([seawall, kelp], null), null);
  });

  it("keeps a mint draft off the pathway even when one island is placed", () => {
    const context = { hexBoard: { pathways: [{ howText: "The old line." }] } };
    assert.equal(hexHowTargetsPathway(context, { howTarget: "mint" }), false);
    assert.equal(hexHowTargetsPathway(context, { howTarget: "pathway" }), true);
    assert.equal(hexHowTargetsPathway(context, {}), true);
  });
});

describe("draft quote in the bubble", () => {
  const how =
    "Virtual reality lets cultural practitioners join the ceremony from the base.";

  it("shows the draft when the message only announces it", () => {
    assert.equal(draftQuoteForBubble("Here's a draft for you.", how), how);
  });

  it("omits the quote when the message already includes the draft", () => {
    assert.equal(
      draftQuoteForBubble(`Here's a draft.\n\n${how}\n\nEdit it.`, how),
      ""
    );
  });

  it("treats extra whitespace as the same draft", () => {
    assert.equal(
      draftQuoteForBubble("Virtual   reality lets cultural practitioners join the ceremony from the base.", how),
      ""
    );
  });

  it("returns empty when there is no how text", () => {
    assert.equal(draftQuoteForBubble("Here's a draft for you.", "  "), "");
    assert.equal(draftQuoteForBubble("Here's a draft for you.", null), "");
  });
});

describe("how draft provenance", () => {
  const context = {
    focusTechId: "sensors",
    hexBoard: {
      pathways: [{ inventionIds: ["tile-a"] }],
      inventions: [{ id: "tile-a", techId: "sensors" }],
    },
  };
  const proposals = {
    inventionHow: "Sensors close the gate.",
    howTarget: "pathway",
    howTechId: "sensors",
  };

  it("applies a fresh draft once and asks again after the board drifts", () => {
    const captured = captureHowProvenance(context);
    assert.equal(captured.focusTechId, "sensors");
    assert.deepEqual(captured.pathways[0].techIds, ["sensors"]);
    const same = howApplyDecision(captured, context, proposals, false);
    assert.equal(same.allow, true);
    assert.equal(same.legacy, false);
    assert.equal(same.needsConfirm, false);
    const drifted = howApplyDecision(
      captured,
      { ...context, focusTechId: "pumps" },
      proposals,
      false
    );
    assert.equal(drifted.allow, false);
    assert.equal(drifted.needsConfirm, true);
    assert.match(drifted.label, /when you asked/);
    const confirmed = howApplyDecision(
      captured,
      { ...context, focusTechId: "pumps" },
      proposals,
      true
    );
    assert.equal(confirmed.allow, true);
    assert.equal(confirmed.needsConfirm, false);
  });

  it("keeps restored proposals without provenance on the old path", () => {
    const legacy = howApplyDecision(null, context, proposals, false);
    assert.equal(legacy.allow, true);
    assert.equal(legacy.legacy, true);
    assert.equal(legacy.needsConfirm, false);
  });

  it("captures provenance when the request is built, before the co-invent await", () => {
    const src = readFileSync(new URL("./coinventor.js", import.meta.url), "utf8");
    const start = src.indexOf("async request(");
    const fn = src.slice(start, src.indexOf("\n  pushAssistant(", start));
    const captured = fn.indexOf("const howProvenance = captureHowProvenance(");
    const transport = fn.indexOf("await this.transport");
    const post = fn.indexOf("await postCoInvent");
    assert.ok(captured > 0);
    assert.ok(captured < transport);
    assert.ok(captured < post);
    assert.equal(fn.includes("howProvenance: captureHowProvenance("), false);
    assert.equal(fn.includes("howProvenance,"), true);
  });
});

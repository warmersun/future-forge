import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  pathwayReadyForHow,
  hexHowApplyCopy,
  howAppliedLabel,
  draftQuoteForBubble,
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

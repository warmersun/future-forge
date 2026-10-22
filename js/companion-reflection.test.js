import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  assumingLine,
  formatSourceResponse,
  inventionLineForResponse,
} from "./companion-reflection.js";

describe("formatSourceResponse", () => {
  const base = {
    questTitle: "Night shift at Kiln Ferry",
    sourceTitle: "Moonshots with Peter Diamandis",
    speaker: "Chamath Palihapitiya",
    claim: "A guest says AGI is already here.",
    premiseStatement:
      "For this Quest, assume an AI can inspect visible parcel damage.",
    inventionSummary: "A paper tally and a spare lamp.",
    reflection: "The power drop mattered most.",
    questUrl: "http://127.0.0.1:8765/?q=companion-moonshots-304",
    sourceUrl: "https://www.youtube.com/watch?v=kAwG9E1W_ME&t=2698",
  };

  it("renders Assuming and keeps a blank reflection", () => {
    assert.equal(
      assumingLine(base.premiseStatement),
      "Assuming an AI can inspect visible parcel damage."
    );
    const text = formatSourceResponse({ ...base, reflection: "   " });
    assert.match(text, /Assuming an AI can inspect visible parcel damage\./);
    assert.equal(text.includes("I learned"), false);
    assert.match(text, /does not verify the source/);
  });

  it("says when no invention was recorded", () => {
    const text = formatSourceResponse({ ...base, inventionSummary: "" });
    assert.match(text, /No invention recorded yet\./);
  });

  it("uses a placed pathway and ignores a place-and-year header alone", () => {
    const pathway = "Kiln Ferry parcel dock · held in 2026\n\nSuper Intelligence · Computing\nNia switches the belt.";
    assert.equal(
      inventionLineForResponse({
        pathwayText: pathway,
        inventionCount: 2,
        how: "stale story field",
      }),
      pathway
    );
    assert.equal(
      inventionLineForResponse({
        pathwayText: "Kiln Ferry parcel dock · held in 2026",
        inventionCount: 0,
        how: "",
        impact: "",
      }),
      ""
    );
    assert.equal(
      inventionLineForResponse({ how: "A paper tally.", impact: "A spare lamp." }),
      "A paper tally.\n\nA spare lamp."
    );
  });

  it("leaves markup as text and omits a missing share origin or unsafe source", () => {
    const text = formatSourceResponse({
      ...base,
      claim: "<script>alert(1)</script>",
      questUrl: "",
      sourceUrl: "http://evil.example/phish",
      reflection: "",
    });
    assert.match(text, /<script>alert\(1\)<\/script>/);
    assert.equal(text.includes("evil.example"), false);
    assert.equal(text.includes("127.0.0.1"), false);
  });

  it("includes an https source and a provided quest link", () => {
    const text = formatSourceResponse(base);
    assert.match(text, /https:\/\/www\.youtube\.com/);
    assert.match(text, /127\.0\.0\.1:8765\/\?q=companion-moonshots-304/);
  });
});

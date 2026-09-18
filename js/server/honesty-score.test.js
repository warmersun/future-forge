/**
 * score-pathway honesty clamp — mocked TypeSafe client, no network.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyHonestyToScorePathway,
  composeTypeSafeScore,
} from "./honesty-score.mjs";

function mockClient(nouls) {
  return {
    async systemOne() {
      const answers = {};
      for (const [id, p] of Object.entries(nouls)) {
        answers[id] = { type: "noul", noul: p };
      }
      return {
        model: "jev-test",
        usage: { input_tokens: 10, output_tokens: 0 },
        answers,
      };
    },
  };
}

const rawEase = {
  source: "local",
  crisisDelta: { local: -1, global: -1, support: -1 },
  crisisReasons: { local: "a", global: "b", support: "c" },
  concerns: {},
};

describe("composeTypeSafeScore", () => {
  it("keeps a Grok reason only when the signed delta still matches", () => {
    const grok = {
      crisisDelta: { local: -1, global: -1, support: 0 },
      crisisReasons: {
        local: "Sensors page the pump crew before the crest.",
        global: "Grok claimed a driver cut.",
        support: "",
      },
      concerns: {},
    };
    const out = composeTypeSafeScore(grok, {
      crisisDelta: { local: -1, global: 0, support: 0 },
      crisisReasons: {
        local: "canned local",
        global: "Nothing names a mechanism that changes the driver.",
        support: "canned support",
      },
      concerns: { moloch: { level: "red", reason: "Still unanswered — docking is not enough." } },
      scoreUncertain: false,
    });
    assert.equal(out.crisisDelta.local, -1);
    assert.equal(out.crisisDelta.global, 0);
    assert.match(out.crisisReasons.local, /Sensors page/);
    assert.match(out.crisisReasons.global, /driver/);
    assert.equal(out.concerns.moloch.level, "red");
  });
});

describe("applyHonestyToScorePathway", () => {
  it("regex-clamps a statute when no TypeSafe client", async () => {
    const out = await applyHonestyToScorePathway(
      rawEase,
      {
        pathway: {
          howText: "The council passes universal basic income this year.",
          inventions: [{ techId: "crypto", howText: "The council passes UBI." }],
        },
        globalId: "automation",
      },
      { client: null }
    );
    assert.equal(out.crisisDelta.local, 0);
    assert.equal(out.crisisDelta.global, 0);
    assert.equal(out.honestyFlags, undefined);
  });

  it("uses TypeSafe flags so a paraphrase share is not treated as missing", async () => {
    const how = "Maya gets Friday cash from the night's sort so rent clears.";
    const out = await applyHonestyToScorePathway(
      rawEase,
      {
        pathway: {
          howText: how,
          inventions: [{ techId: "robots", howText: how }],
        },
        globalId: "automation",
      },
      {
        client: mockClient({
          mechanism: 0.9,
          purePolicy: 0.05,
          shareBridge: 0.94,
          evalOverride: 0.05,
        }),
      }
    );
    assert.equal(out.crisisDelta.global, -1);
    assert.equal(out.honestyFlags.shareBridge, true);
    assert.equal(out.honestyUncertain, false);
  });

  it("does not ease global when TypeSafe is uncertain on share", async () => {
    const how = "Aisle robots finish the easy shelves so the remaining cases move.";
    const out = await applyHonestyToScorePathway(
      rawEase,
      {
        pathway: {
          howText: how,
          inventions: [{ techId: "robots", howText: how }],
        },
        globalId: "automation",
      },
      {
        client: mockClient({
          mechanism: 0.9,
          purePolicy: 0.05,
          shareBridge: 0.5,
          evalOverride: 0.05,
        }),
      }
    );
    assert.equal(out.crisisDelta.global, -1);
    assert.equal(out.honestyUncertain, true);
    assert.equal(out.honestyFlags.shareBridge, null);
  });

  it("falls back to regex when TypeSafe throws", async () => {
    let warned = "";
    const out = await applyHonestyToScorePathway(
      rawEase,
      {
        pathway: {
          howText: "The council passes universal basic income this year.",
          inventions: [{ techId: "crypto" }],
        },
        globalId: "automation",
      },
      {
        client: {
          async systemOne() {
            throw new Error("timeout");
          },
        },
        warn: (m) => {
          warned = m;
        },
      }
    );
    assert.match(warned, /timeout/);
    assert.equal(out.crisisDelta.local, 0);
  });

  it("replaces Grok deltas with TypeSafe Choices then clamps", async () => {
    const how = "Leak sensors page the pump crew before the tank runs dry.";
    const client = {
      async systemOne() {
        return {
          model: "jev-test",
          usage: { input_tokens: 8, output_tokens: 0 },
          answers: {
            mechanism: { noul: 0.95 },
            purePolicy: { noul: 0.04 },
            shareBridge: { noul: 0.05 },
            evalOverride: { noul: 0.05 },
            delta_local: { choice: "ease1", confidence: 0.88 },
            delta_global: { choice: "none", confidence: 0.8 },
            delta_support: { choice: "ease1", confidence: 0.7 },
          },
        };
      },
    };
    const out = await applyHonestyToScorePathway(
      {
        source: "ai",
        crisisDelta: { local: -2, global: -2, support: -2 },
        crisisReasons: { local: "Grok local.", global: "Grok global.", support: "Grok support." },
        concerns: {},
      },
      {
        pathway: { howText: how, inventions: [{ techId: "iot", howText: how }] },
        globalId: "water",
      },
      { client }
    );
    assert.equal(out.crisisDelta.local, -1);
    assert.equal(out.crisisDelta.global, 0);
    assert.equal(out.crisisDelta.support, -1);
    assert.match(out.crisisReasons.global, /driver/i);
  });
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  awardForRun,
  publicAchievement,
  foundingCodes,
  FOUNDING_MAX,
} from "./achievements.mjs";

describe("awardForRun", () => {
  it("does not award on collapse", () => {
    assert.deepEqual(awardForRun({ outcome: "collapse", kind: "theme" }), []);
  });

  it("awards hold and skips already unlocked", () => {
    assert.deepEqual(awardForRun({ outcome: "hold", kind: "theme" }), ["held_pathway"]);
    assert.deepEqual(
      awardForRun({ outcome: "hold", kind: "theme" }, { already: ["held_pathway"] }),
      []
    );
  });

  it("awards friends, sponsored, converter, four challengers", () => {
    const codes = awardForRun(
      {
        outcome: "hold",
        kind: "friends",
        techIds: ["split-converter"],
      },
      { sponsored: true, challengerCount: 4 }
    );
    assert.ok(codes.includes("held_pathway"));
    assert.ok(codes.includes("first_friends_hold"));
    assert.ok(codes.includes("sponsored_spotlight"));
    assert.ok(codes.includes("four_challengers"));
    assert.ok(codes.includes("converter_dock"));
    assert.equal(codes.includes("daily_three_week"), false);
  });

  it("never trusts a client-supplied code list as unlocks", () => {
    const codes = awardForRun({ outcome: "collapse" }, { already: [], claim: ["held_pathway"] });
    assert.deepEqual(codes, []);
  });

  it("does not award sponsored or four_challengers from run fields alone", () => {
    const codes = awardForRun({
      outcome: "hold",
      kind: "theme",
      sponsored: true,
      challengerCount: 4,
    });
    assert.equal(codes.includes("sponsored_spotlight"), false);
    assert.equal(codes.includes("four_challengers"), false);
  });
});

describe("foundingCodes", () => {
  it("awards founding for first N accounts", () => {
    assert.deepEqual(foundingCodes({ userCount: 1 }), ["founding"]);
    assert.deepEqual(foundingCodes({ userCount: FOUNDING_MAX + 1 }), []);
  });
  it("awards Invent Night 2026 when tagged", () => {
    assert.ok(foundingCodes({ inventNight: true }).includes("invent_night_2026"));
  });
  it("awards founding when created before cutoff", () => {
    assert.ok(
      foundingCodes({ createdAt: "2026-01-01", cutoff: "2026-12-31" }).includes("founding")
    );
  });
});

describe("publicAchievement", () => {
  it("hides unknown codes", () => {
    assert.equal(publicAchievement("grade_a"), null);
    assert.equal(publicAchievement("held_pathway").title, "Pathway holds");
  });
});

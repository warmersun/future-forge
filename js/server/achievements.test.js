import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  awardForRun,
  publicAchievement,
  countHoldsInWeek,
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

  it("awards friends, sponsored, daily streak, converter, four challengers", () => {
    const codes = awardForRun(
      {
        outcome: "hold",
        kind: "friends",
        techIds: ["split-converter"],
        challengerCount: 4,
      },
      { sponsored: true, dailyHoldsThisWeek: 3 }
    );
    assert.ok(codes.includes("held_pathway"));
    assert.ok(codes.includes("first_friends_hold"));
    assert.ok(codes.includes("sponsored_spotlight"));
    assert.ok(codes.includes("daily_three_week"));
    assert.ok(codes.includes("four_challengers"));
    assert.ok(codes.includes("converter_dock"));
  });

  it("never trusts a client-supplied code list as unlocks", () => {
    const codes = awardForRun({ outcome: "collapse" }, { already: [], claim: ["held_pathway"] });
    assert.deepEqual(codes, []);
  });
});

describe("countHoldsInWeek", () => {
  it("counts UTC days that fall in the ISO week plus the week key", () => {
    const weekOf = (d) => (d === "2026-08-25" || d === "2026-08-26" ? "2026-W35" : "2026-W34");
    assert.equal(
      countHoldsInWeek(["2026-08-25", "2026-08-26", "2026-W35", "2026-08-01"], "2026-W35", weekOf),
      3
    );
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

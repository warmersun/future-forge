import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isLearningMission,
  isSponsoredMission,
  isModuleEntry,
  isLearningEntry,
  isSponsoredEntry,
  partitionCatalogQuests,
  groupLearningModules,
  catalogTopLevel,
  catalogHubCounts,
} from "./quest-catalog.js";

function lesson(over = {}) {
  const id = over.id || "lesson-1";
  return {
    id,
    kind: "quest",
    title: over.title || "Lesson",
    summary: over.summary || "Invent a thing.",
    mission: {
      id,
      isLearningModule: true,
      module: over.module || "Same-day dollars",
      lesson: over.lesson || 1,
      totalLessons: over.totalLessons || 4,
      sponsorName: over.sponsorName,
      title: over.title || "Lesson",
      summary: over.summary || "Invent a thing.",
    },
    ...over,
  };
}

function wrapper(over = {}) {
  return {
    id: "module-same-day-dollars",
    kind: "module",
    title: "Same-day dollars at the market",
    summary: "Invent local dollar uses at Mira’s stall.",
    module: "Same-day dollars",
    lessons: [
      "lesson-1",
      "lesson-2",
      "lesson-3",
      "lesson-4",
    ],
    totalLessons: 4,
    overviewMd: "## Path\n\nFour invent jobs.",
    coverImageUrl: "assets/quests/base-onchain-dollars/l1-place-1.png",
    sponsorName: "Base",
    mission: null,
    ...over,
  };
}

describe("quest-catalog", () => {
  it("classifies learning, sponsored, and module entries", () => {
    assert.equal(isLearningMission({ isLearningModule: true }), true);
    assert.equal(isSponsoredMission({ sponsorName: "Base" }), true);
    assert.equal(isModuleEntry(wrapper()), true);
    assert.equal(isLearningEntry(wrapper()), true);
    assert.equal(isSponsoredEntry(wrapper()), true);
    assert.equal(isSponsoredEntry(lesson({ sponsorName: "Base" })), true);
    assert.equal(isLearningEntry(lesson()), true);
  });

  it("keeps sponsored learning out of the Learning partition", () => {
    const sponsoredLesson = lesson({ id: "s1", sponsorName: "Base" });
    const unsponsored = lesson({
      id: "u1",
      module: "Sensors",
      sponsorName: undefined,
    });
    delete unsponsored.mission.sponsorName;
    const standalone = {
      id: "q1",
      kind: "quest",
      mission: { id: "q1", sponsorName: "Acme" },
    };
    const parts = partitionCatalogQuests({
      remote: [sponsoredLesson, unsponsored, standalone, wrapper()],
      local: [lesson({ id: "local-1" })],
      imported: [],
    });
    assert.equal(parts.sponsored.some((e) => e.id === "s1"), true);
    assert.equal(parts.sponsored.some((e) => e.id === "module-same-day-dollars"), true);
    assert.equal(parts.learning.some((e) => e.id === "s1"), false);
    assert.equal(parts.learning.some((e) => e.id === "u1"), true);
    assert.equal(parts.library.some((e) => e.id === "local-1"), true);
  });

  it("groups lessons and attaches a wrapper for summary + order", () => {
    const lessons = [
      lesson({ id: "lesson-3", lesson: 3 }),
      lesson({ id: "lesson-1", lesson: 1, summary: "Payout job." }),
      lesson({ id: "lesson-2", lesson: 2 }),
      lesson({ id: "lesson-4", lesson: 4 }),
    ];
    const groups = groupLearningModules([...lessons, wrapper()]);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].wrapper.id, "module-same-day-dollars");
    assert.equal(groups[0].summary, "Invent local dollar uses at Mira’s stall.");
    assert.deepEqual(
      groups[0].entries.map((e) => e.id),
      ["lesson-1", "lesson-2", "lesson-3", "lesson-4"]
    );
  });

  it("groups by title without a wrapper and synthesizes summary", () => {
    const groups = groupLearningModules([
      lesson({ id: "a", lesson: 2, summary: "Second." }),
      lesson({ id: "b", lesson: 1, summary: "First job." }),
    ]);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].wrapper, null);
    assert.equal(groups[0].entries[0].id, "b");
    assert.equal(groups[0].summary, "First job.");
  });

  it("catalogTopLevel treats 2+ lessons as a module; a single lesson stays a card", () => {
    const many = catalogTopLevel([
      lesson({ id: "a", lesson: 1 }),
      lesson({ id: "b", lesson: 2 }),
    ]);
    assert.equal(many.groups.length, 1);
    assert.equal(many.standalone.length, 0);

    const one = catalogTopLevel([
      lesson({
        id: "solo",
        lesson: 1,
        totalLessons: 1,
        module: "Solo path",
      }),
    ]);
    assert.equal(one.groups.length, 0);
    assert.equal(one.standalone.length, 1);

    const wrappedOne = catalogTopLevel([
      lesson({ id: "lesson-1", lesson: 1, totalLessons: 1 }),
      wrapper({
        lessons: ["lesson-1"],
        totalLessons: 1,
      }),
    ]);
    assert.equal(wrappedOne.groups.length, 1);
  });

  it("hub counts modules as one, not each nested lesson", () => {
    const parts = partitionCatalogQuests({
      remote: [
        wrapper(),
        lesson({ id: "lesson-1", lesson: 1, sponsorName: "Base" }),
        lesson({ id: "lesson-2", lesson: 2, sponsorName: "Base" }),
        lesson({ id: "lesson-3", lesson: 3, sponsorName: "Base" }),
        lesson({ id: "lesson-4", lesson: 4, sponsorName: "Base" }),
        { id: "spot", kind: "quest", mission: { id: "spot", sponsorName: "Acme" } },
      ],
      local: [],
      imported: [],
    });
    const counts = catalogHubCounts(parts);
    assert.equal(counts.sponsored, 2);
    assert.equal(counts.learningGroups, 0);
  });

  it("classifies the group as Sponsored if only the wrapper is sponsored", () => {
    const lessons = [
      lesson({ id: "lesson-1", lesson: 1 }),
      lesson({ id: "lesson-2", lesson: 2 }),
    ];
    delete lessons[0].mission.sponsorName;
    delete lessons[1].mission.sponsorName;
    const parts = partitionCatalogQuests({
      remote: [wrapper({ lessons: ["lesson-1", "lesson-2"], totalLessons: 2 }), ...lessons],
      local: [],
      imported: [],
    });
    assert.equal(parts.sponsored.some((e) => e.id === "module-same-day-dollars"), true);
    assert.equal(parts.sponsored.some((e) => e.id === "lesson-1"), true);
    assert.equal(parts.sponsored.some((e) => e.id === "lesson-2"), true);
    assert.equal(parts.learning.length, 0);
    assert.equal(catalogHubCounts(parts).sponsored, 1);
  });

  it("classifies the group as Sponsored if only a lesson is sponsored", () => {
    const w = wrapper({ sponsorName: "" });
    delete w.sponsorName;
    const parts = partitionCatalogQuests({
      remote: [
        w,
        lesson({ id: "lesson-1", lesson: 1, sponsorName: "Base" }),
        lesson({ id: "lesson-2", lesson: 2 }),
      ],
      local: [],
      imported: [],
    });
    assert.equal(parts.sponsored.some((e) => e.id === "module-same-day-dollars"), true);
    assert.equal(parts.sponsored.some((e) => e.id === "lesson-2"), true);
    assert.equal(parts.learning.length, 0);
  });

  it("attaches lessons by wrapper lessons[] even when module titles differ", () => {
    const groups = groupLearningModules([
      wrapper({
        module: "Same-day dollars at the market",
        lessons: ["lesson-1", "lesson-2"],
      }),
      lesson({ id: "lesson-1", module: "Other title", lesson: 1 }),
      lesson({ id: "lesson-2", module: "Other title", lesson: 2 }),
    ]);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].key, "Same-day dollars at the market");
    assert.deepEqual(
      groups[0].entries.map((e) => e.id),
      ["lesson-1", "lesson-2"]
    );
  });

  it("resolves wrapper lesson ids through slugId", () => {
    const groups = groupLearningModules([
      wrapper({
        lessons: ["Spotlight Crypto Saltpier Payout 2026"],
        totalLessons: 1,
      }),
      lesson({
        id: "spotlight-crypto-saltpier-payout-2026",
        lesson: 1,
        totalLessons: 1,
      }),
    ]);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].entries.length, 1);
    assert.equal(groups[0].entries[0].id, "spotlight-crypto-saltpier-payout-2026");
  });

  it("keeps a wrapper with zero resolvable lessons as an empty module", () => {
    const groups = groupLearningModules([
      wrapper({ lessons: ["missing-id"], totalLessons: 4 }),
    ]);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].wrapper.id, "module-same-day-dollars");
    assert.equal(groups[0].entries.length, 0);
    const top = catalogTopLevel(groups[0].wrapper ? [groups[0].wrapper] : []);
    assert.equal(top.groups.length, 1);
    assert.equal(top.groups[0].entries.length, 0);
  });
});

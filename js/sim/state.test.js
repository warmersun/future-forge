import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  cloneMission,
  missionForFriendsPlay,
  cloudRunKind,
} from "./state.js";

const learning = {
  id: "lesson-1",
  title: "Check the next run",
  place: "Hearthline",
  globalId: "rsi",
  startYear: 2026,
  collapseYear: 2034,
  pressure: { Trust: 2 },
  pressureRise: { Trust: 1 },
  winMax: { Trust: 1 },
  suggested: ["ai"],
  isLearningModule: true,
  module: "RSI desk",
  lesson: 1,
  totalLessons: 4,
  aiTutorContext: "SECRET CURRICULUM — never broadcast",
};

describe("missionForFriendsPlay", () => {
  it("drops hidden tutor curriculum and keeps lesson labels", () => {
    const out = missionForFriendsPlay(learning);
    assert.equal(out.aiTutorContext, undefined);
    assert.equal(out.isLearningModule, true);
    assert.equal(out.module, "RSI desk");
    assert.equal(out.lesson, 1);
    assert.equal(out.id, "lesson-1");
    assert.equal(learning.aiTutorContext, "SECRET CURRICULUM — never broadcast");
  });

  it("does not add tutor notes that cloneMission would copy", () => {
    const cloned = cloneMission(learning);
    assert.equal(cloned.aiTutorContext, "SECRET CURRICULUM — never broadcast");
    assert.equal(missionForFriendsPlay(cloned).aiTutorContext, undefined);
  });
});

describe("cloudRunKind", () => {
  it("prefers friends over learning-module", () => {
    assert.equal(
      cloudRunKind({ multiparty: true, isLearningModule: true }),
      "friends"
    );
    assert.equal(cloudRunKind({ isLearningModule: true }), "lesson");
    assert.equal(cloudRunKind({}), "theme");
    assert.equal(cloudRunKind({ multiparty: true }), "friends");
  });
});

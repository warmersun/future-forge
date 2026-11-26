/*
Copyright © 2026 Warmer Sun Education, a sole proprietorship by Tamas Simon

This file is part of Future Forge.

Future Forge is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Future Forge is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Future Forge. If not, see <https://www.gnu.org/licenses/>.
*/

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  TUTORIAL_STEPS,
  TUTORIAL_TEXT,
  resolveTutorialStep,
  typedMatches,
  typeHint,
  normalizeTyped,
  tutorialOccupyDecision,
  tutorialCoInventResult,
  tutorialCardSpeakText,
  readTutorialDone,
  markTutorialDone,
} from "./tutorial.js";

function snap(over = {}) {
  return {
    screen: "title",
    globalId: "",
    missionTitle: "",
    paddyId: "gen-water-paddy",
    briefing: { active: false, index: 0, beatCount: 0 },
    briefingSeen: false,
    focusedTechId: null,
    scaffold: { scarce: "", mech: "" },
    concernAnswer: "",
    tiles: [],
    concern: { answered: false, pending: false, answer: "" },
    turn: 0,
    marketNewsOpen: false,
    marketNewsSeen: false,
    marketNewsGaveUp: false,
    summonBusy: false,
    timingPending: false,
    challengeDisabled: false,
    concernsOnBoard: 0,
    tilePopupOpen: false,
    ...over,
  };
}

function idAt(index) {
  return TUTORIAL_STEPS[index]?.id;
}

describe("tutorial text", () => {
  it("normalizes curly quotes and whitespace", () => {
    assert.equal(normalizeTyped("  Clean   well\nwater "), "clean well water");
    assert.equal(typedMatches("Clean  well water", TUTORIAL_TEXT.scarceIot), true);
    assert.equal(typedMatches("Sita\u2019s growers\u2019 committee signs the sluice calendar. Year one the sensors are paid by the co-op loan; by year five the saved fertilizer pays for them. Nobody pays to drink. Extra.", TUTORIAL_TEXT.answer), true);
    assert.equal(typedMatches("clean well", TUTORIAL_TEXT.scarceIot), false);
    assert.equal(typeHint("", TUTORIAL_TEXT.scarceIot), "Type this exactly.");
    assert.equal(typeHint("clean well", TUTORIAL_TEXT.scarceIot), "Keep typing…");
    assert.equal(typeHint("clean well water", TUTORIAL_TEXT.scarceIot), "That matches.");
    assert.equal(typeHint("dirty well water", TUTORIAL_TEXT.scarceIot), "Almost — check the spelling.");
  });

  it("authors pilot how-text long enough for a yellow pathway", () => {
    assert.ok(TUTORIAL_TEXT.mechIot.length >= 40);
    assert.ok(TUTORIAL_TEXT.mechDrones.length >= 40);
    assert.ok(TUTORIAL_TEXT.mechBattery.length >= 40);
    assert.ok(TUTORIAL_TEXT.answer.length >= 80);
    assert.match(TUTORIAL_TEXT.mechIot, /\bpilot\b/i);
    assert.match(TUTORIAL_TEXT.mechDrones, /\bpilot\b/i);
    assert.match(TUTORIAL_TEXT.mechBattery, /\bpilot\b/i);
    assert.match(TUTORIAL_TEXT.pathwayHow, /\bpilot\b/i);
    assert.equal(/\b(frontier|everyone|city-wide|routine)\b/i.test(TUTORIAL_TEXT.mechIot), false);
  });
});

describe("tutorial lesson copy", () => {
  it("is a six-beat quest with no typing and no island talk", () => {
    assert.equal(TUTORIAL_STEPS.at(-1).id, "graduation");
    assert.equal(TUTORIAL_STEPS.at(-1).mode, "finish");
    const ids = TUTORIAL_STEPS.map((s) => s.id);
    for (const id of ["deal-drones", "spark-mapper", "add-battery", "spark-pack", "fuse-pack", "plug-water", "clear-roadblock", "declare-holds", "graduation"]) {
      assert.ok(ids.includes(id), id);
    }
    for (const step of TUTORIAL_STEPS) {
      assert.equal(step.type, undefined);
      assert.equal(step.paste, undefined);
      assert.equal(/\bisland\b/i.test(String(step.body)), false, step.id);
    }
    assert.match(TUTORIAL_STEPS[0].body, /No typing/);
  });
});

describe("resolveTutorialStep", () => {
  it("starts on the drones milestone and walks the six beats", () => {
    const workshop = snap({ screen: "workshop" });
    assert.equal(resolveTutorialStep(workshop, 0).step.id, "deal-drones");
    const dealt = resolveTutorialStep(snap({ screen: "workshop", useCaseCount: 2 }), 0);
    assert.equal(dealt.step.id, "spark-mapper");
    const mapped = resolveTutorialStep(snap({ screen: "workshop", useCaseCount: 2, pathwayCount: 1 }), 0);
    assert.equal(mapped.step.id, "add-battery");
    const battery = resolveTutorialStep(snap({
      screen: "workshop",
      useCaseCount: 4,
      pathwayCount: 1,
      batteryUseCount: 2,
    }), 0);
    assert.equal(battery.step.id, "spark-pack");
    const packed = resolveTutorialStep(snap({
      screen: "workshop",
      useCaseCount: 4,
      pathwayCount: 2,
      batteryUseCount: 2,
      hasBattery: true,
    }), 0);
    assert.equal(packed.step.id, "fuse-pack");
    const fused = resolveTutorialStep(snap({
      screen: "workshop",
      useCaseCount: 4,
      pathwayCount: 1,
      batteryUseCount: 2,
      hasBattery: true,
      fused: true,
    }), 0);
    assert.equal(fused.step.id, "plug-water");
    const wired = resolveTutorialStep(snap({
      screen: "workshop",
      useCaseCount: 4,
      pathwayCount: 1,
      batteryUseCount: 2,
      hasBattery: true,
      fused: true,
      wired: true,
    }), 0);
    assert.equal(wired.step.id, "clear-roadblock");
    const clear = resolveTutorialStep(snap({
      screen: "workshop",
      useCaseCount: 4,
      pathwayCount: 1,
      batteryUseCount: 2,
      hasBattery: true,
      fused: true,
      wired: true,
      roadblockClear: true,
    }), 0);
    assert.equal(clear.step.id, "declare-holds");
  });

  it("jumps to graduation on the outcome screen", () => {
    const landed = resolveTutorialStep(snap({ screen: "outcome" }), 0);
    assert.equal(landed.step.id, "graduation");
    assert.equal(landed.step.mode, "finish");
  });
});

describe("tutorial gates", () => {
  it("refuses a drop that is not the glowing hex", () => {
    const step = {
      place: { techId: "iot", q: 2, r: 2 },
      wrongPlaceHint: "Drop it on the glowing hex.",
    };
    assert.equal(tutorialOccupyDecision(step, { techId: "iot" }, 2, 2), true);
    assert.equal(
      tutorialOccupyDecision(step, { techId: "iot" }, 4, 4),
      "Drop it on the glowing hex."
    );
    assert.match(String(tutorialOccupyDecision(step, { techId: "drones" }, 2, 2)), /named/);
    assert.match(String(tutorialOccupyDecision({ id: "mint-iot" }, { techId: "iot" }, 2, 2)), /Not yet/);
  });

  it("pins AI modes to local results", () => {
    assert.deepEqual(tutorialCoInventResult("score-pathway"), {});
    assert.deepEqual(tutorialCoInventResult("assess-feasibility"), {});
    const judged = tutorialCoInventResult("judge-challenge");
    assert.equal(judged.quality, "glance");
    assert.match(judged.message, /partial answer/);
    assert.deepEqual(tutorialCoInventResult("pose-challenge"), {});
    assert.deepEqual(tutorialCoInventResult("evaluate-convergence"), { convergences: [] });
    assert.deepEqual(
      tutorialCoInventResult("evaluate-convergence", {
        placed: { techId: "iot" },
        neighbors: [{ id: "n", techId: "drones" }],
      }),
      { convergences: [] }
    );
    const hit = tutorialCoInventResult("evaluate-convergence", {
      placed: { id: "a", techId: "battery" },
      neighbors: [{ id: "b", techId: "drones" }],
    });
    assert.equal(hit.convergences[0].converges, true);
    assert.equal(hit.convergences[0].neighborId, "b");
    assert.equal(tutorialCoInventResult("vision"), undefined);
  });

  it("speaks a stable card string the TTS cache can reuse", () => {
    const step = TUTORIAL_STEPS.find((s) => s.id === "deal-drones");
    const once = tutorialCardSpeakText(step);
    assert.equal(tutorialCardSpeakText(step), once);
    assert.match(once, /Deal a 2026 milestone/);
    assert.match(once, /No typing/);
  });

  it("remembers completion in the given storage", () => {
    const mem = new Map();
    const storage = {
      getItem: (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => mem.set(k, v),
    };
    assert.equal(readTutorialDone(storage), false);
    markTutorialDone(storage);
    assert.equal(readTutorialDone(storage), true);
  });
});

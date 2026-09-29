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
  function renderedBodies() {
    const samples = [
      snap(),
      snap({
        screen: "workshop",
        briefing: { active: true, index: 3, beatCount: 4 },
      }),
      snap({ screen: "workshop", challengerDrawOpen: true }),
      snap({ screen: "workshop", challengeDisabled: true }),
      snap({ screen: "workshop", timingPending: true }),
    ];
    const texts = [];
    for (const step of TUTORIAL_STEPS) {
      if (typeof step.body !== "function") {
        texts.push(step.body);
        continue;
      }
      for (const sample of samples) texts.push(step.body(sample));
    }
    return texts;
  }

  it("keeps 39 steps and the corrected lesson", () => {
    assert.equal(TUTORIAL_STEPS.length, 39);
    const byId = Object.fromEntries(TUTORIAL_STEPS.map((s) => [s.id, s]));
    assert.match(byId["home-quest"].body, /design challenge/i);
    assert.match(byId["home-quest"].body, /grounding/i);
    assert.match(byId["home-quest"].body, /fictive place/i);
    assert.equal(/one real place/i.test(byId["home-quest"].body), false);
    assert.match(byId["hub-themes"].body, /bigger problems/i);
    assert.match(byId["theme-water"].body, /design challenge/i);
    assert.match(byId["pick-paddy"].body, /local instance/i);
    assert.equal(/curve tiles/i.test(byId["board-read"].body), false);
    assert.match(byId["board-read"].body, /dock/i);
    assert.match(byId["log-iot"].body, /ledger/i);
    assert.match(byId["log-iot"].body, /assessed/i);
    assert.equal(/cannot touch all three/i.test(byId["focus-drones"].body), false);
    assert.match(byId["focus-drones"].body, /six neighbors/i);
    assert.match(byId["pathway-read"].body, /until the panel turns green/i);
    assert.match(byId["pathway-how"].body, /filled in for you/i);
    for (const text of renderedBodies()) {
      assert.equal(/\bisland\b/i.test(text), false, text);
    }
  });
});

describe("resolveTutorialStep", () => {
  it("starts on Home and walks the scripted screens", () => {
    assert.equal(resolveTutorialStep(snap(), 0).step.id, "home-quest");
    assert.equal(
      resolveTutorialStep(snap({ screen: "quest-hub" }), 0).step.id,
      "hub-themes"
    );
    assert.equal(
      resolveTutorialStep(snap({ screen: "global" }), 1).step.id,
      "theme-water"
    );
    assert.equal(
      resolveTutorialStep(snap({ screen: "mission", globalId: "water" }), 2).step.id,
      "pick-paddy"
    );
  });

  it("stops on read steps until the index moves, then enters the briefing", () => {
    const workshop = snap({
      screen: "workshop",
      briefing: { active: true, index: 0, beatCount: 4 },
      briefingSeen: true,
    });
    const picked = TUTORIAL_STEPS.findIndex((s) => s.id === "pick-paddy");
    const landed = resolveTutorialStep(workshop, picked);
    assert.equal(landed.step.id, "hud-read");
    const afterNext = resolveTutorialStep(workshop, landed.index + 1);
    assert.equal(afterNext.step.id, "briefing");
    assert.equal(afterNext.step.dockBeside, true);
    assert.equal(afterNext.step.targets[0].selector, '[data-brief="next"]');
  });

  it("points the last briefing beat at Start inventing", () => {
    const i = TUTORIAL_STEPS.findIndex((s) => s.id === "briefing");
    const last = resolveTutorialStep(
      snap({
        screen: "workshop",
        briefing: { active: true, index: 3, beatCount: 4 },
        briefingSeen: true,
      }),
      i
    );
    assert.equal(last.step.id, "briefing");
    assert.ok(last.step.targets.some((t) => t.selector === ".quest-briefing-invent"));
  });

  it("leaves the briefing only after it has been seen and dismissed", () => {
    const i = TUTORIAL_STEPS.findIndex((s) => s.id === "briefing");
    const waiting = resolveTutorialStep(
      snap({
        screen: "workshop",
        briefing: { active: false, index: 0, beatCount: 0 },
        briefingSeen: false,
      }),
      i
    );
    assert.equal(waiting.step.id, "briefing");
    const done = resolveTutorialStep(
      snap({
        screen: "workshop",
        briefing: { active: false, index: 3, beatCount: 4 },
        briefingSeen: true,
      }),
      i
    );
    assert.equal(done.step.id, "board-read");
    const replay = resolveTutorialStep(
      snap({
        screen: "workshop",
        briefing: { active: false, mode: "off", index: 3, beatCount: 4 },
        briefingSeen: false,
      }),
      i
    );
    assert.equal(replay.step.id, "board-read");
  });

  it("advances the IoT drag only when the tile sits on (2,2)", () => {
    const i = TUTORIAL_STEPS.findIndex((s) => s.id === "drag-iot");
    const held = resolveTutorialStep(
      snap({
        screen: "workshop",
        tiles: [{ id: "a", kind: "invention", techId: "iot", q: 1, r: 1 }],
      }),
      i
    );
    assert.equal(held.step.id, "drag-iot");
    const placed = resolveTutorialStep(
      snap({
        screen: "workshop",
        tiles: [{ id: "a", kind: "invention", techId: "iot", q: 2, r: 2 }],
      }),
      i
    );
    assert.equal(placed.step.id, "vision-iot");
  });

  it("pastes the how-it-works instead of asking for exact typing", () => {
    const ids = TUTORIAL_STEPS.map((s) => s.id);
    assert.equal(ids.includes("type-scarce-iot"), false);
    assert.equal(ids.includes("type-mech-iot"), false);
    assert.equal(ids.includes("type-scarce-drones"), false);
    assert.equal(ids.includes("type-mech-drones"), false);
    const iot = TUTORIAL_STEPS.find((s) => s.id === "paste-iot");
    const drones = TUTORIAL_STEPS.find((s) => s.id === "paste-drones");
    assert.equal(iot.mode, "read");
    assert.equal(iot.paste[0].text, TUTORIAL_TEXT.scarceIot);
    assert.equal(iot.paste[1].text, TUTORIAL_TEXT.mechIot);
    assert.deepEqual(
      iot.targets.map((t) => t.selector),
      ["#hex-scaffold-scarce", "#hex-scaffold-mech"]
    );
    assert.equal(iot.paste[0].label, "What is scarce here?");
    assert.equal(iot.paste[1].label, "How does this emTech make it more abundant?");
    assert.equal(drones.paste[0].label, iot.paste[0].label);
    assert.equal(drones.paste[1].label, iot.paste[1].label);
    assert.equal(drones.paste[0].text, TUTORIAL_TEXT.scarceDrones);
    assert.equal(drones.paste[1].text, TUTORIAL_TEXT.mechDrones);
    assert.equal(iot.dockVision, true);
    assert.equal(drones.dockVision, true);
    assert.equal(TUTORIAL_STEPS.find((s) => s.id === "paste-battery").dockVision, true);
    assert.equal(TUTORIAL_STEPS.find((s) => s.id === "mint-battery").dockVision, true);
    const answer = TUTORIAL_STEPS.find((s) => s.id === "answer");
    assert.equal(answer.paste[0].text, TUTORIAL_TEXT.answer);
    assert.equal(answer.pinPopup, true);
  });

  it("asks for a crisis hover before picking an emTech", () => {
    const ids = TUTORIAL_STEPS.map((s) => s.id);
    assert.ok(ids.indexOf("board-read") < ids.indexOf("hover-crisis"));
    assert.ok(ids.indexOf("hover-crisis") < ids.indexOf("focus-iot"));
    const i = ids.indexOf("hover-crisis");
    const waiting = resolveTutorialStep(
      snap({ screen: "workshop", tilePopupOpen: false }),
      i
    );
    assert.equal(waiting.step.id, "hover-crisis");
    assert.equal(waiting.step.pinPopup, true);
    assert.equal(waiting.step.targets[0].kind, "hex-tile");
    assert.equal(waiting.step.targets[0].id, "crisis-local");
    const open = resolveTutorialStep(
      snap({ screen: "workshop", tilePopupOpen: true }),
      i
    );
    assert.equal(open.step.id, "crisis-card");
    assert.equal(open.step.mode, "read");
    assert.equal(open.step.pinPopup, true);
  });

  it("mint-iot waits for an Internet of Things tile", () => {
    const i = TUTORIAL_STEPS.findIndex((s) => s.id === "mint-iot");
    const stuck = resolveTutorialStep(
      snap({
        screen: "workshop",
        focusedTechId: "drones",
        tiles: [{ id: "d", kind: "invention", techId: "drones", q: null, r: null }],
      }),
      i
    );
    assert.equal(stuck.step.id, "mint-iot");
    assert.equal(stuck.step.targets[0].selector, "#btn-mint-custom");
    const mintDrones = TUTORIAL_STEPS.find((s) => s.id === "mint-drones");
    assert.equal(mintDrones.targets[0].selector, "#btn-mint-custom");
    assert.equal(mintDrones.targets.some((t) => t.kind === "tech"), false);
    const minted = resolveTutorialStep(
      snap({
        screen: "workshop",
        focusedTechId: "iot",
        tiles: [{ id: "a", kind: "invention", techId: "iot", q: null, r: null }],
      }),
      i
    );
    assert.equal(minted.step.id, "drag-iot");
  });

  it("shows Future vision after each dock and advances when the picture changes", () => {
    const ids = TUTORIAL_STEPS.map((s) => s.id);
    assert.ok(ids.indexOf("drag-iot") + 1 === ids.indexOf("vision-iot"));
    assert.ok(ids.indexOf("drag-drones") + 1 === ids.indexOf("vision-drones"));
    const i = ids.indexOf("vision-iot");
    const waiting = resolveTutorialStep(
      snap({
        screen: "workshop",
        visionArmed: "vision-iot",
        visionUrl: "old.png",
        visionBaseline: "old.png",
      }),
      i
    );
    assert.equal(waiting.step.id, "vision-iot");
    assert.equal(waiting.step.targets[0].selector, "#vision-root");
    assert.equal(waiting.step.holdNext, true);
    const updated = resolveTutorialStep(
      snap({
        screen: "workshop",
        visionArmed: "vision-iot",
        visionUrl: "new.png",
        visionBaseline: "old.png",
      }),
      i
    );
    assert.equal(updated.step.id, "vision-iot");
    assert.equal(updated.step.holdNext, false);
    const year = resolveTutorialStep(
      snap({
        screen: "workshop",
        tiles: [{ id: "inv-iot", kind: "invention", techId: "iot", q: 2, r: 2 }],
      }),
      TUTORIAL_STEPS.findIndex((s) => s.id === "timing-iot")
    );
    assert.equal(year.step.targets[0].selector, "#feasibility");
    assert.equal(year.step.targets[1].kind, "hex-tile");
    assert.equal(year.step.targets[1].id, "inv-iot");
    const meters = TUTORIAL_STEPS.find((s) => s.id === "meters-iot");
    assert.equal(meters.pinPopup, true);
    assert.equal(meters.showTile, "crisis-local");
    assert.equal(meters.targets[0].id, "crisis-local");
  });

  it("accepts the Stakeholder answer without the player having typed it", () => {
    const i = TUTORIAL_STEPS.findIndex((s) => s.id === "answer");
    const pending = resolveTutorialStep(
      snap({
        screen: "workshop",
        tilePopupOpen: true,
        concern: { answered: false, pending: false, answer: "" },
      }),
      i
    );
    assert.equal(pending.step.id, "answer");
    const done = resolveTutorialStep(
      snap({
        screen: "workshop",
        tilePopupOpen: true,
        concern: { answered: true, pending: false, answer: "" },
      }),
      i
    );
    assert.equal(done.step.id, "answer-judged");
    assert.equal(done.step.pinPopup, true);
    assert.equal(done.step.dockBottom, true);
    const ids = TUTORIAL_STEPS.map((s) => s.id);
    assert.ok(ids.indexOf("answer") < ids.indexOf("answer-judged"));
    assert.ok(ids.indexOf("answer-judged") < ids.indexOf("close-popup"));
  });

  it("keeps the summon step up while the challenger reel is open", () => {
    const i = TUTORIAL_STEPS.findIndex((s) => s.id === "summon");
    const spinning = resolveTutorialStep(
      snap({
        screen: "workshop",
        concernsOnBoard: 1,
        summonBusy: true,
        challengerDrawOpen: true,
      }),
      i
    );
    assert.equal(spinning.step.id, "summon");
    assert.equal(spinning.step.dockBottom, true);
    assert.equal(spinning.step.spotlight[0].selector, "#hex-challenger-draw");
    const landed = resolveTutorialStep(
      snap({
        screen: "workshop",
        concernsOnBoard: 1,
        summonBusy: false,
        challengerDrawOpen: false,
      }),
      i
    );
    assert.equal(landed.step.id, "market-news");
  });

  it("keeps the market bulletin until it has been seen and closed", () => {
    const i = TUTORIAL_STEPS.findIndex((s) => s.id === "market-news");
    const open = resolveTutorialStep(
      snap({
        screen: "workshop",
        turn: 1,
        marketNewsOpen: true,
        marketNewsSeen: true,
      }),
      i
    );
    assert.equal(open.step.id, "market-news");
    const closed = resolveTutorialStep(
      snap({
        screen: "workshop",
        turn: 1,
        marketNewsOpen: false,
        marketNewsSeen: true,
      }),
      i
    );
    assert.notEqual(closed.step.id, "market-news");
    const skipped = resolveTutorialStep(
      snap({
        screen: "workshop",
        turn: 1,
        marketNewsOpen: false,
        marketNewsSeen: false,
        marketNewsGaveUp: true,
      }),
      i
    );
    assert.equal(skipped.step.id, "open-stakeholder");
  });

  it("returns the graduation step once the outcome screen is up", () => {
    const r = resolveTutorialStep(snap({ screen: "outcome" }), 0);
    assert.equal(r.step.id, "graduation");
    assert.equal(r.step.mode, "finish");
    assert.equal(r.done, false);
  });

  it("orders Home before the hold", () => {
    const ids = TUTORIAL_STEPS.map((s) => s.id);
    assert.ok(ids.indexOf("home-quest") < ids.indexOf("hold"));
    assert.ok(ids.indexOf("drag-iot") < ids.indexOf("drag-drones"));
    const seq = [
      "hover-crisis",
      "crisis-card",
      "focus-iot",
      "vision-iot",
      "timing-iot",
      "meters-iot",
      "log-iot",
      "focus-drones",
      "drag-drones",
      "vision-drones",
      "focus-battery",
      "drag-battery",
      "converge-battery",
      "pathway-pair",
      "pathway-how",
      "pathway-read",
      "end-turn",
      "summon",
    ];
    for (let n = 1; n < seq.length; n++) {
      assert.ok(ids.indexOf(seq[n - 1]) < ids.indexOf(seq[n]), seq[n]);
    }
    assert.deepEqual(
      TUTORIAL_STEPS.find((s) => s.id === "drag-drones").place,
      { techId: "drones", q: 4, r: 2 }
    );
    assert.deepEqual(
      TUTORIAL_STEPS.find((s) => s.id === "drag-battery").place,
      { techId: "battery", q: 5, r: 2 }
    );
    assert.equal(ids.at(-1), "graduation");
    assert.equal(idAt(0), "home-quest");
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
    const step = TUTORIAL_STEPS.find((s) => s.id === "paste-iot");
    const once = tutorialCardSpeakText(step);
    assert.equal(tutorialCardSpeakText(step), once);
    assert.match(once, /^How the sensors work\. \[pause\]/);
    assert.match(once, /What is scarce here\? Clean well water/);
    assert.match(once, /How does this emTech make it more abundant\?/);
    assert.match(once, /Cheap nitrate sensors/);
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

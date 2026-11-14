import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createWorkshopGuidance, workshopTimeConsequences } from "./workshop-guidance.js";
import { resolveTourStep } from "./guided-tour.js";

function harness(extra = {}) {
  const nodes = new Map();
  for (const id of ["workshop-guidance", "workshop-guidance-title", "workshop-guidance-body", "workshop-guidance-reveal"]) {
    nodes.set(`#${id}`, { textContent: "", addEventListener() {}, hidden: false });
  }
  const target = { focusCount: 0, scrollCount: 0, closest: () => null, matches: () => true,
    focus() { this.focusCount++; }, scrollIntoView() { this.scrollCount++; } };
  let current = { screen: "workshop", runKey: "run-a", seatKey: "seat-a", focusedTechId: "ai", howTextLength: 20 };
  const calls = [];
  const ctl = createWorkshopGuidance({ document: { querySelector: (id) => nodes.get(id) }, snapshot: () => current,
    findTarget: () => target, reveal: (task) => calls.push(task), ...extra });
  return { ctl, target, nodes, calls, get current() { return current; }, set current(value) { current = value; } };
}

describe("shared Workshop recommendation", () => {
  it("waits for actual crisis cards and treats a restored empty run as ready to choose", () => {
    const task = resolveTourStep({ crisisIntroductionPending: 2 });
    assert.equal(task.id, "C3");
    assert.equal(task.surface, "briefing");
    assert.equal(task.target.selector, "#crisis-introduction-cards");
    const restored = resolveTourStep({ crisisIntroductionPending: 0, suggestedIds: [] });
    assert.equal(restored.id, "E3");
    assert.equal(restored.surface, "idea");
    assert.doesNotMatch(restored.title + restored.body, /fail|Bonds is red/);
  });
  it("reports guarded availability and actual costs without invoking action callbacks", () => {
    const task = resolveTourStep({ focusedTechId: "ai", actionAvailability: {
      "#btn-ask-ideas": { available: false, reason: "Need 1 AP", costLabel: "1 AP" },
    } });
    assert.equal(task.id, "F1");
    assert.equal(task.availability.available, false);
    assert.match(task.explanation, /Need 1 AP/);
    assert.match(task.explanation, /drafting/);
    const free = resolveTourStep({ focusedTechId: "ai", actionAvailability: {
      "#btn-ask-ideas": { available: true, costLabel: "0 AP" },
    } });
    assert.match(free.explanation, /0 AP/);
  });
  it("keeps tutor entry and pending work distinct from forbidden free browsing", () => {
    assert.equal(resolveTourStep({ isLearning: true, tutorOn: true }).surface, "help");
    assert.match(resolveTourStep({ pathway: { timingPending: true } }).body, /drafting remain available/);
    assert.match(resolveTourStep({ ui: { createBusy: true } }).body, /keep your draft/);
  });
});

describe("passive current-job strip", () => {
  it("shares ? advice and repeated refresh never navigates, focuses, spends, or calls a provider", () => {
    const h = harness();
    for (let i = 0; i < 4; i++) h.ctl.refresh(h.current);
    const task = resolveTourStep(h.current);
    assert.equal(h.nodes.get("#workshop-guidance-title").textContent, task.title);
    assert.equal(h.nodes.get("#workshop-guidance-body").textContent, task.explanation);
    assert.equal(h.calls.length, 0);
    assert.equal(h.target.focusCount, 0);
    assert.equal(h.target.scrollCount, 0);
  });
  it("does not follow new advice when an editor input is followed by a delayed result", () => {
    const h = harness();
    h.ctl.refresh(h.current);
    h.current = { ...h.current, howTextLength: 80, placedInventionCount: 1, pathway: { coverage: "red" } };
    h.ctl.refresh(h.current, { suspended: true });
    assert.equal(h.calls.length, 0);
    assert.equal(h.target.focusCount, 0);
  });
  it("reveals only explicitly and repeated clicks discard an older completion", async () => {
    const releases = [];
    const h = harness({ reveal: () => new Promise((resolve) => releases.push(resolve)) });
    h.ctl.refresh(h.current);
    const first = h.ctl.reveal();
    const second = h.ctl.reveal();
    releases[1]();
    assert.equal(await second, true);
    releases[0]();
    assert.equal(await first, false);
    assert.equal(h.target.focusCount, 1);
  });
  it("a missing target offers an honest Board return without executing the action", async () => {
    let returns = 0;
    const h = harness({ findTarget: () => null, returnToBoard: () => returns++ });
    h.ctl.refresh(h.current);
    assert.equal(await h.ctl.reveal(), false);
    assert.match(h.nodes.get("#workshop-guidance-body").textContent, /no longer available/);
    assert.equal(h.nodes.get("#workshop-guidance-reveal").textContent, "Back to Board");
    await h.ctl.reveal();
    assert.equal(returns, 1);
  });
  it("cannot focus a disabled or hidden target", async () => {
    const h = harness();
    h.ctl.refresh(h.current);
    h.target.disabled = true;
    assert.equal(await h.ctl.reveal(), false);
    h.target.disabled = false;
    h.target.closest = () => ({});
    assert.equal(h.target.focusCount, 0);
  });
  it("cannot claim successful reveal of a target hidden by route CSS", async () => {
    const h = harness();
    h.target.getClientRects = () => [];
    h.ctl.refresh(h.current);
    assert.equal(await h.ctl.reveal(), false);
    assert.equal(h.target.focusCount, 0);
    assert.match(h.nodes.get("#workshop-guidance-body").textContent, /no longer available/);
  });
  for (const field of ["runKey", "seatKey"]) it(`a delayed reveal cannot return to a stale ${field}`, async () => {
    let release;
    const h = harness({ reveal: () => new Promise((resolve) => { release = resolve; }) });
    h.ctl.refresh(h.current);
    const pending = h.ctl.reveal();
    const original = h.current;
    h.current = { ...original, [field]: "different" };
    h.ctl.refresh(h.current);
    h.current = original;
    h.ctl.refresh(h.current);
    release();
    assert.equal(await pending, false);
    assert.equal(h.target.focusCount, 0);
  });
});

describe("calendar explanations", () => {
  it("matches solo time and active Quest pressure without suggesting Budget refills", () => {
    const copy = workshopTimeConsequences({ waitYears: 3, pressureRise: { Water: 1 } });
    assert.match(copy.endTurn, /advances one year/);
    assert.match(copy.endTurn, /yearly crisis rises/);
    assert.match(copy.endTurn, /Budget does not refill/);
    assert.match(copy.wait, /advances 3 years/);
    assert.match(workshopTimeConsequences().endTurn, /does not raise/);
  });
  it("explains multiplayer turn passage independently of solo annual pressure", () => {
    const copy = workshopTimeConsequences({ multiplayer: true, pressureRise: { Water: 1 } });
    assert.match(copy.endTurn, /passes to the next seat/);
    assert.match(copy.endTurn, /round rules/);
    assert.doesNotMatch(copy.endTurn, /advances one year/);
    assert.match(copy.wait, /other seats keep their own year/);
  });
});

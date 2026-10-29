import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("./game.js", import.meta.url), "utf8");
function slice(start, end) {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a);
  assert.ok(a >= 0 && b > a, `missing source markers: ${start}`);
  return source.slice(a, b);
}

function setup(mode = "solo") {
  const timers = new Map();
  let nextTimer = 0;
  let seat = "a";
  const bridge = { getViewId: () => seat, viewingOther: () => seat !== "a" };
  const elements = Object.fromEntries(["invention-how", "invention-impact", "invention-name"].map((id) => [id, {
    id, handlers: {}, addEventListener(type, fn) { (this.handlers[type] ||= []).push(fn); },
  }]));
  const calls = { assess: [], vision: [], commit: 0 };
  const state = { mission: { id: "quest" }, mp: mode === "solo" ? null : { mode, code: "room", viewSeatId: "a" }, year: 2026,
    selectedTechIds: ["tech"], inventionHow: "", inventionImpact: "", inventionName: "", aiTiming: null, coInventor: null };
  const document = { activeElement: null };
  const noop = () => {};
  const ctx = {
    state, document, mpBridge: () => mode === "solo" ? null : bridge,
    clearTimeout: (id) => timers.delete(id), setTimeout: (fn, ms) => { const id = ++nextTimer; timers.set(id, { fn, ms }); return id; },
    writeCommitTimer: null, writeCommitInFlight: false, suppressInventBlurCommit: false,
    lastRoomVisionKey: "", lastSettledTiming: null, INVENT_SOFT_SAVE_MS: 1000,
    $: (s) => elements[s.slice(1)], $$: () => [],
    isViewedInventStoryLocked: () => false, isMpContributionLocked: () => false,
    applyStoryFieldLocks: noop, flashToast: noop, renderTiming: noop, renderFeasibility: noop,
    updateChallengeButton: noop, softPersistInventDrafts: noop, scheduleCloudRunState: noop,
    commitWriteIfNeeded: async () => { calls.commit++; },
    selectedTechs: () => state.selectedTechIds, timingCacheKey: () => `${state.year}|${state.inventionHow}`,
    apiCoInvent: async () => { calls.assess.push({ seat, how: state.inventionHow }); return { timing: { level: "green" } }; },
    applyTimingYearMonotonicity: (x) => x, formatTimingLog: () => ({}), appendCaptainLog: noop, recordSettledTimingLevel: noop,
    updateVision: (opts) => calls.vision.push(ctx.storyVisionGuard(opts)),
  };
  vm.createContext(ctx);
  vm.runInContext(slice('let _aiTimingTimer = null;', '/** Last settled traffic-light color'), ctx);
  vm.runInContext(slice('function isAiTimingAssessPending()', 'async function enterChallenge()'), ctx);
  vm.runInContext(slice('  const scheduleSoftInventSave = () => {', '  $("#btn-fill-other")?.addEventListener'), ctx);
  return {
    calls, state, document, bridge, elements, ctx,
    input(id, value) { document.activeElement = elements[id]; for (const fn of elements[id].handlers.input || []) fn({ target: { value } }); },
    async blur(id, next = null) { document.activeElement = next ? elements[next] : null; for (const fn of elements[id].handlers.blur || []) await fn(); },
    async fire(ms) { for (const [id, timer] of [...timers]) if (timer.ms === ms) { timers.delete(id); await timer.fn(); } await Promise.resolve(); },
    switchSeat(to) { ctx.prepareStorySeatSwitch(bridge, to); document.activeElement = null; seat = to; if (state.mp) state.mp.viewSeatId = to; },
    switchViaHydration(to) { seat = to; ctx.prepareStoryHydration(bridge); if (state.mp) state.mp.viewSeatId = to; },
    resume() { ctx.flushStoryEdits(); },
    visionGuard(opts = {}) { return ctx.storyVisionGuard(opts); },
  };
}

const longHow = "A workable draft explaining how the invention works with sufficient detail.";
describe("story editing AI triggers", () => {
  it("does not assess or generate during typing and commits after leaving story fields", async () => {
    const h = setup();
    h.input("invention-how", longHow);
    await h.fire(1600);
    assert.equal(h.calls.assess.length, 0);
    await h.blur("invention-how", "invention-impact");
    h.input("invention-impact", "daily life");
    await h.fire(1600);
    assert.equal(h.calls.assess.length, 0);
    assert.equal(h.calls.vision.length, 0);
    await h.blur("invention-impact");
    assert.equal(h.calls.vision.length, 1);
    assert.equal(h.calls.vision[0](), true);
    await h.fire(1600);
    assert.equal(h.calls.assess.length, 1);
  });

  it("preserves cached timing for impact-only edits", async () => {
    const h = setup();
    h.state.aiTiming = { level: "green" };
    h.input("invention-impact", "daily life");
    assert.equal(h.state.aiTiming.level, "green");
    await h.blur("invention-impact");
    await h.fire(1600);
    assert.equal(h.calls.assess.length, 0);
  });

  it("defers a real queued timer when name editing resumes", async () => {
    const h = setup();
    h.input("invention-how", longHow);
    await h.blur("invention-how");
    h.document.activeElement = h.elements["invention-name"];
    await h.fire(1600);
    assert.equal(h.calls.assess.length, 0);
    h.input("invention-name", "name");
    await h.blur("invention-name");
    await h.fire(1600);
    assert.equal(h.calls.assess.length, 1);
  });

  for (const mode of ["room", "hotseat"]) {
    it(`${mode}: suppresses automatic vision while focused and retries on blur`, async () => {
      const h = setup(mode);
      const automatic = h.visionGuard();
      h.input("invention-how", longHow);
      assert.equal(automatic(), false);
      assert.equal(h.visionGuard({ force: true })(), true);
      await h.blur("invention-how");
      assert.equal(h.calls.vision.length, 1);
      assert.equal(h.calls.vision[0](), true);
    });
    it(`${mode}: retains pending assessment for the originating seat`, async () => {
      const h = setup(mode);
      h.input("invention-how", longHow);
      h.switchSeat("b");
      h.state.inventionHow = "another invention with different text and sufficient length";
      h.resume();
      await h.fire(1600);
      assert.equal(h.calls.assess.length, 0);
      h.switchSeat("a");
      h.state.inventionHow = longHow;
      h.resume();
      await h.fire(1600);
      assert.deepEqual(h.calls.assess, [{ seat: "a", how: longHow }]);
    });
  }

  it("does not reapply a focused draft across seats with empty fields", () => {
    const h = setup("room");
    vm.runInContext(slice("function captureFocusedInventDrafts()", "/**\n * Soft-persist invent prose"), h.ctx);
    h.elements["invention-how"].value = longHow;
    h.document.activeElement = h.elements["invention-how"];
    const drafts = h.ctx.captureFocusedInventDrafts();
    h.state.mp.viewSeatId = "b";
    h.state.inventionHow = "";
    h.ctx.reapplyFocusedInventDrafts(drafts);
    assert.equal(h.state.inventionHow, "");
  });

  it("keeps a delayed response from writing to a different hydrated seat", async () => {
    const h = setup("room");
    let resolve;
    h.ctx.apiCoInvent = () => new Promise((r) => { resolve = r; });
    h.input("invention-how", longHow);
    await h.blur("invention-how");
    await h.fire(1600);
    assert.equal(typeof resolve, "function");
    h.switchViaHydration("b");
    h.state.inventionHow = "A different invention";
    h.state.aiTiming = null;
    resolve({ timing: { level: "green" } });
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(h.state.aiTiming, null);
    h.switchViaHydration("a");
    h.state.inventionHow = longHow;
    h.ctx.apiCoInvent = async () => { h.calls.assess.push({ seat: "a", how: longHow }); return { timing: { level: "green" } }; };
    h.resume();
    await h.fire(1600);
    assert.equal(h.calls.assess.length, 1);
  });

  it("drops a queued vision when editing resumes", async () => {
    const h = setup();
    h.input("invention-how", longHow);
    await h.blur("invention-how");
    const first = h.calls.vision[0];
    h.input("invention-how", longHow + " More.");
    assert.equal(first(), false);
    await h.blur("invention-how");
    assert.equal(h.calls.vision[1](), true);
  });

  it("retries a queued vision after a name edit has already blurred", async () => {
    const h = setup();
    h.input("invention-how", longHow);
    await h.blur("invention-how");
    const first = h.calls.vision[0];
    h.input("invention-name", "New name");
    await h.blur("invention-name");
    assert.equal(h.calls.vision.length, 1);
    assert.equal(first(), false);
    await h.fire(0);
    assert.equal(h.calls.vision.length, 2);
    assert.equal(h.calls.vision[1](), true);
  });
});

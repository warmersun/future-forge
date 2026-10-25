import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { catalogLessonSkipsPlan, hostedSessionAllowed } from "./hosted-plan.js";
import { parseDeepLink, sanitizeQuestToken, questLinkOutcome } from "../deep-link.js";

const source = fs.readFileSync(new URL("../game.js", import.meta.url), "utf8");
function span(start, end) {
  assert.ok(source.includes(start) && source.includes(end), "browser extraction markers exist");
  return source.slice(source.indexOf(start), source.indexOf(end));
}
const gate = span('const HOSTED_SUBSCRIBE_URL =', '  // Multiplayer intercept — same cards, different continue');
const continueHandler = span('let continueInFlight = false;', 'async function syncCloudPins()');
const continueOffer = span('async function maybeOfferContinue()', 'function overlayContinueCompanion(');
const questFetch = span('async function fetchFullQuestTile(', '/**\n * Play a catalog entry');
const deepLinkHandler = span('async function consumeDeepLink()', '/**\n * @param {string|ArrayBuffer} text');
const ids = ["btn-start", "btn-choose-theme", "btn-tutorial", "btn-surprise", "btn-friends", "btn-cloud-continue"];
const response = (body, status = 200) => ({ ok: status >= 200 && status < 300, status,
  json: async () => body?.subscription ? { ok: true, signedIn: true, ...body } : body });
const tick = () => new Promise((resolve) => setImmediate(resolve));
async function drain() { for (let i = 0; i < 8; i++) await tick(); }
function deferred() {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
}

// Execute the real browser gate, capture listener, replay, startMission prologue,
// and Continue handler together. Only the post-gate gameplay body is replaced.
function browser(options = {}) {
  const calls = { health: 0, me: 0, signIn: 0, launches: [], titles: [], messages: [], redirects: [], refresh: 0 };
  const config = {
    health: () => response({ cloudAi: true }),
    me: () => response({ subscription: { entitled: true } }),
    signedIn: true,
    lookup: async () => ({ tile: { source: "remote", access: "account" } }),
    ...options,
  };
  const mission = { id: "saved-quest", access: "paid", ...options.mission };
  const state = { cloudContinue: { questId: mission.id, play: { mission } }, hostedQuestsLoaded: false };
  let listener;
  let runtime;
  class Button {
    constructor(id) { this.id = id; this.disabled = false; }
    closest() { return this; }
    click() {
      let blocked = false;
      listener({ target: this, preventDefault() { blocked = true; }, stopImmediatePropagation() { blocked = true; } });
      if (blocked) return;
      calls.titles.push(this.id);
      if (this.id === "btn-cloud-continue") void runtime.continueCloudRun();
    }
  }
  const buttons = Object.fromEntries(ids.map((id) => [id, new Button(id)]));
  const dependencies = {
    state,
    document: { addEventListener(type, fn, capture) { assert.equal(capture, true); listener = fn; }, getElementById: (id) => buttons[id] },
    Element: Button,
    location: { href: options.href || "https://ff.warmersun.com/", assign: (url) => calls.redirects.push(url) },
    whenAuthReady: async () => {},
    // Do not retain the losing auth-readiness timeout in the test runner.
    setTimeout: () => 0,
    AbortSignal,
    fetch: async () => { calls.health++; return config.health(); },
    apiFetch: async (url) => { calls.me++; return config.me(url); },
    isClerkSignedIn: () => config.signedIn,
    openCloudSignIn: () => { calls.signIn++; },
    flashToast: (message) => calls.messages.push(message),
    catalogLessonSkipsPlan,
    hostedSessionAllowed,
    parseDeepLink,
    sanitizeQuestToken,
    questLinkOutcome,
    lookupQuestById: (...args) => config.lookup(...args),
    roomBridge: { isRoom: () => false },
    hotseatBridge: { isHotseat: () => false },
    $: (selector) => buttons[selector.slice(1)],
    validateContinueWorld: () => ({ ok: true }),
    refreshHostedQuests: async () => { calls.refresh++; },
    resolveContinueMission: async () => mission,
    promptCloudSignIn: () => { calls.signIn++; },
    calls,
  };
  runtime = new Function(...Object.keys(dependencies), `${gate}
    calls.launches.push({ mission, opts }); return true;
  }
  ${continueHandler}
  ${questFetch}
  let deepLinkFinished = false;
  let deepLinkInFlight = false;
  let missionPickSession = null;
  ${deepLinkHandler}
  holdHostedTitleLaunch();
  return { enforceHostedPlan, startMission, continueCloudRun, fetchFullQuestTile, consumeDeepLink,
    settled: () => hostedLaunchSettled, plan: () => hostedPlanState };
  `)(...Object.values(dependencies));
  return { ...runtime, calls, config, state, buttons, mission };
}

describe("actual hosted browser gate", () => {
  it("does not re-emit session invalidation after a hosted Continue-read 401", async () => {
    for (const hosted of [true, false]) {
      const calls = { invalidated: 0, unavailable: 0, reads: 0 };
      const btn = {};
      const state = { cloudContinue: { questId: "saved" } };
      const run = new Function("$", "isClerkSignedIn", "apiFetch", "state", "flashToast",
        "isHostedClerkGame", "hostedPlanUnavailable", "invalidateClerkSession", `${continueOffer}; return maybeOfferContinue;`)(
        () => btn, () => true,
        async () => { calls.reads++; return response({ error: "invalid_token" }, 401); }, state,
        () => {}, () => hosted, () => { calls.unavailable++; }, () => { calls.invalidated++; }
      );
      await run();
      assert.equal(calls.reads, 1);
      assert.equal(calls.invalidated, hosted ? 0 : 1);
      assert.equal(calls.unavailable, hosted ? 1 : 0);
      assert.equal(btn.hidden, false, "a cached Continue save remains recoverable");
    }
  });

  for (const [label, overrides] of [
    ["health network failure", { health: () => { throw new Error("offline"); } }],
    ["health HTTP failure", { health: () => response({}, 503) }],
    ["health missing cloud flag", { health: () => response({}) }],
    ["health nonboolean flag", { health: () => response({ cloudAi: "false" }) }],
    ["health invalid JSON", { health: () => ({ ok: true, json: async () => { throw new Error("JSON"); } }) }],
    ["backend invalid_token with a live Clerk session", { me: () => response({ error: "invalid_token" }, 401) }],
    ["backend HTTP failure", { me: () => response({}, 503) }],
    ["missing subscription", { me: () => response({}) }],
    ["unknown entitlement", { me: () => response({ subscription: { entitled: "true" } }) }],
    ["failed account with a claimed entitlement", { me: () => response({ ok: false, subscription: { entitled: true } }) }],
    ["anonymous account with a claimed entitlement", { me: () => response({ signedIn: false, subscription: { entitled: true } }) }],
    ["missing account verification fields", { me: () => ({ ok: true, status: 200,
      json: async () => ({ subscription: { entitled: true } }) }) }],
    ["backend network failure", { me: () => { throw new Error("offline"); } }],
    ["backend timeout", { me: () => { throw new DOMException("Timed out", "TimeoutError"); } }],
    ["backend invalid JSON", { me: () => ({ ok: true, json: async () => { throw new Error("JSON"); } }) }],
  ]) {
    it(`fails closed on ${label}, including repeated clicks, direct start, and Continue`, async () => {
      const b = browser(overrides);
      assert.equal(await b.enforceHostedPlan(), true);
      assert.equal(b.settled(), false);
      assert.equal(b.plan().entitled, false);
      for (const id of ids) {
        b.buttons[id].click();
        await drain();
      }
      assert.equal(b.startMission(b.mission), false);
      await b.continueCloudRun();
      await drain();
      assert.deepEqual(b.calls.launches, []);
      assert.deepEqual(b.calls.titles, []);
      assert.equal(b.calls.refresh, 0, "failed Continue never reaches catalog/restore work");
      assert.equal(b.calls.signIn, 0, "verifier failure is not an absent Clerk session");
      assert.deepEqual(b.calls.redirects, []);
      assert.match(b.calls.messages.at(-1), /paused.*retry/i);
      if (label.includes("invalid_token")) assert.match(b.calls.messages[0], /signed in.*could not verify/i);
    });
  }

  it("shares a pending check and replays only one title action after verification", async () => {
    const pending = deferred();
    const b = browser({ me: () => pending.promise });
    const checking = b.enforceHostedPlan();
    await drain();
    for (const id of ids.slice(0, -1)) b.buttons[id].click();
    await drain();
    assert.equal(b.calls.me, 1);
    assert.equal(b.settled(), false);
    assert.deepEqual(b.calls.titles, []);
    pending.resolve(response({ subscription: { entitled: true } }));
    assert.equal(await checking, false);
    await drain();
    assert.deepEqual(b.calls.titles, ["btn-friends"]);
    assert.equal(b.calls.health, 1);
  });

  it("does not start a direct mission or Continue while verification is pending", async () => {
    const pending = deferred();
    const b = browser({ me: () => pending.promise });
    assert.equal(b.startMission(b.mission), false);
    const continuing = b.continueCloudRun();
    await drain();
    assert.deepEqual(b.calls.launches, []);
    assert.equal(b.calls.refresh, 0);
    pending.resolve(response({ error: "invalid_token" }, 401));
    await continuing;
    await drain();
    assert.deepEqual(b.calls.launches, []);
    assert.equal(b.calls.refresh, 0);
    assert.equal(b.calls.signIn, 0);
  });

  it("retries successfully without re-sign-in and does not retain the failed click", async () => {
    const b = browser({ me: () => response({}, 401) });
    b.buttons["btn-start"].click();
    await drain();
    assert.deepEqual(b.calls.titles, []);
    b.config.me = () => response({ subscription: { entitled: true } });
    b.buttons["btn-surprise"].click();
    await drain();
    assert.deepEqual(b.calls.titles, ["btn-surprise"]);
    assert.equal(b.settled(), true);
    assert.equal(b.calls.signIn, 0);
    assert.equal(b.startMission(b.mission), true);
  });

  it("resumes a deferred direct mission only after success and preserves restore options", async () => {
    const pending = deferred();
    const b = browser({ me: () => pending.promise });
    const opts = { restore: b.state.cloudContinue };
    assert.equal(b.startMission(b.mission, opts), false);
    await drain();
    assert.deepEqual(b.calls.launches, []);
    pending.resolve(response({ subscription: { entitled: true } }));
    await drain();
    assert.deepEqual(b.calls.launches, [{ mission: b.mission, opts }]);
  });

  it("does not let an account-only lesson skip failed account verification", async () => {
    const b = browser({ mission: { access: "account", source: "remote" }, me: () => response({}, 401) });
    assert.equal(await b.enforceHostedPlan({ mission: b.mission }), true);
    assert.equal(b.startMission(b.mission), false);
    await b.continueCloudRun();
    await drain();
    assert.deepEqual(b.calls.launches, []);
    assert.equal(b.calls.signIn, 0);
    assert.deepEqual(b.calls.redirects, []);
  });

  it("revokes a previously permissive cached plan as soon as a recheck starts/fails", async () => {
    const b = browser();
    assert.equal(await b.enforceHostedPlan(), false);
    const pending = deferred();
    b.config.me = () => pending.promise;
    const checking = b.enforceHostedPlan();
    assert.equal(b.settled(), false);
    b.buttons["btn-start"].click();
    assert.equal(b.startMission(b.mission), false);
    pending.resolve(response({}, 503));
    assert.equal(await checking, true);
    await drain();
    assert.deepEqual(b.calls.launches, []);
    assert.deepEqual(b.calls.titles, []);
  });

  it("requires sign-in only when the browser session is actually absent", async () => {
    const b = browser({ signedIn: false });
    assert.equal(await b.enforceHostedPlan(), true);
    assert.equal(b.calls.me, 0);
    assert.equal(b.calls.signIn, 1);
    assert.equal(b.settled(), false);
  });

  it("does not apply a successful account response after browser sign-out", async () => {
    const pending = deferred();
    const b = browser({ me: () => pending.promise });
    const checking = b.enforceHostedPlan();
    await drain();
    b.config.signedIn = false;
    pending.resolve(response({ subscription: { entitled: true } }));
    assert.equal(await checking, true);
    assert.equal(b.settled(), false);
    assert.equal(b.plan().entitled, false);
  });

  it("keeps a verified self-host open without account API/sign-in", async () => {
    const b = browser({ signedIn: false, health: () => response({ cloudAi: false }) });
    assert.equal(await b.enforceHostedPlan(), false);
    for (const id of ids.slice(0, -1)) b.buttons[id].click();
    assert.deepEqual(b.calls.titles, ids.slice(0, -1));
    assert.equal(b.startMission(b.mission), true);
    assert.equal(b.calls.me, 0);
    assert.equal(b.calls.signIn, 0);
  });

  it("redirects a known unpaid regular mission to subscribe", async () => {
    const b = browser({ me: () => response({ subscription: { entitled: false, subscribeUrl: "https://warmersun.com/portal/subscribe?test" } }) });
    assert.equal(await b.enforceHostedPlan(), true);
    assert.deepEqual(b.calls.redirects, ["https://warmersun.com/portal/subscribe?test"]);
    assert.equal(b.startMission(b.mission), false);
    assert.deepEqual(b.calls.launches, []);
    assert.equal(b.calls.signIn, 0);
  });

  it("allows a verified unpaid account-only lesson, but not regular title launches", async () => {
    const b = browser({ mission: { access: "account", source: "remote" }, me: () => response({ subscription: { entitled: false } }) });
    assert.equal(await b.enforceHostedPlan({ mission: b.mission }), false);
    assert.equal(b.startMission(b.mission), true);
    await b.continueCloudRun();
    assert.equal(b.calls.launches.length, 2);
    assert.deepEqual(b.calls.redirects, []);
    b.buttons["btn-start"].click();
    assert.deepEqual(b.calls.titles, []);
    assert.equal(b.calls.redirects.length, 1);
  });

  it("allows account-only Continue from a pending title check", async () => {
    const b = browser({ mission: { access: "account", source: "remote" }, me: () => response({ subscription: { entitled: false } }) });
    b.buttons["btn-cloud-continue"].click();
    await drain();
    assert.deepEqual(b.calls.titles, ["btn-cloud-continue"]);
    assert.equal(b.calls.launches.length, 1);
    assert.deepEqual(b.calls.redirects, []);
  });

  it("preserves the account-lesson URL exception without lending it to another mission", async () => {
    const b = browser({ href: "https://ff.warmersun.com/?q=lesson-a", me: () => response({ subscription: { entitled: false } }) });
    assert.equal(await b.enforceHostedPlan(), false);
    assert.deepEqual(b.calls.redirects, []);
    assert.equal(b.startMission(b.mission), false);
    assert.equal(b.calls.redirects.length, 1);
  });

  it("invalidates access, not the Clerk session, on a quest-body backend 401", async () => {
    const b = browser();
    await b.enforceHostedPlan();
    b.config.me = () => response({ error: "invalid_token" }, 401);
    assert.equal(await b.fetchFullQuestTile("quest-a", { keepUrl: true }), null);
    assert.equal(b.settled(), false);
    assert.equal(b.plan().entitled, false);
    assert.equal(b.calls.signIn, 0);
    assert.deepEqual(b.calls.redirects, []);
    assert.match(b.calls.messages.at(-1), /signed in.*retry/i);
  });

  it("stops a signed-in deep-link verifier failure before companion/sign-in routing", async () => {
    const b = browser({ href: "https://ff.warmersun.com/?q=quest-a" });
    assert.equal(await b.enforceHostedPlan(), false);
    b.config.lookup = async () => ({ status: "sign_in_required", tile: { access: "account", source: "remote" } });
    await b.consumeDeepLink();
    assert.equal(b.settled(), false);
    assert.equal(b.calls.signIn, 0);
    assert.deepEqual(b.calls.redirects, []);
    assert.match(b.calls.messages.at(-1), /signed in.*retry/i);
  });
});

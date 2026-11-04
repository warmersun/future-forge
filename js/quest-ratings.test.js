import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  isQuestBriefed,
  markQuestBriefed,
  ratingControlHtml,
  readBriefedQuestIds,
} from "./quest-ratings.js";
import {
  isBriefingDismissed,
  paintQuestBriefing,
  setBriefingDismissed,
} from "./briefing-ui.js";

function memStore() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    get length() {
      return m.size;
    },
    key: (i) => [...m.keys()][i] ?? null,
  };
}

describe("quest rating eligibility", () => {
  it("records one briefing and does not drop it when the walk is replayed", () => {
    const store = memStore();
    assert.equal(markQuestBriefed("kiln-ferry", { storage: store, post: false }), true);
    assert.equal(markQuestBriefed("kiln-ferry", { storage: store, post: false }), true);
    assert.deepEqual(readBriefedQuestIds(store), ["kiln-ferry"]);
    const session = memStore();
    setBriefingDismissed("kiln-ferry", false, session);
    assert.equal(isBriefingDismissed("kiln-ferry", session), false);
    assert.equal(isQuestBriefed("kiln-ferry", store), true);
    assert.equal(markQuestBriefed("bad id", { storage: store, post: false }), false);
  });
});

describe("rating control", () => {
  it("keeps the tally outside a play button and locks it before the briefing", () => {
    const locked = ratingControlHtml({
      questId: "q1",
      eligible: false,
      signedIn: true,
      tally: { down: 2, up: 2, love: 0, mine: null, loaded: true },
    });
    assert.match(locked, /^<div class="quest-rate"/);
    assert.equal(locked.includes("<button"), false);
    assert.match(locked, /Finish the briefing to rate/);
    assert.equal(locked.split("is-leading").length - 1, 2);

    const open = ratingControlHtml({
      questId: "q1",
      eligible: true,
      signedIn: false,
      tally: { down: 0, up: 0, love: 1, mine: "love", loaded: true },
    });
    assert.equal(open.includes('data-rate="love"'), true);
    assert.equal(open.includes('aria-pressed="true"'), true);
    assert.equal(open.split('aria-pressed="true"').length - 1, 1);
    assert.match(open, /Sign in to rate/);
    assert.match(open, /Love this/);
    assert.doesNotMatch(open, /stars/i);

    const fresh = ratingControlHtml({
      questId: "q1",
      eligible: true,
      signedIn: true,
      tally: { loaded: false },
    });
    assert.equal(fresh.includes("quest-rate-count"), false);
    assert.equal(fresh.includes("No ratings yet"), false);

    const none = ratingControlHtml({
      questId: "q1",
      eligible: true,
      signedIn: true,
      tally: { down: 0, up: 0, love: 0, mine: null, loaded: true },
    });
    assert.match(none, /No ratings yet/);

    const src = readFileSync(new URL("./game.js", import.meta.url), "utf8");
    const start = src.indexOf("function catalogCardHtml");
    const end = src.indexOf("\nfunction learningCompletedInGroup");
    const fn = src.slice(start, end);
    const playStart = fn.indexOf('class="challenge-card');
    const playEnd = fn.indexOf("</button>", playStart);
    const rateAt = fn.indexOf("ratingControlHtml");
    assert.ok(playEnd > playStart);
    assert.ok(rateAt > playEnd);
    assert.match(fn, /class="catalog-card-face"/);
    assert.ok(fn.indexOf('class="catalog-card-face"') < playStart);
  });
});

describe("briefing walk records eligibility", () => {
  it("marks the quest when a finished briefing is shown again", () => {
    const prev = globalThis.localStorage;
    const briefed = memStore();
    const session = memStore();
    globalThis.localStorage = briefed;
    try {
      installDom();
      const root = fakeEl("vision-canvas-wrap");
      const banner = fakeEl("challenge-banner");
      const sceneEl = fakeEl("ws-mission-scene");
      banner.appendChild(sceneEl);
      setBriefingDismissed("q-rate", true, session);
      const snap = paintQuestBriefing(
        root,
        {
          id: "q-rate",
          place: "Kiln Ferry",
          briefMd: "## The place\n\nNight dock.\n\n## Your job\n\nInvent a handoff.",
          briefBeats: [
            { id: "place", title: "The place", bodyMd: "Night dock." },
            { id: "job", title: "Your job", bodyMd: "Invent a handoff." },
          ],
        },
        { sceneEl, storage: session }
      );
      assert.equal(snap.mode, "off");
      assert.equal(isQuestBriefed("q-rate"), true);
      setBriefingDismissed("q-rate", false, session);
      assert.equal(isBriefingDismissed("q-rate", session), false);
      assert.equal(isQuestBriefed("q-rate"), true);
    } finally {
      if (prev === undefined) delete globalThis.localStorage;
      else globalThis.localStorage = prev;
    }
  });
});

function fakeEl(className = "") {
  const el = {
    className,
    children: [],
    dataset: {},
    hidden: false,
    innerHTML: "",
    textContent: "",
    parentNode: null,
    classList: null,
    tagName: "DIV",
  };
  const classes = new Set(className.split(/\s+/).filter(Boolean));
  el.classList = {
    contains: (name) => classes.has(name),
    add: (...xs) => xs.forEach((x) => classes.add(x)),
    remove: (...xs) => xs.forEach((x) => classes.delete(x)),
    toggle: (name, on) => {
      if (on === false || (on === undefined && classes.has(name))) {
        classes.delete(name);
        return false;
      }
      classes.add(name);
      return true;
    },
  };
  el.querySelector = (sel) => {
    const cls = String(sel).replace(/^\./, "").split(/[\s.\[]/)[0];
    const stack = [...el.children];
    while (stack.length) {
      const node = stack.shift();
      if (node.classList?.contains(cls)) return node;
      stack.push(...(node.children || []));
    }
    return null;
  };
  el.querySelectorAll = () => [];
  el.appendChild = (child) => {
    child.parentNode = el;
    el.children.push(child);
    return child;
  };
  el.setAttribute = (name, value) => {
    el.dataset[name] = value;
  };
  el.removeAttribute = (name) => {
    delete el.dataset[name];
  };
  el.addEventListener = () => {};
  el.closest = () => bannerFrom(el);
  return el;
}

function bannerFrom(el) {
  let node = el;
  while (node) {
    if (node.classList?.contains("challenge-banner")) return node;
    node = node.parentNode;
  }
  return null;
}

function installDom() {
  globalThis.document = {
    createElement() {
      return fakeEl();
    },
    querySelectorAll() {
      return [];
    },
    addEventListener() {},
    body: fakeEl("body"),
  };
}

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  briefingOwnsRoot,
  briefingStorageKey,
  isBriefingDismissed,
  lastBriefingPaint,
  paintQuestBriefing,
  resetQuestBriefing,
  sceneCopyFromMission,
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

describe("briefing-ui storage", () => {
  it("builds a stable key", () => {
    assert.equal(briefingStorageKey("abc"), "ff.briefing.done.abc");
    assert.equal(briefingStorageKey(""), "");
  });

  it("remembers dismiss / replay", () => {
    const s = memStore();
    assert.equal(isBriefingDismissed("q1", s), false);
    setBriefingDismissed("q1", true, s);
    assert.equal(isBriefingDismissed("q1", s), true);
    setBriefingDismissed("q1", false, s);
    assert.equal(isBriefingDismissed("q1", s), false);
  });

  it("resetQuestBriefing clears dismissed flags so a new quest starts fresh", () => {
    const s = memStore();
    setBriefingDismissed("q1", true, s);
    setBriefingDismissed("q2", true, s);
    resetQuestBriefing({ clearDismissed: true, storage: s });
    assert.equal(isBriefingDismissed("q1", s), false);
    assert.equal(isBriefingDismissed("q2", s), false);
  });

  it("resetQuestBriefing can clear only the next mission's flag", () => {
    const s = memStore();
    setBriefingDismissed("q1", true, s);
    setBriefingDismissed("q2", true, s);
    resetQuestBriefing({ missionId: "q2", storage: s });
    assert.equal(isBriefingDismissed("q1", s), true);
    assert.equal(isBriefingDismissed("q2", s), false);
  });
});

describe("briefing-ui paint", () => {
  const beats = [
    {
      id: "place-1",
      role: "place",
      title: "The place",
      bodyMd: "Nurse Amina seals a swab under the awning.",
      imageUrl: "assets/problems/infectious.jpg",
    },
    {
      id: "strain-1",
      role: "strain",
      title: "What's strained",
      bodyMd: "The cooler fills while the truck is gone.",
      imageUrl: "assets/problems/infectious.jpg",
    },
    {
      id: "job-1",
      role: "job",
      title: "Your job",
      bodyMd: "Invent a same-shift workflow.",
      imageUrl: "assets/problems/infectious.jpg",
    },
  ];

  function fakeEl(className = "") {
    const el = {
      className,
      hidden: false,
      innerHTML: "",
      textContent: "",
      dataset: {},
      children: [],
      classList: {
        _c: new Set(className.split(/\s+/).filter(Boolean)),
        add(...xs) {
          xs.forEach((x) => this._c.add(x));
          el.className = [...this._c].join(" ");
        },
        remove(...xs) {
          xs.forEach((x) => this._c.delete(x));
          el.className = [...this._c].join(" ");
        },
        contains(x) {
          return this._c.has(x);
        },
        toggle(x, on) {
          if (on === false || (on === undefined && this._c.has(x))) {
            this.remove(x);
            return false;
          }
          this.add(x);
          return true;
        },
      },
      querySelector(sel) {
        const cls = String(sel).replace(/^\./, "").split(/[\s.\[]/)[0];
        const stack = [...el.children];
        while (stack.length) {
          const n = stack.shift();
          if (n.classList?.contains(cls) || String(n.className).split(/\s+/).includes(cls)) {
            return n;
          }
          stack.push(...(n.children || []));
        }
        return null;
      },
      querySelectorAll(sel) {
        const cls = String(sel).replace(/^\./, "").split(/[\s.>\[]/)[0];
        const out = [];
        const walk = (n) => {
          for (const c of n.children || []) {
            if (c.classList?.contains(cls) || String(c.className).split(/\s+/).includes(cls)) {
              out.push(c);
            }
            walk(c);
          }
        };
        walk(el);
        return out;
      },
      appendChild(c) {
        c.parentNode = el;
        el.children.push(c);
        return c;
      },
      closest(sel) {
        const want = String(sel || "").replace(/^\./, "").split(/[\s.#\[]/)[0];
        let n = el;
        while (n) {
          if (n.classList?.contains(want) || String(n.className || "").split(/\s+/).includes(want)) {
            return n;
          }
          n = n.parentNode;
        }
        return null;
      },
      addEventListener() {},
    };
    return el;
  }

  function installDom() {
    const created = [];
    globalThis.document = {
      createElement(tag) {
        const n = fakeEl();
        n.tagName = String(tag).toUpperCase();
        created.push(n);
        return n;
      },
      querySelectorAll() {
        return [];
      },
      addEventListener() {},
    };
    return created;
  }

  it("briefingOwnsRoot is per canvas", () => {
    const a = fakeEl("vision-canvas-wrap is-briefing");
    const b = fakeEl("vision-canvas-wrap");
    assert.equal(briefingOwnsRoot(a), true);
    assert.equal(briefingOwnsRoot(b), false);
    assert.equal(briefingOwnsRoot(null), false);
  });

  it("falls back to problem/description when there is no scene", () => {
    assert.equal(
      sceneCopyFromMission({ problem: "The fridge sheet does not match." }),
      "The fridge sheet does not match."
    );
    assert.equal(
      sceneCopyFromMission({ description: "A border clinic waits." }),
      "A border clinic waits."
    );
    installDom();
    const root = fakeEl("vision-canvas-wrap");
    const sceneEl = fakeEl("ws-mission-scene");
    const snap = paintQuestBriefing(root, { id: "q-empty", problem: "Only a problem line." }, {
      sceneEl,
    });
    assert.equal(snap.used, false);
    assert.equal(sceneEl.hidden, false);
    assert.equal(sceneEl.textContent, "Only a problem line.");
  });

  it("keeps beat title on the overlay without a duplicate job line", () => {
    installDom();
    const root = fakeEl("vision-canvas-wrap");
    const banner = fakeEl("challenge-banner");
    const sceneEl = fakeEl("ws-mission-scene");
    banner.appendChild(sceneEl);
    const snap = paintQuestBriefing(
      root,
      {
        id: "q-walk",
        summary: "Invent a same-shift workflow.",
        place: "Crossing Clinic 7",
        briefMd: "## The place\n\nClinic.\n\n## Your job\n\nInvent it.",
        briefBeats: beats,
      },
      { sceneEl, summary: "Invent a same-shift workflow." }
    );
    assert.equal(snap.active, true);
    assert.equal(snap.mode, "walk");
    assert.equal(briefingOwnsRoot(root), true);
    assert.equal(banner.classList.contains("is-briefing-walk"), true);
    assert.equal(banner.classList.contains("is-briefing-recap"), false);
    const overlay = root.querySelector(".quest-briefing-overlay");
    assert.ok(overlay);
    assert.doesNotMatch(overlay.innerHTML, /quest-briefing-job/);
    assert.doesNotMatch(overlay.innerHTML, /Full brief/);
    assert.doesNotMatch(overlay.innerHTML, /Start inventing/);
    assert.match(overlay.innerHTML, /The place/);
    assert.equal(lastBriefingPaint()?.mode, "walk");
    assert.equal(sceneEl.hidden, true);
    assert.doesNotMatch(sceneEl.innerHTML, /quest-brief-recap/);
  });

  it("after dismiss paints a compact recap, not the whole essay", () => {
    installDom();
    const store = memStore();
    setBriefingDismissed("q-recap", true, store);
    const root = fakeEl("vision-canvas-wrap");
    const banner = fakeEl("challenge-banner");
    const sceneEl = fakeEl("ws-mission-scene");
    banner.appendChild(sceneEl);
    const snap = paintQuestBriefing(
      root,
      {
        id: "q-recap",
        place: "Crossing Clinic 7",
        spotlight: { encourageCopy: "Invent a same-shift workflow." },
        briefMd:
          "## The place\n\nNurse Amina seals a swab.\n\n## The bigger problem\n\nTruth lives in a capital lab.\n\n## Your job\n\nInvent a same-shift workflow.",
        briefBeats: beats,
      },
      { sceneEl, storage: store }
    );
    assert.equal(snap.active, false);
    assert.equal(snap.mode, "off");
    assert.equal(sceneEl.hidden, false);
    assert.equal(banner.classList.contains("is-briefing-recap"), true);
    assert.equal(banner.classList.contains("is-briefing-walk"), false);
    assert.match(sceneEl.innerHTML, /quest-brief-recap/);
    assert.match(sceneEl.innerHTML, /The place/);
    assert.match(sceneEl.innerHTML, /The bigger problem/);
    assert.match(sceneEl.innerHTML, /Read the whole story/);
    assert.doesNotMatch(sceneEl.innerHTML, /quest-brief-recap-title">Your job/);
    assert.doesNotMatch(sceneEl.innerHTML, /Labeled tubes stack/);
    // Essay is briefMd minus Your job; recap-speak stays a sibling of details so
    // CSS `.quest-brief-recap:has(.quest-brief-full[open])` can hide the clip.
    assert.match(sceneEl.innerHTML, /quest-brief-recap-speak[\s\S]*<details class="quest-brief-full"/);
    assert.match(sceneEl.innerHTML, /<h2>The place<\/h2>/);
    assert.match(sceneEl.innerHTML, /<h2>The bigger problem<\/h2>/);
    assert.doesNotMatch(sceneEl.innerHTML, /<h2>Your job<\/h2>/);
    assert.doesNotMatch(sceneEl.innerHTML, /quest-brief-full-body[\s\S]*Invent a same-shift workflow/);
  });
});

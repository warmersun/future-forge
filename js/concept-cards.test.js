import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CONCEPT_CARDS,
  CONCEPT_KICKER,
  BODY_WORD_MAX,
  MUTED_KEY,
  listConcepts,
  conceptById,
  resolveConceptCard,
  readMutedConcepts,
  writeMutedConcepts,
  setConceptMuted,
  wordCount,
} from "./concept-cards.js";
import { DO_NOT_SAY } from "./tech-why.js";
import { glossaryEntry } from "./glossary.js";

function base(over = {}) {
  return {
    screen: "workshop",
    focusedTechId: null,
    sideTab: "vision",
    unplacedInventionCount: 0,
    placedInventionCount: 0,
    redInventionId: null,
    firstPlacedTileId: null,
    convergedTileId: null,
    waitUsed: false,
    ...over,
    briefing: { active: false, index: 0, beatCount: 0, ...(over.briefing || {}) },
    pathway: { overall: "red", bonds: "red", coverage: "red", timingLevel: null, timingPending: false, ...(over.pathway || {}) },
    ui: { waitConfirmOpen: false, tilePopupOpen: false, convergenceOpen: false, createBusy: false, summonBusy: false, challengerDrawOpen: false, ...(over.ui || {}) },
    mp: { spectator: false, ...(over.mp || {}) },
  };
}

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

const ORDER = ["look-ahead", "honesty-bar", "convergence", "pathway", "wait-vs-end-turn", "art-of-the-possible", "learn"];

describe("concept card content", () => {
  it("has the seven in Friend's-seven order with a glossary anchor each", () => {
    assert.deepEqual(listConcepts().map((c) => c.id), ORDER);
    for (const c of CONCEPT_CARDS) {
      assert.equal(c.kicker, CONCEPT_KICKER);
      assert.ok(glossaryEntry(c.glossaryId), `${c.id} glossary ${c.glossaryId}`);
      assert.ok(c.title.trim() && c.body.trim());
      assert.ok(wordCount(c.body) <= BODY_WORD_MAX, `${c.id} body ${wordCount(c.body)} words`);
      assert.ok(!DO_NOT_SAY.test(c.body), `${c.id}: ${c.body}`);
      assert.ok(!DO_NOT_SAY.test(c.title), `${c.id}: ${c.title}`);
      assert.ok(!/\bmission\b/i.test(c.body + c.title), `${c.id} says mission`);
    }
  });
  it("conceptById returns null for unknown ids", () => {
    assert.equal(conceptById("nope"), null);
    assert.equal(conceptById("learn").id, "learn");
  });
});

describe("resolveConceptCard triggers", () => {
  it("nothing fires on a bare board, and null / junk snapshots are safe", () => {
    assert.equal(resolveConceptCard(base()), null);
    assert.equal(resolveConceptCard(null), null);
    assert.equal(resolveConceptCard(undefined), null);
    assert.equal(resolveConceptCard("nope"), null);
  });
  it("learn fires on first focus and targets the Learn button (opens the tray)", () => {
    const c = resolveConceptCard(base({ focusedTechId: "solar" }));
    assert.equal(c.id, "learn");
    assert.equal(c.target.selector, "#btn-learn-tech");
    assert.equal(c.openTray, true);
  });
  it("look-ahead fires when the first tile exists and outranks learn", () => {
    const c = resolveConceptCard(base({ focusedTechId: "solar", unplacedInventionCount: 1 }));
    assert.equal(c.id, "look-ahead");
    assert.equal(c.target.selector, "#btn-wait");
  });
  it("honesty-bar fires once a placed tile has a resolved timing and points at that tile", () => {
    const c = resolveConceptCard(
      base({ placedInventionCount: 1, firstPlacedTileId: "inv-1", pathway: { timingLevel: "yellow" } }),
      { seen: ["look-ahead"] }
    );
    assert.equal(c.id, "honesty-bar");
    assert.deepEqual(c.target, { kind: "hex-tile", id: "inv-1" });
    assert.equal(
      resolveConceptCard(base({ placedInventionCount: 1, pathway: { timingLevel: "yellow", timingPending: true } }), { seen: ["look-ahead"] }),
      null
    );
  });
  it("convergence fires with the dialog open (no dimmer) or on a converged tile", () => {
    const open = resolveConceptCard(base({ placedInventionCount: 2, ui: { convergenceOpen: true } }), { seen: ["look-ahead", "honesty-bar"] });
    assert.equal(open.id, "convergence");
    assert.equal(open.skipDimmer, true);
    assert.equal(open.target.selector, ".hex-convergence-card");
    const later = resolveConceptCard(base({ placedInventionCount: 2, convergedTileId: "inv-2" }), { seen: ["look-ahead", "honesty-bar"] });
    assert.equal(later.id, "convergence");
    assert.deepEqual(later.target, { kind: "hex-tile", id: "inv-2" });
    assert.equal(later.skipDimmer, false);
  });
  it("pathway fires on two placed tiles, or one placed tile with a non-red coverage — never on an empty board", () => {
    const seen = ["look-ahead", "honesty-bar", "convergence"];
    assert.equal(resolveConceptCard(base({ placedInventionCount: 2 }), { seen }).id, "pathway");
    assert.equal(resolveConceptCard(base({ placedInventionCount: 1, pathway: { coverage: "yellow" } }), { seen }).id, "pathway");
    assert.equal(resolveConceptCard(base({ pathway: { coverage: "yellow" }, focusedTechId: "solar" }), { seen }).id, "learn");
  });
  it("wait-vs-end-turn fires over the Wait confirm without a dimmer, or after a Wait on the Look Ahead button", () => {
    const seen = ["look-ahead", "honesty-bar", "convergence", "pathway"];
    const c = resolveConceptCard(base({ ui: { waitConfirmOpen: true } }), { seen });
    assert.equal(c.id, "wait-vs-end-turn");
    assert.equal(c.skipDimmer, true);
    assert.equal(c.target.selector, "#wait-confirm-ok");
    const after = resolveConceptCard(base({ waitUsed: true }), { seen });
    assert.equal(after.id, "wait-vs-end-turn");
    assert.equal(after.target.selector, "#btn-wait");
    assert.equal(after.skipDimmer, false);
  });
  it("art-of-the-possible fires on a red tile or the co-inventor tab and opens that tab", () => {
    const seen = ["look-ahead", "honesty-bar", "convergence", "pathway", "wait-vs-end-turn"];
    const c = resolveConceptCard(base({ sideTab: "coinventor" }), { seen });
    assert.equal(c.id, "art-of-the-possible");
    assert.equal(c.openSideTab, "coinventor");
    assert.equal(resolveConceptCard(base({ redInventionId: "inv-9" }), { seen }).id, "art-of-the-possible");
  });
});

describe("resolveConceptCard suppression", () => {
  const hot = base({ focusedTechId: "solar", unplacedInventionCount: 1, sideTab: "coinventor" });
  it("seen and muted both suppress, in order", () => {
    assert.equal(resolveConceptCard(hot, { seen: ["look-ahead"] }).id, "art-of-the-possible");
    assert.equal(resolveConceptCard(hot, { seen: ["look-ahead"], muted: new Set(["art-of-the-possible"]) }).id, "learn");
    assert.equal(resolveConceptCard(hot, { seen: ORDER }), null);
  });
  it("every guard suppresses", () => {
    for (const over of [
      { screen: "title" },
      { briefing: { active: true } },
      { mp: { spectator: true } },
      { ui: { createBusy: true } },
      { ui: { summonBusy: true } },
      { ui: { challengerDrawOpen: true } },
      { ui: { tilePopupOpen: true } },
    ]) {
      assert.equal(resolveConceptCard(base({ ...hot, ...over })), null, JSON.stringify(over));
    }
  });
});

describe("muted storage", () => {
  it("round-trips known ids and drops junk", () => {
    const s = memoryStorage();
    writeMutedConcepts(["learn", "nope", "learn"], s);
    assert.deepEqual([...readMutedConcepts(s)], ["learn"]);
    assert.equal(JSON.parse(s.getItem(MUTED_KEY)).length, 1);
    const after = setConceptMuted("pathway", true, s);
    assert.deepEqual([...after].sort(), ["learn", "pathway"]);
    setConceptMuted("learn", false, s);
    assert.deepEqual([...readMutedConcepts(s)], ["pathway"]);
    setConceptMuted("pathway", false, s);
    assert.equal(s.getItem(MUTED_KEY), null);
  });
  it("tolerates corrupt or missing storage", () => {
    assert.deepEqual([...readMutedConcepts(memoryStorage({ [MUTED_KEY]: "{not json" }))], []);
    assert.deepEqual([...readMutedConcepts(null)], []);
    assert.doesNotThrow(() => writeMutedConcepts(["learn"], null));
  });
});

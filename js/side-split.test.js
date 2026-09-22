import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_RATIO,
  KEY_STEP,
  MIN_BOTTOM_PX,
  MIN_TOP_PX,
  SIDE_SPLIT_KEY,
  bindVisionSplit,
  clampSplitRatio,
  readSplitRatio,
  writeSplitRatio,
} from "./side-split.js";

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
}

describe("clampSplitRatio", () => {
  it("defaults and clamps to 15–85% when height is unknown", () => {
    assert.equal(clampSplitRatio(NaN, 0), DEFAULT_RATIO);
    assert.equal(clampSplitRatio(0.5, 0), 0.5);
    assert.equal(clampSplitRatio(0.01, 0), 0.15);
    assert.equal(clampSplitRatio(0.99, 0), 0.85);
  });

  it("keeps room for the image and the co-inventor", () => {
    const h = 400;
    const r = clampSplitRatio(0.5, h);
    assert.ok(r * h >= MIN_BOTTOM_PX - 1);
    assert.ok((1 - r) * h >= MIN_TOP_PX - 8);
    assert.ok(clampSplitRatio(0.95, h) * h <= h - MIN_TOP_PX);
    assert.ok(clampSplitRatio(0.05, h) * h >= MIN_BOTTOM_PX - 1);
  });

  it("shrinks mins when the stack is shorter than both floors", () => {
    const h = 220;
    const r = clampSplitRatio(0.5, h);
    assert.ok(r > 0 && r < 1);
    assert.ok(r * h > 40);
    assert.ok((1 - r) * h > 40);
  });
});

describe("split ratio storage", () => {
  it("round-trips a valid ratio and ignores junk", () => {
    const s = memoryStorage();
    assert.equal(readSplitRatio(s), DEFAULT_RATIO);
    writeSplitRatio(0.42, s);
    assert.equal(s.getItem(SIDE_SPLIT_KEY), "0.42");
    assert.equal(readSplitRatio(s), 0.42);
    s.setItem(SIDE_SPLIT_KEY, "nope");
    assert.equal(readSplitRatio(s), DEFAULT_RATIO);
  });
});

function fakeStack(doc) {
  const listeners = new Map();
  const handle = {
    addEventListener(type, fn) {
      listeners.set(type, fn);
    },
    removeEventListener() {},
    setPointerCapture() {},
    setAttribute() {},
  };
  const stack = {
    dataset: {},
    clientHeight: 800,
    style: { setProperty() {} },
    classList: { add() {}, remove() {} },
    ownerDocument: doc,
    querySelector(sel) {
      return sel === ".vision-split-handle" ? handle : null;
    },
  };
  return { stack, listeners };
}

describe("bindVisionSplit shared ratio", () => {
  it("arrow keys on a second handle continue from the saved ratio", () => {
    const storage = memoryStorage();
    const stacks = [];
    const doc = {
      querySelectorAll() {
        return stacks.map((s) => s.stack);
      },
    };
    const a = fakeStack(doc);
    const b = fakeStack(doc);
    stacks.push(a, b);
    bindVisionSplit(a.stack, { storage });
    bindVisionSplit(b.stack, { storage });
    a.listeners.get("keydown")({ key: "ArrowUp", preventDefault() {} });
    const afterFirst = readSplitRatio(storage);
    assert.ok(Math.abs(afterFirst - (DEFAULT_RATIO + KEY_STEP)) < 1e-9);
    b.listeners.get("keydown")({ key: "ArrowUp", preventDefault() {} });
    assert.ok(Math.abs(readSplitRatio(storage) - (DEFAULT_RATIO + KEY_STEP * 2)) < 1e-9);
  });
});

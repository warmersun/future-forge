import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  LEARN_WHILE_IDEAS_DELAY_MS,
  learnTechIds,
  learnButtonMeta,
  dockTransform,
} from "./learn-stack.js";

describe("learnTechIds", () => {
  it("non-hex uses stack ∩ learnOrder, then any extra selected", () => {
    assert.deepEqual(
      learnTechIds({
        hexInvent: false,
        focusedTechId: "ai",
        selectedTechIds: ["bio", "ai"],
        learnOrder: ["ai", "bio"],
      }),
      ["ai", "bio"]
    );
  });

  it("non-hex ignores focused tech that is not on the stack", () => {
    assert.deepEqual(
      learnTechIds({
        hexInvent: false,
        focusedTechId: "ai",
        selectedTechIds: [],
        learnOrder: [],
      }),
      []
    );
  });

  it("hex invent includes focused tech with an empty stack", () => {
    assert.deepEqual(
      learnTechIds({
        hexInvent: true,
        focusedTechId: "ai",
        selectedTechIds: [],
        learnOrder: [],
      }),
      ["ai"]
    );
  });

  it("hex invent puts focused tech first, then stacked learnOrder", () => {
    assert.deepEqual(
      learnTechIds({
        hexInvent: true,
        focusedTechId: "robotics",
        selectedTechIds: ["ai", "bio"],
        learnOrder: ["bio", "ai"],
      }),
      ["robotics", "bio", "ai"]
    );
  });

  it("hex invent does not duplicate focused tech already on the stack", () => {
    assert.deepEqual(
      learnTechIds({
        hexInvent: true,
        focusedTechId: "ai",
        selectedTechIds: ["ai", "bio"],
        learnOrder: ["bio", "ai"],
      }),
      ["ai", "bio"]
    );
  });
});

describe("learnButtonMeta", () => {
  it("disables when empty and uses hex-specific empty copy", () => {
    const hex = learnButtonMeta([], { hexInvent: true });
    assert.equal(hex.disabled, true);
    assert.match(hex.title, /emTech/i);
    const stack = learnButtonMeta([], { hexInvent: false });
    assert.equal(stack.disabled, true);
    assert.match(stack.title, /stack/i);
  });

  it("enables for a single focused hex tech", () => {
    const meta = learnButtonMeta(["ai"], { hexInvent: true });
    assert.equal(meta.disabled, false);
    assert.equal(meta.text, "Learn");
  });

  it("shows a count when several techs are in Learn", () => {
    const meta = learnButtonMeta(["ai", "bio", "robotics"]);
    assert.equal(meta.disabled, false);
    assert.equal(meta.text, "Learn (3)");
  });
});

describe("dockTransform", () => {
  it("returns null without rects or a zero-size source", () => {
    assert.equal(dockTransform(null, { left: 0, top: 0, width: 10, height: 10 }), null);
    assert.equal(
      dockTransform({ left: 0, top: 0, width: 0, height: 10 }, { left: 0, top: 0, width: 10, height: 10 }),
      null
    );
  });

  it("translates the source center onto the target center and scales down", () => {
    const t = dockTransform(
      { left: 0, top: 0, width: 200, height: 100 },
      { left: 400, top: 50, width: 40, height: 20 }
    );
    assert.ok(t);
    assert.equal(t.dx, 320);
    assert.equal(t.dy, 10);
    assert.ok(t.scale > 0 && t.scale <= 0.18);
  });
});

describe("LEARN_WHILE_IDEAS_DELAY_MS", () => {
  it("defers long enough to skip an instant local fallback", () => {
    assert.equal(LEARN_WHILE_IDEAS_DELAY_MS, 400);
  });
});

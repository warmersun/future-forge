import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import {
  createHexWorkshop,
  defaultChallengerImagePrompt,
  pathwayArtLabel,
} from "./hex-workshop.js";
import {
  addTile,
  mintInventionTile,
  placeTile,
  seedCrisisTiles,
  TILE_KIND,
} from "./board-state.js";

function stubDom() {
  const nodes = new Map();
  const make = (id = "") => ({
    id,
    hidden: false,
    classList: {
      add() {},
      remove() {},
      toggle() {},
      contains() {
        return false;
      },
    },
    textContent: "",
    innerHTML: "",
    style: {},
    dataset: {},
    setAttribute() {},
    getAttribute() {
      return null;
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    addEventListener() {},
  });
  const body = make("body");
  globalThis.document = {
    body,
    querySelector(sel) {
      const key = String(sel || "");
      if (key === "#hex-board-svg") return null;
      if (!nodes.has(key)) nodes.set(key, make(key));
      return nodes.get(key);
    },
    querySelectorAll() {
      return [];
    },
    getElementById(id) {
      return this.querySelector("#" + id);
    },
    addEventListener() {},
  };
}

function placeOk(board, id, q, r) {
  const res = placeTile(board, id, q, r);
  assert.equal(res.ok, true, JSON.stringify(res.blockers));
  return res.board;
}

function seededBoard() {
  let board = seedCrisisTiles({
    crisisRoles: ["local"],
    pressure: { Floods: 2 },
  });
  board = addTile(
    board,
    mintInventionTile({
      id: "a",
      techId: "ai",
      howText: "Part A sensors on the quay.",
      year: 2026,
    })
  );
  const local = board.tiles["crisis-local"];
  return placeOk(board, "a", local.q - 1, local.r);
}

describe("hex-workshop tile timing extra", () => {
  before(() => stubDom());

  it("assess-feasibility extra is how + stack, no invention name or impact", async () => {
    let board = seededBoard();
    const extras = [];
    const ws = createHexWorkshop({
      getBoard: () => board,
      setBoard: (b) => {
        board = b;
      },
      getYear: () => 2026,
      getPlace: () => "Saltpier Market (fictive)",
      getGrounding: () => "## Technology\n- **emTech:** crypto",
      coInvent: async (mode, _msg, extra) => {
        extras.push({ mode, extra });
        return { timing: { level: "green", reason: "ok" } };
      },
    });
    await ws.refreshAfterYearChange();
    const assess = extras.find((e) => e.mode === "assess-feasibility");
    assert.ok(assess);
    assert.equal(Object.hasOwn(assess.extra, "inventionName"), false);
    assert.equal(Object.hasOwn(assess.extra, "inventionImpact"), false);
    assert.match(assess.extra.inventionHow, /Part A/);
    assert.deepEqual(assess.extra.selectedTechIds, ["ai"]);
  });
});

describe("hex-workshop challenger art", () => {
  it("pathwayArtLabel uses tech ids, not an invention name", () => {
    assert.equal(
      pathwayArtLabel([{ techId: "ai" }, { techId: "iot" }]),
      "ai · iot"
    );
    assert.match(
      defaultChallengerImagePrompt("nature", "Portside", "ai · iot"),
      /ai · iot/
    );
  });
});

describe("hex-workshop summonNextChallenger", () => {
  before(() => stubDom());

  it("places a challenger without referencing a removed prose object", async () => {
    let board = seededBoard();
    let spent = 0;
    let refunded = 0;
    const ws = createHexWorkshop({
      getBoard: () => board,
      setBoard: (b) => {
        board = b;
      },
      getYear: () => 2026,
      getPlace: () => "Portside",
      apEnabled: () => true,
      spendFirstSummonAp: () => {
        spent += 1;
        return { ok: true };
      },
      refundFirstSummonAp: () => {
        refunded += 1;
      },
      coInvent: async () => ({
        challengeSpeech: "The quay still floods.",
        challengeQuestion: "Who pays when the sensor dies?",
      }),
    });
    const out = await ws.summonNextChallenger();
    assert.ok(out);
    assert.equal(spent, 1);
    assert.equal(refunded, 0);
    const concerns = Object.values(board.tiles).filter(
      (t) => t.kind === TILE_KIND.concern
    );
    assert.equal(concerns.length, 1);
    assert.match(String(concerns[0].imagePrompt || ""), /ai|pathway/i);
  });

  it("refunds first-summon AP when the reel throws after pay", async () => {
    let board = seededBoard();
    let spent = 0;
    let refunded = 0;
    const ws = createHexWorkshop({
      getBoard: () => board,
      setBoard: (b) => {
        board = b;
      },
      getYear: () => 2026,
      getPlace: () => "Portside",
      apEnabled: () => true,
      spendFirstSummonAp: () => {
        spent += 1;
        return { ok: true };
      },
      refundFirstSummonAp: () => {
        refunded += 1;
      },
      playChallengerReel: async () => {
        throw new Error("reel failed");
      },
    });
    await assert.rejects(() => ws.summonNextChallenger(), /reel failed/);
    assert.equal(spent, 1);
    assert.equal(refunded, 1);
    assert.equal(
      Object.values(board.tiles).filter((t) => t.kind === TILE_KIND.concern)
        .length,
      0
    );
  });
});

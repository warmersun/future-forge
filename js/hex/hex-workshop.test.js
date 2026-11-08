/*
Copyright © 2026 Warmer Sun Education, a sole proprietorship by Tamas Simon

This file is part of Future Forge.

Future Forge is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Future Forge is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Future Forge. If not, see <https://www.gnu.org/licenses/>.
*/

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHotseatBridge } from "../multiplayer/hotseat-bridge.js";
import { clearCaptainLog, listCaptainLog } from "../captain-log.js?v=crisis-role-3";
import {
  createHexWorkshop,
  defaultChallengerImagePrompt,
  pathwayArtLabel,
  crisisWhyBlockHtml,
  concernWhyBlockHtml,
} from "./hex-workshop.js";
import {
  cloneBoard,
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

  it("afterRulesChange does not retime inventions", () => {
    let board = seededBoard();
    board.tiles.a.timingLevel = "green";
    const extras = [];
    const ws = createHexWorkshop({
      getBoard: () => board,
      setBoard: (b) => {
        board = b;
      },
      getYear: () => 2026,
      getRules: () => [
        { id: "piece-rate", status: "active", effects: ["share-required"] },
      ],
      getGlobal: () => ({ id: "automation" }),
      getMission: () => ({ globalId: "automation", winMax: { Floods: 2 } }),
      getWinMax: () => ({ Floods: 2 }),
      coInvent: async (mode, _msg, extra) => {
        extras.push({ mode, extra });
        return { crisisDelta: { local: 0, global: 0, support: 0 }, concerns: {} };
      },
    });
    ws.afterRulesChange();
    assert.equal(board.tiles.a.timingLevel, "green");
    assert.equal(
      extras.some((e) => e.mode === "assess-feasibility"),
      false
    );
  });
});

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}
const tick = () => new Promise((resolve) => setTimeout(resolve, 10));
async function untilCalled(check) {
  for (let i = 0; i < 150; i++) {
    if (check()) return;
    await tick();
  }
  assert.fail("request was not started");
}

// Deferred real workshop calls: intentionally do not paint/abort on switching.
// Reused tile/Quest IDs and identical banks must still isolate the old run.
describe("hex-workshop stale response isolation", () => {
  before(() => stubDom());
  for (const change of ["run", "year"]) {
    for (const mode of ["assess-feasibility", "score-pathway", "pose-challenge", "evaluate-convergence"]) {
      it(`rejects late ${mode} after ${change} change without economy side effects`, async () => {
        let board = seededBoard();
        const mission = { id: "same-quest", pressure: { Floods: 2 }, winMax: { Floods: 1 } };
        let world = { bank: null, packageRef: null };
        let year = 2026;
        let awards = 0, spent = 0, refunds = 0, called = false;
        const pending = deferred();
        if (mode === "evaluate-convergence") {
          board = addTile(board, mintInventionTile({ id: "b", techId: "ai", howText: "Local quay pumps", year }));
          board = placeOk(board, "b", board.tiles.a.q - 1, board.tiles.a.r);
        }
        const ws = createHexWorkshop({
          getBoard: () => board, setBoard: (b) => { board = b; },
          getYear: () => year, getMission: () => mission, getRunWorld: () => world,
          grantPathwayEase: () => { awards++; },
          apEnabled: () => true,
          spendFirstSummonAp: () => { spent++; return { ok: true }; },
          refundFirstSummonAp: () => { refunds++; },
          coInvent: async (which) => {
            if (which === mode) { called = true; return pending.promise; }
            return {};
          },
        });
        let done;
        if (mode === "assess-feasibility") ws.refreshAfterYearChange();
        if (mode === "score-pathway") ws.refreshAfterYearChange();
        if (mode === "pose-challenge") done = ws.summonNextChallenger();
        if (mode === "evaluate-convergence") ws.afterBoardChange("b", "place");
        await untilCalled(() => called);
        if (change === "run") { world = { bank: null, packageRef: null }; board = seededBoard(); }
        else year++;
        const before = JSON.stringify(board);
        pending.resolve({
          timing: { level: "green", reason: "OLD RESPONSE" },
          crisisDelta: { local: -2, global: 0, support: 0 }, concerns: {},
          challengeSpeech: "OLD RESPONSE", challengeQuestion: "OLD RESPONSE?",
          convergences: [{ neighborId: "a", converges: true, reason: "OLD RESPONSE" }],
        });
        if (done) await done;
        await tick();
        assert.equal(JSON.stringify(board), before);
        assert.equal(awards, 0);
        assert.equal(spent, mode === "pose-challenge" ? 1 : 0);
        assert.equal(refunds, mode === "pose-challenge" && change === "year" ? 1 : 0);
        ws.seedFromMission(mission); // cancel outstanding debounce timers
      });
    }
  }

  it("logs only board meters through AI scoring and restores scoped state", async () => {
    clearCaptainLog();
    let board = seededBoard();
    const mission = { id: "scope", pressure: { Floods: 2 }, winMax: { Floods: 1 } };
    let request;
    const ws = createHexWorkshop({
      getBoard: () => board, setBoard: (b) => { board = b; },
      getYear: () => 2026, getMission: () => mission,
      coInvent: async (mode, _message, extra) => {
        if (mode === "score-pathway") request = extra;
        return { crisisDelta: { local: 0, global: -1, support: 1 }, crisisReasons: { local: "No change", global: "phantom", support: "phantom" }, concerns: {} };
      },
    });
    ws.refreshAfterYearChange();
    await untilCalled(() => request);
    await untilCalled(() => listCaptainLog({ filter: "all" }).some((row) => row.title === "Pathway scored"));
    assert.deepEqual(request.crisisRoles.map((row) => row.role), ["local"]);
    const row = listCaptainLog({ filter: "all" }).find((entry) => entry.title === "Pathway scored");
    assert.match(row.detail, /Local 0/);
    assert.doesNotMatch(row.detail, /Global|Support|phantom/);
    const restored = cloneBoard(JSON.parse(JSON.stringify(board)));
    const impact = Object.values(restored.pathwayImpacts)[0];
    assert.deepEqual(Object.keys(impact.crisisDelta), ["local"]);
    assert.equal(impact.crisisDelta.local, 0);
    ws.seedFromMission(mission);
    clearCaptainLog();
  });

  it("rechecks invalidated scores without repaying pathway ease", async () => {
    let board = seededBoard();
    const mission = { id: "same", pressure: { Floods: 2 }, winMax: { Floods: 1 } };
    let year = 2026, awards = 0, calls = 0;
    const ws = createHexWorkshop({
      getBoard: () => board, setBoard: (b) => { board = b; },
      getYear: () => year, getMission: () => mission,
      grantPathwayEase: () => { awards++; },
      coInvent: async (mode) => { if (mode === "score-pathway") calls++; return { timing: { level: "green" }, crisisDelta: { local: -1, global: 0, support: 0 }, concerns: {} }; },
    });
    ws.refreshAfterYearChange();
    await untilCalled(() => calls === 1);
    await tick();
    assert.equal(awards, 1);
    year++;
    ws.refreshAfterYearChange();
    await untilCalled(() => calls === 2);
    await tick();
    assert.equal(awards, 1);
    assert.equal(Object.keys(board.pathwayEaseAwards).length, 1);
    ws.seedFromMission(mission);
  });
});

describe("hex-workshop why blocks", () => {
  it("crisisWhyBlockHtml lists net and each island", () => {
    const one = crisisWhyBlockHtml([
      { label: "ai · iot", delta: -1, reason: "The noon cooler keeps class in the rooms.", pending: false },
    ]);
    assert.match(one, />-1</);
    assert.match(one, /noon cooler/);
    assert.match(one, /hex-crisis-eval/);
    assert.match(one, /hex-crisis-eval-delta--relief/);
    assert.match(one, /ai · iot/);
    assert.match(one, /hex-crisis-eval-rationale/);
    const two = crisisWhyBlockHtml([
      { label: "ai", delta: -1, reason: "Cooler at noon.", pending: false },
      { label: "drones", delta: 0, reason: "Never names the heat.", pending: false },
    ]);
    assert.match(two, /from 2 pathways/);
    assert.match(two, /Cooler at noon/);
    assert.match(two, /Never names the heat/);
    assert.match(two, /hex-crisis-eval-net/);
    const pending = crisisWhyBlockHtml([
      { label: "ai", delta: 0, reason: "", pending: true },
    ]);
    assert.match(pending, /Judging/);
    const mixed = crisisWhyBlockHtml([
      { label: "ai", delta: -1, reason: "Cooler at noon.", pending: false },
      { label: "drones", delta: 0, reason: "", pending: true },
    ]);
    assert.match(mixed, /Cooler at noon/);
    assert.match(mixed, /Judging another pathway/);
    assert.equal(/Never names/i.test(mixed), false);
  });

  it("concernWhyBlockHtml lists every island lamp", () => {
    const html = concernWhyBlockHtml([
      { label: "ai", level: "yellow", reason: "Neighbors can skip the fee.", pending: false },
      { label: "drones", level: "red", reason: "Still unanswered.", pending: false },
    ]);
    assert.match(html, /yellow/);
    assert.match(html, /Neighbors can skip/);
    assert.match(html, /red/);
    assert.match(html, /Still unanswered/);
    const mixed = concernWhyBlockHtml([
      { label: "ai", level: "yellow", reason: "Neighbors can skip the fee.", pending: false },
      { label: "drones", level: "red", reason: "", pending: true },
    ]);
    assert.match(mixed, /Neighbors can skip/);
    assert.match(mixed, /Judging another pathway/);
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

  for (const outcome of ["success", "failure", "clone", "seat", "seat-return", "turn", "run", "replacement"]) {
    it(`uses real hotseat AP and hydration with ${outcome}`, async () => {
      const bridge = createHotseatBridge();
      const mission = { id: "same", title: "Test", place: "Port", globalId: "climate",
        startYear: 2026, collapseYear: 2036, yearsPerTurn: 2,
        pressure: { Floods: 2 }, pressureRise: { Floods: 1 }, winMax: { Floods: 0 } };
      assert.equal(bridge.startFromPick(["Alex", "Bea"], mission, "climate").ok, true);
      const state = { global: { id: "climate" }, selectedTechIds: [], hexBoard: seededBoard() };
      bridge.hydrateSoloState(state);
      const payer = bridge.getActiveId();
      const otherSeat = bridge.getSession().seatOrder.find((id) => id !== payer);
      bridge.getSession().invents[payer].ap = 2;
      bridge.getSession().invents[payer].apSpentThisTurn = 1;
      bridge.hydrateSoloState(state);
      const originalMission = state.mission, originalWorld = state.runWorld;
      const source = readFileSync(new URL("../game.js", import.meta.url), "utf8");
      const start = source.indexOf("function spendFirstSummonAp() {");
      const end = source.indexOf("\n/**\n * Spend 1 AP for co-invent", start);
      assert.ok(start >= 0 && end > start);
      const { spendFirstSummonAp, refundFirstSummonAp } = new Function(
        "state", "hotseatBridge", "roomBridge", "apEnabled", "getSpendableAp", "renderHud", "mpFriendlyError",
        `${source.slice(start, end)}\nreturn { spendFirstSummonAp, refundFirstSummonAp };`
      )(state, bridge, { isRoom: () => false }, () => true, () => state.ap, () => {}, () => "");
      const pending = deferred();
      let called = false;
      const busy = [];
      const ws = createHexWorkshop({
        getBoard: () => state.hexBoard, setBoard: (b) => { state.hexBoard = b; },
        getYear: () => state.year, getMission: () => state.mission, getRunWorld: () => state.runWorld,
        getRunId: () => state.runWorld, getRequestIdentity: () => bridge.isHotseat() ? bridge.getRequestIdentity() : null,
        apEnabled: () => true, spendFirstSummonAp, refundFirstSummonAp,
        setAiBusy: (value) => busy.push(value),
        coInvent: async () => { called = true; return pending.promise; },
        ...(outcome === "failure" ? { playChallengerReel: async () => { throw new Error("reel failed"); } } : {}),
      });
      bridge.onRequestIdentityChange(() => ws.cancelSummon());
      const done = ws.summonNextChallenger();
      assert.notEqual(state.mission, originalMission);
      assert.notEqual(state.runWorld, originalWorld);
      assert.equal(state.ap, 1);
      if (outcome === "failure") {
        await assert.rejects(done, /reel failed/);
        assert.equal(state.ap, 2);
        assert.equal(bridge.getSession().invents[payer].apSpentThisTurn, 1);
        assert.deepEqual(busy, [true, false]);
        pending.resolve({});
        return;
      }
      await untilCalled(() => called);
      // An additional ordinary hydrate must not retire the request either.
      bridge.hydrateSoloState(state);
      if (outcome === "clone") {
        bridge.setSession(structuredClone(bridge.getSession()));
        bridge.hydrateSoloState(state);
      }
      if (outcome === "seat" || outcome === "seat-return") {
        const owner = bridge.getViewId();
        bridge.setViewSeat(bridge.getSession().seatOrder[1]);
        bridge.hydrateSoloState(state);
        if (outcome === "seat-return") {
          bridge.setViewSeat(owner);
          bridge.hydrateSoloState(state);
        }
      }
      if (outcome === "turn") {
        assert.equal(bridge.passDevice().ok, true);
        bridge.hydrateSoloState(state);
      }
      if (outcome === "run") {
        bridge.startFromPick(["Alex", "Bea"], mission, "climate");
        bridge.hydrateSoloState(state);
      }
      if (outcome === "replacement") {
        const other = createHotseatBridge();
        other.startFromPick(["Alex", "Bea"], mission, "climate");
        other.getSession().invents[payer].ap = 1;
        other.getSession().invents[payer].apSpentThisTurn = 2;
        bridge.setSession(structuredClone(other.getSession()));
        bridge.hydrateSoloState(state);
      }
      if (!["success", "clone"].includes(outcome)) {
        assert.equal(ws.isSummonBusy(), false);
        assert.deepEqual(busy, [true, false]);
        assert.equal(bridge.getSession().invents[payer].ap, outcome === "replacement" ? 1 : outcome === "run" ? 3 : 2);
        assert.equal(bridge.getSession().invents[payer].apSpentThisTurn, outcome === "replacement" ? 2 : outcome === "run" ? 0 : 1);
        assert.equal(bridge.getSession().invents[otherSeat].ap, 3);
      }
      const before = JSON.stringify(state.hexBoard);
      pending.resolve({ challengeSpeech: "Speech", challengeQuestion: "Question?" });
      await done;
      if (outcome === "success" || outcome === "clone") {
        assert.equal(Object.values(state.hexBoard.tiles).filter((t) => t.kind === TILE_KIND.concern).length, 1);
        assert.equal(state.ap, 1);
        assert.deepEqual(busy, [true, false]);
      } else {
        assert.equal(JSON.stringify(state.hexBoard), before);
        assert.deepEqual(busy, [true, false]);
        assert.equal(bridge.getSession().invents[payer].ap, outcome === "replacement" ? 1 : outcome === "run" ? 3 : 2);
        assert.equal(bridge.getSession().invents[payer].apSpentThisTurn, outcome === "replacement" ? 2 : outcome === "run" ? 0 : 1);
        assert.equal(bridge.getSession().invents[otherSeat].ap, 3);
      }
    });
  }

  it("keeps the new summon busy when an old seat's job completes", async () => {
    const bridge = createHotseatBridge();
    const mission = { id: "m", startYear: 2026, collapseYear: 2036, yearsPerTurn: 2,
      pressure: { Floods: 2 }, pressureRise: { Floods: 1 }, winMax: { Floods: 0 } };
    bridge.startFromPick(["Alex", "Bea"], mission, "climate");
    const state = { global: { id: "climate" }, selectedTechIds: [], hexBoard: seededBoard(), aiBusy: false };
    bridge.hydrateSoloState(state);
    const source = readFileSync(new URL("../game.js", import.meta.url), "utf8");
    const start = source.indexOf("function spendFirstSummonAp() {");
    const end = source.indexOf("\n/**\n * Spend 1 AP for co-invent", start);
    const { spendFirstSummonAp, refundFirstSummonAp } = new Function(
      "state", "hotseatBridge", "roomBridge", "apEnabled", "getSpendableAp", "renderHud", "mpFriendlyError",
      `${source.slice(start, end)}\nreturn { spendFirstSummonAp, refundFirstSummonAp };`
    )(state, bridge, { isRoom: () => false }, () => true, () => state.ap, () => {}, () => "");
    const payer = bridge.getActiveId();
    const first = deferred(), second = deferred();
    let calls = 0;
    const ws = createHexWorkshop({
      getBoard: () => state.hexBoard, setBoard: (b) => { state.hexBoard = b; },
      getYear: () => state.year, getMission: () => state.mission, getRunWorld: () => state.runWorld,
      getRequestIdentity: () => bridge.getRequestIdentity(),
      apEnabled: () => true, spendFirstSummonAp, refundFirstSummonAp,
      setAiBusy: (value) => { state.aiBusy = value; state.hexSummonPending = value; },
      coInvent: () => (++calls === 1 ? first.promise : second.promise),
    });
    bridge.onRequestIdentityChange(() => ws.cancelSummon());
    const old = ws.summonNextChallenger();
    await untilCalled(() => calls === 1);
    assert.equal(document.querySelector("#hex-board-pending").hidden, false);
    bridge.setViewSeat(bridge.getSession().seatOrder[1]);
    bridge.hydrateSoloState(state);
    assert.equal(bridge.getSession().invents[payer].ap, 3);
    assert.equal(state.aiBusy, false);
    assert.equal(state.hexSummonPending, false);
    assert.equal(document.querySelector("#hex-board-pending").hidden, true);
    bridge.setViewSeat(payer);
    bridge.hydrateSoloState(state);
    state.hexBoard = seededBoard();
    const newer = ws.summonNextChallenger();
    await untilCalled(() => calls === 2);
    assert.equal(bridge.getSession().invents[payer].ap, 2);
    first.resolve({ challengeSpeech: "Old", challengeQuestion: "Old?" });
    await old;
    assert.equal(bridge.getSession().invents[payer].ap, 2);
    assert.equal(state.aiBusy, true);
    assert.equal(state.hexSummonPending, true);
    assert.equal(ws.isSummonBusy(), true);
    assert.equal(document.querySelector("#hex-board-pending").hidden, false);
    second.resolve({ challengeSpeech: "New", challengeQuestion: "New?" });
    await newer;
    assert.equal(bridge.getSession().invents[payer].ap, 2);
    assert.equal(state.aiBusy, false);
    assert.equal(state.hexSummonPending, false);
    assert.equal(ws.isSummonBusy(), false);
    assert.equal(document.querySelector("#hex-board-pending").hidden, true);
  });

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

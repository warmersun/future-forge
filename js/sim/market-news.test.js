import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MARKET_EVENTS,
  marketAffectsTech,
  applyMarketToCost,
  pickMarketNews,
  rollRoundMarketNews,
  describeMarketEffects,
  cloneMarketNews,
} from "./market-news.js";
import { techCost, baseTechCost } from "./economy.js";
import { applyAction } from "./actions.js";
import {
  createMpLobby,
  setMpQuest,
  startMpQuest,
  applyMpAction,
  activeSeatId,
} from "./mp-session.js";
import { TECHS } from "../data.js";

describe("market-news catalog", () => {
  it("has events that raise and lower costs", () => {
    assert.equal(MARKET_EVENTS.length, 122);
    assert.ok(MARKET_EVENTS.some((e) => (e.budgetDelta || 0) > 0));
    assert.ok(MARKET_EVENTS.some((e) => (e.budgetDelta || 0) < 0));
    assert.ok(MARKET_EVENTS.some((e) => (e.willDelta || 0) > 0));
    assert.ok(MARKET_EVENTS.some((e) => (e.willDelta || 0) < 0));
    assert.ok(MARKET_EVENTS.every((e) => e.image && e.image.startsWith("assets/market-news/")));
    const ids = MARKET_EVENTS.map((e) => e.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("pickMarketNews is deterministic for seed+round", () => {
    const a = pickMarketNews({ seed: "m1", round: 2, year: 2026 });
    const b = pickMarketNews({ seed: "m1", round: 2, year: 2026 });
    assert.equal(a.id, b.id);
    assert.equal(a.headline, b.headline);
  });

  it("excludes previous id when possible", () => {
    const first = pickMarketNews({ seed: "m1", round: 1 });
    const second = pickMarketNews({
      seed: "m1",
      round: 2,
      excludeId: first.id,
    });
    if (MARKET_EVENTS.length > 1) {
      assert.notEqual(second.id, first.id);
    }
  });
});

describe("market cost application", () => {
  it("raises computing budget for ram-shortage", () => {
    const news = MARKET_EVENTS.find((e) => e.id === "ram-shortage");
    assert.ok(news);
    const computing = TECHS.find((t) => t.id === "computing");
    const base = baseTechCost(computing);
    const next = applyMarketToCost(base, computing, news);
    assert.equal(next.budget, base.budget + 1);
    assert.equal(next.will, base.will);
    // Unrelated tech unchanged
    const solar = TECHS.find((t) => t.id === "solar");
    const solarNext = applyMarketToCost(baseTechCost(solar), solar, news);
    assert.deepEqual(solarNext, baseTechCost(solar));
  });

  it("raises will for AI datacenter backlash", () => {
    const news = MARKET_EVENTS.find((e) => e.id === "ai-datacenter-backlash");
    const ai = { id: "ai", domain: "automator", readyYear: 2026, curve: "steep" };
    const next = techCost(ai, { market: news });
    const base = baseTechCost(ai);
    assert.equal(next.will, base.will + 2);
    assert.equal(next.budget, base.budget);
  });

  it("never implies AP change in describe", () => {
    const news = rollRoundMarketNews({ round: 3, missionId: "x" });
    const d = describeMarketEffects(news);
    assert.ok(d.effects.every((e) => !/AP/i.test(e)));
  });

  it("floors budget and will at 0", () => {
    const news = {
      id: "cheap",
      all: true,
      budgetDelta: -99,
      willDelta: -99,
    };
    const next = applyMarketToCost({ budget: 2, will: 1, frontierRisk: 0 }, { id: "x" }, news);
    assert.equal(next.budget, 0);
    assert.equal(next.will, 0);
  });

  it("cloneMarketNews is JSON-safe", () => {
    const n = pickMarketNews({ seed: "c", round: 1 });
    const c = cloneMarketNews(n);
    assert.equal(c.id, n.id);
    assert.deepEqual(JSON.parse(JSON.stringify(c)).id, n.id);
  });
});

describe("solo end_turn rolls market news", () => {
  it("end_turn attaches market_news event and sim.marketNews", () => {
    const sim = {
      year: 2026,
      turn: 0,
      waits: 0,
      pressure: { Floods: 1 },
      ap: 2,
      apMax: 3,
      apSpentThisTurn: 1,
      writeCommitsThisTurn: 0,
      learnOpenedThisTurn: false,
      turnPhase: "act",
      selectedTechIds: [],
      budget: 5,
      will: 3,
      techAddedThisTurn: {},
      marketNews: null,
      mission: { id: "portside-floods" },
    };
    const r = applyAction(sim, { type: "end_turn" }, {
      features: { actionPoints: true, budgetWill: true },
    });
    assert.equal(r.ok, true);
    assert.ok(r.sim.marketNews?.id);
    assert.ok((r.events || []).some((e) => e.type === "market_news"));
    assert.equal(r.sim.turn, 1);
  });

  it("select_tech spends market-adjusted budget", () => {
    const news = MARKET_EVENTS.find((e) => e.id === "ram-shortage");
    const computing = TECHS.find((t) => t.id === "computing");
    const base = baseTechCost(computing);
    const sim = {
      year: 2026,
      turn: 1,
      waits: 0,
      pressure: {},
      ap: 3,
      apMax: 3,
      apSpentThisTurn: 0,
      writeCommitsThisTurn: 0,
      learnOpenedThisTurn: false,
      turnPhase: "act",
      selectedTechIds: [],
      budget: 5,
      will: 3,
      techAddedThisTurn: {},
      marketNews: news,
    };
    const r = applyAction(
      sim,
      { type: "select_tech", payload: { techId: "computing", tech: computing } },
      { features: { actionPoints: true, budgetWill: true } }
    );
    assert.equal(r.ok, true);
    assert.equal(r.sim.budget, 5 - (base.budget + 1));
  });
});

describe("multiplayer round market news", () => {
  const mission = {
    id: "mp-market-test",
    title: "Test",
    place: "Port",
    globalId: "climate",
    startYear: 2026,
    yearsPerTurn: 2,
    collapseYear: 2036,
    pressure: { Floods: 1, Livelihoods: 1, Trust: 1 },
    pressureRise: { Floods: 0, Livelihoods: 0, Trust: 0 },
    winMax: { Floods: 0, Livelihoods: 0, Trust: 0 },
    suggested: ["solar"],
  };

  function started() {
    let s = createMpLobby(["Alex", "Bea"]);
    s = setMpQuest(s, mission, "climate");
    return startMpQuest(s).session;
  }

  it("starts with no market news; wraps after full seat-round", () => {
    let s = started();
    assert.equal(s.place.marketNews, null);
    assert.equal(s.round, 1);
    // Alex ends
    s = applyMpAction(s, {
      type: "buffer_write",
      payload: { field: "inventionName", value: "Tide" },
    }).session;
    let r = applyMpAction(s, { type: "end_turn" });
    assert.equal(r.ok, true);
    s = r.session;
    assert.equal(activeSeatId(s), "seat-1");
    assert.equal(s.round, 1);
    assert.equal(s.place.marketNews, null);
    // Bea ends → wrap to Alex, round 2, market news
    s = applyMpAction(s, {
      type: "buffer_write",
      payload: { field: "inventionName", value: "Wave" },
    }).session;
    r = applyMpAction(s, { type: "end_turn" });
    assert.equal(r.ok, true);
    s = r.session;
    assert.equal(s.round, 2);
    assert.ok(s.place.marketNews?.id);
    assert.ok((r.events || []).some((e) => e.type === "market_news"));
  });

  it("select_tech uses place marketNews", () => {
    let s = started();
    const news = MARKET_EVENTS.find((e) => e.id === "ram-shortage");
    s.place.marketNews = news;
    const computing = TECHS.find((t) => t.id === "computing");
    const base = baseTechCost(computing);
    const before = s.invents[activeSeatId(s)].budget;
    const r = applyMpAction(s, {
      type: "select_tech",
      payload: { techId: "computing", tech: computing },
    });
    assert.equal(r.ok, true);
    const after = r.session.invents[activeSeatId(r.session)].budget;
    assert.equal(after, before - (base.budget + 1));
  });
});

describe("marketAffectsTech", () => {
  it("matches domains when no techIds", () => {
    const news = { domains: ["power"], budgetDelta: 1, willDelta: 0 };
    assert.equal(marketAffectsTech(news, { id: "solar", domain: "power" }), true);
    assert.equal(marketAffectsTech(news, { id: "ai", domain: "automator" }), false);
  });
});

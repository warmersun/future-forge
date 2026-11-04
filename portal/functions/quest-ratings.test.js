import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createPlayerRoutes } from "./player-routes.mjs";
import { createPublicRoutes } from "./public-routes.mjs";
import { parseRatingIds } from "../../js/server/quest-ratings.mjs";

const A = { enabled: true, signedIn: true, userId: "user_A" };
const B = { enabled: true, signedIn: true, userId: "user_B" };
const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.signature";

function ratingDb() {
  const eligibility = new Set();
  const votes = new Map();
  const key = (uid, quest) => `${uid}\0${quest}`;
  const query = async (sql, args = []) => {
    if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") return { rows: [] };
    if (sql.startsWith("INSERT INTO users")) return { rows: [], rowCount: 1 };
    if (sql.includes("INSERT INTO quest_rating_eligibility")) {
      let n = 0;
      for (const id of args[1] || []) {
        const k = key(args[0], id);
        if (!eligibility.has(k)) {
          eligibility.add(k);
          n += 1;
        }
      }
      return { rows: [], rowCount: n };
    }
    if (sql.includes("FROM quest_rating_eligibility")) {
      return { rows: eligibility.has(key(args[0], args[1])) ? [{ ok: 1 }] : [] };
    }
    if (sql.startsWith("DELETE FROM quest_ratings")) {
      votes.delete(key(args[0], args[1]));
      return { rows: [], rowCount: 1 };
    }
    if (sql.startsWith("INSERT INTO quest_ratings")) {
      votes.set(key(args[0], args[1]), args[2]);
      return { rows: [], rowCount: 1 };
    }
    if (sql.includes("FILTER")) {
      const ids = new Set(args[0]);
      const buckets = new Map();
      for (const [k, rating] of votes) {
        const quest = k.split("\0")[1];
        if (!ids.has(quest)) continue;
        const bucket = buckets.get(quest) || { quest_id: quest, down: 0, up: 0, love: 0 };
        if (rating === -1) bucket.down += 1;
        else if (rating === 1) bucket.up += 1;
        else if (rating === 2) bucket.love += 1;
        buckets.set(quest, bucket);
      }
      return { rows: [...buckets.values()] };
    }
    if (sql.includes("SELECT quest_id, rating FROM quest_ratings")) {
      const ids = new Set(args[1]);
      const rows = [];
      for (const [k, rating] of votes) {
        const [owner, quest] = k.split("\0");
        if (owner === args[0] && ids.has(quest)) rows.push({ quest_id: quest, rating });
      }
      return { rows };
    }
    if (sql.startsWith("SELECT COUNT(*)")) return { rows: [{ n: 0 }] };
    if (sql.startsWith("SELECT quest_id FROM solved_quests")) return { rows: [] };
    if (sql.startsWith("INSERT INTO solved_quests")) return { rows: [], rowCount: 0 };
    throw new Error(`Unmodeled SQL: ${sql}`);
  };
  return {
    votes,
    query,
    async connect() {
      return { query, release() {} };
    },
  };
}

function req(path, method, body) {
  return new Request(`https://functions.example${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function call(api, path, method, body, identity = A) {
  const response = await api.fetch(req(path, method, body), identity);
  return { status: response.status, body: await response.json() };
}

describe("quest rating routes", () => {
  it("rejects a vote until the briefing is recorded, then moves one vote", async () => {
    const db = ratingDb();
    const api = createPlayerRoutes({ db, env: {} });
    const denied = await call(api, "/api/me/quests/q1/rating", "PUT", { rating: "love" });
    assert.equal(denied.status, 403);
    assert.equal(denied.body.error, "briefing_required");
    assert.equal(db.votes.size, 0);

    assert.equal((await call(api, "/api/me/quests/q1/briefed", "POST", {})).status, 200);
    const loved = await call(api, "/api/me/quests/q1/rating", "PUT", { rating: "love" });
    assert.deepEqual(loved.body, { ok: true, questId: "q1", mine: "love", down: 0, up: 0, love: 1 });

    const liked = await call(api, "/api/me/quests/q1/rating", "PUT", { rating: "up" });
    assert.equal(liked.body.love, 0);
    assert.equal(liked.body.up, 1);
    assert.equal(liked.body.mine, "up");
    assert.equal(db.votes.size, 1);

    assert.equal((await call(api, "/api/me/quests/q1/briefed", "POST", {}, B)).status, 200);
    const other = await call(api, "/api/me/quests/q1/rating", "PUT", { rating: "down" }, B);
    assert.equal(other.body.down, 1);
    assert.equal(other.body.up, 1);
    assert.equal(other.body.mine, "down");
    assert.equal(db.votes.size, 2);

    const again = await call(api, "/api/me/quests/q1/rating", "PUT", { rating: "up" });
    assert.equal(again.body.up, 1);
    assert.equal(db.votes.size, 2);

    const cleared = await call(api, "/api/me/quests/q1/rating", "PUT", { rating: null });
    assert.equal(cleared.body.mine, null);
    assert.equal(cleared.body.up, 0);
    assert.equal(cleared.body.down, 1);
    assert.equal(db.votes.size, 1);
  });

  it("rejects a bad mark or quest id and imports briefed ids once", async () => {
    const db = ratingDb();
    const api = createPlayerRoutes({ db, env: {} });
    assert.equal((await call(api, "/api/me/quests/q1/rating", "PUT", { rating: "stars" })).status, 400);
    assert.equal((await call(api, "/api/me/quests/***/rating", "PUT", { rating: "up" })).status, 400);
    assert.equal(db.votes.size, 0);
    const imported = await call(api, "/api/me/import", "POST", { briefedQuestIds: ["q9", "q9"], solvedIds: [] });
    assert.equal(imported.status, 200);
    assert.equal(imported.body.briefed, 1);
    const again = await call(api, "/api/me/import", "POST", { briefedQuestIds: ["q9"], solvedIds: [] });
    assert.equal(again.body.briefed, 0);
    const voted = await call(api, "/api/me/quests/q9/rating", "PUT", { rating: "down" });
    assert.equal(voted.body.down, 1);
  });
});

describe("public quest rating tallies", () => {
  function fixture(rows) {
    const queries = [];
    let catalogCalls = 0;
    const db = {
      async query(sql, params = []) {
        queries.push(sql);
        return { rows: rows(sql, params) };
      },
    };
    const api = createPublicRoutes({
      env: {
        CLERK_SECRET_KEY: "offline",
        CLERK_PUBLISHABLE_KEY: "pk_test_offline",
        FF_PUBLIC_ORIGIN: "https://cloud.warmersun.com",
      },
      db,
      loadCatalog: async () => {
        catalogCalls += 1;
        return { ok: true, quests: [] };
      },
      verifyClerk: async () => ({ sub: "user_A" }),
    });
    return { api, queries, catalogCalls: () => catalogCalls };
  }

  it("returns counts without a personal mark when signed out", async () => {
    const f = fixture((sql) => {
      if (sql.includes("FILTER")) return [{ quest_id: "q1", down: 1, up: 4, love: 2 }];
      if (sql.includes("SELECT quest_id, rating")) return [{ quest_id: "q1", rating: 2 }];
      return [];
    });
    const response = await f.api.fetch(new Request("https://cloud.warmersun.com/api/quests/ratings?ids=q1"));
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.deepEqual(body.ratings.q1, { down: 1, up: 4, love: 2 });
    assert.equal("mine" in body.ratings.q1, false);
    assert.equal(f.catalogCalls(), 0);
    assert.equal(f.queries.some((sql) => sql.includes("SELECT quest_id, rating")), false);
  });

  it("includes mine for the signed-in caller", async () => {
    const f = fixture((sql) => {
      if (sql.includes("FILTER")) return [{ quest_id: "q1", down: 0, up: 0, love: 1 }];
      if (sql.includes("SELECT quest_id, rating")) return [{ quest_id: "q1", rating: 2 }];
      return [];
    });
    const response = await f.api.fetch(
      new Request("https://cloud.warmersun.com/api/quests/ratings?ids=q1", {
        headers: { Authorization: `Bearer ${jwt}` },
      })
    );
    const body = await response.json();
    assert.equal(body.ratings.q1.mine, "love");
    assert.equal(f.catalogCalls(), 0);
  });
});

describe("parseRatingIds", () => {
  it("drops blanks and stops at 80", () => {
    const ids = Array.from({ length: 90 }, (_, i) => `q${i}`);
    const parsed = parseRatingIds([" q1 ", "q1", "bad id", ...ids].join(","));
    assert.equal(parsed[0], "q1");
    assert.equal(parsed.length, 80);
    assert.equal(parsed.includes("bad id"), false);
  });
});

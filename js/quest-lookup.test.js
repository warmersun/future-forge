import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { lookupQuestById } from "./quest-lookup.js";

const tile = {
  id: "spotlight-gene-seq-border-clinic-2026",
  title: "The fever sheet at Crossing Clinic 7",
  source: "remote",
  mission: { id: "spotlight-gene-seq-border-clinic-2026" },
};
const response = (body, status = 200) => new Response(JSON.stringify(body), { status });

describe("lookupQuestById", () => {
  it("loads the exact stored ID through the API, trimming only surrounding whitespace", async () => {
    const calls = [];
    const result = await lookupQuestById(`  ${tile.id}\n`, {
      fetchImpl: async (url) => {
        calls.push(url);
        return response({ ok: true, tile });
      },
    });
    assert.deepEqual(calls, [`/api/quests/${tile.id}`]);
    assert.equal(result.status, "loaded");
    assert.deepEqual(result.tile, tile);
  });

  it("rejects blank IDs, titles, URLs, paths, dot segments and oversized input without fetching", async () => {
    for (const raw of ["", "  ", tile.title, "https://example.com/?q=x", "../x", ".", "..", "x/y", "x\\y", "x?y", "x#y", "x".repeat(121)]) {
      const result = await lookupQuestById(raw, {
        fetchImpl: async () => assert.fail(`must not fetch ${raw}`),
      });
      assert.equal(result.status, "invalid", raw);
    }
  });

  it("does not turn an unknown ID into a title or case-insensitive match", async () => {
    const raw = tile.id.toUpperCase();
    const result = await lookupQuestById(raw, {
      fetchImpl: async (url) => {
        assert.equal(url, `/api/quests/${raw}`);
        return response({ ok: false, error: "not_found" }, 404);
      },
    });
    assert.equal(result.status, "not_found");
    assert.equal(result.tile, undefined);
  });

  it("keeps 401 and 402 cards gated and preserves the subscription URL", async () => {
    const { mission, ...card } = tile;
    for (const [status, expected] of [[401, "sign_in_required"], [402, "subscription_required"]]) {
      const result = await lookupQuestById(tile.id, {
        fetchImpl: async () => response({
          ok: false,
          tile: { ...card, access: status === 401 ? "account" : "paid" },
          subscribeUrl: "https://portal.example/subscribe",
        }, status),
      });
      assert.equal(result.status, expected);
      assert.equal(result.tile.gated, true);
      assert.equal(result.tile.mission, undefined);
      assert.equal(result.subscribeUrl, status === 402 ? "https://portal.example/subscribe" : "");
    }
  });

  it("loads module wrappers without a mission and keeps local provenance", async () => {
    for (const entry of [
      { id: "module-id", kind: "module", lessons: [tile.id], source: "remote" },
      { ...tile, source: "hosted" },
    ]) {
      const result = await lookupQuestById(entry.id, {
        fetchImpl: async () => response({ ok: true, tile: entry }),
      });
      assert.equal(result.status, "loaded");
      assert.deepEqual(result.tile, entry);
    }
  });

  it("distinguishes service failure from a missing quest, including malformed responses", async () => {
    const fetchers = [
      async () => response({ ok: false }, 503),
      async () => response({ ok: false }, 500),
      async () => { throw new Error("offline"); },
      async () => new Response("not JSON"),
      async () => response({ ok: true }),
      async () => response({ ok: false, tile }),
      async () => response({ ok: true, tile: { ...tile, id: "wrong-id" } }),
      async () => response({ ok: true, tile: { id: tile.id } }),
      async () => response({ ok: false }, 401),
      async () => response({ ok: false }, 402),
    ];
    for (const fetchImpl of fetchers) {
      const result = await lookupQuestById(tile.id, { fetchImpl });
      assert.equal(result.status, "unavailable");
      assert.equal(result.tile, undefined);
    }
  });
});

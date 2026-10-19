import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  fetchPortalQuests,
  mergeQuestCatalog,
  officialTutorContext,
  omitOfficialLocalDuplicates,
  portalQuestsEnabled,
} from "./quest-portal-client.mjs";

describe("quest portal client", () => {
  it("requires a separate catalog opt-in, not just account connectivity", () => {
    assert.equal(portalQuestsEnabled({}), false);
    assert.equal(portalQuestsEnabled({ FF_PORTAL_URL: "https://portal.example" }), false);
    assert.equal(portalQuestsEnabled({ FF_PORTAL_QUESTS: "1" }), false);
    for (const value of ["1", "true", "yes", " TRUE "]) {
      assert.equal(portalQuestsEnabled({ FF_PORTAL_URL: "https://portal.example", FF_PORTAL_QUESTS: value }), true);
    }
    for (const value of ["0", "false", "off", "", "unexpected"]) {
      assert.equal(portalQuestsEnabled({ FF_PORTAL_URL: "https://portal.example", FF_PORTAL_QUESTS: value }), false);
    }
  });

  it("keeps local tutor context untouched when only accounts are connected", async () => {
    const context = { tutorMode: true, questId: "local-lesson", source: "remote", aiTutorContext: "LOCAL NOTES" };
    const result = await officialTutorContext(context, {
      env: { FF_PORTAL_URL: "https://portal.example" },
      fetchImpl: async () => { throw new Error("account-only game must not fetch the hosted catalog"); },
    });
    assert.deepEqual(result, { ok: true, context });
  });

  it("lets the official catalog win on id", () => {
    const merged = mergeQuestCatalog(
      [{ id: "a", source: "hosted", mission: { id: "a" } }],
      [{ id: "a", source: "remote", gated: true }, { id: "b", source: "remote" }]
    );
    assert.deepEqual(
      merged.map((q) => q.source),
      ["remote", "remote"]
    );
  });

  it("drops a Library copy when the official catalog has that id", () => {
    const local = omitOfficialLocalDuplicates(
      [
        { id: "lesson-1", source: "hosted", mission: { id: "lesson-1", aiTutorContext: "NOTES" } },
        { id: "shelf-only", source: "hosted", mission: { id: "shelf-only" } },
      ],
      [{ id: "lesson-1", source: "remote", gated: true }]
    );
    assert.deepEqual(local.map((q) => q.id), ["shelf-only"]);
  });

  it("forwards the player token to the portal and never calls the public site", async () => {
    const calls = [];
    const fetchImpl = async (url, init) => {
      calls.push({ url, init });
      return {
        ok: true,
        status: 200,
        json: async () => ({ ok: true, remote: [], remoteOk: true }),
      };
    };
    const got = await fetchPortalQuests({
      env: { FF_PORTAL_URL: "https://portal.example/", FF_API_SECRET: "secret" },
      authorization: "Bearer player-jwt",
      search: "refresh=1",
      fetchImpl,
    });
    assert.equal(got.ok, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://portal.example/api/quests?refresh=1");
    assert.equal(calls[0].init.headers.Authorization, "Bearer player-jwt");
    assert.equal(calls[0].init.headers["X-FF-Secret"], "secret");
    assert.equal(calls[0].url.includes("warmersun.com"), false);
  });

  it("refuses tutor notes when the portal says the quest is paid", async () => {
    const fetchImpl = async () => ({
      ok: false,
      status: 402,
      json: async () => ({
        ok: false,
        error: "subscription_required",
        subscribeUrl: "https://cloud.warmersun.com/subscribe",
        tile: { id: "paid-1", gated: true, access: "paid" },
      }),
    });
    const decided = await officialTutorContext(
      {
        tutorMode: true,
        questId: "paid-1",
        source: "remote",
        aiTutorContext: "CLIENT NOTES",
      },
      {
        env: { FF_PORTAL_URL: "https://portal.example", FF_PORTAL_QUESTS: "1" },
        authorization: "Bearer player-jwt",
        fetchImpl,
      }
    );
    assert.equal(decided.ok, false);
    assert.equal(decided.status, 402);
    assert.equal(decided.error, "subscription_required");
  });

  it("replaces client tutor notes with the portal tile", async () => {
    const fetchImpl = async (url) => {
      assert.equal(url, "https://portal.example/api/quests/lesson-1");
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          tile: {
            id: "lesson-1",
            aiTutorContext: "SERVER NOTES",
            mission: { id: "lesson-1" },
          },
        }),
      };
    };
    const decided = await officialTutorContext(
      {
        tutorMode: true,
        questId: "lesson-1",
        source: "remote",
        aiTutorContext: "CLIENT NOTES",
      },
      { env: { FF_PORTAL_URL: "https://portal.example", FF_PORTAL_QUESTS: "1" }, fetchImpl }
    );
    assert.equal(decided.ok, true);
    assert.equal(decided.context.aiTutorContext, "SERVER NOTES");
  });
});

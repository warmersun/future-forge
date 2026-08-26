import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { clerkUsernameSlug, planClerkUserEvent } from "./clerk-webhooks.mjs";

describe("planClerkUserEvent", () => {
  it("deletes on user.deleted", () => {
    const p = planClerkUserEvent({ type: "user.deleted", data: { id: "user_abc" } });
    assert.equal(p.action, "delete");
    assert.equal(p.userId, "user_abc");
  });
  it("ensures on user.created and may award founding", () => {
    const p = planClerkUserEvent({
      type: "user.created",
      data: { id: "user_abc", created_at: 1700000000000 },
    });
    assert.equal(p.action, "ensure");
    assert.ok(Array.isArray(p.codes));
  });
  it("copies a Clerk username slug and ignores legal names", () => {
    const p = planClerkUserEvent({
      type: "user.created",
      data: {
        id: "user_abc",
        username: "Ada_Lovelace",
        first_name: "Ada",
        last_name: "Lovelace",
        full_name: "Ada Lovelace",
      },
    });
    assert.equal(p.username, "ada_lovelace");
    assert.equal("firstName" in p, false);
    const touch = planClerkUserEvent({
      type: "user.updated",
      data: { id: "user_abc", username: "sic", first_name: "Tamas" },
    });
    assert.equal(touch.action, "touch");
    assert.equal(touch.username, "sic");
  });
  it("drops usernames that are not our slug shape", () => {
    assert.equal(clerkUsernameSlug({ username: "ab" }), null);
    assert.equal(clerkUsernameSlug({ username: "Has Space" }), null);
    assert.equal(
      planClerkUserEvent({
        type: "user.created",
        data: { id: "user_abc", username: "Ada Lovelace", first_name: "Ada" },
      }).username,
      null
    );
  });
  it("rejects junk ids", () => {
    assert.equal(planClerkUserEvent({ type: "user.deleted", data: { id: "nope id" } }).ok, false);
  });
});

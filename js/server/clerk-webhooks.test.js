import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { planClerkUserEvent } from "./clerk-webhooks.mjs";

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
  it("rejects junk ids", () => {
    assert.equal(planClerkUserEvent({ type: "user.deleted", data: { id: "nope id" } }).ok, false);
  });
});

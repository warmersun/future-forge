import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { clerkRoomDisplayName, stampRoomPlayer } from "./friends-identity.mjs";

describe("clerkRoomDisplayName", () => {
  it("prefers a typed display name over profile", () => {
    assert.equal(
      clerkRoomDisplayName({ displayName: "Ada", profileDisplayName: "Tamas" }),
      "Ada"
    );
  });
  it("uses the chosen profile name when the form is empty", () => {
    assert.equal(
      clerkRoomDisplayName({ displayName: "", profileDisplayName: "Ada" }),
      "Ada"
    );
  });
  it("does not fall back to Clerk legal names", () => {
    assert.equal(
      clerkRoomDisplayName({ displayName: "", clerkFirstName: "Tamas", fallback: "Host" }),
      "Host"
    );
  });
  it("rejects email-like names", () => {
    assert.equal(
      clerkRoomDisplayName({ displayName: "a@b.com", fallback: "Guest" }),
      "Guest"
    );
  });
});

describe("stampRoomPlayer", () => {
  it("stores clerkUserId only when signed in", () => {
    const inn = stampRoomPlayer({ id: "1", displayName: "Tamas" }, { signedIn: true, userId: "user_1" });
    assert.equal(inn.clerkUserId, "user_1");
    const out = stampRoomPlayer({ id: "1", displayName: "Guest" }, { signedIn: false });
    assert.equal("clerkUserId" in out, false);
  });
});

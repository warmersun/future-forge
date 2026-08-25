import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { clerkRoomDisplayName, stampRoomPlayer } from "./friends-identity.mjs";

describe("clerkRoomDisplayName", () => {
  it("prefers Clerk first name over typed Player 2", () => {
    assert.equal(
      clerkRoomDisplayName({ displayName: "Player 2", clerkFirstName: "Tamas" }),
      "Tamas"
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

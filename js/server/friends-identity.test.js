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

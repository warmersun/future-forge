import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  GAME_SESSION_TTL_SEC,
  isGameSessionToken,
  mintGameSessionToken,
  verifyGameSessionToken,
} from "./game-session.mjs";

const env = { CLERK_SECRET_KEY: "sk_test_session_secret" };

describe("game session JWT", () => {
  it("mints a long-lived ff_game token Clerk verify would not need", () => {
    const token = mintGameSessionToken(
      { userId: "user_2abcDEF", sessionId: "sess_9" },
      env,
      { nowSec: 1_000 }
    );
    assert.equal(typeof token, "string");
    assert.equal(isGameSessionToken(token), true);
    const payload = verifyGameSessionToken(token, env, { nowSec: 1_000 });
    assert.deepEqual(payload, { sub: "user_2abcDEF", sid: "sess_9" });
    assert.equal(
      verifyGameSessionToken(token, env, { nowSec: 1_000 + GAME_SESSION_TTL_SEC - 1 }).sub,
      "user_2abcDEF"
    );
  });

  it("rejects expiry, bad hmac, and missing secret", () => {
    const token = mintGameSessionToken({ userId: "user_2abcDEF" }, env, { nowSec: 50 });
    assert.throws(
      () => verifyGameSessionToken(token, env, { nowSec: 50 + GAME_SESSION_TTL_SEC + 1 }),
      /expired/
    );
    const tampered = token.slice(0, -2) + "aa";
    assert.throws(() => verifyGameSessionToken(tampered, env, { nowSec: 50 }), /not_game_session/);
    assert.equal(mintGameSessionToken({ userId: "user_2abcDEF" }, {}), null);
  });
});

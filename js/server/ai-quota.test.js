import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { userQuotaDecision, QUOTA_SPENT_MESSAGE, FREE_DAILY_AI_HITS } from "./ai-quota.mjs";

describe("userQuotaDecision", () => {
  it("unsigned uses IP mode and does not 429 on user counter", () => {
    const d = userQuotaDecision({ signedIn: false, used: 999 });
    assert.equal(d.ok, true);
    assert.equal(d.mode, "ip");
  });

  it("signed-in over cap is 429 with upgrade copy", () => {
    const d = userQuotaDecision({ signedIn: true, used: FREE_DAILY_AI_HITS, cap: FREE_DAILY_AI_HITS });
    assert.equal(d.ok, false);
    assert.equal(d.status, 429);
    assert.equal(d.message, QUOTA_SPENT_MESSAGE);
  });

  it("signed-in under cap is user mode", () => {
    const d = userQuotaDecision({ signedIn: true, used: 3, cap: 40 });
    assert.equal(d.ok, true);
    assert.equal(d.mode, "user");
  });
});

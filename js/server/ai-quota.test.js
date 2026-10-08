import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  budgetMicroFromEnv,
  cloudAiDecision,
  DEFAULT_BUDGET_POINTS,
  DEFAULT_TEXT_HOLD_POINTS,
  chargeMicro,
  DEFAULT_TEXT_MAX_OUT,
  holdMicroFor,
  planSlugsFromEnv,
  signQuotaGrant,
  verifyQuotaGrant,
  QUOTA_SPENT_MESSAGE,
  quotaRatesFromEnv,
  quoteImageMicro,
  quoteTextMicro,
  quoteTtsMicro,
  quoteVoiceMicro,
  settleMicroFor,
  SUBSCRIPTION_REQUIRED_MESSAGE,
  subscriptionEntitled,
  voiceConnectedMinuteMicro,
} from "./ai-quota.mjs";

const RATES = quotaRatesFromEnv({});

describe("quotaRatesFromEnv", () => {
  it("defaults are whole points", () => {
    assert.deepEqual(RATES, {
      textInPerKTok: 2,
      textOutPerKTok: 6,
      image: 20,
      ttsPerKChar: 15,
      voicePerMin: 160,
    });
    assert.equal(budgetMicroFromEnv({}), DEFAULT_BUDGET_POINTS);
    assert.equal(budgetMicroFromEnv({ FF_CLOUD_AI_BUDGET_USD: "5" }), DEFAULT_BUDGET_POINTS);
  });

  it("overriding one rate leaves the others", () => {
    const rates = quotaRatesFromEnv({ FF_QUOTA_IMAGE: "40" });
    assert.equal(rates.image, 40);
    assert.equal(rates.textInPerKTok, 2);
    assert.equal(rates.voicePerMin, 160);
  });

  it("a fraction falls back to the default", () => {
    const rates = quotaRatesFromEnv({
      FF_QUOTA_IMAGE: "0.5",
      FF_QUOTA_TEXT_IN_PER_KTOK: "2.5",
      FF_QUOTA_VOICE_PER_MIN: "-1",
    });
    assert.equal(rates.image, 20);
    assert.equal(rates.textInPerKTok, 2);
    assert.equal(rates.voicePerMin, 160);
  });

  it("a rate of 0 quotes 0", () => {
    const rates = quotaRatesFromEnv({
      FF_QUOTA_TEXT_IN_PER_KTOK: "0",
      FF_QUOTA_TEXT_OUT_PER_KTOK: "0",
      FF_QUOTA_IMAGE: "0",
      FF_QUOTA_TTS_PER_KCHAR: "0",
      FF_QUOTA_VOICE_PER_MIN: "0",
    });
    assert.equal(quoteTextMicro(1_000_000, 1_000_000, rates), 0);
    assert.equal(quoteImageMicro(rates), 0);
    assert.equal(quoteTtsMicro(1_000_000, rates), 0);
    assert.equal(quoteVoiceMicro(60_000, rates), 0);
    assert.equal(voiceConnectedMinuteMicro(rates), 0);
  });
});

describe("quotes", () => {
  it("rounds text and TTS up to the next thousand and charges voice per started minute", () => {
    assert.equal(quoteTextMicro(0, 0, RATES), 0);
    assert.equal(quoteTextMicro(1, 0, RATES), 2);
    assert.equal(quoteTextMicro(1000, 0, RATES), 2);
    assert.equal(quoteTextMicro(1001, 0, RATES), 4);
    assert.equal(quoteTextMicro(2000, 500, RATES), 10);
    assert.equal(quoteImageMicro(RATES), 20);
    assert.equal(quoteTtsMicro(0, RATES), 0);
    assert.equal(quoteTtsMicro(1, RATES), 15);
    assert.equal(quoteTtsMicro(1001, RATES), 30);
    assert.equal(quoteVoiceMicro(1, RATES), 160);
    assert.equal(quoteVoiceMicro(60_000, RATES), 160);
    assert.equal(quoteVoiceMicro(60_001, RATES), 320);
    assert.equal(voiceConnectedMinuteMicro(RATES), 160);
  });

  it("voice hold is one minute when the budget cannot cover it, else the lesser of remaining and the max session", () => {
    const minute = voiceConnectedMinuteMicro(RATES);
    const short = holdMicroFor("voice", {
      remainingMicro: minute - 1,
      rates: RATES,
      maxVoiceMs: 60_000,
    });
    assert.ok(short > minute - 1);
    const capped = holdMicroFor("voice", {
      remainingMicro: DEFAULT_BUDGET_POINTS,
      rates: RATES,
      maxVoiceMs: 60_000,
    });
    assert.equal(capped, quoteVoiceMicro(60_000, RATES));
  });

  it("text hold prices input, the output cap, and reasoning headroom", () => {
    const headroom = DEFAULT_TEXT_HOLD_POINTS;
    const withInput = holdMicroFor("text", { inputTokens: 1_000_000, rates: RATES, env: {} });
    assert.equal(withInput, quoteTextMicro(1_000_000, DEFAULT_TEXT_MAX_OUT, RATES) + headroom);
    const missing = holdMicroFor("text", { rates: RATES, env: {} });
    assert.equal(missing, quoteTextMicro(0, DEFAULT_TEXT_MAX_OUT, RATES) + headroom);
    assert.ok(missing > headroom);
  });

  it("chargeMicro stays within the hold and the budget", () => {
    assert.equal(
      chargeMicro({
        actualMicro: 50,
        heldMicro: 20,
        budgetMicro: 100,
        spentMicro: 70,
        heldTotalMicro: 20,
      }),
      20
    );
    assert.equal(
      chargeMicro({
        actualMicro: 50,
        heldMicro: 40,
        budgetMicro: 100,
        spentMicro: 70,
        heldTotalMicro: 40,
      }),
      30
    );
    assert.equal(
      chargeMicro({
        actualMicro: 5,
        heldMicro: 40,
        budgetMicro: 100,
        spentMicro: 0,
        heldTotalMicro: 40,
      }),
      5
    );
    assert.equal(chargeMicro({ actualMicro: 10, heldMicro: 4 }), 4);
  });

  it("quota grants match the user and expire", () => {
    const now = 1_700_000_000_000;
    const grant = signQuotaGrant("user_1", "portal-only", now);
    assert.equal(verifyQuotaGrant(grant, "portal-only", now), "user_1");
    assert.equal(verifyQuotaGrant(grant, "other-key", now), null);
    assert.equal(verifyQuotaGrant(grant, "portal-only", now + 13 * 60 * 60 * 1000), null);
    assert.equal(signQuotaGrant("", "portal-only", now), "");
  });

  it("settle release is 0 and image bills only when asked", () => {
    assert.equal(settleMicroFor("image", { release: true }, RATES), 0);
    assert.equal(settleMicroFor("image", { bill: true }, RATES), quoteImageMicro(RATES));
    assert.equal(settleMicroFor("tts", { chars: 0 }, RATES), 0);
  });
});

describe("subscriptionEntitled", () => {
  const future = Date.now() + 86_400_000;
  const past = Date.now() - 86_400_000;

  it("active paid plan is entitled", () => {
    assert.equal(
      subscriptionEntitled({ status: "active", planSlug: "cloud", periodEnd: future, now: Date.now() }),
      true
    );
  });

  it("free_user and past_due are not", () => {
    assert.equal(subscriptionEntitled({ status: "active", planSlug: "free_user", periodEnd: future }), false);
    assert.equal(subscriptionEntitled({ status: "past_due", planSlug: "cloud", periodEnd: future }), false);
  });

  it("canceled in period is entitled; after period_end is not", () => {
    assert.equal(
      subscriptionEntitled({ status: "canceled", planSlug: "cloud", periodEnd: future, now: Date.now() }),
      true
    );
    assert.equal(
      subscriptionEntitled({ status: "canceled", planSlug: "cloud", periodEnd: past, now: Date.now() }),
      false
    );
    assert.equal(
      subscriptionEntitled({ status: "active", planSlug: "cloud", periodEnd: past, now: Date.now() }),
      false
    );
  });

  it("reads plan slugs from the env", () => {
    assert.deepEqual(planSlugsFromEnv({}), ["cloud"]);
    assert.deepEqual(planSlugsFromEnv({ FF_CLOUD_PLAN_SLUGS: "cloud, studio" }), ["cloud", "studio"]);
  });
});

describe("cloudAiDecision", () => {
  it("self-host allows", () => {
    const d = cloudAiDecision({ cloudAi: false, signedIn: false });
    assert.equal(d.ok, true);
    assert.equal(d.mode, "self-host");
  });

  it("hosted unsigned or unsubscribed is 402", () => {
    const unsigned = cloudAiDecision({ cloudAi: true, signedIn: false, entitled: false });
    assert.equal(unsigned.status, 402);
    assert.equal(unsigned.error, "subscription_required");
    assert.equal(unsigned.message, SUBSCRIPTION_REQUIRED_MESSAGE);
    const free = cloudAiDecision({ cloudAi: true, signedIn: true, entitled: false });
    assert.equal(free.status, 402);
  });

  it("text under the hold is 429; a paid plan with room allows", () => {
    const spent = cloudAiDecision({
      cloudAi: true,
      signedIn: true,
      entitled: true,
      remainingMicro: 100,
      holdMicro: 200,
    });
    assert.equal(spent.status, 429);
    assert.equal(spent.message, QUOTA_SPENT_MESSAGE);
    const ok = cloudAiDecision({
      cloudAi: true,
      signedIn: true,
      entitled: true,
      remainingMicro: 500,
      holdMicro: 200,
    });
    assert.equal(ok.ok, true);
    assert.equal(ok.mode, "user");
  });
});

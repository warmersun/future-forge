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
import crypto from "node:crypto";
import {
  budgetMicroFromEnv,
  cloudAiDecision,
  DEFAULT_BUDGET_POINTS,
  DEFAULT_TEXT_HOLD_POINTS,
  chargeMicro,
  contentEntitled,
  contentPlanSlugsFromEnv,
  DEFAULT_TEXT_MAX_OUT,
  holdMicroFor,
  planSlugsFromEnv,
  planStripeWebhookEvent,
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
  subscriptionView,
  TOPUP_PERIOD_START,
  TOPUP_PRICE_USD,
  topUpUrlFromEnv,
  usageForAccount,
  usagePeriodStart,
  usageView,
  verifyStripeWebhook,
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
      voicePerMin: 80,
    });
    assert.equal(DEFAULT_BUDGET_POINTS, 15000);
    assert.equal(TOPUP_PRICE_USD, 20);
    assert.equal(budgetMicroFromEnv({}), DEFAULT_BUDGET_POINTS);
    assert.equal(budgetMicroFromEnv({ FF_CLOUD_AI_BUDGET_USD: "5" }), DEFAULT_BUDGET_POINTS);
  });

  it("overriding one rate leaves the others", () => {
    const rates = quotaRatesFromEnv({ FF_QUOTA_IMAGE: "40" });
    assert.equal(rates.image, 40);
    assert.equal(rates.textInPerKTok, 2);
    assert.equal(rates.voicePerMin, 80);
  });

  it("a fraction falls back to the default", () => {
    const rates = quotaRatesFromEnv({
      FF_QUOTA_IMAGE: "0.5",
      FF_QUOTA_TEXT_IN_PER_KTOK: "2.5",
      FF_QUOTA_VOICE_PER_MIN: "-1",
    });
    assert.equal(rates.image, 20);
    assert.equal(rates.textInPerKTok, 2);
    assert.equal(rates.voicePerMin, 80);
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
    assert.equal(quoteVoiceMicro(1, RATES), 80);
    assert.equal(quoteVoiceMicro(60_000, RATES), 80);
    assert.equal(quoteVoiceMicro(60_001, RATES), 160);
    assert.equal(voiceConnectedMinuteMicro(RATES), 80);
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

  it("active content plan is entitled", () => {
    assert.equal(
      subscriptionEntitled({ status: "active", planSlug: "content", periodEnd: future, now: Date.now() }),
      true
    );
    assert.equal(
      subscriptionEntitled({ status: "active", planSlug: "cloud", periodEnd: future, now: Date.now() }),
      false
    );
  });

  it("free_user, non-content plans, and past_due are not", () => {
    assert.equal(subscriptionEntitled({ status: "active", planSlug: "free_user", periodEnd: future }), false);
    const view = subscriptionView(
      { plan_slug: "free_user", status: "active", period_end: new Date(future).toISOString() },
      { subscribeUrl: "https://cloud.warmersun.com/subscribe", now: Date.now() }
    );
    assert.equal(view.entitled, false);
    assert.equal(view.content, false);
    assert.equal(view.subscribeUrl, "https://cloud.warmersun.com/subscribe");
    const legacyCloud = subscriptionView(
      { plan_slug: "cloud", status: "active", period_end: new Date(future).toISOString() },
      { subscribeUrl: "https://cloud.warmersun.com/subscribe", now: Date.now() }
    );
    assert.equal(legacyCloud.entitled, false);
    assert.equal(legacyCloud.content, false);
    assert.equal(legacyCloud.planSlug, "cloud");
    const content = subscriptionView(
      { plan_slug: "content", status: "active", period_end: new Date(future).toISOString() },
      {
        subscribeUrl: "https://cloud.warmersun.com/subscribe",
        topUpUrl: "https://buy.stripe.com/test_20?client_reference_id=user_1",
        topUpEntitled: false,
        now: Date.now(),
      }
    );
    assert.equal(content.entitled, false);
    assert.equal(content.content, true);
    assert.equal(content.topUpUrl, "https://buy.stripe.com/test_20?client_reference_id=user_1");
    assert.equal(contentEntitled({ status: "active", planSlug: "other", periodEnd: future, now: Date.now() }), false);
    assert.equal(contentEntitled({ status: "active", planSlug: "content", periodEnd: future, now: Date.now() }), true);
    assert.equal(subscriptionEntitled({ status: "active", planSlug: "content", periodEnd: future, now: Date.now() }), true);
    assert.equal(subscriptionEntitled({ status: "past_due", planSlug: "content", periodEnd: future }), false);
  });

  it("canceled in period is entitled; after period_end is not", () => {
    assert.equal(
      subscriptionEntitled({ status: "canceled", planSlug: "content", periodEnd: future, now: Date.now() }),
      true
    );
    assert.equal(
      subscriptionEntitled({ status: "canceled", planSlug: "content", periodEnd: past, now: Date.now() }),
      false
    );
    assert.equal(
      subscriptionEntitled({ status: "active", planSlug: "content", periodEnd: past, now: Date.now() }),
      false
    );
  });

  it("reads plan slugs from the env", () => {
    assert.deepEqual(planSlugsFromEnv({}), ["content"]);
    assert.deepEqual(planSlugsFromEnv({ FF_CONTENT_PLAN_SLUGS: "content, lessons" }), ["content", "lessons"]);
    assert.deepEqual(contentPlanSlugsFromEnv({}), ["content"]);
    assert.deepEqual(contentPlanSlugsFromEnv({ FF_CONTENT_PLAN_SLUGS: "lessons" }), ["lessons"]);
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

describe("usageView", () => {
  it("hides a non-cloud account and clamps the last points", () => {
    assert.equal(usageView({ entitled: false, budget: 15000, spent: 0, held: 0 }), null);
    assert.deepEqual(
      usageView({ entitled: true, budget: 0, spent: 0, held: 0, periodEnd: null }),
      { budget: 0, spent: 0, held: 0, remaining: 0, periodEnd: null }
    );
    assert.equal(usageView({ entitled: true, budget: 100, spent: 90, held: 20 }).remaining, 0);
    assert.deepEqual(
      usageView({
        entitled: true,
        budget: "15000",
        spent: "12400",
        held: 50,
        periodEnd: "2026-11-13T23:23:17.295Z",
      }),
      {
        budget: 15000,
        spent: 12400,
        held: 50,
        remaining: 2550,
        periodEnd: "2026-11-13T23:23:17.295Z",
      }
    );
    assert.equal(usageView({ entitled: true, budget: 10, periodEnd: "not-a-date" }).periodEnd, null);
  });

  it("reads the top-up period key for any signed-in user and includes topUpUrl", async () => {
    const calls = [];
    const query = async (sql, params) => {
      calls.push({ sql, params });
      return { rows: [{ spent_points: "100", held_points: 5 }] };
    };
    const sub = {
      plan_slug: "content",
      status: "active",
      period_start: "2026-10-13T23:23:17.295Z",
      period_end: "2026-11-13T23:23:17.295Z",
    };
    const env = { FF_CLOUD_AI_BUDGET: "15000", FF_STRIPE_TOPUP_URL: "https://buy.stripe.com/test_20" };
    const usage = await usageForAccount(query, "user_1", sub, env);
    assert.deepEqual(usage, {
      budget: 15000, spent: 100, held: 5, remaining: 14895,
      periodEnd: null,
      topUpUrl: "https://buy.stripe.com/test_20?client_reference_id=user_1",
    });
    assert.match(calls[0].sql, /FROM ai_usage_period/);
    assert.deepEqual(calls[0].params, ["user_1", TOPUP_PERIOD_START]);
    const empty = await usageForAccount(async () => ({ rows: [] }), "user_1", null, env);
    assert.equal(empty.spent, 0);
    assert.equal(empty.held, 0);
    assert.equal(empty.remaining, 0);
    assert.equal(empty.topUpUrl, "https://buy.stripe.com/test_20?client_reference_id=user_1");
    assert.equal(await usageForAccount(query, "", sub, env), null);
    assert.equal(calls.length, 1);
    assert.equal(usagePeriodStart({ period_start: "nope" }), null);
    assert.equal(
      usagePeriodStart({}, Date.parse("2026-11-03T22:00:00.000Z")),
      "2026-11-01T00:00:00.000Z"
    );
  });
});

describe("Stripe top-up link & webhook", () => {
  it("builds a Payment Link URL with client_reference_id", () => {
    assert.equal(topUpUrlFromEnv({}, "user_1"), "");
    assert.equal(
      topUpUrlFromEnv({ FF_STRIPE_TOPUP_URL: "https://buy.stripe.com/test_20" }, "user_1"),
      "https://buy.stripe.com/test_20?client_reference_id=user_1"
    );
    assert.equal(
      topUpUrlFromEnv({ STRIPE_PAYMENT_LINK_URL: "https://buy.stripe.com/test_20" }, "bad id"),
      "https://buy.stripe.com/test_20"
    );
  });

  it("verifies Stripe webhook signatures and plans paid checkout resets", () => {
    const secret = "whsec_test_stripe";
    const nowSec = 1_700_000_000;
    const payload = JSON.stringify({
      id: "evt_stripe_1",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_1",
          client_reference_id: "user_1",
          payment_status: "paid",
        },
      },
    });
    const sig = crypto
      .createHmac("sha256", secret)
      .update(`${nowSec}.${payload}`, "utf8")
      .digest("hex");
    const verified = verifyStripeWebhook(payload, `t=${nowSec},v1=${sig}`, secret, { nowSec });
    assert.deepEqual(planStripeWebhookEvent(verified), {
      ok: true,
      id: "evt_stripe_1",
      action: "reset_ai_usage",
      userId: "user_1",
    });
    assert.throws(
      () => verifyStripeWebhook(payload, `t=${nowSec - 1000},v1=${sig}`, secret, { nowSec }),
      /timestamp outside tolerance/
    );
    assert.throws(
      () => verifyStripeWebhook(payload, `t=${nowSec},v1=${"0".repeat(64)}`, secret, { nowSec }),
      /signature mismatch/
    );
    assert.deepEqual(
      planStripeWebhookEvent({
        id: "evt_coupon_free",
        type: "checkout.session.completed",
        data: { object: { client_reference_id: "user_1", payment_status: "no_payment_required" } },
      }),
      { ok: true, id: "evt_coupon_free", action: "reset_ai_usage", userId: "user_1" }
    );
    assert.deepEqual(
      planStripeWebhookEvent({
        id: "evt_unpaid",
        type: "checkout.session.completed",
        data: { object: { client_reference_id: "user_1", payment_status: "unpaid" } },
      }),
      { ok: true, id: "evt_unpaid", action: "ignore" }
    );
  });
});

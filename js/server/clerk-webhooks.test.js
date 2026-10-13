import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  clerkPaidSubscriptionRow,
  clerkUsernameSlug,
  planClerkBillingEvent,
  planClerkUserEvent,
  rowFromClerkBillingSubscription,
} from "./clerk-webhooks.mjs";

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

describe("planClerkBillingEvent", () => {
  it("upserts an active subscription without payer names or email", () => {
    const p = planClerkBillingEvent({
      type: "subscription.active",
      data: {
        id: "csub_1",
        status: "active",
        payer: {
          user_id: "user_abc",
          email: "a@example.com",
          first_name: "Ada",
          last_name: "Lovelace",
        },
        items: [
          {
            plan: { slug: "cloud" },
            period_start: 1_700_000_000_000,
            period_end: 1_702_592_000_000,
          },
        ],
      },
    });
    assert.equal(p.ok, true);
    assert.equal(p.action, "upsert_subscription");
    assert.equal(p.userId, "user_abc");
    assert.equal(p.planSlug, "cloud");
    assert.equal(p.status, "active");
    assert.equal(p.periodStart, new Date(1_700_000_000_000).toISOString());
    assert.equal(p.periodEnd, new Date(1_702_592_000_000).toISOString());
    assert.equal("email" in p, false);
    assert.equal("firstName" in p, false);
    assert.equal("first_name" in p, false);
  });

  it("marks a canceled item and a past-due item", () => {
    const canceled = planClerkBillingEvent({
      type: "subscriptionItem.canceled",
      data: {
        status: "canceled",
        period_end: 1_702_592_000_000,
        plan: { slug: "cloud" },
        payer: { user_id: "user_abc", email: "a@example.com" },
      },
    });
    assert.equal(canceled.status, "canceled");
    assert.equal(canceled.planSlug, "cloud");
    assert.equal("email" in canceled, false);
    const due = planClerkBillingEvent({
      type: "subscriptionItem.pastDue",
      data: { payer: { user_id: "user_abc" }, plan: { slug: "cloud" } },
    });
    assert.equal(due.status, "past_due");
  });

  it("rejects a subscription with no user id", () => {
    const p = planClerkBillingEvent({
      type: "subscription.created",
      data: { status: "active", payer: { organization_id: "org_1" }, items: [] },
    });
    assert.equal(p.ok, false);
    assert.equal(p.error, "invalid_user");
  });

  it("ignores payment attempts", () => {
    assert.equal(
      planClerkBillingEvent({ type: "paymentAttempt.updated", data: { id: "pa_1" } }).action,
      "ignore"
    );
  });

  it("stores a paid Clerk plan slug as cloud", () => {
    const p = planClerkBillingEvent(
      {
        type: "subscription.active",
        data: {
          status: "active",
          payer: { user_id: "user_abc" },
          items: [
            {
              plan: { slug: "future_forge_hosted4u" },
              period_start: 1_700_000_000_000,
              period_end: 1_702_592_000_000,
            },
          ],
        },
      },
      { env: {} }
    );
    assert.equal(p.planSlug, "cloud");
    assert.equal(p.status, "active");
    const item = planClerkBillingEvent(
      {
        type: "subscriptionItem.updated",
        data: {
          status: "active",
          plan: { slug: "future_forge_hosted4u" },
          payer: { user_id: "user_abc" },
        },
      },
      { env: {} }
    );
    assert.equal(item.planSlug, "cloud");
    const mixed = planClerkBillingEvent(
      {
        type: "subscription.updated",
        data: {
          status: "active",
          payer: { user_id: "user_abc" },
          items: [
            { plan: { slug: "free_user" } },
            { plan: { slug: "future_forge_hosted4u" }, period_end: 1_702_592_000_000 },
          ],
        },
      },
      { env: {} }
    );
    assert.equal(mixed.planSlug, "cloud");
    assert.equal(mixed.periodEnd, new Date(1_702_592_000_000).toISOString());
  });

  it("leaves free_user unentitled", () => {
    const p = planClerkBillingEvent(
      {
        type: "subscriptionItem.active",
        data: {
          status: "active",
          plan: { slug: "free_user" },
          payer: { user_id: "user_abc", email: "a@example.com" },
        },
      },
      { env: {} }
    );
    assert.equal(p.planSlug, "free_user");
    assert.equal("email" in p, false);
    const org = planClerkBillingEvent(
      {
        type: "subscription.active",
        data: {
          status: "active",
          payer: { user_id: "user_abc" },
          items: [{ plan: { slug: "free_org" } }],
        },
      },
      { env: {} }
    );
    assert.equal(org.planSlug, "free_org");
  });
});

describe("rowFromClerkBillingSubscription", () => {
  it("maps an active paid plan onto the cloud row", () => {
    const row = rowFromClerkBillingSubscription(
      {
        status: "active",
        subscriptionItems: [
          { status: "active", plan: { slug: "free_user" }, periodStart: 1, periodEnd: 2 },
          {
            status: "active",
            plan: { slug: "future_forge_hosted4u" },
            periodStart: 1_700_000_000_000,
            periodEnd: 1_702_592_000_000,
          },
        ],
      },
      { env: {} }
    );
    assert.equal(row.planSlug, "cloud");
    assert.equal(row.status, "active");
    assert.equal(row.periodStart, new Date(1_700_000_000_000).toISOString());
    assert.equal(row.periodEnd, new Date(1_702_592_000_000).toISOString());
  });

  it("does not map a free plan or an inactive paid plan", () => {
    assert.equal(
      rowFromClerkBillingSubscription({
        subscriptionItems: [{ status: "active", plan: { slug: "free_user" } }],
      }),
      null
    );
    assert.equal(
      rowFromClerkBillingSubscription({
        subscriptionItems: [{ status: "canceled", plan: { slug: "future_forge_hosted4u" } }],
      }),
      null
    );
  });

  it("loads a paid subscription through the Clerk billing call", async () => {
    const row = await clerkPaidSubscriptionRow("user_abc", {
      env: {},
      getUserBillingSubscription: async (userId) => {
        assert.equal(userId, "user_abc");
        return {
          subscriptionItems: [
            {
              status: "active",
              plan: { slug: "future_forge_hosted4u" },
              periodStart: 1_700_000_000_000,
              periodEnd: 1_702_592_000_000,
            },
          ],
        };
      },
    });
    assert.equal(row.planSlug, "cloud");
  });
});

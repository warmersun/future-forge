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

import test from "node:test";
import assert from "node:assert/strict";
import {
  aiUsageMarkup,
  didTopUpReset,
  paintAiUsageMeters,
  refreshAiUsage,
  repaintAiUsage,
  showTopUpThankYouModal,
  usageMeterState,
  usageResetLabel,
} from "./ai-usage.js";

test("usage meter states show used versus left and hide a bad payload", () => {
  assert.equal(usageMeterState(null), null);
  assert.equal(usageMeterState({}), null);
  assert.equal(usageMeterState({ budget: -1, spent: 0, held: 0, remaining: 0 }), null);
  const low = usageMeterState({ budget: 15000, spent: 12000, held: 400, remaining: 2600 });
  assert.equal(low.used, 12400);
  assert.equal(low.figures, "12,400 used · 2,600 left");
  assert.equal(low.tone, "low");
  assert.equal(low.pct, 83);
  const empty = usageMeterState({
    budget: 15000, spent: 15000, held: 0, remaining: 0,
    periodEnd: "2026-11-13T23:23:17.295Z",
    topUpUrl: "https://buy.stripe.com/test_20?client_reference_id=user_1",
  });
  assert.equal(empty.tone, "empty");
  assert.equal(empty.pct, 100);
  assert.equal(empty.figures, "15,000 used · 0 left");
  assert.equal(empty.reset, "Resets Nov 13, 2026");
  assert.equal(empty.topUpUrl, "https://buy.stripe.com/test_20?client_reference_id=user_1");
  const notToppedUp = usageMeterState({
    budget: 15000, spent: 0, held: 0, remaining: 0,
    topUpUrl: "https://buy.stripe.com/test_20",
  });
  assert.equal(notToppedUp.used, 0);
  assert.equal(notToppedUp.pct, 0);
  assert.equal(notToppedUp.tone, "empty");
  assert.equal(notToppedUp.figures, "0 used · 0 left");
  assert.equal(notToppedUp.topUpUrl, "https://buy.stripe.com/test_20");
  const ok = usageMeterState({ budget: 15000, spent: 100, held: 0, remaining: 14900 });
  assert.equal(ok.tone, "ok");
  assert.equal(ok.pct, 1);
  const boundary75 = usageMeterState({ budget: 15000, spent: 11250, held: 0, remaining: 3750 });
  assert.equal(boundary75.tone, "ok");
  assert.equal(boundary75.pct, 75);
  const above75 = usageMeterState({ budget: 15000, spent: 11251, held: 0, remaining: 3749 });
  assert.equal(above75.tone, "low");
  assert.equal(above75.pct, 75);
  const boundary95 = usageMeterState({ budget: 15000, spent: 14250, held: 0, remaining: 750 });
  assert.equal(boundary95.tone, "low");
  assert.equal(boundary95.pct, 95);
  const above95 = usageMeterState({ budget: 15000, spent: 14251, held: 0, remaining: 749 });
  assert.equal(above95.tone, "empty");
  assert.equal(above95.pct, 95);
  const secondTopUp = usageMeterState({ budget: 30000, spent: 0, held: 0, remaining: 30000 });
  assert.equal(secondTopUp.tone, "ok");
  assert.equal(secondTopUp.figures, "0 used · 30,000 left");
  const zero = usageMeterState({ budget: 0, spent: 0, held: 0, remaining: 0 });
  assert.equal(zero.tone, "empty");
  assert.equal(zero.pct, 0);
  assert.equal(zero.figures, "0 used · 0 left");
  assert.equal(Number.isFinite(zero.pct), true);
  assert.equal(usageResetLabel("not-a-date"), "");
  assert.equal(usageResetLabel(""), "");
});

test("paint writes the figures and hides when usage is null", () => {
  const meter = fakeMeter();
  const root = { querySelectorAll: () => [meter], matches: () => false };
  const state = paintAiUsageMeters(
    {
      budget: 15000, spent: 15000, held: 0, remaining: 0,
      periodEnd: "2026-11-13T23:23:17.295Z",
      topUpUrl: "https://buy.stripe.com/test_20?client_reference_id=user_1",
    },
    root
  );
  assert.equal(state.tone, "empty");
  assert.equal(meter.hidden, false);
  assert.equal(meter.classList.has("is-empty"), true);
  assert.equal(meter.querySelector("[data-ai-usage-figures]").textContent, "15,000 used · 0 left");
  assert.equal(meter.querySelector("[data-ai-usage-fill]").style.width, "100%");
  assert.equal(meter.querySelector("[data-ai-usage-meter]").getAttribute("aria-valuetext"), "15,000 used · 0 left");
  assert.equal(meter.querySelector("[data-ai-usage-reset]").textContent, "Resets Nov 13, 2026");
  assert.equal(meter.querySelector("[data-ai-usage-reset]").hidden, false);
  assert.equal(meter.querySelector("[data-ai-usage-topup]").href, "https://buy.stripe.com/test_20?client_reference_id=user_1");
  assert.equal(meter.querySelector("[data-ai-usage-topup]").hidden, false);
  paintAiUsageMeters(null, root);
  assert.equal(meter.hidden, true);
  assert.equal(meter.querySelector("[data-ai-usage-figures]").textContent, "");
  assert.equal(meter.querySelector("[data-ai-usage-topup]").hidden, true);
  assert.match(aiUsageMarkup(), /data-ai-usage/);
  assert.match(aiUsageMarkup(), /\$20 for 15,000 points/);
});

test("a meter mounted after the account read picks up the last usage", () => {
  const first = fakeMeter();
  const early = { querySelectorAll: () => [first], matches: () => false };
  paintAiUsageMeters({ budget: 100, spent: 40, held: 10, remaining: 50 }, early);
  const late = fakeMeter();
  const mounted = { querySelectorAll: () => [late], matches: () => false };
  repaintAiUsage(mounted);
  assert.equal(late.hidden, false);
  assert.equal(late.querySelector("[data-ai-usage-figures]").textContent, "50 used · 50 left");
  assert.equal(first.hidden, false);
});

test("refresh paints a signed-in usage and leaves the meter on a failed fetch", async () => {
  const meter = fakeMeter();
  const root = { querySelectorAll: () => [meter], matches: () => false };
  const usage = { budget: 15000, spent: 100, held: 0, remaining: 14900, periodEnd: null };
  const painted = await refreshAiUsage(async () => ({
    ok: true,
    json: async () => ({ ok: true, signedIn: true, usage }),
  }), root);
  assert.equal(painted.figures, "100 used · 14,900 left");
  assert.equal(meter.hidden, false);
  const kept = await refreshAiUsage(async () => { throw new Error("offline"); }, root);
  assert.equal(kept, null);
  assert.equal(meter.hidden, false);
  assert.equal(meter.querySelector("[data-ai-usage-figures]").textContent, "100 used · 14,900 left");
  await refreshAiUsage(async () => ({
    ok: true,
    json: async () => ({ ok: true, signedIn: true, usage: null }),
  }), root);
  assert.equal(meter.hidden, true);
});

test("detects top-up resets and pops up the thank-you modal", () => {
  const map = new Map();
  const storage = {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
  let appendedModal = null;
  const doc = {
    nodeType: 9,
    body: {
      appendChild(el) {
        appendedModal = el;
      },
    },
    querySelector: (sel) => (sel === "[data-ai-topup-thanks]" ? appendedModal : null),
    createElement() {
      const classes = new Set();
      const bodyNode = { textContent: "" };
      const closeBtn = { addEventListener() {} };
      return {
        className: "",
        hidden: false,
        innerHTML: "",
        classList: {
          add(...names) { for (const n of names) classes.add(n); },
          remove(...names) { for (const n of names) classes.delete(n); },
          contains: (n) => classes.has(n),
        },
        setAttribute() {},
        removeAttribute() {},
        addEventListener() {},
        querySelector: (sel) => {
          if (sel === "[data-ai-topup-thanks-body]") return bodyNode;
          if (sel === "[data-ai-topup-thanks-close]") return closeBtn;
          return null;
        },
      };
    },
    addEventListener() {},
  };
  const meter = fakeMeter();
  const root = { ownerDocument: doc, querySelectorAll: () => [meter], matches: () => false };

  // Initial load with 0 left (not topped up yet) does not pop up thank-you.
  paintAiUsageMeters(
    { budget: 15000, spent: 0, held: 0, remaining: 0, topUpUrl: "https://buy.stripe.com/test_20?client_reference_id=user_1" },
    root,
    { storage, now: 1_700_000_000_000 }
  );
  assert.equal(appendedModal, null);

  // First top-up (0 -> 15,000 left) pops up thank-you.
  paintAiUsageMeters(
    {
      budget: 15000,
      spent: 0,
      held: 0,
      remaining: 15000,
      resetAt: "2026-11-08T23:50:00.000Z",
      topUpUrl: "https://buy.stripe.com/test_20?client_reference_id=user_1",
    },
    root,
    { storage, now: Date.parse("2026-11-08T23:50:05.000Z") }
  );
  assert.notEqual(appendedModal, null);
  assert.equal(appendedModal.classList.contains("open"), true);
  assert.match(appendedModal.querySelector("[data-ai-topup-thanks-body]").textContent, /15,000 points/);

  // Close the modal; subsequent refresh with same usage does not re-open it.
  appendedModal.classList.remove("open");
  paintAiUsageMeters(
    {
      budget: 15000,
      spent: 0,
      held: 0,
      remaining: 15000,
      resetAt: "2026-11-08T23:50:00.000Z",
      topUpUrl: "https://buy.stripe.com/test_20?client_reference_id=user_1",
    },
    root,
    { storage, now: Date.parse("2026-11-08T23:50:10.000Z") }
  );
  assert.equal(appendedModal.classList.contains("open"), false);

  // Second top-up (15,000 -> 30,000 left) pops up thank-you with 30,000 points.
  paintAiUsageMeters(
    {
      budget: 30000,
      spent: 0,
      held: 0,
      remaining: 30000,
      resetAt: "2026-11-08T23:55:00.000Z",
      topUpUrl: "https://buy.stripe.com/test_20?client_reference_id=user_1",
    },
    root,
    { storage, now: Date.parse("2026-11-08T23:55:05.000Z") }
  );
  assert.equal(appendedModal.classList.contains("open"), true);
  assert.match(appendedModal.querySelector("[data-ai-topup-thanks-body]").textContent, /30,000 points/);
  assert.equal(meter.querySelector("[data-ai-usage-figures]").textContent, "0 used · 30,000 left");
  assert.equal(didTopUpReset({ remaining: 0 }, null, null), false);
  const heldUrl = "https://buy.stripe.com/test_20?client_reference_id=user_1";
  const heldAt = "2026-11-08T23:40:00.000Z";
  assert.equal(didTopUpReset(
    { remaining: 9500, spent: 5500, budget: 15000, resetAt: heldAt, topUpUrl: heldUrl },
    { remaining: 8000, spent: 5000, budget: 15000, resetAt: heldAt },
    { userKey: "user_1", remaining: 8000, spent: 5000, budget: 15000, resetAt: heldAt, at: Date.parse("2026-11-08T23:49:00.000Z") },
    "",
    Date.parse("2026-11-08T23:50:00.000Z")
  ), false);
  assert.notEqual(showTopUpThankYouModal({ remaining: 30000 }, root), null);
});

test("a released hold does not open the top-up thank-you", () => {
  const map = new Map();
  const storage = {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
  };
  let appendedModal = null;
  const doc = {
    nodeType: 9,
    body: { appendChild(el) { appendedModal = el; } },
    querySelector: (sel) => (sel === "[data-ai-topup-thanks]" ? appendedModal : null),
    createElement() {
      const classes = new Set();
      return {
        className: "",
        classList: {
          add(...names) { for (const n of names) classes.add(n); },
          remove(...names) { for (const n of names) classes.delete(n); },
          contains: (n) => classes.has(n),
        },
        setAttribute() {},
        addEventListener() {},
        querySelector: () => ({ textContent: "", addEventListener() {} }),
      };
    },
    addEventListener() {},
  };
  const root = { ownerDocument: doc, querySelectorAll: () => [], matches: () => false };
  const url = "https://buy.stripe.com/test_20?client_reference_id=user_1";
  const resetAt = "2026-11-08T23:40:00.000Z";
  const now = Date.parse("2026-11-09T12:00:00.000Z");
  paintAiUsageMeters(
    { budget: 15000, spent: 5000, held: 2000, remaining: 8000, resetAt, topUpUrl: url },
    root,
    { storage, now }
  );
  assert.equal(appendedModal, null);
  paintAiUsageMeters(
    { budget: 15000, spent: 5500, held: 0, remaining: 9500, resetAt, topUpUrl: url },
    root,
    { storage, now: now + 1000 }
  );
  assert.equal(appendedModal, null);
});

function fakeMeter() {
  const nodes = {
    "[data-ai-usage-figures]": { textContent: "" },
    "[data-ai-usage-meter]": { attrs: {}, setAttribute(name, value) { this.attrs[name] = value; }, getAttribute(name) { return this.attrs[name]; } },
    "[data-ai-usage-fill]": { style: { width: "" } },
    "[data-ai-usage-reset]": { textContent: "", hidden: true, setAttribute() {}, removeAttribute() {} },
    "[data-ai-usage-topup]": { href: "", hidden: true, setAttribute() {}, removeAttribute() {} },
  };
  const classes = new Set();
  return {
    hidden: true,
    classList: {
      add(...names) { for (const name of names) classes.add(name); },
      remove(...names) { for (const name of names) classes.delete(name); },
      has: (name) => classes.has(name),
    },
    setAttribute() {},
    removeAttribute() {},
    querySelector: (sel) => nodes[sel] || null,
  };
}

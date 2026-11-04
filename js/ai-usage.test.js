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
  paintAiUsageMeters,
  refreshAiUsage,
  repaintAiUsage,
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
  });
  assert.equal(empty.tone, "empty");
  assert.equal(empty.pct, 100);
  assert.equal(empty.figures, "15,000 used · 0 left");
  assert.equal(empty.reset, "Resets Nov 13, 2026");
  const ok = usageMeterState({ budget: 15000, spent: 100, held: 0, remaining: 14900 });
  assert.equal(ok.tone, "ok");
  assert.equal(ok.pct, 1);
  const boundary = usageMeterState({ budget: 15000, spent: 11999, held: 0, remaining: 3001 });
  assert.equal(boundary.tone, "ok");
  assert.equal(boundary.pct, 80);
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
    { budget: 15000, spent: 15000, held: 0, remaining: 0, periodEnd: "2026-11-13T23:23:17.295Z" },
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
  paintAiUsageMeters(null, root);
  assert.equal(meter.hidden, true);
  assert.equal(meter.querySelector("[data-ai-usage-figures]").textContent, "");
  assert.match(aiUsageMarkup(), /data-ai-usage/);
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

function fakeMeter() {
  const nodes = {
    "[data-ai-usage-figures]": { textContent: "" },
    "[data-ai-usage-meter]": { attrs: {}, setAttribute(name, value) { this.attrs[name] = value; }, getAttribute(name) { return this.attrs[name]; } },
    "[data-ai-usage-fill]": { style: { width: "" } },
    "[data-ai-usage-reset]": { textContent: "", hidden: true, setAttribute() {}, removeAttribute() {} },
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

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

/**
 * Player-facing Cloud AI usage meter.
 * The browser cannot import js/server/ai-quota.mjs (it uses node:crypto).
 * Numbers come from /api/me `usage`. Null hides every meter.
 */

const TONES = ["is-ok", "is-low", "is-empty"];

/** Last payload painted. A meter mounted later can repaint from this. */
let latestRaw;
let hasLatest = false;

/**
 * @param {unknown} raw
 * @returns {{ budget: number, spent: number, held: number, remaining: number, used: number, pct: number, tone: "ok"|"low"|"empty", figures: string, reset: string }|null}
 */
export function usageMeterState(raw) {
  if (!raw || typeof raw !== "object") return null;
  const budget = nonNeg(raw.budget);
  const spent = nonNeg(raw.spent);
  const held = nonNeg(raw.held);
  if (budget === null || spent === null || held === null) return null;
  const stated = nonNeg(raw.remaining);
  const remaining = stated === null ? Math.max(0, budget - spent - held) : stated;
  const used = spent + held;
  const ratio = budget > 0 ? used / budget : (used > 0 ? 1 : 0);
  const pct = Math.min(100, Math.max(0, Math.round(ratio * 100)));
  const tone = remaining <= 0 ? "empty" : ratio >= 0.8 ? "low" : "ok";
  return {
    budget,
    spent,
    held,
    remaining,
    used,
    pct,
    tone,
    figures: `${groupPoints(used)} used · ${groupPoints(remaining)} left`,
    reset: usageResetLabel(raw.periodEnd),
  };
}

/**
 * @param {unknown} periodEnd
 */
export function usageResetLabel(periodEnd) {
  if (!periodEnd) return "";
  const d = new Date(periodEnd);
  if (!Number.isFinite(d.getTime())) return "";
  const when = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
  return `Resets ${when}`;
}

export function aiUsageMarkup() {
  return `<div class="ai-usage" data-ai-usage hidden>
  <div class="ai-usage-row">
    <span class="ai-usage-label">AI usage</span>
    <span class="ai-usage-figures" data-ai-usage-figures></span>
  </div>
  <div class="ai-usage-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" data-ai-usage-meter>
    <span data-ai-usage-fill></span>
  </div>
  <p class="ai-usage-reset" data-ai-usage-reset hidden></p>
</div>`;
}

/**
 * Paint every [data-ai-usage] under root. A null usage hides them.
 * @param {unknown} raw
 * @param {ParentNode} [root]
 */
export function paintAiUsageMeters(raw, root = globalThis.document) {
  latestRaw = raw;
  hasLatest = true;
  const state = usageMeterState(raw);
  if (!root || typeof root.querySelectorAll !== "function") return state;
  const nodes = [];
  if (typeof root.matches === "function" && root.matches("[data-ai-usage]")) nodes.push(root);
  for (const node of root.querySelectorAll("[data-ai-usage]")) {
    if (!nodes.includes(node)) nodes.push(node);
  }
  for (const el of nodes) paintOne(el, state);
  return state;
}

/** Paint a meter that was added after the last account read. */
export function repaintAiUsage(root) {
  if (!hasLatest) return null;
  return paintAiUsageMeters(latestRaw, root);
}

/**
 * Refresh from /api/me. A failed fetch leaves the current meters alone.
 * A signed-out or non-Cloud account hides them.
 * @param {(url: string, init?: RequestInit) => Promise<Response>} fetchImpl
 * @param {ParentNode} [root]
 */
export async function refreshAiUsage(fetchImpl, root) {
  if (typeof fetchImpl !== "function") return null;
  try {
    const res = await fetchImpl("/api/me", { signal: AbortSignal.timeout(10000) });
    if (!res?.ok) return null;
    const account = await res.json();
    if (account?.ok !== true || account?.signedIn !== true) {
      paintAiUsageMeters(null, root);
      return null;
    }
    return paintAiUsageMeters(account.usage ?? null, root);
  } catch {
    return null;
  }
}

function paintOne(el, state) {
  el.classList?.remove?.(...TONES);
  const figures = el.querySelector?.("[data-ai-usage-figures]");
  const meter = el.querySelector?.("[data-ai-usage-meter]");
  const fill = el.querySelector?.("[data-ai-usage-fill]");
  const reset = el.querySelector?.("[data-ai-usage-reset]");
  if (!state) {
    setHidden(el, true);
    if (figures) figures.textContent = "";
    if (fill?.style) fill.style.width = "0";
    if (reset) {
      setHidden(reset, true);
      reset.textContent = "";
    }
    return;
  }
  setHidden(el, false);
  el.classList?.add?.(`is-${state.tone}`);
  if (figures) figures.textContent = state.figures;
  if (meter?.setAttribute) {
    meter.setAttribute("aria-valuenow", String(state.pct));
    meter.setAttribute("aria-valuemin", "0");
    meter.setAttribute("aria-valuemax", "100");
    meter.setAttribute("aria-valuetext", state.figures);
    meter.setAttribute("aria-label", "AI usage");
  }
  if (fill?.style) fill.style.width = `${state.pct}%`;
  if (reset) {
    setHidden(reset, !state.reset);
    reset.textContent = state.reset;
  }
}

function setHidden(el, hidden) {
  if (!el) return;
  el.hidden = hidden;
  if (typeof el.setAttribute !== "function") return;
  if (hidden) el.setAttribute("hidden", "");
  else el.removeAttribute("hidden");
}

function nonNeg(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

function groupPoints(n) {
  return Math.floor(n).toLocaleString("en-US");
}

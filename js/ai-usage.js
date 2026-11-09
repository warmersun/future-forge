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
const SNAPSHOT_PREFIX = "ff-ai-usage-snapshot:";
const ACK_PREFIX = "ff-ai-topup-ack:";
const PENDING_KEY = "ff-ai-topup-pending";
const RECENT_RESET_WINDOW_MS = 5 * 60 * 1000;
const PENDING_TTL_MS = 24 * 60 * 60 * 1000;

/** Last payload painted. A meter mounted later can repaint from this. */
let latestRaw;
let hasLatest = false;

/**
 * @param {unknown} raw
 * @returns {{ budget: number, spent: number, held: number, remaining: number, used: number, pct: number, tone: "ok"|"low"|"empty", figures: string, reset: string, resetAt: string, topUpUrl: string, topUpLabel: string }|null}
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
  const tone = remaining <= 0 || ratio > 0.95 ? "empty" : ratio > 0.75 ? "low" : "ok";
  const topUpUrl = safeTopUpUrl(raw.topUpUrl);
  const resetAt = validIso(raw.resetAt);
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
    resetAt,
    topUpUrl,
    topUpLabel: "Reset usage · $20 for 15,000 points",
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
  <a class="ai-usage-topup" data-ai-usage-topup href="" hidden>Reset usage · $20 for 15,000 points</a>
</div>`;
}

/**
 * Paint every [data-ai-usage] under root. A null usage hides them.
 * @param {unknown} raw
 * @param {ParentNode} [root]
 */
export function paintAiUsageMeters(raw, root = globalThis.document, opts = {}) {
  latestRaw = raw;
  hasLatest = true;
  const state = usageMeterState(raw);
  if (state && !opts.repaintOnly) {
    checkAndNotifyTopUpReset(state, root, opts);
  }
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
  return paintAiUsageMeters(latestRaw, root, { repaintOnly: true });
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
  const topup = el.querySelector?.("[data-ai-usage-topup]");
  if (!state) {
    setHidden(el, true);
    if (figures) figures.textContent = "";
    if (fill?.style) fill.style.width = "0";
    if (reset) {
      setHidden(reset, true);
      reset.textContent = "";
    }
    if (topup) {
      setHidden(topup, true);
      topup.removeAttribute?.("href");
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
  if (topup) {
    setHidden(topup, !state.topUpUrl);
    if (state.topUpUrl) {
      topup.setAttribute?.("href", state.topUpUrl);
      if ("href" in topup) topup.href = state.topUpUrl;
      topup.textContent = state.topUpLabel;
      bindTopUpClick(topup);
    } else {
      topup.removeAttribute?.("href");
    }
  }
}

function bindTopUpClick(el) {
  if (!el || el._ffTopUpBound || typeof el.addEventListener !== "function") return;
  el._ffTopUpBound = true;
  el.addEventListener("click", () => {
    const state = usageMeterState(latestRaw);
    if (state) markTopUpPending(state);
  });
}

export function markTopUpPending(state, storage = defaultStorage()) {
  if (!state || !storage) return;
  try {
    const userKey = userKeyFromTopUpUrl(state.topUpUrl);
    storage.setItem(
      PENDING_KEY,
      JSON.stringify({
        userKey,
        remaining: state.remaining,
        budget: state.budget,
        spent: state.spent,
        resetAt: state.resetAt || "",
        at: Date.now(),
      })
    );
  } catch {
    /* ignore storage quota/privacy errors */
  }
}

export function hasTopUpPending(storage = defaultStorage(), now = Date.now()) {
  if (!storage) return false;
  try {
    const raw = storage.getItem(PENDING_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Boolean(parsed && Number.isFinite(parsed.at) && now - parsed.at <= PENDING_TTL_MS);
  } catch {
    return false;
  }
}

function resetAtAdvanced(state, baseline) {
  if (!state?.resetAt) return false;
  const nextMs = Date.parse(state.resetAt);
  if (!Number.isFinite(nextMs)) return false;
  const prevRaw = baseline?.resetAt || "";
  if (!prevRaw) return true;
  if (prevRaw === state.resetAt) return false;
  const prevMs = Date.parse(prevRaw);
  return Number.isFinite(prevMs) && nextMs > prevMs;
}

export function didTopUpReset(state, prev, pending, ackedResetAt = "", now = Date.now()) {
  if (!state || state.remaining <= 0) return false;
  if (state.resetAt && ackedResetAt && state.resetAt === ackedResetAt) return false;
  const userKey = userKeyFromTopUpUrl(state.topUpUrl);
  const activePending =
    pending &&
    pending.userKey === userKey &&
    Number.isFinite(pending.at) &&
    now - pending.at <= PENDING_TTL_MS
      ? pending
      : null;
  // A hold release raises remaining and leaves resetAt alone. Only a newer resetAt is a paid top-up.
  const baseline = activePending || prev;
  if (baseline && typeof baseline === "object") return resetAtAdvanced(state, baseline);
  if (!state.resetAt) return false;
  const resetMs = Date.parse(state.resetAt);
  return Number.isFinite(resetMs) && now >= resetMs && now - resetMs <= RECENT_RESET_WINDOW_MS;
}

function checkAndNotifyTopUpReset(state, root, opts = {}) {
  const storage = opts.storage ?? defaultStorage();
  const now = opts.now ?? Date.now();
  if (!storage) return false;
  const userKey = userKeyFromTopUpUrl(state.topUpUrl);
  const snapKey = `${SNAPSHOT_PREFIX}${userKey}`;
  const ackKey = `${ACK_PREFIX}${userKey}`;
  let prev = null;
  let pending = null;
  let acked = "";
  try {
    const rawPrev = storage.getItem(snapKey);
    if (rawPrev) prev = JSON.parse(rawPrev);
    const rawPending = storage.getItem(PENDING_KEY);
    if (rawPending) pending = JSON.parse(rawPending);
    acked = storage.getItem(ackKey) || "";
  } catch {
    /* ignore */
  }
  const triggered = didTopUpReset(state, prev, pending, acked, now);
  try {
    storage.setItem(
      snapKey,
      JSON.stringify({
        remaining: state.remaining,
        budget: state.budget,
        spent: state.spent,
        resetAt: state.resetAt || "",
      })
    );
    if (triggered) {
      storage.setItem(ackKey, state.resetAt || String(now));
      storage.removeItem(PENDING_KEY);
    }
  } catch {
    /* ignore */
  }
  if (triggered) {
    showTopUpThankYouModal(state, root);
  }
  return triggered;
}

export function showTopUpThankYouModal(state, root = globalThis.document) {
  const doc =
    root?.ownerDocument ||
    (root?.nodeType === 9 ? root : null) ||
    (typeof root?.createElement === "function" ? root : globalThis.document);
  if (!doc || typeof doc.createElement !== "function" || !doc.body) return null;
  let backdrop = doc.querySelector?.("[data-ai-topup-thanks]");
  if (!backdrop) {
    backdrop = doc.createElement("div");
    backdrop.className = "modal-backdrop ai-topup-thanks-backdrop";
    backdrop.setAttribute("data-ai-topup-thanks", "");
    backdrop.setAttribute("role", "dialog");
    backdrop.setAttribute("aria-modal", "true");
    backdrop.setAttribute("aria-labelledby", "ai-topup-thanks-title");
    backdrop.innerHTML = `<div class="modal ai-topup-thanks-modal">
  <div class="ai-topup-thanks-badge" aria-hidden="true">✓</div>
  <h3 id="ai-topup-thanks-title">Thank you!</h3>
  <p class="ai-topup-thanks-body" data-ai-topup-thanks-body></p>
  <div class="modal-actions" style="justify-content: center">
    <button type="button" class="btn btn-primary" data-ai-topup-thanks-close>Continue inventing</button>
  </div>
</div>`;
    const close = () => {
      backdrop.classList?.remove?.("open");
      setHidden(backdrop, true);
    };
    backdrop.querySelector?.("[data-ai-topup-thanks-close]")?.addEventListener?.("click", close);
    backdrop.addEventListener?.("click", (e) => {
      if (e?.target === backdrop) close();
    });
    doc.addEventListener?.("keydown", (e) => {
      if (e?.key === "Escape" && backdrop.classList?.contains?.("open")) close();
    });
    doc.body.appendChild(backdrop);
  }
  const body = backdrop.querySelector?.("[data-ai-topup-thanks-body]");
  if (body) {
    const pts = groupPoints(state?.remaining ?? 15000);
    body.textContent = `Your AI usage has been reset. You now have ${pts} points available.`;
  }
  setHidden(backdrop, false);
  backdrop.classList?.add?.("open");
  return backdrop;
}

function userKeyFromTopUpUrl(url) {
  if (!url) return "default";
  try {
    const u = new URL(url);
    return u.searchParams.get("client_reference_id") || "default";
  } catch {
    return "default";
  }
}

function validIso(value) {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  return Number.isFinite(d.getTime()) ? d.toISOString() : "";
}

function defaultStorage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function safeTopUpUrl(value) {
  const raw = String(value || "").trim();
  if (!raw || !/^https?:\/\/\S+$/i.test(raw)) return "";
  return raw;
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

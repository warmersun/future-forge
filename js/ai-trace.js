/**
 * Ring buffer of /api/co-invent exchanges for the developer AI inspect pane.
 * DOM-free.
 */

const CAP = 30;

/** @type {Array<object>} */
let entries = [];
let selectedId = null;
let seq = 0;
/** @type {Set<() => void>} */
const listeners = new Set();

function emit() {
  for (const fn of listeners) {
    try {
      fn();
    } catch {
      /* ignore */
    }
  }
}

export function resetAiTrace() {
  entries = [];
  selectedId = null;
  seq = 0;
  emit();
}

export function subscribeAiTrace(fn) {
  if (typeof fn !== "function") return () => {};
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * @param {{
 *   mode?: string,
 *   sent?: object,
 *   received?: object|null,
 *   error?: string|null,
 *   cancelled?: boolean,
 *   ok?: boolean,
 *   ms?: number,
 * }} raw
 */
export function pushAiTrace(raw = {}) {
  seq += 1;
  const mode = String(raw.mode || raw.sent?.mode || "co-invent");
  const entry = {
    id: `ai-${seq}`,
    ts: Date.now(),
    mode,
    sent: raw.sent && typeof raw.sent === "object" ? raw.sent : { mode },
    received: raw.received && typeof raw.received === "object" ? raw.received : null,
    error: raw.error ? String(raw.error) : null,
    cancelled: Boolean(raw.cancelled),
    ok: raw.ok !== false && !raw.error && !raw.cancelled,
    ms: Number.isFinite(Number(raw.ms)) ? Math.max(0, Math.round(Number(raw.ms))) : 0,
    source: String(raw.received?.source || "").slice(0, 40) || null,
  };
  entries = [entry, ...entries].slice(0, CAP);
  selectedId = entry.id;
  emit();
  return entry;
}

export function listAiTrace() {
  return entries.slice();
}

export function selectAiTrace(id) {
  const hit = entries.find((e) => e.id === id);
  selectedId = hit ? hit.id : selectedId;
  emit();
  return hit || null;
}

export function selectedAiTrace() {
  return entries.find((e) => e.id === selectedId) || entries[0] || null;
}

export function formatAiTraceJson(value) {
  try {
    return JSON.stringify(value ?? null, null, 2);
  } catch {
    return String(value);
  }
}

export function aiTraceBadgeLabel(entry) {
  if (!entry) return "";
  const mode = String(entry.mode || "").trim() || "co-invent";
  if (entry.cancelled) return `${mode} · cancelled`;
  if (!entry.ok) return `${mode} · error`;
  return mode;
}

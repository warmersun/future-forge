/**
 * Captain's log — player actions and settled assessments for the Log tab.
 * DOM-free ring buffer. Newest first. Cleared when a quest starts.
 */

import { CRISIS_ROLES, parseCrisisDeltaField } from "./hex/crisis-delta.js";

const CAP = 200;
const KINDS = new Set(["action", "assessment"]);
const TONES = new Set(["green", "yellow", "red", "neutral"]);
const FILTERS = new Set(["all", "action", "assessment"]);

const ROLE_LABEL = {
  local: "Local",
  global: "Global",
  support: "Support",
};

/** @type {Array<object>} */
let entries = [];
let seq = 0;
/** @type {"all"|"action"|"assessment"} */
let filter = "all";
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

function clip(value, max) {
  return String(value ?? "").trim().slice(0, max);
}

function asKind(value) {
  return KINDS.has(value) ? value : "action";
}

function asTone(value) {
  return TONES.has(value) ? value : "neutral";
}

function toneRank(tone) {
  if (tone === "red") return 3;
  if (tone === "yellow") return 2;
  if (tone === "green") return 1;
  return 0;
}

function worstTone(tones) {
  let best = "neutral";
  for (const tone of tones) {
    if (toneRank(tone) > toneRank(best)) best = tone;
  }
  return best;
}

function signedDelta(n) {
  const d = Number(n) || 0;
  if (d > 0) return `+${d}`;
  if (d < 0) return `-${Math.abs(d)}`;
  return "0";
}

function deltaTone(n) {
  const d = Number(n) || 0;
  if (d > 0) return "red";
  if (d < 0) return "green";
  return "neutral";
}

function angleLabel(angle) {
  const raw = String(angle || "concern").replace(/[-_]/g, " ");
  return raw.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function clearCaptainLog() {
  entries = [];
  seq = 0;
  filter = "all";
  emit();
}

export function subscribeCaptainLog(fn) {
  if (typeof fn !== "function") return () => {};
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * @param {"all"|"action"|"assessment"} next
 */
export function setCaptainLogFilter(next) {
  const want = FILTERS.has(next) ? next : "all";
  if (want === filter) return filter;
  filter = want;
  emit();
  return filter;
}

export function captainLogFilter() {
  return filter;
}

export function captainLogFilterCounts() {
  let action = 0;
  let assessment = 0;
  for (const e of entries) {
    if (e.kind === "assessment") assessment += 1;
    else action += 1;
  }
  return { all: entries.length, action, assessment };
}

/**
 * @param {{
 *   kind?: "action"|"assessment",
 *   title?: string,
 *   detail?: string,
 *   tone?: "green"|"yellow"|"red"|"neutral",
 * }} raw
 */
export function appendCaptainLog(raw = {}) {
  seq += 1;
  const entry = {
    id: `log-${seq}`,
    ts: Date.now(),
    kind: asKind(raw.kind),
    title: clip(raw.title, 120) || "Noted",
    detail: clip(raw.detail, 1200),
    tone: asTone(raw.tone),
  };
  entries = [entry, ...entries].slice(0, CAP);
  emit();
  return entry;
}

/**
 * @param {{ filter?: "all"|"action"|"assessment" }} [opts]
 */
export function listCaptainLog(opts = {}) {
  const all = entries.slice();
  const f = opts.filter !== undefined ? opts.filter : filter;
  if (!f || f === "all") return all;
  return all.filter((e) => e.kind === f);
}

/**
 * One log row for a settled pathway score.
 * Crisis lines keep the signed delta beside the stored reason sentence.
 * @param {object} [score]
 * @param {{ keepCrisisDelta?: boolean }} [opts]
 * @returns {{ title: string, detail: string, tone: "green"|"yellow"|"red"|"neutral" }}
 */
export function formatPathwayScoreLog(score = {}, opts = {}) {
  const lines = [];
  const tones = [];
  if (!opts.keepCrisisDelta) {
    for (const role of CRISIS_ROLES) {
      const parsed = parseCrisisDeltaField(score?.crisisDelta?.[role]);
      const reason = clip(score?.crisisReasons?.[role] || parsed.reason, 200);
      const label = ROLE_LABEL[role] || role;
      const signed = signedDelta(parsed.delta);
      lines.push(reason ? `${label} ${signed} — ${reason}` : `${label} ${signed}`);
      tones.push(deltaTone(parsed.delta));
    }
  }
  const concerns =
    score?.concerns && typeof score.concerns === "object" ? score.concerns : {};
  for (const [angle, row] of Object.entries(concerns)) {
    if (!row || typeof row !== "object") continue;
    const level = ["red", "yellow", "green"].includes(row.level) ? row.level : "";
    const reason = clip(row.reason, 200);
    const name = angleLabel(angle);
    const lamp = level || "open";
    lines.push(reason ? `${name} ${lamp} — ${reason}` : `${name} ${lamp}`);
    if (level) tones.push(level);
  }
  return {
    title: "Pathway scored",
    detail: lines.join("\n"),
    tone: worstTone(tones),
  };
}

function joinAnd(parts) {
  const list = parts.filter(Boolean);
  if (list.length <= 1) return list[0] || "";
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  return `${list.slice(0, -1).join(", ")}, and ${list[list.length - 1]}`;
}

/**
 * What a placed tile's pathway is touching.
 * Each row is one continuous invent block and the crisis meters and concerns on it.
 * @param {Array<{ pathway?: string[], crises?: string[], concerns?: string[] }>} rows
 */
export function formatPlacementTouch(rows) {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return "Not touching a pathway yet.";
  return list
    .map((row) => {
      const members = (row?.pathway || []).map((s) => clip(s, 48)).filter(Boolean);
      const applied = [
        ...(row?.crises || []).map((s) => `crisis ${clip(s, 48)}`).filter((s) => s !== "crisis "),
        ...(row?.concerns || []).map((s) => `concern ${clip(s, 48)}`).filter((s) => s !== "concern "),
      ];
      if (!members.length) return "Not touching a pathway yet.";
      const head = `Pathway ${members.join(" · ")}`;
      if (!applied.length) return `${head} — not touching a crisis or concern yet.`;
      return `${head} applied to ${joinAnd(applied)}.`;
    })
    .join("\n");
}

/**
 * @param {string} level
 * @param {string} [reason]
 * @param {string} [subject] tile or claim this timing belongs to
 */
export function formatTimingLog(level, reason, subject) {
  const tone = ["red", "yellow", "green"].includes(level) ? level : "neutral";
  const base = tone === "neutral" ? "Timing" : `Timing ${tone}`;
  const who = clip(subject, 48);
  return {
    title: who ? `${base} · ${who}` : base,
    detail: clip(reason, 400),
    tone,
  };
}

/**
 * @param {string} quality
 * @param {string} [message]
 */
export function formatScrutinyLog(quality, message) {
  const q = quality === "hit" || quality === "glance" || quality === "miss" ? quality : "miss";
  const tone = q === "hit" ? "green" : q === "glance" ? "yellow" : "red";
  return {
    title: `Defense ${q}`,
    detail: clip(message, 400) || "Judged.",
    tone,
  };
}

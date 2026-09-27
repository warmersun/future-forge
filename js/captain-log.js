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

function normalizeLogIdea(value) {
  if (value && typeof value === "object") {
    const text = String(value.text || "").trim();
    const tech = String(value.tech || "").trim();
    if (!text && !tech) return null;
    return { text, tech };
  }
  const text = String(value || "").trim();
  return text ? { text, tech: "" } : null;
}

function clip(value, max) {
  return String(value ?? "").trim().slice(0, max);
}

/**
 * Shorten on a word boundary and mark the cut with `...`.
 * A single overlong word is cut in place so the mark still fits.
 * @param {unknown} value
 * @param {number} max
 */
export function clipWords(value, max) {
  const text = String(value ?? "").trim().replace(/\s+/g, " ");
  if (text.length <= max) return text;
  const budget = Math.max(1, max - 3);
  let cut = text.slice(0, budget);
  const space = cut.lastIndexOf(" ");
  if (space > 0) cut = cut.slice(0, space);
  return `${cut.trimEnd()}...`;
}

/**
 * A name already sliced to `max` with no mark (the old 40-character tile title)
 * is broken on the last word and marked. Shorter names are left alone.
 * @param {unknown} name
 * @param {number} [max]
 */
export function ellipsisCappedName(name, max = 40) {
  const text = String(name ?? "").trim();
  if (!text || text.endsWith("...")) return text;
  if (text.length < max) return text;
  if (text.length === max) return clipWords(`${text} more`, max);
  return clipWords(text, max);
}

/**
 * If the title is only a cut-down copy of the description, use the full description.
 * A distinct title (not a prefix of the description) is kept.
 * @param {unknown} title
 * @param {unknown} description
 */
export function ideaIdentityText(title, description) {
  const how = String(description ?? "").trim().replace(/\s+/g, " ");
  const name = String(title ?? "").trim().replace(/\s+/g, " ");
  if (!name) return how || "Idea";
  if (!how) return name;
  const bare = name.replace(/\.\.\.$/, "").trim();
  if (!bare) return how;
  if (how === bare || how.startsWith(bare)) return how;
  return name;
}

/**
 * Log titles that embed a hard-capped tile name ("Minted …", "Placed …").
 * @param {unknown} title
 */
export function visibleLogTitle(title) {
  const text = String(title ?? "");
  const m = /^(Minted|Placed|Lifted|Threw away) (.+)$/.exec(text);
  if (!m) return text;
  return `${m[1]} ${ellipsisCappedName(m[2])}`;
}

/**
 * Same capped tile name, when it was copied into the detail sentence.
 * @param {unknown} title
 * @param {unknown} detail
 */
export function visibleLogDetail(title, detail) {
  const text = String(detail ?? "");
  const m = /^(Minted|Placed|Lifted|Threw away) (.+)$/.exec(String(title ?? ""));
  if (!m || !text) return text;
  const shown = ellipsisCappedName(m[2]);
  if (shown === m[2]) return text;
  return text.split(m[2]).join(shown);
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
    title: clipWords(raw.title, 120) || "Noted",
    detail: clip(raw.detail, 8000),
    description: clip(raw.description, 8000),
    partOf: Boolean(raw.partOf),
    names: Array.isArray(raw.names)
      ? raw.names.map((n) => String(n || "").trim()).filter(Boolean).slice(0, 12)
      : [],
    ideas: Array.isArray(raw.ideas)
      ? raw.ideas.map(normalizeLogIdea).filter(Boolean).slice(0, 12)
      : [],
    concern: clip(raw.concern, 4000),
    reply: clip(raw.reply, 4000),
    tone: asTone(raw.tone),
  };
  entries = [entry, ...entries].slice(0, CAP);
  emit();
  return entry;
}

/**
 * Store order is newest first. Pass order "chrono" for earliest first.
 * @param {{ filter?: "all"|"action"|"assessment", order?: "newest"|"chrono" }} [opts]
 */
export function listCaptainLog(opts = {}) {
  const all = entries.slice();
  const f = opts.filter !== undefined ? opts.filter : filter;
  const rows = !f || f === "all" ? all : all.filter((e) => e.kind === f);
  if (opts.order === "chrono") return rows.slice().reverse();
  return rows;
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
 * Crisis meters and concerns a placement touches, without naming the pathway.
 * @param {string[]} [crises]
 * @param {string[]} [concerns]
 */
export function formatAppliedTo(crises, concerns) {
  const applied = [
    ...(crises || []).map((s) => `crisis ${String(s || "").trim()}`).filter((s) => s !== "crisis"),
    ...(concerns || []).map((s) => `concern ${String(s || "").trim()}`).filter((s) => s !== "concern"),
  ];
  if (!applied.length) return "";
  return `Applied to ${joinAnd(applied)}.`;
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
      const members = (row?.pathway || []).map((s) => clipWords(s, 48)).filter(Boolean);
      const applied = [
        ...(row?.crises || []).map((s) => `crisis ${clipWords(s, 48)}`).filter((s) => s !== "crisis "),
        ...(row?.concerns || []).map((s) => `concern ${clipWords(s, 48)}`).filter((s) => s !== "concern "),
      ];
      if (!members.length) return "Not touching a pathway yet.";
      const head = `Pathway ${members.join(" · ")}`;
      if (!applied.length) return `${head} — not touching a crisis or concern yet.`;
      return `${head} applied to ${joinAnd(applied)}.`;
    })
    .join("\n");
}

/**
 * Lamp only. The idea or pathway is attached separately, not abbreviated into the title.
 * @param {string} level
 * @param {string} [reason]
 */
export function formatTimingLog(level, reason) {
  const tone = ["red", "yellow", "green"].includes(level) ? level : "neutral";
  const title = tone === "neutral" ? "Timing" : `Timing ${tone}`;
  return {
    title,
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

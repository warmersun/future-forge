/**
 * Quest briefing beats — derive a step-by-step walkthrough from briefMd,
 * or accept optional authored briefBeats. Pure; safe for Node tests and the browser.
 */

import { excerptFromBrief, isSafeHttpUrl, plainTextFromMarkdown } from "./md-lite.js";

export const BRIEF_BEAT_ROLES = [
  "job",
  "place",
  "strain",
  "possible",
  "constraints",
  "other",
];

export const BRIEF_BEAT_CAPS = {
  id: 40,
  title: 60,
  bodyMd: 500,
  imagePrompt: 400,
  imageUrl: 400,
  minAuthored: 3,
  maxBeats: 8,
  maxWords: 120,
};

const ROLE_SET = new Set(BRIEF_BEAT_ROLES);

/** Canonical walkthrough order (story first, invent job last). */
const ROLE_ORDER = ["place", "strain", "possible", "constraints", "other", "job"];

const HEADING_ROLE = {
  "your job": "job",
  "your brief": "job",
  "the place": "place",
  "what's strained": "strain",
  "what just became possible": "possible",
  "a capability that just became more real": "possible",
  constraints: "constraints",
};

/**
 * @param {string|null|undefined} s
 */
export function normalizeBriefHeading(s) {
  return String(s || "")
    .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * @param {string} title
 * @returns {string}
 */
export function roleFromHeading(title) {
  const key = normalizeBriefHeading(title);
  return HEADING_ROLE[key] || "other";
}

/**
 * Player-facing one-liner: what to invent, always visible during the walkthrough.
 * @param {object|null|undefined} mission
 * @param {{ summary?: string }} [opts]
 */
export function jobLineFromMission(mission, opts = {}) {
  const summary = String(opts.summary || mission?.summary || "").trim();
  if (summary) return summary.slice(0, 160);
  const encourage = String(mission?.spotlight?.encourageCopy || "").trim();
  if (encourage) return encourage.slice(0, 160);
  const title = String(opts.title || mission?.title || "").trim();
  if (title) return title.slice(0, 160);
  const scene = String(mission?.scene || "").trim();
  if (scene) return excerptFromBrief(scene, 140);
  return "";
}

/**
 * Authored cartoon still on a beat (`https://…` or bundled `assets/…`).
 * Empty when missing or unsafe — caller may fall back to Imagine / postcard.
 * @param {{ imageUrl?: string }|null|undefined} beat
 */
export function briefBeatAuthoredUrl(beat) {
  const url = String(beat?.imageUrl || "").trim();
  return isSafeBriefImageUrl(url) ? url : "";
}

/**
 * True for tile-safe briefing stills: https, or same-origin `assets/…` images.
 * Rejects data/blob/javascript and path traversal. Does not check the file exists.
 * @param {string|null|undefined} url
 */
export function isSafeBriefImageUrl(url) {
  const u = String(url || "").trim();
  if (!u || u.length > BRIEF_BEAT_CAPS.imageUrl) return false;
  if (/[\s<>"']/.test(u)) return false;
  if (/^(javascript|data|vbscript|blob):/i.test(u)) return false;
  if (isSafeHttpUrl(u)) return true;
  const path = u.startsWith("/") ? u.slice(1) : u;
  if (!path.startsWith("assets/")) return false;
  if (path.includes("..") || path.includes("//") || path.includes("\\")) return false;
  if (!/\.(jpe?g|png|webp)$/i.test(path)) return false;
  return /^assets\/[a-z0-9._/-]+$/i.test(path);
}

/**
 * Fallback still for a beat (no Imagine). Problem postcards live in assets/problems/.
 * @param {{ role?: string, imageUrl?: string }|null|undefined} beat
 * @param {{ globalId?: string }} [opts]
 */
export function briefBeatStillUrl(beat, opts = {}) {
  const authored = briefBeatAuthoredUrl(beat);
  if (authored) return authored;
  const gid = String(opts.globalId || "").trim();
  if (!gid) return "";
  if (!/^[a-z0-9-]+$/i.test(gid)) return "";
  return `assets/problems/${gid}.jpg`;
}

/**
 * Imagine prompt for a briefing beat (idea-image `kind: "brief"`).
 * @param {{ role?: string, bodyMd?: string, title?: string, imagePrompt?: string }|null|undefined} beat
 * @param {{ place?: string }} [opts]
 */
export function briefBeatImagePrompt(beat, opts = {}) {
  const authored = String(beat?.imagePrompt || "").trim();
  if (authored) return authored.slice(0, BRIEF_BEAT_CAPS.imagePrompt);
  const place = String(opts.place || "this place").trim() || "this place";
  const caption = plainTextFromMarkdown(beat?.bodyMd || beat?.title || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
  const role = beat?.role || "place";
  let lead = `Lived scene in ${place}.`;
  if (role === "strain") {
    lead = `Visible human strain and pressure in ${place}.`;
  } else if (role === "possible") {
    lead = `A new local capability appearing in everyday life in ${place}. Not a product shot.`;
  } else if (role === "constraints") {
    lead = `Scarce power, time, or trust as a lived moment in ${place}.`;
  } else if (role === "job") {
    lead = `People in ${place} facing an open design problem. No finished invention, no brochure.`;
  } else if (role === "other") {
    lead = `Documentary still in ${place}.`;
  }
  return `${lead} ${caption}`.trim().slice(0, BRIEF_BEAT_CAPS.imagePrompt);
}

/**
 * Stable /api/idea-image cache id for a briefing beat.
 * @param {{ missionId?: string, beatId?: string, place?: string }} parts
 */
export function briefBeatArtId(parts = {}) {
  const raw = [
    String(parts.missionId || "quest"),
    String(parts.beatId || "beat"),
    String(parts.place || ""),
  ].join("|");
  let h = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `brief-${(h >>> 0).toString(16)}`;
}

/**
 * Prefer authored beats when valid; otherwise derive from briefMd.
 * Invalid authored arrays fail open to derive at runtime (validator fails closed).
 *
 * @param {object|null|undefined} mission
 * @param {{ summary?: string, maxBeats?: number }} [opts]
 * @returns {BriefBeat[]}
 */
export function resolveBriefBeats(mission, opts = {}) {
  const authored = mission?.briefBeats;
  if (Array.isArray(authored) && authored.length) {
    const n = normalizeBriefBeats(authored);
    if (n.ok) return n.beats;
  }
  return deriveBriefBeats(mission?.briefMd || "", {
    summary: opts.summary || mission?.summary || "",
    scene: mission?.scene || "",
    title: opts.title || mission?.title || "",
    maxBeats: opts.maxBeats,
  });
}

/**
 * @typedef {{
 *   id: string,
 *   role: string,
 *   title: string,
 *   bodyMd: string,
 *   imageUrl?: string,
 *   imagePrompt?: string,
 * }} BriefBeat
 */

/**
 * Split a Quest brief into walkthrough beats.
 * @param {string} briefMd
 * @param {{ summary?: string, scene?: string, maxBeats?: number }} [opts]
 * @returns {BriefBeat[]}
 */
export function deriveBriefBeats(briefMd, opts = {}) {
  const md = String(briefMd || "").replace(/\r\n/g, "\n").trim();
  const scene = String(opts.scene || "").replace(/\r\n/g, "\n").trim();
  const maxBeats = clampMaxBeats(opts.maxBeats);
  const summary = String(opts.summary || "").trim();
  const title = String(opts.title || "").trim();

  const source = md || scene;
  if (!source) return [];

  const sections = splitMarkdownSections(source);
  /** @type {Record<string, BriefBeat[]>} */
  const buckets = {
    place: [],
    strain: [],
    possible: [],
    constraints: [],
    other: [],
    job: [],
  };

  for (const section of sections) {
    const role = ROLE_SET.has(section.role) ? section.role : "other";
    const title = section.title || titleForRole(role);
    const chunks = splitBodyChunks(section.body);
    for (const chunk of chunks) {
      buckets[role].push({
        id: "",
        role,
        title,
        bodyMd: chunk,
      });
    }
  }

  if (!buckets.job.length) {
    const jobBody = summary || (title ? `Invent for this place: ${title}.` : "");
    if (jobBody) {
      buckets.job.push({
        id: "",
        role: "job",
        title: "Your job",
        bodyMd: jobBody,
      });
    }
  }

  /** @type {BriefBeat[]} */
  let ordered = [];
  for (const role of ROLE_ORDER) {
    ordered.push(...(buckets[role] || []));
  }

  if (!ordered.length) {
    const jobBody = summary || title;
    if (jobBody) {
      ordered = [
        {
          id: "",
          role: "job",
          title: "Your job",
          bodyMd: jobBody,
        },
      ];
    }
  }

  ordered = mergeToCap(ordered, maxBeats);
  stampIds(ordered);
  return ordered;
}

/**
 * Validate / clamp an authored briefBeats array.
 * @param {unknown} raw
 * @returns {{ ok: true, beats: BriefBeat[] } | { ok: false, details: string[] }}
 */
export function normalizeBriefBeats(raw) {
  const details = [];
  if (!Array.isArray(raw)) {
    return { ok: false, details: ["briefBeats_not_array"] };
  }
  if (raw.length < BRIEF_BEAT_CAPS.minAuthored) {
    details.push("briefBeats_too_few");
  }
  if (raw.length > BRIEF_BEAT_CAPS.maxBeats) {
    details.push("briefBeats_too_many");
  }

  /** @type {BriefBeat[]} */
  const beats = [];
  const seen = new Set();
  const limit = Math.min(raw.length, BRIEF_BEAT_CAPS.maxBeats + 4);

  for (let i = 0; i < limit; i++) {
    const item = raw[i];
    if (!item || typeof item !== "object") {
      details.push(`briefBeat_${i}_not_object`);
      continue;
    }
    const rawId = String(item.id || "").trim();
    if (!rawId) {
      details.push(`briefBeat_${i}_missing_id`);
      continue;
    }
    const id = slugBeatId(rawId, i);
    if (!id) {
      details.push(`briefBeat_${i}_bad_id`);
      continue;
    }
    if (seen.has(id)) {
      details.push(`briefBeat_${i}_duplicate_id`);
      continue;
    }
    seen.add(id);

    const title = String(item.title || "").trim().slice(0, BRIEF_BEAT_CAPS.title);
    if (!title) {
      details.push(`briefBeat_${i}_missing_title`);
      continue;
    }

    const bodyMd = String(item.bodyMd || "").trim();
    if (!bodyMd) {
      details.push(`briefBeat_${i}_missing_body`);
      continue;
    }
    if (bodyMd.length > BRIEF_BEAT_CAPS.bodyMd) {
      details.push(`briefBeat_${i}_body_too_long`);
      continue;
    }
    if (/<script/i.test(bodyMd) || /javascript\s*:/i.test(bodyMd)) {
      details.push(`briefBeat_${i}_unsafe`);
      continue;
    }

    let role = String(item.role || "").trim().toLowerCase();
    if (!role) role = roleFromHeading(title);
    if (!ROLE_SET.has(role)) {
      details.push(`briefBeat_${i}_bad_role`);
      continue;
    }

    /** @type {BriefBeat} */
    const beat = { id, role, title, bodyMd };

    if (item.imageUrl != null && item.imageUrl !== "") {
      if (typeof item.imageUrl !== "string") {
        details.push(`briefBeat_${i}_bad_imageUrl`);
      } else {
        const url = item.imageUrl.trim();
        if (!isSafeBriefImageUrl(url)) {
          details.push(`briefBeat_${i}_bad_imageUrl`);
        } else {
          beat.imageUrl = url;
        }
      }
    }

    if (item.imagePrompt != null && item.imagePrompt !== "") {
      if (typeof item.imagePrompt !== "string") {
        details.push(`briefBeat_${i}_bad_imagePrompt`);
      } else {
        const p = item.imagePrompt.trim().slice(0, BRIEF_BEAT_CAPS.imagePrompt);
        if (p) beat.imagePrompt = p;
      }
    }

    beats.push(beat);
  }

  if (details.length) return { ok: false, details };
  if (beats.length < BRIEF_BEAT_CAPS.minAuthored) {
    return { ok: false, details: ["briefBeats_too_few"] };
  }
  return { ok: true, beats };
}

/**
 * @param {unknown} n
 */
function clampMaxBeats(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return BRIEF_BEAT_CAPS.maxBeats;
  return Math.max(2, Math.min(BRIEF_BEAT_CAPS.maxBeats, Math.round(v)));
}

/**
 * @param {string} role
 */
function titleForRole(role) {
  switch (role) {
    case "job":
      return "Your job";
    case "strain":
      return "What's strained";
    case "possible":
      return "What just became possible";
    case "constraints":
      return "Constraints";
    default:
      return "The place";
  }
}

/**
 * @param {string} md
 * @returns {{ title: string, role: string, body: string }[]}
 */
export function splitMarkdownSections(md) {
  const src = String(md || "").replace(/\r\n/g, "\n");
  if (!src.trim()) return [];
  const lines = src.split("\n");
  /** @type {{ title: string, bodyLines: string[] }[]} */
  const raw = [{ title: "", bodyLines: [] }];
  let current = raw[0];

  for (const line of lines) {
    const heading = /^(#{1,3})\s+(.+)$/.exec(line.trim());
    if (heading) {
      current = { title: heading[2].trim(), bodyLines: [] };
      raw.push(current);
      continue;
    }
    current.bodyLines.push(line);
  }

  /** @type {{ title: string, role: string, body: string }[]} */
  const out = [];
  for (const block of raw) {
    const body = block.bodyLines.join("\n").trim();
    if (!block.title && !body) continue;
    const title = block.title || "The place";
    out.push({
      title,
      role: block.title ? roleFromHeading(block.title) : "place",
      body,
    });
  }
  return out;
}

/**
 * @param {string} body
 * @returns {string[]}
 */
export function splitBodyChunks(body) {
  const src = String(body || "").trim();
  if (!src) return [];
  const parts = src.split(/\n\s*\n/);
  /** @type {string[]} */
  const chunks = [];
  /** @type {string[]} */
  let listBuf = [];

  const flushList = () => {
    if (!listBuf.length) return;
    chunks.push(listBuf.join("\n\n"));
    listBuf = [];
  };

  for (const raw of parts) {
    const p = raw.trim();
    if (!p) continue;
    if (isListBlock(p)) {
      listBuf.push(p);
      continue;
    }
    flushList();
    chunks.push(...splitLongProse(p));
  }
  flushList();
  return chunks.filter(Boolean);
}

/**
 * @param {string} p
 */
function isListBlock(p) {
  const lines = p
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return false;
  return lines.every((l) => /^([-*+]|\d+\.)\s+/.test(l));
}

/**
 * @param {string} p
 * @returns {string[]}
 */
function splitLongProse(p) {
  const sentences = splitSentences(p);
  if (sentences.length < 2) return [p];
  if (wordCount(p) <= BRIEF_BEAT_CAPS.maxWords) {
    return [sentences.join("\n\n")];
  }
  /** @type {string[]} */
  const out = [];
  /** @type {string[]} */
  let buf = [];
  for (const s of sentences) {
    const next = buf.concat(s);
    if (buf.length && wordCount(next.join(" ")) > BRIEF_BEAT_CAPS.maxWords) {
      out.push(buf.join("\n\n"));
      buf = [s];
    } else {
      buf = next;
    }
  }
  if (buf.length) out.push(buf.join("\n\n"));
  return out.length ? out : [p];
}

const ABBREV_END = /\b(?:Mr|Mrs|Ms|Dr|St|vs|Jr|Sr|Prof|p\.m|a\.m|U\.S)\.$/i;

/**
 * Split on sentence end, keeping Mr./Dr./9 p.m. intact.
 * @param {string} text
 * @returns {string[]}
 */
export function splitSentences(text) {
  const flat = String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]*\n[ \t]*/g, " ")
    .replace(/ +/g, " ")
    .trim();
  if (!flat) return [];
  const raw = flat.split(/(?<=[.!?])\s+/).filter(Boolean);
  /** @type {string[]} */
  const out = [];
  let buf = "";
  for (const bit of raw) {
    if (buf && ABBREV_END.test(buf)) {
      buf = `${buf} ${bit}`;
      continue;
    }
    if (buf) out.push(buf);
    buf = bit;
  }
  if (buf) out.push(buf);
  return out;
}

/**
 * Overlay / beat caption: keep punch-line sentences as separate lines.
 * @param {string} bodyMd
 */
export function captionMdFromBeatBody(bodyMd) {
  const src = String(bodyMd || "").replace(/\r\n/g, "\n").trim();
  if (!src) return "";
  const paras = src.split(/\n\s*\n/).filter((p) => p.trim());
  const lines = [];
  for (const para of paras) {
    const sentences = splitSentences(para);
    if (sentences.length) lines.push(...sentences);
    else lines.push(para.trim());
  }
  return lines.join("\n\n");
}

/**
 * @param {string} s
 */
export function wordCount(s) {
  return String(s || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

/**
 * @param {BriefBeat[]} beats
 * @param {number} cap
 */
function mergeToCap(beats, cap) {
  const out = beats.map((b) => ({ ...b }));
  while (out.length > cap) {
    const idx = findMergeIndex(out);
    if (idx < 0 || idx >= out.length - 1) {
      // Last resort: drop from the middle of non-place/non-job
      const drop = out.findIndex(
        (b, i) => i > 0 && i < out.length - 1 && b.role !== "place" && b.role !== "job"
      );
      if (drop < 0) break;
      out.splice(drop, 1);
      continue;
    }
    const a = out[idx];
    const b = out[idx + 1];
    out[idx] = {
      ...a,
      bodyMd: `${a.bodyMd}\n\n${b.bodyMd}`,
    };
    out.splice(idx + 1, 1);
  }
  return out;
}

/**
 * Prefer merging trailing beats of non-story roles first so the place hook
 * stays its own card. Place is merged last (from the end of the place run).
 * @param {BriefBeat[]} out
 */
function findMergeIndex(out) {
  const rank = { job: 0, possible: 1, strain: 2, constraints: 3, other: 4, place: 5 };
  let bestI = -1;
  let bestRank = 99;
  let bestLen = 1;
  let i = 0;
  while (i < out.length) {
    let j = i + 1;
    while (j < out.length && out[j].role === out[i].role) j += 1;
    const len = j - i;
    if (len >= 2) {
      const r = rank[out[i].role] ?? 4;
      if (r < bestRank || (r === bestRank && len >= bestLen)) {
        bestRank = r;
        bestLen = len;
        bestI = j - 2;
      }
    }
    i = j;
  }
  if (bestI >= 0) return bestI;
  if (out.length >= 3 && out[out.length - 1].role === "job") {
    return out.length - 3;
  }
  return out.length - 2;
}

/**
 * @param {BriefBeat[]} beats
 */
function stampIds(beats) {
  /** @type {Record<string, number>} */
  const counts = {};
  for (const b of beats) {
    const role = b.role || "other";
    counts[role] = (counts[role] || 0) + 1;
    b.id = `${role}-${counts[role]}`.slice(0, BRIEF_BEAT_CAPS.id);
  }
}

/**
 * @param {unknown} raw
 * @param {number} i
 */
function slugBeatId(raw, i) {
  const s = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, BRIEF_BEAT_CAPS.id);
  if (s) return s;
  return `beat-${i + 1}`;
}

/**
 * Plain caption for vision blurbs / TTS fallbacks.
 * @param {BriefBeat|null|undefined} beat
 * @param {number} [maxLen]
 */
export function beatPlainExcerpt(beat, maxLen = 90) {
  if (!beat) return "";
  return excerptFromBrief(beat.bodyMd || "", maxLen);
}

/**
 * @param {BriefBeat|null|undefined} beat
 */
export function beatPlainText(beat) {
  if (!beat) return "";
  const title = String(beat.title || "").trim();
  const body = plainTextFromMarkdown(beat.bodyMd || "");
  return [title, body].filter(Boolean).join(". ");
}

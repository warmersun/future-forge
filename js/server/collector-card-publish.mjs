/**
 * Daily collector cards: folder rules, change detection, image checks, and id
 * checks shared by the validator, the CI helper, and the GitHub workflows.
 * Pure functions only. No database, no network.
 */

import path from "node:path";
import { CARD_IMAGE_MAX_BYTES, CARD_IMAGE_EXTS, normalizeCardId } from "./collector-cards.mjs";

/** Cards under this folder are published automatically when they land on main. */
export const DAILY_CARD_DIR = "cards/daily";

/** cards/daily/YYYY-MM-DD-<slug>.json, slug in kebab-case. */
export const DAILY_CARD_NAME_RE =
  /^(\d{4})-(\d{2})-(\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)\.json$/;

/** 16:9 within this relative tolerance (1920x1080, 1792x1008, 1344x768 all pass). */
export const CARD_ASPECT = 16 / 9;
export const CARD_ASPECT_TOLERANCE = 0.02;

const ZERO_SHA_RE = /^0+$/;

/**
 * Repo-relative path with forward slashes.
 * @param {string} p
 */
export function toPosix(p) {
  return String(p || "").split(path.sep).join("/").replace(/^\.\//, "");
}

/**
 * @param {string} relPath repo-relative
 */
export function isDailyCardPath(relPath) {
  const p = toPosix(relPath);
  return p.startsWith(`${DAILY_CARD_DIR}/`) && p.endsWith(".json");
}

/**
 * Daily card file name rule. Returns null when fine, else an error string.
 * @param {string} relPath repo-relative
 */
export function dailyCardNameError(relPath) {
  const p = toPosix(relPath);
  const rest = p.slice(DAILY_CARD_DIR.length + 1);
  if (rest.includes("/")) return "daily_card_in_subfolder: put the card directly in cards/daily/";
  const m = DAILY_CARD_NAME_RE.exec(rest);
  if (!m) return "bad_daily_name: use cards/daily/YYYY-MM-DD-<kebab-slug>.json";
  const [, y, mo, d] = m;
  const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
  if (
    date.getUTCFullYear() !== Number(y) ||
    date.getUTCMonth() !== Number(mo) - 1 ||
    date.getUTCDate() !== Number(d)
  ) {
    return "bad_daily_date: the YYYY-MM-DD prefix is not a real date";
  }
  return null;
}

/**
 * Map one changed file to the card JSON it belongs to. A changed image maps to
 * its sibling JSON (same basename). Anything else maps to null.
 * @param {string} relPath repo-relative
 * @returns {string|null}
 */
export function cardJsonForChangedPath(relPath) {
  const p = toPosix(relPath);
  if (!p.startsWith("cards/")) return null;
  const ext = path.posix.extname(p).toLowerCase();
  if (ext === ".json") return p;
  if (CARD_IMAGE_EXTS.includes(ext)) return `${p.slice(0, -ext.length)}.json`;
  return null;
}

/**
 * Unique, sorted card JSON paths touched by a list of changed files.
 * @param {string[]} changedPaths repo-relative
 * @param {{ scope?: "daily" | "all", exists?: (relPath: string) => boolean }} [opts]
 */
export function selectChangedCards(changedPaths, opts = {}) {
  const scope = opts.scope || "daily";
  const exists = opts.exists || (() => true);
  const out = new Set();
  for (const changed of changedPaths || []) {
    const json = cardJsonForChangedPath(changed);
    if (!json) continue;
    if (scope === "daily" && !isDailyCardPath(json)) continue;
    if (!exists(json)) continue;
    out.add(json);
  }
  return [...out].sort();
}

/**
 * @param {unknown} sha
 */
export function isZeroSha(sha) {
  const s = String(sha || "").trim();
  return !s || ZERO_SHA_RE.test(s);
}

/**
 * Read the type and pixel size from an image header. Supports PNG, JPEG, WebP.
 * @param {Buffer} buf
 * @returns {{ type: string, width: number, height: number } | null}
 */
export function imageInfo(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return null;
  // PNG: signature + IHDR
  if (
    buf.length >= 24 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf.toString("ascii", 12, 16) === "IHDR"
  ) {
    return { type: "image/png", width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  // JPEG: walk markers to the first start-of-frame
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = buf[i + 1];
      if (marker === 0xff) {
        i++;
        continue;
      }
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        i += 2;
        continue;
      }
      const len = buf.readUInt16BE(i + 2);
      const isSof =
        marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSof) {
        return { type: "image/jpeg", height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      }
      if (len < 2) return null;
      i += 2 + len;
    }
    return { type: "image/jpeg", width: 0, height: 0 };
  }
  // WebP: RIFF....WEBP + VP8 / VP8L / VP8X
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP" && buf.length >= 30) {
    const chunk = buf.toString("ascii", 12, 16);
    if (chunk === "VP8 ") {
      return {
        type: "image/webp",
        width: buf.readUInt16LE(26) & 0x3fff,
        height: buf.readUInt16LE(28) & 0x3fff,
      };
    }
    if (chunk === "VP8L") {
      const b = buf.readUInt32LE(21);
      return { type: "image/webp", width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
    }
    if (chunk === "VP8X") {
      return {
        type: "image/webp",
        width: 1 + buf.readUIntLE(24, 3),
        height: 1 + buf.readUIntLE(27, 3),
      };
    }
    return { type: "image/webp", width: 0, height: 0 };
  }
  return null;
}

const EXT_TYPE = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

/**
 * Check a card page image. Daily cards fail on every problem; other cards get
 * the aspect check as a warning only (the shipped examples predate the rule).
 * @param {{ bytes: Buffer, ext: string, strict?: boolean }} input
 * @returns {{ errors: string[], warnings: string[], info: { type: string, width: number, height: number } | null }}
 */
export function checkCardImage({ bytes, ext, strict = false }) {
  const errors = [];
  const warnings = [];
  const e = String(ext || "").toLowerCase();
  const declared = EXT_TYPE[e];
  if (!declared) errors.push("image_type: use .jpg, .jpeg, .png, or .webp");
  const size = Buffer.isBuffer(bytes) ? bytes.length : 0;
  if (!size) errors.push("image_empty");
  if (size > CARD_IMAGE_MAX_BYTES) {
    errors.push(`image_too_large: ${size} bytes, the limit is ${CARD_IMAGE_MAX_BYTES} (1.5 MB)`);
  }
  const info = size ? imageInfo(bytes) : null;
  if (size && !info) errors.push("image_unreadable: not a PNG, JPEG, or WebP file");
  if (info && declared && info.type !== declared) {
    errors.push(`image_type_mismatch: file is ${info.type} but named ${e}`);
  }
  if (info) {
    if (!info.width || !info.height) {
      (strict ? errors : warnings).push("image_size_unknown: could not read width and height");
    } else {
      const ratio = info.width / info.height;
      if (Math.abs(ratio / CARD_ASPECT - 1) > CARD_ASPECT_TOLERANCE) {
        (strict ? errors : warnings).push(
          `image_not_16x9: ${info.width}x${info.height} (ratio ${ratio.toFixed(3)}, want 1.778)`
        );
      }
    }
  }
  return { errors, warnings, info };
}

/**
 * Card ids must be unique across every card file, and a card file that
 * already existed must keep its id.
 * @param {{ path: string, id: string|null }[]} cards every card JSON in the repo at head
 * @param {{ changed?: string[], baseIdOf?: (relPath: string) => string|null|undefined }} [opts]
 *   baseIdOf returns the id stored in the base version, null when the base had
 *   no id, or undefined when the file did not exist in the base.
 * @returns {string[]} problems
 */
export function findCardIdProblems(cards, opts = {}) {
  const problems = [];
  const byId = new Map();
  for (const c of cards) {
    const id = normalizeCardId(c.id);
    if (!id) continue;
    if (!byId.has(id)) byId.set(id, []);
    byId.get(id).push(toPosix(c.path));
  }
  for (const [id, paths] of byId) {
    if (paths.length > 1) {
      problems.push(`duplicate_id ${id}: ${paths.sort().join(", ")} (give each card its own id)`);
    }
  }
  const baseIdOf = opts.baseIdOf;
  if (baseIdOf) {
    const headIds = new Map(cards.map((c) => [toPosix(c.path), normalizeCardId(c.id)]));
    for (const rel of opts.changed || []) {
      const p = toPosix(rel);
      const before = baseIdOf(p);
      if (before === undefined) continue;
      const beforeId = normalizeCardId(before);
      if (!beforeId) continue;
      const now = headIds.get(p) || null;
      if (now !== beforeId) {
        problems.push(
          `id_changed ${p}: was ${beforeId}, now ${now || "missing"} (keep the id; a new id would publish a second card)`
        );
      }
    }
  }
  return problems;
}

/**
 * Engineering words that a stranger on the street will not know. The
 * validator warns (never fails) when one shows up in a card's title,
 * capability, or use cases, so the author glosses it in the same sentence or
 * cuts it. Matching is on whole words; it cannot tell whether a term is
 * already explained, which is why this is a warning and not an error.
 */
export const CARD_JARGON_TERMS = [
  { term: "bandgap", re: /\bband[\s-]?gaps?\b/i },
  { term: "electronvolt", re: /\belectron[\s-]?volts?\b|\d\s*-?\s*eV\b|\beV\b/ },
  { term: "Schottky", re: /\bschottky\b/i },
  { term: "substrate", re: /\bsubstrates?\b/i },
  { term: "epitaxy", re: /\bepitax(?:y|ial)\b/i },
  { term: "doping", re: /\bdop(?:ed|ing|ant|ants)\b/i },
  { term: "p-type / n-type", re: /\b[pn]-type\b/i },
  { term: "diode", re: /\bdiodes?\b/i },
  { term: "transistor", re: /\btransistors?\b/i },
  { term: "sapphire", re: /\bsapphire\b/i },
];

/** Card fields that must pass the stranger test without help from the body. */
export const CARD_JARGON_FIELDS = ["title", "capability", "useCases"];

/**
 * @param {{ title?: string, capability?: string, useCases?: string[] }} card
 * @returns {{ field: string, term: string }[]} one entry per field and term
 */
export function findCardJargon(card) {
  const hits = [];
  for (const field of CARD_JARGON_FIELDS) {
    const raw = card?.[field];
    const text = Array.isArray(raw) ? raw.join("\n") : String(raw || "");
    if (!text) continue;
    for (const { term, re } of CARD_JARGON_TERMS) {
      if (re.test(text)) hits.push({ field, term });
    }
  }
  return hits;
}

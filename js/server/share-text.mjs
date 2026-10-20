/**
 * Text for the collector card share image, drawn as SVG paths.
 *
 * sharp/librsvg in the Neon Function finds no system fonts, so an SVG <text>
 * element renders as empty boxes there. These helpers lay out text with glyph
 * outlines baked into share-glyphs.mjs (Noto Sans Bold, SIL OFL 1.1), so the
 * image looks the same on any host. Regenerate the glyphs with
 * scripts/build-share-glyphs.py.
 */

import { GLYPHS, UNITS_PER_EM } from "./share-glyphs.mjs";

/** Fallbacks for characters the baked glyph set does not cover. */
const SUBSTITUTES = {
  "\u2010": "-", "\u2011": "-", "\u2012": "\u2013", "\u2015": "\u2014", "\u2212": "-",
  "\u201a": "\u2018", "\u201b": "\u2018", "\u201e": "\u201c", "\u201f": "\u201c",
  "\u2032": "'", "\u2033": '"', "\u00ab": '"', "\u00bb": '"', "\u2039": "<", "\u203a": ">",
  "\u2027": "\u00b7", "\u2219": "\u00b7", "\u22c5": "\u00b7",
};

/**
 * Map text onto characters the baked glyph set can draw. Accents are dropped
 * (é → e), close punctuation is swapped in, other whitespace becomes a space,
 * and anything left over becomes "?". The result never contains a character
 * without a glyph.
 * @param {unknown} s
 */
export function shareSafeText(s) {
  let out = "";
  for (const raw of String(s ?? "")) {
    if (GLYPHS[raw]) { out += raw; continue; }
    if (SUBSTITUTES[raw]) { out += SUBSTITUTES[raw]; continue; }
    if (/\s/u.test(raw)) { out += " "; continue; }
    const bare = raw.normalize("NFKD").replace(/\p{M}/gu, "");
    out += bare && [...bare].every((c) => GLYPHS[c]) ? bare : "?";
  }
  return out;
}

/** Characters in `s` that the baked glyph set cannot draw (before mapping). */
export function unsupportedShareChars(s) {
  return [...new Set([...String(s ?? "")].filter((c) => !GLYPHS[c]))];
}

/**
 * Width in pixels of `s` at `size`, with `letterSpacing` px between characters.
 * @param {string} s
 * @param {number} size
 * @param {number} [letterSpacing]
 */
export function shareTextWidth(s, size, letterSpacing = 0) {
  const chars = [...shareSafeText(s)];
  const units = chars.reduce((sum, c) => sum + GLYPHS[c][0], 0);
  return (units * size) / UNITS_PER_EM + letterSpacing * Math.max(chars.length - 1, 0);
}

/**
 * An SVG <g> drawing `s` with its baseline at y. anchor "end" puts the right
 * edge at x, "middle" centres it, "start" (default) starts it at x.
 * @param {string} s
 * @param {{ x: number, y: number, size: number, fill: string, letterSpacing?: number, anchor?: "start"|"middle"|"end" }} opt
 */
export function shareTextSvg(s, opt) {
  const { x, y, size, fill, letterSpacing = 0, anchor = "start" } = opt;
  const chars = [...shareSafeText(s)];
  const width = shareTextWidth(chars.join(""), size, letterSpacing);
  const left = anchor === "end" ? x - width : anchor === "middle" ? x - width / 2 : x;
  const scale = size / UNITS_PER_EM;
  const gap = letterSpacing / scale;
  let pen = 0;
  const paths = [];
  for (const c of chars) {
    const [adv, d] = GLYPHS[c];
    if (d) paths.push(`<path transform="translate(${round(pen)} 0)" d="${d}"/>`);
    pen += adv + gap;
  }
  return `<g fill="${fill}" transform="translate(${round(left)} ${round(y)}) scale(${round(scale, 5)})">${paths.join("")}</g>`;
}

function round(n, places = 2) {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

/**
 * Hex tile label layout — wrap / shrink / ellipsis for pointy-top hex barrel.
 * DOM-free; uses a conservative bold-sans width estimate (no canvas).
 */

const ELLIPSIS = "…";
/** Fraction of hex flat-to-flat width usable for text (inset from rim). */
const WIDTH_FRAC = 0.82;
const FONT_BASE = 0.18;
const FONT_MIN = 0.13;
/** Line height as multiple of font size. */
const LINE_HEIGHT = 1.15;
/** Gap between last text baseline and feasibility bar top (in size units). */
const BAR_GAP = 0.08;

/**
 * Conservative advance width for bold system-ui / sans at 1em.
 * Slightly wide so we prefer wrap/shrink over clipping the hex rim.
 * @param {string} ch
 * @returns {number}
 */
export function charWidthEm(ch) {
  if (!ch) return 0;
  if (ch === " " || ch === "\t") return 0.32;
  if (
    ch === "." ||
    ch === "," ||
    ch === "'" ||
    ch === "’" ||
    ch === ":" ||
    ch === ";"
  ) {
    return 0.32;
  }
  if (ch === "-" || ch === "–" || ch === "—" || ch === "/") return 0.4;
  if (
    ch === "i" ||
    ch === "l" ||
    ch === "I" ||
    ch === "j" ||
    ch === "t" ||
    ch === "f"
  ) {
    return 0.38;
  }
  if (ch === "m" || ch === "w" || ch === "M" || ch === "W") return 0.92;
  if (ch >= "A" && ch <= "Z") return 0.72;
  if (ch === ELLIPSIS || ch === "…") return 0.7;
  return 0.58;
}

/**
 * @param {string} text
 * @param {number} fontSize
 * @returns {number}
 */
export function estimateTextWidth(text, fontSize) {
  let w = 0;
  const s = String(text || "");
  for (let i = 0; i < s.length; i++) w += charWidthEm(s[i]);
  return w * fontSize;
}

/**
 * Max label width inside the pointy-top hex barrel (vertical flats).
 * @param {number} size — hex radius
 * @returns {number}
 */
export function maxLabelWidth(size) {
  return Math.sqrt(3) * size * WIDTH_FRAC;
}

/**
 * Normalize whitespace.
 * @param {string} name
 * @returns {string}
 */
function normalizeName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Split into wrap tokens; allow breaks after hyphens/slashes.
 * @param {string} name
 * @returns {string[]}
 */
function tokenize(name) {
  const raw = normalizeName(name);
  if (!raw) return [];
  /** @type {string[]} */
  const tokens = [];
  for (const word of raw.split(" ")) {
    if (!word) continue;
    const parts = word.split(/(?<=[-–—/])/);
    for (const p of parts) {
      if (p) tokens.push(p);
    }
  }
  return tokens;
}

/**
 * Join token onto a line (no space after hyphen/slash).
 * @param {string} line
 * @param {string} tok
 * @returns {string}
 */
function joinTok(line, tok) {
  if (!line) return tok;
  if (/[-–—/]$/.test(line)) return line + tok;
  return `${line} ${tok}`;
}

/**
 * Greedy wrap into at most `maxLines` lines.
 * Returns leftover tokens if they did not fit.
 * @param {string[]} tokens
 * @param {number} fontSize
 * @param {number} maxW
 * @param {number} maxLines
 * @returns {{ lines: string[], rest: string[] }}
 */
function wrapTokens(tokens, fontSize, maxW, maxLines) {
  /** @type {string[]} */
  const lines = [];
  let cur = "";
  let i = 0;

  while (i < tokens.length && lines.length < maxLines) {
    const tok = tokens[i];
    const joined = joinTok(cur, tok);
    if (!cur || estimateTextWidth(joined, fontSize) <= maxW) {
      cur = joined;
      i += 1;
      continue;
    }
    // Current line full — push and start next
    if (cur) {
      lines.push(cur);
      cur = "";
      // do not advance i; retry tok on next line
      continue;
    }
    // Single token wider than maxW — keep whole token on its own line
    lines.push(tok);
    i += 1;
    cur = "";
  }
  if (cur && lines.length < maxLines) {
    lines.push(cur);
    cur = "";
  }
  // If cur still set, we ran out of lines mid-token-group
  const rest = cur ? [cur, ...tokens.slice(i)] : tokens.slice(i);
  return { lines: lines.length ? lines : [""], rest };
}

/**
 * Ellipsize so the string fits under maxW at fontSize.
 * @param {string} text
 * @param {number} fontSize
 * @param {number} maxW
 * @returns {string}
 */
export function ellipsize(text, fontSize, maxW) {
  const s = String(text || "");
  if (estimateTextWidth(s, fontSize) <= maxW) return s;
  const budget = maxW - estimateTextWidth(ELLIPSIS, fontSize);
  if (budget <= 0) return ELLIPSIS;
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const next = out + s[i];
    if (estimateTextWidth(next, fontSize) > budget) break;
    out = next;
  }
  out = out.replace(/\s+$/, "");
  if (!out) out = s.slice(0, 1);
  return out + ELLIPSIS;
}

/**
 * Try one- or two-line layout at a fixed font size.
 * @param {string} full
 * @param {number} fontSize
 * @param {number} maxW
 * @returns {{ lines: string[], fits: boolean }}
 */
function tryLayout(full, fontSize, maxW) {
  if (estimateTextWidth(full, fontSize) <= maxW) {
    return { lines: [full], fits: true };
  }
  const tokens = tokenize(full);
  const { lines, rest } = wrapTokens(tokens, fontSize, maxW, 2);
  const allFit =
    rest.length === 0 &&
    lines.every((l) => estimateTextWidth(l, fontSize) <= maxW);
  return { lines, fits: allFit };
}

/**
 * Force a fitting two-line (or one-line) layout with ellipsis if needed.
 * @param {string} full
 * @param {number} fontSize
 * @param {number} maxW
 * @returns {{ lines: string[], truncated: boolean }}
 */
function layoutWithEllipsis(full, fontSize, maxW) {
  const tokens = tokenize(full);
  const { lines, rest } = wrapTokens(tokens, fontSize, maxW, 2);
  /** @type {string[]} */
  let out = lines.map((l) =>
    estimateTextWidth(l, fontSize) > maxW ? ellipsize(l, fontSize, maxW) : l
  );
  let truncated = rest.length > 0 || out.some((l) => l.includes(ELLIPSIS));

  if (rest.length > 0) {
    // Append remainder into last line via ellipsis
    const lastIdx = out.length - 1;
    const remainder = rest.reduce((acc, t) => joinTok(acc, t), "");
    const merged = joinTok(out[lastIdx].replace(new RegExp(`${ELLIPSIS}$`), ""), remainder);
    out[lastIdx] = ellipsize(merged, fontSize, maxW);
    truncated = true;
  }

  // Prefer two lines when truncated single line is long
  if (out.length === 1 && truncated && tokenize(full).length > 1) {
    const { lines: two, rest: r2 } = wrapTokens(tokens, fontSize, maxW, 2);
    if (two.length >= 2) {
      out = [
        estimateTextWidth(two[0], fontSize) > maxW
          ? ellipsize(two[0], fontSize, maxW)
          : two[0],
        ellipsize(
          r2.length
            ? joinTok(two[1] || "", r2.reduce((a, t) => joinTok(a, t), ""))
            : two[1] || "",
          fontSize,
          maxW
        ),
      ];
      truncated = true;
    }
  }

  // Final clamp
  out = out.map((l) => ellipsize(l, fontSize, maxW));
  if (!out.length) out = [ELLIPSIS];
  return { lines: out, truncated };
}

/**
 * Layout a hex tile label.
 *
 * @param {string} name
 * @param {{ size?: number, hasBar?: boolean, cy?: number }} [opts]
 * @returns {{
 *   lines: string[],
 *   fontSize: number,
 *   truncated: boolean,
 *   lineYs: number[],
 *   barY: number|null,
 *   maxWidth: number,
 *   strokeWidth: number,
 * }}
 */
export function layoutHexLabel(name, opts = {}) {
  const size = Math.max(1, Number(opts.size) || 100);
  const hasBar = Boolean(opts.hasBar);
  const cy = opts.cy != null ? Number(opts.cy) : 0;
  const maxW = maxLabelWidth(size);
  const full = normalizeName(name);

  const baseFs = Math.max(10, Math.round(size * FONT_BASE));
  const minFs = Math.max(9, Math.round(size * FONT_MIN));

  if (!full) {
    const fontSize = baseFs;
    const y0 = cy + size * 0.06;
    return {
      lines: [""],
      fontSize,
      truncated: false,
      lineYs: [y0],
      barY: hasBar ? y0 + fontSize * 0.35 + size * BAR_GAP : null,
      maxWidth: maxW,
      strokeWidth: Math.max(2, Math.round(fontSize * 0.18 * 10) / 10),
    };
  }

  /** @type {string[]} */
  let lines;
  let fontSize = baseFs;
  let truncated = false;

  const atBase = tryLayout(full, baseFs, maxW);
  if (atBase.fits) {
    lines = atBase.lines;
  } else {
    let fitted = false;
    for (let fs = baseFs - 1; fs >= minFs; fs--) {
      const attempt = tryLayout(full, fs, maxW);
      if (attempt.fits) {
        lines = attempt.lines;
        fontSize = fs;
        fitted = true;
        break;
      }
    }
    if (!fitted) {
      fontSize = minFs;
      const forced = layoutWithEllipsis(full, fontSize, maxW);
      lines = forced.lines;
      truncated = forced.truncated;
    }
  }

  const n = Math.max(1, lines.length);
  const lh = fontSize * LINE_HEIGHT;
  const blockH = lh * (n - 1);
  const blockMid = cy + size * (hasBar ? 0.02 : 0.06);
  const firstBaseline = blockMid - blockH / 2 + fontSize * 0.35;
  /** @type {number[]} */
  const lineYs = [];
  for (let i = 0; i < n; i++) lineYs.push(firstBaseline + i * lh);
  const lastY = lineYs[lineYs.length - 1];
  const barY = hasBar ? lastY + fontSize * 0.35 + size * BAR_GAP : null;

  if (!truncated && lines.some((l) => l.includes(ELLIPSIS))) truncated = true;

  return {
    lines,
    fontSize,
    truncated,
    lineYs,
    barY,
    maxWidth: maxW,
    strokeWidth: Math.max(2, Math.round(fontSize * 0.18 * 10) / 10),
  };
}

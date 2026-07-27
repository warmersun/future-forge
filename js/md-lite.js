/**
 * Safe Markdown subset for Quest briefs.
 * Allows: headings (#–###), paragraphs, **bold**, *italic*, lists, https? links.
 * No raw HTML, images, tables, or scripts.
 */

/**
 * Escape HTML special characters.
 * @param {string} s
 */
export function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Strip markdown-ish markup to plain text (for excerpts / AI).
 * @param {string} md
 */
export function plainTextFromMarkdown(md) {
  return String(md || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param {string} md
 * @param {number} [maxLen=220]
 */
export function excerptFromBrief(md, maxLen = 220) {
  const plain = plainTextFromMarkdown(md);
  if (plain.length <= maxLen) return plain;
  return `${plain.slice(0, Math.max(0, maxLen - 1)).trim()}…`;
}

/**
 * Render a safe HTML string from markdown subset.
 * @param {string} md
 * @returns {string}
 */
export function renderMarkdownSafe(md) {
  const src = String(md || "").replace(/\r\n/g, "\n");
  if (!src.trim()) return "";

  // Strip any raw HTML tags entirely (do not interpret)
  const cleaned = src.replace(/<[^>]*>/g, "");

  const lines = cleaned.split("\n");
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (heading) {
      const level = heading[1].length;
      blocks.push(`<h${level}>${inlineFormat(heading[2])}</h${level}>`);
      i += 1;
      continue;
    }

    if (/^[-*+]\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
        items.push(`<li>${inlineFormat(lines[i].trim().replace(/^[-*+]\s+/, ""))}</li>`);
        i += 1;
      }
      blocks.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(`<li>${inlineFormat(lines[i].trim().replace(/^\d+\.\s+/, ""))}</li>`);
        i += 1;
      }
      blocks.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    // Paragraph: consecutive non-empty non-special lines
    const para = [];
    while (i < lines.length) {
      const t = lines[i].trim();
      if (!t) break;
      if (/^#{1,3}\s+/.test(t) || /^[-*+]\s+/.test(t) || /^\d+\.\s+/.test(t)) break;
      para.push(t);
      i += 1;
    }
    if (para.length) {
      blocks.push(`<p>${inlineFormat(para.join(" "))}</p>`);
    }
  }

  return blocks.join("\n");
}

/**
 * @param {string} text
 */
function inlineFormat(text) {
  let s = escapeHtml(text);

  s = rewriteMarkdownLinks(s);

  // Bold **text**
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // Italic *text* (simple; avoid list markers already handled)
  s = s.replace(/(^|[\s(])\*([^*]+)\*(?=[\s).,!?]|$)/g, "$1<em>$2</em>");

  return s;
}

/**
 * Convert or strip [label](url) with balanced parentheses in the URL.
 * @param {string} s already HTML-escaped text
 */
function rewriteMarkdownLinks(s) {
  let out = "";
  let i = 0;
  while (i < s.length) {
    if (s[i] !== "[") {
      out += s[i];
      i += 1;
      continue;
    }
    const closeLabel = s.indexOf("]", i + 1);
    if (closeLabel < 0 || s[closeLabel + 1] !== "(") {
      out += s[i];
      i += 1;
      continue;
    }
    const label = s.slice(i + 1, closeLabel);
    let j = closeLabel + 2;
    let depth = 1;
    while (j < s.length && depth > 0) {
      if (s[j] === "(") depth += 1;
      else if (s[j] === ")") depth -= 1;
      j += 1;
    }
    if (depth !== 0) {
      out += s[i];
      i += 1;
      continue;
    }
    const url = s.slice(closeLabel + 2, j - 1).trim();
    if (/^https?:\/\//i.test(url) && !/[\s<>"]/.test(url)) {
      const safe = url.replace(/"/g, "%22");
      out += `<a href="${safe}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    } else {
      out += label;
    }
    i = j;
  }
  return out;
}

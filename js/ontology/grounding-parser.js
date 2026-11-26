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
 * Deterministic parse of the 7-heading grounding Markdown chain.
 * No model calls. Keeps general "Unlocks Use Case(s)" distinct from
 * local "Applications" seeds unless Unlocks was omitted/merged.
 */

import { plainTextFromMarkdown } from "../md-lite.js";

const HEADINGS = {
  technology: "technology",
  capabilities: "capabilities",
  trends: "trends",
  milestone: "milestone",
  unlocks: "unlocks",
  applications: "applications",
  limits: "limits",
};

/**
 * @param {string} heading
 * @returns {string|null}
 */
export function groundingHeadingKey(heading) {
  const h = String(heading || "")
    .replace(/^#+\s*/, "")
    .trim()
    .toLowerCase();
  if (h === "technology") return HEADINGS.technology;
  if (h === "capabilities") return HEADINGS.capabilities;
  if (h.startsWith("trends")) return HEADINGS.trends;
  if (h === "milestone" || h === "milestones") return HEADINGS.milestone;
  if (h.startsWith("unlocks")) return HEADINGS.unlocks;
  if (h.startsWith("application")) return HEADINGS.applications;
  if (h.startsWith("honest limits")) return HEADINGS.limits;
  return null;
}

/**
 * @param {string} markdown
 * @returns {Record<string, string>}
 */
export function splitGroundingSections(markdown) {
  const text = String(markdown || "").replace(/\r\n/g, "\n");
  /** @type {Record<string, string>} */
  const out = {};
  let key = "";
  /** @type {string[]} */
  const buf = [];
  const flush = () => {
    if (!key) return;
    out[key] = buf.join("\n").trim();
    buf.length = 0;
  };
  for (const line of text.split("\n")) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) {
      flush();
      key = groundingHeadingKey(m[1]) || "";
      continue;
    }
    if (key) buf.push(line);
  }
  flush();
  return out;
}

/**
 * First tech id token after **emTech:**.
 * @param {string} technologySection
 */
export function parseGroundingTechId(technologySection) {
  const m = String(technologySection || "").match(
    /\*\*emTech:\*\*\s*([a-z0-9][a-z0-9-]*)/i
  );
  return m ? m[1].toLowerCase() : "";
}

/**
 * @param {string} technologySection
 */
export function parseProductCategory(technologySection) {
  const m = String(technologySection || "").match(
    /\*\*Product category:\*\*\s*(.+)$/im
  );
  return m ? m[1].trim().replace(/\.$/, "") : "";
}

/**
 * @param {string} section
 * @returns {string[]}
 */
export function parseUseCaseLines(section) {
  const raw = String(section || "").trim();
  if (!raw) return [];
  /** @type {string[]} */
  const items = [];
  for (const line of raw.split("\n")) {
    const bullet = line.match(/^\s*(?:[-*]|\d+[.)])\s+(.+)$/);
    if (bullet) items.push(bullet[1].trim());
  }
  if (items.length) return items.map(cleanItem).filter(Boolean);
  return raw
    .split(/;\s+|\.\s+(?=[A-Z])/)
    .map(cleanItem)
    .filter((s) => s.length > 8 && !/^invent the local system/i.test(s));
}

function cleanItem(s) {
  return plainTextFromMarkdown(String(s || ""))
    .replace(/\s+/g, " ")
    .replace(/^[-*]\s+/, "")
    .trim()
    .replace(/\.$/, "");
}

/**
 * @param {string} section
 * @returns {number|null}
 */
export function parseMilestoneYear(section) {
  const years = [...String(section || "").matchAll(/\b(20\d{2})\b/g)].map((m) =>
    Number(m[1])
  );
  if (!years.length) return null;
  return years[years.length - 1];
}

function titleFromBlurb(blurb) {
  const text = String(blurb || "").trim();
  const cut = text.split(/[,—–:;]/)[0].trim();
  const words = (cut || text).split(/\s+/).slice(0, 7).join(" ");
  return words.slice(0, 68) || "Unlocked use case";
}

function useCase(id, blurb, world) {
  return {
    id,
    title: titleFromBlurb(blurb),
    blurb: String(blurb || "").slice(0, 280),
    world: world || "bits",
    origin: "quest",
  };
}

/**
 * @param {string} markdown
 * @param {{ techId?: string, world?: string, questYear?: number }} [opts]
 * @returns {{
 *   techId: string,
 *   productCategory: string,
 *   capability: string,
 *   trendSummary: string,
 *   milestones: object[],
 *   applicationHints: string[],
 *   limits: string
 * }}
 */
function clipWords(text, max) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > Math.floor(max * 0.5) ? cut.slice(0, sp) : cut).replace(/[,;:\-–—]+$/, "")}…`;
}

export function parseGrounding(markdown, opts = {}) {
  const sections = splitGroundingSections(markdown);
  const techId =
    String(opts.techId || "").trim() || parseGroundingTechId(sections.technology);
  const world = opts.world === "atoms" || opts.world === "split" ? opts.world : "bits";
  const productCategory = plainTextFromMarkdown(parseProductCategory(sections.technology));
  const capability = clipWords(
    plainTextFromMarkdown([productCategory, sections.capabilities].filter(Boolean).join(" — ")),
    260
  );
  const trendSummary = clipWords(plainTextFromMarkdown(String(sections.trends || "")), 220);
  const limits = plainTextFromMarkdown(String(sections.limits || "")).trim();
  const year =
    parseMilestoneYear(sections.milestone) ||
    (Number.isFinite(Number(opts.questYear)) ? Number(opts.questYear) : 2026);
  const status = year > 2026 ? "predicted" : "reached";

  const unlockLines = parseUseCaseLines(sections.unlocks);
  const applicationHints = parseUseCaseLines(sections.applications);
  const blurbs = unlockLines.length ? unlockLines : applicationHints;

  const milestoneText = plainTextFromMarkdown(String(sections.milestone || ""))
    .replace(/\s+/g, " ")
    .trim();
  if (!techId || (!milestoneText && !blurbs.length)) {
    return {
      techId,
      productCategory,
      capability,
      trendSummary,
      milestones: [],
      applicationHints,
      limits,
    };
  }
  const useCases = (blurbs.length ? blurbs : [milestoneText])
    .slice(0, 4)
    .map((blurb, i) => useCase(`uc-${techId}-quest-${i + 1}`, blurb, world));
  return {
    techId,
    productCategory,
    capability,
    trendSummary,
    applicationHints,
    limits,
    milestones: [
      {
        id: `ms-${techId}-quest-${year}`,
        year,
        label: milestoneText.slice(0, 180) || `${productCategory || techId} milestone`,
        detail: limits.slice(0, 280),
        status,
        origin: "quest",
        useCases,
      },
    ],
  };
}

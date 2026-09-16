/**
 * Learn modal stack order, card HTML, and dock-to-button math.
 * Pure helpers so hex invent can enable Learn for a focused emTech
 * without dragging game.js into unit tests.
 */

import { escapeHtml } from "./md-lite.js";

export const LEARN_WHILE_IDEAS_DELAY_MS = 400;

export const LEARN_WHILE_IDEAS_LEAD =
  "Ideas are generating — read this family while you wait. Learn reopens it anytime.";

/**
 * Tech ids to show in Learn (and to enable the Learn button).
 * Hex invent: focused emTech first, then stacked techs in learnOrder.
 * Otherwise: learnOrder ∩ selectedTechIds (stack only).
 *
 * @param {{
 *   hexInvent?: boolean,
 *   focusedTechId?: string|null,
 *   selectedTechIds?: string[],
 *   learnOrder?: string[],
 * }} [opts]
 * @returns {string[]}
 */
export function learnTechIds({
  hexInvent = false,
  focusedTechId = null,
  selectedTechIds = [],
  learnOrder = [],
} = {}) {
  const selected = Array.isArray(selectedTechIds)
    ? selectedTechIds.filter(Boolean)
    : [];
  const order = Array.isArray(learnOrder) ? learnOrder.filter(Boolean) : [];
  const selectedSet = new Set(selected);

  if (hexInvent) {
    const ids = [];
    const seen = new Set();
    const push = (id) => {
      if (!id || seen.has(id)) return;
      seen.add(id);
      ids.push(id);
    };
    push(focusedTechId);
    for (const id of order) {
      if (selectedSet.has(id)) push(id);
    }
    for (const id of selected) push(id);
    return ids;
  }

  const ids = [];
  const seen = new Set();
  for (const id of order) {
    if (selectedSet.has(id) && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  for (const id of selected) {
    if (!seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

/**
 * Button disabled/title/label from the Learn id list.
 * @param {string[]} ids
 * @param {{ hexInvent?: boolean }} [opts]
 * @returns {{ disabled: boolean, title: string, text: string }}
 */
export function learnButtonMeta(ids, { hexInvent = false } = {}) {
  const n = Array.isArray(ids) ? ids.length : 0;
  if (n === 0) {
    return {
      disabled: true,
      title: hexInvent
        ? "Pick an emTech to learn about it"
        : "Select techs in your stack to learn about them",
      text: "Learn",
    };
  }
  if (n === 1) {
    return {
      disabled: false,
      title: hexInvent
        ? "Learn about this emTech"
        : "Learn about the selected tech",
      text: "Learn",
    };
  }
  return {
    disabled: false,
    title: `Learn about ${n} selected techs (newest first)`,
    text: `Learn (${n})`,
  };
}

/**
 * Translate + scale a modal rect so its center lands on a target rect.
 * @param {DOMRect|{left:number,top:number,width:number,height:number}|null} fromRect
 * @param {DOMRect|{left:number,top:number,width:number,height:number}|null} toRect
 * @returns {{ dx: number, dy: number, scale: number }|null}
 */
export function dockTransform(fromRect, toRect) {
  if (!fromRect || !toRect) return null;
  const fw = Number(fromRect.width) || 0;
  const fh = Number(fromRect.height) || 0;
  const tw = Number(toRect.width) || 0;
  const th = Number(toRect.height) || 0;
  if (fw < 1 || fh < 1) return null;
  const fromCx = Number(fromRect.left) + fw / 2;
  const fromCy = Number(fromRect.top) + fh / 2;
  const toCx = Number(toRect.left) + tw / 2;
  const toCy = Number(toRect.top) + th / 2;
  const dx = toCx - fromCx;
  const dy = toCy - fromCy;
  const byW = tw > 0 ? tw / fw : 0.12;
  const byH = th > 0 ? th / fh : 0.12;
  const scale = Math.max(0.06, Math.min(byW, byH, 0.18));
  return { dx, dy, scale };
}

/** Shipped stills: assets/learn/{techId}/{sectionId}.jpg */
export const LEARN_SECTIONS = [
  {
    id: "family",
    title: "What is this family?",
    shot: "what this emerging-technology family looks like as a human-scale local capability in everyday use",
  },
  {
    id: "now",
    title: "What already works",
    shot: "real current deployments and pilots of this family already working under human oversight",
  },
  {
    id: "curve",
    title: "Where the curve is heading",
    shot: "near-future scale-up of the same family — more common, cheaper, still grounded, not sci-fi",
  },
  {
    id: "invent",
    title: "How to invent with it here",
    shot: "people inventing and adapting this family in a community workshop, clinic, school, or street — hands-on, local",
  },
  {
    id: "watch",
    title: "Watch-outs",
    shot: "an honest, non-gory failure mode or risk of this family in a real place — tension, not disaster porn",
  },
];

/** Inline img onerror — hide the figure, no broken-image chrome. */
export const LEARN_STILL_ONERROR =
  "var f=this.closest('.learn-sec-art');if(f)f.hidden=true;this.removeAttribute('src')";

const LEARN_SLUG = /^[a-z0-9][a-z0-9-]{0,62}$/;

/**
 * Convention path for a Learn-section still.
 * @param {string} techId
 * @param {string} sectionId
 * @returns {string}
 */
export function learnImagePath(techId, sectionId) {
  const id = String(techId || "").trim();
  const sec = String(sectionId || "").trim();
  if (!LEARN_SLUG.test(id) || !LEARN_SLUG.test(sec)) return "";
  return `assets/learn/${id}/${sec}.jpg`;
}

function clipPromptBit(s, max = 220) {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

function groundingForSection(tech, sectionId) {
  const mat = tech?.maturity || {};
  if (sectionId === "family") return tech?.primer || tech?.learn || tech?.summary || "";
  if (sectionId === "now") return mat.now || "";
  if (sectionId === "curve") return mat.near || mat.frontier || "";
  if (sectionId === "invent") return tech?.inventionHint || "";
  if (sectionId === "watch") return tech?.risk || "";
  return "";
}

/**
 * Imagine prompt for a Learn still. Photoreal documentary; no text/logos.
 * @param {{ name?: string, primer?: string, learn?: string, summary?: string, inventionHint?: string, risk?: string, maturity?: { now?: string, near?: string, frontier?: string } }} tech
 * @param {{ id?: string, shot?: string }} section
 */
export function learnImagePrompt(tech, section) {
  const name = String(tech?.name || "emerging technology").trim() || "emerging technology";
  const shot = String(section?.shot || "").trim();
  const ground = clipPromptBit(groundingForSection(tech, section?.id));
  return [
    "Photoreal documentary still for a learning card about emerging technology.",
    "Cinematic 4:3, rich color, human-scale, no readable text, no logos, no watermarks.",
    `Subject: ${name}.`,
    shot ? `Beat: ${shot}.` : "",
    ground ? `Grounding: ${ground}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * One still job per tech × section (for the batch generator + tests).
 * @param {object[]} techs
 * @returns {{ id: string, techId: string, sectionId: string, image: string, prompt: string }[]}
 */
export function learnImageJobs(techs) {
  const list = Array.isArray(techs) ? techs : [];
  const jobs = [];
  for (const t of list) {
    const techId = String(t?.id || "").trim();
    if (!LEARN_SLUG.test(techId)) continue;
    for (const sec of LEARN_SECTIONS) {
      const image = learnImagePath(techId, sec.id);
      if (!image) continue;
      jobs.push({
        id: `${techId}:${sec.id}`,
        techId,
        sectionId: sec.id,
        image,
        prompt: learnImagePrompt(t, sec),
      });
    }
  }
  return jobs;
}

/**
 * One Learn beat: optional still + heading + body.
 * @param {{
 *   id?: string,
 *   title: string,
 *   bodyHtml: string,
 *   imageUrl?: string,
 *   techName?: string,
 * }} opts
 */
export function learnSection({ id, title, bodyHtml, imageUrl, techName } = {}) {
  if (!bodyHtml) return "";
  const secId = String(id || "").trim();
  const heading = String(title || "").trim();
  const url = String(imageUrl || "").trim();
  const name = String(techName || "").trim();
  const alt = [name, heading].filter(Boolean).join(" — ");
  const art = url
    ? `<figure class="learn-sec-art"><img src="${escapeHtml(url)}" alt="${escapeHtml(
        alt
      )}" onerror="${LEARN_STILL_ONERROR}"></figure>`
    : "";
  const dataAttr = secId ? ` data-learn-sec="${escapeHtml(secId)}"` : "";
  return `<section class="learn-sec"${dataAttr}>${art}<div class="learn-sec-copy"><h5>${escapeHtml(
    heading
  )}</h5><div class="learn-sec-body">${bodyHtml}</div></div></section>`;
}

function listHtml(items, extraClass = "") {
  const rows = (Array.isArray(items) ? items : []).filter(Boolean);
  if (!rows.length) return "";
  const cls = extraClass ? `learn-list ${extraClass}` : "learn-list";
  return `<ul class="${cls}">${rows
    .map((u) => `<li>${escapeHtml(u)}</li>`)
    .join("")}</ul>`;
}

/**
 * Full Learn card HTML for one tech family.
 * @param {object|null|undefined} t
 * @param {{ newest?: boolean, year?: number, domainLabel?: string }} [opts]
 */
export function techLearnCardHtml(t, { newest = false, year = 2026, domainLabel = "" } = {}) {
  if (!t) return "";
  const mat = t.maturity || {};
  const soft = Number(t.readyYear) || Number(year) || 2026;
  const y = Number(year) || 2026;
  const domain = domainLabel || t.domain || "";
  const primer =
    t.primer ||
    t.learn ||
    `${t.name} is an emerging-technology family you can invent with for this local mission.`;
  const inventWith =
    t.inventionHint ||
    `Ask how ${t.name} could change what is scarce in this place — then write a concrete local mechanism.`;
  const useNow = (t.useCasesNow || []).filter(Boolean);
  const milestones = (t.milestones || []).filter(Boolean);
  const risks = String(t.risk || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const horizonNote =
    soft > y
      ? `Broader “near” use cases often become more common around <strong>${soft}</strong> — a soft horizon, not a lock. You may invent with this category in <strong>${y}</strong>; feasibility judges whether your <em>how it works</em> over-claims what is possible now.`
      : `Near-scale applications of this family are already in the toolkit in many places by <strong>${y}</strong>. Feasibility still judges your specific claims, not the card.`;

  const badge = newest ? `<span class="learn-newest">Latest select</span>` : "";
  const useList = useNow.length
    ? listHtml(useNow)
    : `<p class="learn-muted">Look for pilots and products that already ship under human oversight.</p>`;
  const mileList = milestones.length ? listHtml(milestones) : "";
  const riskList = risks.length
    ? listHtml(risks, "learn-list-warn")
    : `<p class="learn-muted">Every tool has failure modes — name them in your design.</p>`;

  const bodies = {
    family: `<p>${escapeHtml(primer)}</p>`,
    now: `<p><strong>Now:</strong> ${escapeHtml(
      mat.now || "Real deployments exist in some form today."
    )}</p>
         <p class="learn-subhead">Use cases you can honestly claim this decade</p>
         ${useList}
         ${mileList ? `<p class="learn-subhead">Recent milestones</p>${mileList}` : ""}`,
    curve: `<p><strong>Near:</strong> ${escapeHtml(
      mat.near || "Broader, cheaper, more reliable applications."
    )}</p>
         <p><strong>Frontier (stretch if claimed as routine):</strong> ${escapeHtml(
           mat.frontier || "Transformative default infrastructure everywhere."
         )}</p>
         <p class="learn-horizon">${horizonNote}</p>`,
    invent: `<p>${escapeHtml(inventWith)}</p>
         <p class="learn-muted">Pair with other domains when the local problem needs sensing, power, logistics, or care — not as a checklist.</p>`,
    watch: riskList,
  };

  const sections = LEARN_SECTIONS.map((sec) =>
    learnSection({
      id: sec.id,
      title: sec.title,
      bodyHtml: bodies[sec.id],
      imageUrl: learnImagePath(t.id, sec.id),
      techName: t.name,
    })
  ).join("");

  return `
    <article class="learn-tech-card ${newest ? "is-newest" : ""}" data-tech-id="${escapeHtml(
      t.id
    )}">
      <header class="learn-tech-head">
        <div>
          <h4><span class="learn-tech-icon">${t.icon || ""}</span> ${escapeHtml(t.name)}</h4>
          <p class="learn-tech-meta">${escapeHtml(domain)} · ${escapeHtml(
            t.curve || "emerging"
          )} curve</p>
        </div>
        ${badge}
      </header>
      <p class="learn-tech-summary">${escapeHtml(t.summary)}</p>
      ${sections}
    </article>`;
}

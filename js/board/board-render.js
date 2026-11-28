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
 * Pure HTML renderer + live DOM port-to-port SVG Bezier wire measurer
 * for the 4-lane Visual Ontology Board.
 */

import { CHALLENGE_ANGLES, DOMAINS } from "../data.js";

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const WORLD_META = {
  bits: {
    label: "Bits",
    title: "Bits — digital, software, or information technology",
  },
  atoms: {
    label: "Atoms",
    title: "Atoms — physical matter, energy, or hardware technology",
  },
  split: {
    label: "Bridge",
    title: "Bridge — spans both Bits and Atoms (connects digital and physical worlds)",
  },
  plain: {
    label: "Human",
    title: "Human — people, policy, or local operational step (bridges any world)",
  },
};

const WORLD_SVG_BITS = `<svg class="ontology-world-svg is-bits" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4.5" y="4.5" width="7" height="7" rx="1.3"/><rect x="6.75" y="6.75" width="2.5" height="2.5" rx="0.4" fill="currentColor" stroke="none"/><path d="M6.5 2v2.5M9.5 2v2.5M6.5 11.5V14M9.5 11.5V14M2 6.5h2.5M2 9.5h2.5M11.5 6.5H14M11.5 9.5H14"/></svg>`;

const WORLD_SVG_ATOMS = `<svg class="ontology-world-svg is-atoms" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><circle cx="8" cy="8" r="1.45" fill="currentColor" stroke="none"/><ellipse cx="8" cy="8" rx="6.2" ry="2.5"/><ellipse cx="8" cy="8" rx="6.2" ry="2.5" transform="rotate(60 8 8)"/><ellipse cx="8" cy="8" rx="6.2" ry="2.5" transform="rotate(120 8 8)"/></svg>`;

const WORLD_SVG_LINK = `<svg class="ontology-world-link-svg" viewBox="0 0 12 10" width="10" height="9" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 5h9M3.5 2.8 1.5 5l2 2.2M8.5 2.8 10.5 5l-2 2.2"/></svg>`;

const WORLD_SVG_PLAIN = `<svg class="ontology-world-svg is-plain" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="5.2" r="2.4"/><path d="M3.2 13.8c.4-2.5 2.2-4 4.8-4s4.4 1.5 4.8 4"/></svg>`;

function normalizeWorld(world) {
  if (world === "atoms" || world === "split" || world === "plain") return world;
  return "bits";
}

function worldIconSvg(world) {
  const key = normalizeWorld(world);
  if (key === "atoms") return WORLD_SVG_ATOMS;
  if (key === "split") {
    return `<span class="ontology-world-bridge-pair" aria-hidden="true">${WORLD_SVG_BITS}${WORLD_SVG_LINK}${WORLD_SVG_ATOMS}</span>`;
  }
  if (key === "plain") return WORLD_SVG_PLAIN;
  return WORLD_SVG_BITS;
}

export function worldBadge(world) {
  const key = normalizeWorld(world);
  const meta = WORLD_META[key];
  return `<span class="ontology-world is-${key}" title="${escapeHtml(meta.title)}">${worldIconSvg(key)}<span class="ontology-world-label">${meta.label}</span></span>`;
}

function lampDot(level, pending = false) {
  if (pending) {
    return `<span class="ontology-lamp is-pending" title="Evaluating…"></span>`;
  }
  const lamp = level === "green" || level === "yellow" || level === "red" ? level : "red";
  return `<span class="ontology-lamp is-${lamp}" title="${lamp}"></span>`;
}

function signed(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "";
  if (v > 0) return `+${v}`;
  return String(v);
}

function roleLabel(role) {
  if (role === "local") return "Here & now";
  if (role === "global") return "Root cause";
  if (role === "support") return "Public support";
  return "";
}

function challengerMeta(angle) {
  return (
    CHALLENGE_ANGLES.find((a) => a.id === angle) || {
      id: angle || "stakeholder",
      label: String(angle || "Challenger"),
      subtitle: "Hard question",
      visual: "assets/challengers/stakeholder.jpg",
    }
  );
}

/**
 * Compute the exact upstream + downstream causal chain across all 4 lanes for
 * a selected node (`view.trace`: `{ type, id }`).
 * Returns null if `view.trace` is absent or refers to an item no longer on the board.
 *
 * @param {object} view
 */
export function resolveChainHighlight(view) {
  const trace = view?.trace;
  if (!trace || !trace.type || !trace.id) return null;

  const tracks = Array.isArray(view?.tracks) ? view.tracks : [];
  const useCases = Array.isArray(view?.useCases) ? view.useCases : [];
  const pathways = Array.isArray(view?.pathways) ? view.pathways : [];
  const crises = Array.isArray(view?.crises) ? view.crises : [];
  const wires = Array.isArray(view?.wires) ? view.wires : [];

  const trackById = new Map(tracks.map((t) => [t.techId, t]));
  const ucById = new Map(useCases.map((u) => [u.id, u]));
  const pwById = new Map(pathways.map((p) => [p.id, p]));
  const crisisById = new Map(crises.map((c) => [c.id, c]));
  const wireById = new Map(wires.map((w) => [w.id, w]));

  const msToTrack = new Map();
  const msById = new Map();
  for (const t of tracks) {
    for (const m of t.milestones || []) {
      msToTrack.set(m.id, t.techId);
      msById.set(m.id, m);
    }
  }

  const pwUseCaseIds = (pw) => {
    const out = [];
    for (const ing of pw?.ingredients || []) {
      for (const uid of ing.useCaseIds || []) {
        if (uid) out.push(uid);
      }
    }
    return out;
  };

  const techIds = new Set();
  const milestoneIds = new Set();
  const useCaseIds = new Set();
  const pathwayIds = new Set();
  const wireIds = new Set();
  const crisisIds = new Set();
  const tier1Edges = new Set();
  const tier2Edges = new Set();

  const addUpstreamFromUseCase = (uc) => {
    if (!uc) return;
    useCaseIds.add(uc.id);
    if (uc.techId) techIds.add(uc.techId);
    if (uc.milestoneId) {
      milestoneIds.add(uc.milestoneId);
      tier1Edges.add(`${uc.milestoneId}->${uc.id}`);
      const tId = msToTrack.get(uc.milestoneId);
      if (tId) techIds.add(tId);
    } else if (uc.techId) {
      tier1Edges.add(`tech:${uc.techId}->${uc.id}`);
    }
  };

  const pwDirectTechIds = (pw) => {
    const coveredByUc = new Set();
    for (const ing of pw?.ingredients || []) {
      for (const uid of ing.useCaseIds || []) {
        const uc = ucById.get(uid);
        if (uc?.techId) coveredByUc.add(uc.techId);
      }
    }
    const direct = [];
    const seen = new Set();
    for (const ing of pw?.ingredients || []) {
      if (ing.techId && !coveredByUc.has(ing.techId) && !seen.has(ing.techId)) {
        seen.add(ing.techId);
        direct.push(ing.techId);
      }
    }
    return direct;
  };

  const addUpstreamFromPathway = (pw) => {
    if (!pw) return;
    pathwayIds.add(pw.id);
    for (const ing of pw.ingredients || []) {
      if (ing.techId) techIds.add(ing.techId);
      for (const uid of ing.useCaseIds || []) {
        const uc = ucById.get(uid);
        if (uc) {
          tier2Edges.add(`${uc.id}->${pw.id}`);
          addUpstreamFromUseCase(uc);
        }
      }
    }
    for (const tid of pwDirectTechIds(pw)) {
      techIds.add(tid);
      tier2Edges.add(`tech:${tid}->${pw.id}`);
    }
  };

  const addDownstreamFromPathway = (pwId) => {
    pathwayIds.add(pwId);
    for (const w of wires) {
      if (w.pathwayId === pwId) {
        wireIds.add(w.id);
        if (w.crisisId) crisisIds.add(w.crisisId);
      }
    }
  };

  const addDownstreamFromUseCase = (ucId) => {
    useCaseIds.add(ucId);
    for (const pw of pathways) {
      if (pwUseCaseIds(pw).includes(ucId)) {
        tier2Edges.add(`${ucId}->${pw.id}`);
        addDownstreamFromPathway(pw.id);
      }
    }
  };

  let label = "";

  if (trace.type === "tech") {
    const track = trackById.get(trace.id);
    if (!track) return null;
    label = track.name || track.techId;
    techIds.add(track.techId);
    for (const m of track.milestones || []) {
      if (m.dealt) milestoneIds.add(m.id);
    }
    for (const uc of useCases) {
      if (uc.techId === track.techId || msToTrack.get(uc.milestoneId) === track.techId) {
        addUpstreamFromUseCase(uc);
        addDownstreamFromUseCase(uc.id);
      }
    }
    for (const pw of pathways) {
      if ((pw.ingredients || []).some((ing) => ing.techId === track.techId)) {
        if (pwDirectTechIds(pw).includes(track.techId)) {
          tier2Edges.add(`tech:${track.techId}->${pw.id}`);
        }
        addDownstreamFromPathway(pw.id);
      }
    }
  } else if (trace.type === "milestone") {
    const ms = msById.get(trace.id);
    if (!ms) return null;
    const tId = msToTrack.get(ms.id);
    label = `${ms.year ? `${ms.year} · ` : ""}${ms.label || ms.id}`;
    milestoneIds.add(ms.id);
    if (tId) techIds.add(tId);
    for (const uc of useCases) {
      if (uc.milestoneId === ms.id) {
        tier1Edges.add(`${ms.id}->${uc.id}`);
        addDownstreamFromUseCase(uc.id);
      }
    }
  } else if (trace.type === "usecase") {
    const uc = ucById.get(trace.id);
    if (!uc) return null;
    label = uc.title || uc.id;
    addUpstreamFromUseCase(uc);
    addDownstreamFromUseCase(uc.id);
  } else if (trace.type === "pathway") {
    const pw = pwById.get(trace.id);
    if (!pw) return null;
    label = pw.title || pw.id;
    addUpstreamFromPathway(pw);
    addDownstreamFromPathway(pw.id);
  } else if (trace.type === "crisis") {
    const cr = crisisById.get(trace.id);
    if (!cr) return null;
    label = cr.name || cr.role || cr.id;
    crisisIds.add(cr.id);
    for (const w of wires) {
      if (w.crisisId === cr.id) {
        wireIds.add(w.id);
        const pw = pwById.get(w.pathwayId);
        if (pw) addUpstreamFromPathway(pw);
      }
    }
  } else if (trace.type === "wire") {
    const w = wireById.get(trace.id);
    if (!w) return null;
    const pw = pwById.get(w.pathwayId);
    const cr = crisisById.get(w.crisisId);
    label = `${pw?.title || w.pathwayTitle || "Pathway"} → ${cr?.name || cr?.role || "Crisis"}`;
    wireIds.add(w.id);
    if (w.crisisId) crisisIds.add(w.crisisId);
    if (pw) addUpstreamFromPathway(pw);
  } else {
    return null;
  }

  return {
    type: trace.type,
    id: trace.id,
    label,
    techIds,
    milestoneIds,
    useCaseIds,
    pathwayIds,
    wireIds,
    crisisIds,
    tier1Edges,
    tier2Edges,
  };
}

function chainCardClass(highlight, type, id, idSet) {
  if (!highlight) return "";
  if (highlight.type === type && highlight.id === id) return " is-chain-selected";
  if (idSet?.has(id)) return " is-chain-linked";
  return " is-chain-dim";
}

const PLURAL_TECH_IDS = new Set(["robots", "networks", "self-driving", "drones", "alt-proteins"]);

function clipPhrase(raw, maxLen = 64) {
  const clean = String(raw || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.;,:]+$/, "");
  if (clean.length <= maxLen) return clean;
  const cut = clean.slice(0, maxLen);
  const space = cut.lastIndexOf(" ");
  return `${(space > 14 ? cut.slice(0, space) : cut).replace(/[,;:\-–—]+$/, "")}…`;
}

function joinList(items, limit = 2) {
  const list = items.filter(Boolean);
  if (!list.length) return "";
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  if (list.length <= limit + 1) {
    return `${list.slice(0, -1).join(", ")}, and ${list[list.length - 1]}`;
  }
  const rest = list.length - limit;
  return `${list.slice(0, limit).join(", ")}, and ${rest} more`;
}

/**
 * Turn the highlighted 4-lane causal chain into a plain-English narrative sentence:
 *   "<Tech> reached <milestone>, enabling <use cases>. We build <pathway> to address <crises>."
 * Falls back gracefully for partial chains (unplugged pathways, undealt techs, empty crises, human steps).
 *
 * @param {object|null} highlight
 * @param {object} view
 * @returns {{ html: string, text: string } | null}
 */
export function formatChainSentence(highlight, view) {
  if (!highlight) return null;
  const year = Number(view?.year) || 2026;
  const tracks = Array.isArray(view?.tracks) ? view.tracks : [];
  const useCases = Array.isArray(view?.useCases) ? view.useCases : [];
  const pathways = Array.isArray(view?.pathways) ? view.pathways : [];
  const crises = Array.isArray(view?.crises) ? view.crises : [];

  const chainTechs = tracks.filter((t) => highlight.techIds.has(t.techId));
  const chainMs = [];
  for (const t of tracks) {
    for (const m of t.milestones || []) {
      if (highlight.milestoneIds.has(m.id)) chainMs.push(m);
    }
  }
  const chainUcs = useCases.filter((u) => highlight.useCaseIds.has(u.id));
  const chainPws = pathways.filter((p) => highlight.pathwayIds.has(p.id));
  const chainCrises = crises.filter((c) => highlight.crisisIds.has(c.id));

  const isPluralTech =
    chainTechs.length > 1 ||
    (chainTechs.length === 1 && PLURAL_TECH_IDS.has(chainTechs[0].techId));

  const techHtmlParts = chainTechs.map(
    (t) => `<strong class="trace-tech">${escapeHtml(t.name || t.techId)}</strong>`
  );
  const techTextParts = chainTechs.map((t) => t.name || t.techId);

  const msMax = chainMs.length > 1 ? 38 : 66;
  const msHtmlParts = chainMs.map((m) => {
    const isForecast = m.status !== "reached";
    const early = Number(m.year) > year;
    const clipped = clipPhrase(m.label || m.id, msMax);
    const yrTag =
      m.year && !clipped.includes(String(m.year))
        ? ` (${isForecast ? "~" : ""}${m.year})`
        : "";
    return `<span class="trace-ms${early ? " is-early" : ""}">${escapeHtml(clipped + yrTag)}</span>`;
  });
  const msTextParts = chainMs.map((m) => {
    const isForecast = m.status !== "reached";
    const clipped = clipPhrase(m.label || m.id, msMax);
    const yrTag =
      m.year && !clipped.includes(String(m.year))
        ? ` (${isForecast ? "~" : ""}${m.year})`
        : "";
    return clipped + yrTag;
  });

  const ucMax = chainUcs.length > 1 ? 44 : 84;
  const ucHtmlParts = chainUcs.map(
    (u) => `<span class="trace-uc">${escapeHtml(clipPhrase(u.title || u.id, ucMax))}</span>`
  );
  const ucTextParts = chainUcs.map((u) => clipPhrase(u.title || u.id, ucMax));

  const pwMax = chainPws.length > 1 ? 42 : 72;
  const pwHtmlParts = chainPws.map(
    (p) => `<strong class="trace-pw">${escapeHtml(clipPhrase(p.title || p.id, pwMax))}</strong>`
  );
  const pwTextParts = chainPws.map((p) => clipPhrase(p.title || p.id, pwMax));

  const crHtmlParts = chainCrises.map(
    (c) => `<strong class="trace-crisis">${escapeHtml(c.name || c.role || c.id)}</strong>`
  );
  const crTextParts = chainCrises.map((c) => c.name || c.role || c.id);

  const htmlSentences = [];
  const textSentences = [];
  let techUsedInLead = false;

  // Sentence 1: <emTech> reached <milestone>, enabling <use cases>.
  // When no milestone is in the chain, skip repeating raw capability text:
  //   - with use cases: "<emTech> enable(s) <use cases>."
  //   - tech + pathway only: fold into Sentence 2 ("Using <emTech>, we build <pathway>...")
  //   - tech alone: "<emTech> — tap a milestone (or + Custom) to add use cases."
  if (chainMs.length || chainUcs.length) {
    const subjHtml = techHtmlParts.length
      ? joinList(techHtmlParts, 2)
      : `<strong class="trace-tech">This capability</strong>`;
    const subjText = techTextParts.length ? joinList(techTextParts, 2) : "This capability";
    techUsedInLead = true;

    let s1Html = "";
    let s1Text = "";

    if (chainMs.length) {
      const allAheadForecast = chainMs.every(
        (m) => m.status !== "reached" && Number(m.year) > year
      );
      const verb = allAheadForecast
        ? isPluralTech
          ? "are forecast to reach"
          : "is forecast to reach"
        : "reached";
      s1Html = `${subjHtml} ${verb} ${joinList(msHtmlParts, 2)}`;
      s1Text = `${subjText} ${verb} ${joinList(msTextParts, 2)}`;
      if (chainUcs.length) {
        s1Html += `, enabling ${joinList(ucHtmlParts, 2)}`;
        s1Text += `, enabling ${joinList(ucTextParts, 2)}`;
      }
    } else {
      const verb = isPluralTech ? "enable" : "enables";
      s1Html = `${subjHtml} ${verb} ${joinList(ucHtmlParts, 2)}`;
      s1Text = `${subjText} ${verb} ${joinList(ucTextParts, 2)}`;
    }

    if (!chainPws.length) {
      if (chainUcs.length) {
        s1Html += ` <span class="trace-hint">— ready to build a pathway in Lane 3.</span>`;
        s1Text += " — ready to build a pathway in Lane 3.";
      } else {
        s1Html += ` <span class="trace-hint">— tap a milestone to deal use cases.</span>`;
        s1Text += " — tap a milestone to deal use cases.";
      }
    } else {
      s1Html += ".";
      s1Text += ".";
    }

    htmlSentences.push(s1Html);
    textSentences.push(s1Text);
  } else if (chainTechs.length && !chainPws.length) {
    htmlSentences.push(
      `${joinList(techHtmlParts, 2)} <span class="trace-hint">— tap a milestone (or + Custom) to add use cases.</span>`
    );
    textSentences.push(
      `${joinList(techTextParts, 2)} — tap a milestone (or + Custom) to add use cases.`
    );
    techUsedInLead = true;
  }

  // Sentence 2: We build <pathway> to address <crises>.
  if (chainPws.length) {
    const isHumanOnly = !chainTechs.length && !chainUcs.length;
    const humanTagHtml = isHumanOnly ? ` <span class="trace-hint">(human step)</span>` : "";
    const humanTagText = isHumanOnly ? " (human step)" : "";
    const leadHtml =
      !techUsedInLead && techHtmlParts.length
        ? `Using ${joinList(techHtmlParts, 2)}, we build`
        : "We build";
    const leadText =
      !techUsedInLead && techTextParts.length
        ? `Using ${joinList(techTextParts, 2)}, we build`
        : "We build";
    if (chainCrises.length) {
      htmlSentences.push(
        `${leadHtml} ${joinList(pwHtmlParts, 2)}${humanTagHtml} to address ${joinList(crHtmlParts, 3)}.`
      );
      textSentences.push(
        `${leadText} ${joinList(pwTextParts, 2)}${humanTagText} to address ${joinList(crTextParts, 3)}.`
      );
    } else {
      htmlSentences.push(
        `${leadHtml} ${joinList(pwHtmlParts, 2)}${humanTagHtml} <span class="trace-hint">— plug into a crisis in Lane 4 to address it.</span>`
      );
      textSentences.push(
        `${leadText} ${joinList(pwTextParts, 2)}${humanTagText} — plug into a crisis in Lane 4 to address it.`
      );
    }
  } else if (chainCrises.length) {
    const pluralCr = chainCrises.length > 1;
    htmlSentences.push(
      `${joinList(crHtmlParts, 3)} ${pluralCr ? "have" : "has"} no pathways plugged in yet <span class="trace-hint">— plug a pathway from Lane 3 to address ${pluralCr ? "them" : "it"}.</span>`
    );
    textSentences.push(
      `${joinList(crTextParts, 3)} ${pluralCr ? "have" : "has"} no pathways plugged in yet — plug a pathway from Lane 3 to address ${pluralCr ? "them" : "it"}.`
    );
  }

  if (!htmlSentences.length) {
    return {
      html: `<strong class="trace-pw">${escapeHtml(highlight.label)}</strong>`,
      text: highlight.label,
    };
  }

  return {
    html: htmlSentences.join(" "),
    text: textSentences.join(" "),
  };
}

function renderTraceBar(highlight, view) {
  if (!highlight) return "";
  const sentence = formatChainSentence(highlight, view);
  return `<div class="ontology-trace-bar" role="status" aria-live="polite">
    <span class="ontology-trace-dot" aria-hidden="true"></span>
    <span class="ontology-trace-copy">${sentence.html}</span>
    <button type="button" class="ontology-trace-clear" data-action="clear-trace" title="Show all connections (Esc)">Show all ×</button>
  </div>`;
}

/**
 * Render the complete 4-lane board HTML. Safe in Node (no DOM required).
 * @param {object} view
 */
export function renderOntologyBoard(view) {
  const year = Number(view?.year) || 2026;
  const tracks = Array.isArray(view?.tracks) ? view.tracks : [];
  const useCases = Array.isArray(view?.useCases) ? view.useCases : [];
  const pathways = Array.isArray(view?.pathways) ? view.pathways : [];
  const crises = Array.isArray(view?.crises) ? view.crises : [];
  const wires = Array.isArray(view?.wires) ? view.wires : [];
  const rules = Array.isArray(view?.rules) ? view.rules : [];
  const sparks = Array.isArray(view?.sparks) ? view.sparks : [];
  const catalog = Array.isArray(view?.catalog) ? view.catalog : [];
  const selected = new Set(view?.selectedUseCaseIds || []);
  const collapsedSet = new Set(view?.collapsedCards || []);
  const focusedTechId = view?.focusedTechId || tracks[0]?.techId || "";
  const focusedTechName =
    tracks.find((t) => t.techId === focusedTechId)?.name ||
    catalog.find((t) => t.id === focusedTechId)?.name ||
    "";
  const highlight = resolveChainHighlight(view);

  const ucById = new Map(useCases.map((u) => [u.id, u]));
  const directTechUseCases = new Set(
    useCases.filter((uc) => !uc.milestoneId && uc.techId).map((uc) => uc.techId)
  );
  const directTechPathways = new Set();
  for (const pw of pathways) {
    const coveredByUc = new Set();
    for (const ing of pw.ingredients || []) {
      for (const uid of ing.useCaseIds || []) {
        const uc = ucById.get(uid);
        if (uc?.techId) coveredByUc.add(uc.techId);
      }
    }
    for (const ing of pw.ingredients || []) {
      if (ing.techId && !coveredByUc.has(ing.techId)) {
        directTechPathways.add(ing.techId);
      }
    }
  }

  const techLane = tracks.length
    ? tracks
        .map((track) =>
          renderTrack(
            track,
            year,
            focusedTechId,
            highlight,
            directTechUseCases.has(track.techId) || directTechPathways.has(track.techId),
            collapsedSet.has(`tech:${track.techId}`)
          )
        )
        .join("")
    : `<div class="ontology-empty-card">
        <p class="ontology-empty-title">Start at the left of the chain</p>
        <p class="ontology-empty">Pick an emerging tech to inspect its trend, reached milestones, and future forecasts.</p>
        <button type="button" class="btn btn-primary btn-sm" data-action="toggle-picker">+ Add tech</button>
      </div>`;

  const useLane = useCases.length
    ? useCases.map((uc) => renderUseCase(uc, year, selected.has(uc.id), highlight)).join("")
    : `<div class="ontology-empty-card">
        <p class="ontology-empty-title">Unlock building blocks</p>
        <p class="ontology-empty">Tap any milestone in Lane 1 to deal the general use cases it unlocks.</p>
      </div>`;

  const customTechField =
    tracks.length > 1
      ? `<label class="ontology-custom-tech">
          <span>From tech:</span>
          <select name="techId" class="ontology-trend-select">
            ${tracks
              .map(
                (t) =>
                  `<option value="${escapeHtml(t.techId)}"${t.techId === focusedTechId ? " selected" : ""}>${escapeHtml(t.icon ? `${t.icon} ` : "")}${escapeHtml(t.name)}</option>`
              )
              .join("")}
          </select>
        </label>`
      : focusedTechName
        ? `<div class="ontology-custom-tech"><span>From tech:</span> <strong>${escapeHtml(focusedTechName)}</strong></div>`
        : "";

  const customUseForm = view?.customUseOpen
    ? `<form class="ontology-custom-form" data-action="custom-use">
        ${customTechField}
        <input name="title" class="ontology-input" maxlength="80" placeholder="e.g. Offline syllabus quiz on locked tablets" autocomplete="off" />
        <div class="ontology-inline-actions">
          <button type="submit" class="btn btn-secondary btn-sm">Add use case</button>
          <button type="button" class="btn btn-ghost btn-sm" data-action="toggle-custom-use">Cancel</button>
        </div>
      </form>`
    : "";

  const composerHtml = renderPathwayComposer({
    tracks,
    focusedTechId,
    focusedTechName,
    selectedCount: selected.size,
    createBusy: Boolean(view?.createBusy),
    writeOpen: Boolean(view?.writeOpen),
    draftHow: view?.draftHow || "",
    voiceActive: Boolean(view?.voiceActive),
    voiceSupported: Boolean(view?.voiceSupported),
  });

  const renderPathwayCardForLane = (pw) =>
    renderPathwayCard(pw, crises, wires, {
      enforceWorlds: view?.enforceWorlds !== false,
      editing: view?.editingPathwayId === pw.id,
      focused: view?.focusedPathwayId === pw.id,
      collapsed: collapsedSet.has(`pathway:${pw.id}`),
      highlight,
      ucById,
    });

  const pathwayById = new Map(pathways.map((pw) => [pw.id, pw]));
  const renderedInSparks = new Set();
  const sparksHtml = renderSparksSection({
    sparks,
    sparkSlots: Array.isArray(view?.sparkSlots) ? view.sparkSlots : null,
    createBusy: Boolean(view?.createBusy),
    pathwayById,
    renderedInSparks,
    renderPathway: renderPathwayCardForLane,
  });

  const pathCardsHtml = pathways
    .filter((pw) => !renderedInSparks.has(pw.id))
    .reverse()
    .map(renderPathwayCardForLane)
    .join("");

  const emptyHint =
    !pathways.length && !sparks.length
      ? `<p class="ontology-empty ontology-lane-hint">Ask for ideas on a selected use case—or write your own—then fuse pieces together here.</p>`
      : "";
  const pathLane = `${composerHtml}${sparksHtml}${pathCardsHtml}${emptyHint}`;

  const ruleChips = rules.length
    ? rules
        .map(
          (rule) =>
            `<button type="button" class="ontology-rule" data-action="tool-lobby" title="${escapeHtml(rule.body || rule.label || "Town rule")}">🏛️ ${escapeHtml(rule.label || rule.id || "Rule")}</button>`
        )
        .join("")
    : `<span class="ontology-rule is-empty">No local rules on the books</span>`;

  const problemLane =
    `<div class="ontology-rules" aria-label="Town rules">
      <div class="ontology-rules-head">
        <span class="ontology-rules-kicker">Town rules</span>
        <button type="button" class="ontology-mini-btn" data-action="tool-lobby" title="Lobby a local regulation or policy">+ Lobby</button>
      </div>
      <div class="ontology-rules-chips">${ruleChips}</div>
    </div>` +
    (crises
      .map((c) => renderCrisisCard(c, wires, highlight, collapsedSet.has(`crisis:${c.id}`)))
      .join("") ||
      `<p class="ontology-empty">Crises land here after the briefing.</p>`);

  const picker = view?.pickerOpen
    ? renderPicker(catalog, view?.pickerDomain || "all")
    : "";

  const roadblockModal = view?.openChallenger
    ? renderRoadblockModal(view.openChallenger, Boolean(view?.isTutorial))
    : "";

  const argumentModal = view?.argumentModalOpen
    ? renderArgumentModal(pathways, view?.focusedPathwayId, Boolean(view?.argumentBusy))
    : "";

  const wireRoadblockTokens = renderWireRoadblockTokens(wires, highlight);

  const summonBanner = view?.summoning
    ? (() => {
        const meta = challengerMeta(view.summoning.angle);
        return `<div class="ontology-summon-banner" role="status" aria-live="polite">
          <img class="ontology-summon-avatar" src="${escapeHtml(meta.visual)}" alt="" />
          <span class="ontology-spinner" aria-hidden="true"></span>
          <div class="ontology-summon-copy">
            <strong>${escapeHtml(meta.label)}</strong> is crafting a hard question for your pathway…
          </div>
        </div>`;
      })()
    : "";

  const wb = view?.workbench || { open: false, draftCount: 0 };
  const wbOpen = Boolean(wb.open);
  const wbBadge = wb.draftCount > 0 ? ` <span class="ontology-wb-badge">${wb.draftCount}</span>` : "";

  const lanesBody = wbOpen
    ? `<div class="ontology-lanes is-workbench-open">
        ${renderWorkbenchLeftRail(tracks, useCases, year, selected, wb)}
        ${renderWorkbenchStudio(view, wb, tracks, useCases, pathways, crises, wires, selected, collapsedSet)}
        ${renderWorkbenchRightRail(crises, wires, rules)}
      </div>`
    : `<div class="ontology-lanes">
        <section id="ontology-lane-tech" class="ontology-lane" data-lane="tech" aria-label="Tech and milestones">
          <header class="ontology-lane-head">
            <h2><span class="ontology-lane-num">1</span> Tech &amp; Milestones</h2>
            <button type="button" class="ontology-mini-btn is-accent" id="btn-add-tech" data-action="toggle-picker">+ Add tech</button>
          </header>
          <div class="ontology-lane-body">${techLane}</div>
        </section>
        <section id="ontology-lane-use" class="ontology-lane" data-lane="use" aria-label="Use cases">
          <header class="ontology-lane-head">
            <h2><span class="ontology-lane-num">2</span> Use Cases</h2>
            <button type="button" class="ontology-mini-btn" data-action="toggle-custom-use">+ Custom</button>
          </header>
          <div class="ontology-lane-body">${customUseForm}${useLane}</div>
        </section>
        <section id="ontology-lane-pathway" class="ontology-lane" data-lane="pathway" data-drop="pathway" aria-label="Pathway">
          <header class="ontology-lane-head">
            <div class="ontology-lane-title-row">
              <h2><span class="ontology-lane-num">3</span> Pathway</h2>
              <div class="ontology-lane-head-btns">
                <button type="button" class="ontology-mini-btn is-wb-open" id="btn-open-workbench" data-action="toggle-workbench" title="Expand Lane 3 into the Double-Diamond Innovation Workbench (Convergence Canvas, SIT, SCAMPER)">⤢ Workbench${wbBadge}</button>
                <button type="button" class="ontology-mini-btn" data-action="human-step" title="Add an ordinary human workflow or non-emTech step">+ Human</button>
              </div>
            </div>
          </header>
          <div class="ontology-lane-body">${pathLane}</div>
        </section>
        <section id="ontology-lane-problem" class="ontology-lane" data-lane="problem" data-drop="crisis" aria-label="Problem">
          <header class="ontology-lane-head">
            <h2><span class="ontology-lane-num">4</span> Problem</h2>
          </header>
          <div class="ontology-lane-body">${problemLane}</div>
        </section>
      </div>`;

  const isMultiplayer = Boolean(view?.isMultiplayer);
  const movesEmptySolo = !isMultiplayer && view?.movesLeft === 0;
  const focusedPathway = pathways.find((p) => p.id === view?.focusedPathwayId) || pathways[0] || null;
  const focusedHasRd = Boolean(focusedPathway?.rdBoost);
  const plusOneTitle = isMultiplayer
    ? "Advance your invent +1 year"
    : movesEmptySolo
      ? `Moves used — advance to ${year + 1} to refresh Moves`
      : "Advance +1 year and refresh Moves";

  return `<div class="ontology-topbar">
      <div class="ontology-circuit" role="tablist" aria-label="Lanes">
        <button type="button" class="ontology-step-pill" data-action="jump-lane" data-lane="tech">1 · Tech <span>${tracks.length}</span></button>
        <button type="button" class="ontology-step-pill" data-action="jump-lane" data-lane="use">2 · Use Cases <span>${useCases.length}</span></button>
        <button type="button" class="ontology-step-pill${wbOpen ? " is-active" : ""}" data-action="jump-lane" data-lane="pathway">3 · Pathway <span>${pathways.length}</span></button>
        <button type="button" class="ontology-step-pill" data-action="jump-lane" data-lane="problem">4 · Problem <span>${crises.length}</span></button>
      </div>
      <div class="ontology-calendar" role="group" aria-label="Quest timeline">
        <button type="button" class="ontology-year-badge" data-action="open-year-dialog" title="Inspect world foresight for ${year}">📅 <span class="ontology-year-prefix">QUEST YEAR: </span>${year}</button>
        <button type="button" class="ontology-time-btn${movesEmptySolo ? " is-moves-empty" : ""}" data-action="year-plus" data-years="1" title="${escapeHtml(plusOneTitle)}">${movesEmptySolo ? "+1 yr →" : "+1 yr"}</button>
        <button type="button" class="ontology-time-btn is-jump" data-action="year-plus" data-years="2" title="Look Ahead: inspect capability curves and jump +2 years">+2 yrs</button>
      </div>
      <div class="ontology-toolbar-right">
        ${
          view?.unused?.count > 0 && !wbOpen
            ? `<button type="button" class="ontology-mini-btn is-prune" data-action="prune-unused" title="${escapeHtml(view.unused.tooltip || "Remove unconnected items")}">🧹 Clear unused <span class="ontology-prune-count">${view.unused.count}</span></button>`
            : ""
        }
        <details class="ontology-tools">
          <summary class="ontology-mini-btn">Research &amp; Policy</summary>
          <div class="ontology-tools-menu">
            <button type="button" data-action="tool-rd"${focusedHasRd ? ' disabled title="R&D boost already applied on this pathway"' : ' title="Roll an R&D boost once per pathway"'}>${focusedHasRd ? "✓ R&amp;D boost applied" : "🧪 Roll R&amp;D boost on pathway"}</button>
            <button type="button" data-action="tool-argument">⚖️ File fact-checked argument</button>
            <button type="button" data-action="tool-lobby">🏛️ Lobby local town rule</button>
            <button type="button" data-action="tool-collection">🃏 Collector cards</button>
          </div>
        </details>
        <button type="button" class="ontology-mini-btn" data-action="tool-share">Share puzzle</button>
      </div>
    </div>
    ${summonBanner}
    <div class="ontology-lanes-scroll" data-lanes-scroll>
    <div class="ontology-lanes-stage${highlight && !wbOpen ? " has-chain-highlight" : ""}${wbOpen ? " is-workbench-open" : ""}" data-lanes-stage>
      <svg class="ontology-wires" viewBox="0 0 1000 800" aria-hidden="true">${wbOpen ? "" : renderFallbackWires(wires, pathways, crises, highlight, "base")}</svg>
      <svg class="ontology-wires is-active-layer" viewBox="0 0 1000 800" aria-hidden="true">${wbOpen ? "" : renderFallbackWires(wires, pathways, crises, highlight, "active")}</svg>
      <div class="ontology-wire-tokens" data-wire-tokens>${wbOpen ? "" : wireRoadblockTokens}</div>
      ${lanesBody}
    </div>
    </div>
    ${wbOpen ? "" : renderTraceBar(highlight, view)}
    ${picker}
    ${roadblockModal}
    ${argumentModal}`;
}

function renderQualitativeTimeline(track, milestones, year) {
  const W = 320;
  const H = 68;
  const padL = 22;
  const padR = 22;
  const cy = 40;
  const years = [
    year,
    ...milestones.map((m) => Number(m.year)).filter(Number.isFinite),
  ];
  const minY = Math.min(...years, year - 4);
  const maxY = Math.max(...years, year + 4);
  const span = Math.max(4, maxY - minY);
  const sx = (yr) => padL + ((yr - minY) / span) * (W - padL - padR);
  const nowX = Math.max(padL, Math.min(W - padR, sx(year)));

  const nodes = milestones
    .map((m) => {
      const yr = Number(m.year) || year;
      const cx = sx(yr);
      const isForecast = m.status !== "reached";
      const early = yr > year;
      const stroke = early ? "#fb7185" : isForecast ? "#fbbf24" : "#34d399";
      const fill = isForecast ? "#0c1220" : "#34d399";
      const yrLabel = isForecast ? `~${yr}` : String(yr);
      return `<g class="ontology-qual-dot${m.dealt ? " is-dealt" : ""}" data-action="deal-milestone" data-tech-id="${escapeHtml(track.techId)}" data-milestone-id="${escapeHtml(m.id)}" role="button" tabindex="0">
        <title>${escapeHtml(yrLabel)}: ${escapeHtml(m.label)} — click to deal</title>
        ${m.dealt ? `<circle cx="${cx.toFixed(1)}" cy="${cy}" r="10.5" fill="${stroke}" opacity="0.24"></circle>` : ""}
        <circle cx="${cx.toFixed(1)}" cy="${cy}" r="5.5" fill="${fill}" stroke="${stroke}" stroke-width="2.4"></circle>
        <text x="${cx.toFixed(1)}" y="${cy + 18}" text-anchor="middle" fill="#cbd5e1" font-size="10.5" font-weight="600">${escapeHtml(yrLabel)}</text>
      </g>`;
    })
    .join("");

  const labelX = Math.max(36, Math.min(W - 36, nowX));
  return `<div class="ontology-chart-panel is-qual">
    <p class="ontology-trend-line">📉 ${escapeHtml(track.trendSummary || "Qualitative capability progression")}</p>
    <svg class="ontology-qual-bar" viewBox="0 0 ${W} ${H}" role="img" aria-label="Capability timeline for ${escapeHtml(track.name || track.techId)}">
      <line x1="${padL}" y1="${cy}" x2="${nowX.toFixed(1)}" y2="${cy}" stroke="#34d399" stroke-width="2.8" stroke-linecap="round"></line>
      <line x1="${nowX.toFixed(1)}" y1="${cy}" x2="${W - padR}" y2="${cy}" stroke="#fbbf24" stroke-width="2.2" stroke-dasharray="5 4"></line>
      <line x1="${nowX.toFixed(1)}" y1="16" x2="${nowX.toFixed(1)}" y2="${H - 8}" stroke="#38bdf8" stroke-width="1.6" stroke-dasharray="3 3"></line>
      <text x="${labelX.toFixed(1)}" y="12" text-anchor="middle" fill="#38bdf8" font-size="10.5" font-weight="700">NOW ${year}</text>
      ${nodes}
    </svg>
  </div>`;
}

function renderTimingAssessment(pw) {
  const pct =
    pw.timingPct != null
      ? Math.max(5, Math.min(99, Math.round(pw.timingPct)))
      : pw.timingLevel === "green"
        ? 82
        : pw.timingLevel === "yellow"
          ? 55
          : 22;
  const level = pw.timingLevel || "yellow";
  const barLabel = pw.timingPending
    ? "⏳ Checking year honesty…"
    : level === "green"
      ? `Honest for this year (${pct}%)`
      : level === "yellow"
        ? `Partial stretch (${pct}%)`
        : `Stretch claim (${pct}%)`;
  const reason = !pw.timingPending ? String(pw.timingReason || "").trim() : "";
  return `<div class="ontology-timing-block is-${escapeHtml(level)}">
    <div class="ontology-timing-bar is-${escapeHtml(level)}${pw.timingPending ? " is-pending" : ""}">
      <div class="ontology-timing-fill" style="width:${pct}%"></div>
      <span class="ontology-timing-label">${escapeHtml(barLabel)}</span>
    </div>
    ${reason ? `<p class="ontology-timing-reason">${escapeHtml(reason)}</p>` : ""}
  </div>`;
}

function collapseChevronBtn(key, collapsed, label) {
  return `<button type="button" class="ontology-collapse-btn${collapsed ? " is-collapsed" : ""}" data-action="toggle-card-collapse" data-collapse-key="${escapeHtml(key)}" aria-expanded="${collapsed ? "false" : "true"}" aria-label="${collapsed ? "Expand" : "Collapse"} ${escapeHtml(label)}" title="${collapsed ? "Expand panel" : "Collapse panel"}"><span aria-hidden="true">${collapsed ? "▸" : "▾"}</span></button>`;
}

function renderTrack(
  track,
  year,
  focusedTechId,
  highlight = null,
  hasDirectUseCases = false,
  collapsed = false
) {
  const milestones = Array.isArray(track.milestones) ? track.milestones : [];
  const inPlay = milestones.filter((m) => Number(m.year) <= year);
  const ahead = milestones.filter((m) => Number(m.year) > year);
  const latestReachedId =
    [...inPlay].reverse().find((m) => m.status === "reached")?.id ||
    inPlay.at(-1)?.id ||
    null;
  const isFocused = track.techId === focusedTechId;
  const trackChainCls = chainCardClass(highlight, "tech", track.techId, highlight?.techIds);
  const trackInChain = Boolean(highlight && highlight.techIds.has(track.techId));

  const renderMilestoneRow = (m) => {
    const isForecast = m.status !== "reached";
    const playable = Number(m.year) <= year;
    const early = Number(m.year) > year;
    const icon = m.origin === "collector" ? "🃏" : isForecast ? "◌" : "●";
    const statusText =
      m.origin === "collector"
        ? "🃏 Collected"
        : isForecast
          ? playable
            ? "◌ Forecast · In play"
            : "◌ Forecast"
          : m.isHistoryAnchor
            ? "● History"
            : "● Reached";
    const yearText = isForecast ? `~${m.year}` : String(m.year);
    const msSelected = Boolean(highlight && highlight.type === "milestone" && highlight.id === m.id);
    const msLinked = Boolean(highlight && highlight.milestoneIds.has(m.id) && !msSelected);
    const msDim = Boolean(trackInChain && highlight.milestoneIds.size > 0 && !highlight.milestoneIds.has(m.id));
    const cls = [
      "ontology-ms",
      isForecast ? "is-predicted is-forecast" : "is-reached",
      m.id === latestReachedId ? "is-latest-reached" : "",
      m.isHistoryAnchor ? "is-history" : "is-current",
      playable ? "is-playable" : "is-ahead is-early",
      m.dealt ? "is-dealt" : "",
      msSelected ? "is-chain-selected" : "",
      msLinked ? "is-chain-linked" : "",
      msDim ? "is-chain-dim" : "",
    ]
      .filter(Boolean)
      .join(" ");

    const portLit = Boolean(highlight && [...highlight.tier1Edges].some((e) => e.startsWith(`${m.id}->`)));

    return `<div class="ontology-ms-row">
      <button type="button" class="${cls}" data-action="deal-milestone" data-tech-id="${escapeHtml(track.techId)}" data-milestone-id="${escapeHtml(m.id)}" title="${escapeHtml(m.label)} — click to deal ${escapeHtml(m.useCases?.length || 0)} use cases">
        <span class="ontology-ms-top">
          <span class="ontology-ms-year">${icon} ${escapeHtml(yearText)}</span>
          <span class="ontology-ms-badge">${escapeHtml(statusText)}</span>
          ${m.dealt ? `<span class="ontology-ms-count">✓ Dealt</span>` : `<span class="ontology-ms-count">+${(m.useCases || []).length} uses</span>`}
        </span>
        <span class="ontology-ms-label">${escapeHtml(m.label)}</span>
        ${m.attribution ? `<span class="ontology-ms-attr">Source: ${escapeHtml(m.attribution)}</span>` : ""}
        ${early ? `<em class="ontology-ms-early">⏳ Too early in ${year} (~${m.year})</em>` : ""}
      </button>
      <span class="ontology-port is-out${m.dealt ? " is-lit" : ""}${early && m.dealt ? " is-early" : ""}${portLit ? " is-chain-lit" : ""}" data-port-ms="${escapeHtml(m.id)}" aria-hidden="true"></span>
    </div>`;
  };

  const allTrends = Array.isArray(track.trends) ? track.trends : [];
  const activeTrend = track.activeTrend || allTrends[0] || null;
  const activeHasCurve = Boolean(
    activeTrend && activeTrend.hasCurve !== false && activeTrend.compounding
  );

  const renderCapabilityInfo = (trendObj) => {
    if (!trendObj || !track.descExpanded) return "";
    const desc = String(trendObj.summary || "").trim();
    const sources = Array.isArray(trendObj.sources)
      ? trendObj.sources.filter((s) => s?.label)
      : [];
    if (!desc && !sources.length) return "";
    return `<div class="ontology-chart-info">
      ${desc ? `<p class="ontology-chart-desc is-expanded">${escapeHtml(desc)}</p>` : ""}
      ${
        sources.length
          ? `<div class="ontology-chart-sources">${sources
              .slice(0, 3)
              .map((s) =>
                s.url
                  ? `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.label)}</a>`
                  : `<span>${escapeHtml(s.label)}</span>`
              )
              .join(" · ")}</div>`
          : ""
      }
    </div>`;
  };

  let chartBlock = "";
  if (track.chartOpen) {
    if (activeTrend && activeHasCurve) {
      const desc = String(activeTrend.summary || "").trim();
      const sources = Array.isArray(activeTrend.sources)
        ? activeTrend.sources.filter((s) => s?.label)
        : [];
      chartBlock = `<div class="ontology-chart-panel">
        <div class="ontology-chart-meta">
          <strong class="ontology-chart-title">${escapeHtml(activeTrend.name || activeTrend.capability || "Capability curve")}</strong>
          <div class="ontology-chart-meta-right">
            ${activeTrend.unit ? `<span class="ontology-chart-unit">${escapeHtml(activeTrend.unit)}</span>` : ""}
            ${desc || sources.length ? `<button type="button" class="ontology-icon-btn${track.descExpanded ? " is-on" : ""}" data-action="toggle-trend-desc" data-tech-id="${escapeHtml(track.techId)}" title="About this capability & sources" aria-label="About this capability">ⓘ</button>` : ""}
          </div>
        </div>
        ${renderCapabilityInfo(activeTrend)}
        <div class="ontology-chart-canvas"><canvas data-trend-tech="${escapeHtml(track.techId)}"></canvas></div>
        <div class="ontology-chart-foot">
          <span>● Reached · ◌ Forecast</span>
          <span>Click dot or pill to deal</span>
        </div>
      </div>`;
    } else if (activeTrend) {
      const desc = String(activeTrend.summary || "").trim();
      const sources = Array.isArray(activeTrend.sources)
        ? activeTrend.sources.filter((s) => s?.label)
        : [];
      chartBlock = `<div class="ontology-chart-panel is-qual">
        <div class="ontology-chart-meta">
          <strong class="ontology-chart-title">${escapeHtml(activeTrend.name || activeTrend.capability || "Capability milestones")}</strong>
          <div class="ontology-chart-meta-right">
            <span class="ontology-chart-unit">Milestone timeline</span>
            ${desc || sources.length ? `<button type="button" class="ontology-icon-btn${track.descExpanded ? " is-on" : ""}" data-action="toggle-trend-desc" data-tech-id="${escapeHtml(track.techId)}" title="About this capability & sources" aria-label="About this capability">ⓘ</button>` : ""}
          </div>
        </div>
        ${renderCapabilityInfo(activeTrend)}
        ${renderQualitativeTimeline(track, milestones, year)}
      </div>`;
    } else {
      chartBlock = renderQualitativeTimeline(track, milestones, year);
    }
  }

  const dealtCount = milestones.filter((m) => m.dealt).length;
  const anyMsHighlighted = Boolean(
    collapsed &&
      highlight &&
      milestones.some(
        (m) =>
          highlight.milestoneIds?.has(m.id) ||
          [...(highlight.tier1Edges || [])].some((e) => e.startsWith(`${m.id}->`))
      )
  );
  const techPortLit = Boolean(
    anyMsHighlighted ||
      (highlight &&
        ([...highlight.tier1Edges].some((e) => e.startsWith(`tech:${track.techId}->`)) ||
          [...highlight.tier2Edges].some((e) => e.startsWith(`tech:${track.techId}->`))))
  );
  const techPortActive = Boolean(hasDirectUseCases || (collapsed && dealtCount > 0));
  const collapseBtn = collapseChevronBtn(
    `tech:${track.techId}`,
    collapsed,
    track.name || track.techId
  );

  if (collapsed) {
    const summaryPill =
      dealtCount > 0
        ? `${dealtCount} dealt · ${inPlay.length}/${milestones.length}`
        : `${inPlay.length}/${milestones.length} in play`;
    return `<article class="ontology-card ontology-tech is-collapsed${isFocused ? " is-focused" : " is-compact"}${trackChainCls}" data-tech-id="${escapeHtml(track.techId)}">
      <span class="ontology-port is-out is-tech-port${techPortActive ? " is-lit" : ""}${techPortLit ? " is-chain-lit" : ""}" data-port-tech="${escapeHtml(track.techId)}" aria-hidden="true"></span>
      <header class="ontology-card-head is-collapsed-bar">
        ${collapseBtn}
        <button type="button" class="ontology-tech-focus" data-action="focus-tech" data-tech-id="${escapeHtml(track.techId)}">
          ${track.icon ? `<span class="ontology-tech-icon" aria-hidden="true">${escapeHtml(track.icon)}</span>` : ""}
          <h3>${escapeHtml(track.name || track.techId)}</h3>
        </button>
        <span class="ontology-collapsed-pill" title="${escapeHtml(`${inPlay.length} of ${milestones.length} milestones in play; ${dealtCount} dealt`)}">${escapeHtml(summaryPill)}</span>
        <button type="button" class="ontology-icon-btn is-remove" data-action="remove-tech" data-tech-id="${escapeHtml(track.techId)}" aria-label="Remove ${escapeHtml(track.name)}" title="Remove from board">×</button>
      </header>
    </article>`;
  }

  const capSelect =
    allTrends.length > 1
      ? `<select class="ontology-trend-select" data-action="select-trend" data-tech-id="${escapeHtml(track.techId)}" aria-label="Choose capability for ${escapeHtml(track.name)}">
          ${allTrends
            .map(
              (t) =>
                `<option value="${escapeHtml(t.id)}"${activeTrend && t.id === activeTrend.id ? " selected" : ""}>${escapeHtml(`${t.name || t.capability || t.id}${t.hasCurve !== false && t.compounding ? " 📈" : ""}`)}</option>`
            )
            .join("")}
        </select>`
      : "";

  return `<article class="ontology-card ontology-tech${isFocused ? " is-focused" : " is-compact"}${trackChainCls}" data-tech-id="${escapeHtml(track.techId)}">
    <span class="ontology-port is-out is-tech-port${techPortActive ? " is-lit" : ""}${techPortLit ? " is-chain-lit" : ""}" data-port-tech="${escapeHtml(track.techId)}" aria-hidden="true"></span>
    <header class="ontology-card-head">
      ${collapseBtn}
      <button type="button" class="ontology-tech-focus" data-action="focus-tech" data-tech-id="${escapeHtml(track.techId)}">
        ${track.icon ? `<span class="ontology-tech-icon" aria-hidden="true">${escapeHtml(track.icon)}</span>` : ""}
        <h3>${escapeHtml(track.name || track.techId)}</h3>
      </button>
      ${worldBadge(track.world)}
      <div class="ontology-head-actions">
        <button type="button" class="ontology-icon-btn" data-action="learn-tech" data-tech-id="${escapeHtml(track.techId)}" title="Learn about ${escapeHtml(track.name)}">📖</button>
        <button type="button" class="ontology-icon-btn${track.chartOpen ? " is-on" : ""}" data-action="toggle-chart" data-tech-id="${escapeHtml(track.techId)}" title="${track.chartOpen ? "Collapse capability timeline" : activeHasCurve ? "Show capability curve" : "Show capability timeline"}">${activeHasCurve ? "📈" : "📉"}</button>
        <button type="button" class="ontology-icon-btn is-remove" data-action="remove-tech" data-tech-id="${escapeHtml(track.techId)}" aria-label="Remove ${escapeHtml(track.name)}" title="Remove from board">×</button>
      </div>
    </header>
    ${capSelect}
    <p class="ontology-cap" title="${escapeHtml(track.capability || "")}">${escapeHtml(track.capability || "")}</p>
    ${!track.chartOpen && track.trendSummary ? `<p class="ontology-trend-line">📉 ${escapeHtml(track.trendSummary)}</p>` : ""}
    ${chartBlock}
    <div class="ontology-spine is-solid">${inPlay.map(renderMilestoneRow).join("")}</div>
    <div class="ontology-year-divider" role="separator" aria-label="Current quest year ${year}">
      <span>📅 NOW: ${year}</span>
    </div>
    ${ahead.length ? `<div class="ontology-spine is-dashed">${ahead.map(renderMilestoneRow).join("")}</div>` : `<p class="ontology-all-reached">All listed milestones are in play by ${year}.</p>`}
  </article>`;
}

function renderUseCase(uc, year, isSelected, highlight = null) {
  const early = Number(uc.milestoneYear) > year;
  const isForecast = uc.milestoneStatus === "predicted";
  const statusTag =
    uc.origin === "collector"
      ? "🃏 Collected"
      : uc.origin === "custom"
        ? "✍️ Custom"
        : isForecast
          ? `◌ ~${uc.milestoneYear} Forecast`
          : `● ${uc.milestoneYear} Reached`;
  const ucChainCls = chainCardClass(highlight, "usecase", uc.id, highlight?.useCaseIds);
  const inEdgeKey = uc.milestoneId
    ? `${uc.milestoneId}->${uc.id}`
    : uc.techId
      ? `tech:${uc.techId}->${uc.id}`
      : "";
  const inPortLit = Boolean(highlight && inEdgeKey && highlight.tier1Edges.has(inEdgeKey));
  const outPortLit = Boolean(
    highlight && [...highlight.tier2Edges].some((e) => e.startsWith(`${uc.id}->`))
  );
  const blurb = String(uc.blurb || "").trim();
  const showBlurb = Boolean(blurb && blurb !== String(uc.title || "").trim());

  return `<article class="ontology-card ontology-use${isSelected ? " is-selected" : ""}${early ? " is-early" : ""}${ucChainCls}" data-usecase-id="${escapeHtml(uc.id)}" draggable="true">
    <span class="ontology-port is-in${early ? " is-early" : " is-lit"}${inPortLit ? " is-chain-lit" : ""}" data-port-uc-in="${escapeHtml(uc.id)}" data-from-ms="${escapeHtml(uc.milestoneId || "")}" data-from-tech="${escapeHtml(uc.techId || "")}" data-wire-tone="${early ? "early" : "solid"}" aria-hidden="true"></span>
    <div class="ontology-use-top">
      <span class="ontology-use-source">${escapeHtml(uc.techName || uc.techId || "Tech")} · ${escapeHtml(statusTag)}</span>
      <button type="button" class="ontology-icon-btn is-remove" data-action="remove-use" data-id="${escapeHtml(uc.id)}" aria-label="Remove ${escapeHtml(uc.title)}" title="Dismiss use case">×</button>
    </div>
    <button type="button" class="ontology-use-select" data-action="toggle-use" data-id="${escapeHtml(uc.id)}">
      <strong>${escapeHtml(uc.title)}</strong>
      ${showBlurb ? `<p>${escapeHtml(blurb)}</p>` : ""}
    </button>
    <footer class="ontology-use-foot">
      ${worldBadge(uc.world)}
      ${early ? `<span class="ontology-early-pill">Too early (~${uc.milestoneYear})</span>` : ""}
      <button type="button" class="ontology-use-cta" data-action="use-to-invent" data-id="${escapeHtml(uc.id)}">${isSelected ? "✓ Selected" : "Use →"}</button>
    </footer>
    <span class="ontology-port is-out${isSelected ? " is-lit" : ""}${outPortLit ? " is-chain-lit" : ""}" data-port-uc-out="${escapeHtml(uc.id)}" aria-hidden="true"></span>
  </article>`;
}

function renderSparkCard(idea) {
  return `<div class="ontology-spark-card${idea.artUrl ? " has-art" : ""}" data-idea-id="${escapeHtml(idea.id)}">
    <button type="button" class="ontology-spark-dismiss" data-action="dismiss-spark" data-idea-id="${escapeHtml(idea.id)}" aria-label="Remove ${escapeHtml(idea.title)}" title="Remove idea">×</button>
    <div class="ontology-spark-main">
      ${idea.artUrl ? `<img class="ontology-spark-art" src="${escapeHtml(idea.artUrl)}" alt="" loading="lazy" draggable="false" />` : ""}
      <div class="ontology-spark-body">
        <strong>${escapeHtml(idea.title)}</strong>
        <p>${escapeHtml(idea.blurb || idea.howText || idea.insertText || "")}</p>
      </div>
    </div>
    <div class="ontology-spark-foot">
      ${idea.eases ? `<span class="ontology-eases-tag">Aims at: ${escapeHtml(idea.eases)}</span>` : `<span></span>`}
      <button type="button" class="ontology-spark-btn" data-action="place-spark" data-idea-id="${escapeHtml(idea.id)}">+ Add</button>
    </div>
  </div>`;
}

function renderSparksSection(opts) {
  const sparks = Array.isArray(opts.sparks) ? opts.sparks : [];
  if (!sparks.length) {
    return `<div id="ontology-sparks" class="ontology-sparks" hidden></div>`;
  }
  const sparkById = new Map(sparks.map((idea) => [idea.id, idea]));
  const slots =
    Array.isArray(opts.sparkSlots) && opts.sparkSlots.length
      ? opts.sparkSlots
      : sparks.map((idea) => ({ kind: "spark", ideaId: idea.id }));
  const seenSparks = new Set();
  const items = [];
  for (const slot of slots) {
    if (slot?.kind === "pathway" && slot.pathwayId && opts.pathwayById?.has(slot.pathwayId)) {
      if (!opts.renderedInSparks?.has(slot.pathwayId)) {
        opts.renderedInSparks?.add(slot.pathwayId);
        items.push(opts.renderPathway(opts.pathwayById.get(slot.pathwayId)));
      }
    } else if (slot?.kind === "spark" && slot.ideaId && sparkById.has(slot.ideaId)) {
      seenSparks.add(slot.ideaId);
      items.push(renderSparkCard(sparkById.get(slot.ideaId)));
    }
  }
  for (const idea of sparks) {
    if (!seenSparks.has(idea.id)) {
      items.push(renderSparkCard(idea));
    }
  }
  return `<div id="ontology-sparks" class="ontology-sparks" aria-label="Generated local invention ideas">
    <div class="ontology-sparks-head">
      <span>Pick an idea for this place:</span>
      <div class="ontology-sparks-actions">
        <button type="button" class="ontology-link-btn" data-action="refresh-ideas" ${opts.createBusy ? "disabled" : ""}>↻ Refresh</button>
        <button type="button" class="ontology-link-btn is-dismiss" data-action="clear-sparks" title="Remove all unused ideas">Clear</button>
      </div>
    </div>
    ${items.join("")}
  </div>`;
}

function renderPathwayComposer(opts) {
  const techOptions = (opts.tracks || [])
    .map(
      (t) =>
        `<button type="button" class="ontology-focus-chip${t.techId === opts.focusedTechId ? " is-on" : ""}" data-action="focus-tech" data-tech-id="${escapeHtml(t.techId)}">${escapeHtml(t.icon ? `${t.icon} ` : "")}${escapeHtml(t.name)}</button>`
    )
    .join("");

  const writeBox = opts.writeOpen
    ? `<div class="ontology-write-box">
        <label class="ontology-how-label">
          <span>How does it work in this place?</span>
          <textarea class="ontology-textarea" data-role="draft-how" rows="3" maxlength="2000" placeholder="Who does what, with what hardware/workflow, here this year…">${escapeHtml(opts.draftHow || "")}</textarea>
        </label>
        <div class="ontology-inline-actions">
          <button type="button" class="btn btn-primary btn-sm" data-action="write-pathway">Form Pathway</button>
          ${opts.voiceSupported ? `<button type="button" class="btn btn-secondary btn-sm${opts.voiceActive ? " is-voice-live" : ""}" data-action="toggle-voice" title="Talk through your idea with the AI co-inventor">🎙️ ${opts.voiceActive ? "Listening…" : "Speak"}</button>` : ""}
          <button type="button" class="btn btn-ghost btn-sm" data-action="toggle-write">Close</button>
        </div>
      </div>`
    : "";

  return `<div class="ontology-composer">
    ${techOptions ? `<div class="ontology-focus-row"><span class="ontology-focus-label">Tech:</span>${techOptions}</div>` : ""}
    <div class="ontology-composer-actions">
      <button type="button" class="btn btn-secondary btn-sm${opts.createBusy ? " is-busy" : ""}" id="btn-ask-ideas" data-action="ask-ideas" ${!opts.focusedTechId || opts.createBusy ? "disabled" : ""}>
        ${opts.createBusy ? `<span class="ontology-spinner" aria-hidden="true"></span> Generating ideas…` : `✨ Ask for ideas${opts.focusedTechName ? ` (${escapeHtml(opts.focusedTechName)})` : ""}`}
      </button>
      <button type="button" class="btn btn-ghost btn-sm${opts.writeOpen ? " is-on" : ""}" data-action="toggle-write">✍️ Write${opts.voiceSupported ? " / 🎙️" : ""}</button>
    </div>
    ${opts.createBusy ? `<div class="ontology-busy-banner" role="status"><span class="ontology-spinner" aria-hidden="true"></span> Drafting 3 local ideas &amp; card art…</div>` : ""}
    ${opts.selectedCount ? `<p class="ontology-selected-hint">✓ ${opts.selectedCount} use case${opts.selectedCount === 1 ? "" : "s"} linked into your next invention</p>` : ""}
    ${writeBox}
  </div>`;
}

function renderPathwayCard(pw, crises, wires, opts) {
  const multi = (pw.ingredients || []).length > 1;
  const chips = (pw.ingredients || [])
    .map(
      (ing) =>
        `<span class="ontology-chip">${worldDot(ing.world)} ${escapeHtml(ing.title)}${
          multi
            ? ` <button type="button" class="ontology-chip-x" data-action="unfuse" data-pathway-id="${escapeHtml(pw.id)}" data-ingredient-id="${escapeHtml(ing.id)}" aria-label="Unfuse ${escapeHtml(ing.title)}" title="Split back into its own card">×</button>`
            : ""
        }</span>`
    )
    .join("");

  const arts = (pw.ingredients || []).map((i) => i.artUrl).filter(Boolean);
  const artPending = (pw.ingredients || []).some((i) => i.artPending);
  const artBanner = arts.length
    ? `<div class="ontology-art-strip${arts.length > 1 ? " is-mosaic" : ""}">${arts
        .slice(0, 2)
        .map((url) => `<img src="${escapeHtml(url)}" alt="" loading="lazy" draggable="false" />`)
        .join("")}</div>`
    : artPending
      ? `<div class="ontology-art-shimmer" aria-hidden="true"><span> painting tile…</span></div>`
      : "";

  const conv = (pw.convergences || [])
    .map(
      (row) =>
        `<span class="ontology-badge is-conv" title="${escapeHtml(row.reason || "")}">⚡ ${escapeHtml(row.title || "Convergence")} ×1.25</span>`
    )
    .join("");

  const bridge =
    pw.bridge && opts.enforceWorlds
      ? `<span class="ontology-badge is-bridge" title="Bits + Atoms fused without a converter or human step. Add a Bridge piece, or explain in text how software triggers physical action.">⚠️ Missing Bridge?</span>`
      : "";

  const rd = pw.rdBoost
    ? `<span class="ontology-badge is-rd" title="Research gamble multiplier applied to feasibility">🧪 R&amp;D ${escapeHtml(pw.rdBoost.factor)}×</span>`
    : "";

  const args = (pw.arguments || [])
    .map((a) => {
      const tone = a.pending ? "is-pending" : a.verdict === "accept" ? "is-accept" : "is-reject";
      const icon = a.pending ? "⏳" : a.verdict === "accept" ? "⚖️✓" : "⚖️✗";
      return `<span class="ontology-badge is-arg ${tone}" title="${escapeHtml(a.reason || a.claim)}">${icon} ${escapeHtml(a.claim.slice(0, 44))}${a.claim.length > 44 ? "…" : ""}</span>`;
    })
    .join("");

  const timingBar = renderTimingAssessment(pw);

  const connectedCrisisIds = new Set(
    wires.filter((w) => w.pathwayId === pw.id).map((w) => w.crisisId)
  );

  const fuseMenu = (pw.fuseTargets || []).length
    ? `<details class="ontology-pop-menu" data-menu="fuse">
        <summary class="ontology-pill-btn" data-action-menu="fuse">⚗️ Fuse with… ▾</summary>
        <div class="ontology-pop-list">
          ${pw.fuseTargets
            .map(
              (other) =>
                `<button type="button" data-action="fuse-pair" data-pathway-id="${escapeHtml(pw.id)}" data-source-id="${escapeHtml(other.id)}">+ ${escapeHtml(other.title)}</button>`
            )
            .join("")}
        </div>
      </details>`
    : "";

  const remixMenu = `<details class="ontology-pop-menu" data-menu="remix">
      <summary class="ontology-pill-btn is-remix">🔀 Remix ▾</summary>
      <div class="ontology-pop-list">
        <button type="button" data-action="wb-remix" data-source-kind="pathway" data-source-id="${escapeHtml(pw.id)}" data-target-method="sit">📦 Remix with SIT (closed world)</button>
        <button type="button" data-action="wb-remix" data-source-kind="pathway" data-source-id="${escapeHtml(pw.id)}" data-target-method="scamper">🔧 Remix with SCAMPER (open)</button>
        <button type="button" data-action="wb-break-pathway" data-pathway-id="${escapeHtml(pw.id)}">↩ Break apart into Ideas</button>
      </div>
    </details>`;

  const plugMenu = crises.length
    ? `<details class="ontology-pop-menu" data-menu="plug">
        <summary class="ontology-pill-btn is-plug" data-action="plug-into-menu">🔌 Plug (${connectedCrisisIds.size}/${crises.length}) ▾</summary>
        <div class="ontology-pop-list">
          ${crises
            .map((c) => {
              const wired = wires.find((w) => w.pathwayId === pw.id && w.crisisId === c.id);
              return wired
                ? `<button type="button" class="is-wired" data-action="unplug" data-wire-id="${escapeHtml(wired.id)}">✓ ${escapeHtml(c.name || c.role)} (Unplug)</button>`
                : `<button type="button" data-action="plug-pair" data-pathway-id="${escapeHtml(pw.id)}" data-crisis-id="${escapeHtml(c.id)}">→ ${escapeHtml(c.name || c.role)}</button>`;
            })
            .join("")}
        </div>
      </details>`
    : "";

  const ucById = opts.ucById instanceof Map ? opts.ucById : null;
  const liveUcIds = [
    ...new Set(
      (pw.ingredients || [])
        .flatMap((ing) => ing.useCaseIds || [])
        .filter((uid) => !ucById || ucById.has(uid))
    ),
  ];
  const fromUcs = liveUcIds.join(",");
  const coveredTechIds = new Set(
    liveUcIds.map((uid) => ucById?.get(uid)?.techId).filter(Boolean)
  );
  const directTechIds = [
    ...new Set(
      (pw.ingredients || [])
        .map((ing) => ing.techId)
        .filter((tid) => Boolean(tid) && !coveredTechIds.has(tid))
    ),
  ];
  const fromTechs = directTechIds.join(",");

  const howSection = opts.editing
    ? `<div class="ontology-edit-how">
        <textarea class="ontology-textarea" data-role="pathway-how-input" data-pathway-id="${escapeHtml(pw.id)}" rows="3" maxlength="4000" ${pw.polishing ? "disabled" : ""}>${escapeHtml(pw.howText || "")}</textarea>
        ${pw.polishing ? `<div class="ontology-busy-banner" role="status"><span class="ontology-spinner" aria-hidden="true"></span> Weaving mechanism with AI…</div>` : ""}
        <div class="ontology-inline-actions">
          <button type="button" class="btn btn-primary btn-sm" data-action="save-pathway-how" data-pathway-id="${escapeHtml(pw.id)}" ${pw.polishing ? "disabled" : ""}>Save</button>
          <button type="button" class="btn btn-secondary btn-sm${pw.polishing ? " is-busy" : ""}" data-action="polish-how" data-pathway-id="${escapeHtml(pw.id)}" ${pw.polishing ? "disabled" : ""}>${pw.polishing ? `<span class="ontology-spinner" aria-hidden="true"></span> Weaving…` : "✨ Polish (AI)"}</button>
          <button type="button" class="btn btn-ghost btn-sm" data-action="cancel-edit-how" ${pw.polishing ? "disabled" : ""}>Cancel</button>
        </div>
      </div>`
    : `<div class="ontology-how-wrap">
        <p class="ontology-how">${escapeHtml(pw.howText || "")}</p>
        ${pw.polishing ? `<div class="ontology-busy-banner" role="status"><span class="ontology-spinner" aria-hidden="true"></span> Weaving ingredients with AI…</div>` : ""}
        <div class="ontology-how-tools">
          <button type="button" class="ontology-link-btn" data-action="edit-pathway-how" data-pathway-id="${escapeHtml(pw.id)}" ${pw.polishing ? "disabled" : ""}>✏️ Edit how</button>
          ${multi ? `<button type="button" class="ontology-link-btn${pw.polishing ? " is-busy" : ""}" data-action="polish-how" data-pathway-id="${escapeHtml(pw.id)}" ${pw.polishing ? "disabled" : ""}>${pw.polishing ? `<span class="ontology-spinner" aria-hidden="true"></span> Weaving with AI…` : "✨ Weave with AI"}</button>` : ""}
        </div>
      </div>`;

  const scoringBanner = pw.scoring
    ? `<div class="ontology-busy-banner" role="status" aria-live="polite"><span class="ontology-spinner" aria-hidden="true"></span> Scoring pathway against plugged crises…</div>`
    : "";

  const highlight = opts.highlight || null;
  const pwChainCls = chainCardClass(highlight, "pathway", pw.id, highlight?.pathwayIds);
  const inPortLit = Boolean(
    highlight && [...highlight.tier2Edges].some((e) => e.endsWith(`->${pw.id}`))
  );
  const outPortLit = Boolean(
    highlight && wires.some((w) => w.pathwayId === pw.id && highlight.wireIds.has(w.id))
  );

  const collapsed = Boolean(opts.collapsed);
  const collapseBtn = collapseChevronBtn(
    `pathway:${pw.id}`,
    collapsed,
    pw.title || "Pathway"
  );
  const pwCardClasses = [
    "ontology-card",
    "ontology-pathway",
    collapsed ? "is-collapsed" : "",
    opts.focused ? "is-focused" : "",
    pw.scoring ? "is-scoring" : "",
    pw.polishing ? "is-polishing" : "",
    pwChainCls.trim(),
  ]
    .filter(Boolean)
    .join(" ");

  if (collapsed) {
    const plugSummary = crises.length
      ? `<span class="ontology-collapsed-pill${connectedCrisisIds.size ? " is-lit" : ""}" title="${connectedCrisisIds.size} of ${crises.length} crises plugged">🔌 ${connectedCrisisIds.size}/${crises.length}</span>`
      : "";
    return `<article class="${pwCardClasses}" data-pathway-id="${escapeHtml(pw.id)}" data-drop="pathway" draggable="true">
      <span class="ontology-port is-in${fromUcs || fromTechs ? " is-lit" : ""}${inPortLit ? " is-chain-lit" : ""}" data-port-pw-in="${escapeHtml(pw.id)}" data-from-ucs="${escapeHtml(fromUcs)}" data-from-techs="${escapeHtml(fromTechs)}" aria-hidden="true"></span>
      <header class="ontology-card-head is-collapsed-bar">
        ${collapseBtn}
        <h3 title="${escapeHtml(pw.title)}">${escapeHtml(pw.title)}</h3>
        ${plugSummary}
        ${lampDot(pw.timingLevel, pw.timingPending || pw.scoring)}
        <button type="button" class="ontology-icon-btn is-remove" data-action="remove-pathway" data-pathway-id="${escapeHtml(pw.id)}" aria-label="Remove ${escapeHtml(pw.title)}" title="Remove pathway">×</button>
      </header>
      <span class="ontology-port is-out${connectedCrisisIds.size ? " is-lit" : ""}${outPortLit ? " is-chain-lit" : ""}" data-port-pw-out="${escapeHtml(pw.id)}" title="Drag onto a Crisis in Lane 4 to plug in" aria-hidden="true"></span>
    </article>`;
  }

  return `<article class="${pwCardClasses}" data-pathway-id="${escapeHtml(pw.id)}" data-drop="pathway" draggable="true">
    <span class="ontology-port is-in${fromUcs || fromTechs ? " is-lit" : ""}${inPortLit ? " is-chain-lit" : ""}" data-port-pw-in="${escapeHtml(pw.id)}" data-from-ucs="${escapeHtml(fromUcs)}" data-from-techs="${escapeHtml(fromTechs)}" aria-hidden="true"></span>
    <header class="ontology-card-head">
      ${collapseBtn}
      <h3>${escapeHtml(pw.title)}</h3>
      ${lampDot(pw.timingLevel, pw.timingPending || pw.scoring)}
      <button type="button" class="ontology-icon-btn is-remove" data-action="remove-pathway" data-pathway-id="${escapeHtml(pw.id)}" aria-label="Remove ${escapeHtml(pw.title)}" title="Remove pathway">×</button>
    </header>
    ${artBanner}
    ${timingBar}
    ${scoringBanner}
    <div class="ontology-chips">${chips}</div>
    <div class="ontology-badges">${conv}${bridge}${rd}${args}</div>
    ${howSection}
    <footer class="ontology-pathway-foot">
      ${fuseMenu}
      ${remixMenu}
      ${plugMenu}
    </footer>
    <span class="ontology-port is-out${connectedCrisisIds.size ? " is-lit" : ""}${outPortLit ? " is-chain-lit" : ""}" data-port-pw-out="${escapeHtml(pw.id)}" title="Drag onto a Crisis in Lane 4 to plug in" aria-hidden="true"></span>
  </article>`;
}

function worldDot(world) {
  const key = normalizeWorld(world);
  const meta = WORLD_META[key];
  return `<span class="ontology-world-icon is-${key}" title="${escapeHtml(meta.title)}" aria-label="${escapeHtml(meta.label)}">${worldIconSvg(key)}</span>`;
}

function renderCrisisCard(crisis, wires, highlight = null, collapsed = false) {
  const inbound = wires.filter((w) => w.crisisId === crisis.id);
  const roleText = roleLabel(crisis.role);
  const meterPips =
    crisis.level != null
      ? `<span class="ontology-meter-tag" title="Crisis pressure 0–5 (collapse at 5)">Meter ${crisis.level}/5${crisis.goal != null ? ` · target ≤${crisis.goal}` : ""}</span>`
      : "";
  const crisisChainCls = chainCardClass(highlight, "crisis", crisis.id, highlight?.crisisIds);
  const crisisInChain = Boolean(highlight && highlight.crisisIds.has(crisis.id));
  const inPortLit = Boolean(
    highlight && inbound.some((w) => highlight.wireIds.has(w.id))
  );

  const wireReads = inbound
    .map((w) => {
      const delta = signed(w.delta);
      const early = w.state === "early" ? `Too early (~${w.year || ""})` : "";
      const blocked = (w.challengers || []).some((ch) => ch.lamp === "red");
      const deltaCls =
        w.pending
          ? "is-pending"
          : w.delta <= -1
            ? "is-good"
            : w.delta > 0 || w.state === "early"
              ? "is-bad"
              : "is-flat";

      const roadblocks = (w.challengers || [])
        .map((ch) => {
          const meta = challengerMeta(ch.angle);
          return `<button type="button" class="ontology-roadblock-pill is-${escapeHtml(ch.lamp || "red")}" data-action="open-roadblock" data-challenger-id="${escapeHtml(ch.id)}">
            <img src="${escapeHtml(meta.visual)}" alt="" />
            <span>🛑 ${escapeHtml(meta.label)}: ${ch.lamp === "red" ? "Blocking wire — tap to answer" : "Cleared"}</span>
            ${lampDot(ch.lamp, ch.answerPending || ch.posePending)}
          </button>`;
        })
        .join("");

      const summoningPill = w.summoning
        ? (() => {
            const meta = challengerMeta(w.summoning.angle);
            return `<div class="ontology-busy-banner is-challenger" role="status">
              <img src="${escapeHtml(meta.visual)}" alt="" />
              <span class="ontology-spinner" aria-hidden="true"></span>
              <span>${escapeHtml(meta.label)} is sharpening a hard question…</span>
            </div>`;
          })()
        : "";

      const wireCls = !highlight
        ? ""
        : highlight.type === "wire" && highlight.id === w.id
          ? " is-chain-selected"
          : highlight.wireIds.has(w.id)
            ? " is-chain-linked"
            : crisisInChain
              ? " is-chain-dim"
              : "";

      return `<div class="ontology-wire-read${blocked ? " is-blocked" : ""}${w.pending ? " is-scoring" : ""}${wireCls}" data-wire-id="${escapeHtml(w.id)}" data-wire-state="${escapeHtml(w.state || "solid")}">
        <div class="ontology-wire-read-top">
          ${lampDot(w.lamp, w.pending)}
          <strong>${escapeHtml(w.pathwayTitle || "Pathway")}</strong>
          ${w.pending ? `<span class="ontology-delta-chip is-pending"><span class="ontology-spinner" aria-hidden="true"></span> Scoring…</span>` : delta ? `<span class="ontology-delta-chip ${deltaCls}">${escapeHtml(delta)}</span>` : ""}
          <button type="button" class="ontology-icon-btn is-remove" data-action="unplug" data-wire-id="${escapeHtml(w.id)}" title="Unplug wire" aria-label="Unplug ${escapeHtml(w.pathwayTitle)}">×</button>
        </div>
        <p class="ontology-wire-reason">${escapeHtml(w.pending ? "Evaluating how this pathway affects this crisis…" : w.reason || early || "Connected.")}</p>
        ${summoningPill}
        ${roadblocks}
      </div>`;
    })
    .join("");

  const anyScoring = inbound.some((w) => w.pending);
  const blockedCount = inbound.reduce(
    (sum, w) => sum + (w.challengers || []).filter((ch) => ch.lamp === "red").length,
    0
  );
  const collapseBtn = collapseChevronBtn(
    `crisis:${crisis.id}`,
    collapsed,
    crisis.name || crisis.role || "Crisis"
  );

  if (collapsed) {
    const compactMeter =
      crisis.level != null
        ? `<span class="ontology-meter-tag" title="Crisis pressure ${crisis.level}/5${crisis.goal != null ? ` · target ≤${crisis.goal}` : ""}">${crisis.level}/5</span>`
        : "";
    const statusPill = blockedCount
      ? `<span class="ontology-collapsed-pill is-warn" title="${blockedCount} open roadblock${blockedCount === 1 ? "" : "s"}">🛑 ${blockedCount}</span>`
      : inbound.length
        ? `<span class="ontology-collapsed-pill is-lit" title="${inbound.length} wired pathway${inbound.length === 1 ? "" : "s"}">${inbound.length} wired</span>`
        : "";
    return `<article class="ontology-card ontology-crisis is-collapsed is-${escapeHtml(crisis.lamp || "red")}${anyScoring ? " is-scoring" : ""}${crisisChainCls}" data-crisis-id="${escapeHtml(crisis.id)}" data-crisis-slot="${escapeHtml(crisis.id)}" data-drop="crisis">
      <span class="ontology-port is-in${inbound.length ? " is-lit" : ""}${inPortLit ? " is-chain-lit" : ""}" data-port-crisis-in="${escapeHtml(crisis.id)}" aria-hidden="true"></span>
      <header class="ontology-card-head is-collapsed-bar">
        ${collapseBtn}
        <h3 title="${escapeHtml(crisis.name || crisis.role)}">${escapeHtml(crisis.name || crisis.role)}</h3>
        ${compactMeter}
        ${statusPill}
        ${lampDot(crisis.lamp, anyScoring)}
      </header>
    </article>`;
  }

  return `<article class="ontology-card ontology-crisis is-${escapeHtml(crisis.lamp || "red")}${anyScoring ? " is-scoring" : ""}${crisisChainCls}" data-crisis-id="${escapeHtml(crisis.id)}" data-crisis-slot="${escapeHtml(crisis.id)}" data-drop="crisis">
    <span class="ontology-port is-in${inbound.length ? " is-lit" : ""}${inPortLit ? " is-chain-lit" : ""}" data-port-crisis-in="${escapeHtml(crisis.id)}" aria-hidden="true"></span>
    <header class="ontology-card-head">
      ${collapseBtn}
      <div class="ontology-crisis-title">
        ${roleText ? `<span class="ontology-crisis-role">${escapeHtml(roleText)}</span>` : ""}
        <h3>${escapeHtml(crisis.name || crisis.role)}</h3>
      </div>
      <div class="ontology-crisis-meta">
        ${meterPips}
        ${lampDot(crisis.lamp, anyScoring)}
      </div>
    </header>
    <p class="ontology-crisis-desc">${escapeHtml(crisis.description || "")}</p>
    ${inbound.length ? `<div class="ontology-inbound-list">${wireReads}</div>` : `<p class="ontology-unplugged-hint">Drag a Pathway here (or use 🔌 Plug) to address this crisis.</p>`}
  </article>`;
}

function renderWireRoadblockTokens(wires, highlight = null) {
  const out = [];
  for (const w of wires) {
    const tokenCls = !highlight
      ? ""
      : highlight.wireIds.has(w.id)
        ? " is-chain-linked"
        : " is-chain-dim";
    for (const ch of w.challengers || []) {
      const meta = challengerMeta(ch.angle);
      out.push(
        `<button type="button" class="ontology-wire-token is-${escapeHtml(ch.lamp || "red")}${tokenCls}" data-wire-token="${escapeHtml(w.id)}" data-action="open-roadblock" data-challenger-id="${escapeHtml(ch.id)}" title="${escapeHtml(meta.label)}: ${escapeHtml(ch.question || ch.speech || "Tap to respond")}">
          <img src="${escapeHtml(meta.visual)}" alt="" />
          <span class="ontology-wire-token-name">${escapeHtml(meta.label)}</span>
          ${lampDot(ch.lamp, ch.answerPending || ch.posePending)}
        </button>`
      );
    }
  }
  return out.join("");
}

/**
 * Fallback deterministic SVG paths for SSR/Node unit tests before live DOM measurement runs.
 */
function renderFallbackWires(wires, pathways, crises, highlight = null, layer = "base") {
  return wires
    .filter((wire) => {
      const hit = Boolean(highlight && highlight.wireIds.has(wire.id));
      return layer === "active" ? hit : !hit;
    })
    .map((wire) => {
      const from = Math.max(0, pathways.findIndex((p) => p.id === wire.pathwayId));
      const to = Math.max(0, crises.findIndex((c) => c.id === wire.crisisId));
      const y1 = 90 + from * 140;
      const y2 = 90 + to * 140;
      const blocked = (wire.challengers || []).some((ch) => ch.lamp === "red");
      const state = wire.state === "early" ? "early" : wire.pending ? "pending" : blocked ? "blocked" : wire.lamp || "solid";
      const dash = wire.state === "early" ? `stroke-dasharray="8 6"` : "";
      const hlCls = highlight ? (layer === "active" ? " is-highlighted" : " is-dimmed") : "";
      return `<path class="ontology-wire-path is-tier-3${hlCls}" data-wire-id="${escapeHtml(wire.id)}" data-wire-state="${escapeHtml(wire.state === "early" ? "early" : "solid")}" data-wire-lamp="${escapeHtml(state)}" d="M 720 ${y1} C 790 ${y1}, 810 ${y2}, 880 ${y2}" ${dash} />`;
    })
    .join("");
}

function renderPicker(catalog, activeDomain) {
  const recommended = catalog.filter((t) => t.recommended);
  const domains = [
    { id: "all", label: "All (29)" },
    ...Object.entries(DOMAINS).map(([id, d]) => ({ id, label: d.label })),
  ];
  const filtered = catalog.filter(
    (t) => activeDomain === "all" || t.domain === activeDomain
  );

  const renderItem = (tech) => `<div class="ontology-picker-item${tech.onBoard ? " is-on-board" : ""}">
    <button type="button" class="tech-card${tech.recommended ? " recommended" : ""}" data-action="pick-tech" data-tech-id="${escapeHtml(tech.id)}" data-id="${escapeHtml(tech.id)}">
      <span class="ontology-picker-top">
        <strong>${escapeHtml(tech.icon ? `${tech.icon} ` : "")}${escapeHtml(tech.name)}</strong>
        ${worldBadge(tech.world)}
        ${tech.costLabel ? `<span class="ontology-cost-pill">${escapeHtml(tech.costLabel)}</span>` : ""}
      </span>
      <span class="ontology-picker-why">${escapeHtml(tech.why || "")}</span>
    </button>
    <button type="button" class="ontology-icon-btn" data-action="learn-tech" data-tech-id="${escapeHtml(tech.id)}" title="Read primer on ${escapeHtml(tech.name)}">📖</button>
  </div>`;

  return `<div class="ontology-modal-scrim" data-action="close-picker">
    <div id="ontology-tech-picker" class="ontology-picker-modal" role="dialog" aria-modal="true" aria-label="Add an emerging technology">
      <header class="ontology-modal-head">
        <div>
          <h3>Choose an emerging technology</h3>
          <p class="ontology-meta">Explore any tech freely in Lane 1. Frontier techs use more town Budget or Goodwill when placed in a Pathway.</p>
        </div>
        <button type="button" class="btn btn-ghost btn-sm" data-action="toggle-picker">Close</button>
      </header>
      ${
        recommended.length
          ? `<section class="ontology-picker-group">
              <h4>Suggested for this place</h4>
              <div class="ontology-picker-grid">${recommended.map(renderItem).join("")}</div>
            </section>`
          : ""
      }
      <section class="ontology-picker-group">
        <div class="ontology-domain-tabs">
          <h4>All emerging technologies</h4>
          <div class="ontology-domain-pills">
            ${domains
              .map(
                (d) =>
                  `<button type="button" class="ontology-filter-pill${activeDomain === d.id ? " is-on" : ""}" data-action="filter-picker-domain" data-domain="${escapeHtml(d.id)}">${escapeHtml(d.label)}</button>`
              )
              .join("")}
          </div>
        </div>
        <div class="ontology-picker-grid">${filtered.map(renderItem).join("")}</div>
      </section>
    </div>
  </div>`;
}

function renderRoadblockModal(ch, isTutorial) {
  const meta = challengerMeta(ch.angle);
  return `<div class="ontology-modal-scrim" data-action="close-roadblock-scrim">
    <div id="ontology-roadblock" class="ontology-roadblock-modal" role="dialog" aria-modal="true" aria-labelledby="hex-tile-popup-title">
      <div class="ontology-roadblock-banner">
        <img class="ontology-roadblock-portrait" src="${escapeHtml(meta.visual)}" alt="" />
        <div>
          <span class="ontology-crisis-role">Wire Roadblock · ${escapeHtml(meta.subtitle)}</span>
          <h3 id="hex-tile-popup-title">${escapeHtml(meta.label)} ${lampDot(ch.lamp, ch.answerPending)}</h3>
          <p class="ontology-roadblock-speech">${escapeHtml(ch.speech || "")}</p>
        </div>
      </div>
      ${ch.question && ch.question !== ch.speech ? `<p class="ontology-roadblock-question"><strong>Hard question:</strong> ${escapeHtml(ch.question)}</p>` : ""}
      ${ch.answerFeedback ? `<div class="ontology-roadblock-feedback is-${escapeHtml(ch.lamp || "red")}">${escapeHtml(ch.answerFeedback)}</div>` : ""}
      <p class="ontology-meta">Clear this roadblock <strong>either</strong> by closing this card and upgrading your Pathway in Lane 3 so it fixes the flaw, <strong>or</strong> by answering directly below:</p>
      ${ch.answerPending ? `<div class="ontology-busy-banner is-challenger" role="status"><span class="ontology-spinner" aria-hidden="true"></span> ${escapeHtml(meta.label)} is judging your defense…</div>` : ""}
      ${ch.drafting ? `<div class="ontology-busy-banner" role="status"><span class="ontology-spinner" aria-hidden="true"></span> Co-inventor is drafting a defense reply…</div>` : ""}
      <label class="ontology-how-label">
        <span>Your defense (who acts, who pays, or what hard limit you respect)</span>
        <textarea class="ontology-textarea" data-role="roadblock-text" rows="3" maxlength="2000" placeholder="Name the concrete mechanism, steward, or safeguard…" ${ch.answerPending || ch.drafting ? "disabled" : ""}>${escapeHtml(ch.draft ?? ch.playerAnswer ?? "")}</textarea>
      </label>
      <div class="ontology-inline-actions">
        <button type="button" class="btn btn-primary btn-sm${ch.answerPending ? " is-busy" : ""}" data-action="roadblock-submit" data-challenger-id="${escapeHtml(ch.id)}" ${ch.answerPending || ch.drafting ? "disabled" : ""}>${ch.answerPending ? `<span class="ontology-spinner" aria-hidden="true"></span> Judging defense…` : "Submit defense"}</button>
        <button type="button" class="btn btn-secondary btn-sm${ch.drafting ? " is-busy" : ""}" data-action="roadblock-draft-ai" data-challenger-id="${escapeHtml(ch.id)}" ${ch.answerPending || ch.drafting ? "disabled" : ""}>${ch.drafting ? `<span class="ontology-spinner" aria-hidden="true"></span> Drafting…` : "✨ Draft reply"}</button>
        <button type="button" class="btn btn-secondary btn-sm" data-action="wb-remix-roadblock" data-challenger-id="${escapeHtml(ch.id)}" ${ch.answerPending ? "disabled" : ""} title="Open SCAMPER in the Innovation Workbench preloaded with this roadblock">🔧 Remix in Workbench</button>
        ${isTutorial ? `<button type="button" class="btn btn-secondary btn-sm" data-action="roadblock-suggest" data-challenger-id="${escapeHtml(ch.id)}" ${ch.answerPending ? "disabled" : ""}>Fill tutorial reply →</button>` : ""}
        <button type="button" class="btn btn-ghost btn-sm" data-action="close-roadblock">Close &amp; edit board</button>
      </div>
    </div>
  </div>`;
}

function renderArgumentModal(pathways, focusedPathwayId, busy) {
  const targetId = focusedPathwayId || pathways[0]?.id || "";
  return `<div class="ontology-modal-scrim" data-action="close-argument-scrim">
    <div class="ontology-roadblock-modal" role="dialog" aria-modal="true" aria-label="File a fact-checked argument">
      <header class="ontology-modal-head">
        <h3>⚖️ File a fact-checked argument</h3>
        <button type="button" class="btn btn-ghost btn-sm" data-action="close-argument">Close</button>
      </header>
      <p class="ontology-meta">Disagree with a timing or capability assessment? State a real-world demonstrated fact. An independent fact-check verifies the claim and attaches it to your Pathway.</p>
      <form data-action="submit-argument">
        <label class="ontology-how-label">
          <span>Attach to Pathway</span>
          <select name="pathwayId" class="ontology-select">
            ${pathways.map((p) => `<option value="${escapeHtml(p.id)}" ${p.id === targetId ? "selected" : ""}>${escapeHtml(p.title)}</option>`).join("")}
          </select>
        </label>
        <label class="ontology-how-label">
          <span>Demonstrated real-world fact</span>
          <textarea name="claim" class="ontology-textarea" rows="3" maxlength="400" placeholder="e.g. Quantized 14B open-weight models already run at >15 tokens/sec on 16GB consumer laptops offline."></textarea>
        </label>
        <div class="ontology-inline-actions">
          <button type="submit" class="btn btn-primary btn-sm" ${busy ? "disabled" : ""}>${busy ? "Fact-checking…" : "Fact-check & attach"}</button>
          <button type="button" class="btn btn-ghost btn-sm" data-action="close-argument">Cancel</button>
        </div>
      </form>
    </div>
  </div>`;
}

/* ── Expanded Lane 3: Docked Circuit Frame & Double-Diamond Innovation Workbench ── */

function renderWorkbenchLeftRail(tracks, useCases, year, selected, wb) {
  const techChips = tracks.length
    ? tracks
        .map((t) => {
          const expanded = wb.railExpandedTechId === t.techId;
          const msRows = expanded
            ? `<div class="wb-rail-milestones">
                ${(t.milestones || [])
                  .slice(0, 4)
                  .map((m) => {
                    const isForecast = m.status !== "reached";
                    const yr = isForecast ? `~${m.year}` : String(m.year);
                    return `<button type="button" class="wb-rail-ms${m.dealt ? " is-dealt" : ""}${Number(m.year) > year ? " is-early" : ""}" data-action="deal-milestone" data-tech-id="${escapeHtml(t.techId)}" data-milestone-id="${escapeHtml(m.id)}" title="${escapeHtml(m.label)}">
                      <span>${isForecast ? "◌" : "●"} ${escapeHtml(yr)}</span>
                      <span class="wb-rail-ms-label">${escapeHtml(m.label)}</span>
                    </button>`;
                  })
                  .join("")}
              </div>`
            : "";
          return `<div class="wb-rail-tech-item${expanded ? " is-open" : ""}">
            <button type="button" class="wb-rail-tech-chip" data-action="wb-rail-toggle-tech" data-tech-id="${escapeHtml(t.techId)}" title="Click to quick-deal milestones for ${escapeHtml(t.name)}">
              <span class="wb-rail-tech-name">${t.icon ? `${escapeHtml(t.icon)} ` : ""}${escapeHtml(t.name)}</span>
              ${worldDot(t.world)}
            </button>
            ${msRows}
          </div>`;
        })
        .join("")
    : `<p class="wb-rail-empty">No techs on board yet.</p>`;

  const usePills = useCases.length
    ? useCases
        .map((uc) => {
          const isSel = selected.has(uc.id);
          const early = Number(uc.milestoneYear) > year;
          return `<button type="button" class="wb-rail-uc${isSel ? " is-selected" : ""}${early ? " is-early" : ""}" data-action="toggle-use" data-id="${escapeHtml(uc.id)}" data-usecase-id="${escapeHtml(uc.id)}" draggable="true" title="${escapeHtml(uc.blurb || uc.title)} — click to toggle into Seed, or drag into Workbench">
            <span class="wb-rail-uc-top">
              ${worldDot(uc.world)}
              <span class="wb-rail-uc-tech">${escapeHtml(uc.techName || uc.techId || "")}</span>
              ${early ? `<span class="wb-rail-early">~${uc.milestoneYear}</span>` : ""}
              ${isSel ? `<span class="wb-rail-check">✓</span>` : ""}
            </span>
            <strong class="wb-rail-uc-title">${escapeHtml(uc.title)}</strong>
          </button>`;
        })
        .join("")
    : `<p class="wb-rail-empty">Tap a Tech above to unlock milestones &amp; Use Cases.</p>`;

  return `<aside class="ontology-lane wb-dock-rail wb-dock-left" aria-label="Docked Tech and Use Cases">
    <header class="ontology-lane-head">
      <div class="ontology-lane-title-row">
        <h2><span class="ontology-lane-num">1–2</span> Inputs</h2>
        <button type="button" class="ontology-mini-btn is-accent" data-action="toggle-picker" title="Add another emerging tech">+ Tech</button>
      </div>
    </header>
    <div class="wb-rail-section">
      <span class="wb-rail-kicker">Active Techs (${tracks.length})</span>
      <div class="wb-rail-tech-list">${techChips}</div>
    </div>
    <div class="wb-rail-section is-grow">
      <span class="wb-rail-kicker">Use Cases (${useCases.length})</span>
      <div class="wb-rail-uc-list">${usePills}</div>
    </div>
  </aside>`;
}

function renderWorkbenchRightRail(crises, wires, rules) {
  const ruleCount = (rules || []).length;
  const cards = crises.length
    ? crises
        .map((c) => {
          const inbound = wires.filter((w) => w.crisisId === c.id);
          const roadblocks = inbound.flatMap((w) => w.challengers || []);
          const rbButtons = roadblocks
            .map((ch) => {
              const meta = challengerMeta(ch.angle);
              return `<button type="button" class="wb-rail-rb is-${escapeHtml(ch.lamp || "red")}" data-action="wb-remix-roadblock" data-challenger-id="${escapeHtml(ch.id)}" title="Click to remix blocked Pathway in SCAMPER">
                <img src="${escapeHtml(meta.visual)}" alt="" />
                <span>🛑 ${escapeHtml(meta.label)}</span>
              </button>`;
            })
            .join("");
          return `<article class="wb-rail-crisis is-${escapeHtml(c.lamp || "red")}" data-crisis-id="${escapeHtml(c.id)}" data-drop="crisis">
            <div class="wb-rail-crisis-top">
              <span class="wb-rail-crisis-role">${escapeHtml(roleLabel(c.role))}</span>
              ${lampDot(c.lamp, inbound.some((w) => w.pending))}
            </div>
            <strong class="wb-rail-crisis-name">${escapeHtml(c.name || c.role)}</strong>
            <div class="wb-rail-crisis-meta">
              ${c.level != null ? `<span>Meter ${c.level}/5${c.goal != null ? ` (≤${c.goal})` : ""}</span>` : ""}
              <span>${inbound.length} wired</span>
            </div>
            ${rbButtons ? `<div class="wb-rail-rbs">${rbButtons}</div>` : ""}
          </article>`;
        })
        .join("")
    : `<p class="wb-rail-empty">Crises appear here.</p>`;

  return `<aside class="ontology-lane wb-dock-rail wb-dock-right" data-lane="problem" data-drop="crisis" aria-label="Docked Problem targets">
    <header class="ontology-lane-head">
      <div class="ontology-lane-title-row">
        <h2><span class="ontology-lane-num">4</span> Problem</h2>
        <button type="button" class="ontology-mini-btn" data-action="tool-lobby" title="Lobby a local rule">🏛️ ${ruleCount || "+"}</button>
      </div>
    </header>
    <p class="wb-rail-hint">Drop any Pathway below onto a Crisis to plug in.</p>
    <div class="wb-rail-crisis-list">${cards}</div>
  </aside>`;
}

function renderWorkbenchMethodControls(wb, useCases, selected) {
  if (wb.method === "sit") {
    const seedSelect = renderSeedSelector(wb);
    const quads = wb.sitLenses
      .map(
        (lens) => `<button type="button" class="wb-sit-card${wb.sitLens === lens.id ? " is-on" : ""}" data-action="wb-sit-select" data-lens="${escapeHtml(lens.id)}">
          <div class="wb-sit-top">
            <span class="wb-sit-sym" aria-hidden="true">${escapeHtml(lens.symbol)}</span>
            <strong>${escapeHtml(lens.label)}</strong>
          </div>
          <span class="wb-sit-short">${escapeHtml(lens.short)}</span>
        </button>`
      )
      .join("");
    return `<div class="wb-method-panel is-sit">
      ${seedSelect}
      <div class="wb-sit-grid" role="radiogroup" aria-label="SIT closed-world lenses">${quads}</div>
    </div>`;
  }

  if (wb.method === "scamper") {
    const seedSelect = renderSeedSelector(wb);
    const chosenSet = new Set(wb.scamperLetters || []);
    const recommendedSet = new Set(wb.challengerGuide?.scamper || []);
    const rbBanner =
      wb.remixSeed?.challengerAngle
        ? (() => {
            const meta = challengerMeta(wb.remixSeed.challengerAngle);
            return `<div class="wb-challenger-banner">
              <img src="${escapeHtml(meta.visual)}" alt="" draggable="false" />
              <div>
                <strong>🛑 Unblocking ${escapeHtml(meta.label)}</strong>
                <p>${escapeHtml(wb.remixSeed.challengerQuestion || wb.challengerGuide?.note || "")}</p>
              </div>
            </div>`;
          })()
        : "";
    const pills = wb.scamperLenses
      .map((l) => {
        const on = chosenSet.has(l.id);
        const rec = recommendedSet.has(l.id);
        return `<button type="button" class="wb-scamper-pill${on ? " is-on" : ""}${rec ? " is-rec" : ""}" data-action="wb-scamper-toggle" data-letter="${escapeHtml(l.id)}" title="${escapeHtml(l.label)}: ${escapeHtml(l.hint)}">
          <span class="wb-scamper-letter">${escapeHtml(l.letter)}</span>
          <span class="wb-scamper-name">${escapeHtml(l.label)}</span>
        </button>`;
      })
      .join("");
    return `<div class="wb-method-panel is-scamper">
      ${rbBanner}
      ${seedSelect}
      <div class="wb-scamper-head">
        <span>Toggle 1–3 remix lenses (focused bench):</span>
        <button type="button" class="ontology-link-btn" data-action="wb-scamper-top3" title="Auto-select the 3 strongest SCAMPER lenses for this seed">🎯 Pick Top 3</button>
      </div>
      <div class="wb-scamper-bar">${pills}</div>
    </div>`;
  }

  // Default: "seed"
  const pickedUcs = useCases.filter((u) => selected.has(u.id));
  const ucStrip = pickedUcs.length
    ? `<div class="wb-seed-ucs">${pickedUcs
        .map(
          (u) =>
            `<span class="wb-seed-uc-chip">${worldDot(u.world)} ${escapeHtml(u.title)} <button type="button" class="ontology-chip-x" data-action="toggle-use" data-id="${escapeHtml(u.id)}" aria-label="Unselect ${escapeHtml(u.title)}">×</button></span>`
        )
        .join("")}</div>`
    : `<p class="wb-seed-hint">Tip: tap any unlocked Use Case in the left rail (or switch active Techs in 1–2 Inputs) to anchor your Seed ideas.</p>`;

  return `<div class="wb-method-panel is-seed">${ucStrip}</div>`;
}

function renderSeedSelector(wb) {
  const choices = wb.seedChoices || [];
  const activeKey = wb.remixSeed ? `${wb.remixSeed.kind}:${wb.remixSeed.id}` : "";
  if (!choices.length) {
    return `<div class="wb-seed-bar"><span class="wb-seed-bar-label">Seed:</span> <strong>${escapeHtml(wb.remixSeed?.title || "Active Tech")}</strong></div>`;
  }
  return `<div class="wb-seed-bar">
    <label class="wb-seed-select-wrap">
      <span class="wb-seed-bar-label">Remixing:</span>
      <select class="ontology-trend-select wb-seed-select" data-action="wb-pick-seed">
        ${choices
          .map(
            (c) =>
              `<option value="${escapeHtml(c.key)}"${c.key === activeKey ? " selected" : ""}>${escapeHtml(c.label)}</option>`
          )
          .join("")}
      </select>
    </label>
  </div>`;
}

function renderWorkbenchIdeaCard(idea, wb, pathways = [], collapsed = false) {
  const remixMenu = `<details class="ontology-pop-menu wb-draft-remix" data-menu="draft-remix">
    <summary class="ontology-link-btn">Remix ▾</summary>
    <div class="ontology-pop-list">
      <button type="button" data-action="wb-remix" data-source-kind="draft" data-source-id="${escapeHtml(idea.id)}" data-target-method="sit">📦 Into SIT</button>
      <button type="button" data-action="wb-remix" data-source-kind="draft" data-source-id="${escapeHtml(idea.id)}" data-target-method="scamper">🔧 Into SCAMPER</button>
    </div>
  </details>`;

  const artThumb = idea.artUrl
    ? `<img class="wb-idea-art" src="${escapeHtml(idea.artUrl)}" alt="" loading="lazy" draggable="false" />`
    : idea.artPending
      ? `<div class="wb-idea-thumb-shimmer" title="Visualizing idea…"><span>🎨</span></div>`
      : `<div class="wb-idea-thumb-fallback is-${escapeHtml(normalizeWorld(idea.world))}" aria-hidden="true">${worldIconSvg(idea.world)}</div>`;

  const metaBadges = [
    idea.hasSynergy ? `<span class="ontology-badge is-conv">⚡ ×1.25</span>` : "",
    idea.earlyForecast ? `<span class="ontology-early-pill">~${idea.earlyForecast}</span>` : "",
  ]
    .filter(Boolean)
    .join("");

  const pwList = Array.isArray(pathways) ? pathways : [];
  let actionButtons = "";
  if (pwList.length === 0) {
    actionButtons = `<button type="button" class="wb-mint-idea-btn" data-action="wb-start-pathway" data-idea-id="${escapeHtml(idea.id)}" title="Start a Pathway in Deliver with this idea">
      → Start Pathway
    </button>`;
  } else if (pwList.length === 1) {
    const pw = pwList[0];
    actionButtons = `<div class="wb-idea-actions">
      <button type="button" class="wb-mint-idea-btn" data-action="wb-add-to-pathway" data-idea-id="${escapeHtml(idea.id)}" data-pathway-id="${escapeHtml(pw.id)}" title="Add this idea into Pathway #1: ${escapeHtml(pw.title || "Pathway #1")}">
        + Add to Pathway #1
      </button>
      <button type="button" class="wb-new-pw-mini-btn" data-action="wb-start-pathway" data-idea-id="${escapeHtml(idea.id)}" title="Start a separate new Pathway with this idea">
        + New
      </button>
    </div>`;
  } else if (pwList.length <= 3) {
    const pwBtns = pwList
      .map(
        (pw, idx) =>
          `<button type="button" class="wb-mint-idea-btn is-pw-pick" data-action="wb-add-to-pathway" data-idea-id="${escapeHtml(idea.id)}" data-pathway-id="${escapeHtml(pw.id)}" title="Add this idea into Pathway #${idx + 1}: ${escapeHtml(pw.title || `Pathway #${idx + 1}`)}" aria-label="Add ${escapeHtml(idea.title)} to Pathway #${idx + 1}">+ Pathway #${idx + 1}</button>`
      )
      .join("");
    actionButtons = `<div class="wb-idea-actions">
      ${pwBtns}
      <button type="button" class="wb-new-pw-mini-btn" data-action="wb-start-pathway" data-idea-id="${escapeHtml(idea.id)}" title="Start a separate new Pathway with this idea">
        + New
      </button>
    </div>`;
  } else {
    const items = pwList
      .map(
        (pw, idx) =>
          `<button type="button" data-action="wb-add-to-pathway" data-idea-id="${escapeHtml(idea.id)}" data-pathway-id="${escapeHtml(pw.id)}">+ Pathway #${idx + 1} — ${escapeHtml(pw.title || "Pathway")}</button>`
      )
      .join("");
    actionButtons = `<div class="wb-idea-actions">
      <details class="ontology-pop-menu wb-add-pw-menu" data-menu="add-pw">
        <summary class="wb-mint-idea-btn">+ Add to Pathway ▾</summary>
        <div class="ontology-pop-list">${items}</div>
      </details>
      <button type="button" class="wb-new-pw-mini-btn" data-action="wb-start-pathway" data-idea-id="${escapeHtml(idea.id)}" title="Start a separate new Pathway with this idea">
        + New
      </button>
    </div>`;
  }

  const collapseBtn = collapseChevronBtn(
    `wb-idea:${idea.id}`,
    collapsed,
    idea.title || "Idea"
  );

  if (collapsed) {
    return `<article class="wb-idea-card is-collapsed${idea.artUrl ? " has-art" : ""}" data-wb-draft-id="${escapeHtml(idea.id)}" draggable="true">
      <header class="wb-draft-head is-collapsed-bar">
        ${collapseBtn}
        <span class="wb-lens-tag is-${escapeHtml(idea.method || "seed")}">${escapeHtml(idea.lensLabel || "Idea")}</span>
        ${worldDot(idea.world)}
        <strong class="wb-idea-collapsed-title" title="${escapeHtml(idea.title)}">${escapeHtml(idea.title)}</strong>
        <button type="button" class="ontology-icon-btn is-remove" data-action="wb-delete-draft" data-draft-id="${escapeHtml(idea.id)}" aria-label="Delete idea ${escapeHtml(idea.title)}" title="Discard idea">×</button>
      </header>
    </article>`;
  }

  return `<article class="wb-idea-card${idea.artUrl ? " has-art" : ""}" data-wb-draft-id="${escapeHtml(idea.id)}" draggable="true">
    <header class="wb-draft-head">
      ${collapseBtn}
      <span class="wb-lens-tag is-${escapeHtml(idea.method || "seed")}">${escapeHtml(idea.lensLabel || "Idea")}</span>
      ${worldBadge(idea.world)}
      ${metaBadges}
      <button type="button" class="ontology-icon-btn is-remove" data-action="wb-delete-draft" data-draft-id="${escapeHtml(idea.id)}" aria-label="Delete idea ${escapeHtml(idea.title)}" title="Discard idea">×</button>
    </header>
    <div class="wb-idea-main">
      <div class="wb-idea-thumb">${artThumb}</div>
      <div class="wb-idea-body">
        <strong class="wb-draft-title">${escapeHtml(idea.title)}</strong>
        <p class="wb-draft-how">${escapeHtml(idea.howText)}</p>
      </div>
    </div>
    <footer class="wb-draft-foot">
      <div class="wb-draft-meta">
        ${idea.eases ? `<span class="ontology-eases-tag">Aims at: ${escapeHtml(idea.eases)}</span>` : ""}
        ${remixMenu}
      </div>
      ${actionButtons}
    </footer>
  </article>`;
}

function renderWorkbenchVisualPathway(
  pw,
  pwIndex,
  wb,
  view,
  crises,
  wires,
  enforceWorlds,
  collapsed = false
) {
  const ings = pw.ingredients || [];
  const multi = ings.length > 1;
  const isTarget = wb?.targetPathwayId === pw.id;
  const pwNum = pwIndex + 1;
  const convPairs = new Set(
    (pw.convergences || []).flatMap((c) => {
      if (c.aId && c.bId) return [`${c.aId}|${c.bId}`, `${c.bId}|${c.aId}`];
      return [];
    })
  );

  const trackNameById = new Map(
    (view?.tracks || []).map((t) => [t.techId, t.name || t.techId])
  );

  const tilesHtml = ings
    .map((ing, idx) => {
      const nextIng = ings[idx + 1];
      const isConvLink = Boolean(nextIng && convPairs.has(`${ing.id}|${nextIng.id}`));
      const artContent = ing.artUrl
        ? `<img class="wb-inv-art" src="${escapeHtml(ing.artUrl)}" alt="${escapeHtml(ing.title)}" loading="lazy" draggable="false" />`
        : ing.artPending
          ? `<div class="wb-inv-shimmer" aria-label="Visualizing idea"><span>🎨 Painting…</span></div>`
          : `<div class="wb-inv-fallback is-${escapeHtml(normalizeWorld(ing.world))}">
              ${worldIconSvg(ing.world)}
              <span>${escapeHtml(ing.techId || "Human")}</span>
            </div>`;
      const techLabel = ing.techId
        ? trackNameById.get(ing.techId) || ing.techId
        : "Human step";
      const worldMeta = WORLD_META[normalizeWorld(ing.world)] || WORLD_META.bits;

      const tile = `<div class="wb-inv-tile${multi ? " is-part" : " is-solo"}" data-wb-ing-drag="${escapeHtml(pw.id)}:${escapeHtml(ing.id)}" draggable="true" title="${escapeHtml(ing.howText ? `${ing.title}: ${ing.howText} (drag to move or return)` : "Drag back to Ideas or into another Pathway")}">
        <div class="wb-inv-art-box">
          ${artContent}
          <span class="wb-inv-world-overlay">${worldDot(ing.world)}</span>
        </div>
        <div class="wb-inv-caption">
          <div class="wb-inv-caption-top">
            <strong class="wb-inv-title" title="${escapeHtml(ing.title)}">${escapeHtml(ing.title)}</strong>
            <button type="button" class="wb-inv-return-btn" data-action="wb-return-ingredient" data-pathway-id="${escapeHtml(pw.id)}" data-ingredient-id="${escapeHtml(ing.id)}" title="Remove from this Pathway and return to Ideas" aria-label="Return ${escapeHtml(ing.title)} to Ideas">↩</button>
          </div>
          <span class="wb-inv-meta">${escapeHtml(techLabel)} · ${escapeHtml(worldMeta.label)}</span>
        </div>
      </div>`;

      const connector = nextIng
        ? `<div class="wb-chain-link${isConvLink ? " is-conv" : ""}" title="${isConvLink ? "Convergence synergy ×1.25" : "Combined in Pathway"}">${isConvLink ? "⚡" : "+"}</div>`
        : "";
      return tile + connector;
    })
    .join("");

  const timingBar = renderTimingAssessment(pw);

  const convBadges = (pw.convergences || [])
    .map(
      (row) =>
        `<span class="ontology-badge is-conv" title="${escapeHtml(row.reason || "")}">⚡ ${escapeHtml(row.title || "Synergy")} ×1.25</span>`
    )
    .join("");

  const bridgeBlock =
    pw.bridge && enforceWorlds
      ? `<div class="wb-visual-bridge-warn">
          <span class="ontology-badge is-bridge">⚠️ Missing Bridge</span>
          <button type="button" class="ontology-mini-btn wb-add-bridge-btn" data-action="wb-add-human-bridge" data-pathway-id="${escapeHtml(pw.id)}">+ Human Bridge</button>
        </div>`
      : "";

  const isEditing = view?.editingPathwayId === pw.id;
  const howTextClean = String(pw.howText || "").trim();
  const scoringBanner = pw.scoring
    ? `<div class="ontology-busy-banner" role="status" aria-live="polite"><span class="ontology-spinner" aria-hidden="true"></span> Scoring pathway against plugged crises…</div>`
    : "";
  const howControls = isEditing
    ? `<div class="ontology-edit-how wb-pw-edit-how">
        <div class="wb-pw-how-head">
          <span class="wb-pw-how-kicker">Pathway mechanism</span>
        </div>
        <textarea class="ontology-textarea" data-role="pathway-how-input" data-pathway-id="${escapeHtml(pw.id)}" rows="4" maxlength="4000" ${pw.polishing ? "disabled" : ""}>${escapeHtml(pw.howText || "")}</textarea>
        ${pw.polishing ? `<div class="ontology-busy-banner" role="status"><span class="ontology-spinner" aria-hidden="true"></span> Weaving mechanism with AI…</div>` : ""}
        <div class="ontology-inline-actions">
          <button type="button" class="btn btn-primary btn-sm" data-action="save-pathway-how" data-pathway-id="${escapeHtml(pw.id)}" ${pw.polishing ? "disabled" : ""}>Save</button>
          <button type="button" class="btn btn-secondary btn-sm${pw.polishing ? " is-busy" : ""}" data-action="polish-how" data-pathway-id="${escapeHtml(pw.id)}" ${pw.polishing ? "disabled" : ""}>${pw.polishing ? `<span class="ontology-spinner" aria-hidden="true"></span> Weaving…` : "✨ Polish (AI)"}</button>
          <button type="button" class="btn btn-ghost btn-sm" data-action="cancel-edit-how" ${pw.polishing ? "disabled" : ""}>Cancel</button>
        </div>
      </div>`
    : `<div class="wb-pw-how-wrap">
        <div class="wb-pw-how-head">
          <span class="wb-pw-how-kicker">Pathway mechanism</span>
          ${pw.hasCustomHow ? `<span class="wb-pw-how-edited">Edited</span>` : ""}
        </div>
        <p class="wb-pw-how${howTextClean ? "" : " is-empty"}">${escapeHtml(
          howTextClean || "No mechanism written yet — click Edit mechanism to describe how this pathway works."
        )}</p>
        ${pw.polishing ? `<div class="ontology-busy-banner" role="status"><span class="ontology-spinner" aria-hidden="true"></span> Weaving ideas into one mechanism…</div>` : ""}
        <div class="wb-pw-how-tools">
          <button type="button" class="ontology-link-btn" data-action="edit-pathway-how" data-pathway-id="${escapeHtml(pw.id)}" ${pw.polishing ? "disabled" : ""}>✏️ Edit mechanism</button>
          ${multi ? `<button type="button" class="ontology-link-btn${pw.polishing ? " is-busy" : ""}" data-action="polish-how" data-pathway-id="${escapeHtml(pw.id)}" ${pw.polishing ? "disabled" : ""}>${pw.polishing ? `<span class="ontology-spinner" aria-hidden="true"></span> Weaving…` : "✨ Weave ideas together (AI)"}</button>` : ""}
        </div>
      </div>`;

  const connected = wires.filter((w) => w.pathwayId === pw.id);
  const plugMenu = crises.length
    ? `<details class="ontology-pop-menu" data-menu="plug">
        <summary class="ontology-pill-btn is-plug">🔌 Plug (${connected.length}/${crises.length}) ▾</summary>
        <div class="ontology-pop-list">
          ${crises
            .map((c) => {
              const wired = wires.find((w) => w.pathwayId === pw.id && w.crisisId === c.id);
              return wired
                ? `<button type="button" class="is-wired" data-action="unplug" data-wire-id="${escapeHtml(wired.id)}">✓ ${escapeHtml(c.name || c.role)} (Unplug)</button>`
                : `<button type="button" data-action="plug-pair" data-pathway-id="${escapeHtml(pw.id)}" data-crisis-id="${escapeHtml(c.id)}">→ ${escapeHtml(c.name || c.role)}</button>`;
            })
            .join("")}
        </div>
      </details>`
    : "";

  const remixMenu = `<details class="ontology-pop-menu" data-menu="remix">
      <summary class="ontology-pill-btn is-remix">🔀 Remix ▾</summary>
      <div class="ontology-pop-list">
        <button type="button" data-action="wb-remix" data-source-kind="pathway" data-source-id="${escapeHtml(pw.id)}" data-target-method="sit">📦 Into SIT</button>
        <button type="button" data-action="wb-remix" data-source-kind="pathway" data-source-id="${escapeHtml(pw.id)}" data-target-method="scamper">🔧 Into SCAMPER</button>
      </div>
    </details>`;

  const collapseBtn = collapseChevronBtn(
    `wb-pathway:${pw.id}`,
    collapsed,
    `Pathway #${pwNum}`
  );

  if (collapsed) {
    const plugPill =
      crises.length && connected.length
        ? `<span class="ontology-collapsed-pill is-lit" title="${connected.length} of ${crises.length} crises plugged">🔌 ${connected.length}/${crises.length}</span>`
        : "";
    return `<article class="wb-visual-pathway is-collapsed${multi ? " is-assembled" : ""}${isTarget ? " is-target" : ""}" data-pathway-id="${escapeHtml(pw.id)}" data-drop="wb-fuse-pathway" draggable="true">
      <header class="wb-visual-pw-head is-collapsed-bar">
        <div class="wb-pw-head-left">
          ${collapseBtn}
          <button type="button" class="wb-pw-select-btn${isTarget ? " is-on" : ""}" data-action="wb-select-pathway" data-pathway-id="${escapeHtml(pw.id)}" title="${escapeHtml(pw.title || `Pathway #${pwNum}`)}">
            ${lampDot(pw.timingLevel, pw.timingPending || pw.scoring)}
            <strong>Pathway #${pwNum}</strong>
            <span class="wb-pw-part-count">${ings.length} ${ings.length === 1 ? "idea" : "ideas"}</span>
            ${pw.title ? `<span class="wb-pw-collapsed-title">${escapeHtml(pw.title)}</span>` : ""}
          </button>
          ${plugPill}
        </div>
        <button type="button" class="wb-break-pw-btn is-compact" data-action="wb-break-pathway" data-pathway-id="${escapeHtml(pw.id)}" title="Disassemble Pathway #${pwNum} and return all ${ings.length} idea(s) back to your Ideas tray" aria-label="Break apart Pathway #${pwNum}">
          ↩
        </button>
      </header>
    </article>`;
  }

  return `<article class="wb-visual-pathway${multi ? " is-assembled" : ""}${isTarget ? " is-target" : ""}" data-pathway-id="${escapeHtml(pw.id)}" data-drop="wb-fuse-pathway" draggable="true">
    <header class="wb-visual-pw-head">
      <div class="wb-pw-head-left">
        ${collapseBtn}
        <button type="button" class="wb-pw-select-btn${isTarget ? " is-on" : ""}" data-action="wb-select-pathway" data-pathway-id="${escapeHtml(pw.id)}" title="Focus Pathway #${pwNum}">
          ${lampDot(pw.timingLevel, pw.timingPending || pw.scoring)}
          <strong>Pathway #${pwNum}</strong>
          <span class="wb-pw-part-count">${ings.length} ${ings.length === 1 ? "idea" : "ideas"}</span>
        </button>
      </div>
      <button type="button" class="wb-break-pw-btn" data-action="wb-break-pathway" data-pathway-id="${escapeHtml(pw.id)}" title="Disassemble Pathway #${pwNum} and return all ${ings.length} idea(s) back to your Ideas tray">
        ↩ Break apart
      </button>
    </header>
    <div class="wb-visual-chain">
      ${tilesHtml}
      <div class="wb-pw-slot-hint" aria-hidden="true">+ Drop an Idea here to combine into Pathway #${pwNum}</div>
    </div>
    ${timingBar}
    ${scoringBanner}
    ${convBadges ? `<div class="ontology-badges">${convBadges}</div>` : ""}
    ${bridgeBlock}
    ${howControls}
    <footer class="wb-visual-pw-foot">
      <div class="wb-pw-foot-left">
        ${remixMenu}
        ${plugMenu}
      </div>
      <span class="wb-pw-drag-grip" title="Drag this Pathway onto a Crisis in Lane 4 on the right">⋮⋮ Drag to Crisis →</span>
    </footer>
  </article>`;
}

function renderDoubleDiamondNav(wb, ideaCount, pathwayCount) {
  const isProblem = wb.diamond === "problem";
  const hasBrief = Boolean(String(wb.hmwBrief || "").trim());
  const d1Status = hasBrief ? "✓ Brief defined" : "No brief yet";
  const d2Status = `${ideaCount} ${ideaCount === 1 ? "idea" : "ideas"} · ${pathwayCount} ${pathwayCount === 1 ? "pathway" : "pathways"}`;

  return `<nav class="wb-dd-nav" aria-label="Design Thinking Double Diamond">
    <button type="button" class="wb-dd-diamond is-d1${isProblem ? " is-active" : ""}${hasBrief ? " is-done" : ""}" data-action="wb-set-diamond" data-diamond="problem" aria-pressed="${isProblem ? "true" : "false"}"${!isProblem ? ' title="Switch to Diamond 1: Problem Space"' : ""}>
      <svg class="wb-dd-bg-svg" viewBox="0 0 320 64" preserveAspectRatio="none" aria-hidden="true">
        <polygon points="8,32 160,4 312,32 160,60" />
        <line x1="160" y1="6" x2="160" y2="58" stroke-dasharray="3 3" />
      </svg>
      <div class="wb-dd-content">
        <div class="wb-dd-top">
          <span class="wb-dd-kicker">DIAMOND 1 · PROBLEM SPACE</span>
          <span class="wb-dd-top-right">
            <span class="wb-dd-status${hasBrief ? " is-ok" : ""}">${escapeHtml(d1Status)}</span>
            ${!isProblem ? `<span class="wb-dd-chevron" aria-hidden="true">›</span>` : ""}
          </span>
        </div>
        <div class="wb-dd-phases">
          <span class="wb-dd-phase"><strong>◇ 1 · Discover</strong> <em>Unpack tensions</em></span>
          <span class="wb-dd-arrow" aria-hidden="true">→</span>
          <span class="wb-dd-phase"><strong>◆ 2 · Define</strong> <em>How Might We…</em></span>
        </div>
      </div>
    </button>

    <div class="wb-dd-waist" aria-hidden="true" title="Defined problem brief anchors ideation">◆→◇</div>

    <button type="button" class="wb-dd-diamond is-d2${!isProblem ? " is-active" : ""}" data-action="wb-set-diamond" data-diamond="solution" aria-pressed="${!isProblem ? "true" : "false"}"${isProblem ? ' title="Switch to Diamond 2: Solution Space"' : ""}>
      <svg class="wb-dd-bg-svg" viewBox="0 0 320 64" preserveAspectRatio="none" aria-hidden="true">
        <polygon points="8,32 160,4 312,32 160,60" />
        <line x1="160" y1="6" x2="160" y2="58" stroke-dasharray="3 3" />
      </svg>
      <div class="wb-dd-content">
        <div class="wb-dd-top">
          <span class="wb-dd-kicker">DIAMOND 2 · SOLUTION SPACE</span>
          <span class="wb-dd-top-right">
            <span class="wb-dd-status">${escapeHtml(d2Status)}</span>
            ${isProblem ? `<span class="wb-dd-chevron" aria-hidden="true">›</span>` : ""}
          </span>
        </div>
        <div class="wb-dd-phases">
          <span class="wb-dd-phase"><strong>◇ 3 · Develop</strong> <em>Ideas</em></span>
          <span class="wb-dd-arrow" aria-hidden="true">→</span>
          <span class="wb-dd-phase"><strong>◆ 4 · Deliver</strong> <em>Pathways</em></span>
        </div>
      </div>
    </button>
  </nav>`;
}

function renderWorkbenchDiamond1(wb) {
  const cluesHtml = (wb.discoveryClues || [])
    .map(
      (clue) => `<div class="wb-clue-card${clue.selected ? " is-selected" : ""}">
        <button type="button" class="wb-clue-main" data-action="wb-toggle-clue" data-clue-id="${escapeHtml(clue.id)}" aria-pressed="${clue.selected ? "true" : "false"}">
          <div class="wb-clue-head">
            <span class="wb-clue-badge">${escapeHtml(clue.badge || "Clue")}</span>
            <span class="wb-clue-check" aria-hidden="true">${clue.selected ? "✓ Pinned" : "+ Pin"}</span>
          </div>
          <strong class="wb-clue-title">${escapeHtml(clue.title)}</strong>
          <p class="wb-clue-detail">${escapeHtml(clue.detail)}</p>
        </button>
        ${clue.removable ? `<button type="button" class="ontology-icon-btn is-remove wb-clue-del" data-action="wb-remove-clue" data-clue-id="${escapeHtml(clue.id)}" title="Remove insight" aria-label="Remove insight">×</button>` : ""}
      </div>`
    )
    .join("");

  const discoverBusy = Boolean(wb.busy && wb.busyKind === "discover");
  const defineBusy = Boolean(wb.busy && wb.busyKind === "define");

  const activeBrief = String(wb.hmwBrief || "").trim();
  const hmwList = wb.hmwCandidates || [];
  const hmwCardsHtml = hmwList.length
    ? hmwList
        .map((item) => {
          const isChosen =
            Boolean(activeBrief) &&
            activeBrief.toLowerCase() === String(item.howText || "").trim().toLowerCase();
          return `<div class="wb-hmw-card${isChosen ? " is-on" : ""}">
            <button type="button" class="wb-hmw-option${isChosen ? " is-on" : ""}" data-action="wb-pick-hmw" data-hmw="${escapeHtml(item.howText)}" aria-pressed="${isChosen ? "true" : "false"}">
              <div class="wb-hmw-head">
                <span class="wb-hmw-tag">${escapeHtml(item.tag || "How Might We")}</span>
                <span class="wb-hmw-check" aria-hidden="true">${isChosen ? "✓ Selected" : "+ Select"}</span>
              </div>
              <p class="wb-hmw-text">${escapeHtml(item.howText)}</p>
            </button>
            <button type="button" class="ontology-icon-btn is-remove wb-hmw-del" data-action="wb-remove-hmw" data-hmw-id="${escapeHtml(item.id || "")}" data-hmw="${escapeHtml(item.howText)}" title="Remove problem frame" aria-label="Remove problem frame">×</button>
          </div>`;
        })
        .join("")
    : `<div class="wb-empty-bench wb-hmw-empty">
        <p>No suggested problem frames left — write your own brief below, click <strong>✨ Draft HMW Options (AI)</strong>${wb.dismissedHmwCount > 0 ? `, or <button type="button" class="ontology-link-btn" data-action="wb-restore-hmw">Restore defaults</button>` : ""}.</p>
      </div>`;

  return `<div class="wb-diamond2 wb-problem-grid" aria-label="Diamond 1: Problem Discovery and Definition">
    <div class="wb-col wb-discover">
      <div class="wb-col-head">
        <span class="wb-col-title">◇ 1 · DISCOVER</span>
        <span class="wb-col-sep" aria-hidden="true">·</span>
        <span class="wb-col-sub">Unpack the problem</span>
      </div>
      <p class="wb-stage-lead">Explore what is really happening on the ground before jumping to solutions. Pin the tensions that matter most — or add your own field observation.</p>
      <div class="wb-clue-list">${cluesHtml}</div>
      ${discoverBusy ? `<div class="ontology-busy-banner" role="status"><span class="ontology-spinner" aria-hidden="true"></span> Unpacking hidden ground tensions…</div>` : ""}
      <div class="wb-prompt-box wb-discover-composer">
        <label class="wb-field-label" for="wb-discovery-input">What else is scarce, broken, or overlooked in this place?</label>
        <input id="wb-discovery-input" type="text" class="wb-scarcity-input" data-role="wb-discovery-input" maxlength="240" value="${escapeHtml(wb.discoveryInput || "")}" placeholder="e.g. Cargo must cross cut-off terrain where there are no all-season roads…" />
        <div class="wb-prompt-actions">
          <button type="button" class="btn btn-primary btn-sm" data-action="wb-add-insight">+ Add Insight</button>
          <span class="wb-actions-sep"></span>
          <button type="button" class="btn btn-secondary btn-sm${discoverBusy ? " is-busy" : ""}" data-action="wb-deal-discover-ai" ${wb.busy ? "disabled" : ""}>
            ${discoverBusy ? `<span class="ontology-spinner" aria-hidden="true"></span> Unpacking…` : "✨ Unpack Hidden Tensions (AI)"}
          </button>
        </div>
      </div>
    </div>

    <div class="wb-col wb-define">
      <div class="wb-col-head">
        <span class="wb-col-title">◆ 2 · DEFINE</span>
        <span class="wb-col-sep" aria-hidden="true">·</span>
        <span class="wb-col-sub">Frame "How Might We…"</span>
      </div>
      <p class="wb-stage-lead">Converge your pinned tensions into one sharp <strong>How Might We…</strong> question (naming who, desired outcome, and key constraint — without locking in a gadget yet).</p>
      <div class="wb-bench-head">
        <span>Suggested Problem Frames</span>
        <button type="button" class="ontology-link-btn wb-hmw-ai-btn${defineBusy ? " is-busy" : ""}" data-action="wb-deal-hmw-ai" ${wb.busy ? "disabled" : ""}>
          ${defineBusy ? `<span class="ontology-spinner" aria-hidden="true"></span> Drafting…` : "✨ Draft HMW Options (AI)"}
        </button>
      </div>
      ${defineBusy ? `<div class="ontology-busy-banner" role="status"><span class="ontology-spinner" aria-hidden="true"></span> Drafting "How Might We…" problem frames…</div>` : ""}
      <div class="wb-hmw-list">${hmwCardsHtml}</div>
      <div class="wb-define-box">
        <div class="wb-define-box-head">
          <label class="wb-field-label" for="wb-hmw-textarea">◆ Your Defined Design Brief ("How Might We…")</label>
          ${wb.hmwBrief ? `<button type="button" class="ontology-link-btn is-dismiss" data-action="wb-clear-hmw">Clear</button>` : ""}
        </div>
        <textarea id="wb-hmw-textarea" class="ontology-textarea wb-hmw-textarea" data-role="wb-hmw-input" rows="3" maxlength="280" placeholder="Click a suggested frame above or write your own: How might we help…">${escapeHtml(wb.hmwBrief || "")}</textarea>
        <div class="wb-define-actions">
          <button type="button" class="btn btn-primary btn-sm wb-lock-hmw-btn" data-action="wb-lock-hmw">
            ◆ Lock Brief &amp; Develop Ideas →
          </button>
          <button type="button" class="btn btn-ghost btn-sm" data-action="wb-set-diamond" data-diamond="solution">
            Skip to Ideas →
          </button>
        </div>
      </div>
    </div>
  </div>`;
}

function renderWorkbenchDiamond2(
  view,
  wb,
  useCases,
  pathways,
  crises,
  wires,
  selected,
  collapsedSet = new Set()
) {
  const ideasBusy = Boolean(wb.busy && (!wb.busyKind || wb.busyKind === "ideas"));
  const tabsHtml = (wb.methods || [])
    .map(
      (m) => `<button type="button" class="wb-method-tab${wb.method === m.id ? " is-on" : ""}" data-action="wb-set-method" data-method="${escapeHtml(m.id)}" role="tab" aria-selected="${wb.method === m.id ? "true" : "false"}">
        <span>${m.icon} ${escapeHtml(m.label)}</span>
      </button>`
    )
    .join("");

  const methodControlsHtml = renderWorkbenchMethodControls(wb, useCases, selected);

  let aiDealBtns = "";
  if (wb.method === "sit") {
    aiDealBtns = `<button type="button" class="btn btn-secondary btn-sm${ideasBusy ? " is-busy" : ""}" data-action="wb-deal-ai" data-scope="focused" ${wb.busy ? "disabled" : ""}>
      ${ideasBusy ? `<span class="ontology-spinner" aria-hidden="true"></span> Dealing…` : "✨ Deal 1 SIT Idea (AI)"}
    </button>
    <button type="button" class="btn btn-ghost btn-sm" data-action="wb-deal-ai" data-scope="all" ${wb.busy ? "disabled" : ""} title="Generate one idea for each of the 4 closed-world SIT lenses">✨ All 4</button>`;
  } else if (wb.method === "scamper") {
    const n = (wb.scamperLetters || []).length || 1;
    aiDealBtns = `<button type="button" class="btn btn-secondary btn-sm${ideasBusy ? " is-busy" : ""}" data-action="wb-deal-ai" data-scope="focused" ${wb.busy ? "disabled" : ""}>
      ${ideasBusy ? `<span class="ontology-spinner" aria-hidden="true"></span> Dealing…` : `✨ Deal ${n} SCAMPER ${n === 1 ? "Idea" : "Ideas"} (AI)`}
    </button>`;
  } else {
    aiDealBtns = `<button type="button" class="btn btn-secondary btn-sm${ideasBusy ? " is-busy" : ""}" data-action="wb-deal-ai" data-scope="focused" ${wb.busy ? "disabled" : ""}>
      ${ideasBusy ? `<span class="ontology-spinner" aria-hidden="true"></span> Dealing…` : "✨ Deal 3 Ideas (AI)"}
    </button>`;
  }

  const ideasList = wb.ideas || wb.drafts || [];
  const ideaCount = ideasList.length;
  const ideasHtml = ideaCount
    ? ideasList
        .map((idea) =>
          renderWorkbenchIdeaCard(idea, wb, pathways, collapsedSet.has(`wb-idea:${idea.id}`))
        )
        .join("")
    : `<div class="wb-empty-bench">
        <p><strong>Ideas</strong> — Explore freely here, then assemble your strongest ideas into a Pathway.</p>
        <p>Write your own idea above, click <strong>✨ Deal AI</strong>, or click <strong>↩ Break apart</strong> on any Pathway to return its ideas here for reuse.</p>
      </div>`;

  const enforce = view?.enforceWorlds !== false;
  const visualPathwaysHtml = pathways
    .map((pw, idx) =>
      renderWorkbenchVisualPathway(
        pw,
        idx,
        wb,
        view,
        crises,
        wires,
        enforce,
        collapsedSet.has(`wb-pathway:${pw.id}`)
      )
    )
    .join("");

  const newPathwaySlot = pathways.length
    ? `<div class="wb-new-pathway-drop is-compact" data-drop="wb-new-pathway">
        <span>+ Drop an Idea here (or click <strong>+ New</strong> on an Idea) to start a separate Pathway</span>
      </div>`
    : `<div class="wb-assemble-empty wb-new-pathway-drop" data-drop="wb-new-pathway">
        <div class="wb-visual-flow" aria-hidden="true">
          <span class="wb-flow-node is-art">🖼️ Idea</span>
          <span class="wb-flow-arrow">+</span>
          <span class="wb-flow-node is-art">🖼️ Idea</span>
          <span class="wb-flow-arrow">→</span>
          <span class="wb-flow-node">⚡ Pathway</span>
          <span class="wb-flow-arrow">→</span>
          <span class="wb-flow-node is-plug">🔌 Crisis</span>
        </div>
        <p>Click <strong>→ Start Pathway</strong> on an Idea on the left (or drag it here) to begin Pathway #1.</p>
        <p>Add more Ideas directly into it, or click <strong>↩ Break apart</strong> anytime to return Ideas to your bench and build different Pathways.</p>
      </div>`;

  const hasBrief = Boolean(String(wb.hmwBrief || "").trim());
  const hmwBanner = hasBrief
    ? `<div class="wb-hmw-banner is-locked">
        <span class="wb-hmw-banner-kicker">◆ Design Brief</span>
        <strong class="wb-hmw-banner-text">${escapeHtml(wb.hmwBrief)}</strong>
        <button type="button" class="ontology-link-btn" data-action="wb-set-diamond" data-diamond="problem">✎ Reframe in Diamond 1</button>
      </div>`
    : `<div class="wb-hmw-banner is-empty">
        <span>◇ Want sharper ideas? Frame your <strong>How Might We…</strong> problem brief in Diamond 1 first.</span>
        <button type="button" class="ontology-link-btn" data-action="wb-set-diamond" data-diamond="problem">← Open Diamond 1</button>
      </div>`;

  return `${hmwBanner}
  <div class="wb-diamond2">
    <div class="wb-col wb-diverge">
      <div class="wb-col-head">
        <span class="wb-col-title">◇ 3 · DEVELOP</span>
        <span class="wb-col-sep" aria-hidden="true">·</span>
        <span class="wb-col-sub">Generate &amp; remix ideas</span>
      </div>
      <div class="wb-method-tabs" role="tablist" aria-label="Ideation methods">${tabsHtml}</div>
      ${methodControlsHtml}
      <div class="wb-prompt-box">
        <p class="wb-prompt-q">${escapeHtml(wb.prompt?.question || "")}</p>
        ${wb.prompt?.hint ? `<p class="wb-prompt-hint">${escapeHtml(wb.prompt.hint)}</p>` : ""}
        <input type="text" class="wb-draft-title-input" data-role="wb-draft-title" maxlength="72" value="${escapeHtml(wb.draftTitle || "")}" placeholder="Short idea title (optional)" />
        <textarea class="ontology-textarea wb-draft-textarea" data-role="wb-draft-text" rows="2" maxlength="1200" placeholder="Write your own idea in 1–2 concrete sentences…">${escapeHtml(wb.draftText || "")}</textarea>
        <div class="wb-prompt-actions">
          <button type="button" class="btn btn-primary btn-sm" data-action="wb-add-player-draft">+ Save Idea</button>
          <button type="button" class="btn btn-ghost btn-sm" data-action="wb-add-human-draft" title="Create a Human Bridge idea card">+ Human Idea</button>
          ${view?.voiceSupported ? `<button type="button" class="btn btn-ghost btn-sm${view?.voiceActive ? " is-voice-live" : ""}" data-action="toggle-voice" title="Talk through this lens with the AI co-inventor">🎙️</button>` : ""}
          <span class="wb-actions-sep"></span>
          ${aiDealBtns}
        </div>
      </div>
      ${ideasBusy ? `<div class="ontology-busy-banner" role="status"><span class="ontology-spinner" aria-hidden="true"></span> Generating illustrated idea cards…</div>` : ""}
      <div class="wb-bench-head">
        <span>Ideas (${ideaCount})</span>
        ${ideaCount > 0 ? `<button type="button" class="ontology-link-btn is-dismiss" data-action="wb-clear-drafts">Clear ideas</button>` : ""}
      </div>
      <div class="wb-drafts-bench" data-drop="wb-ideas-bench">${ideasHtml}</div>
    </div>

    <div class="wb-col wb-converge">
      <div class="wb-col-head">
        <span class="wb-col-title">◆ 4 · DELIVER</span>
        <span class="wb-col-sep" aria-hidden="true">·</span>
        <span class="wb-col-sub">Assemble pathways</span>
      </div>
      <div class="wb-assemble-canvas${pathways.length ? " has-items" : ""}" data-drop="wb-assemble-canvas">
        <div class="wb-bench-head">
          <span>Pathways (${pathways.length})</span>
          <span class="wb-active-tip">↩ Break apart anytime to reuse Ideas</span>
        </div>
        <div class="wb-visual-list">
          ${visualPathwaysHtml}
          ${newPathwaySlot}
        </div>
      </div>
    </div>
  </div>`;
}

function renderWorkbenchStudio(
  view,
  wb,
  tracks,
  useCases,
  pathways,
  crises,
  wires,
  selected,
  collapsedSet = new Set()
) {
  const ideasList = wb.ideas || wb.drafts || [];
  const ideaCount = ideasList.length;
  const ddNav = renderDoubleDiamondNav(wb, ideaCount, pathways.length);
  const bodyHtml =
    wb.diamond === "problem"
      ? renderWorkbenchDiamond1(wb)
      : renderWorkbenchDiamond2(
          view,
          wb,
          useCases,
          pathways,
          crises,
          wires,
          selected,
          collapsedSet
        );

  return `<section id="ontology-lane-pathway" class="ontology-lane ontology-workbench" data-lane="pathway" data-drop="pathway" aria-label="Innovation Workbench">
    <header class="wb-head">
      <div class="wb-head-left">
        <h2><span class="ontology-lane-num">3</span> Innovation Workbench</h2>
        <span class="wb-head-sep" aria-hidden="true">/</span>
        <span class="wb-head-subtitle">Design Thinking · Double Diamond</span>
      </div>
      <div class="wb-head-right">
        <button type="button" class="ontology-mini-btn is-accent" id="btn-close-workbench" data-action="toggle-workbench" title="Collapse back to 4-lane circuit view">⤡ Collapse</button>
      </div>
    </header>
    ${ddNav}
    ${bodyHtml}
  </section>`;
}

/**
 * Measure live port positions inside `[data-lanes-stage]` and draw crisp,
 * scroll-accurate cubic Bezier wires across all 3 lane gaps (`1→2`, `2→3`, `3→4`),
 * plus position Challenger Roadblock tokens directly at wire midpoints.
 * When `opts.highlight` is provided, active causal-chain wires render in the
 * foreground SVG overlay while unrelated wires recede cleanly behind lanes.
 * No-op in headless Node tests.
 *
 * @param {HTMLElement|null} root
 * @param {{ wires?: object[], highlight?: object|null }} [opts]
 */
export function syncOntologyWireGeometry(root, opts = {}) {
  if (!root || typeof window === "undefined") return;
  const stage = root.querySelector?.("[data-lanes-stage]");
  const baseSvg = stage?.querySelector?.("svg.ontology-wires:not(.is-active-layer)");
  const activeSvg = stage?.querySelector?.("svg.ontology-wires.is-active-layer");
  if (!stage || !baseSvg || typeof stage.getBoundingClientRect !== "function") return;
  if (stage.classList?.contains("is-workbench-open")) {
    baseSvg.innerHTML = "";
    if (activeSvg) activeSvg.innerHTML = "";
    return;
  }

  const stageRect = stage.getBoundingClientRect();
  const w = Math.max(stage.scrollWidth || 0, Math.round(stageRect.width));
  const h = Math.max(stage.scrollHeight || 0, Math.round(stageRect.height));
  if (w < 40 || h < 40) return;

  for (const svg of [baseSvg, activeSvg]) {
    if (!svg) continue;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.style.width = `${w}px`;
    svg.style.height = `${h}px`;
  }

  const centerOf = (el) => {
    if (!el || typeof el.getBoundingClientRect !== "function") return null;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return null;
    return {
      x: r.left - stageRect.left + stage.scrollLeft + r.width / 2,
      y: r.top - stageRect.top + stage.scrollTop + r.height / 2,
    };
  };

  const bezier = (p1, p2) => {
    const span = Math.abs(p2.x - p1.x);
    const dx = span >= 8 ? Math.max(18, Math.min(span * 0.42, 140)) : 16;
    return `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} C ${(p1.x + dx).toFixed(1)} ${p1.y.toFixed(1)}, ${(p2.x - dx).toFixed(1)} ${p2.y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  };

  const highlight = opts.highlight || null;
  const basePaths = [];
  const activePaths = [];

  const pushPath = (markup, isHit) => {
    if (highlight && isHit && activeSvg) activePaths.push(markup);
    else basePaths.push(markup);
  };

  // Tier 1: Lane 1 Milestone (or Tech card for custom use cases) -> Lane 2 Use Case
  for (const ucPort of stage.querySelectorAll("[data-port-uc-in]")) {
    const msId = ucPort.getAttribute("data-from-ms");
    const techId = ucPort.getAttribute("data-from-tech");
    const ucId = ucPort.getAttribute("data-port-uc-in");
    if ((!msId && !techId) || !ucId) continue;
    const msPort = msId
      ? stage.querySelector(`[data-port-ms="${CSS?.escape ? CSS.escape(msId) : msId}"]`)
      : null;
    const p1 =
      (msPort ? centerOf(msPort) : null) ||
      (techId
        ? centerOf(
            stage.querySelector(`[data-port-tech="${CSS?.escape ? CSS.escape(techId) : techId}"]`)
          )
        : null);
    const p2 = centerOf(ucPort);
    if (!p1 || !p2) continue;
    const tone = ucPort.getAttribute("data-wire-tone") === "early" ? "early" : "solid";
    const dash = tone === "early" ? ` stroke-dasharray="6 5"` : "";
    const edgeKey = msId ? `${msId}->${ucId}` : `tech:${techId}->${ucId}`;
    const isHit = Boolean(highlight && highlight.tier1Edges?.has(edgeKey));
    const hlCls = highlight ? (isHit ? " is-highlighted" : " is-dimmed") : "";
    pushPath(
      `<path class="ontology-wire-path is-tier-1${hlCls}" data-wire-state="${tone}" d="${bezier(p1, p2)}"${dash} />`,
      isHit
    );
  }

  // Tier 2: Lane 2 Use Case -> Lane 3 Pathway, plus direct Lane 1 Tech -> Lane 3 Pathway
  // (when an ingredient was invented directly from a Tech or Convergence Canvas without a Lane 2 Use Case).
  for (const pwPort of stage.querySelectorAll("[data-port-pw-in]")) {
    const pwId = pwPort.getAttribute("data-port-pw-in");
    if (!pwId) continue;
    const p2 = centerOf(pwPort);
    if (!p2) continue;

    const ucCsv = pwPort.getAttribute("data-from-ucs") || "";
    for (const ucId of ucCsv.split(",").filter(Boolean)) {
      const ucOut = stage.querySelector(`[data-port-uc-out="${CSS?.escape ? CSS.escape(ucId) : ucId}"]`);
      const p1 = centerOf(ucOut);
      if (!p1) continue;
      const ucIn = stage.querySelector(`[data-port-uc-in="${CSS?.escape ? CSS.escape(ucId) : ucId}"]`);
      const tone = ucIn?.getAttribute("data-wire-tone") === "early" ? "early" : "link";
      const dash = tone === "early" ? ` stroke-dasharray="6 5"` : "";
      const isHit = Boolean(highlight && highlight.tier2Edges?.has(`${ucId}->${pwId}`));
      const hlCls = highlight ? (isHit ? " is-highlighted" : " is-dimmed") : "";
      pushPath(
        `<path class="ontology-wire-path is-tier-2${hlCls}" data-wire-state="${tone === "early" ? "early" : "solid"}" d="${bezier(p1, p2)}"${dash} />`,
        isHit
      );
    }

    const techCsv = pwPort.getAttribute("data-from-techs") || "";
    for (const techId of techCsv.split(",").filter(Boolean)) {
      const techOut = stage.querySelector(
        `[data-port-tech="${CSS?.escape ? CSS.escape(techId) : techId}"]`
      );
      const p1 = centerOf(techOut);
      if (!p1) continue;
      const isHit = Boolean(highlight && highlight.tier2Edges?.has(`tech:${techId}->${pwId}`));
      const hlCls = highlight ? (isHit ? " is-highlighted" : " is-dimmed") : "";
      const markup = `<path class="ontology-wire-path is-tier-2 is-direct-tech${hlCls}" data-wire-state="solid" data-from-tech="${escapeHtml(techId)}" data-to-pw="${escapeHtml(pwId)}" d="${bezier(p1, p2)}" />`;
      // When no chain highlight is active, draw direct Tech -> Pathway wires in the foreground
      // SVG layer so they stay visible across empty Lane 2 rather than hiding behind Lane 2's card surface.
      if ((!highlight || isHit) && activeSvg) activePaths.push(markup);
      else basePaths.push(markup);
    }
  }

  // Tier 3: Lane 3 Pathway -> Lane 4 Crisis (+ midpoint tokens for Wire Roadblocks)
  const wires = Array.isArray(opts.wires) ? opts.wires : [];
  for (const wire of wires) {
    const escPw = CSS?.escape ? CSS.escape(wire.pathwayId) : wire.pathwayId;
    const escCr = CSS?.escape ? CSS.escape(wire.crisisId) : wire.crisisId;
    const p1 = centerOf(stage.querySelector(`[data-port-pw-out="${escPw}"]`));
    const p2 = centerOf(stage.querySelector(`[data-port-crisis-in="${escCr}"]`));
    if (!p1 || !p2) continue;
    const blocked = (wire.challengers || []).some((ch) => ch.lamp === "red");
    const stateAttr = wire.state === "early" ? "early" : "solid";
    const lampAttr =
      wire.state === "early"
        ? "early"
        : wire.pending || wire.summoning
          ? "pending"
          : blocked
            ? "blocked"
            : wire.lamp || "solid";
    const dash =
      wire.state === "early"
        ? ` stroke-dasharray="8 6"`
        : wire.pending || wire.summoning
          ? ` stroke-dasharray="10 6"`
          : "";
    const isHit = Boolean(highlight && highlight.wireIds?.has(wire.id));
    const hlCls = highlight ? (isHit ? " is-highlighted" : " is-dimmed") : "";

    if (blocked) {
      const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      pushPath(
        `<path class="ontology-wire-path is-tier-3${hlCls}" data-wire-id="${escapeHtml(wire.id)}" data-wire-state="${stateAttr}" data-wire-lamp="solid" d="${bezier(p1, mid)}" />`,
        isHit
      );
      pushPath(
        `<path class="ontology-wire-path is-tier-3 is-halted${hlCls}" data-wire-state="early" data-wire-lamp="blocked" d="${bezier(mid, p2)}" stroke-dasharray="5 6" />`,
        isHit
      );
    } else {
      pushPath(
        `<path class="ontology-wire-path is-tier-3${hlCls}" data-wire-id="${escapeHtml(wire.id)}" data-wire-state="${stateAttr}" data-wire-lamp="${escapeHtml(lampAttr)}" d="${bezier(p1, p2)}"${dash} />`,
        isHit
      );
    }

    const escWire = CSS?.escape ? CSS.escape(wire.id) : wire.id;
    const token = stage.querySelector(`[data-wire-token="${escWire}"]`);
    if (token) {
      token.style.left = `${((p1.x + p2.x) / 2).toFixed(1)}px`;
      token.style.top = `${((p1.y + p2.y) / 2).toFixed(1)}px`;
      token.style.opacity = "";
    }
  }

  baseSvg.innerHTML = basePaths.join("");
  if (activeSvg) activeSvg.innerHTML = activePaths.join("");
}

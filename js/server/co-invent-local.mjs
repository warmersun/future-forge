/**
 * Shared offline co-inventor.
 * The game server and the portal both import this so the local fallback
 * and the invent hints cannot drift into two copies.
 */

import { sanitizeSuggestedWhy } from "../tech-why.js";
import {
  localScenariosForGlobal,
  globalById,
  allTechIds,
  VISION_THEME_IDS,
  GAME,
} from "../data.js";
import { SUMMARY_CAP } from "../quest-summary.js";
import { briefMdFromLivedStory } from "../brief-beats.js";
import { localIdeaSparks, rotateLocalIdeaSparks } from "../idea-cards.js";
import { localScrutinyProposals } from "../scrutiny-shared.js";
import { heuristicConverges, clampPathwayScore } from "../hex/evaluate.js";

/** Appended to invent/challenge modeHints when capability truth matters. */
const GROUNDING_HINT =
  " If context.grounding is present, treat it as authoritative Quest source-of-truth along its chain (product category, capabilities, trends/predictions, milestones, unlocked use cases → applications, honest limits); prefer that grain over generic tech-id encyclopedia; do not invent contradicting facts.";

/** Hex workshop: apply buttons focus emTech / fill mint-box or pathway how, not essay/stack. */
const HEX_INVENT_HINT =
  " Hex invent: the learner mints invention tiles on a hex board. There is no inventionName. hexBoard.pathways[] is each connected island of PLACED tiles as ONE invent (howText = that island's inventHow). Geometry says which pathway addresses which given — there is no board-wide how. proposals.addTechIds focus the emTech picker. When you draft how something works, put the full draft sentences in message AND the same text in proposals.inventionHow (the button applies that field; the player must be able to read it). Set proposals.howTarget to mint or pathway, and put the same draft in proposals.inventionHow. mint fills the How it works box for a new tile they still mint and place — the button is **Use as how it works**. Use mint when they want a new tile, the invent card, or to mint; when no island is placed; or when several islands are placed and they did not name one. pathway fills one placed pathway's how — the button is **Set as this pathway's how**. Use pathway when they are talking about an island already on the board. When more than one island is placed, put that emTech id in proposals.howTechId. One island, and they are not asking for a new tile, is pathway. A placed pathway does not by itself make this draft the pathway how. Leave inventionName and inventionImpact empty/null. hexBoard.convergences[] lists pairs already judged to converge (techNames, title, reason, factor). Explain one when it matters. Do not claim a convergence that is not listed.";

/** Appended to invent modeHints when tutor mode is active. */
const TUTOR_HINT =
  " Tutor mode: one current idea per reply, taught in a short paragraph (4–8 sentences, ~80–180 words, analogy + one mechanism); full sentences; if context.spotlightAdvance is set, name that real advance, its emTech family, and where it sits on its curve once the learner has the story (never before, never as the answer); no quiz or check questions; answer the question they asked (SEQUENCE does not block a later idea); explain terms a high-school senior may not know on first use; do not dump full solutions; use context.aiTutorContext as hidden curriculum without pasting it wholesale. Answer vs send-to-read: always speak the explanation (never a URL alone); do not rewrite a lesson page; stay in chat for recaps, follow-ups after they already got that page, invent/how-it-works, and confusion after a link; after the spoken paragraph, offer the one matching RESOURCES/ILLUSTRATIONS page when this is the next SEQUENCE idea, a listed misconception fires, or they ask for the long version (https only; chat renders links and inline images).";

/**
 * Resolve optional Quest grounding string from request context.
 * @param {object|null|undefined} context
 * @returns {string|null}
 */
function resolveGrounding(context) {
  if (typeof context?.grounding === "string" && context.grounding.trim()) {
    return String(context.grounding).trim().slice(0, 50_000);
  }
  if (
    typeof context?.mission?.grounding === "string" &&
    context.mission.grounding.trim()
  ) {
    return String(context.mission.grounding).trim().slice(0, 50_000);
  }
  return null;
}

/**
 * Hidden AI tutor curriculum notes (never for player UI).
 * @param {object|null|undefined} context
 * @returns {string|null}
 */
function resolveTutorContext(context) {
  if (typeof context?.aiTutorContext === "string" && context.aiTutorContext.trim()) {
    return String(context.aiTutorContext).trim().slice(0, 50_000);
  }
  if (
    typeof context?.mission?.aiTutorContext === "string" &&
    context.mission.aiTutorContext.trim()
  ) {
    return String(context.mission.aiTutorContext).trim().slice(0, 50_000);
  }
  return null;
}

/**
 * Spotlight advance for tutor mode: { title, summary, asOf } or null.
 * Accepts the object the client sends, or a bare summary string from older clients.
 */
function resolveSpotlightAdvance(context) {
  const raw = context?.spotlightAdvance;
  if (!raw) return null;
  if (typeof raw === "string") {
    const summary = raw.trim().slice(0, 600);
    return summary ? { title: null, summary, asOf: null } : null;
  }
  if (typeof raw !== "object") return null;
  const title = String(raw.title || "").trim().slice(0, 200) || null;
  const summary = String(raw.summary || "").trim().slice(0, 600) || null;
  const asOf = String(raw.asOf || "").trim().slice(0, 32) || null;
  if (!title && !summary) return null;
  return { title, summary, asOf };
}

function isTutorMode(context) {
  // Active tutor session only — learning quests may turn tutoring off mid-play.
  if (context?.tutorMode === true) return true;
  // Backward compat: older clients sent only isLearningModule
  if (context?.tutorMode === false) return false;
  return context?.isLearningModule === true;
}

/** Short excerpt for local (offline) fallback messages. */
function groundingExcerpt(context, max = 500) {
  const g = resolveGrounding(context);
  if (!g) return "";
  const oneLine = g.replace(/\s+/g, " ").trim();
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}

/* —— Local co-inventor (always available) —— */

function localArtOfThePossible(context, selected, stack, map, base) {
  const year = context.year || 2026;
  const place = context.place || "this place";
  const focus = (selected.length ? selected : stack).slice(0, 5);
  const groundNote = groundingExcerpt(context, 500);
  const groundBlock = groundNote
    ? `\n\n**Quest grounding (authoritative):** ${groundNote}\n`
    : "";
  if (!focus.length) {
    return {
      source: "local",
      message:
        `**Art of the possible** (${year}, ${place}):\n\n` +
        `Pick at least one emTech category first — then I can map milestones, current capabilities, and unlocked use cases for this year. ` +
        `Remember: categories are always pickable; we judge *claims*, not cards.` +
        groundBlock,
      proposals: base,
      teaching: [],
    };
  }
  const lines = focus.map((id) => {
    const t = map.get(id) || {};
    const mat = t.maturity || {};
    const now = mat.now || t.summary || "Real deployments exist in some form.";
    const near = mat.near || "Broader access as costs fall and regulation settles.";
    const frontier = mat.frontier || "Transformative everyday infrastructure (stretch).";
    const milestones = Array.isArray(t.milestones) && t.milestones.length
      ? t.milestones.join("; ")
      : "Ongoing pilots and products in this category.";
    const uses = Array.isArray(t.useCasesNow) && t.useCasesNow.length
      ? t.useCasesNow.join("; ")
      : t.summary || "Applied with human oversight";
    const soft = t.readyYear || t.softHorizon;
    const softNote =
      soft && soft > year
        ? ` Soft horizon ~${soft} (near-scale often more common later — not a lock).`
        : "";
    return (
      `### ${t.name || id}\n` +
      `**Now (${year}):** ${now}\n` +
      `**Milestones:** ${milestones}\n` +
      `**Use cases unlocked:** ${uses}\n` +
      `**Near:** ${near}\n` +
      `**Frontier (stretch if claimed as routine):** ${frontier}` +
      (softNote ? `\n_${softNote}_` : "")
    );
  });
  const teaching = focus.slice(0, 4).map((id) => {
    const t = map.get(id);
    const blurb =
      (Array.isArray(t?.useCasesNow) && t.useCasesNow[0]) ||
      t?.maturity?.now ||
      t?.summary ||
      "";
    return { techId: id, blurb: String(blurb).slice(0, 400) };
  });
  return {
    source: "local",
    message:
      `**Art of the possible** — ${place}, **${year}**\n\n` +
      `Categories below are always choosable. Invent with *now* / pilot language for green timing; frontier-as-routine goes red on feasibility.` +
      groundBlock +
      `\n\n` +
      lines.join("\n\n") +
      `\n\nWant a claim that fits this year? Draft how-it-works around a pilot, partnership, or mapped corridor — then I'll stress-test timing.`,
    proposals: base,
    teaching,
  };
}

/**
 * Local SIT (Systematic Inventive Thinking) — four closed-world lenses on how-it-works.
 */
function localSitInvent(context, selected, stack, map, base) {
  const how = String(context.inventionHow || "").trim();
  const place = context.place || "this place";
  const name = context.inventionName || "your invention";
  const year = context.year || 2026;
  const focus = (selected.length ? selected : stack).slice(0, 4);
  const techNames = focus.map((id) => map.get(id)?.name || id).filter(Boolean);
  const techPhrase = techNames.length
    ? techNames.slice(0, 3).join(", ")
    : "the pieces already in your draft";
  const snip = how.length
    ? how.slice(0, 160) + (how.length > 160 ? "…" : "")
    : "the mechanism you wrote";

  if (how.length < 20) {
    return {
      source: "local",
      message:
        `**SIT invent** needs a how-it-works draft first (at least a short paragraph). ` +
        `Write the mechanism, then hit **SIT invent** again — we'll remake it with subtraction, division, multiplication, and addition.`,
      proposals: base,
      teaching: [],
    };
  }

  const subtractionHow =
    `In ${place}, strip the most “obvious” middle step from the current design and let remaining actors + ${techPhrase} carry the function. ` +
    `What you remove is treated as optional scaffolding, not the core value — neighbors still get the outcome without that piece.`;
  const divisionHow =
    `In ${place}, split what was one end-to-end system into modular parts that run on different schedules or blocks: sense here, decide there, act only where the crisis is hottest. ` +
    `${techPhrase} stay in play, but no single site must host the whole stack.`;
  const multiplicationHow =
    `In ${place}, keep the core loop but run a second, changed copy of one component — a cheaper twin, a slower twin, or a community-operated twin — so the original design and its variant cover different users. ` +
    `Same family as ${techPhrase}, deliberately not identical.`;
  const additionHow =
    `In ${place}, assign a new job to something already in the system (a sensor, a clerk, a spare channel, a quiet hour) so it also does coordination or access work. ` +
    `Closed-world addition: no new magic tech — only roles and links already latent in your how-it-works and ${techPhrase}.`;

  return {
    source: "local",
    message:
      `**SIT invent** — thinking in a box for **${name}** (${place}, ${year}).\n` +
      `Starting from your how-it-works: “${snip}”\n\n` +
      `**Subtraction** — remove an essential-looking step and still deliver the outcome:\n${subtractionHow}\n` +
      `_Why it might win:_ fewer moving parts, cheaper pilot, harder to freeride on complexity.\n\n` +
      `**Division** — split whole into parts in time, space, or scale:\n${divisionHow}\n` +
      `_Why it might win:_ starts small, matches uneven streets or clinics, fails gracefully.\n\n` +
      `**Multiplication** — copy a component and change the copy:\n${multiplicationHow}\n` +
      `_Why it might win:_ serves two realities (rich/poor blocks, day/night, skilled/novice) without a second invention.\n\n` +
      `**Addition** — new job for something already inside the system:\n${additionHow}\n` +
      `_Why it might win:_ closed-world; reuses trust and infrastructure you already named.\n\n` +
      `These are sparks, not a paste-in draft — rewrite your own how-it-works if one of them clicks.`,
    proposals: base,
    teaching: teachingFor(focus.length ? focus : stack, map, 2),
  };
}

/**
 * Local SCAMPER — seven checklist remakes of how-it-works.
 */
function localScamperInvent(context, selected, stack, map, base) {
  const how = String(context.inventionHow || "").trim();
  const place = context.place || "this place";
  const name = context.inventionName || "your invention";
  const year = context.year || 2026;
  const focus = (selected.length ? selected : stack).slice(0, 4);
  const techNames = focus.map((id) => map.get(id)?.name || id).filter(Boolean);
  const techPhrase = techNames.length
    ? techNames.slice(0, 3).join(", ")
    : "the pieces already in your draft";
  const snip = how.length
    ? how.slice(0, 160) + (how.length > 160 ? "…" : "")
    : "the mechanism you wrote";

  if (how.length < 20) {
    return {
      source: "local",
      message:
        `**SCAMPER invent** needs a how-it-works draft first (at least a short paragraph). ` +
        `Write the mechanism, then hit **SCAMPER invent** again — we'll remake it with Substitute, Combine, Adapt, Modify, Put to other uses, Eliminate, and Reverse.`,
      proposals: base,
      teaching: [],
    };
  }

  const substituteHow =
    `In ${place}, swap one actor or channel in the current design — e.g. a community radio or clinic clerk stands in for a step that currently depends on a scarcer part of ${techPhrase}. ` +
    `Same outcome, different substitute in the chain.`;
  const combineHow =
    `In ${place}, merge two jobs that your draft treats separately (sense + alert, pay + enroll, map + dispatch) so one pass through ${techPhrase} does both. ` +
    `Fewer handoffs, one combined loop.`;
  const adaptHow =
    `In ${place}, borrow a pattern that already works nearby — school lunch logistics, mutual-aid WhatsApp trees, pharmacy refill reminders — and adapt it onto your mechanism with ${techPhrase}. ` +
    `Not a new category; a familiar social pattern wearing your stack.`;
  const modifyHow =
    `In ${place}, change scale or intensity: run a minified block pilot first (one street, one clinic day) or magnify coverage on crisis hours only. ` +
    `${techPhrase} stays, but cadence and footprint shift.`;
  const putToUseHow =
    `In ${place}, keep the same machinery but aim it at a second job on quiet days — training, inventory, neighbor check-ins — so idle capacity from ${techPhrase} is not wasted. ` +
    `Primary crisis use remains; off-peak is the new use.`;
  const eliminateHow =
    `In ${place}, cut the step users skip anyway and redesign so the outcome still lands without it. ` +
    `Remaining actors + ${techPhrase} carry a simpler path.`;
  const reverseHow =
    `In ${place}, flip the sequence: act or enroll first, measure after — or let neighbors request before the system pushes. ` +
    `Rearrange who moves first while keeping ${techPhrase} in the loop.`;

  return {
    source: "local",
    message:
      `**SCAMPER invent** — checklist remakes for **${name}** (${place}, ${year}).\n` +
      `Starting from your how-it-works: “${snip}”\n\n` +
      `**Substitute** — replace a part of the chain:\n${substituteHow}\n` +
      `_Why it might win:_ uses what this place already trusts.\n\n` +
      `**Combine** — merge steps or functions:\n${combineHow}\n` +
      `_Why it might win:_ fewer handoffs, clearer pilot story.\n\n` +
      `**Adapt** — borrow a working pattern:\n${adaptHow}\n` +
      `_Why it might win:_ adoption rides on a familiar habit.\n\n` +
      `**Modify** — change scale or intensity:\n${modifyHow}\n` +
      `_Why it might win:_ honest pilot size or peak-hour focus.\n\n` +
      `**Put to other uses** — same kit, second job:\n${putToUseHow}\n` +
      `_Why it might win:_ justifies cost between crises.\n\n` +
      `**Eliminate** — remove a step and still deliver:\n${eliminateHow}\n` +
      `_Why it might win:_ cheaper, less freeride surface.\n\n` +
      `**Reverse / Rearrange** — flip order or roles:\n${reverseHow}\n` +
      `_Why it might win:_ matches how people already move here.\n\n` +
      `These are sparks, not a paste-in draft — rewrite your own how-it-works if one of them clicks.`,
    proposals: base,
    teaching: teachingFor(focus.length ? focus : stack, map, 2),
  };
}

function localGenerateScenarios(context, base) {
  const theme = context.globalTheme || {};
  const globalId = theme.id || "climate";
  const g = globalById(globalId) || {
    id: globalId,
    title: theme.title || "Global problem",
    blurb: theme.blurb || "",
    kind: theme.kind || "now",
  };
  const count = Math.min(6, Math.max(3, Number(context.scenarioCount) || 4));
  const salt = context.forceRegen ? Date.now() % 10000 : 0;
  const scenarios = localScenariosForGlobal(g, { count, salt });
  return {
    source: "local",
    message: `Here are ${scenarios.length} Quests for **${g.title}**. Pick one to invent for.`,
    scenarios,
    proposals: base,
    teaching: [],
  };
}

function sanitizeScenarioList(rawList, context, techIds) {
  const theme = context?.globalTheme || {};
  const globalId = theme.id || "climate";
  const validTech = new Set(techIds?.length ? techIds : allTechIds());
  const visionOk = new Set(VISION_THEME_IDS);
  const seeds = Array.isArray(context?.seedMissions) ? context.seedMissions : [];
  const list = Array.isArray(rawList) ? rawList : [];
  const out = [];
  const seen = new Set();

  const pushOne = (raw, sourceHint) => {
    if (!raw || typeof raw !== "object") return;
    const place = String(raw.place || "").trim().slice(0, 80);
    const title = String(raw.title || "").trim().slice(0, 100);
    if (!place && !title) return;
    const key = (place || title).toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);

    const roles = ["local", "global", "support"];
    /** @type {Record<string, { label: string, pressure: number, pressureRise: number, winMax: number }>} */
    let pressure = {};
    const rawP = raw.pressure && typeof raw.pressure === "object" ? raw.pressure : null;
    const isStructured =
      rawP &&
      Object.keys(rawP).some((k) => roles.includes(k)) &&
      Object.keys(rawP).every(
        (k) =>
          !roles.includes(k) ||
          (rawP[k] && typeof rawP[k] === "object" && !Array.isArray(rawP[k]))
      );

    if (isStructured) {
      for (const role of roles) {
        if (!rawP[role] || typeof rawP[role] !== "object") continue;
        const e = rawP[role];
        const label = String(e.label || role).trim().slice(0, 40) || role;
        pressure[role] = {
          label,
          pressure: Math.min(5, Math.max(0, Math.round(Number(e.pressure) || 2))),
          pressureRise: Math.min(
            3,
            Math.max(0, Math.round(Number(e.pressureRise ?? 1) || 0))
          ),
          winMax: Math.min(5, Math.max(0, Math.round(Number(e.winMax ?? 1) || 0))),
        };
      }
    } else if (rawP) {
      // Legacy flat → map first three keys to local/global/support
      const entries = Object.entries(rawP).slice(0, 3);
      entries.forEach(([k, v], i) => {
        const role = roles[i];
        const label = String(k).slice(0, 40);
        const n = typeof v === "object" && v != null ? Number(v.pressure) : Number(v);
        pressure[role] = {
          label,
          pressure: Math.min(5, Math.max(0, Math.round(n || 2))),
          pressureRise: Math.min(
            3,
            Math.max(
              0,
              Math.round(
                Number(
                  (typeof v === "object" && v?.pressureRise) ??
                    raw.pressureRise?.[k] ??
                    (i === entries.length - 1 ? 0 : 1)
                ) || 0
              )
            )
          ),
          winMax: Math.min(
            5,
            Math.max(
              0,
              Math.round(
                Number(
                  (typeof v === "object" && v?.winMax) ?? raw.winMax?.[k] ?? 1
                ) || 0
              )
            )
          ),
        };
      });
    }
    if (!Object.keys(pressure).length) {
      pressure = {
        local: { label: "Pressure", pressure: 2, pressureRise: 1, winMax: 1 },
        global: { label: "Capacity", pressure: 2, pressureRise: 1, winMax: 1 },
        support: { label: "Trust", pressure: 1, pressureRise: 0, winMax: 1 },
      };
    }
    const suggested = (Array.isArray(raw.suggested) ? raw.suggested : [])
      .map(String)
      .filter((id) => validTech.has(id))
      .slice(0, 8);
    const suggestedWhy = sanitizeSuggestedWhy(
      raw.suggestedWhy,
      new Set(suggested.length ? suggested : ["ai", "iot", "networks"])
    );
    const visionTheme = visionOk.has(String(raw.visionTheme))
      ? String(raw.visionTheme)
      : "rebuild-city";
    const summary = String(raw.summary || "").trim().slice(0, SUMMARY_CAP);
    const briefMdRaw = String(raw.briefMd || "").trim();
    const briefMd =
      briefMdRaw.slice(0, 8000) ||
      briefMdFromLivedStory({
        scene: String(raw.scene || "").trim(),
        title: title || place,
        stakeholder: String(raw.stakeholder || "").trim(),
        pressure: raw.pressure,
        globalTitle: String(theme.title || "").trim(),
      }).slice(0, 8000);
    const id =
      String(raw.id || "").trim() ||
      `gen-${globalId}-${out.length}-${Math.random().toString(36).slice(2, 7)}`;
    out.push({
      id,
      globalId,
      title: title || `Challenge in ${place}`,
      place: place || "Local place",
      startYear: Number(raw.startYear) || GAME.startYear,
      collapseYear: Number(raw.collapseYear) || GAME.startYear + 8,
      yearsPerTurn: Number(raw.yearsPerTurn) || GAME.yearsPerTurn,
      pressure,
      scene: String(raw.scene || "").trim().slice(0, 800),
      ...(briefMd ? { briefMd } : {}),
      stakeholder: String(raw.stakeholder || "").trim().slice(0, 120),
      suggested: suggested.length ? suggested : ["ai", "iot", "networks"],
      ...(suggestedWhy ? { suggestedWhy } : {}),
      visionTheme,
      source: sourceHint || (raw.source === "curated" ? "curated" : "generated"),
      ...(summary ? { summary } : {}),
    });
  };

  // Prefer curated seeds first (unless force full regen without seeds)
  if (!context?.forceRegen || seeds.length) {
    for (const s of seeds) pushOne({ ...s, source: "curated" }, "curated");
  }
  for (const s of list) pushOne(s, "generated");

  const target = Math.min(6, Math.max(3, Number(context?.scenarioCount) || 4));
  if (out.length < target) {
    const g = globalById(globalId) || {
      id: globalId,
      title: theme.title || "Global problem",
      blurb: theme.blurb || "",
      kind: theme.kind || "now",
    };
    const fill = localScenariosForGlobal(g, {
      count: target,
      salt: context?.forceRegen ? Date.now() % 10000 : 3,
    });
    for (const s of fill) {
      pushOne(s, s.source || "generated");
      if (out.length >= target) break;
    }
  }
  return out.slice(0, target);
}

function localAssessFeasibility(context, selected, map, base) {
  const year = context.year || 2026;
  const how = String(context.inventionHow || "").trim();
  const impact = String(context.inventionImpact || "").trim();
  const text = how || impact;
  const techs = selected.map((id) => map.get(id)).filter(Boolean);

  const frontierRe =
    /quantum\s*internet|full(y)?\s*autonomous\s*(city|fleet|everything)|mind\s*control|upload(ed)?\s*consciousness|unlimited\s*energy|free\s*energy|teleport|cure\s*all\s*cancer|bci.*(everyone|consumer|mass)|programmable\s*(city|building)|living\s*(city|infrastructure)\s*that\s*grow|general[- ]purpose\s*quantum|replace\s*all\s*(doctors|teachers|drivers)/i;
  const pilotRe =
    /\b(pilot|trial|partnership|partner with|lab|research|limited|mapped corridor|geofenced|supervised|clinical|opt[- ]in|prototype|with oversight|human[- ]in[- ]the[- ]loop)\b/i;
  const routineRe =
    /\b(routine|every(one| resident)?|all residents|city[- ]wide|guarantees|always|overnight|fully automatic|no human|autonomous everywhere)\b/i;

  let level = "green";
  let reason = `Claims look compatible with near-term capabilities in ${year}.`;

  if (!selected.length) {
    level = "red";
    reason = "Add at least one technology to the stack.";
  } else if (text.length < 20) {
    level = "yellow";
    reason = "Need a clearer how-it-works to judge claim timing for this year.";
  } else if (frontierRe.test(text)) {
    level = "red";
    reason =
      "How-it-works treats frontier capability as routine now — revise toward pilots, partnerships, or near-term tools.";
  } else {
    const softHorizon = techs.filter((t) => (t.readyYear || t.softHorizon || year) > year + 2);
    if (softHorizon.length && routineRe.test(text) && !pilotRe.test(text)) {
      level = "yellow";
      reason = `${softHorizon
        .map((t) => t.name)
        .join(", ")} can stay in the stack, but city-wide/routine claims need pilot framing in ${year}.`;
    } else if (softHorizon.length && !pilotRe.test(text) && text.length < 80) {
      level = "yellow";
      reason = `Longer-horizon categories present (${softHorizon
        .map((t) => t.name)
        .join(", ")}). Spell a near-term mechanism so timing stays honest.`;
    } else if (softHorizon.length && pilotRe.test(text)) {
      level = "green";
      reason = `Pilot-honest framing looks compatible with ${year}.`;
    }
  }

  const groundNote = groundingExcerpt(context, 400);
  const reasonOut = groundNote
    ? `${reason} (Quest grounding on file — treat as capability source-of-truth.)`
    : reason;
  return {
    source: "local",
    timing: { level, reason: reasonOut },
  };
}

const NAME_SEEDS = [
  ["Aether", "Lattice", "Harbor", "Pulse", "Nimbus", "Root", "Forge", "Loom", "Reef", "Kin"],
  ["Weave", "Shield", "Orbit", "Vein", "Chorus", "Anchor", "Garden", "Mirror", "Relay", "Crest"],
];

function pick(arr, salt = 0) {
  if (!arr.length) return null;
  return arr[Math.abs(salt) % arr.length];
}

function techMap(context) {
  const map = new Map();
  for (const t of context.availableTechs || []) map.set(t.id, t);
  return map;
}

function resolveFocusTech(context) {
  const map = techMap(context);
  const focusId = String(context.focusTechId || (context.selectedTechIds || [])[0] || "");
  return map.get(focusId) || null;
}

function localIdeaSparksResult(context, base) {
  const tech = resolveFocusTech(context);
  const empty = {
    source: "local",
    message: "Select a tech first, then open Ideas.",
    proposals: { ...base },
    teaching: [],
    ideas: [],
  };
  if (!tech) return empty;
  const ideas = context.refresh
    ? rotateLocalIdeaSparks(tech, context, context.avoidTitles || [])
    : localIdeaSparks(tech, context);
  return {
    source: "local",
    message: `Three angles for **${tech.name || tech.id}** here. Pick one to seed how-it-works — then rewrite it so it's yours.`,
    proposals: { ...base },
    teaching: [],
    ideas,
  };
}

function resolveStack(context, targetCount = 4) {
  const selected = new Set(context.selectedTechIds || []);
  const recommended = context.challenge?.recommended || [];
  const available = (context.availableTechs || []).map((t) => t.id);
  const availSet = new Set(available);

  const stack = [...selected].filter((id) => availSet.has(id));
  for (const id of recommended) {
    if (stack.length >= targetCount) break;
    if (availSet.has(id) && !stack.includes(id)) stack.push(id);
  }
  for (const id of available) {
    if (stack.length >= targetCount) break;
    if (!stack.includes(id)) stack.push(id);
  }
  return stack.slice(0, Math.max(targetCount, stack.length));
}

/**
 * Hex apply fields for a how-draft.
 * One placed island → pathway. Zero or several → mint.
 * Several islands: name the focused emTech so apply stays on that card.
 */
function hexHowProposal(context) {
  if (!context?.hexInvent) {
    return { howTarget: null, howTechId: null };
  }
  const pathwayCount = Array.isArray(context.hexBoard?.pathways)
    ? context.hexBoard.pathways.length
    : 0;
  const howTarget = pathwayCount === 1 ? "pathway" : "mint";
  const howTechId =
    pathwayCount > 1
      ? sanitizeHowTechId(
          context.focusTechId || (context.selectedTechIds || [])[0],
          (context.availableTechs || []).map((t) => t.id)
        )
      : null;
  return { howTarget, howTechId };
}

/**
 * Keep howTechId only when it is a known catalog id.
 * @param {unknown} raw
 * @param {Set<string>|string[]|null|undefined} availableIds
 * @returns {string|null}
 */
function sanitizeHowTechId(raw, availableIds) {
  if (raw == null) return null;
  const id = String(raw).trim().slice(0, 80);
  if (!id) return null;
  const ids = availableIds instanceof Set ? availableIds : new Set(availableIds || []);
  return ids.has(id) ? id : null;
}

function inventName(context, stack) {
  if (context.inventionName?.trim()) return context.inventionName.trim();
  const title = context.challenge?.title || "Future";
  const word = title.split(/\s+/).find((w) => w.length > 4) || "Nova";
  const salt = (stack.join("").length + title.length) % 10;
  return `${pick(NAME_SEEDS[0], salt)}${pick(NAME_SEEDS[1], salt + 3)}`;
}

function draftHow(context, stack, map) {
  if (context.inventionHow?.trim() && context.inventionHow.trim().length > 40) {
    return context.inventionHow.trim();
  }
  const names = stack.map((id) => map.get(id)?.name || id);
  const challenge = context.challenge?.prompt || context.challenge?.problem || "the challenge";
  const parts = stack.slice(0, 5).map((id, i) => {
    const t = map.get(id);
    const role =
      i === 0
        ? "senses and models the situation"
        : i === 1
          ? "decides and coordinates responses"
          : i === 2
            ? "acts in the physical world"
            : "extends resilience and reach";
    return `${t?.name || id} ${role}${t?.summary ? ` (${t.summary.replace(/\.$/, "")})` : ""}`;
  });
  return (
    `A coordinated system aimed at: ${challenge}\n\n` +
    `Core loop: ${parts.join("; ")}. ` +
    `Together they form a cycle of sense → decide → act → learn. ` +
    `Humans set goals and ethics; the stack handles scale and speed. ` +
    `Key technologies: ${names.join(", ")}.`
  );
}

function draftImpact(context, stack, map) {
  if (context.inventionImpact?.trim() && context.inventionImpact.trim().length > 40) {
    return context.inventionImpact.trim();
  }
  const title = context.challenge?.title || "this problem";
  const techs = stack
    .slice(0, 3)
    .map((id) => map.get(id)?.name)
    .filter(Boolean)
    .join(", ");
  return (
    `On an ordinary Tuesday, people notice ${title.toLowerCase()} less as a crisis and more as a managed rhythm. ` +
    `${techs || "The stack"} fades into infrastructure: quieter streets or clinics, clearer air or lessons, fewer impossible tradeoffs. ` +
    `Work shifts from firefighting to stewardship. Not everyone benefits equally at first — the invention must be designed so access is a feature, not an afterthought. ` +
    `Children grow up assuming this capability is normal; grandparents remember when it was not.`
  );
}

function teachingFor(stack, map, limit = 3) {
  return stack.slice(0, limit).map((id) => {
    const t = map.get(id);
    return {
      techId: id,
      blurb: t?.summary || "An emerging capability worth understanding deeply.",
    };
  });
}

function localCoInvent({ mode, messages, context }) {
  const map = techMap(context);
  const selected = context.selectedTechIds || [];
  const stack = resolveStack(context, mode === "push-further" ? 6 : 4);
  const toAdd = stack.filter((id) => !selected.includes(id));
  const challengeTitle = context.challenge?.title || "your challenge";
  const lastUser = [...(messages || [])].reverse().find((m) => m.role === "user")?.content || "";

  const base = {
    addTechIds: [],
    removeTechIds: [],
    inventionName: null,
    inventionHow: null,
    inventionImpact: null,
    scrutiny: null,
  };

  if (mode === "idea-sparks") {
    return localIdeaSparksResult(context, base);
  }

  if (mode === "fill-quest-summary") {
    return { source: "local", summary: "", proposals: base, teaching: [] };
  }

  if (mode === "evaluate-neighbors") {
    const givens = context.hexEval?.givens || [];
    const lights = givens.map((g) => {
      const n = Array.isArray(g.neighbors) ? g.neighbors : [];
      const priorLv = String(g.prior?.level || "").toLowerCase();
      const priorOk =
        priorLv === "red" || priorLv === "yellow" || priorLv === "green";
      if (!n.length) {
        return {
          id: g.id,
          level: "red",
          reason: g.prior?.note || "Still unanswered.",
        };
      }
      if (g.kind === "concern") {
        const hasAnswer = Boolean(String(g.playerAnswer || "").trim());
        let level = hasAnswer ? (priorOk ? priorLv : "yellow") : "red";
        if (level === "green") level = "yellow";
        if (!hasAnswer) level = "red";
        return {
          id: g.id,
          level,
          reason:
            g.prior?.note ||
            (hasAnswer
              ? "Written answer is on file — confirm the pathway honestly holds it."
              : "Still unanswered — docking is not enough."),
        };
      }
      let level = priorOk ? priorLv : "yellow";
      const mature = n.some((x) => x.mature);
      if (!priorOk) {
        level = mature ? "green" : "yellow";
      }
      return {
        id: g.id,
        level,
        reason:
          g.prior?.note ||
          (mature
            ? "A mature idea is touching this light."
            : "An idea touches but may not be enough yet."),
      };
    });
    return {
      source: "local",
      message: "Board lights updated from pathway clusters.",
      proposals: base,
      teaching: [],
      lights,
    };
  }

  if (mode === "score-pathway") {
    const invs = Array.isArray(context.pathway?.inventions)
      ? context.pathway.inventions
      : [];
    const howLen = invs
      .map((n) => String(n.howText || "").trim())
      .join("\n").length;
    const howBlob = invs.map((n) => String(n.howText || "").trim()).join("\n");
    const mature = invs.some((n) => n.mature || n.timingLevel === "green");
    const redTiming = invs.some(
      (n) => n.timingLevel === "red" || (n.feasibilityPct != null && Number(n.feasibilityPct) < 35)
    );
    const hostile =
      /\b(nuclear|reactor|warhead|weapon|surveil|mass.?surveillance)\b/i.test(howBlob);
    const crisisDelta = { local: 0, global: 0, support: 0 };
    if (mature && howLen >= 40) {
      crisisDelta.local = -1;
      crisisDelta.support = -1;
    } else if (howLen >= 20) {
      crisisDelta.local = -1;
    }
    if (redTiming || hostile) {
      crisisDelta.support = Math.max(crisisDelta.support, 1);
    }
    const concerns = {};
    for (const c of context.concerns || []) {
      const angle = c?.angle;
      if (!angle) continue;
      const hasAnswer = Boolean(String(c.playerAnswer || "").trim());
      concerns[angle] = {
        level: hasAnswer ? "yellow" : "red",
        reason: hasAnswer
          ? "Written answer is on file — confirm the pathway honestly holds it."
          : "Still unanswered — docking is not enough.",
      };
    }
    const clamped = clampPathwayScore(
      { crisisDelta, concerns },
      invs,
      {
        globalId: context.globalId || context.mission?.globalId || context.global?.id,
        mission: context.mission,
        rules: context.rules || context.mission?.rules,
      }
    );
    return {
      source: "local",
      crisisDelta: clamped.crisisDelta,
      crisisReasons: clamped.crisisReasons,
      concerns: clamped.concerns,
    };
  }

  if (mode === "evaluate-convergence") {
    const placed = context.placed || {};
    const nabes = Array.isArray(context.neighbors) ? context.neighbors : [];
    const convergences = nabes.map((n) => {
      const a = {
        id: placed.id,
        kind: "invention",
        techId: placed.techId,
        polarity: placed.polarity,
        howText: placed.howText || placed.howText,
      };
      const b = {
        id: n.id,
        kind: "invention",
        techId: n.techId,
        polarity: n.polarity,
        howText: n.howText || n.howText,
      };
      const converges = heuristicConverges(a, b);
      const na = String(placed.techName || a.techId || "one field");
      const nb = String(n.techName || b.techId || "the other");
      return {
        neighborId: n.id,
        converges,
        title: converges ? `${na} × ${nb}`.slice(0, 60) : "",
        reason: converges
          ? `Progress in ${na} honestly accelerates ${nb} — better capability, cost, or scale. More or better ${nb} then pulls demand back onto ${na}.`
          : "",
      };
    });
    return { source: "local", convergences };
  }

  if (mode === "complete-picture") {
    const face = context.storyFace === "life" ? "life" : "how";
    const how = draftHow(context, selected.length ? selected : stack, map);
    const impact = draftImpact(context, selected.length ? selected : stack, map);
    if (face === "how") {
      return {
        source: "local",
        message:
          "I drafted **everyday life** from your mechanism. Edit anything that doesn't feel like this place.",
        proposals: { ...base, inventionImpact: impact },
        teaching: teachingFor(selected.length ? selected : stack, map, 2),
      };
    }
    return {
      source: "local",
      message:
        "I drafted **how it works** from the day-in-the-life you wrote. Check the mechanism against your stack.",
      proposals: { ...base, inventionHow: how },
      teaching: teachingFor(selected.length ? selected : stack, map, 2),
    };
  }

  if (mode === "judge-contribution") {
    // Lenient local fallback — prefer accept; only block clear gutting/clearing.
    const before = String(context.beforeText || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
    const after = String(context.afterText || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
    let additive = true;
    let reason = "Keeps original substance and extends it.";
    if (!before || before.length < 12) {
      reason = "Original was empty or stub — addition allowed.";
    } else if (!after) {
      additive = false;
      reason = "Cleared the text — destructive.";
    } else if (after.length < before.length * 0.55) {
      additive = false;
      reason = "Shortened the original too much.";
    } else {
      const bWords = [...new Set(before.split(/\s+/).filter((w) => w.length > 3))];
      const aSet = new Set(after.split(/\s+/));
      let kept = 0;
      for (const w of bWords) if (aSet.has(w)) kept++;
      const retention = bWords.length ? kept / bWords.length : 1;
      // Soft: only reject when most substance gone AND not a longer rewrite
      if (retention < 0.35 && after.length < before.length * 1.15) {
        additive = false;
        reason = `Removed too much original wording (${Math.round(retention * 100)}% kept).`;
      } else {
        reason = "Keeps enough of the original and extends it.";
      }
    }
    return {
      source: "local",
      additive,
      reason,
      message: additive ? `Additive: ${reason}` : `Destructive: ${reason}`,
      proposals: { ...base },
      teaching: [],
    };
  }

  if (mode === "pose-challenge") {
    const place = context.place || "this place";
    const name = context.inventionName || "this invention";
    const angles = ["moloch", "ethicist", "stakeholder", "nature"];
    const angle = angles.includes(context.challengeAngle)
      ? context.challengeAngle
      : angles[Math.floor(Math.random() * angles.length)];
    const labels = {
      moloch: "Moloch",
      ethicist: "Ethicist",
      stakeholder: "Stakeholder",
      nature: "Mother Nature",
    };
    let speech;
    let question;
    if (angle === "nature") {
      speech = `Mother Nature, ${place}: “${name} still burns energy and makes waste. Storms and scarcity do not care about your pitch deck.”`;
      question = "What physical limit hits first — and how does the design absorb a bad week?";
    } else if (angle === "ethicist") {
      speech = `The Ethicist, ${place}: “${name} forces a choice you cannot optimize away. Someone’s dignity or opportunity is on the line — and both sides have a point.”`;
      question = "Name the hardest ethical tradeoff. Who is harmed either way — and what constraint do you refuse to cross?";
    } else if (angle === "stakeholder") {
      speech = `The Stakeholder, ${place}: “I am the mayor, the clinic board, and the neighborhood meeting. Someone must sign, fund, and defend ${name} in public.”`;
      question = "Who must say yes, who pays year 1 and year 5, and how do you win public support without pricing people out?";
    } else {
      speech = `Moloch, ${place}: “There’s no way ${name} holds. Free-riders keep old habits while careful people pay. The race to the bottom eats good design — that is how the system works.”`;
      question = "What stops defection when neighbors can freeride — name the game mechanic you change?";
    }
    return {
      source: "local",
      message: speech,
      angle,
      angleLabel: labels[angle],
      challengeSpeech: speech,
      challengeQuestion: question,
      proposals: base,
      teaching: [],
    };
  }

  if (mode === "scrutinize") {
    return {
      source: "local",
      message: "Four hard questions are on the table — ease their lights.",
      proposals: {
        ...base,
        scrutiny: localScrutinyProposals(context),
      },
      teaching: [],
    };
  }

  if (mode === "judge-scrutiny-move") {
    const ans = String(context.playerAnswer || lastUser || "");
    const concrete =
      /\b(who|pay|cost|meter|limit|permit|default|fee|cap|monitor|opt[- ]in|human|review|budget|year)\b/i.test(
        ans
      );
    const long = ans.trim().length >= 80;
    let quality = "miss";
    if (ans.trim().length < 20) quality = "miss";
    else if (concrete && long) quality = "hit";
    else if (concrete || long) quality = "glance";
    const damage = quality === "hit" ? 2 : quality === "glance" ? 1 : 0;
    const messages = {
      hit: "That names a real mechanism — the challenge takes a solid hit.",
      glance: "Some substance — not enough to end the attack.",
      miss: "Too vague for this critic — try actors, costs, or hard limits.",
    };
    return {
      source: "local",
      quality,
      damage,
      message: messages[quality],
      proposals: base,
      teaching: [],
    };
  }

  if (mode === "judge-challenge") {
    const ans = String(context.playerAnswer || lastUser || "");
    const concrete =
      ans.length >= 40 &&
      /(pay|cost|budget|sensor|fine|opt|default|energy|waste|monitor|who|when|if )/i.test(ans);
    const verdict = concrete ? (ans.length >= 80 ? "pass" : "partial") : "fail";
    return {
      source: "local",
      message:
        verdict === "fail"
          ? "Too vague — name a concrete actor, cost, or physical limit."
          : verdict === "pass"
            ? "Solid. You named a real counter-move. You may deploy."
            : "Partial credit — more specificity would help, but enough to try deploy.",
      verdict,
      lesson:
        verdict === "fail"
          ? "Challenges need mechanisms, not hopes."
          : "Good inventions survive hostile questions.",
      proposals: base,
      teaching: [],
    };
  }

  if (mode === "coach-challenge" || mode === "draft-challenge") {
    const place = context.place || "this place";
    const name = context.inventionName || "the invention";
    const angle = context.challengeAngle || "moloch";
    const q = context.challengeQuestion || "How does it survive?";
    const techNames = (selected.length ? selected : stack)
      .slice(0, 4)
      .map((id) => map.get(id)?.name || id)
      .join(", ");
    if (mode === "coach-challenge") {
      const tips =
        angle === "nature"
          ? `• Name the physical limit (energy, corrosion, heat, waste, flood height).\n• Tie it to ${techNames || "your stack"}.\n• Say what fails first in a bad week.\n• Add a sensor, cap, or graceful degrade.`
          : angle === "ethicist"
            ? `• Name the values in tension (privacy vs safety, speed vs consent, inclusion vs cost).\n• Say who is harmed on each horn of the dilemma.\n• State one hard line you will not cross.\n• Show how ${techNames || "your stack"} is constrained by that line.`
            : angle === "stakeholder"
              ? `• Name who must say yes in ${place} (official, board, neighbors).\n• Say who pays year 1 vs year 5.\n• Name who is priced out or loses status.\n• Offer a permit path, free tier, subsidy, or public forum move.`
              : `• Name who can freeride on ${name}.\n• What they gain by defecting.\n• Make defection visible.\n• Align incentives (shared fund, default enroll, small fee/reward).`;
      return {
        source: "local",
        message:
          `Coaching for this challenge:\n\n**Question:** ${q}\n\n${tips}\n\nWrite your answer in your own words, then submit.`,
        proposals: base,
        teaching: [],
      };
    }
    const draft =
      angle === "nature"
        ? `In ${place}, the first physical failure for ${name} is overload or waste if ${techNames || "the stack"} runs without caps. We limit scale to measured budgets, add monitoring, and fail safe to a manual fallback during extremes so the system degrades instead of collapsing.`
        : angle === "ethicist"
          ? `In ${place}, ${name} creates a real ethical tension around who is surveilled or left out when ${techNames || "the stack"} scales. We refuse one hard line (no coercive enrollment / no sale of identifiable data without consent), publish that rule, and keep a human review path so the dilemma is governed rather than ignored.`
          : angle === "stakeholder"
            ? `In ${place}, the clinic or city signs off only if year-1 capital is grant-backed and year-5 ops sit under a known line item. Households below a threshold get a free tier; a public briefing and simple permit checklist build legitimacy without killing the pilot.`
            : `In ${place}, freeriders would keep old habits while careful users pay. ${name} makes participation the default for covered blocks, publishes compliance, and ties a small shared fee/reward to verified use so defection is visible and costly.`;
    return {
      source: "local",
      message: "Draft answer below — edit it so it sounds like your invention, then submit.",
      draftAnswer: draft,
      proposals: base,
      teaching: [],
    };
  }

  if (mode === "spark") {
    return {
      source: "local",
      message:
        `Let's crack **${challengeTitle}** together.\n\n` +
        `${context.challenge?.problem || ""}\n\n` +
        `A strong opening stack could weave: **${stack
          .slice(0, 3)
          .map((id) => map.get(id)?.name || id)
          .join(" + ")}**. ` +
        `That combo gives you sensing, decision, and real-world action — the skeleton of most transformative systems.\n\n` +
        `Your move: what constraint matters most — cost, equity, speed, or beauty?` +
        (context.hexInvent
          ? ` Or hit **Invent with** on a suggested emTech, then Ask for ideas or write how it works.`
          : ` Or hit **Apply techs** and we'll build on them.`),
      proposals: { ...base, addTechIds: selected.length ? [] : toAdd.slice(0, 3) },
      teaching: teachingFor(stack, map, 3),
    };
  }

  if (mode === "suggest-stack") {
    return {
      source: "local",
      message:
        `Here's a coherent stack for **${challengeTitle}**:\n\n` +
        stack
          .map((id, i) => {
            const t = map.get(id);
            return `${i + 1}. **${t?.name || id}** — ${t?.summary || ""}`;
          })
          .join("\n") +
        `\n\nWhy this mix: coverage across domains beats a single shiny tool. ` +
        (context.hexInvent
          ? `Hit **Invent with** on a category, then Ask for ideas or mint a tile — friction is where invention lives.`
          : `Apply the techs, then tell me what feels wrong — friction is where invention lives.`),
      proposals: { ...base, addTechIds: toAdd },
      teaching: teachingFor(stack, map, 4),
    };
  }

  if (mode === "draft-name") {
    const name = inventName(context, stack);
    const alt1 = inventName({ ...context, inventionName: "" }, [...stack].reverse());
    const alt2 = inventName(
      { ...context, inventionName: "", challenge: { title: (context.challenge?.title || "") + " X" } },
      stack
    );
    return {
      source: "local",
      message:
        `Name options for your invention:\n\n` +
        `1. **${name}** (my top pick — memorable + slightly mythical)\n` +
        `2. **${alt1}**\n` +
        `3. **${alt2}**\n\n` +
        `Apply the top pick, or type your own twist in the name field.`,
      proposals: { ...base, inventionName: context.hexInvent ? null : name },
      teaching: [],
    };
  }

  if (mode === "draft-how") {
    const how = draftHow(context, selected.length ? selected : stack, map);
    const hexHow = hexHowProposal(context);
    const hexClose =
      hexHow.howTarget === "pathway"
        ? `\n\nHit **Set as this pathway's how** to save this as how the placed pathway works. What's the one step only a human should still own?`
        : hexHow.howTarget === "mint"
          ? `\n\nHit **Use as how it works** to drop this into How it works, then Mint tile if it feels like yours. What's the one step only a human should still own?`
          : `\n\nEdit it until it sounds like *your* invention. What's the one step only a human should still own?`;
    return {
      source: "local",
      message: `Here's a draft mechanism you can steal, remix, or fight with:\n\n` + how + hexClose,
      proposals: {
        ...base,
        addTechIds: selected.length ? [] : toAdd.slice(0, 4),
        inventionHow: how,
        ...hexHow,
      },
      teaching: teachingFor(selected.length ? selected : stack, map, 3),
    };
  }

  if (mode === "draft-impact") {
    const impact = draftImpact(context, selected.length ? selected : stack, map);
    return {
      source: "local",
      message:
        `A day in the future if this works:\n\n` +
        impact +
        `\n\nWhose Tuesday is still hard in this world? Design for them next.`,
      proposals: { ...base, inventionImpact: impact },
      teaching: [],
    };
  }

  if (mode === "push-further") {
    const year = context.year || 2026;
    const how = String(context.inventionHow || "").trim();
    const assess = localAssessFeasibility(context, selected, map, base);
    const extras = resolveStack(context, 6).filter((id) => !selected.includes(id));
    return {
      source: "local",
      message:
        `Timing check for **${context.inventionName || "your draft"}** in **${year}**:\n\n` +
        `• **Claim timing:** ${assess.timing?.level || "—"} — ${assess.timing?.reason || ""}\n` +
        `• **Stack size:** ${selected.length} tech(s) — one sharp tool can be enough; add more only if the problem needs it.\n` +
        (extras.length
          ? `• **Optional muscle:** ${extras
              .slice(0, 2)
              .map((id) => map.get(id)?.name || id)
              .join(" and ")} if you have a real gap.\n`
          : "") +
        `• **Failure mode:** What happens in a 3-day blackout or if only the rich can afford it?\n` +
        `• **Wait tradeoff:** Waiting improves world conditions for stretch claims but raises crisis meters — it does not unlock cards.\n\n` +
        (how.length < 40
          ? `Write more of how-it-works so we can judge claims against ${year}.`
          : `Revise claims toward pilot-honest language if timing is yellow/red, or face the challenge if green.`),
      proposals: base,
      teaching: teachingFor(selected.length ? selected : extras, map, 2),
      timing: assess.timing,
    };
  }

  if (mode === "explain-techs") {
    const focus = selected.length ? selected : (context.challenge?.recommended || stack).slice(0, 4);
    return {
      source: "local",
      message:
        `Crash course on the techs in play:\n\n` +
        focus
          .map((id) => {
            const t = map.get(id);
            return `**${t?.name || id}** (${t?.domain || "emerging"}): ${t?.summary || ""}`;
          })
          .join("\n\n") +
        `\n\nAsk me how any two of these amplify each other — or hit **Art of the possible** for milestones and use cases.`,
      proposals: base,
      teaching: teachingFor(focus, map, 4),
    };
  }

  if (mode === "art-of-the-possible") {
    return localArtOfThePossible(context, selected, stack, map, base);
  }

  if (mode === "sit") {
    return localSitInvent(context, selected, stack, map, base);
  }

  if (mode === "scamper") {
    return localScamperInvent(context, selected, stack, map, base);
  }

  if (mode === "assess-feasibility") {
    return localAssessFeasibility(context, selected, map, base);
  }

  if (mode === "generate-scenarios") {
    return localGenerateScenarios(context, base);
  }

  // free chat — heuristic reply
  const lower = lastUser.toLowerCase();
  const tutorPrefix = isTutorMode(context)
    ? `**Tutor:** Let's take this one step at a time. `
    : "";
  let message =
    tutorPrefix +
    `I'm with you on **${challengeTitle}**. ` +
    (selected.length
      ? `Your stack so far: ${selected.map((id) => map.get(id)?.name || id).join(", ")}. `
      : `You haven't locked a stack yet — try **Suggest stack** or name a technology you're curious about. `);

  if (/name|call it|title/.test(lower)) {
    const name = inventName(context, stack);
    return {
      source: "local",
      message: message + `How about **${name}**? Apply it if it sparks something.`,
      proposals: { ...base, inventionName: name },
      teaching: [],
    };
  }
  if (/how|work|mechanism|system/.test(lower)) {
    const how = draftHow(context, selected.length ? selected : stack, map);
    return {
      source: "local",
      message: message + `Here's a mechanism draft to react to:\n\n` + how,
      proposals: {
        ...base,
        inventionHow: how,
        addTechIds: selected.length ? [] : toAdd.slice(0, 3),
        ...hexHowProposal(context),
      },
      teaching: teachingFor(stack, map, 2),
    };
  }
  if (/future|life|impact|day|everyday|world/.test(lower)) {
    const impact = draftImpact(context, selected.length ? selected : stack, map);
    return {
      source: "local",
      message: message + `\n\n` + impact,
      proposals: { ...base, inventionImpact: impact },
      teaching: [],
    };
  }

  const ideaTech = (context.availableTechs || []).find((t) =>
    lower.includes(t.name.toLowerCase().split(" ")[0])
  );
  if (ideaTech) {
    return {
      source: "local",
      message:
        message +
        `**${ideaTech.name}** is a strong thread: ${ideaTech.summary} ` +
        `Pair it with something from another domain so you get emergence, not a gadget.`,
      proposals: { ...base, addTechIds: selected.includes(ideaTech.id) ? [] : [ideaTech.id] },
      teaching: [{ techId: ideaTech.id, blurb: ideaTech.summary }],
    };
  }

  return {
    source: "local",
    message:
      message +
      `\n\nYou said: “${lastUser.slice(0, 200)}” — keep going. ` +
      `I can **Suggest stack**, **Draft how**, or riff on a constraint you care about (equity, energy, beauty, speed).`,
    proposals: base,
    teaching: teachingFor(stack, map, 2),
  };
}


export {
  GROUNDING_HINT,
  HEX_INVENT_HINT,
  TUTOR_HINT,
  resolveGrounding,
  resolveTutorContext,
  resolveSpotlightAdvance,
  isTutorMode,
  sanitizeHowTechId,
  sanitizeScenarioList,
  localGenerateScenarios,
  localCoInvent,
};

/**
 * Future Forge — solo polymath timing game with AI co-inventor
 */

import {
  GAME,
  GLOBALS,
  MISSIONS,
  TECHS,
  DOMAINS,
  VISION_STAGES,
  YEAR_NEWS,
  CHALLENGE_ANGLES,
  foresightForStack,
  globalById,
  missionsForGlobal,
  techById,
  domainsInStack,
  detectClaimStretch,
  techHorizonYear,
  techForAi,
} from "./data.js";
import { VisionRenderer, narrativesFromTechs } from "./vision.js";
import { CoInventor } from "./coinventor.js";

const state = {
  screen: "title",
  global: null,
  mission: null,
  year: GAME.startYear,
  turn: 0,
  pressure: {},
  selectedTechIds: [],
  inventionName: "",
  inventionHow: "",
  inventionImpact: "",
  storyFace: "how", // player writes how | life
  writeBoth: false,
  challengePassed: false,
  challengeAngle: null,
  challengeText: "",
  challengeQuestion: "",
  challengeAnswer: "",
  challengeFeedback: "",
  challengeVerdict: null,
  challengeFails: 0,
  domainFilter: "all",
  vision: null,
  coInventor: null,
  sideTab: "vision",
  lastNews: "",
  waitReport: "",
  outcome: null,
  aiBusy: false,
  /** @type {{ level: string, reason: string, forKey: string } | null} */
  aiTiming: null,
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function selectedTechs() {
  return state.selectedTechIds.map(techById).filter(Boolean);
}

function currentStage() {
  const n = state.selectedTechIds.length;
  let stage = VISION_STAGES[0];
  for (const s of VISION_STAGES) {
    if (n >= s.minTechs) stage = s;
  }
  return stage;
}

function clonePressure(p) {
  return { ...p };
}

function totalPressure(p = state.pressure) {
  return Object.values(p).reduce((a, b) => a + b, 0);
}

function maxPressure(p = state.pressure) {
  return Math.max(0, ...Object.values(p));
}

function wonMission() {
  const win = state.mission?.winMax || {};
  return Object.entries(win).every(([k, max]) => (state.pressure[k] ?? 0) <= max);
}

function collapsed() {
  return state.year >= state.mission.collapseYear || maxPressure() >= 5;
}

function computeSynergies(techs) {
  const ids = new Set(techs.map((t) => t.id));
  const pairs = [];
  for (const t of techs) {
    for (const p of t.pairs || []) {
      if (ids.has(p) && t.id < p) pairs.push([t.id, p]);
    }
  }
  return pairs;
}

/** Soft signal only — never a hard deploy gate */
function isCrossDomain(techs) {
  return techs.length >= 2 && domainsInStack(techs).length >= 2;
}

/** @deprecated soft only — categories are always pickable */
function readinessIssues(techs, year) {
  return []; // no hard locks; timing is feasibility's job
}

function newsForYear(year) {
  const opts = YEAR_NEWS.filter((n) => year >= n.minYear);
  if (!opts.length) return "";
  return opts[Math.floor(Math.random() * opts.length)].text;
}

function tips() {
  return [
    "Mixing domains often helps — but only when the problem needs it, not as a rule.",
    "Any emTech category is pickable. Feasibility judges whether your how-it-works over-claims this year.",
    "Wait advances world conditions and raises crisis — not a card unlock.",
    "Local inventing: name who benefits on *this* street, clinic, or quay.",
    "Art of the possible on the co-inventor: milestones, capabilities, unlocked use cases.",
  ];
}

/* —— Screens —— */
function showScreen(id) {
  state.screen = id;
  $$(".screen").forEach((el) => el.classList.toggle("active", el.id === `screen-${id}`));
  if (id === "global") renderGlobals();
  if (id === "mission") renderMissions();
  if (id === "workshop") {
    renderWorkshop();
    ensureCoInventor();
    setSideTab(state.sideTab || "vision");
    requestAnimationFrame(() => {
      ensureVision();
      updateVision({ immediate: true });
    });
  }
  if (id === "challenge-step") renderChallengeStep();
  if (id === "outcome") renderOutcome();
}

/* —— Global / mission select —— */
function renderGlobals() {
  const grid = $("#global-grid");
  grid.innerHTML = GLOBALS.map((g) => {
    const tag = g.kind === "before" ? "Before it hits" : "Now";
    const cls = g.kind === "before" ? "flag-prevention" : "flag-problem";
    const count = missionsForGlobal(g.id).length;
    const disabled = count === 0;
    return `
      <button type="button" class="challenge-card ${disabled ? "disabled" : ""}" data-id="${g.id}" ${disabled ? "disabled" : ""}>
        <span class="num"><span class="flag ${cls}">${tag}</span></span>
        <h3>${escapeHtml(g.title)}</h3>
        <p>${escapeHtml(g.blurb)}</p>
        <span class="cta">${count ? `${count} local mission${count > 1 ? "s" : ""} →` : "Coming soon"}</span>
      </button>`;
  }).join("");
  grid.querySelectorAll(".challenge-card:not([disabled])").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.global = globalById(btn.dataset.id);
      showScreen("mission");
    });
  });
}

function renderMissions() {
  const g = state.global;
  $("#mission-global-title").textContent = g ? g.title : "Local missions";
  $("#mission-global-blurb").textContent = g
    ? `${g.blurb} — pick a concrete place living a piece of this.`
    : "Pick a concrete place.";
  const list = g ? missionsForGlobal(g.id) : MISSIONS;
  const grid = $("#mission-grid");
  grid.innerHTML = list
    .map(
      (m) => `
    <button type="button" class="challenge-card" data-id="${m.id}">
      <span class="num">${escapeHtml(m.place)} · ${m.startYear}</span>
      <h3>${escapeHtml(m.title)}</h3>
      <p>${escapeHtml(m.scene.slice(0, 160))}…</p>
      <span class="cta">Accept mission →</span>
    </button>`
    )
    .join("");
  grid.querySelectorAll(".challenge-card").forEach((btn) => {
    btn.addEventListener("click", () => startMission(MISSIONS.find((m) => m.id === btn.dataset.id)));
  });
}

function startMission(mission) {
  state.mission = mission;
  state.global = globalById(mission.globalId) || state.global;
  state.year = mission.startYear;
  state.turn = 0;
  state.pressure = clonePressure(mission.pressure);
  state.selectedTechIds = [];
  state.inventionName = "";
  state.inventionHow = "";
  state.inventionImpact = "";
  state.storyFace = "how";
  state.writeBoth = false;
  state.challengePassed = false;
  state.challengeAngle = null;
  state.challengeText = "";
  state.challengeQuestion = "";
  state.challengeAnswer = "";
  state.challengeFeedback = "";
  state.challengeVerdict = null;
  state.challengeFails = 0;
  state.domainFilter = "all";
  state.sideTab = "vision";
  state.lastNews = `Mission clock starts ${mission.startYear}. Every emTech category is pickable — feasibility judges your claims.`;
  state.waitReport = "";
  state.outcome = null;
  state.aiTiming = null;
  if (state.vision) state.vision.newSession();
  showScreen("workshop");
  state.coInventor?.onChallengeStart?.();
  // Seed co-inventor welcome with mission context
  if (state.coInventor) {
    state.coInventor.reset(false);
    state.coInventor.pushAssistant(
      {
        message:
          `**${mission.place}**, ${mission.startYear}. ${mission.scene}\n\n` +
          `I'm your co-inventor. Pick any tech stack that fits **this place** — categories are never locked by year. ` +
          `Feasibility (red/yellow/green) judges whether your *how it works* over-claims what is possible this year.\n\n` +
          `Use **Art of the possible** for milestones, current capabilities, and use cases. ` +
          `**Wait** advances the world (+${mission.yearsPerTurn || GAME.yearsPerTurn} years) and raises crisis — not to unlock cards.\n\n` +
          `What's the first constraint you care about — cost, trust, speed, or who's left out?`,
        proposals: emptyProps(),
        teaching: [],
      },
      { local: true }
    );
  }
}

function emptyProps() {
  return {
    addTechIds: [],
    removeTechIds: [],
    inventionName: null,
    inventionHow: null,
    inventionImpact: null,
    scrutiny: null,
  };
}

/* —— Workshop —— */
function renderWorkshop() {
  const m = state.mission;
  const g = state.global || globalById(m.globalId);
  $("#ws-global-label").textContent = g ? `Global · ${g.title}` : "Mission";
  $("#ws-mission-title").textContent = m.title;
  $("#ws-mission-place").textContent = `${m.place}`;
  $("#ws-mission-scene").textContent = m.scene;
  $("#ws-stakeholder").textContent = m.stakeholder ? `Stakeholder: ${m.stakeholder}` : "";
  const help = $("#ws-crisis-help");
  if (help) {
    help.textContent = `Crisis meters = how bad things are here (0–5). Wait raises them. After you invent and pass a challenge, Deploy lowers them. Hit 5 on any meter or year ${m.collapseYear} and the mission fails.`;
  }
  const news = $("#ws-news");
  if (state.lastNews) {
    news.hidden = false;
    news.textContent = state.lastNews;
  } else news.hidden = true;

  const wr = $("#wait-report");
  if (wr) {
    if (state.waitReport) {
      wr.hidden = false;
      wr.innerHTML = state.waitReport;
    } else wr.hidden = true;
  }

  $("#invention-name").value = state.inventionName;
  $("#prompt-tip").textContent = tips()[state.turn % tips().length];

  renderHud();
  renderFilters();
  renderTechList();
  renderSelectedChips();
  renderSynergy();
  renderTiming();
  renderStoryFaceUI();
  syncHiddenStoryFields();
  renderFeasibility();
  updateChallengeButton();
  ensureCoInventor();
}

function playerStoryText() {
  return state.storyFace === "life" ? state.inventionImpact : state.inventionHow;
}

function companionStoryText() {
  return state.storyFace === "life" ? state.inventionHow : state.inventionImpact;
}

function setPlayerStoryText(text) {
  if (state.storyFace === "life") state.inventionImpact = text;
  else state.inventionHow = text;
}

function setCompanionStoryText(text) {
  if (state.storyFace === "life") state.inventionHow = text;
  else state.inventionImpact = text;
}

function syncHiddenStoryFields() {
  const howEl = $("#invention-how");
  const impEl = $("#invention-impact");
  if (howEl) howEl.value = state.inventionHow;
  if (impEl) impEl.value = state.inventionImpact;
}

function renderStoryFaceUI() {
  const both = state.writeBoth;
  $$(".story-mode-btn").forEach((btn) => {
    btn.classList.toggle("active", !both && btn.dataset.face === state.storyFace);
  });
  const writeBothBtn = $("#btn-write-both");
  if (writeBothBtn) {
    writeBothBtn.textContent = both ? "One face + AI" : "Write both";
  }

  const label = $("#label-player-story");
  const player = $("#invention-player");
  const companion = $("#field-companion");
  const compArea = $("#invention-companion");
  const compLabel = $("#label-companion");
  const note = $("#companion-note");

  if (both) {
    if (label) label.textContent = "How does it work?";
    if (player) {
      player.placeholder = "What acts, what decides, how the pieces connect…";
      player.value = state.inventionHow;
    }
    if (companion) companion.hidden = false;
    if (compLabel) compLabel.textContent = "Everyday life if it works (you write this too)";
    if (compArea) {
      compArea.placeholder = "A Tuesday here after your invention lands…";
      compArea.value = state.inventionImpact;
      compArea.readOnly = false;
    }
    if (note) note.textContent = "Writing both yourself — AI fill is optional.";
    const fillBtn = $("#btn-complete-picture");
    if (fillBtn) fillBtn.hidden = true;
  } else {
    if (state.storyFace === "how") {
      if (label) label.textContent = "How does it work? (you write)";
      if (player) {
        player.placeholder = "What acts, what decides, how the pieces connect for *this* place…";
        player.value = state.inventionHow;
      }
      if (compLabel) compLabel.textContent = "Everyday life (co-inventor)";
    } else {
      if (label) label.textContent = "Everyday life if it works (you write)";
      if (player) {
        player.placeholder = "A Tuesday here after your invention lands…";
        player.value = state.inventionImpact;
      }
      if (compLabel) compLabel.textContent = "How it works (co-inventor)";
    }
    if (companion) companion.hidden = false;
    if (compArea) {
      compArea.placeholder = "Click “Fill other side” — AI writes the missing half…";
      compArea.value = companionStoryText();
      compArea.readOnly = false; // allow edits after AI fill
    }
    if (note) {
      note.textContent = companionStoryText().trim()
        ? "AI draft — edit freely if it misses the mark."
        : "You write one face; AI fills the other.";
    }
    const fillBtn = $("#btn-complete-picture");
    if (fillBtn) fillBtn.hidden = false;
  }
  syncHiddenStoryFields();
}

function hasPlayerFace() {
  return playerStoryText().trim().length >= 20;
}

function hasCompanionFace() {
  if (state.writeBoth) {
    return state.inventionHow.trim().length >= 20 && state.inventionImpact.trim().length >= 20;
  }
  return companionStoryText().trim().length >= 20;
}

function timingCacheKey() {
  const how = state.inventionHow.trim().slice(0, 240);
  return `${state.year}|${state.selectedTechIds.join(",")}|${how}`;
}

/**
 * Feasibility assessment (traffic light) — timing scores CLAIMS, not card locks.
 * red = cannot go to challenge; yellow = risky but allowed; green = solid.
 */
function assessFeasibility() {
  const techs = selectedTechs();
  const year = state.year;
  const dims = [];

  // Timing — how-it-works vs year (AI override when fresh)
  let timingLevel = "red";
  let timingNote = "Add technologies, then write how it works — timing judges claims, not category cards.";
  if (techs.length) {
    const key = timingCacheKey();
    if (state.aiTiming?.forKey === key && state.aiTiming.level) {
      timingLevel = state.aiTiming.level;
      timingNote = state.aiTiming.reason || "AI timing assess.";
    } else {
      const how = state.inventionHow.trim() || state.inventionImpact.trim();
      const stretch = detectClaimStretch(how, techs, year);
      timingLevel = stretch.level;
      timingNote = stretch.reason;
    }
    if (timingLevel === "green") {
      const yearsWaited = year - (state.mission?.startYear || GAME.startYear);
      if (yearsWaited >= 6 && maxPressure() >= 3) {
        timingLevel = "yellow";
        timingNote = `Claims look near-term, but you've waited until ${year} with rising crisis. Timing is tight.`;
      }
    }
  }
  dims.push({ id: "timing", name: "Timing", level: timingLevel, note: timingNote });

  // Story completeness
  let storyLevel = "red";
  let storyNote = "Need a name plus your story face and the other face (AI fill or write both).";
  const named = state.inventionName.trim().length >= 2;
  const playerOk = hasPlayerFace();
  const companionOk = hasCompanionFace();
  if (named && playerOk && companionOk) {
    const len = (state.inventionHow + state.inventionImpact).trim().length;
    storyLevel = len >= 120 ? "green" : "yellow";
    storyNote =
      storyLevel === "green"
        ? "Story faces are filled with enough detail to challenge."
        : "Both faces exist but are thin — a clearer mechanism will help under attack.";
  } else if (named && playerOk) {
    storyLevel = "yellow";
    storyNote = "You've written one face — still need the other side filled.";
  } else if (playerOk || named) {
    storyLevel = "red";
    storyNote = "Incomplete: name + your paragraph + companion face.";
  }
  dims.push({ id: "story", name: "Story", level: storyLevel, note: storyNote });

  // Local fit — suggested techs for this mission
  let fitLevel = "yellow";
  let fitNote = "No stack yet — mission suggestions appear with a gold edge.";
  if (techs.length) {
    const suggested = new Set(state.mission?.suggested || []);
    const hits = techs.filter((t) => suggested.has(t.id)).length;
    if (hits === 0 && suggested.size) {
      fitLevel = "yellow";
      fitNote = "None of the mission's suggested techs are in your stack — can still work, but check local fit.";
    } else if (hits >= 2 || (hits >= 1 && techs.length === 1)) {
      fitLevel = "green";
      fitNote = `Local fit: ${hits} suggested tech${hits === 1 ? "" : "s"} for this place.`;
    } else {
      fitLevel = "green";
      fitNote = "Stack may fit — gold-edge techs are hints, not requirements.";
    }
  } else {
    fitLevel = "red";
  }
  dims.push({ id: "fit", name: "Local fit", level: fitLevel, note: fitNote });

  // Stack shape (soft — never a hard red unless empty)
  let stackLevel = "red";
  let stackNote = "Add at least one technology.";
  if (techs.length === 1) {
    stackLevel = "yellow";
    stackNote = "Single-tech focus is fine if the mechanism is clear for this crisis.";
  } else if (techs.length >= 2) {
    const domains = domainsInStack(techs);
    stackLevel = "green";
    stackNote =
      domains.length >= 2
        ? `Cross-domain mix (${domains.map((d) => DOMAINS[d]?.label || d).join(" + ")}).`
        : `${techs.length} techs in ${DOMAINS[domains[0]]?.label || "one"} domain.`;
  }
  dims.push({ id: "stack", name: "Stack", level: stackLevel, note: stackNote });

  // Overall: any critical red → red; else any yellow → yellow; else green
  const levels = dims.map((d) => d.level);
  // Timing red or no techs or incomplete story that blocks = red
  let overall = "green";
  if (levels.includes("red")) overall = "red";
  else if (levels.includes("yellow")) overall = "yellow";

  const summaries = {
    red: "Not ready for the challenge yet — fix red items (story, stack, or over-claim timing).",
    yellow: "Risky but challengeable — you can proceed; strengthen weak spots if you can.",
    green: "Looks feasible for this year and place — face the challenge when you're ready.",
  };

  return {
    overall,
    summary: summaries[overall],
    dims,
    canChallenge: overall !== "red" && !collapsed(),
  };
}

function inventReadyForChallenge() {
  return assessFeasibility().canChallenge;
}

function renderFeasibility() {
  const box = $("#feasibility");
  if (!box) return;
  const f = assessFeasibility();
  const light = $("#feasibility-light");
  const label = $("#feasibility-level-label");
  const summary = $("#feasibility-summary");
  const dims = $("#feasibility-dims");
  const foot = $("#feasibility-foot");
  if (light) light.dataset.level = f.overall;
  if (label) label.textContent = f.overall;
  if (summary) summary.textContent = f.summary;
  if (dims) {
    dims.innerHTML = f.dims
      .map(
        (d) =>
          `<li><span class="dot ${d.level}"></span><span class="dim-name">${escapeHtml(
            d.name
          )}</span><span>${escapeHtml(d.note)}</span></li>`
      )
      .join("");
  }
  if (foot) {
    foot.textContent =
      f.overall === "red"
        ? "Green or yellow to face the challenge. Timing red usually means the how-it-works over-claims what is possible this year — revise claims or use Art of the possible."
        : "Any emTech category is pickable. Timing judges whether your how-it-works over-claims the present.";
  }
}

function renderHud() {
  $("#hud-year").textContent = String(state.year);
  $("#hud-turn").textContent = `Turn ${state.turn} · fail at ${state.mission.collapseYear}`;
  const box = $("#hud-pressure");
  box.innerHTML = Object.entries(state.pressure)
    .map(([k, v]) => {
      const level = v >= 4 ? "hot" : v >= 2 ? "warm" : "cool";
      return `<span class="meter ${level}" title="${escapeHtml(k)}: how bad this part of the local crisis is (0–5). Wait raises it; Deploy lowers it."><b>${escapeHtml(k)}</b> ${"●".repeat(v)}${"○".repeat(Math.max(0, 5 - v))}</span>`;
    })
    .join("");
  // step pills
  $$(".invent-steps .pill").forEach((p) => {
    const step = p.dataset.step;
    p.classList.toggle("active", step === "invent" && state.screen === "workshop");
    p.classList.toggle("done", step === "invent" && state.screen !== "workshop");
  });
}

function renderFilters() {
  const row = $("#filter-row");
  const keys = ["all", ...Object.keys(DOMAINS)];
  row.innerHTML = keys
    .map((d) => {
      const label = d === "all" ? "All" : DOMAINS[d].label;
      const active = state.domainFilter === d ? "active" : "";
      return `<button type="button" class="filter-chip ${active}" data-domain="${d}">${label}</button>`;
    })
    .join("");
  row.querySelectorAll(".filter-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.domainFilter = btn.dataset.domain;
      renderFilters();
      renderTechList();
    });
  });
}

function renderTechList() {
  const suggested = new Set(state.mission?.suggested || []);
  let list = [...TECHS];
  if (state.domainFilter !== "all") list = list.filter((t) => t.domain === state.domainFilter);
  list.sort((a, b) => {
    const ar = suggested.has(a.id) ? 0 : 1;
    const br = suggested.has(b.id) ? 0 : 1;
    if (ar !== br) return ar - br;
    return a.name.localeCompare(b.name);
  });

  const el = $("#tech-list");
  el.innerHTML = list
    .map((t) => {
      const sel = state.selectedTechIds.includes(t.id);
      const sug = suggested.has(t.id);
      const color = DOMAINS[t.domain]?.color || "#94a3b8";
      const nowCap = t.useCasesNow?.[0] || t.maturity?.now || t.summary;
      return `
        <button type="button" class="tech-card ${sel ? "selected" : ""} ${sug ? "recommended" : ""}"
          data-id="${t.id}" style="--domain:${color}" title="${escapeHtml(nowCap)}">
          <span class="tech-icon">${t.icon}</span>
          <span class="tech-meta">
            <h4>${escapeHtml(t.name)}</h4>
            <p>${escapeHtml(t.summary)}</p>
            <span class="tech-domain">${DOMAINS[t.domain]?.label || t.domain}${
              sug ? " · suggested" : ""
            }</span>
          </span>
          <span class="tech-add">${sel ? "✓" : "+"}</span>
        </button>`;
    })
    .join("");

  el.querySelectorAll(".tech-card").forEach((btn) => {
    btn.addEventListener("click", () => onTechClick(btn.dataset.id));
    btn.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      openTechModal(btn.dataset.id);
    });
  });
}

function onTechClick(id) {
  const idx = state.selectedTechIds.indexOf(id);
  if (idx >= 0) state.selectedTechIds.splice(idx, 1);
  else {
    if (state.selectedTechIds.length >= 8) {
      flashToast("Stack full (8). Remove one first.");
      return;
    }
    state.selectedTechIds.push(id);
  }
  state.aiTiming = null;
  renderTechList();
  renderSelectedChips();
  renderSynergy();
  renderTiming();
  renderFeasibility();
  updateChallengeButton();
  updateVision();
  scheduleAiTimingAssess();
}

function renderSelectedChips() {
  const box = $("#selected-techs");
  const techs = selectedTechs();
  if (!techs.length) {
    box.innerHTML = `<span class="empty-hint">Click technologies to add them to your invention.</span>`;
    return;
  }
  box.innerHTML = techs
    .map(
      (t) =>
        `<span class="tech-chip">${t.icon} ${escapeHtml(t.name)}<button type="button" data-remove="${t.id}">×</button></span>`
    )
    .join("");
  box.querySelectorAll("[data-remove]").forEach((b) =>
    b.addEventListener("click", () => onTechClick(b.dataset.remove))
  );
}

function renderSynergy() {
  const box = $("#synergy-box");
  const techs = selectedTechs();
  const domains = domainsInStack(techs);
  const pairs = computeSynergies(techs);
  if (!techs.length) {
    box.innerHTML = `Pick tech that fits the local problem. Crossing domains can strengthen a solution — only when it makes sense.`;
    return;
  }
  if (techs.length === 1) {
    box.innerHTML = `Stack: <strong>${escapeHtml(techs[0].name)}</strong> (${DOMAINS[domains[0]]?.label || domains[0]}). A single tool can be enough if the mechanism is clear.`;
    return;
  }
  const pairText = pairs.length
    ? ` Synergies: ${pairs.map(([a, b]) => `${techById(a).name} × ${techById(b).name}`).join(" · ")}.`
    : "";
  if (domains.length >= 2) {
    box.innerHTML = `<strong>Cross-domain mix:</strong> ${domains
      .map((d) => DOMAINS[d]?.label || d)
      .join(" + ")}.${pairText}`;
  } else {
    box.innerHTML = `Stack in <strong>${DOMAINS[domains[0]]?.label}</strong> (${techs.length} techs).${pairText} Fine to deploy — add another domain only if you need it.`;
  }
}

function renderTiming() {
  const box = $("#timing-box");
  const techs = selectedTechs();
  const step = state.mission?.yearsPerTurn || GAME.yearsPerTurn;
  const nextYear = state.year + step;
  if (!techs.length) {
    box.innerHTML = `Year <strong>${state.year}</strong>. Pick any emTech category. Feasibility judges whether your <em>how it works</em> over-claims this year. <strong>Wait</strong> advances the world (and crisis) if you want later conditions.`;
    return;
  }
  const stretch = detectClaimStretch(
    state.inventionHow.trim() || state.inventionImpact.trim(),
    techs,
    state.year
  );
  box.innerHTML = `Year <strong>${state.year}</strong> · timing signal: <strong>${stretch.level}</strong> — ${escapeHtml(
    stretch.reason
  )} Use <strong>Art of the possible</strong> on the co-inventor for milestones & capabilities. Wait → ${nextYear} raises crisis.`;
}

function challengeBlockReason() {
  const f = assessFeasibility();
  if (collapsed()) return "Too late — mission collapsed.";
  if (f.overall === "red") {
    const reds = f.dims.filter((d) => d.level === "red");
    if (reds.length) return `Feasibility red: ${reds.map((d) => d.note).join(" · ")}`;
    return f.summary;
  }
  return "";
}

function updateChallengeButton() {
  const btn = $("#btn-to-challenge");
  if (!btn) return;
  renderFeasibility();
  const f = assessFeasibility();
  const reason = challengeBlockReason();
  const ok = f.canChallenge;
  btn.disabled = !ok;
  btn.title = ok
    ? f.overall === "yellow"
      ? "Feasibility yellow — you can still face the challenge"
      : "Feasibility green — face a random challenge next"
    : reason;
  const hint = $("#challenge-ready-hint");
  if (hint) {
    if (ok) {
      hint.textContent =
        f.overall === "green"
          ? "Feasibility green — face the challenge when ready."
          : "Feasibility yellow — risky but allowed. Challenge next.";
      hint.className = "challenge-ready-hint ready";
    } else {
      hint.textContent = reason;
      hint.className = "challenge-ready-hint blocked";
    }
  }
}

/* —— Wait / Challenge / Deploy —— */
function waitTurn() {
  if (collapsed()) {
    finishOutcome("collapse");
    return;
  }
  const m = state.mission;
  const step = m.yearsPerTurn || GAME.yearsPerTurn;
  const prevYear = state.year;
  const prevPressure = clonePressure(state.pressure);
  state.year += step;
  state.turn += 1;

  const rise = m.pressureRise || {};
  for (const [k, v] of Object.entries(state.pressure)) {
    const delta = rise[k] ?? 1;
    state.pressure[k] = Math.min(5, v + delta);
  }

  // Soft horizon: categories whose "near" use cases often get more common
  const horizonShift = TECHS.filter((t) => t.readyYear > prevYear && t.readyYear <= state.year);
  const news = newsForYear(state.year);
  const horizon =
    horizonShift.length > 0
      ? `Near-scale use cases get more common for: ${horizonShift.map((t) => t.name).join(", ")} (still always pickable)`
      : "World conditions moved; categories stay pickable — re-check claim timing";
  const crisisLine = Object.keys(state.pressure)
    .map((k) => `${k} ${prevPressure[k]}→${state.pressure[k]}`)
    .join(" · ");

  state.waitReport = `<strong>→ ${state.year}</strong> (Wait from ${prevYear})<br/>
    <span class="ok">Capability horizon:</span> ${escapeHtml(horizon)}<br/>
    <span class="bad">Crisis rose:</span> ${escapeHtml(crisisLine)}<br/>
    <span class="muted">${escapeHtml(news)}</span>`;
  state.lastNews = `→ ${state.year}. ${horizon}. Crisis tightened. ${news}`.trim();
  state.aiTiming = null; // re-evaluate claims in new year
  state.challengePassed = false;
  state.challengeVerdict = null;

  if (collapsed()) {
    renderWorkshop();
    finishOutcome("collapse");
    return;
  }

  flashToast(`Clock → ${state.year} · crisis rose`);
  renderWorkshop();
  updateVision({ immediate: true });
  scheduleAiTimingAssess();
  state.coInventor?.pushAssistant?.(
    {
      message:
        state.lastNews +
        "\n\nYou waited for later world conditions. Crisis meters went up. Refine claims or face the challenge when ready.",
      proposals: emptyProps(),
      teaching: horizonShift.slice(0, 2).map((t) => ({
        techId: t.id,
        blurb: t.maturity?.near || t.summary,
      })),
    },
    { local: true }
  );
}

function pickChallengeAngle() {
  const used = state.challengeAngle;
  const pool = CHALLENGE_ANGLES.filter((a) => a.id !== used);
  const list = pool.length ? pool : CHALLENGE_ANGLES;
  return list[Math.floor(Math.random() * list.length)];
}

function localPose(angle) {
  const place = state.mission?.place || "here";
  const name = state.inventionName || "this invention";
  if (angle.id === "nature") {
    return {
      speech: `Mother Nature, ${place}: “${name} still runs on energy, materials, and waste. Storms and scarcity don’t negotiate.”`,
      question: "What breaks first in a bad week — and how does your design absorb it?",
    };
  }
  if (angle.id === "policy") {
    return {
      speech: `Policy & money, ${place}: “Someone must sign and someone must pay. If households can’t afford this, the pilot photo is the whole story.”`,
      question: "Who pays year 1 and year 5 — and who is priced out?",
    };
  }
  return {
    speech: `Moloch, ${place}: “There’s no way ${name} holds. Free-riders keep old habits while careful people pay. The race to the bottom eats good design.”`,
    question: "What stops defection when neighbors or vendors can freeride?",
  };
}

async function apiCoInvent(mode, userContent, extra = {}) {
  const res = await fetch("/api/co-invent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode,
      messages: [{ role: "user", content: userContent }],
      context: {
        challenge: state.mission
          ? {
              id: state.mission.id,
              title: state.mission.title,
              problem: state.mission.scene,
              recommended: state.mission.suggested,
            }
          : null,
        selectedTechIds: [...state.selectedTechIds],
        inventionName: state.inventionName,
        inventionHow: state.inventionHow,
        inventionImpact: state.inventionImpact,
        storyFace: state.storyFace,
        year: state.year,
        place: state.mission?.place,
        pressure: state.pressure,
        availableTechs: TECHS.map((t) => techForAi(t, state.year)),
        ...extra,
      },
    }),
  });
  return res.json();
}

/** Debounced AI timing assess — feeds state.aiTiming into feasibility light */
let _aiTimingTimer = null;
function scheduleAiTimingAssess() {
  clearTimeout(_aiTimingTimer);
  _aiTimingTimer = setTimeout(() => {
    runAiTimingAssess().catch(() => {});
  }, 1600);
}

async function runAiTimingAssess() {
  const techs = selectedTechs();
  if (!techs.length) return;
  const how = state.inventionHow.trim();
  if (how.length < 40) return;
  const key = timingCacheKey();
  if (state.aiTiming?.forKey === key) return;
  try {
    const data = await apiCoInvent("assess-feasibility", "[Assess claim timing]", {});
    const level = data.timing?.level || data.timingLevel;
    const reason = data.timing?.reason || data.timingNote || data.message;
    if (level && ["red", "yellow", "green"].includes(level)) {
      state.aiTiming = {
        level,
        reason: String(reason || "").slice(0, 400),
        forKey: key,
      };
      renderFeasibility();
      renderTiming();
      updateChallengeButton();
    }
  } catch {
    /* client heuristic remains */
  }
}

async function enterChallenge() {
  if (!inventReadyForChallenge()) {
    flashToast("Finish the invention first (name, stack, both story faces; fix red feasibility).");
    return;
  }
  state.challengeAnswer = "";
  state.challengeFeedback = "";
  state.challengeVerdict = null;
  if (state.challengeFails >= 2) state.challengeFails = 0;
  const angle = pickChallengeAngle();
  state.challengeAngle = angle.id;
  showScreen("challenge-step");
  await poseChallenge(angle);
}

async function poseChallenge(angleMeta) {
  const angle = angleMeta || CHALLENGE_ANGLES.find((a) => a.id === state.challengeAngle);
  $("#challenge-angle-label").textContent = "Your idea is under attack";
  $("#challenge-angle-title").textContent = angle.label;
  $("#challenge-angle-sub").textContent = `${angle.subtitle} — ${angle.blurb}`;
  $("#ch-hud-year").textContent = String(state.year);
  $("#ch-hud-turn").textContent = `Turn ${state.turn}`;
  $("#challenge-speech").innerHTML = `<p class="muted">Posing challenge…</p>`;
  $("#challenge-question").textContent = "";
  $("#challenge-answer").value = "";
  $("#challenge-feedback").hidden = true;
  $("#btn-challenge-deploy").hidden = true;
  $("#btn-challenge-submit").disabled = true;

  try {
    const data = await apiCoInvent("pose-challenge", "[Pose challenge]", {
      challengeAngle: angle.id,
    });
    state.challengeText = data.challengeSpeech || data.message || "";
    state.challengeQuestion =
      data.challengeQuestion || "How does your invention survive this attack?";
    if (data.angle) state.challengeAngle = data.angle;
    const meta = CHALLENGE_ANGLES.find((a) => a.id === state.challengeAngle) || angle;
    $("#challenge-angle-title").textContent = data.angleLabel || meta.label;
    $("#challenge-speech").innerHTML = `<p>${escapeHtml(state.challengeText).replace(/\n/g, "<br>")}</p>`;
    $("#challenge-question").textContent = state.challengeQuestion;
  } catch {
    const fb = localPose(angle);
    state.challengeText = fb.speech;
    state.challengeQuestion = fb.question;
    $("#challenge-speech").innerHTML = `<p>${escapeHtml(fb.speech)}</p>`;
    $("#challenge-question").textContent = fb.question;
  }
  $("#btn-challenge-submit").disabled = false;
}

function renderChallengeStep() {
  $("#ch-hud-year").textContent = String(state.year);
  $("#ch-hud-turn").textContent = `Turn ${state.turn}`;
  if (state.challengeText) {
    $("#challenge-speech").innerHTML = `<p>${escapeHtml(state.challengeText).replace(/\n/g, "<br>")}</p>`;
  }
  $("#challenge-question").textContent = state.challengeQuestion || "";
  $("#challenge-answer").value = state.challengeAnswer || "";
  const fb = $("#challenge-feedback");
  const dep = $("#btn-challenge-deploy");
  if (state.challengeFeedback) {
    fb.hidden = false;
    fb.className = `challenge-feedback ${state.challengeVerdict || ""}`;
    fb.innerHTML = state.challengeFeedback;
  } else fb.hidden = true;
  if (state.challengePassed) {
    dep.hidden = false;
    dep.disabled = false;
  } else {
    dep.hidden = true;
    dep.disabled = true;
  }
}

function showChallengeCoach(html) {
  const panel = $("#challenge-coach-panel");
  if (!panel) return;
  panel.hidden = false;
  panel.innerHTML = html;
  panel.querySelector("#btn-apply-draft")?.addEventListener("click", () => {
    const draft = panel.dataset.draft || "";
    if (!draft) return;
    state.challengeAnswer = draft;
    $("#challenge-answer").value = draft;
    flashToast("Draft copied — edit it, then submit");
  });
}

function setChallengeHelpBusy(busy) {
  ["#btn-challenge-coach", "#btn-challenge-draft", "#btn-challenge-ask"].forEach((sel) => {
    const el = $(sel);
    if (el) el.disabled = busy;
  });
}

async function coachChallenge(mode, userText) {
  if (state.aiBusy) return;
  if (!state.challengeQuestion && !state.challengeText) {
    flashToast("Wait for the challenge to load first.");
    return;
  }
  state.aiBusy = true;
  setChallengeHelpBusy(true);
  showChallengeCoach(`<p class="muted">${mode === "draft-challenge" ? "Drafting…" : "Coaching…"}</p>`);
  try {
    const data = await apiCoInvent(mode, userText || "[Help with challenge]", {
      challengeAngle: state.challengeAngle,
      challengeSpeech: state.challengeText,
      challengeQuestion: state.challengeQuestion,
      playerAnswer: $("#challenge-answer")?.value || "",
    });
    const msg = escapeHtml(data.message || "Here's help.").replace(/\n/g, "<br>");
    let html = `<div>${msg}</div>`;
    if (data.draftAnswer) {
      const draft = String(data.draftAnswer).trim();
      html += `<div class="draft-block"><strong>Draft answer</strong><p>${escapeHtml(draft).replace(
        /\n/g,
        "<br>"
      )}</p><div class="draft-actions"><button type="button" class="btn btn-primary btn-sm" id="btn-apply-draft">Use this draft</button></div></div>`;
      const panel = $("#challenge-coach-panel");
      if (panel) panel.dataset.draft = draft;
    }
    showChallengeCoach(html);
  } catch (e) {
    // local fallback
    const angle = CHALLENGE_ANGLES.find((a) => a.id === state.challengeAngle) || CHALLENGE_ANGLES[0];
    const place = state.mission?.place || "this place";
    const name = state.inventionName || "your invention";
    if (mode === "draft-challenge") {
      const draft =
        angle.id === "nature"
          ? `In ${place}, ${name} fails first on overload or waste without caps. We meter energy/materials, monitor, and degrade safely in extremes.`
          : angle.id === "policy"
            ? `In ${place}, adoption needs a named payer for year-1 and year-5 costs, plus a free tier so low-income users aren't priced out.`
            : `In ${place}, freeriders would skip ${name}. We make participation default for covered blocks, publish compliance, and tie a small shared fee/reward to verified use.`;
      const panel = $("#challenge-coach-panel");
      if (panel) panel.dataset.draft = draft;
      showChallengeCoach(
        `<div>Draft for this ${angle.label} attack — edit before submit.</div><div class="draft-block"><strong>Draft answer</strong><p>${escapeHtml(
          draft
        )}</p><div class="draft-actions"><button type="button" class="btn btn-primary btn-sm" id="btn-apply-draft">Use this draft</button></div></div>`
      );
    } else {
      showChallengeCoach(
        `<div><strong>${angle.label} coaching</strong><br/>${escapeHtml(
          angle.blurb
        )}<br/><br/>• Answer the exact question asked.<br/>• Name a concrete actor, cost, or physical limit in ${escapeHtml(
          place
        )}.<br/>• Tie the fix to your stack and invention name.<br/>• One clear safeguard beats vague hope.</div>`
      );
    }
  } finally {
    state.aiBusy = false;
    setChallengeHelpBusy(false);
  }
}

async function submitChallengeAnswer() {
  const answer = $("#challenge-answer").value.trim();
  state.challengeAnswer = answer;
  if (answer.length < 20) {
    flashToast("Give a real answer — a short paragraph.");
    return;
  }
  $("#btn-challenge-submit").disabled = true;
  try {
    const data = await apiCoInvent("judge-challenge", answer, {
      challengeAngle: state.challengeAngle,
      challengeSpeech: state.challengeText,
      challengeQuestion: state.challengeQuestion,
      playerAnswer: answer,
    });
    const verdict = (data.verdict || "partial").toLowerCase();
    state.challengeVerdict = ["pass", "partial", "fail"].includes(verdict) ? verdict : "partial";
    state.challengeFeedback = `<strong>${state.challengeVerdict.toUpperCase()}</strong> — ${escapeHtml(
      data.message || data.lesson || "Judged."
    )}${data.lesson ? `<br/><em>${escapeHtml(data.lesson)}</em>` : ""}`;
    if (state.challengeVerdict === "fail") {
      state.challengeFails += 1;
      state.challengePassed = false;
      state.challengeFeedback +=
        state.challengeFails >= 2
          ? "<br/>Two fails — go back to Invent, strengthen the idea, then try again."
          : "<br/>Not enough. Revise your answer, or return to Invent. Next challenge may use a different angle.";
    } else {
      state.challengePassed = true;
    }
  } catch {
    const ok = answer.length >= 40;
    state.challengeVerdict = ok ? "partial" : "fail";
    state.challengePassed = ok;
    state.challengeFeedback = ok
      ? "<strong>PARTIAL</strong> — Concrete enough to try a deploy."
      : "<strong>FAIL</strong> — Too vague. Name who acts, who pays, or what limit you respect.";
    if (!ok) state.challengeFails += 1;
  }
  $("#btn-challenge-submit").disabled = false;
  renderChallengeStep();
}

function attemptDeploy() {
  if (!state.challengePassed) {
    flashToast("Pass the challenge step first.");
    showScreen("challenge-step");
    return;
  }
  const techs = selectedTechs();
  if (!techs.length) {
    flashToast("Add at least one technology.");
    return;
  }
  if (!hasPlayerFace() || !hasCompanionFace()) {
    flashToast("Need both story faces.");
    return;
  }
  if (assessFeasibility().overall === "red") {
    flashToast("Feasibility is red — revise how-it-works timing claims first.");
    return;
  }

  const domains = domainsInStack(techs);
  const pairs = computeSynergies(techs);
  const words = (state.inventionHow + " " + state.inventionImpact).trim().split(/\s+/).length;
  let drop = 1 + Math.min(2, techs.length - 1);
  if (domains.length >= 2) drop += 1;
  if (pairs.length) drop += 1;
  if (words >= 40) drop += 1;
  if (state.challengeVerdict === "pass") drop += 1;
  if (state.challengeAnswer.trim().length >= 60) drop += 1;
  const suggested = new Set(state.mission.suggested || []);
  if (techs.filter((t) => suggested.has(t.id)).length >= 2) drop += 1;

  const keys = Object.keys(state.pressure);
  const ordered = [...keys].sort((a, b) => state.pressure[b] - state.pressure[a]);
  let remaining = drop;
  for (const k of ordered) {
    if (remaining <= 0) break;
    const can = state.pressure[k];
    const take = Math.min(can, Math.ceil(remaining / 2) || 1);
    state.pressure[k] = Math.max(0, can - take);
    remaining -= take;
  }
  for (const k of ordered) {
    if (remaining <= 0) break;
    if (state.pressure[k] > 0) {
      state.pressure[k]--;
      remaining--;
    }
  }

  state.lastNews = `Deployed in ${state.year} after ${state.challengeAngle} challenge. Crisis −${drop}.`;
  state.waitReport = "";
  finishOutcome(wonMission() ? "win" : "partial", {
    drop,
    domains,
    pairs,
    verdict: state.challengeVerdict,
    angle: state.challengeAngle,
  });
}

function finishOutcome(kind, meta = {}) {
  const techs = selectedTechs();
  state.outcome = { kind, meta, techs, year: state.year, turn: state.turn, pressure: clonePressure(state.pressure) };
  showScreen("outcome");
}

function renderOutcome() {
  const o = state.outcome;
  const m = state.mission;
  const name = state.inventionName.trim() || "Untitled invention";
  $("#outcome-name").textContent = name;
  $("#outcome-meta").textContent = `${m.place} · ${o.year} · Turn ${o.turn} · ${
    state.global?.title || ""
  }`;

  const img = $("#outcome-vision-image");
  if (state.vision?.currentUrl && img) {
    img.hidden = false;
    img.src = state.vision.currentUrl;
    $("#outcome-vision-status").textContent = `Vision of ${m.place}, ${o.year}`;
  }

  let headline = "Holding the line";
  let story = "";
  const lessons = [];

  if (o.kind === "win") {
    headline = "Crisis eased";
    story =
      `In ${o.year}, ${name} landed in ${m.place}. Crisis meters fell enough for people to breathe. ` +
      `You survived a ${o.meta?.angle || "challenge"} attack, then deployed. ` +
      (state.inventionImpact.trim()
        ? `Everyday life: ${state.inventionImpact.trim()}`
        : "A local face of a global problem got smaller.");
    lessons.push({
      type: "good",
      text: `Challenge (${o.meta?.angle || "stress-test"}): ${state.challengeVerdict || "passed"}.`,
    });
    lessons.push({
      type: "good",
      text: `Timing: deployed with feasible claims in ${o.year}, before fail year ${m.collapseYear}.`,
    });
    lessons.push({
      type: "good",
      text: `Local → global: ${m.place} is one face of “${state.global?.title || "the larger problem"}”.`,
    });
  } else if (o.kind === "partial") {
    headline = "Deployed — crisis still hot";
    story =
      `In ${o.year}, ${name} went live in ${m.place} and eased pressure (−${o.meta?.drop || "?"} on the meters), but not enough to fully win. ` +
      `You can keep inventing (meters stay as they are) or take what you learned to a new mission.`;
    lessons.push({
      type: "grow",
      text: "Partial win: strengthen the mechanism, wait for better tech (crisis rises), or accept the lesson and try another place.",
    });
    if (o.meta?.angle) {
      lessons.push({
        type: "good",
        text: `You answered a ${o.meta.angle} challenge before deploying — that discipline matters.`,
      });
    }
  } else if (o.kind === "collapse") {
    headline = "Too late";
    story =
      `By ${o.year}, crisis in ${m.place} broke past what a late invention could fix. ` +
      `Waiting can improve world conditions for your claims — but crisis meters rise. The clock cuts both ways.`;
    lessons.push({ type: "grow", text: "Problems escalate on a clock. Waiting is never free." });
    lessons.push({
      type: "grow",
      text: "Categories were always pickable — the skill is matching how-it-works claims to the year.",
    });
  } else {
    headline = "Mission paused";
    story = "You left the forge. The calendar in that place keeps moving without you.";
  }

  $("#outcome-headline").textContent = headline;
  $("#outcome-story").textContent = story;
  $("#outcome-lessons").innerHTML = lessons
    .map((l) => `<li class="${l.type}">${escapeHtml(l.text)}</li>`)
    .join("");

  // Foresight: milestones, trends, predictions
  const fs = foresightForStack(
    (o.techs || []).map((t) => t.id),
    state.global?.id || state.mission?.globalId,
    o.year
  );
  const fg = $("#outcome-foresight");
  if (fg) {
    const card = (kind, label, item) => {
      if (!item) return "";
      return `<article class="foresight-card foresight-${kind}">
        <div class="foresight-kind">${label}</div>
        <p>${escapeHtml(item.text)}</p>
      </article>`;
    };
    const html =
      card("milestone", "Milestone (already real)", fs.milestone) +
      card("trend", "Trend", fs.trend) +
      card("prediction", "Prediction", fs.prediction);
    fg.innerHTML = html || "<p class='empty-hint'>No foresight cards matched this stack.</p>";
  }

  $("#outcome-techs").innerHTML = (o.techs || [])
    .map(
      (t) => `
      <article class="learn-card">
        <h4><span>${t.icon}</span> ${escapeHtml(t.name)}</h4>
        <p>${escapeHtml(t.learn)}</p>
        <p style="margin-top:0.4rem;font-size:0.8rem;color:var(--text-mute)"><strong>Now:</strong> ${escapeHtml(
          t.maturity?.now || ""
        )}</p>
      </article>`
    )
    .join("") || "<p class='empty-hint'>No technologies were locked in.</p>";
}

/* —— Vision —— */
function ensureVision() {
  const root = $("#vision-root");
  if (!root) return;
  if (!state.vision) state.vision = new VisionRenderer(root);
}

function updateVision(opts = {}) {
  if (!state.mission) return;
  ensureVision();
  const techs = selectedTechs();
  const stage = currentStage();
  $("#vision-stage-name").textContent = `${stage.name} · ${state.year}`;
  $("#vision-stage-blurb").textContent = stage.blurb;

  const box = $("#vision-narratives");
  if (box) {
    const narratives = narrativesFromTechs(techs);
    const pressureLine = Object.entries(state.pressure)
      .map(([k, v]) => `${k} ${v}/5`)
      .join(" · ");
    const head = `<div class="narrative-card"><div class="src">${state.year}</div>Pressure: ${escapeHtml(pressureLine)}</div>`;
    box.innerHTML =
      head +
      (narratives.length
        ? narratives
            .map(
              (n) =>
                `<div class="narrative-card"><div class="src">${escapeHtml(n.name)}</div>${escapeHtml(n.text)}</div>`
            )
            .join("")
        : `<div class="narrative-card"><div class="src">Place</div>${escapeHtml(state.mission.scene.slice(0, 180))}</div>`);
  }

  if (!state.vision) return;
  state.vision.setState({
    stageId: stage.id,
    stage,
    challenge: {
      id: state.mission.id,
      title: state.mission.title,
      problem: state.mission.scene,
      visionTheme: state.mission.visionTheme,
    },
    techs,
    inventionName: state.inventionName,
    inventionHow: state.inventionHow,
    inventionImpact: state.inventionImpact,
    year: state.year,
    place: state.mission.place,
    pressure: state.pressure,
    immediate: Boolean(opts.immediate),
    force: Boolean(opts.force),
    debounceMs: opts.debounceMs,
  });
}

function setSideTab(tab) {
  state.sideTab = tab;
  $$(".side-tab").forEach((btn) => {
    const on = btn.dataset.tab === tab;
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-selected", on ? "true" : "false");
  });
  const vision = $("#side-vision");
  const co = $("#side-coinventor");
  if (vision) vision.hidden = tab !== "vision";
  if (co) co.hidden = tab !== "coinventor";
  if (tab === "vision") {
    requestAnimationFrame(() => {
      ensureVision();
      updateVision();
    });
  }
  if (tab === "coinventor") ensureCoInventor();
}

/* —— Co-inventor —— */
function ensureCoInventor() {
  if (state.coInventor) return state.coInventor;
  const root = $("#co-inventor-root");
  if (!root) return null;
  state.coInventor = new CoInventor({
    getContext: () => ({
      challenge: state.mission
        ? {
            id: state.mission.id,
            title: state.mission.title,
            problem: state.mission.scene,
            stakes: state.mission.place,
            prompt: `Invent a local solution for ${state.mission.place} in ${state.year}.`,
            recommended: state.mission.suggested,
            successLens: "Local fit + timing + clear mechanism",
            flag: state.global?.kind === "before" ? "prevention" : "present",
          }
        : null,
      selectedTechIds: [...state.selectedTechIds],
      inventionName: state.inventionName,
      inventionHow: state.inventionHow,
      inventionImpact: state.inventionImpact,
      storyFace: state.storyFace,
      writeBoth: state.writeBoth,
      year: state.year,
      turn: state.turn,
      pressure: state.pressure,
      place: state.mission?.place,
      availableTechs: TECHS.map((t) => techForAi(t, state.year)),
    }),
    applyProposals: applyCoInventorProposals,
    techById,
  });
  state.coInventor.mount(root);
  return state.coInventor;
}

function applyCoInventorProposals(proposals) {
  if (!proposals) return;
  let changed = false;
  for (const id of proposals.removeTechIds || []) {
    const i = state.selectedTechIds.indexOf(id);
    if (i >= 0) {
      state.selectedTechIds.splice(i, 1);
      changed = true;
    }
  }
  for (const id of proposals.addTechIds || []) {
    if (!techById(id) || state.selectedTechIds.includes(id)) continue;
    if (state.selectedTechIds.length >= 8) break;
    state.selectedTechIds.push(id);
    changed = true;
  }
  if (proposals.inventionName) {
    state.inventionName = proposals.inventionName;
    $("#invention-name").value = state.inventionName;
    changed = true;
  }
  if (proposals.inventionHow) {
    state.inventionHow = proposals.inventionHow;
    $("#invention-how").value = state.inventionHow;
    changed = true;
  }
  if (proposals.inventionImpact) {
    state.inventionImpact = proposals.inventionImpact;
    changed = true;
  }
  if (changed) {
    state.aiTiming = null;
    renderTechList();
    renderSelectedChips();
    renderSynergy();
    renderTiming();
    renderStoryFaceUI();
    syncHiddenStoryFields();
    updateChallengeButton();
    updateVision();
    scheduleAiTimingAssess();
    flashToast("Co-inventor ideas applied");
  }
}

async function callCoInventMode(mode, userLabel) {
  if (state.aiBusy) return;
  state.aiBusy = true;
  const fillBtn = $("#btn-complete-picture");
  if (fillBtn) fillBtn.disabled = true;

  try {
    const ctx = {
      challenge: state.mission
        ? {
            id: state.mission.id,
            title: state.mission.title,
            problem: state.mission.scene,
            recommended: state.mission.suggested,
          }
        : null,
      selectedTechIds: [...state.selectedTechIds],
      inventionName: state.inventionName,
      inventionHow: state.inventionHow,
      inventionImpact: state.inventionImpact,
      storyFace: state.storyFace,
      writeBoth: state.writeBoth,
      year: state.year,
      turn: state.turn,
      place: state.mission?.place,
      pressure: state.pressure,
      availableTechs: TECHS.map((t) => techForAi(t, state.year)),
    };

    const res = await fetch("/api/co-invent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        messages: [{ role: "user", content: userLabel }],
        context: ctx,
      }),
    });
    const data = await res.json();
    if (data.proposals) applyCoInventorProposals(data.proposals);
    if (data.message) {
      ensureCoInventor();
      state.coInventor?.pushAssistant?.(
        {
          message: data.message,
          proposals: data.proposals || emptyProps(),
          teaching: data.teaching || [],
        },
        { local: data.source === "local" }
      );
    }
    if (mode === "complete-picture") {
      flashToast("Other story face filled");
      scheduleAiTimingAssess();
    }
  } catch (e) {
    flashToast(e.message || "AI request failed");
  } finally {
    state.aiBusy = false;
    if (fillBtn) fillBtn.disabled = false;
    updateChallengeButton();
  }
}

/* —— Modal —— */
function openTechModal(id) {
  const t = techById(id);
  if (!t) return;
  $("#modal-title").innerHTML = `${t.icon} ${escapeHtml(t.name)}`;
  $("#modal-summary").textContent = t.summary;
  $("#modal-learn").textContent = t.learn;
  const mat = t.maturity || {};
  const soft = techHorizonYear(t);
  const softLine =
    soft > state.year
      ? `Soft horizon ~${soft}: “near” use cases often get more common later (not a lock — always pickable).`
      : `Soft horizon ~${soft}: near-scale use cases are already in play for many places.`;
  $("#modal-hint").textContent =
    `Always pickable in ${state.year}. Feasibility judges your invention claims.\n\n` +
    `NOW: ${mat.now || "Real applications exist in this category."}\n` +
    `NEAR: ${mat.near || "Broader/cheaper access."}\n` +
    `FRONTIER: ${mat.frontier || "Transformative everyday infrastructure."}\n\n` +
    `Milestones: ${(t.milestones || []).join(" ")}\n` +
    `Use cases now: ${(t.useCasesNow || []).join("; ")}\n\n` +
    `${softLine}\n` +
    `Domain: ${DOMAINS[t.domain]?.label || t.domain}\nRisk: ${t.risk}\n` +
    `Tip: Art of the possible on the co-inventor for stack- and place-specific detail.`;
  const addBtn = $("#modal-add");
  const selected = state.selectedTechIds.includes(id);
  addBtn.textContent = selected ? "Remove from stack" : "Add to stack";
  addBtn.onclick = () => {
    onTechClick(id);
    closeModal();
  };
  $("#modal-backdrop").classList.add("open");
}

function closeModal() {
  $("#modal-backdrop").classList.remove("open");
}

/* —— Utils —— */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function flashToast(msg) {
  let el = $("#toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.style.cssText =
      "position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);background:#1e293b;border:1px solid rgba(148,163,184,.3);padding:.65rem 1rem;border-radius:999px;font-size:.85rem;z-index:200;color:#e2e8f0;box-shadow:0 8px 30px rgba(0,0,0,.4);transition:opacity .3s;max-width:90vw;text-align:center";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = "1";
  clearTimeout(el._t);
  el._t = setTimeout(() => {
    el.style.opacity = "0";
  }, 2800);
}

function surpriseMission() {
  const m = MISSIONS[Math.floor(Math.random() * MISSIONS.length)];
  state.global = globalById(m.globalId);
  startMission(m);
}

/* —— Bind —— */
function bind() {
  $("#btn-start").addEventListener("click", () => showScreen("global"));
  $("#btn-surprise").addEventListener("click", () => surpriseMission());
  $("#btn-global-back").addEventListener("click", () => showScreen("title"));
  $("#btn-mission-back").addEventListener("click", () => showScreen("global"));
  $("#btn-abandon").addEventListener("click", () => {
    if (confirm("Leave this mission? The local clock resets.")) showScreen("title");
  });

  $("#invention-name").addEventListener("input", (e) => {
    state.inventionName = e.target.value;
    updateChallengeButton();
  });
  let narrativeTimer;
  const bumpNarrative = () => {
    clearTimeout(narrativeTimer);
    narrativeTimer = setTimeout(() => updateVision({ debounceMs: 200 }), 2200);
  };
  const bumpClaimTiming = () => {
    state.aiTiming = null;
    renderTiming();
    renderFeasibility();
    updateChallengeButton();
    scheduleAiTimingAssess();
  };

  $$(".story-mode-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.writeBoth = false;
      state.storyFace = btn.dataset.face;
      renderStoryFaceUI();
      updateChallengeButton();
    });
  });
  $("#btn-write-both")?.addEventListener("click", () => {
    state.writeBoth = !state.writeBoth;
    if (state.writeBoth) state.storyFace = "how";
    renderStoryFaceUI();
    updateChallengeButton();
  });

  $("#invention-player")?.addEventListener("input", (e) => {
    if (state.writeBoth) state.inventionHow = e.target.value;
    else setPlayerStoryText(e.target.value);
    syncHiddenStoryFields();
    bumpClaimTiming();
    bumpNarrative();
  });
  $("#invention-companion")?.addEventListener("input", (e) => {
    if (state.writeBoth) state.inventionImpact = e.target.value;
    else setCompanionStoryText(e.target.value);
    syncHiddenStoryFields();
    bumpClaimTiming();
    bumpNarrative();
  });

  $("#btn-complete-picture")?.addEventListener("click", () => {
    if (!hasPlayerFace()) {
      flashToast("Write your story face first (a short paragraph).");
      return;
    }
    if (!selectedTechs().length) {
      flashToast("Add at least one technology first.");
      return;
    }
    callCoInventMode("complete-picture", "[Fill other story face]");
  });

  $("#btn-wait").addEventListener("click", () => waitTurn());
  $("#btn-to-challenge")?.addEventListener("click", () => enterChallenge());
  $("#btn-challenge-back")?.addEventListener("click", () => showScreen("workshop"));
  $("#btn-challenge-submit")?.addEventListener("click", () => submitChallengeAnswer());
  $("#btn-challenge-deploy")?.addEventListener("click", () => attemptDeploy());
  $("#btn-challenge-coach")?.addEventListener("click", () => coachChallenge("coach-challenge"));
  $("#btn-challenge-draft")?.addEventListener("click", () => coachChallenge("draft-challenge"));
  $("#challenge-help-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = $("#challenge-help-input")?.value?.trim();
    if (!q) {
      flashToast("Type a question for the co-inventor.");
      return;
    }
    coachChallenge("coach-challenge", q);
    $("#challenge-help-input").value = "";
  });
  $("#btn-open-coinventor").addEventListener("click", () => setSideTab("coinventor"));
  $("#btn-learn-tech").addEventListener("click", () => {
    const id = state.selectedTechIds[0] || state.mission?.suggested?.[0] || TECHS[0].id;
    openTechModal(id);
  });
  $("#btn-regen-vision").addEventListener("click", () => updateVision({ immediate: true, force: true }));

  $$(".side-tab").forEach((btn) => btn.addEventListener("click", () => setSideTab(btn.dataset.tab)));

  $("#btn-outcome-new").addEventListener("click", () => showScreen("global"));
  $("#btn-outcome-retry").addEventListener("click", () => {
    if (state.mission) showScreen("workshop");
    else showScreen("global");
  });

  $("#modal-close").addEventListener("click", closeModal);
  $("#modal-backdrop").addEventListener("click", (e) => {
    if (e.target.id === "modal-backdrop") closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  $("#game-title").textContent = GAME.title;
  $("#game-tagline").textContent = GAME.tagline;
  $$(".brand-name").forEach((el) => {
    el.textContent = GAME.title;
  });
}

export function init() {
  bind();
  showScreen("title");
}

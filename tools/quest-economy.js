import { evaluateQuestEconomy } from "/js/sim/quest-economy.js";
import {
  THEME_SHELVES,
  GLOBALS,
  START_HERE_THEME_IDS,
  GAME,
  localScenariosForGlobal,
} from "/js/data.js";
import {
  partitionCatalogQuests,
  groupLearningModules,
  isModuleEntry,
  isSponsoredEntry,
} from "/js/quest-catalog.js";
import { excerptFromBrief } from "/js/md-lite.js";

const $ = (id) => document.getElementById(id);

const seatsEl = $("econ-seats");
const statusEl = $("econ-status");
const pickEl = $("econ-pick");
const hubEl = $("econ-hub");
const channelEl = $("econ-channel");
const backBtn = $("econ-back");
const leaveBtn = $("econ-leave");
const pickTitle = $("econ-pick-title");
const pickBlurb = $("econ-pick-blurb");
const selectedEl = $("econ-selected");
const heroEl = $("econ-hero");
const setupEl = $("econ-setup");
const playersEl = $("econ-players");
const cardsEl = $("econ-cards");
const vizEl = $("econ-viz");
const vizTitle = $("econ-viz-title");
const vizLead = $("econ-viz-lead");
const togglesEl = $("econ-meter-toggles");
const chartEl = $("econ-chart");
const recEl = $("econ-rec");

/** @type {object|null} */
let catalog = null;
/** @type {object|null} */
let current = null;
/** @type {object|null} */
let lastReport = null;
/** @type {string} */
let focusId = "solo-no-ai";
/** @type {Set<string>} */
let hiddenMeters = new Set();
/** @type {{ view: string, kind?: string, shelf?: string, module?: string }} */
let nav = { view: "hub" };

const ORDER = ["solo-no-ai", "solo-ai", "friends-no-ai", "friends-ai"];
const METER_COLORS = ["#38bdf8", "#a78bfa", "#34d399", "#fbbf24"];

const WHO = {
  "solo-no-ai": "someone playing solo, writing by hand (no AI)",
  "solo-ai": "someone playing solo who asks AI at every step",
  "friends-no-ai": "someone at a Friends table, writing by hand",
  "friends-ai": "someone at a Friends table who asks AI at every step",
};

const VERDICT_WORD = {
  challenging: "tight but possible",
  too_easy: "too easy",
  too_hard: "too hard",
  impossible: "impossible with these knobs",
};

const BAND_WORD = {
  cool: "green — already at the win goal",
  warm: "yellow — strained, not red yet",
  hot: "red — danger",
};

function setStatus(msg, kind = "") {
  statusEl.textContent = msg || "";
  statusEl.className = `econ-status ${kind === "bad" ? "econ-band-hot" : "muted"}`;
}

async function api(path, opts) {
  const res = await fetch(path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

function problemVisualUrl(globalId) {
  return `/assets/problems/${globalId || "climate"}.jpg`;
}

function globalTitle(id) {
  return GLOBALS.find((g) => g.id === id)?.title || id || "";
}

function excerpt(entry) {
  const md = entry.tile?.mission?.briefMd || entry.mission?.briefMd;
  if (md) return excerptFromBrief(md, 140);
  return String(entry.summary || entry.mission?.scene || "").slice(0, 140);
}

function buckets() {
  return {
    remote: catalog?.remote || [],
    local: catalog?.local || [],
    imported: [],
  };
}

async function loadCatalog() {
  catalog = await api("/api/developer/quest-economy");
  if (catalog.remoteOk === false) {
    setStatus(
      "Could not reach the Warmer Sun catalog — Sponsored/Learning may be empty.",
      "bad"
    );
  }
}

function showResults(on) {
  for (const el of [selectedEl, heroEl, setupEl, playersEl, vizEl, recEl]) {
    if (!on) el.hidden = true;
  }
  pickEl.hidden = on;
  if (leaveBtn) leaveBtn.hidden = !on;
}

function leaveQuest() {
  current = null;
  lastReport = null;
  showResults(false);
  const url = new URL(location.href);
  url.searchParams.delete("id");
  url.searchParams.delete("file");
  url.searchParams.delete("source");
  history.replaceState(null, "", url);
  setStatus("");
  renderNav();
  pickEl?.scrollIntoView({ block: "start" });
}

function renderNav() {
  backBtn.hidden = nav.view === "hub";
  if (nav.view === "hub") {
    pickTitle.textContent = "Start a Quest";
    pickBlurb.textContent = "";
    hubEl.hidden = false;
    channelEl.hidden = true;
    renderHub();
    return;
  }
  hubEl.hidden = true;
  channelEl.hidden = false;
  if (nav.view === "themes") renderThemes();
  else if (nav.view === "theme") renderThemeMissions(nav.shelf);
  else if (nav.view === "catalog") renderCatalog(nav.kind);
  else if (nav.view === "module") renderModule(nav.module, nav.kind);
}

function renderHub() {
  const { sponsored, learning, library } = partitionCatalogQuests(buckets());
  const themeN = (catalog?.themes || []).length;
  const cards = [
    {
      id: "themes",
      title: "Themes",
      blurb: "Global problems as local places — the same theme list as the app.",
      meta: themeN ? `${themeN} built-in places` : "Catalog themes",
      cta: "Browse themes →",
    },
    {
      id: "sponsored",
      title: "Sponsored",
      blurb: "Partner Spotlight Quests from warmersun.com.",
      meta: sponsored.length
        ? `${sponsored.length} Quest${sponsored.length === 1 ? "" : "s"}`
        : catalog?.remoteOk === false
          ? "Catalog unreachable"
          : "None loaded yet",
      cta: "Open sponsored →",
    },
    {
      id: "learning",
      title: "Learning",
      blurb: "Modules of lessons from the Warmer Sun catalog.",
      meta: learning.length
        ? `${learning.length} tile${learning.length === 1 ? "" : "s"}`
        : "None loaded yet",
      cta: "Open learning →",
    },
    {
      id: "library",
      title: "Library",
      blurb: "Side-loaded JSON in quests/ and output/quests/.",
      meta: library.length
        ? `${library.length} Quest${library.length === 1 ? "" : "s"}`
        : "Drop JSON in quests/",
      cta: "Open library →",
    },
  ];
  hubEl.innerHTML = cards
    .map(
      (c) => `
    <button type="button" class="quest-hub-card" data-hub="${escapeAttr(c.id)}">
      <span class="quest-hub-card-meta">${escapeHtml(c.meta)}</span>
      <h2>${escapeHtml(c.title)}</h2>
      <p>${escapeHtml(c.blurb)}</p>
      <span class="cta">${escapeHtml(c.cta)}</span>
    </button>`
    )
    .join("");
  hubEl.querySelectorAll("[data-hub]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-hub");
      if (id === "themes") nav = { view: "themes" };
      else nav = { view: "catalog", kind: id };
      renderNav();
    });
  });
}

function themeCard(g) {
  const tag = g.kind === "before" ? "Before it hits" : "Now";
  const cls = g.kind === "before" ? "flag-prevention" : "flag-problem";
  return `
    <button type="button" class="challenge-card challenge-card-visual" data-global="${escapeAttr(
      g.id
    )}">
      <span class="card-visual" aria-hidden="true">
        <img src="${escapeAttr(problemVisualUrl(g.id))}" alt="" loading="lazy" width="640" height="360" />
      </span>
      <span class="card-body">
        <span class="num"><span class="flag ${cls}">${tag}</span></span>
        <h3>${escapeHtml(g.title)}</h3>
        <p>${escapeHtml(g.blurb || "")}</p>
        <span class="cta">Places →</span>
      </span>
    </button>`;
}

function renderThemes() {
  pickTitle.textContent = "What kind of problem?";
  pickBlurb.textContent =
    "Same theme grid as the app. Pick a global problem, then a local place.";
  const byId = new Map(GLOBALS.map((g) => [g.id, g]));
  const startThemes = START_HERE_THEME_IDS.map((id) => byId.get(id)).filter(Boolean);
  const shelfSections = THEME_SHELVES.map((shelf) => ({
    shelf,
    themes: GLOBALS.filter((g) => g.shelf === shelf.id).sort((a, b) =>
      a.title.localeCompare(b.title)
    ),
  })).filter((s) => s.themes.length);
  const shelved = new Set(GLOBALS.filter((g) => g.shelf).map((g) => g.id));
  const orphans = GLOBALS.filter((g) => !shelved.has(g.id));

  let html = "";
  if (startThemes.length) {
    html += `<section class="theme-shelf theme-shelf-start">
      <h2 class="theme-shelf-title">Start here</h2>
      <p class="theme-shelf-blurb muted">Six solid first themes — or browse shelves below.</p>
      <div class="challenge-grid">${startThemes.map(themeCard).join("")}</div>
    </section>`;
  }
  for (const { shelf, themes } of shelfSections) {
    html += `<section class="theme-shelf">
      <h2 class="theme-shelf-title">${escapeHtml(shelf.title)}</h2>
      <div class="challenge-grid">${themes.map(themeCard).join("")}</div>
    </section>`;
  }
  if (orphans.length) {
    html += `<section class="theme-shelf">
      <h2 class="theme-shelf-title">More themes</h2>
      <div class="challenge-grid">${orphans.map(themeCard).join("")}</div>
    </section>`;
  }
  channelEl.innerHTML = `<div class="theme-shelves">${html}</div>`;
  channelEl.querySelectorAll("[data-global]").forEach((btn) => {
    btn.addEventListener("click", () => {
      nav = { view: "theme", shelf: btn.getAttribute("data-global") };
      renderNav();
    });
  });
}

function renderThemeMissions(globalId) {
  const g = GLOBALS.find((x) => x.id === globalId);
  pickTitle.textContent = g?.title || "Theme";
  pickBlurb.textContent = g
    ? `${g.blurb || ""} — several concrete places living a piece of this. Pick one to evaluate.`
    : "Pick a concrete place.";
  const places = g ? localScenariosForGlobal(g, { count: 4, salt: 0 }) : [];
  if (!places.length) {
    channelEl.innerHTML = `<p class="muted">No local places for this theme. Use ← Quests — this page never opens the game.</p>`;
    return;
  }
  channelEl.innerHTML = `<div class="challenge-grid">${places
    .map((m) => {
      const blurb = String(m.summary || "").trim()
        ? m.summary
        : (m.scene || "").slice(0, 180);
      const year = m.startYear || GAME.startYear || 2026;
      return `<button type="button" class="challenge-card" data-theme-mission="${escapeAttr(
        m.id
      )}">
        <span class="num">${escapeHtml(m.place || "")} · ${year}
          <span class="scenario-tag curated">Curated</span>
        </span>
        <h3>${escapeHtml(m.title || "Quest")}</h3>
        <p>${escapeHtml(blurb)}</p>
        ${
          m.stakeholder
            ? `<p class="stakeholder-line">Stakeholder: ${escapeHtml(m.stakeholder)}</p>`
            : ""
        }
        <span class="cta">Evaluate →</span>
      </button>`;
    })
    .join("")}</div>`;
  channelEl.querySelectorAll("[data-theme-mission]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-theme-mission");
      const mission = places.find((m) => m.id === id);
      if (mission) pickThemeMission(g, mission);
    });
  });
}

function restoreThemeMission(missionId) {
  for (const g of GLOBALS) {
    const places = localScenariosForGlobal(g, { count: 4, salt: 0 });
    const mission = places.find((m) => m.id === missionId);
    if (mission) {
      nav = { view: "theme", shelf: g.id };
      pickThemeMission(g, mission);
      return;
    }
  }
  setStatus("That theme Quest is not in the current seed pack.", "bad");
}

function pickThemeMission(global, mission) {
  hiddenMeters = new Set();
  current = {
    source: "theme",
    writable: false,
    id: mission.id,
    title: mission.title,
    place: mission.place,
    globalId: global?.id || mission.globalId,
    mission,
    tile: null,
  };
  const url = new URL(location.href);
  url.searchParams.set("source", "theme");
  url.searchParams.set("id", mission.id);
  url.searchParams.delete("file");
  history.replaceState(null, "", url);
  showResults(true);
  runEvaluate();
}

function renderCatalog(kind) {
  const { sponsored, learning, library } = partitionCatalogQuests(buckets());
  const list =
    kind === "sponsored" ? sponsored : kind === "learning" ? learning : library;
  pickTitle.textContent =
    kind === "sponsored" ? "Sponsored" : kind === "learning" ? "Learning" : "Library";
  pickBlurb.textContent =
    kind === "library"
      ? "Local quests/ files."
      : "From the Warmer Sun catalog (warmersun.com).";
  if (kind === "learning") {
    const groups = groupLearningModules(list);
    channelEl.innerHTML = `<div class="challenge-grid">${groups
      .map((g) => {
        if (g.wrapper) return catalogCard(g.wrapper, kind);
        const first = g.entries[0];
        if (!first) return "";
        return `<button type="button" class="challenge-card challenge-card-visual" data-module="${escapeAttr(
          g.module || g.key
        )}">
          <span class="card-visual"><img src="${escapeAttr(
            problemVisualUrl(first.globalId)
          )}" alt="" /></span>
          <span class="card-body">
            <span class="num">Learn · ${escapeHtml(String(g.totalLessons || g.entries.length))} lessons</span>
            <h3>${escapeHtml(g.module || "Module")}</h3>
            <p>${escapeHtml(g.summary || excerpt(first))}</p>
            <span class="cta">Lessons →</span>
          </span>
        </button>`;
      })
      .join("")}</div>`;
    channelEl.querySelectorAll("[data-module]").forEach((btn) => {
      btn.addEventListener("click", () => {
        nav = {
          view: "module",
          kind,
          module: btn.getAttribute("data-module"),
        };
        renderNav();
      });
    });
    bindCatalogCards(channelEl);
    return;
  }
  channelEl.innerHTML = `<div class="challenge-grid">${
    list.length
      ? list.map((e) => catalogCard(e, kind)).join("")
      : `<p class="muted">Nothing in this list yet.</p>`
  }</div>`;
  bindCatalogCards(channelEl);
}

function renderModule(moduleName, kind) {
  const { learning, sponsored } = partitionCatalogQuests(buckets());
  const pool = kind === "sponsored" ? sponsored : learning;
  const groups = groupLearningModules(pool);
  const g = groups.find((x) => (x.module || x.key) === moduleName);
  pickTitle.textContent = moduleName || "Module";
  pickBlurb.textContent = "Lessons in this path.";
  const entries = g?.entries || [];
  channelEl.innerHTML = `<div class="challenge-grid">${
    entries.length
      ? entries.map((e) => catalogCard(e, kind)).join("")
      : `<p class="muted">No lessons.</p>`
  }</div>`;
  bindCatalogCards(channelEl);
}

function catalogCard(entry, kind) {
  if (isModuleEntry(entry)) {
    return `<button type="button" class="challenge-card challenge-card-visual" data-module="${escapeAttr(
      entry.module || entry.title
    )}" data-kind="${escapeAttr(kind)}">
      <span class="card-visual"><img src="${escapeAttr(
        entry.coverImageUrl || problemVisualUrl(entry.globalId)
      )}" alt="" /></span>
      <span class="card-body">
        <span class="num">${isSponsoredEntry(entry) ? "Sponsored" : "Learn"} · module</span>
        <h3>${escapeHtml(entry.title || entry.module)}</h3>
        <p>${escapeHtml(entry.summary || "")}</p>
        <span class="cta">Lessons →</span>
      </span>
    </button>`;
  }
  const place = entry.place || entry.mission?.place || "";
  const theme = globalTitle(entry.globalId);
  const chip =
    kind === "sponsored" || entry.sponsorName
      ? `Sponsored${entry.sponsorName ? ` · ${entry.sponsorName}` : ""}`
      : kind === "learning" || entry.isLearningModule
        ? "Learn"
        : kind === "theme"
          ? "Theme"
          : "Library";
  return `<button type="button" class="challenge-card challenge-card-visual" data-pick-id="${escapeAttr(
    entry.id
  )}" data-pick-source="${escapeAttr(entry.source || kind)}" data-pick-rel="${escapeAttr(
    entry.rel || entry.file || ""
  )}">
    <span class="card-visual" aria-hidden="true">
      <img src="${escapeAttr(problemVisualUrl(entry.globalId))}" alt="" width="640" height="360" />
    </span>
    <span class="card-body">
      <span class="num">${escapeHtml(chip)}</span>
      <h3>${escapeHtml(entry.title || "Quest")}</h3>
      <p class="muted">${escapeHtml([theme, place].filter(Boolean).join(" · "))}</p>
      <p>${escapeHtml(excerpt(entry))}</p>
      <span class="cta">Evaluate →</span>
    </span>
  </button>`;
}

function bindCatalogCards(root) {
  root.querySelectorAll("[data-module]").forEach((btn) => {
    if (btn.hasAttribute("data-pick-id")) return;
    btn.addEventListener("click", () => {
      nav = {
        view: "module",
        kind: btn.getAttribute("data-kind") || nav.kind || "learning",
        module: btn.getAttribute("data-module"),
      };
      renderNav();
    });
  });
  root.querySelectorAll("[data-pick-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      pickQuest({
        id: btn.getAttribute("data-pick-id"),
        source: btn.getAttribute("data-pick-source"),
        rel: btn.getAttribute("data-pick-rel"),
      });
    });
  });
}

async function pickQuest(spec) {
  try {
    setStatus("Loading Quest…");
    const q = new URLSearchParams();
    if (spec.source === "local" && spec.rel) q.set("file", spec.rel);
    else {
      if (spec.source) q.set("source", spec.source);
      if (spec.id) q.set("id", spec.id);
    }
    const data = await api(`/api/developer/quest-economy?${q.toString()}`);
    current = data;
    hiddenMeters = new Set();
    const url = new URL(location.href);
    url.searchParams.set("source", data.source || spec.source || "");
    url.searchParams.set("id", data.id || spec.id || "");
    if (data.rel) url.searchParams.set("file", data.rel);
    history.replaceState(null, "", url);
    showResults(true);
    runEvaluate();
  } catch (e) {
    setStatus(e.message || "Could not load that Quest", "bad");
  }
}

function inputForEval() {
  if (!current) return null;
  if (current.tile) return current.tile;
  if (current.mission) return current.mission;
  return null;
}

function runEvaluate() {
  const input = inputForEval();
  if (!input) return;
  const seats = Math.max(2, Math.min(6, Number(seatsEl.value) || 3));
  lastReport = evaluateQuestEconomy(input, { friendsSeats: seats });
  if (!lastReport.archetypes[focusId]) focusId = "solo-no-ai";
  renderSelected();
  renderReport(lastReport);
}

function renderSelected() {
  if (!current) {
    selectedEl.hidden = true;
    return;
  }
  const g = globalTitle(current.globalId);
  const place = current.place || current.mission?.place || "";
  selectedEl.hidden = false;
  selectedEl.innerHTML = `
    <article class="econ-picked">
      <img src="${escapeAttr(problemVisualUrl(current.globalId))}" alt="" />
      <div>
        <p class="econ-picked-meta">${escapeHtml(
          [current.source, g, place].filter(Boolean).join(" · ")
        )}</p>
        <h2>${escapeHtml(current.title || current.mission?.title || "Quest")}</h2>
        <button type="button" class="btn btn-ghost btn-sm" id="econ-change">Change Quest</button>
      </div>
    </article>`;
  $("econ-change")?.addEventListener("click", () => leaveQuest());
}

function headline(report) {
  const v = report.questVerdict;
  const sna = report.archetypes["solo-no-ai"];
  const sa = report.archetypes["solo-ai"];
  if (v === "challenging") {
    return {
      title: "Tight but possible — that’s the target.",
      body: `${sentence(sna, "solo-no-ai")} ${sentence(sa, "solo-ai")}`,
    };
  }
  if (v === "too_easy") {
    return {
      title: "Too easy right now.",
      body: "A hand-writing solo player finishes with leftover money and time.",
    };
  }
  if (v === "too_hard") {
    return {
      title: "Too hard right now.",
      body: "A competent path runs out of Attention, Budget, Support, or calendar before meters stay off red.",
    };
  }
  return {
    title: "Not solvable with these knobs.",
    body: "They cannot even field the invention tiles this Quest needs.",
  };
}

function sentence(a, id) {
  if (!a) return "";
  const who = WHO[id] || a.label;
  if (a.verdict === "too_easy") return `For ${who}, this is a walkover.`;
  if (a.fullSolve && a.survive) {
    return `For ${who}, every meter can reach the win goal before anything goes red.`;
  }
  if (a.survive) {
    return `For ${who}, meters can stay off red, but not every meter may reach the win goal.`;
  }
  if (a.blocked) return `For ${who}, the path stalls (${plainBlock(a.blocked)}).`;
  return `For ${who}, this does not hold in time.`;
}

function plainBlock(blocked) {
  const r = blocked?.resource;
  if (r === "budget") return "not enough Budget to pick the tech";
  if (r === "will") return "not enough Support to pick the tech";
  if (r === "ap" || r === "calendar") return "not enough Attention before the fail year";
  return blocked?.error || "blocked";
}

function startLevel(m) {
  if (m.start >= 4) return "hot";
  if (m.start <= m.winMax) return "cool";
  return "warm";
}

function formatWaits(n) {
  if (n == null || n === Infinity) return "never";
  if (n === 0) return "already";
  return String(n);
}

function meterClockRow(report, m) {
  return (report.clock?.meters || []).find((row) => row.key === m.key) || null;
}

function levelForValue(v, winMax) {
  if (v >= 4) return "hot";
  if (v <= winMax) return "cool";
  return "warm";
}

function yearlyEventLabel(row, step) {
  if (row.event === "start") return "Quest starts";
  if (row.event === "tick") return "Year ticks · meters +rise (whole points)";
  if (row.event === "wait") {
    return `Wait · calendar +${step} · meters +rise ×${step}`;
  }
  return row.event || "";
}

function yearlyClockTable(report) {
  const k = report.knobs;
  const rows = report.yearlyClock || [];
  if (!rows.length) return "";
  const step = k.yearsPerTurn || 2;
  const head = k.meters
    .map((m) => `<th>${escapeHtml(m.label)}</th>`)
    .join("");
  const body = rows
    .map((row) => {
      const lose = Boolean(row.collapsed);
      const cells = k.meters
        .map((m) => {
          const v = row.pressure?.[m.key] ?? m.start;
          const band = levelForValue(v, m.winMax);
          const jumped = row.event !== "start" && (m.rise || 0) > 0;
          return `<td class="${jumped ? "econ-year-jump" : ""}"><span class="econ-dot ${escapeAttr(
            band
          )}"></span>${v}${v >= 5 ? " lose" : ""}</td>`;
        })
        .join("");
      return `<tr class="${lose ? "econ-year-lose" : ""}">
        <td>${row.year}</td>
        <td class="econ-year-event">${escapeHtml(yearlyEventLabel(row, step))}</td>
        ${cells}
      </tr>`;
    })
    .join("");
  return `
    <h3 class="econ-year-heading">Crisis each time the calendar year changes</h3>
    <p class="muted sm">Each calendar year applies each meter’s rise once (End turn +1 year). Wait jumps +${step} years and applies rise ${step} times. Inventing is what lowers meters.</p>
    <table class="econ-meters econ-year-clock">
      <thead>
        <tr>
          <th>Year</th>
          <th>Clock</th>
          ${head}
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>`;
}

function pathShape(a) {
  const tiles = a?.tileCount ?? 0;
  const paths = a?.pathwayCount ?? 0;
  const lines = (a?.pathways || []).map((p, i) => {
    const names = (p.tiles || []).map((t) => t.name).join(" · ") || "—";
    const n = p.tiles?.length || p.tileCount || 0;
    return `Pathway ${i + 1}: ${n} tile${n === 1 ? "" : "s"} — ${names}`;
  });
  return {
    tiles,
    paths,
    hero: `A tight path uses ${tiles} invention tile${tiles === 1 ? "" : "s"} in ${paths} pathway${
      paths === 1 ? "" : "s"
    }.`,
    chart: `${tiles} invention tile${tiles === 1 ? "" : "s"} · ${paths} pathway${
      paths === 1 ? "" : "s"
    }`,
    lines,
  };
}

function renderReport(report) {
  const k = report.knobs;
  const hero = headline(report);
  const sna = report.archetypes["solo-no-ai"];
  const shape = pathShape(sna);
  heroEl.hidden = false;
  heroEl.className = `econ-hero is-${escapeAttr(report.questVerdict)}`;
  heroEl.innerHTML = `
    <p class="econ-hero-kicker">${escapeHtml(k.title || k.id)}</p>
    <h2>${escapeHtml(hero.title)}</h2>
    <p>${escapeHtml(hero.body)}</p>
    <p class="econ-hero-path">${escapeHtml(shape.hero)}</p>
  `;

  setupEl.hidden = false;
  setupEl.innerHTML = `
    <h2>What they start with</h2>
    <div class="econ-wallet">
      <span class="econ-chip"><b>${k.apMax}</b> Attention per turn</span>
      <span class="econ-chip"><b>${k.budget}</b> Budget</span>
      <span class="econ-chip"><b>${k.will}</b> Support</span>
      <span class="econ-chip">Years <b>${k.startYear}–${k.collapseYear}</b></span>
      <span class="econ-chip">Each Wait <b>+${k.yearsPerTurn || 2} years</b></span>
    </div>
    <table class="econ-meters">
      <thead>
        <tr>
          <th>Crisis meter</th>
          <th>Starts</th>
          <th>Each solo Wait</th>
          <th>Years to red (4)</th>
          <th>Years to lose (5)</th>
          <th>Win goal</th>
          <th>Color at start</th>
        </tr>
      </thead>
      <tbody>
        ${k.meters
          .map((m) => {
            const band = startLevel(m);
            const clock = meterClockRow(report, m);
            return `<tr>
              <td>${escapeHtml(m.label)} <span class="muted">(${escapeHtml(m.role)})</span></td>
              <td>${m.start} / 5</td>
              <td>+${m.rise} / year</td>
              <td>${escapeHtml(formatWaits(clock?.waitsUntilRed))}</td>
              <td>${escapeHtml(formatWaits(clock?.waitsUntilCollapse))}</td>
              <td>${m.winMax} or less</td>
              <td><span class="econ-dot ${escapeAttr(band)}"></span>${escapeHtml(
                BAND_WORD[band]
              )}</td>
            </tr>`;
          })
          .join("")}
      </tbody>
    </table>
    <p class="econ-clock-blurb">${escapeHtml(report.untreatedBlurb || "")}</p>
    ${yearlyClockTable(report)}
  `;

  playersEl.hidden = false;
  cardsEl.innerHTML = ORDER.map((id) => playerCard(report, id)).join("");
  cardsEl.querySelectorAll("[data-focus]").forEach((btn) => {
    btn.addEventListener("click", () => {
      focusId = btn.getAttribute("data-focus") || "solo-no-ai";
      renderChart(report);
      cardsEl.querySelectorAll(".econ-card").forEach((el) => {
        el.classList.toggle("is-focus", el.getAttribute("data-focus") === focusId);
      });
    });
  });

  renderChart(report);
  renderRec(report);
  setStatus(`Looking at ${current.source || ""} ${current.id || ""}`.trim());
}

function playerCard(report, id) {
  const a = report.archetypes[id];
  if (!a) return "";
  const shape = pathShape(a);
  const bill = a.aiBill || [];
  const waitBit =
    a.waits > 0
      ? `Waits ${a.waits} time${a.waits === 1 ? "" : "s"}.`
      : "Does not Wait.";
  const turns = a.turnsUsed ?? (a.endTurns || 0) + 1;
  const turnBit = `Finishes in ${turns} turn${turns === 1 ? "" : "s"}.`;
  const billHtml = a.ai
    ? `<details class="econ-bill"><summary>AI Attention: <b>${a.aiAp ?? 0}</b> — first ask of a turn is 1 AP; more thinking that turn is free</summary>
        <ol>${bill
          .map(
            (row) =>
              `<li>${escapeHtml(row.step)} <span class="muted">${row.ap} AP</span></li>`
          )
          .join("")}</ol></details>`
    : `<p class="econ-card-meta">AI Attention: <b>0</b> — writes by hand.</p>`;
  return `<article class="econ-card${
    id === focusId ? " is-focus" : ""
  }" data-focus="${escapeAttr(id)}" tabindex="0">
    <span class="econ-verdict ${escapeAttr(a.verdict)}">${escapeHtml(
      VERDICT_WORD[a.verdict] || a.verdict
    )}</span>
    <h3>${escapeHtml(a.label)}</h3>
    <div class="econ-counts">
      <div><b>${shape.tiles}</b><span>invention ${
        shape.tiles === 1 ? "tile" : "tiles"
      }</span></div>
      <div><b>${shape.paths}</b><span>${
        shape.paths === 1 ? "pathway" : "pathways"
      }</span></div>
    </div>
    <ul class="econ-path-list">${shape.lines
      .map((line) => `<li>${escapeHtml(line)}</li>`)
      .join("")}</ul>
    ${billHtml}
    <p>${escapeHtml(sentence(a, id))}</p>
    <p class="econ-card-meta">Place/tech Attention ${a.apSpent - (a.aiAp || 0)}. ${escapeHtml(
      turnBit
    )} ${escapeHtml(waitBit)}</p>
  </article>`;
}

function renderChart(report) {
  const k = report.knobs;
  const focus = report.archetypes[focusId] || report.archetypes["solo-no-ai"];
  vizEl.hidden = !focus;
  if (!focus) return;
  const shape = pathShape(focus);
  vizTitle.textContent = `Crisis over the year — ${focus.label}`;
  const turns = focus.turnsUsed ?? (focus.endTurns || 0) + 1;
  const startY = focus.timeline?.[0]?.year;
  const endY = focus.year;
  const solved = focus.fullSolve
    ? "solves"
    : focus.survive
      ? "holds (not full green)"
      : "does not solve";
  vizLead.textContent = `${shape.chart}. This path ${solved} in ${turns} turn${
    turns === 1 ? "" : "s"
  }${startY != null ? ` (${startY}→${endY})` : ""}. T0 is the start. Solid dots are this path’s actions (hover for what happened). Dashed line: if they never invent, solo Waits climb to lose. Click a meter chip to hide its line.`;
  togglesEl.innerHTML = k.meters
    .map((m, i) => {
      const on = !hiddenMeters.has(m.key);
      return `<button type="button" class="econ-meter-chip${
        on ? " is-on" : ""
      }" data-meter="${escapeAttr(m.key)}" style="--chip:${METER_COLORS[i % METER_COLORS.length]}">${escapeHtml(
        m.label
      )}</button>`;
    })
    .join("");
  togglesEl.querySelectorAll("[data-meter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-meter");
      if (hiddenMeters.has(key)) hiddenMeters.delete(key);
      else if (hiddenMeters.size < k.meters.length - 1) hiddenMeters.add(key);
      renderChart(report);
    });
  });
  chartEl.innerHTML = meterChart(focus, k, report.yearlyClock);
  bindChartTips(chartEl);
}

function dashAtYear(yearly, year, knobs) {
  const hit = (yearly || []).find((row) => row.year === year);
  if (hit) return hit.pressure;
  const pressure = {};
  const elapsed = Math.max(0, year - (knobs.startYear || 2026));
  for (const m of knobs.meters) {
    pressure[m.key] = Math.min(5, (m.start || 0) + elapsed * (m.rise || 0));
  }
  return pressure;
}

function chartSeries(run, knobs, yearly) {
  const path = (run.timeline || []).map((row) => ({
    ...row,
    kind: "path",
    dashPressure: dashAtYear(yearly, row.year, knobs),
  }));
  if (!path.length) return path;
  const last = path[path.length - 1];
  const startTurn = last.turn || 0;
  const startYear = last.year || knobs.startYear;
  for (const u of yearly || []) {
    if (u.year <= startYear) continue;
    path.push({
      kind: "unsolved",
      note: "unsolved-wait",
      turn: startTurn + (u.year - startYear),
      year: u.year,
      waits: u.waits,
      yearsPerTurn: 1,
      pressure: last.pressure,
      dashPressure: u.pressure,
      collapsed: u.collapsed,
    });
    if (u.collapsed) break;
  }
  return path;
}

function actionExplain(row, meter, value) {
  const when =
    row.kind === "unsolved"
      ? `Year ${row.year} if they never invent`
      : `Turn T${row.turn || 0} · ${row.year}`;
  const meterBit = `${meter.label} at ${value} / 5`;
  const note = row.note || "";
  if (note === "start") {
    return {
      title: "Start of the Quest",
      body: `${when}. Opening meters — no action yet. ${meterBit}.`,
    };
  }
  if (note === "end_turn") {
    return {
      title: "End turn",
      body: `${when}. Attention refilled. Year +1. Crisis meters rise one year. ${meterBit}.`,
    };
  }
  if (note === "wait") {
    return {
      title: "Wait",
      body: `${when}. They let time pass. Solo Wait jumps the calendar and raises meters once per year jumped. Friends personal Wait does not raise shared meters. ${meterBit}.`,
    };
  }
  if (note === "lobby") {
    return {
      title: "Lobby",
      body: `${when}. Spend 1 AP and 1 Budget for +1 Support. ${meterBit}.`,
    };
  }
  if (note === "relief") {
    return {
      title: "Invent lands",
      body: `${when}. The pathway eases crisis meters. ${meterBit}.`,
    };
  }
  if (note === "unsolved-wait") {
    const step = row.yearsPerTurn || 2;
    const rise = meter.rise || 0;
    return {
      title: "If they never invent",
      body: `${when}. Calendar year ticks and this meter rises by ${rise} (whole points). ${meterBit}.${
        row.collapsed ? " A meter hits 5 — the Quest is lost." : ""
      }`,
    };
  }
  if (note.startsWith("tile:")) {
    const name = row.name || note.slice(5);
    const c = row.cost || {};
    const costBits = ["1 AP"];
    if (c.budget) costBits.push(`${c.budget} Budget`);
    if (c.will) costBits.push(`${c.will} Support`);
    return {
      title: `Place ${name}`,
      body: `${when}. Invention tile on the board (${costBits.join(", ")}). ${meterBit}.`,
    };
  }
  if (note.startsWith("ai:")) {
    const title = row.step || "Ask the co-inventor";
    const ap = row.ap != null ? `${row.ap} AP` : "AI help";
    return {
      title,
      body: `${when}. Co-inventor help (${ap}). Meters unchanged. ${meterBit}.`,
    };
  }
  return { title: note, body: `${when}. ${meterBit}.` };
}

function bindChartTips(root) {
  const wrap = root.querySelector(".econ-chart-wrap");
  const tip = root.querySelector(".econ-tip");
  if (!wrap || !tip) return;
  const show = (el, ev) => {
    tip.hidden = false;
    tip.querySelector(".econ-tip-title").textContent = el.getAttribute("data-tip-title") || "";
    tip.querySelector(".econ-tip-body").textContent = el.getAttribute("data-tip-body") || "";
    const box = wrap.getBoundingClientRect();
    let left = ev.clientX - box.left + 12;
    let top = ev.clientY - box.top + 12;
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
    const tbox = tip.getBoundingClientRect();
    if (tbox.right > box.right) {
      tip.style.left = `${Math.max(8, left - tbox.width - 24)}px`;
    }
    if (tbox.bottom > box.bottom) {
      tip.style.top = `${Math.max(8, top - tbox.height - 24)}px`;
    }
  };
  wrap.querySelectorAll("[data-tip-title]").forEach((el) => {
    el.addEventListener("pointerenter", (ev) => show(el, ev));
    el.addEventListener("pointermove", (ev) => show(el, ev));
    el.addEventListener("pointerleave", () => {
      tip.hidden = true;
    });
  });
}

function meterChart(run, knobs, untreated) {
  const tl = chartSeries(run, knobs, untreated);
  if (!tl.length) return "<p class='muted'>No path to plot.</p>";
  const meters = knobs.meters.filter((m) => !hiddenMeters.has(m.key));
  const w = 720;
  const h = 268;
  const pad = { l: 42, r: 18, t: 18, b: 52 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const n = Math.max(1, tl.length - 1);
  const x = (i) => pad.l + (i / n) * innerW;
  const y = (v) => pad.t + innerH - (v / 5) * innerH;
  const redY = y(4);
  const zone = `<rect x="${pad.l}" y="${pad.t}" width="${innerW}" height="${Math.max(
    0,
    redY - pad.t
  )}" fill="rgba(248,113,113,0.14)"></rect>
    <text x="${pad.l + 6}" y="${pad.t + 12}" fill="#f87171" font-size="10">red (4–5)</text>`;
  const grid = [0, 1, 2, 3, 4, 5]
    .map(
      (v) =>
        `<line x1="${pad.l}" x2="${w - pad.r}" y1="${y(v)}" y2="${y(
          v
        )}" stroke="rgba(148,163,184,0.18)"/>
         <text x="8" y="${y(v) + 4}" fill="#94a3b8" font-size="10">${v}</text>`
    )
    .join("");
  const turnGuides = tl
    .map((row, i) => {
      if (i === 0) return "";
      const prev = tl[i - 1];
      if ((row.turn || 0) === (prev.turn || 0)) return "";
      return `<line x1="${x(i)}" x2="${x(i)}" y1="${pad.t}" y2="${
        pad.t + innerH
      }" stroke="rgba(167,139,250,0.45)" stroke-dasharray="3 3"/>`;
    })
    .join("");
  const lines = meters
    .map((m) => {
      const mi = knobs.meters.findIndex((row) => row.key === m.key);
      const color = METER_COLORS[mi % METER_COLORS.length];
      const solidPts = tl
        .map((row, i) => `${x(i)},${y(row.pressure?.[m.key] ?? m.start)}`)
        .join(" ");
      const dashPts = tl
        .map((row, i) => `${x(i)},${y(row.dashPressure?.[m.key] ?? m.start)}`)
        .join(" ");
      const dots = tl
        .map((row, i) => {
          const isPath = row.kind !== "unsolved";
          const val = isPath
            ? row.pressure?.[m.key] ?? m.start
            : row.dashPressure?.[m.key] ?? m.start;
          const tip = actionExplain(row, m, val);
          const isRelief = row.note === "relief" || row.note === "relief-global";
          const isStart = row.note === "start";
          const isWait = row.note === "wait" || row.note === "unsolved-wait";
          const r = isRelief ? 5.5 : isStart || isWait ? 4 : 3.2;
          const fill = isPath ? color : "transparent";
          const stroke = isPath ? (isRelief ? "#e8eef9" : "none") : color;
          const sw = isPath ? (isRelief ? 1.5 : 0) : 1.6;
          return `<circle class="econ-hit" cx="${x(i)}" cy="${y(val)}" r="11" fill="transparent" data-tip-title="${escapeAttr(
            tip.title
          )}" data-tip-body="${escapeAttr(tip.body)}"></circle>
            <circle cx="${x(i)}" cy="${y(val)}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-dasharray="${
              isPath ? "none" : "2 2"
            }" pointer-events="none"></circle>`;
        })
        .join("");
      return `<polyline fill="none" stroke="${color}" stroke-width="2.2" stroke-dasharray="6 4" opacity="0.85" points="${dashPts}"></polyline>
        <polyline fill="none" stroke="${color}" stroke-width="2.5" points="${solidPts}"></polyline>${dots}`;
    })
    .join("");
  const labels = tl
    .map((row, i) => {
      const turnChanged = i === 0 || (row.turn || 0) !== (tl[i - 1].turn || 0);
      const last = i === tl.length - 1;
      if (!turnChanged && !last) return "";
      const tick =
        row.kind === "unsolved" ? `Wait ${row.waits}` : `T${row.turn || 0}`;
      return `<text x="${x(i)}" y="${h - 22}" fill="#e8eef9" font-size="11" font-weight="650" text-anchor="middle">${escapeHtml(
        tick
      )}</text>
        <text x="${x(i)}" y="${h - 8}" fill="#94a3b8" font-size="10" text-anchor="middle">${escapeHtml(
          String(row.year)
        )}</text>`;
    })
    .join("");
  const turns = run.turnsUsed ?? (run.endTurns || 0) + 1;
  return `<div class="econ-chart-wrap">
    <svg class="econ-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Crisis meters by turn">${zone}${grid}${turnGuides}${lines}${labels}</svg>
    <div class="econ-tip" hidden><strong class="econ-tip-title"></strong><p class="econ-tip-body"></p></div>
    <p class="econ-legend"><span class="econ-legend-dash"></span>dashed: if they never invent (solo Wait climbs to lose) <span class="econ-legend-dot"></span>solid: this path’s actions</p>
    <p class="econ-axis">Turn → · T0 is this path · after that, Wait 1 / Wait 2 are solo Waits (+${
      knobs.yearsPerTurn || 2
    } years and this meter’s rise each) · hover a dot</p>
  </div>`;
}

function englishPatch(rec, knobs) {
  const p = rec?.patch || {};
  const bits = [];
  if (p.resources?.apMax != null) bits.push(`Attention per turn ${knobs.apMax} → ${p.resources.apMax}`);
  if (p.resources?.startingBudget != null) {
    bits.push(`starting Budget ${knobs.budget} → ${p.resources.startingBudget}`);
  }
  if (p.resources?.startingWill != null) {
    bits.push(`starting Support ${knobs.will} → ${p.resources.startingWill}`);
  }
  if (p.collapseYear != null) bits.push(`fail year ${knobs.collapseYear} → ${p.collapseYear}`);
  if (p.pressure) {
    for (const m of knobs.meters) {
      const row = p.pressure[m.role];
      if (!row) continue;
      if (row.pressure != null) bits.push(`${m.label} start ${m.start} → ${row.pressure}`);
      if (row.pressureRise != null) bits.push(`${m.label} Wait rise ${m.rise} → ${row.pressureRise}`);
      if (row.winMax != null) bits.push(`${m.label} win goal ${m.winMax} → ${row.winMax}`);
    }
  }
  return bits;
}

function renderRec(report) {
  const rec = report.recommendation;
  const k = report.knobs;
  recEl.hidden = false;
  const bits = englishPatch(rec, k);
  const needed = Boolean(rec?.needed && bits.length);
  const after = rec?.afterVerdict || {};
  const writable = Boolean(current?.writable && current?.rel);
  let actions = "";
  if (needed && writable) {
    actions = `<button type="button" class="btn btn-primary" id="econ-apply">Write this into the Quest file</button>`;
  } else if (needed && current?.source === "remote") {
    actions = `<p class="muted">This Quest lives on warmersun.com. Save a Library copy to edit knobs.</p>
      <button type="button" class="btn btn-secondary" id="econ-copy">Save a copy to Library</button>`;
  } else if (needed && current?.source === "theme") {
    actions = `<p class="muted">Theme places are built into the app, not a JSON file — knobs cannot be written from this lab.</p>`;
  }
  recEl.innerHTML = needed
    ? `
      <h2>Suggested change</h2>
      <p>
        ${escapeHtml(bits.join("; "))}.
        After that, solo without AI would be
        <strong>${escapeHtml(VERDICT_WORD[after.soloNoAi] || after.soloNoAi || "")}</strong>
        and solo with AI
        <strong>${escapeHtml(VERDICT_WORD[after.soloAi] || after.soloAi || "")}</strong>.
      </p>
      <div class="econ-rec-actions">${actions}</div>
      <details>
        <summary class="muted sm">JSON patch</summary>
        <pre class="econ-patch">${escapeHtml(JSON.stringify(rec.patch, null, 2))}</pre>
      </details>`
    : `<h2>No file change suggested</h2>
       <p>The starting wallet and meters already sit in the “tight but possible” band.</p>`;
  recEl.querySelector("#econ-apply")?.addEventListener("click", () => writePatch());
  recEl.querySelector("#econ-copy")?.addEventListener("click", () => copyToLibrary());
}

async function writePatch() {
  if (!lastReport?.recommendation?.needed || !current?.rel) return;
  const bits = englishPatch(lastReport.recommendation, lastReport.knobs);
  if (!confirm(`Write this into ${current.rel}?\n\n${bits.join("\n")}`)) return;
  try {
    const data = await api("/api/developer/quest-economy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        file: current.rel,
        patch: lastReport.recommendation.patch,
      }),
    });
    current.tile = data.tile;
    current.writable = true;
    setStatus(`Updated ${current.rel}`);
    runEvaluate();
  } catch (e) {
    setStatus(e.message || "Write failed", "bad");
  }
}

async function copyToLibrary() {
  try {
    const data = await api("/api/developer/quest-economy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        copyToLibrary: true,
        source: current.source,
        id: current.id,
      }),
    });
    setStatus(`Saved ${data.rel}`);
    current.rel = data.rel;
    current.source = "local";
    current.writable = true;
    current.tile = data.tile;
    await loadCatalog();
    runEvaluate();
  } catch (e) {
    setStatus(e.message || "Could not save a Library copy", "bad");
  }
}

leaveBtn?.addEventListener("click", () => leaveQuest());

backBtn.addEventListener("click", () => {
  if (nav.view === "theme") nav = { view: "themes" };
  else if (nav.view === "module") nav = { view: "catalog", kind: nav.kind || "learning" };
  else nav = { view: "hub" };
  renderNav();
});

seatsEl.addEventListener("change", () => {
  if (current) runEvaluate();
});

loadCatalog()
  .then(async () => {
    const params = new URLSearchParams(location.search);
    const id = params.get("id");
    const source = params.get("source");
    const file = params.get("file");
    renderNav();
    if (source === "theme" && id) {
      restoreThemeMission(id);
    } else if (id || file) {
      await pickQuest({ id, source, rel: file });
    }
  })
  .catch((e) => {
    setStatus(
      e.message === "not_found"
        ? "Start the game with --developer (or FF_DEVELOPER=1) to use this lab."
        : e.message || "Could not list quests",
      "bad"
    );
  });

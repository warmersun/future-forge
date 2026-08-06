/**
 * Visual theme + Quest cards for multiplayer setup (hotseat & rooms).
 * Mirrors solo challenge-card look.
 */

import { GLOBALS, localScenariosForGlobal } from "../data.js";
import {
  resourceOverrideLabel,
  crisisRolesLabel,
  learningProgressLabel,
} from "../quest-tile.js";

export function problemVisualUrl(globalId) {
  return `assets/problems/${globalId}.jpg`;
}

/**
 * @param {HTMLElement|null} grid
 * @param {object} opts
 * @param {string|null} opts.selectedId
 * @param {(g: object) => void} opts.onSelect
 * @param {(s: string) => string} opts.escapeHtml
 * @param {object[]} [opts.globals]
 */
export function paintThemeGrid(grid, opts) {
  if (!grid) return;
  const { selectedId, onSelect, escapeHtml, globals = GLOBALS } = opts;
  grid.innerHTML = globals
    .map((g) => {
      const tag = g.kind === "before" ? "Before it hits" : "Now";
      const cls = g.kind === "before" ? "flag-prevention" : "flag-problem";
      const img = problemVisualUrl(g.id);
      const sel = g.id === selectedId ? "is-selected" : "";
      return `
      <button type="button" class="challenge-card challenge-card-visual mp-pick-card ${sel}" data-id="${escapeHtml(
        g.id
      )}">
        <span class="card-visual" aria-hidden="true">
          <img src="${escapeHtml(img)}" alt="" loading="lazy" width="640" height="360" />
        </span>
        <span class="card-body">
          <span class="num"><span class="flag ${cls}">${tag}</span></span>
          <h3>${escapeHtml(g.title)}</h3>
          <p>${escapeHtml(g.blurb)}</p>
          <span class="cta">${g.id === selectedId ? "Selected · pick a place →" : "Choose theme →"}</span>
        </span>
      </button>`;
    })
    .join("");
  grid.querySelectorAll(".challenge-card").forEach((btn) => {
    btn.addEventListener("click", () => {
      const g = globals.find((x) => x.id === btn.dataset.id);
      if (g) onSelect(g);
    });
  });
}

/**
 * @param {HTMLElement|null} grid
 * @param {object} opts
 * @param {object[]} opts.missions
 * @param {string|null} opts.selectedId
 * @param {(m: object) => void} opts.onSelect
 * @param {(s: string) => string} opts.escapeHtml
 * @param {string} [opts.globalId] — for optional visual strip
 */
export function paintMissionGrid(grid, opts) {
  if (!grid) return;
  const { missions = [], selectedId, onSelect, escapeHtml, globalId } = opts;
  if (!missions.length) {
    grid.innerHTML = `<p class="empty-hint muted">Pick a theme to see Quests.</p>`;
    return;
  }
  const thumb = globalId ? problemVisualUrl(globalId) : "";
  grid.innerHTML = missions
    .map((m) => {
      const isExternal = m.source === "hosted" || m.source === "imported";
      const scene = String(m.scene || "").slice(0, 160);
      const ellipsis = String(m.scene || "").length > 160 ? "…" : "";
      const sel = m.id === selectedId ? "is-selected" : "";
      const tag =
        m.source === "hosted"
          ? "External"
          : m.source === "imported"
            ? "Imported"
            : m.source === "curated"
              ? "Curated"
              : "Challenge";
      const tagClass =
        m.source === "hosted"
          ? "external-tag"
          : m.source === "imported"
            ? "imported-tag"
            : "curated";
      const spot =
        isExternal && m.spotlight?.techId
          ? `<span class="scenario-tag spotlight-tag">Spotlight</span>`
          : "";
      const resLabel = resourceOverrideLabel(m.resources);
      const resTag = resLabel
        ? `<span class="scenario-tag resources-tag" title="Starting resources for this Quest">Start · ${escapeHtml(
            resLabel
          )}</span>`
        : "";
      const crisisLabel = crisisRolesLabel(m.crisisRoles);
      const crisisTag = crisisLabel
        ? `<span class="scenario-tag crisis-tag" title="Crisis meters on this Quest">Crisis · ${escapeHtml(
            crisisLabel
          )}</span>`
        : "";
      const learnProgress = learningProgressLabel(m);
      const learnTag = learnProgress
        ? `<span class="scenario-tag learning-tag" title="Learning module progress">Learn · ${escapeHtml(
            learnProgress
          )}</span>`
        : m.isLearningModule
          ? `<span class="scenario-tag learning-tag" title="Learning module">Learning module</span>`
          : "";
      const sponsorName = String(m.sponsorName || "").trim();
      const sponsorBanner = String(m.sponsorBanner || "").trim();
      const sponsorTag = sponsorName
        ? `<span class="scenario-tag sponsor-tag" title="${escapeHtml(
            sponsorBanner
              ? `Sponsored by ${sponsorName} — ${sponsorBanner}`
              : `Sponsored by ${sponsorName}`
          )}">Sponsored · ${escapeHtml(sponsorName)}</span>`
        : "";
      return `
      <button type="button" class="challenge-card challenge-card-visual mp-pick-card mp-mission-card ${sel} ${
        isExternal ? "quest-card-external" : ""
      }" data-id="${escapeHtml(m.id)}">
        ${
          thumb
            ? `<span class="card-visual" aria-hidden="true">
          <img src="${escapeHtml(thumb)}" alt="" loading="lazy" width="640" height="360" />
        </span>`
            : ""
        }
        <span class="card-body">
          <span class="num">${escapeHtml(m.place || "")} · ${m.startYear || 2026}
            <span class="scenario-tag ${tagClass}">${escapeHtml(tag)}</span>
            ${spot}
            ${sponsorTag}
            ${learnTag}
            ${resTag}
            ${crisisTag}
          </span>
          <h3>${escapeHtml(m.title)}</h3>
          <p>${escapeHtml(scene)}${ellipsis}</p>
          ${
            m.stakeholder
              ? `<p class="stakeholder-line">Stakeholder: ${escapeHtml(m.stakeholder)}</p>`
              : ""
          }
          <span class="cta">${m.id === selectedId ? "Selected ✓" : "Invent here →"}</span>
        </span>
      </button>`;
    })
    .join("");
  grid.querySelectorAll(".challenge-card").forEach((btn) => {
    btn.addEventListener("click", () => {
      const m = missions.find((x) => x.id === btn.dataset.id);
      if (m) onSelect(m);
    });
  });
}

/**
 * Load curated local pack for a theme.
 * @param {object|string} globalOrId
 * @param {{ count?: number, salt?: number }} [opts]
 */
export function missionsForTheme(globalOrId, opts = {}) {
  const g =
    typeof globalOrId === "string"
      ? GLOBALS.find((x) => x.id === globalOrId) || GLOBALS[0]
      : globalOrId || GLOBALS[0];
  if (!g) return [];
  return localScenariosForGlobal(g, { count: opts.count ?? 4, salt: opts.salt ?? 0 });
}

/**
 * Full Challenge brief for the left rail (setup + play).
 * @param {HTMLElement|null} el
 * @param {object|null} mission
 * @param {object} opts
 * @param {(s: string) => string} opts.escapeHtml
 * @param {string} [opts.globalId]
 * @param {string} [opts.heading] — default "Challenge"
 */
export function paintScenarioBrief(el, mission, opts = {}) {
  if (!el) return;
  const { escapeHtml = (s) => String(s || ""), globalId, heading = "Challenge" } = opts;
  if (!mission) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }
  const gid = globalId || mission.globalId;
  const g = gid ? GLOBALS.find((x) => x.id === gid) : null;
  const img = gid ? problemVisualUrl(gid) : "";
  const pressure = mission.pressure || {};
  const pressureLine = Object.entries(pressure)
    .map(([k, v]) => `${k} ${v}/5`)
    .join(" · ");
  const rise = mission.pressureRise || {};
  const riseLine = Object.entries(rise)
    .filter(([, v]) => Number(v) > 0)
    .map(([k, v]) => `${k} +${v}/wait`)
    .join(" · ");

  el.hidden = false;
  el.innerHTML = `
    <h3 class="mp-brief-heading">${escapeHtml(heading)}</h3>
    ${
      img
        ? `<div class="mp-brief-visual" aria-hidden="true">
      <img src="${escapeHtml(img)}" alt="" loading="lazy" width="640" height="360" />
    </div>`
        : ""
    }
    ${g ? `<p class="mp-brief-theme muted">${escapeHtml(g.title)}</p>` : ""}
    <h4 class="mp-brief-title">${escapeHtml(mission.title || "")}</h4>
    <p class="mp-brief-place">${escapeHtml(mission.place || "")}
      ${mission.startYear ? ` · ${mission.startYear}` : ""}
      ${mission.collapseYear ? ` → collapse ${mission.collapseYear}` : ""}
    </p>
    <p class="mp-brief-scene">${escapeHtml(mission.scene || "")}</p>
    ${
      mission.stakeholder
        ? `<p class="mp-brief-stake"><span class="muted">Stakeholder</span><br>${escapeHtml(
            mission.stakeholder
          )}</p>`
        : ""
    }
    ${
      pressureLine
        ? `<p class="mp-brief-meters"><span class="muted">Opening pressure</span><br>${escapeHtml(
            pressureLine
          )}</p>`
        : ""
    }
    ${
      riseLine
        ? `<p class="mp-brief-meters"><span class="muted">On Wait</span><br>${escapeHtml(
            riseLine
          )}</p>`
        : ""
    }
  `;
}

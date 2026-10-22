/**
 * Developer inspect HTML for the optional quest companion.
 * Shows the stored structure, including exploration. Research stays out.
 */

import { escapeHtml } from "./md-lite.js";

const PRESSURE_ROLES = ["local", "global", "support"];
const CHALLENGE_ANGLES = ["nature", "moloch", "ethicist", "stakeholder"];
const ANGLE_LABEL = {
  nature: "Mother Nature",
  moloch: "Moloch",
  ethicist: "Ethicist",
  stakeholder: "Stakeholder",
};

/**
 * @param {string} key
 * @param {unknown} value
 * @param {string} [html]
 */
function row(key, value, html) {
  if (value == null || value === "") return "";
  const dd = html != null ? html : escapeHtml(String(value));
  return `<div><dt>${escapeHtml(key)}</dt><dd>${dd}</dd></div>`;
}

/**
 * @param {string[]} rows
 */
function dl(rows) {
  const body = rows.filter(Boolean).join("");
  if (!body) return "";
  return `<dl class="quest-dev-dl">${body}</dl>`;
}

/**
 * @param {string} title
 * @param {string} inner
 */
function block(title, inner) {
  return `<div class="quest-dev-block"><h5>${escapeHtml(title)}</h5>${inner}</div>`;
}

/**
 * @param {string} label
 */
function subhead(label) {
  return `<h5 class="quest-dev-subhead">${escapeHtml(label)}</h5>`;
}

/**
 * https links only. Anything else is plain text.
 * @param {unknown} raw
 */
function urlHtml(raw) {
  const s = String(raw || "");
  if (!s) return escapeHtml("—");
  if (/^https:\/\//.test(s)) {
    const safe = escapeHtml(s);
    return `<a href="${safe}" target="_blank" rel="noopener noreferrer">${safe}</a>`;
  }
  return escapeHtml(s);
}

/**
 * @param {unknown} raw
 * @param {Record<string, string>} [labels]
 */
function pressureHtml(raw, labels) {
  const links = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  return PRESSURE_ROLES.map((role) => {
    const rowIn = links[role];
    const label = labels?.[role] ? `${labels[role]} · ${role}` : role;
    if (!rowIn || typeof rowIn !== "object") {
      return block(label, `<p class="muted">Missing</p>`);
    }
    return block(
      label,
      dl([
        row("connection", rowIn.connection),
        row("criterion", rowIn.criterion),
      ])
    );
  }).join("");
}

/**
 * @param {unknown} raw
 */
function challengesHtml(raw) {
  const challenges = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  return CHALLENGE_ANGLES.map((angle) => {
    const rowIn = challenges[angle];
    const label = `${ANGLE_LABEL[angle] || angle} · ${angle}`;
    if (!rowIn || typeof rowIn !== "object") {
      return block(label, `<p class="muted">Missing</p>`);
    }
    return block(
      label,
      dl([
        row("connection", rowIn.connection),
        row("question", rowIn.question),
      ])
    );
  }).join("");
}

/**
 * @param {unknown} grants
 */
function grantsHtml(grants) {
  if (!Array.isArray(grants) || !grants.length) {
    return `<p class="muted">No grants</p>`;
  }
  return grants
    .map((grant, i) => {
      const item = grant && typeof grant === "object" ? grant : {};
      const id = item.predictionId ? String(item.predictionId) : `Grant ${i + 1}`;
      return block(
        id,
        dl([
          row("predictionId", item.predictionId),
          row("scope", item.scope),
          row("limits", item.limits),
        ])
      );
    })
    .join("");
}

/**
 * @param {object} exploration
 * @param {Record<string, string>} pressureLabels
 */
function explorationHtml(exploration, pressureLabels) {
  const premise =
    exploration.premise && typeof exploration.premise === "object"
      ? exploration.premise
      : {};
  return `
    ${subhead("Exploration")}
    ${dl([
      row("version", exploration.version),
      row("focus", exploration.focus),
      row("bridge", exploration.bridge),
      row("reflectionPrompt", exploration.reflectionPrompt),
    ])}
    ${subhead("Premise")}
    ${dl([
      row("mode", premise.mode),
      row("bankId", premise.bankId || "—"),
      row("statement", premise.statement),
    ])}
    ${subhead("Grants")}
    ${grantsHtml(premise.grants)}
    ${subhead("Pressure links")}
    ${pressureHtml(exploration.pressureLinks, pressureLabels)}
    ${subhead("Challenges")}
    ${challengesHtml(exploration.challenges)}`;
}

/**
 * @param {object|null|undefined} companion
 * @param {{ pressureLabels?: Record<string, string> }} [opts]
 * @returns {string}
 */
export function catalogInspectCompanionHtml(companion, opts = {}) {
  if (!companion || typeof companion !== "object") {
    return `
      <section class="quest-dev-section quest-dev-companion" id="quest-dev-companion">
        <h4>Companion</h4>
        <p class="muted">No companion</p>
      </section>`;
  }
  const source =
    companion.source && typeof companion.source === "object" ? companion.source : {};
  const evidence =
    companion.evidence && typeof companion.evidence === "object" ? companion.evidence : {};
  const hosts = Array.isArray(source.hosts) ? source.hosts.map(String).filter(Boolean).join(", ") : "";
  const exploration =
    companion.exploration && typeof companion.exploration === "object"
      ? companion.exploration
      : null;
  return `
    <section class="quest-dev-section quest-dev-companion" id="quest-dev-companion">
      <h4>Companion</h4>
      ${dl([
        row("medium", companion.medium),
        row("move", companion.move),
        row("collaboration", companion.collaboration),
        row("partnerName", companion.partnerName),
        row("claim", companion.claim),
        row("quote", companion.quote || "—"),
        row("interpretation", companion.interpretation || "—"),
        row("invitation", companion.invitation),
      ])}
      ${subhead("Source")}
      ${dl([
        row("show", source.show),
        row("episode", source.episode),
        row("title", source.title),
        row("speaker", source.speaker),
        row("hosts", hosts),
        row("author", source.author),
        row("publication", source.publication),
        row("cue", source.cue),
        row("published", source.published),
        row("recorded", source.recorded),
        row("url", source.url || "—", urlHtml(source.url)),
      ])}
      ${subhead("Evidence")}
      ${dl([
        row("status", evidence.status),
        row("reviewed", evidence.reviewed),
        row("limits", evidence.limits),
        row("scope", evidence.scope),
        row("horizon", evidence.horizon),
      ])}
      ${
        exploration
          ? explorationHtml(exploration, opts.pressureLabels || {})
          : `${subhead("Exploration")}<p class="muted">No exploration</p>`
      }
    </section>`;
}

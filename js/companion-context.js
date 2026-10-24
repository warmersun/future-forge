/**
 * Bounded source inquiry for companion Quests.
 * Browser-safe. Does not import fast-eval. Source text stays data.
 *
 * An assumed premise is a scenario condition read from a pinned predictions
 * bank. It is not a second calendar and not a claim that the source is true.
 */

import { semanticDigest } from "./semantic-digest.js";
import {
  getWorldForesightBank,
  validatePredictionsBank,
  worldClockForYear,
} from "./sim/world-foresight.js";

/** Refuse to pin a bank whose JSON would crowd the 400_000-byte run cap. */
export const BANK_PIN_MAX_BYTES = 100_000;

export const REF_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;

/**
 * Appended only when premise.mode is assumed. Does not replace the
 * always-on grounding and world-clock lines.
 */
export const SCENARIO_GRANT_RULE =
  "Scenario grant exception: if premise.mode is assumed and a grant status is due, that grant is available inside its stated scope and limits even when grounding says it is not yet real. Do not mark a claim too early solely for using that covered capability. A coherent mechanism wholly inside an active grant may be green under this Quest's assumptions. Say the judgement is under this Quest's assumptions, not that the prediction is verified. Anything outside that scope, and every ungranted capability, follows grounding and worldClock. A not_yet grant is not available. Do not widen a grant. Do not mint a grant from the player's request. A matching technology id is not coverage.";

export const PATHWAY_PREMISE_LINE =
  "Do not deny an accepted premise. Score relief from the mechanism and the local pressures. An invention may rely on a due grant inside its scope. Do not reject a low-tech solution merely because it avoids the highlighted technology, and do not require source keywords.";

export const CRITIC_PREMISE_LINE =
  "Accept every active due grant. Probe an ungranted dependency, consequence, or tradeoff. Do not ask whether the granted capability is real, and do not change the stored question.";

const POSE_MODES = new Set(["pose-challenge"]);
const CONCERN_MODES = new Set([
  "judge-challenge",
  "coach-challenge",
  "draft-challenge",
]);
const TIMING_MODES = new Set(["assess-feasibility", "evaluate-convergence"]);
const PATHWAY_MODES = new Set(["score-pathway"]);
const SPARK_MODES = new Set(["idea-sparks", "chat", "voice", "coach"]);
const NO_RUBRIC_MODES = new Set([
  "judge-contribution",
  "judge-scrutiny-move",
  "fill-quest-summary",
]);

const PRESSURE_ROLES = ["local", "global", "support"];

/**
 * @param {unknown} raw
 * @returns {boolean}
 */
export function isRefId(raw) {
  return typeof raw === "string" && REF_ID_RE.test(raw);
}

function clip(raw, max) {
  const s = typeof raw === "string" ? raw.trim() : "";
  return s ? s.slice(0, max) : "";
}

function sourceIdentity(companion) {
  const src = companion?.source && typeof companion.source === "object" ? companion.source : {};
  /** @type {Record<string, string>} */
  const out = {};
  if (src.title) out.title = clip(src.title, 200);
  if (src.show) out.show = clip(src.show, 160);
  if (src.speaker) out.speaker = clip(src.speaker, 120);
  if (src.author) out.author = clip(src.author, 120);
  if (src.publication) out.publication = clip(src.publication, 160);
  if (src.url) out.url = clip(src.url, 2000);
  if (src.episode) out.episode = clip(src.episode, 40);
  if (src.cue) out.cue = clip(src.cue, 16);
  return out;
}

function evidenceSlice(companion) {
  const ev = companion?.evidence && typeof companion.evidence === "object" ? companion.evidence : {};
  /** @type {Record<string, string>} */
  const out = {};
  if (ev.status) out.status = clip(ev.status, 40);
  if (ev.limits) out.limits = clip(ev.limits, 400);
  if (ev.reviewed) out.reviewed = clip(ev.reviewed, 10);
  if (ev.scope) out.scope = clip(ev.scope, 160);
  if (ev.horizon) out.horizon = clip(ev.horizon, 40);
  return out;
}

function rowById(bank) {
  const map = new Map();
  for (const row of bank?.predictions || []) {
    if (row && row.id) map.set(row.id, row);
  }
  return map;
}

function attributionName(row) {
  const name = row?.attribution?.name;
  return typeof name === "string" && name.trim() ? name.trim().slice(0, 80) : "";
}

function grantFromRow(grant, row, year) {
  const y = Number(year);
  const status = Number.isFinite(y) && Number(row.year) <= y ? "due" : "not_yet";
  const name = attributionName(row);
  return {
    predictionId: row.id,
    year: Number(row.year),
    kind: row.kind,
    headline: row.headline,
    detail: row.detail,
    claimBand: row.claimBand,
    status,
    scope: clip(grant.scope, 500),
    limits: clip(grant.limits, 500),
    techIds: Array.isArray(row.techIds) ? row.techIds.map(String) : [],
    ...(name ? { attribution: name } : {}),
  };
}

/**
 * Resolve exact bank and row references. Does not invent a capability.
 * @param {object|null|undefined} companion
 * @param {object|null|undefined} validatedBank
 * @param {number} year
 * @returns {{ ok: true, premise: object|null } | { ok: false, error: string, premise: null }}
 */
export function resolveScenarioPremise(companion, validatedBank, year) {
  const exploration = companion?.exploration;
  if (!exploration || typeof exploration !== "object") {
    return { ok: true, premise: null };
  }
  const premise = exploration.premise;
  if (!premise || typeof premise !== "object") {
    return { ok: true, premise: null };
  }
  if (premise.mode === "evidence-grounded") {
    return {
      ok: true,
      premise: {
        mode: "evidence-grounded",
        statement: clip(premise.statement, 500),
        grants: [],
      },
    };
  }
  if (premise.mode !== "assumed") {
    return { ok: false, error: "bad_mode", premise: null };
  }
  const bankId = typeof premise.bankId === "string" ? premise.bankId : "";
  if (!validatedBank || validatedBank.id !== bankId || bankId === "empty" || !bankId) {
    return { ok: false, error: "bank_mismatch", premise: null };
  }
  const rows = rowById(validatedBank);
  const grants = [];
  for (const grant of premise.grants || []) {
    const id = grant?.predictionId;
    const row = rows.get(id);
    if (!row) return { ok: false, error: "missing_row", premise: null };
    grants.push(grantFromRow(grant, row, year));
  }
  return {
    ok: true,
    premise: {
      mode: "assumed",
      bankId,
      statement: clip(premise.statement, 500),
      grants,
    },
  };
}

/**
 * Keep ranked clock rows, then append any selected premise row the ranking cut.
 * Status stays the premise row's due/not_yet. Does not reorder the ranked list.
 * @param {object[]|null|undefined} rows
 * @param {object|null|undefined} premise
 */
export function clockWithPremiseRows(rows, premise) {
  const list = Array.isArray(rows) ? rows.slice() : [];
  const seen = new Set(list.map((row) => row && row.id).filter(Boolean));
  for (const grant of premise?.grants || []) {
    const id = grant?.predictionId;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    list.push({
      id,
      year: grant.year,
      kind: grant.kind,
      headline: grant.headline,
      detail: grant.detail,
      claimBand: grant.claimBand,
      status: grant.status === "due" ? "due" : "not_yet",
      ...(grant.attribution ? { attribution: grant.attribution } : {}),
    });
  }
  return list;
}

function pressureSlice(exploration) {
  const links = exploration?.pressureLinks;
  if (!links || typeof links !== "object" || Array.isArray(links)) return null;
  /** @type {Record<string, { connection: string, criterion: string }>} */
  const out = {};
  for (const role of PRESSURE_ROLES) {
    const row = links[role];
    if (!row || typeof row !== "object") continue;
    const connection = clip(row.connection, 280);
    const criterion = clip(row.criterion, 400);
    if (!connection && !criterion) continue;
    out[role] = { connection, criterion };
  }
  return Object.keys(out).length ? out : null;
}

function concernSnapshot(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const question = clip(raw.question, 400);
  const connection = clip(raw.connection, 280);
  const focus = clip(raw.focus, 280);
  const key = clip(raw.key, 8000);
  if (!question && !connection && !focus && !key) return null;
  return {
    ...(key ? { key } : {}),
    ...(focus ? { focus } : {}),
    ...(connection ? { connection } : {}),
    ...(question ? { question } : {}),
  };
}

function baseInquiry(companion) {
  return {
    move: clip(companion.move, 40),
    medium: clip(companion.medium, 40),
    source: sourceIdentity(companion),
    claim: clip(companion.claim, 280),
    evidence: evidenceSlice(companion),
    invitation: clip(companion.invitation, 280),
  };
}

/**
 * Mode-specific bounded source context, or null when there is no companion.
 * @param {object|null|undefined} companion
 * @param {{ mode?: string, angle?: string, bank?: object|null, year?: number, concern?: object|null, concerns?: object[] }} [options]
 */
export function buildSourceInquiry(companion, options = {}) {
  if (!companion || typeof companion !== "object" || Array.isArray(companion)) return null;
  if (!clip(companion.claim, 280) && !clip(companion.invitation, 280)) return null;
  const mode = String(options.mode || "chat");
  const base = baseInquiry(companion);
  if (NO_RUBRIC_MODES.has(mode)) return base;

  const exploration = companion.exploration;
  const resolved = resolveScenarioPremise(companion, options.bank, options.year);
  /** @type {Record<string, unknown>} */
  const inquiry = { ...base };
  if (exploration && typeof exploration === "object") {
    if (!TIMING_MODES.has(mode) && !POSE_MODES.has(mode)) {
      if (exploration.focus) inquiry.focus = clip(exploration.focus, 280);
      if (exploration.bridge) inquiry.bridge = clip(exploration.bridge, 500);
    }
  }
  if (resolved.ok && resolved.premise) inquiry.premise = resolved.premise;
  else if (!resolved.ok) {
    inquiry.premise = null;
    inquiry.premiseError = resolved.error;
  }

  if (POSE_MODES.has(mode)) {
    const angle = String(options.angle || "");
    const row = exploration?.challenges?.[angle];
    if (row && typeof row === "object") {
      inquiry.challenge = {
        angle,
        connection: clip(row.connection, 280),
        question: clip(row.question, 400),
      };
    }
    return inquiry;
  }

  if (CONCERN_MODES.has(mode)) {
    const snap = concernSnapshot(options.concern);
    if (snap) inquiry.concern = snap;
    return inquiry;
  }

  if (TIMING_MODES.has(mode)) return inquiry;

  if (PATHWAY_MODES.has(mode)) {
    const links = pressureSlice(exploration);
    if (links) inquiry.pressureLinks = links;
    const snaps = (Array.isArray(options.concerns) ? options.concerns : [])
      .map((row) => concernSnapshot(row?.sourceInquiry || row))
      .filter(Boolean);
    if (snaps.length) inquiry.concernSnapshots = snaps;
    return inquiry;
  }

  if (SPARK_MODES.has(mode) || mode === "chat") {
    const links = pressureSlice(exploration);
    if (links) inquiry.pressureLinks = links;
    return inquiry;
  }

  const links = pressureSlice(exploration);
  if (links) inquiry.pressureLinks = links;
  return inquiry;
}

function sanitizeGrantList(rawGrants, bank, year) {
  const rows = rowById(bank);
  const grants = [];
  const seen = new Set();
  if (!Array.isArray(rawGrants)) return grants;
  for (const grant of rawGrants) {
    if (!grant || typeof grant !== "object") continue;
    const id = grant.predictionId;
    if (!isRefId(id) || seen.has(id) || !rows.has(id)) continue;
    seen.add(id);
    grants.push(grantFromRow(grant, rows.get(id), year));
    if (grants.length >= 3) break;
  }
  return grants;
}

/**
 * Server boundary. Recomputes due/not_yet from the pinned bank.
 * Forged prediction ids are dropped. Client status flags are ignored.
 * @param {unknown} raw
 * @param {{ mode?: string, angle?: string, bank?: object|null, year?: number, companion?: object|null, concern?: object|null, concerns?: object[] }} [options]
 */
export function sanitizeSourceInquiry(raw, options = {}) {
  if (options.companion && typeof options.companion === "object") {
    return buildSourceInquiry(options.companion, options);
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const claim = clip(raw.claim, 280);
  const invitation = clip(raw.invitation, 280);
  if (!claim && !invitation) return null;
  const mode = String(options.mode || raw.mode || "chat");
  /** @type {Record<string, unknown>} */
  const inquiry = {
    move: clip(raw.move, 40),
    medium: clip(raw.medium, 40),
    source: sourceIdentity({ source: raw.source }),
    claim,
    evidence: evidenceSlice({ evidence: raw.evidence }),
    invitation,
  };
  if (NO_RUBRIC_MODES.has(mode)) return inquiry;

  const bank = options.bank || null;
  const year = options.year;
  const rawPremise = raw.premise && typeof raw.premise === "object" ? raw.premise : null;
  if (rawPremise?.mode === "evidence-grounded") {
    inquiry.premise = {
      mode: "evidence-grounded",
      statement: clip(rawPremise.statement, 500),
      grants: [],
    };
  } else if (rawPremise?.mode === "assumed") {
    if (!bank || bank.id !== rawPremise.bankId || rawPremise.bankId === "empty") {
      inquiry.premise = null;
      inquiry.premiseError = "bank_mismatch";
    } else {
      inquiry.premise = {
        mode: "assumed",
        bankId: bank.id,
        statement: clip(rawPremise.statement, 500),
        grants: sanitizeGrantList(rawPremise.grants, bank, year),
      };
    }
  }

  if (POSE_MODES.has(mode)) {
    const angle = String(options.angle || raw.challenge?.angle || "");
    const row = raw.challenge;
    if (row && typeof row === "object" && (!angle || row.angle === angle || !row.angle)) {
      const question = clip(row.question, 400);
      const connection = clip(row.connection, 280);
      if (question || connection) {
        inquiry.challenge = { angle, connection, question };
      }
    }
    return inquiry;
  }

  if (CONCERN_MODES.has(mode)) {
    const snap = concernSnapshot(options.concern || raw.concern);
    if (snap) inquiry.concern = snap;
    return inquiry;
  }

  if (TIMING_MODES.has(mode)) return inquiry;

  if (!TIMING_MODES.has(mode) && !POSE_MODES.has(mode)) {
    if (raw.focus) inquiry.focus = clip(raw.focus, 280);
    if (raw.bridge) inquiry.bridge = clip(raw.bridge, 500);
  }
  if (!TIMING_MODES.has(mode)) {
    const links = pressureSlice({ pressureLinks: raw.pressureLinks });
    if (links && !CONCERN_MODES.has(mode)) inquiry.pressureLinks = links;
  }
  if (PATHWAY_MODES.has(mode)) {
    const snaps = (Array.isArray(raw.concernSnapshots) ? raw.concernSnapshots : [])
      .map((row) => concernSnapshot(row))
      .filter(Boolean);
    if (snaps.length) inquiry.concernSnapshots = snaps;
  }
  return inquiry;
}

function bankRowsForKey(bank) {
  return (bank?.predictions || []).map((row) => ({
    id: row?.id || "",
    year: Number(row?.year) || 0,
    kind: row?.kind || "",
    headline: row?.headline || "",
    detail: row?.detail || "",
    claimBand: row?.claimBand || "",
    techIds: Array.isArray(row?.techIds) ? [...row.techIds].map(String).sort() : [],
    globalIds: Array.isArray(row?.globalIds) ? [...row.globalIds].map(String).sort() : [],
    sourceNote: row?.sourceNote || "",
    attribution: row?.attribution || null,
  }));
}

/**
 * Titles, publication timestamps, and bank presentation metadata are display-only.
 * Every prediction field used by the world clock, ranking, or grants is semantic.
 * Recompute for mutable legacy banks, including same-id and in-place edits.
 * Package identity is additive, never a substitute for effective bank contents.
 */
export function predictionsContextKey(bank, year, packageRef = null) {
  return semanticDigest("predictions-context-v1", {
    packageId: packageRef?.packageId || "",
    revision: packageRef?.revision || "",
    questId: packageRef?.questId || "",
    bankId: bank?.id || "",
    schema: bank?.schema || "",
    attribution: bank?.attribution || null,
    rows: bankRowsForKey(bank),
    year: Number(year) || 0,
  });
}

/**
 * Compact SHA-256 semantic key. Source and bank titles are display-only;
 * row headlines, source identity/attribution, and all rubric inputs are semantic.
 * Bank contents and the run year are included, so a same-id file change
 * and a Wait across a grant year both miss the cache.
 * Recompute rather than memoizing mutable banks by object identity: in-place
 * content edits must invalidate too. Object property order is not semantic.
 * @param {object|null|undefined} companion
 * @param {object|null|undefined} validatedBank
 * @param {number} year
 * @returns {string}
 */
export function sourceInquiryKey(companion, validatedBank, year, packageRef = null) {
  if (!companion || typeof companion !== "object") {
    return validatedBank || packageRef ? predictionsContextKey(validatedBank, year, packageRef) : "";
  }
  const y = Number(year) || 0;
  const exploration = companion.exploration || null;
  const premise = exploration?.premise || null;
  const resolved = resolveScenarioPremise(companion, validatedBank, y);
  const statuses = (resolved.premise?.grants || []).map((grant) => ({
    predictionId: grant.predictionId,
    status: grant.status,
    scope: grant.scope,
    limits: grant.limits,
  }));
  const { title: _displayTitle, ...source } = sourceIdentity(companion);
  return semanticDigest("source-inquiry-v1", {
    source,
    medium: companion.medium || "",
    evidence: evidenceSlice(companion),
    claim: companion.claim || "",
    invitation: companion.invitation || "",
    move: companion.move || "",
    evidenceStatus: companion.evidence?.status || "",
    evidenceLimits: companion.evidence?.limits || "",
    focus: exploration?.focus || "",
    bridge: exploration?.bridge || "",
    mode: premise?.mode || "",
    bankId: premise?.bankId || "",
    statement: premise?.statement || "",
    grants: Array.isArray(premise?.grants)
      ? premise.grants.map((grant) => ({
          predictionId: grant?.predictionId || "",
          scope: grant?.scope || "",
          limits: grant?.limits || "",
        }))
      : [],
    pressureLinks: exploration?.pressureLinks || null,
    challenges: exploration?.challenges || null,
    world: predictionsContextKey(validatedBank, y, packageRef),
    year: y,
    statuses,
  });
}

/**
 * Local timing when an assumed premise has a due grant and the heuristic
 * cannot judge coverage. Yellow, not a certification and not a veto.
 * @param {object|null|undefined} premise
 * @returns {{ level: "yellow", basis: "scenario", assumedPredictionIds: string[], reason: string }|null}
 */
export function provisionalScenarioTiming(premise) {
  if (!premise || premise.mode !== "assumed") return null;
  const ids = (premise.grants || [])
    .filter((grant) => grant && grant.status === "due" && grant.predictionId)
    .map((grant) => grant.predictionId);
  if (!ids.length) return null;
  return {
    level: "yellow",
    basis: "scenario",
    assumedPredictionIds: ids,
    reason:
      "Scenario-aware checking is unavailable. This timing is provisional under this Quest's assumptions. It does not say the premise is impossible, and it does not certify the invention.",
  };
}

/**
 * @param {object|null|undefined} inquiry
 * @param {string} [mode]
 * @returns {string}
 */
export function scenarioGrantSuffix(inquiry, mode = "") {
  if (inquiry?.premise?.mode !== "assumed") return "";
  if (NO_RUBRIC_MODES.has(mode)) return "";
  let extra = `\n${SCENARIO_GRANT_RULE}`;
  if (mode === "score-pathway") extra += `\n${PATHWAY_PREMISE_LINE}`;
  if (
    mode === "pose-challenge" ||
    mode === "judge-challenge" ||
    mode === "coach-challenge" ||
    mode === "draft-challenge"
  ) {
    extra += `\n${CRITIC_PREMISE_LINE}`;
  }
  return extra;
}

/**
 * Choose the predictions pool for one call.
 * A bound id that does not resolve returns null so callers do not fall
 * back to the process-global clock. Unbound calls return undefined.
 * @param {object|null|undefined} context
 * @param {{ predictionsBank?: object, predictionsBankId?: string }} [opts]
 * @returns {object[]|null|undefined}
 */
export function predictionsPoolForContext(context, opts = {}) {
  const explicit = opts.predictionsBank || context?.predictionsBank;
  const id = opts.predictionsBankId || context?.predictionsBankId || "";
  if (explicit && typeof explicit === "object") {
    const validated = validatePredictionsBank(explicit);
    if (!validated.ok || !validated.bank) return null;
    if (id && validated.bank.id !== id) return null;
    return validated.bank.predictions;
  }
  if (id) {
    const loaded = getWorldForesightBank();
    if (loaded && loaded.id === id && loaded.id !== "empty") return loaded.predictions;
    return null;
  }
  return undefined;
}

/**
 * Ranked world clock plus any selected premise rows the ranking omitted.
 * @param {number} year
 * @param {object} context
 * @param {{ techIds?: string[], limit?: number, globalId?: string|null, pool?: object[] }} [opts]
 */
export function worldClockWithPremise(year, context, opts = {}) {
  const pool = opts.pool;
  const rows = worldClockForYear(year, {
    techIds: opts.techIds,
    globalId: opts.globalId,
    limit: opts.limit ?? 12,
    ...(pool ? { pool } : {}),
  });
  return clockWithPremiseRows(rows, context?.sourceInquiry?.premise);
}

/** Stable recovery contract: never discard or replace an unreproducible save. */
export function legacyWorldUnresolved() {
  return {
    ok: false,
    error: "legacy_world_unresolved",
    message: "This older run's saved world cannot be reproduced. Preserve or export the save for recovery; start a fresh run separately. The saved world has not been replaced.",
  };
}

/**
 * Bind an assumed Quest to one validated bank. Does not mutate global state.
 * @param {object|null|undefined} companion
 * @param {{ loadedBank?: object|null, restoreBank?: object|null, restoring?: boolean, year?: number }} [opts]
 */
export function pinPredictionsBank(companion, opts = {}) {
  const mode = companion?.exploration?.premise?.mode;
  if (!companion?.exploration || mode !== "assumed") {
    return { ok: true, bank: null, premise: null };
  }
  const want = companion.exploration.premise.bankId;
  const year = opts.year;

  const accept = (doc) => {
    const validated = validatePredictionsBank(doc);
    if (!validated.ok || !validated.bank) return null;
    if (validated.bank.id !== want || validated.bank.id === "empty") return null;
    return validated.bank;
  };

  const tooBig = (bank) => {
    try {
      return new TextEncoder().encode(JSON.stringify(bank)).length > BANK_PIN_MAX_BYTES;
    } catch {
      return true;
    }
  };

  // A restore is an exact snapshot read, not a search for a usable calendar.
  // Check original bytes before validation can clip oversized fields.
  if (opts.restoring || opts.restoreBank != null) {
    if (opts.restoreBank == null || tooBig(opts.restoreBank)) return legacyWorldUnresolved();
    const restored = accept(opts.restoreBank);
    if (!restored) return legacyWorldUnresolved();
    const resolved = resolveScenarioPremise(companion, restored, year);
    if (!resolved.ok) return legacyWorldUnresolved();
    return { ok: true, bank: restored, premise: resolved.premise };
  }

  const loaded = opts.loadedBank ? accept(opts.loadedBank) : null;
  if (!loaded) {
    return {
      ok: false,
      error: "bank_mismatch",
      message: "This server does not have the predictions bank this Quest needs.",
    };
  }
  if (tooBig(loaded)) {
    return {
      ok: false,
      error: "bank_too_large",
      message: "This Quest's predictions bank is too large to pin for Continue.",
    };
  }
  const resolved = resolveScenarioPremise(companion, loaded, year);
  if (!resolved.ok) {
    return {
      ok: false,
      error: resolved.error,
      message: "This Quest's premise rows are not in the loaded predictions bank.",
    };
  }
  return { ok: true, bank: loaded, premise: resolved.premise };
}

/**
 * @param {{ level?: string, reason?: string, basis?: string, assumedPredictionIds?: string[] }} raw
 * @param {object|null|undefined} premise
 */
export function sanitizeScenarioTiming(raw, premise) {
  const lvl = String(raw?.level || "").toLowerCase();
  const level = lvl === "red" || lvl === "yellow" || lvl === "green" ? lvl : null;
  if (!level) return null;
  const due = new Set(
    (premise?.mode === "assumed" ? premise.grants || [] : [])
      .filter((grant) => grant?.status === "due" && grant.predictionId)
      .map((grant) => grant.predictionId)
  );
  const requested = Array.isArray(raw?.assumedPredictionIds) ? raw.assumedPredictionIds : [];
  const assumedPredictionIds = [];
  for (const id of requested) {
    if (typeof id === "string" && due.has(id) && !assumedPredictionIds.includes(id)) {
      assumedPredictionIds.push(id);
    }
  }
  let basis = raw?.basis === "scenario" ? "scenario" : "ordinary";
  if (basis === "scenario" && !assumedPredictionIds.length) basis = "ordinary";
  return {
    level,
    reason: clip(raw?.reason, 280),
    basis,
    assumedPredictionIds,
  };
}

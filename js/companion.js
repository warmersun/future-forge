/**
 * Optional companion on a normal quest.
 * The source is a podcast or a written piece. The move is the one claim
 * this puzzle asks the player to explore. Omit the key and the quest is ordinary.
 * Capability truth stays in grounding except an explicit scenario grant.
 * Optional exploration names that grant. This object is a source limit.
 */

export const COMPANION_MEDIA = [
  "podcast",
  "post",
  "article",
  "video",
  "talk",
  "paper",
  "other",
];

export const COMPANION_MOVES = [
  "milestone",
  "trend",
  "idea",
  "opinion",
  "prediction",
];

/** evidence.status values allowed for each move. */
export const COMPANION_PAIRS = {
  milestone: ["demonstrated", "inferred", "disputed"],
  trend: ["inferred", "proposed", "disputed"],
  idea: ["proposed", "inferred", "disputed"],
  opinion: ["proposed", "inferred", "disputed"],
  prediction: ["prediction"],
};

const MOVE_LABEL = {
  milestone: "Milestone",
  trend: "Trend",
  idea: "Idea",
  opinion: "Opinion",
  prediction: "A prediction, not a current capability",
};

const STATUS_LABEL = {
  demonstrated: "Demonstrated",
  inferred: "Inferred",
  proposed: "Proposed, not shown",
  disputed: "Disputed",
  prediction: "A prediction",
};

const CUE_RE = /^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const ACCESS_TAIL =
  " Co-inventor use follows this server's limits. The AI is a fallible advisor. A game result does not verify the source or approve a real deployment.";

const CONSTRAINT_TAIL =
  " An idea, opinion, trend, or prediction is not current capability unless this Quest grants it inside its stated scope. A milestone is only as firm as its evidence status. Disagreement with the speaker is a valid invention. Do not say the game verified the source. Do not require agreement or a product purchase. Outside an explicit scenario grant, capability truth is grounding and the world clock.";

export const COMPANION_OK_PREFIX = "ff-companion-ok:";

/**
 * @param {unknown} raw
 * @param {number} max
 * @param {string[]} details
 * @param {string} key
 * @param {{ required?: boolean, min?: number }} [opts]
 * @returns {string}
 */
function takeText(raw, max, details, key, opts = {}) {
  if (raw == null) {
    if (opts.required) details.push(`companion_missing_${key}`);
    return "";
  }
  if (typeof raw !== "string") {
    details.push(`companion_${key}_not_string`);
    return "";
  }
  const s = raw.trim();
  if (!s) {
    details.push(`companion_empty_${key}`);
    return "";
  }
  if (opts.min && s.length < opts.min) details.push(`companion_${key}_thin`);
  if (s.length > max) details.push(`companion_${key}_too_long`);
  return s;
}

function validDate(raw, details, key, required) {
  const s = takeText(raw, 10, details, key, { required });
  if (!s) return "";
  const m = DATE_RE.exec(s);
  if (!m) {
    details.push(`companion_${key}_bad_date`);
    return "";
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) {
    details.push(`companion_${key}_bad_date`);
    return "";
  }
  return s;
}

function validUrl(raw, details) {
  const s = takeText(raw, 2000, details, "url", { required: true });
  if (!s) return "";
  let url;
  try {
    url = new URL(s);
  } catch {
    details.push("companion_missing_url");
    return "";
  }
  if (url.protocol !== "https:") {
    details.push("companion_url_not_https");
    return "";
  }
  return s;
}

const EXPLORATION_KEYS = new Set([
  "version",
  "focus",
  "bridge",
  "premise",
  "pressureLinks",
  "challenges",
  "reflectionPrompt",
]);
const PREMISE_KEYS = new Set(["mode", "bankId", "statement", "grants"]);
const GRANT_KEYS = new Set(["predictionId", "scope", "limits"]);
const PRESSURE_ROLES = new Set(["local", "global", "support"]);
const CHALLENGE_ANGLES = ["nature", "moloch", "ethicist", "stakeholder"];
const LINK_KEYS = new Set(["connection", "criterion"]);
const CHALLENGE_KEYS = new Set(["connection", "question"]);
const REF_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;

function explorationText(raw, max, details, key, required = true) {
  if (raw == null) {
    if (required) details.push(`exploration_missing_${key}`);
    return "";
  }
  if (typeof raw !== "string") {
    details.push(`exploration_${key}_not_string`);
    return "";
  }
  const s = raw.trim();
  if (!s) {
    details.push(`exploration_empty_${key}`);
    return "";
  }
  if (s.length > max) details.push(`exploration_${key}_too_long`);
  return s;
}

function explorationId(raw, details, key) {
  if (typeof raw !== "string" || !REF_ID_RE.test(raw)) {
    details.push(`exploration_bad_${key}`);
    return "";
  }
  return raw;
}

function rejectUnknown(obj, allowed, details, code) {
  if (!obj || typeof obj !== "object") return;
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) details.push(code);
  }
}

/**
 * Optional source-connected play contract. Absent on legacy companions.
 * Shape only. Bank rows are resolved later.
 * @param {unknown} raw
 * @param {string[]} details
 * @returns {object|null}
 */
export function parseExploration(raw, details) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    details.push("exploration_not_object");
    return null;
  }
  rejectUnknown(raw, EXPLORATION_KEYS, details, "exploration_unknown_key");
  if (!(Number.isInteger(raw.version) && raw.version === 1)) {
    details.push("exploration_bad_version");
  }
  const focus = explorationText(raw.focus, 280, details, "focus");
  const bridge = explorationText(raw.bridge, 500, details, "bridge");
  const reflectionPrompt = explorationText(raw.reflectionPrompt, 400, details, "reflectionPrompt");

  const premiseIn = raw.premise;
  /** @type {Record<string, unknown>} */
  const premise = {};
  if (!premiseIn || typeof premiseIn !== "object" || Array.isArray(premiseIn)) {
    details.push("exploration_missing_premise");
  } else {
    rejectUnknown(premiseIn, PREMISE_KEYS, details, "exploration_unknown_key");
    const mode = premiseIn.mode;
    if (mode !== "assumed" && mode !== "evidence-grounded") {
      details.push("exploration_bad_mode");
    } else {
      premise.mode = mode;
    }
    if (mode === "assumed") {
      if (premiseIn.bankId == null || premiseIn.bankId === "") {
        details.push("exploration_missing_bankId");
      } else {
        const bankId = explorationId(premiseIn.bankId, details, "bankId");
        if (bankId) premise.bankId = bankId;
      }
    } else if (mode === "evidence-grounded" && premiseIn.bankId != null) {
      details.push("exploration_bank_not_allowed");
    }
    const statement = explorationText(premiseIn.statement, 500, details, "statement");
    if (statement) premise.statement = statement;
    if (!Array.isArray(premiseIn.grants)) {
      details.push("exploration_bad_grants");
    } else if (mode === "evidence-grounded" && premiseIn.grants.length) {
      details.push("exploration_bad_grants");
    } else if (mode === "assumed" && (premiseIn.grants.length < 1 || premiseIn.grants.length > 3)) {
      details.push("exploration_bad_grants");
    } else {
      const grants = [];
      const seen = new Set();
      for (const item of premiseIn.grants) {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
          details.push("exploration_bad_grant");
          continue;
        }
        rejectUnknown(item, GRANT_KEYS, details, "exploration_unknown_key");
        const predictionId = explorationId(item.predictionId, details, "predictionId");
        if (predictionId && seen.has(predictionId)) details.push("exploration_duplicate_prediction");
        if (predictionId) seen.add(predictionId);
        const scope = explorationText(item.scope, 500, details, "scope");
        const limits = explorationText(item.limits, 500, details, "limits");
        if (predictionId && scope && limits) grants.push({ predictionId, scope, limits });
      }
      premise.grants = grants;
    }
  }

  const pressureIn = raw.pressureLinks;
  /** @type {Record<string, { connection: string, criterion: string }>} */
  const pressureLinks = {};
  if (!pressureIn || typeof pressureIn !== "object" || Array.isArray(pressureIn)) {
    details.push("exploration_bad_pressure");
  } else {
    const roles = Object.keys(pressureIn);
    if (!roles.length || roles.length > 3) details.push("exploration_bad_pressure");
    for (const role of roles) {
      if (!PRESSURE_ROLES.has(role)) {
        details.push("exploration_unknown_pressure");
        continue;
      }
      const row = pressureIn[role];
      if (!row || typeof row !== "object" || Array.isArray(row)) {
        details.push("exploration_bad_pressure");
        continue;
      }
      rejectUnknown(row, LINK_KEYS, details, "exploration_unknown_key");
      const connection = explorationText(row.connection, 280, details, "connection");
      const criterion = explorationText(row.criterion, 400, details, "criterion");
      if (connection && criterion) pressureLinks[role] = { connection, criterion };
    }
    if (!Object.keys(pressureLinks).length && !details.includes("exploration_bad_pressure")) {
      details.push("exploration_bad_pressure");
    }
  }

  const challengesIn = raw.challenges;
  /** @type {Record<string, { connection: string, question: string }>} */
  const challenges = {};
  if (!challengesIn || typeof challengesIn !== "object" || Array.isArray(challengesIn)) {
    details.push("exploration_bad_challenges");
  } else {
    rejectUnknown(challengesIn, new Set(CHALLENGE_ANGLES), details, "exploration_unknown_challenge");
    for (const angle of CHALLENGE_ANGLES) {
      const row = challengesIn[angle];
      if (!row || typeof row !== "object" || Array.isArray(row)) {
        details.push(`exploration_missing_${angle}`);
        continue;
      }
      rejectUnknown(row, CHALLENGE_KEYS, details, "exploration_unknown_key");
      const connection = explorationText(row.connection, 280, details, "connection");
      const question = explorationText(row.question, 400, details, "question");
      if (connection && question) challenges[angle] = { connection, question };
    }
  }

  if (details.some((code) => code.startsWith("exploration_"))) return null;
  return {
    version: 1,
    focus,
    bridge,
    premise,
    pressureLinks,
    challenges,
    reflectionPrompt,
  };
}

function validCue(raw, details) {
  const s = takeText(raw, 16, details, "cue", { required: true });
  if (!s) return "";
  const m = CUE_RE.exec(s);
  if (!m) {
    details.push("companion_missing_cue");
    return "";
  }
  const minutes = Number(m[2]);
  const seconds = Number(m[3]);
  if (minutes > 59 || seconds > 59) {
    details.push("companion_missing_cue");
    return "";
  }
  return s;
}

/**
 * @param {unknown} raw
 * @param {{ access?: string }} [opts]
 * @returns {{ ok: true, value: object } | { ok: false, details: string[] }}
 */
export function parseCompanion(raw, opts = {}) {
  const details = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, details: ["companion_not_object"] };
  }
  const access = String(opts.access || "").trim();
  if (access !== "open" && access !== "account" && access !== "paid") {
    details.push("companion_access_required");
  }

  const medium = String(raw.medium || "").trim();
  if (!COMPANION_MEDIA.includes(medium)) details.push("companion_bad_medium");
  const move = String(raw.move || "").trim();
  if (!COMPANION_MOVES.includes(move)) details.push("companion_bad_move");

  const srcIn = raw.source;
  if (!srcIn || typeof srcIn !== "object" || Array.isArray(srcIn)) {
    details.push("companion_missing_source");
  }
  const src = srcIn && typeof srcIn === "object" ? srcIn : {};
  const source = {};
  const title = takeText(src.title, 200, details, "title", { required: true });
  if (title) source.title = title;
  const url = validUrl(src.url, details);
  if (url) source.url = url;

  if (medium === "podcast") {
    const show = takeText(src.show, 160, details, "show", { required: true });
    if (show) source.show = show;
    const speaker = takeText(src.speaker, 120, details, "speaker", { required: true });
    if (speaker) source.speaker = speaker;
    const cue = validCue(src.cue, details);
    if (cue) source.cue = cue;
  } else if (medium) {
    const author = takeText(src.author, 120, details, "author", { required: false });
    const publication = takeText(src.publication, 160, details, "publication", { required: false });
    if (!author && !publication && src.author == null && src.publication == null) {
      details.push("companion_missing_byline");
    }
    if (author) source.author = author;
    if (publication) source.publication = publication;
    if (src.author != null && !author && typeof src.author === "string") {
      /* empty already recorded */
    }
    if (!source.author && !source.publication && !details.includes("companion_missing_byline") && !details.includes("companion_empty_author") && !details.includes("companion_empty_publication")) {
      details.push("companion_missing_byline");
    }
  }

  if (src.episode != null) {
    const episode = takeText(src.episode, 40, details, "episode");
    if (episode) source.episode = episode;
  }
  if (src.published != null) {
    const published = validDate(src.published, details, "published", false);
    if (published) source.published = published;
  }
  if (src.recorded != null) {
    const recorded = validDate(src.recorded, details, "recorded", false);
    if (recorded) source.recorded = recorded;
  }
  if (medium !== "podcast") {
    if (src.author != null && !source.author) {
      const author = takeText(src.author, 120, details, "author");
      if (author) source.author = author;
    }
    if (src.publication != null && !source.publication) {
      const publication = takeText(src.publication, 160, details, "publication");
      if (publication) source.publication = publication;
    }
    if (src.speaker != null) {
      const speaker = takeText(src.speaker, 120, details, "speaker");
      if (speaker) source.speaker = speaker;
    }
    if (src.show != null) {
      const show = takeText(src.show, 160, details, "show");
      if (show) source.show = show;
    }
    if (src.cue != null) {
      const cue = validCue(src.cue, details);
      if (cue) source.cue = cue;
    }
  } else {
    if (src.author != null) {
      const author = takeText(src.author, 120, details, "author");
      if (author) source.author = author;
    }
    if (src.publication != null) {
      const publication = takeText(src.publication, 160, details, "publication");
      if (publication) source.publication = publication;
    }
  }
  if (src.hosts != null) {
    if (!Array.isArray(src.hosts)) details.push("companion_hosts_not_array");
    else if (!src.hosts.length) details.push("companion_empty_hosts");
    else if (src.hosts.length > 6) details.push("companion_hosts_too_many");
    else {
      const hosts = [];
      for (const name of src.hosts) {
        const n = takeText(name, 80, details, "host");
        if (n) hosts.push(n);
      }
      if (hosts.length) source.hosts = hosts;
    }
  }

  const claim = takeText(raw.claim, 280, details, "claim", { required: true });
  const invitation = takeText(raw.invitation, 280, details, "invitation", { required: true });
  let quote = "";
  if (raw.quote != null) quote = takeText(raw.quote, 240, details, "quote");
  let interpretation = "";
  if (raw.interpretation != null) {
    interpretation = takeText(raw.interpretation, 280, details, "interpretation");
  }
  if (quote && !interpretation) details.push("companion_quote_needs_interpretation");
  if (quote && claim && quote === claim) details.push("companion_quote_equals_claim");

  const evIn = raw.evidence;
  if (!evIn || typeof evIn !== "object" || Array.isArray(evIn)) {
    details.push("companion_missing_evidence");
  }
  const ev = evIn && typeof evIn === "object" ? evIn : {};
  const status = String(ev.status || "").trim();
  const allowed = COMPANION_PAIRS[move] || [];
  if (!status || !allowed.includes(status)) details.push("companion_bad_pair");
  const limits = takeText(ev.limits, 400, details, "limits", { required: true, min: 40 });
  if (limits && limits.length < 40 && !details.includes("companion_limits_thin")) {
    details.push("companion_limits_thin");
  }
  const reviewed = validDate(ev.reviewed, details, "reviewed", true);
  const evidence = {};
  if (status && allowed.includes(status)) evidence.status = status;
  if (limits) evidence.limits = limits;
  if (reviewed) evidence.reviewed = reviewed;
  if (move === "trend") {
    const scope = takeText(ev.scope, 160, details, "scope", { required: true });
    if (scope) evidence.scope = scope;
  } else if (ev.scope != null) {
    const scope = takeText(ev.scope, 160, details, "scope");
    if (scope) evidence.scope = scope;
  }
  if (move === "prediction") {
    const horizon = takeText(ev.horizon, 40, details, "horizon", { required: true });
    if (horizon) evidence.horizon = horizon;
  } else if (ev.horizon != null) {
    const horizon = takeText(ev.horizon, 40, details, "horizon");
    if (horizon) evidence.horizon = horizon;
  }

  let collaboration = "independent";
  if (raw.collaboration != null) {
    const c = takeText(raw.collaboration, 40, details, "collaboration");
    if (c === "independent" || c === "co-produced") collaboration = c;
    else if (c) details.push("companion_bad_collaboration");
  }
  let partnerName = "";
  if (raw.partnerName != null) partnerName = takeText(raw.partnerName, 120, details, "partnerName");
  if (collaboration === "co-produced" && !partnerName) details.push("companion_missing_partner");

  let exploration = null;
  if (raw.exploration != null) {
    exploration = parseExploration(raw.exploration, details);
  }

  if (details.length) return { ok: false, details };

  /** @type {Record<string, unknown>} */
  const value = {
    medium,
    move,
    source,
    claim,
    evidence,
    collaboration,
    invitation,
  };
  if (quote) value.quote = quote;
  if (interpretation) value.interpretation = interpretation;
  if (partnerName) value.partnerName = partnerName;
  if (exploration) value.exploration = exploration;
  return { ok: true, value };
}

/**
 * Fields a signed-out catalog card may show. No brief, grounding, or research.
 * @param {object|null|undefined} companion
 * @returns {object|null}
 */
export function publicCompanionSlice(companion) {
  if (!companion || typeof companion !== "object") return null;
  const src = companion.source && typeof companion.source === "object" ? companion.source : {};
  const source = {};
  for (const key of [
    "show",
    "episode",
    "title",
    "url",
    "published",
    "recorded",
    "cue",
    "speaker",
    "hosts",
    "author",
    "publication",
  ]) {
    if (src[key] == null || src[key] === "") continue;
    source[key] = src[key];
  }
  if (!companion.medium || !companion.move) return null;
  const evidenceIn = companion.evidence && typeof companion.evidence === "object" ? companion.evidence : {};
  const evidence = {};
  for (const key of ["status", "limits", "reviewed", "scope", "horizon"]) {
    if (evidenceIn[key]) evidence[key] = evidenceIn[key];
  }
  /** @type {Record<string, unknown>} */
  const out = {
    medium: companion.medium,
    move: companion.move,
    source,
    claim: String(companion.claim || ""),
    evidence,
    collaboration: companion.collaboration || "independent",
    invitation: String(companion.invitation || ""),
  };
  if (companion.quote) out.quote = companion.quote;
  if (companion.interpretation) out.interpretation = companion.interpretation;
  if (companion.partnerName) out.partnerName = companion.partnerName;
  return out;
}

function libraryPlaced(tile) {
  const source = String(tile?.source || tile?.mission?.source || "");
  return source === "hosted" || source === "imported";
}

/**
 * One quiet access sentence, then the fixed co-inventor limit.
 * Pass `{ placed: false }` for a file that is not on a server library yet.
 * @param {object|null|undefined} tile
 * @param {{ placed?: boolean }} [opts]
 */
export function companionAccessLine(tile, opts = {}) {
  const placed = opts.placed !== false;
  let lead;
  if (placed && libraryPlaced(tile)) {
    lead = "This copy is on this server's Library.";
  } else {
    const access = tile?.access || tile?.mission?.access || "open";
    if (access === "account") {
      lead = "Sign-in is required before this Quest opens.";
    } else if (access === "paid") {
      const ent = String(tile?.entitlement || tile?.mission?.entitlement || "").trim();
      const sponsor = String(tile?.sponsorName || tile?.mission?.sponsorName || "").trim();
      const waived = ent === "catalog.free" || Boolean(sponsor);
      lead = waived
        ? "A subscription is not required for this Quest. Sign-in is still required."
        : "A subscription is required.";
    } else {
      lead = "No account is required to open this Quest.";
    }
  }
  return `${lead}${ACCESS_TAIL}`;
}

function kickerName(source, medium) {
  const raw =
    medium === "podcast"
      ? source?.show
      : source?.publication || source?.show || source?.title || "";
  let name = String(raw || "").trim();
  const withAt = name.toLowerCase().indexOf(" with ");
  if (medium === "podcast" && withAt > 0) name = name.slice(0, withAt);
  return name.toUpperCase();
}

/**
 * Player-facing label for the source link.
 * @param {string} medium
 * @param {{ cue?: string, url?: string }} [source]
 */
export function sourceLinkLabel(medium, source = {}) {
  const cue = source?.cue;
  if (medium === "podcast" && cue) return `Listen at ${cue}`;
  if (medium === "podcast") return "Listen";
  if (medium === "video") return "Watch";
  if (medium === "talk") return "Watch the talk";
  if (source?.url) return "Read the piece";
  return "";
}

function reviewedLabel(iso) {
  const m = DATE_RE.exec(String(iso || ""));
  if (!m) return "";
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return `Reviewed ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}.`;
}

/**
 * Player-facing stage copy. No schema words.
 * @param {object|null|undefined} companion
 */
export function stageCopy(companion) {
  const c = companion && typeof companion === "object" ? companion : {};
  const source = c.source && typeof c.source === "object" ? c.source : {};
  const evidence = c.evidence && typeof c.evidence === "object" ? c.evidence : {};
  const medium = String(c.medium || "");
  const move = String(c.move || "");
  const moveWord = (MOVE_LABEL[move] || move || "").split(",")[0].trim();
  const parts = [kickerName(source, medium)].filter(Boolean);
  if (medium === "podcast" && source.episode) parts.push(`EP ${source.episode}`);
  if (moveWord) parts.push(moveWord.toUpperCase());
  const who = source.speaker || source.author || "";
  let byline = "";
  if (medium === "podcast") {
    const bits = [];
    if (who) bits.push(String(who));
    if (source.cue) bits.push(`at ${source.cue}`);
    if (source.show) bits.push(`on ${source.show}`);
    byline = bits.join(", ").replace(", on ", ", on ");
    if (who && source.cue && source.show) {
      byline = `${who}, at ${source.cue}, on ${source.show}`;
    }
  } else if (source.author && source.publication) {
    byline = `${source.author}, ${source.publication}`;
  } else {
    byline = String(source.author || source.publication || "");
  }
  const statusLabel = STATUS_LABEL[evidence.status] || "";
  const evidenceBits = [];
  if (statusLabel) evidenceBits.push(statusLabel.endsWith(".") ? statusLabel : `${statusLabel}.`);
  if (evidence.limits) evidenceBits.push(String(evidence.limits));
  if (evidence.scope) evidenceBits.push(`Scope: ${evidence.scope}.`);
  if (evidence.horizon) evidenceBits.push(`Horizon: ${evidence.horizon}.`);
  const linkUrl = String(source.url || "");
  const linkLabel = sourceLinkLabel(medium, source);
  const collaboration = c.collaboration === "co-produced" ? "co-produced" : "independent";
  return {
    kicker: parts.join(" · "),
    invitation: String(c.invitation || ""),
    byline,
    move,
    moveLabel: MOVE_LABEL[move] || moveWord,
    evidenceSentence: evidenceBits.join(" "),
    reviewedLabel: reviewedLabel(evidence.reviewed),
    claim: String(c.claim || ""),
    quote: String(c.quote || ""),
    speaker: String(source.speaker || source.author || ""),
    interpretation: String(c.interpretation || ""),
    collaborationLine:
      collaboration === "co-produced" && c.partnerName
        ? `Made with ${c.partnerName}.`
        : "Future Forge wrote this. Credit is not a partnership.",
    linkLabel,
    linkUrl: linkUrl.startsWith("https://") ? linkUrl : "",
  };
}

/**
 * Separate from grounding. At most 500 characters.
 * @param {object|null|undefined} companion
 * @returns {string}
 */
export function sourceConstraintText(companion) {
  if (!companion || typeof companion !== "object" || !companion.move) return "";
  const copy = stageCopy(companion);
  const evidence = companion.evidence || {};
  const headBits = [];
  if (copy.moveLabel && evidence.status) {
    const status = STATUS_LABEL[evidence.status] || evidence.status;
    headBits.push(`${copy.moveLabel}, ${status}.`);
  }
  if (evidence.limits) headBits.push(String(evidence.limits));
  if (evidence.scope) headBits.push(`Scope: ${evidence.scope}.`);
  if (evidence.horizon) headBits.push(`Horizon: ${evidence.horizon}.`);
  if (companion.invitation) headBits.push(`Question: ${companion.invitation}`);
  let head = headBits.join(" ");
  const room = 500 - CONSTRAINT_TAIL.length;
  if (head.length > room) {
    head = `${head.slice(0, Math.max(0, room - 1)).trimEnd()}…`;
  }
  return `${head}${CONSTRAINT_TAIL}`.slice(0, 500);
}

/**
 * @param {object|null|undefined} entry
 * @param {{ getItem?: (k: string) => string|null, get?: (k: string) => unknown }|null} [storage]
 * @returns {"play"|"gate"|"resume-after-accept"}
 */
export function companionGateDecision(entry, storage) {
  const companion = entry?.mission?.companion || entry?.companion || entry?.tile?.companion;
  if (!companion) return "play";
  const id = String(entry?.id || entry?.mission?.id || "");
  if (!id) return "gate";
  const key = `${COMPANION_OK_PREFIX}${id}`;
  let accepted = false;
  try {
    if (storage && typeof storage.getItem === "function") {
      accepted = storage.getItem(key) === "1";
    } else if (storage && typeof storage.get === "function") {
      accepted = Boolean(storage.get(key));
    }
  } catch {
    accepted = false;
  }
  return accepted ? "resume-after-accept" : "gate";
}

/**
 * @param {string} questId
 * @param {{ setItem?: (k: string, v: string) => void }|null} storage
 */
export function markCompanionAccepted(questId, storage) {
  if (!questId || !storage || typeof storage.setItem !== "function") return;
  try {
    storage.setItem(`${COMPANION_OK_PREFIX}${questId}`, "1");
  } catch {
    /* private mode */
  }
}

/**
 * @param {string} questId
 * @param {{ removeItem?: (k: string) => void }|null} storage
 */
export function clearCompanionAccepted(questId, storage) {
  if (!questId || !storage || typeof storage.removeItem !== "function") return;
  try {
    storage.removeItem(`${COMPANION_OK_PREFIX}${questId}`);
  } catch {
    /* ignore */
  }
}

/**
 * Second line when another loaded quest cites the same source URL.
 * @param {object|null|undefined} entry
 * @param {object[]} [entries]
 * @returns {string}
 */
export function siblingSourceLine(entry, entries) {
  const companion = entry?.mission?.companion || entry?.companion;
  const url = companion?.source?.url;
  if (!url || !Array.isArray(entries)) return "";
  const others = entries.filter((e) => {
    if (!e || e === entry || e.id === entry.id) return false;
    const u = e?.mission?.companion?.source?.url || e?.companion?.source?.url;
    return u === url;
  });
  if (!others.length) return "";
  const word =
    companion.medium === "podcast" || companion.medium === "video" ? "episode" : "piece";
  const titles = others.map((e) => e.title || e.mission?.title).filter(Boolean);
  return titles.length
    ? `Also from this ${word}: ${titles.join("; ")}`
    : `Also from this ${word}`;
}

/**
 * Catalog line under the title.
 * @param {object|null|undefined} entry
 * @returns {string}
 */
export function companionFromLine(entry) {
  const c = entry?.mission?.companion || entry?.companion;
  if (!c?.source) return "";
  const from = c.source.show || c.source.publication || c.source.author || "";
  if (!from) return "";
  const cue = c.medium === "podcast" && c.source.cue ? ` · ${c.source.cue}` : "";
  return `From ${from}${cue}`;
}

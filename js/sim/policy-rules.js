/**
 * Named local rules — policy weather the pathway flies through.
 * A rule is not an invent: lobby can write or suspend weather; meters only
 * move when a capability pathway scores.
 */

export const RULE_KINDS = ["regulation", "law", "policy", "ban"];

export const RULE_KIND_LABELS = {
  regulation: "Regulation",
  law: "Law",
  policy: "Policy",
  ban: "Ban",
};

/** Known mechanical bites. Unknown ids fail quest validation. */
export const RULE_EFFECTS = ["share-required", "eval-required", "backlash"];

export const MAX_QUEST_RULES = 3;
export const MAX_LIVE_RULES = 8;
export const RULE_LABEL_MAX = 80;
export const RULE_BODY_MAX = 400;
export const RULE_ID_MAX = 48;

const KIND_SET = new Set(RULE_KINDS);
const EFFECT_SET = new Set(RULE_EFFECTS);

/**
 * @param {string} raw
 */
export function slugRuleId(raw) {
  const s = String(raw || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, RULE_ID_MAX);
  return s;
}

/**
 * @param {string} kind
 */
export function normalizeRuleKind(kind) {
  const k = String(kind || "")
    .trim()
    .toLowerCase();
  if (KIND_SET.has(k)) return k;
  if (k === "contract" || k === "rule" || k === "ordinance") return "policy";
  return "";
}

function clipLabel(s) {
  return String(s || "").trim().slice(0, RULE_LABEL_MAX);
}

function clipBody(s) {
  return String(s || "").trim().slice(0, RULE_BODY_MAX);
}

function parseEffects(raw) {
  if (raw == null) return { ok: true, value: [] };
  if (!Array.isArray(raw)) return { ok: false, error: "rule_effects_not_array" };
  const out = [];
  const seen = new Set();
  for (const item of raw) {
    const id = String(item || "").trim();
    if (!id) continue;
    if (!EFFECT_SET.has(id)) return { ok: false, error: `rule_effect_unknown:${id}` };
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return { ok: true, value: out };
}

/**
 * Normalize one authored or live rule. Live fields (source/status/year) optional.
 * @param {unknown} raw
 * @param {{ live?: boolean }} [opts]
 */
export function normalizeRule(raw, opts = {}) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "rule_not_object" };
  }
  const kind = normalizeRuleKind(raw.kind);
  if (!kind) return { ok: false, error: "rule_bad_kind" };
  const label = clipLabel(raw.label);
  if (!label) return { ok: false, error: "rule_empty_label" };
  const body = clipBody(raw.body);
  const effectsParsed = parseEffects(raw.effects);
  if (!effectsParsed.ok) return effectsParsed;
  let id = slugRuleId(raw.id || label);
  if (!id) return { ok: false, error: "rule_bad_id" };
  const rule = {
    id,
    kind,
    label,
    ...(body ? { body } : {}),
    ...(effectsParsed.value.length ? { effects: effectsParsed.value } : {}),
  };
  if (opts.live) {
    const source = raw.source === "lobby" ? "lobby" : "quest";
    const status = raw.status === "suspended" ? "suspended" : "active";
    const year = Number.isFinite(Number(raw.year)) ? Number(raw.year) : null;
    rule.source = source;
    rule.status = status;
    if (year != null) rule.year = year;
  }
  return { ok: true, value: rule };
}

/**
 * Optional quest field. Omit / null → no rules. Empty array rejected (omit the key).
 * @param {unknown} raw
 * @returns {{ ok: true, value: object[]|null } | { ok: false, details: string[] }}
 */
export function parseQuestRules(raw) {
  if (raw === undefined || raw === null) return { ok: true, value: null };
  if (!Array.isArray(raw)) return { ok: false, details: ["rules_not_array"] };
  if (!raw.length) return { ok: false, details: ["rules_empty"] };
  if (raw.length > MAX_QUEST_RULES) {
    return { ok: false, details: [`rules_too_many:${raw.length}`] };
  }
  const out = [];
  const seen = new Set();
  const details = [];
  raw.forEach((item, i) => {
    const n = normalizeRule(item);
    if (!n.ok) {
      details.push(`rules[${i}]:${n.error}`);
      return;
    }
    if (seen.has(n.value.id)) {
      details.push(`rules[${i}]:duplicate_id:${n.value.id}`);
      return;
    }
    seen.add(n.value.id);
    out.push(n.value);
  });
  if (details.length) return { ok: false, details };
  return { ok: true, value: out };
}

/**
 * @param {object[]|null|undefined} questRules
 * @param {number} [year]
 */
export function seedLiveRules(questRules, year = 2026) {
  const y = Number(year) || 2026;
  return (questRules || []).map((r) => ({
    ...r,
    effects: r.effects ? [...r.effects] : undefined,
    source: "quest",
    status: "active",
    year: y,
  }));
}

/**
 * Cache key for live policy weather. Status is part of the key so
 * suspend/restore re-scores the same way add/remove does.
 * @param {object[]|null|undefined} rules
 * @returns {string}
 */
export function rulesWeatherKey(rules) {
  return (Array.isArray(rules) ? rules : [])
    .map((r) => {
      const id = String(r?.id || "").trim();
      if (!id) return "";
      const status = r?.status === "suspended" ? "suspended" : "active";
      return `${id}:${status}`;
    })
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .join("|");
}

/**
 * @param {object[]|null|undefined} rules
 */
export function cloneRules(rules) {
  if (!Array.isArray(rules) || !rules.length) return [];
  return rules.map((r) => ({
    ...r,
    ...(Array.isArray(r.effects) ? { effects: [...r.effects] } : {}),
  }));
}

/**
 * @param {object[]|null|undefined} rules
 */
export function activeRules(rules) {
  return (rules || []).filter((r) => r && r.status !== "suspended");
}

/**
 * @param {object[]|null|undefined} rules
 * @returns {Set<string>}
 */
export function effectSet(rules) {
  const s = new Set();
  for (const r of activeRules(rules)) {
    for (const e of r.effects || []) s.add(e);
  }
  return s;
}

/**
 * Quest-seeded weather (including suspended). Lobby flavor writes do not count —
 * otherwise write-then-remove-lock would drop theme backlash.
 * Missing `source` (authored mission.rules) counts as quest.
 * @param {object[]|null|undefined} rules
 */
export function hasQuestWeather(rules) {
  return (rules || []).some((r) => r && r.source !== "lobby");
}

/**
 * Honesty still follows the theme. Backlash follows authored effects when
 * the quest named rules — so Lobby can suspend a lock without dropping meters.
 * Removing the last quest rule restores theme backlash (a leftover lobby
 * flavor rule does not keep backlash off).
 * @param {{ globalId?: string, rules?: object[] }} opts
 */
export function honestyNeeds(opts = {}) {
  const gid = String(opts.globalId || "");
  const rules = opts.rules || [];
  const effects = effectSet(rules);
  const questWeather = hasQuestWeather(rules);
  return {
    share: effects.has("share-required") || gid === "automation",
    eval: effects.has("eval-required") || gid === "rogue-si",
    backlash:
      effects.has("backlash") ||
      (!questWeather && (gid === "automation" || gid === "rogue-si")),
  };
}

/**
 * Live list if present (including empty = player cleared the books).
 * Missing / non-array seeds from the quest so old saves and MP rooms upgrade.
 * @param {object[]|null|undefined} rules
 * @param {object[]|null|undefined} questRules
 * @param {number} [year]
 */
export function liveRulesOrSeed(rules, questRules, year) {
  if (Array.isArray(rules)) return cloneRules(rules);
  return seedLiveRules(questRules, year);
}

/**
 * @param {object[]|null|undefined} rules
 */
export function summarizeRulesForAi(rules) {
  const list = rules || [];
  if (!list.length) return [];
  return list.slice(0, MAX_LIVE_RULES).map((r) => ({
    id: r.id,
    kind: r.kind,
    label: r.label,
    body: r.body || "",
    status: r.status === "suspended" ? "suspended" : "active",
    source: r.source === "lobby" ? "lobby" : "quest",
    effects: Array.isArray(r.effects) ? r.effects.slice() : [],
  }));
}

function nextLobbyId(rules, year) {
  const y = Number(year) || 2026;
  const n = (rules || []).filter((r) => r.source === "lobby").length + 1;
  return slugRuleId(`lobby-${y}-${n}`) || `lobby-${y}-${n}`;
}

/**
 * Add a player-written rule. Does not drop crisis meters.
 * @param {object[]} rules
 * @param {{ kind?: string, label?: string, body?: string, year?: number, id?: string }} draft
 */
export function writeLobbyRule(rules, draft = {}) {
  const live = cloneRules(rules);
  if (live.length >= MAX_LIVE_RULES) {
    return { ok: false, error: "rules_full", rules: live };
  }
  const kind = normalizeRuleKind(draft.kind || "policy");
  if (!kind) return { ok: false, error: "rule_bad_kind", rules: live };
  const label = clipLabel(draft.label);
  if (!label) return { ok: false, error: "rule_empty_label", rules: live };
  const body = clipBody(draft.body);
  const year = Number(draft.year) || 2026;
  let id = slugRuleId(draft.id || nextLobbyId(live, year));
  if (live.some((r) => r.id === id)) {
    id = slugRuleId(`${id}-${live.length + 1}`) || `${id}-${live.length + 1}`;
  }
  const rule = {
    id,
    kind,
    label,
    ...(body ? { body } : {}),
    source: "lobby",
    status: "active",
    year,
  };
  live.push(rule);
  return { ok: true, rules: live, rule };
}

/**
 * Take a rule off the books. Quest-seeded and lobby-written are both removable.
 * @param {object[]} rules
 * @param {string} ruleId
 */
export function removeLobbyRule(rules, ruleId) {
  const live = cloneRules(rules);
  const id = String(ruleId || "");
  const idx = live.findIndex((r) => r.id === id);
  if (idx < 0) return { ok: false, error: "rule_missing", rules: live };
  const rule = live[idx];
  live.splice(idx, 1);
  return { ok: true, rules: live, rule };
}

/**
 * @param {object[]} rules
 * @param {string} ruleId
 * @param {"active"|"suspended"} status
 */
export function setRuleStatus(rules, ruleId, status) {
  const live = cloneRules(rules);
  const id = String(ruleId || "");
  const row = live.find((r) => r.id === id);
  if (!row) return { ok: false, error: "rule_missing", rules: live };
  const next = status === "suspended" ? "suspended" : "active";
  if (row.status === next) return { ok: true, rules: live, rule: row, unchanged: true };
  row.status = next;
  return { ok: true, rules: live, rule: row };
}

export function kindLabel(kind) {
  const k = normalizeRuleKind(kind);
  return RULE_KIND_LABELS[k] || "Policy";
}

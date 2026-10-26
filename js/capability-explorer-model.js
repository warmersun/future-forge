/** Read-only evidence selection for the Invent capability explorer. */
import { mergeTrendsForStack, valueAtYear } from "./capability-trend.js";
import { bankForRun } from "./sim/run-world.js";
import { validatePredictionsBank } from "./sim/world-foresight.js";
import { resolveScenarioPremise } from "./companion-context.js";

const idPattern = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/;
const validRef = (ref) => !!ref && idPattern.test(ref.packageId || "") &&
  idPattern.test(ref.questId || "") && /^sha256:[0-9a-f]{64}$/.test(ref.revision || "");
const sameRef = (a, b) => validRef(a) && validRef(b) &&
  a.packageId === b.packageId && a.questId === b.questId && a.revision === b.revision;

/** Resolve one validated bank. Unresolved bound worlds never use ambient data. */
export function resolveExplorerBank(snapshot = {}) {
  const mission = snapshot.mission || {};
  const world = snapshot.runWorld;
  const missionRef = mission.packageRef;
  const worldRef = world?.packageRef;
  const bound = missionRef != null || mission.predictionBankId != null || worldRef != null;
  const bindingError = mission.packageRefError || mission.predictionsBankError || snapshot.packageRefError || snapshot.predictionsBankError;
  const rawPremise = mission.companion?.exploration?.premise;
  const assumed = rawPremise?.mode === "assumed" || snapshot.scenarioPremise?.mode === "assumed";
  let provenance = bound ? "package" : assumed ? "pinned" : "ambient";
  const unavailable = () => ({ status: "unavailable", bank: null, provenance });
  if (bindingError) return unavailable();
  let candidate;
  if (bound) {
    // A prepared package must agree with all mission binding fields, not merely
    // share a bank ID with another package or a stale legacy world.
    if (!sameRef(missionRef, worldRef) || mission.id !== missionRef.questId || !mission.predictionBankId) return unavailable();
    candidate = bankForRun(snapshot);
  } else if (assumed) {
    candidate = bankForRun(snapshot);
  } else {
    candidate = snapshot.ambientBank;
  }
  // Identity is literal: validation trims and truncates IDs for display.
  if (bound && candidate?.id !== mission.predictionBankId) return unavailable();
  const checked = validatePredictionsBank(candidate);
  if (!checked.ok || checked.bank.id === "empty") return unavailable();
  if (bound && checked.bank.id !== mission.predictionBankId) return unavailable();
  const expectedId = rawPremise?.mode === "assumed" ? rawPremise.bankId : snapshot.scenarioPremise?.mode === "assumed" ? snapshot.scenarioPremise.bankId : null;
  if (!bound && assumed && (!expectedId || checked.bank.id !== expectedId)) return unavailable();
  return { status: "available", bank: checked.bank, provenance };
}

/** Full chronological rows and the three closest, with stable year/ID ties. */
export function selectRelatedEvidence(rows = [], techIds = [], year) {
  const wanted = new Set(techIds);
  const cmp = (a, b) => a.year - b.year || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const all = rows.filter((row) => Array.isArray(row.techIds) && row.techIds.some((id) => wanted.has(id))).slice().sort(cmp);
  const nearest = all.slice().sort((a, b) => Math.abs(a.year - year) - Math.abs(b.year - year) || cmp(a, b)).slice(0, 3);
  return { all, nearest };
}

/**
 * selection is a choice key string or { key, scopeKey, viewIdentity }. When
 * identity fields are supplied they must match; the controller owns the map of
 * remembered selections and supplies a run/seat viewIdentity in its snapshot.
 */
export function buildCapabilityExplorerModel(snapshot = {}, selection = null) {
  const mission = snapshot.mission || {};
  const techIds = snapshot.focusedTechId ? [snapshot.focusedTechId] :
    [...new Set((snapshot.selectedTechIds || []).filter(Boolean))];
  const scopeKey = JSON.stringify(techIds.slice().sort());
  const scope = { key: scopeKey, techIds };
  const trends = mergeTrendsForStack({ catalog: snapshot.catalogTrends || [], questTrends: mission.trends || [],
    spotlightTrendIds: mission.spotlightTrends || [], spotlightTechId: mission.spotlight?.techId || null,
    selectedTechIds: techIds });
  const bank = resolveExplorerBank(snapshot);
  const rawPremise = mission.companion?.exploration?.premise;
  // A cached snapshot is not authority to grant a capability. Resolve the
  // current mission's whole premise against the selected bank instead.
  const canResolve = bank.bank && (rawPremise?.mode !== "assumed" || rawPremise.grants == null || Array.isArray(rawPremise.grants));
  const resolved = canResolve ? resolveScenarioPremise(mission.companion, bank.bank, snapshot.year) : null;
  const premise = resolved?.ok ? resolved.premise : null;
  const grants = new Map();
  if (premise?.mode === "assumed" && bank.bank && premise.bankId === bank.bank.id && Array.isArray(premise.grants)) {
    for (const grant of premise.grants) if (grant?.predictionId) grants.set(grant.predictionId, { ...grant });
  }
  const rows = (bank.bank?.predictions || []).map((row) => grants.has(row.id) ? { ...row, scenarioGrant: grants.get(row.id) } : row);
  const scopeEvidence = selectRelatedEvidence(rows, techIds, snapshot.year);
  const choices = trends.map((trend) => ({ key: `trend:${trend.id}`, type: "trend", label: trend.name, trendId: trend.id }));
  if (scopeEvidence.all.length) choices.push({ key: `predictions:${scopeKey}`, type: "predictions", label: "Related predictions" });
  const selectionMatches = !selection || typeof selection === "string" ||
    ((!Object.hasOwn(selection, "scopeKey") || selection.scopeKey === scopeKey) &&
     (!Object.hasOwn(selection, "viewIdentity") || selection.viewIdentity === snapshot.viewIdentity));
  const requested = !selectionMatches ? null : typeof selection === "string" ? selection : selection?.key;
  const selectedChoice = choices.find((choice) => choice.key === requested) || choices[0] || null;
  const selectedTrend = selectedChoice?.type === "trend" ? trends.find((trend) => trend.id === selectedChoice.trendId) : null;
  const evidence = selectedTrend ? selectRelatedEvidence(rows, [selectedTrend.techId], snapshot.year) : scopeEvidence;
  const year = Number(snapshot.year);
  const inDomain = !!selectedTrend && Number.isFinite(year) && year >= selectedTrend.domain.start && year <= selectedTrend.domain.end;
  return {
    scope, trends, choices, selectedChoice, selectedTrend, bank, evidence,
    description: selectedTrend?.summary || "",
    sources: selectedTrend?.sources || [],
    currentYear: { year: snapshot.year, inDomain, value: inDomain ? valueAtYear(selectedTrend, year) : null, domain: selectedTrend?.domain || null },
    status: snapshot.status || null,
  };
}

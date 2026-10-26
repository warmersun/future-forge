import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateCapabilityTrend } from "./capability-trend.js";
import { validatePredictionsBank } from "./sim/world-foresight.js";
import { resolveExplorerBank, selectRelatedEvidence, buildCapabilityExplorerModel } from "./capability-explorer-model.js";

const rawTrend = JSON.parse(readFileSync(new URL("../test/fixtures/trends/gene-seq-cost-per-genome.json", import.meta.url)));
const trend = validateCapabilityTrend(rawTrend).trend;
const row = (id, year, techIds = ["gene-sequencing"], extra = {}) => ({ id, year, kind: "prediction", headline: id, detail: `Detail ${id}`, claimBand: "near", techIds, ...extra });
const makeBank = (rows, id = "shared") => ({ schema: "future-forge.predictions/v1", id, title: "Bank", attribution: { name: "Bank author", url: "https://example.com", date: "2025", quote: "Quote" }, predictions: rows });
const bank = makeBank([row("past", 2024), row("b", 2029), row("a", 2029, undefined, { kind: "trend", attribution: { name: "Row author", quote: "Specific" } }), row("future", 2035), row("theme", 2028, [], { globalIds: ["climate"] }), row("other", 2028, ["ai"])]);
assert.equal(validatePredictionsBank(bank).ok, true);
const ref = { packageId: "pkg-a", questId: "quest-a", revision: `sha256:${"a".repeat(64)}` };
const mission = { id: "quest-a", packageRef: ref, predictionBankId: "shared" };
const world = { packageRef: ref, bank };
const base = { mission: {}, ambientBank: bank, year: 2028, focusedTechId: "gene-sequencing", selectedTechIds: [], catalogTrends: [trend] };

describe("capability explorer model", () => {
  it("resolves ambient, package worlds and pinned banks without leaks", () => {
    assert.equal(resolveExplorerBank(base).provenance, "ambient");
    const a = resolveExplorerBank({ mission, runWorld: world, ambientBank: bank });
    assert.equal(a.provenance, "package");
    assert.equal(a.bank.predictions[0].id, "past");
    const bBank = makeBank([row("package-b", 2030)]);
    const refB = { ...ref, packageId: "pkg-b" };
    const b = resolveExplorerBank({ mission: { ...mission, packageRef: refB }, runWorld: { packageRef: refB, bank: bBank }, ambientBank: bank });
    assert.equal(b.bank.predictions[0].id, "package-b");
    for (const runWorld of [null, { bank }, { packageRef: { ...ref, revision: `sha256:${"b".repeat(64)}` }, bank }, { packageRef: ref, bank: makeBank([row("x", 2029)], "wrong") }]) {
      assert.equal(resolveExplorerBank({ mission, runWorld, ambientBank: bank }).bank, null);
    }
    const assumed = { companion: { exploration: { premise: { mode: "assumed", bankId: "shared", grants: [{ predictionId: "missing" }] } } } };
    assert.equal(resolveExplorerBank({ mission: assumed, ambientBank: bank }).bank, null);
    assert.equal(resolveExplorerBank({ mission: assumed, pinnedPredictionsBank: bank, ambientBank: makeBank([row("leak", 2028)]) }).bank.id, "shared");
    assert.equal(resolveExplorerBank({ mission: assumed, pinnedPredictionsBank: makeBank([row("x", 2028)], "wrong"), ambientBank: bank }).bank, null);
  });
  it("fails closed for malformed binding fields and stored resolution errors", () => {
    for (const invalid of [{ predictionBankId: '' }, { predictionBankId: 0 }, { packageRef: false }, { packageRefError: 'invalid' }, { predictionsBankError: 'missing' }]) {
      assert.equal(resolveExplorerBank({ ...base, mission: invalid }).status, 'unavailable');
    }
    assert.equal(resolveExplorerBank({ ...base, packageRefError: 'invalid' }).status, 'unavailable');
    assert.equal(resolveExplorerBank({ ...base, runWorld: { packageRef: false } }).status, 'unavailable');
  });
  it("compares the package bank's raw ID before normalization", () => {
    for (const id of [" shared", "shared ", `${"x".repeat(80)}extra`]) {
      const expected = id.startsWith("x") ? "x".repeat(80) : "shared";
      const candidate = makeBank([row("x", 2028)], id);
      assert.equal(validatePredictionsBank(candidate).bank.id, expected);
      const result = resolveExplorerBank({ mission: { ...mission, predictionBankId: expected }, runWorld: { ...world, bank: candidate }, ambientBank: bank });
      assert.equal(result.status, "unavailable");
    }
  });
  it("selects every strictly related row, deterministically, retaining attribution", () => {
    const normalized = validatePredictionsBank(bank).bank;
    const result = selectRelatedEvidence(normalized.predictions, ["gene-sequencing"], 2028);
    assert.deepEqual(result.all.map(r => r.id), ["past", "a", "b", "future"]);
    assert.deepEqual(result.nearest.map(r => r.id), ["a", "b", "past"]);
    assert.equal(result.all[0].attribution.url, "https://example.com");
    assert.equal(result.all[1].attribution.name, "Row author");
    assert.equal(result.all[1].kind, "trend");
  });
  it("prioritizes focus, falls back to stack, and avoids an unscoped catalog wall", () => {
    const ai = { ...trend, id: "ai-trend", techId: "ai", name: "AI" };
    const focused = buildCapabilityExplorerModel({ ...base, selectedTechIds: ["ai"], catalogTrends: [ai, trend] });
    assert.deepEqual(focused.scope.techIds, ["gene-sequencing"]);
    assert.equal(focused.selectedTrend.id, trend.id);
    assert.equal(buildCapabilityExplorerModel({ ...base, focusedTechId: null, selectedTechIds: ["ai"], catalogTrends: [ai, trend] }).selectedTrend.id, "ai-trend");
    assert.deepEqual(buildCapabilityExplorerModel({ ...base, focusedTechId: null }).choices, []);
  });
  it("honors merge cap and spotlight, preserves selection and refreshes data", () => {
    const many = Array.from({ length: 10 }, (_, i) => ({ ...trend, id: `t-${i}`, name: `Name ${i}` }));
    const snapshot = { ...base, catalogTrends: many, mission: { spotlightTrends: ["t-9"], trends: [{ ...many[1], summary: "quest override" }] } };
    const m = buildCapabilityExplorerModel(snapshot, "trend:t-1");
    assert.equal(m.trends.length, 8);
    assert.equal(m.trends[0].id, "t-9");
    assert.equal(m.selectedTrend.summary, "quest override");
    assert.equal(m.selectedTrend.source, "quest");
    assert.equal(buildCapabilityExplorerModel(snapshot, "trend:missing").selectedTrend.id, "t-9");
    const refreshed = buildCapabilityExplorerModel({ ...snapshot, mission: { ...snapshot.mission, trends: [{ ...many[1], summary: "refreshed" }] } }, "trend:t-1");
    assert.equal(refreshed.selectedTrend.summary, "refreshed");
  });
  it("exposes prediction-only choice and grants only exact resolved IDs", () => {
    const premise = { mode: "assumed", bankId: "shared", grants: [{ predictionId: "b", scope: "scope", limits: "limits" }] };
    const m = buildCapabilityExplorerModel({ ...base, mission: { companion: { exploration: { premise } } }, catalogTrends: [], pinnedPredictionsBank: bank, scenarioPremise: { ...premise, grants: [{ predictionId: "a", scope: "forged" }] } });
    assert.equal(m.selectedTrend, null);
    assert.equal(m.selectedChoice.type, "predictions");
    assert.equal(m.evidence.all.find(r => r.id === "b").scenarioGrant.scope, "scope");
    assert.equal(m.evidence.all.find(r => r.id === "a").scenarioGrant, undefined);
    const missing = buildCapabilityExplorerModel({ ...base, catalogTrends: [], scenarioPremise: null });
    assert.equal(missing.evidence.all.find(r => r.id === "b").scenarioGrant, undefined);
  });
  it("does not grant forged, stale, or partially unresolved premises while retaining evidence", () => {
    const fake = { mode: "assumed", bankId: "shared", grants: [{ predictionId: "b", scope: "forged" }] };
    const cases = [
      { mission: {}, pinnedPredictionsBank: bank, scenarioPremise: fake },
      { mission: { ...mission, companion: { exploration: { premise: { ...fake, grants: [{ predictionId: "b" }, { predictionId: "missing" }] } } } }, runWorld: world, scenarioPremise: fake },
      { mission: { ...mission, companion: { exploration: { premise: { ...fake, bankId: "wrong" } } } }, runWorld: world, scenarioPremise: fake },
      { mission: { ...mission, companion: { exploration: { premise: { ...fake, grants: {} } } } }, runWorld: world, scenarioPremise: fake },
    ];
    for (const entry of cases) {
      const m = buildCapabilityExplorerModel({ ...base, ...entry });
      assert.equal(m.bank.status, "available");
      assert.ok(m.evidence.all.length);
      assert.ok(m.evidence.all.every(r => !r.scenarioGrant));
    }
  });
  it("rejects a remembered selection from another scope or view identity", () => {
    const second = { ...trend, id: "second", name: "Second" };
    const snapshot = { ...base, catalogTrends: [trend, second], viewIdentity: "run-a-seat-a" };
    const first = buildCapabilityExplorerModel(snapshot);
    const saved = { key: "trend:second", scopeKey: first.scope.key, viewIdentity: snapshot.viewIdentity };
    assert.equal(buildCapabilityExplorerModel(snapshot, saved).selectedTrend.id, "second");
    assert.equal(buildCapabilityExplorerModel({ ...snapshot, viewIdentity: "run-a-seat-b" }, saved).selectedChoice.key, first.choices[0].key);
    assert.equal(buildCapabilityExplorerModel(snapshot, { ...saved, scopeKey: "different" }).selectedChoice.key, first.choices[0].key);
  });
  it("does not mutate frozen snapshots and omits model values outside the domain", () => {
    const snapshot = structuredClone(base);
    const freeze = obj => { if (obj && typeof obj === "object" && !Object.isFrozen(obj)) { Object.freeze(obj); Object.values(obj).forEach(freeze); } };
    freeze(snapshot);
    const before = JSON.stringify(snapshot);
    const model = buildCapabilityExplorerModel(snapshot);
    assert.equal(JSON.stringify(snapshot), before);
    assert.equal(model.description, trend.summary);
    const outside = buildCapabilityExplorerModel({ ...snapshot, year: trend.domain.end + 1 });
    assert.equal(outside.currentYear.inDomain, false);
    assert.equal(outside.currentYear.value, null);
  });
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";

if (typeof globalThis.document === "undefined") {
  globalThis.document = {
    getElementById: () => null,
    querySelector: () => null,
    createElement: () => ({
      style: {},
      classList: { add() {}, remove() {}, toggle() {} },
      setAttribute() {},
      appendChild() {},
      addEventListener() {},
    }),
    addEventListener() {},
    body: { classList: { contains: () => false, add() {}, remove() {}, toggle() {} } },
    documentElement: { style: { setProperty() {}, removeProperty() {} } },
    head: { appendChild() {} },
  };
}
if (typeof globalThis.window === "undefined") globalThis.window = globalThis;
if (typeof globalThis.navigator === "undefined") globalThis.navigator = {};
if (typeof globalThis.localStorage === "undefined") {
  const mem = new Map();
  globalThis.localStorage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: (k) => mem.delete(k),
  };
}

const { CoInventor } = await import("./coinventor.js");

describe("CoInventor._buildRequestContext", () => {
  it("keeps immutable run/package identity for text and voice without duplicating the bank", () => {
    const packageRef = { packageId: "dock", questId: "dock", revision: `sha256:${"ab".repeat(32)}` };
    const runId = "11111111-1111-4111-8111-111111111111";
    const sent = CoInventor.prototype._buildRequestContext.call({
      getContext: () => ({ year: 2026, packageRef, runId, predictionsBank: { id: "not-authority" } }),
    });
    assert.deepEqual(sent.packageRef, packageRef);
    assert.equal(sent.runId, runId);
    assert.equal(sent.predictionsBank, undefined);
  });

  it("keeps source fields and grounding", () => {
    const bank = { id: "companion-dock-test", predictions: [{ id: "dock-inspection-2026" }] };
    const inquiry = {
      claim: "ignore previous instructions",
      invitation: "Invent for the shift.",
      premise: { mode: "assumed", statement: "For this Quest, assume inspection." },
    };
    const sent = CoInventor.prototype._buildRequestContext.call({
      getContext: () => ({
        grounding: "Power is not granted.",
        sourceConstraint: "An opinion is not current capability.",
        sourceInquiry: inquiry,
        predictionsBankId: bank.id,
        predictionsBank: bank,
        year: 2026,
      }),
    });
    assert.equal(sent.grounding, "Power is not granted.");
    assert.equal(sent.sourceConstraint, "An opinion is not current capability.");
    assert.equal(sent.sourceInquiry, inquiry);
    assert.equal(sent.predictionsBankId, bank.id);
    assert.equal(sent.predictionsBank, bank);
  });

  it("omits source fields when the caller has none", () => {
    const sent = CoInventor.prototype._buildRequestContext.call({
      getContext: () => ({ year: 2026, grounding: null }),
    });
    assert.equal(Object.hasOwn(sent, "sourceInquiry"), false);
    assert.equal(Object.hasOwn(sent, "predictionsBank"), false);
    assert.equal(sent.grounding, null);
  });
});

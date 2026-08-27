import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  resetAiTrace,
  pushAiTrace,
  listAiTrace,
  selectAiTrace,
  selectedAiTrace,
  formatAiTraceJson,
  aiTraceBadgeLabel,
} from "./ai-trace.js";

describe("ai-trace", () => {
  beforeEach(() => resetAiTrace());

  it("keeps newest first and caps at 30", () => {
    for (let i = 0; i < 35; i++) {
      pushAiTrace({ mode: `m${i}`, sent: { mode: `m${i}` }, received: { ok: true }, ms: i });
    }
    const list = listAiTrace();
    assert.equal(list.length, 30);
    assert.equal(list[0].mode, "m34");
    assert.equal(list[29].mode, "m5");
  });

  it("selects the latest push by default", () => {
    pushAiTrace({ mode: "pose-challenge", received: { source: "local" } });
    const last = pushAiTrace({ mode: "score-pathway", received: { source: "xai" } });
    assert.equal(selectedAiTrace()?.id, last.id);
    assert.equal(aiTraceBadgeLabel(last), "score-pathway");
  });

  it("records errors and cancelled without counting as ok", () => {
    const err = pushAiTrace({ mode: "score-pathway", error: "boom", ok: false });
    assert.equal(err.ok, false);
    assert.equal(aiTraceBadgeLabel(err), "score-pathway · error");
    const cancel = pushAiTrace({ mode: "score-pathway", cancelled: true });
    assert.equal(cancel.ok, false);
    assert.equal(aiTraceBadgeLabel(cancel), "score-pathway · cancelled");
  });

  it("selectAiTrace picks an older row", () => {
    const first = pushAiTrace({ mode: "pose-challenge" });
    pushAiTrace({ mode: "score-pathway" });
    selectAiTrace(first.id);
    assert.equal(selectedAiTrace()?.mode, "pose-challenge");
  });

  it("formatAiTraceJson pretty-prints", () => {
    assert.match(formatAiTraceJson({ a: 1 }), /"a": 1/);
  });
});

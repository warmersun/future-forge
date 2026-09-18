import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  resetAiTrace,
  pushAiTrace,
  listAiTrace,
  selectAiTrace,
  selectedAiTrace,
  formatAiTraceJson,
  aiTraceBadgeLabel,
  summarizeAiTracePayload,
  aiTraceKind,
  setAiTraceFilter,
  aiTraceFilter,
  aiTraceFilterCounts,
  pushAiTraceWithTypesafe,
  formatModelRequestPlain,
} from "./ai-trace.js";

const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGaAYjQ9wAAAABJRU5ErkJggg==";

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

  it("defaults kind to text and leaves previewUrl empty", () => {
    const e = pushAiTrace({ mode: "pose-challenge", received: { ok: true } });
    assert.equal(e.kind, "text");
    assert.equal(e.previewUrl, null);
    assert.equal(aiTraceKind({ mode: "score-pathway" }), "text");
  });

  it("treats vision and idea-image as image kind", () => {
    assert.equal(aiTraceKind({ mode: "vision" }), "image");
    assert.equal(aiTraceKind({ mode: "idea-image" }), "image");
    assert.equal(aiTraceKind({ kind: "image", mode: "other" }), "image");
  });

  it("summarizes data:image URLs and does not keep the raw bytes", () => {
    const fat = `${TINY_PNG}${"A".repeat(80)}`;
    const stub = summarizeAiTracePayload({ imageUrl: fat, prompt: "hello" });
    assert.match(String(stub.imageUrl), /chars\)/);
    assert.equal(stub.prompt, "hello");
    assert.ok(!String(stub.imageUrl).includes("AAAA"));
    const e = pushAiTrace({
      kind: "image",
      mode: "vision",
      source: "live",
      received: { ok: true, imageUrl: fat, prompt: "a place" },
    });
    assert.equal(e.kind, "image");
    assert.match(String(e.received.imageUrl), /chars\)/);
    assert.ok(!JSON.stringify(e.received).includes("iVBORw0KGgo"));
    assert.equal(e.received.prompt, "a place");
    assert.equal(aiTraceBadgeLabel(e), "vision · live");
  });

  it("badges cache and error image rows", () => {
    const cached = pushAiTrace({
      kind: "image",
      mode: "vision",
      source: "cache",
      received: { ok: true, cached: true },
    });
    assert.equal(aiTraceBadgeLabel(cached), "vision · cache");
    const err = pushAiTrace({
      kind: "image",
      mode: "idea-image",
      source: "error",
      error: "boom",
      ok: false,
    });
    assert.equal(aiTraceBadgeLabel(err), "idea-image · error");
  });

  it("filters All / Text / Images and falls back selection", () => {
    pushAiTrace({ mode: "pose-challenge" });
    const img = pushAiTrace({ kind: "image", mode: "vision", source: "live" });
    assert.equal(aiTraceFilter(), "all");
    assert.equal(aiTraceFilterCounts().all, 2);
    assert.equal(aiTraceFilterCounts().text, 1);
    assert.equal(aiTraceFilterCounts().image, 1);
    assert.equal(listAiTrace().length, 2);

    setAiTraceFilter("text");
    assert.equal(aiTraceFilter(), "text");
    assert.equal(listAiTrace().length, 1);
    assert.equal(listAiTrace()[0].mode, "pose-challenge");
    assert.equal(selectedAiTrace()?.mode, "pose-challenge");
    assert.equal(listAiTrace({ filter: "all" }).length, 2);

    setAiTraceFilter("image");
    assert.equal(listAiTrace().length, 1);
    assert.equal(selectedAiTrace()?.id, img.id);

    setAiTraceFilter("all");
    assert.equal(listAiTrace().length, 2);
  });

  it("splits a TypeSafe overlay into a Jev row and keeps Grok as Text", () => {
    pushAiTraceWithTypesafe({
      mode: "score-pathway",
      sent: { mode: "score-pathway" },
      received: {
        source: "ai",
        crisisDelta: { local: -1 },
        typesafeTrace: {
          model: "jev-1.13.0",
          usage: { input_tokens: 10, output_tokens: 0 },
          answers: { flags: { purePolicy: false } },
          state: { pathway: { howText: "Sensors page the crew." } },
        },
      },
      ms: 800,
      ok: true,
    });
    const counts = aiTraceFilterCounts();
    assert.equal(counts.all, 2);
    assert.equal(counts.text, 1);
    assert.equal(counts.jev, 1);
    assert.equal(counts.image, 0);
    const text = listAiTrace({ filter: "text" })[0];
    assert.equal(text.kind, "text");
    assert.equal(text.received.typesafeTrace, undefined);
    assert.equal(text.received.crisisDelta.local, -1);
    const jev = listAiTrace({ filter: "jev" })[0];
    assert.equal(jev.kind, "jev");
    assert.equal(jev.source, "typesafe");
    assert.equal(jev.received.model, "jev-1.13.0");
    assert.equal(jev.received.answers.flags.purePolicy, false);
    assert.equal(aiTraceBadgeLabel(jev), "score-pathway · jev");
    assert.equal(aiTraceKind({ source: "typesafe", mode: "chat" }), "jev");
    assert.equal(aiTraceKind({ mode: "tag-lobby-rule" }), "text");
    assert.equal(aiTraceKind({ mode: "tag-lobby-rule", source: "typesafe" }), "jev");
  });

  it("records a local lobby tag as Text, not Jev", () => {
    pushAiTraceWithTypesafe({
      mode: "tag-lobby-rule",
      sent: { mode: "tag-lobby-rule" },
      received: { source: "local", kind: "policy", effects: [] },
      ok: true,
    });
    assert.equal(aiTraceFilterCounts().jev, 0);
    assert.equal(aiTraceFilterCounts().text, 1);
    const row = listAiTrace({ filter: "text" })[0];
    assert.equal(row.kind, "text");
    assert.equal(row.source, "local");
  });

  it("records a lobby tag with typesafeTrace as Jev-only", () => {
    pushAiTraceWithTypesafe({
      mode: "tag-lobby-rule",
      sent: { mode: "tag-lobby-rule" },
      received: {
        source: "typesafe",
        kind: "policy",
        effects: ["backlash"],
        typesafeTrace: {
          model: "jev-1.13.0",
          usage: { input_tokens: 4, output_tokens: 0 },
          answers: { kind: "policy" },
        },
      },
      ok: true,
    });
    assert.equal(aiTraceFilterCounts().jev, 1);
    assert.equal(aiTraceFilterCounts().text, 0);
    const jev = listAiTrace({ filter: "jev" })[0];
    assert.equal(jev.source, "typesafe");
    assert.equal(jev.received.model, "jev-1.13.0");
  });

  it("shows a TypeSafe overlay failure as a Jev error row", () => {
    pushAiTraceWithTypesafe({
      mode: "score-pathway",
      sent: { mode: "score-pathway" },
      received: {
        source: "ai",
        crisisDelta: { local: 0 },
        typesafeError: { message: "timeout", mode: "score-pathway" },
      },
      ok: true,
    });
    const counts = aiTraceFilterCounts();
    assert.equal(counts.text, 1);
    assert.equal(counts.jev, 1);
    const text = listAiTrace({ filter: "text" })[0];
    assert.equal(text.received.typesafeError, undefined);
    assert.equal(text.ok, true);
    const jev = listAiTrace({ filter: "jev" })[0];
    assert.equal(jev.ok, false);
    assert.equal(jev.error, "timeout");
    assert.equal(jev.source, "typesafe");
  });

  it("keeps a split Grok modelRequest on the Text row", () => {
    pushAiTraceWithTypesafe({
      mode: "score-pathway",
      sent: { mode: "score-pathway" },
      received: {
        source: "ai",
        crisisDelta: { local: 0 },
        modelRequest: {
          model: "grok-4.6",
          system: "You score ONE pathway.",
          userPrefix: "Score this pathway (JSON state):",
          payload: { year: 2026 },
          userSuffix: "JSON only.",
        },
      },
      ok: true,
    });
    const text = listAiTrace({ filter: "text" })[0];
    assert.equal(text.received.modelRequest, undefined);
    assert.equal(text.modelRequest.system, "You score ONE pathway.");
    assert.equal(text.modelRequest.payload.year, 2026);
    assert.match(formatModelRequestPlain(text.modelRequest), /JSON only/);
    assert.match(formatModelRequestPlain(text.modelRequest), /You score ONE pathway/);
  });

  it("shows Imagine prompt wrapping vs HTTP payload on image rows", () => {
    pushAiTraceWithTypesafe({
      kind: "image",
      mode: "vision",
      sent: { place: "Khetpur Flats", year: 2026 },
      received: {
        ok: true,
        model: "grok-imagine-image",
        prompt: "Photorealistic documentary still…",
        modelRequest: {
          model: "grok-imagine-image",
          system: "Photorealistic documentary still, 16:9, single frame.",
          payload: { happening: "Meena at window three.", place: "Khetpur Flats" },
        },
      },
      source: "live",
      ok: true,
    });
    const img = listAiTrace({ filter: "image" })[0];
    assert.equal(img.kind, "image");
    assert.match(img.modelRequest.system, /Photorealistic documentary still/);
    assert.equal(img.modelRequest.payload.place, "Khetpur Flats");
    assert.equal(img.received.modelRequest, undefined);
  });

  it("does not steal selection when a hidden kind arrives", () => {
    const text = pushAiTrace({ mode: "score-pathway" });
    setAiTraceFilter("text");
    pushAiTrace({ kind: "image", mode: "vision", source: "live" });
    assert.equal(selectedAiTrace()?.id, text.id);
    assert.equal(listAiTrace().length, 1);
  });

  it("resetAiTrace clears entries and filter", () => {
    pushAiTrace({ mode: "pose-challenge" });
    setAiTraceFilter("text");
    resetAiTrace();
    assert.equal(listAiTrace().length, 0);
    assert.equal(aiTraceFilter(), "all");
    assert.equal(selectedAiTrace(), null);
  });
});

describe("ai-trace preview cap", () => {
  let origCreate;
  let origRevoke;
  /** @type {string[]} */
  let revoked;

  beforeEach(() => {
    resetAiTrace();
    revoked = [];
    origCreate = URL.createObjectURL;
    origRevoke = URL.revokeObjectURL;
    let n = 0;
    URL.createObjectURL = () => `blob:mock-${++n}`;
    URL.revokeObjectURL = (u) => {
      revoked.push(u);
    };
  });

  afterEach(() => {
    resetAiTrace();
    if (origCreate) URL.createObjectURL = origCreate;
    else delete URL.createObjectURL;
    if (origRevoke) URL.revokeObjectURL = origRevoke;
    else delete URL.revokeObjectURL;
  });

  it("keeps at most 6 image previews and revokes the rest", () => {
    for (let i = 0; i < 7; i++) {
      pushAiTrace({
        kind: "image",
        mode: "vision",
        source: "live",
        received: { ok: true, imageUrl: TINY_PNG },
      });
    }
    const imgs = listAiTrace({ filter: "image" });
    assert.equal(imgs.length, 7);
    const withPreview = imgs.filter((e) => e.previewUrl);
    assert.equal(withPreview.length, 6);
    assert.equal(imgs[6].previewUrl, null);
    assert.ok(revoked.includes("blob:mock-1"));
  });
});

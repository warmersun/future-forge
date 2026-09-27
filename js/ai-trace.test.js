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
  aiTraceDetailBlocks,
  aiTraceCopyText,
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

  it("keeps the model prompt off the parsed result", () => {
    const system = "Role:\nStay local. Do not stub this.";
    const e = pushAiTrace({
      mode: "chat",
      sent: { mode: "chat", context: { year: 2026 } },
      received: {
        source: "ai",
        message: "ok",
        imageUrl: TINY_PNG,
        llm: {
          kind: "text",
          system,
          user: "Co-invention session state and conversation (JSON):\n{}\n\nRespond.",
          rawOutput: '{"message":"full"}',
          sections: [{ id: "role", label: "Role", tone: "role", part: "system", text: system }],
        },
      },
    });
    assert.equal(e.llm.system, system);
    assert.equal(e.llm.rawOutput, '{"message":"full"}');
    assert.equal(e.received.llm, undefined);
    assert.equal(e.received.message, "ok");
    assert.match(e.received.imageUrl, /chars\)/);
    assert.match(aiTraceDetailBlocks(e), /Role/);
    assert.match(aiTraceDetailBlocks(e), /ai-trace-sec-role/);
    assert.match(aiTraceDetailBlocks(e), /Response/);
    assert.match(aiTraceCopyText(e, "request"), /Stay local/);
    assert.equal(aiTraceCopyText(e, "response"), '{"message":"full"}');
    assert.equal(aiTraceCopyText(e, "section", "main:0:role"), system);
    assert.doesNotMatch(aiTraceCopyText(e, "returned"), /Stay local/);
  });

  it("indents the session-state JSON payload", () => {
    const compact = '{"mode":"idea-sparks","year":2026}';
    const entry = {
      mode: "idea-sparks",
      sent: { mode: "idea-sparks" },
      received: { source: "ai" },
      llm: {
        kind: "text",
        sent: true,
        system: "Score sparks.",
        user: `Three application sparks (JSON state):\n${compact}\n\nJSON only.`,
        rawOutput: "{}",
        sections: [
          {
            id: "preamble",
            label: "Task",
            tone: "preamble",
            part: "user",
            text: "Three application sparks (JSON state):\n",
          },
          {
            id: "state",
            label: "Session state",
            tone: "state",
            part: "user",
            text: compact,
          },
        ],
      },
    };
    const html = aiTraceDetailBlocks(entry);
    assert.match(html, /ai-trace-sec-state" open/);
    assert.match(html, /Parsed result/);
    assert.match(html, /<details class="ai-trace-sec ai-trace-sec-folded" open>/);
    assert.doesNotMatch(html, /ai-trace-sec-preamble" open/);
    assert.doesNotMatch(html, /ai-trace-sec-meta" open/);
    assert.match(html, /&quot;mode&quot;: &quot;idea-sparks&quot;/);
    assert.match(html, /\n  &quot;year&quot;: 2026/);
    assert.equal(
      aiTraceCopyText(entry, "section", "main:1:state"),
      '{\n  "mode": "idea-sparks",\n  "year": 2026\n}'
    );
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

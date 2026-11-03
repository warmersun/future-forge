import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  appendThoughts,
  createSseParser,
  mergeThoughtState,
  readCoInventResponse,
  reasoningDisclosureLabel,
  settledThoughts,
  streamStatusLabel,
} from "./coinventor-stream.js";

function sseResponse(chunks, { json = false, status = 200, ok = true } = {}) {
  let i = 0;
  return {
    status,
    ok,
    headers: { get: () => (json ? "application/json" : "text/event-stream") },
    async json() {
      return JSON.parse(chunks.join(""));
    },
    body: {
      getReader() {
        return {
          async read() {
            if (i >= chunks.length) return { done: true, value: undefined };
            const value = new TextEncoder().encode(chunks[i]);
            i += 1;
            return { done: false, value };
          },
          async cancel() {},
        };
      },
    },
  };
}

describe("browser co-invent stream", () => {
  it("uses the status copy and keeps one JSON body when the server did not stream", async () => {
    assert.equal(streamStatusLabel("thinking"), "Thinking through your question…");
    assert.equal(streamStatusLabel("answering"), "Answering…");
    assert.equal(streamStatusLabel("finalizing"), "Finishing suggestions…");
    const read = await readCoInventResponse(
      sseResponse(['{"message":"kept","error":"sign_in_required"}'], { json: true, ok: false, status: 401 }),
      {}
    );
    assert.equal(read.kind, "json");
    assert.equal(read.data.message, "kept");
    assert.equal(read.data.error, "sign_in_required");
  });

  it("parses split frames, ignores comments, and returns one result", async () => {
    const events = [];
    const frame1 = 'event: message_delta\ndata: {"v":1,"seq":1,"text":"Hel"}\n\n';
    const frame2 = ': keepalive\n\nevent: message_delta\ndata: {"v":1,"seq":2,"text":"lo"}\n\n';
    const frame3 = 'event: result\ndata: {"v":1,"seq":3,"result":{"message":"Hello"}}\n\n';
    const read = await readCoInventResponse(
      sseResponse([frame1.slice(0, 12), frame1.slice(12) + frame2, frame3]),
      { onEvent: (ev) => events.push(ev) }
    );
    assert.equal(read.kind, "stream");
    assert.equal(read.data.message, "Hello");
    assert.equal(events.filter((ev) => ev.event === "message_delta").map((ev) => ev.text).join(""), "Hello");
  });

  it("splits reasoning into thoughts and keeps earlier ones", () => {
    assert.deepEqual(appendThoughts([], "Weighing the gate"), ["Weighing the gate"]);
    assert.deepEqual(appendThoughts(["Weighing the gate"], ". The stack"), ["Weighing the gate.", "The stack"]);
    assert.deepEqual(appendThoughts(["First thought"], "\n\n continues"), ["First thought", "continues"]);
    assert.deepEqual(appendThoughts(["3.14 meters"], " is far"), ["3.14 meters is far"]);
    const merged = mergeThoughtState(
      [{ text: "Weighing the gate.", open: true, pinned: false }],
      ["Weighing the gate.", "The stack"],
      "thinking"
    );
    assert.equal(merged[0].open, false);
    assert.equal(merged[1].open, true);
    const pinned = mergeThoughtState(
      [{ text: "Weighing the gate.", open: true, pinned: true }, { text: "The stack", open: true, pinned: false }],
      ["Weighing the gate.", "The stack"],
      "answering"
    );
    assert.equal(pinned[0].open, true);
    assert.equal(pinned[1].open, false);
    assert.deepEqual(settledThoughts(merged), [
      { text: "Weighing the gate.", open: false, pinned: false },
      { text: "The stack", open: false, pinned: false },
    ]);
  });

  it("names the reasoning disclosure", () => {
    assert.equal(reasoningDisclosureLabel({ status: "thinking", thoughtMs: null }), "Thinking");
    assert.equal(reasoningDisclosureLabel({ status: "answering", thoughtMs: null }), "Thought");
    assert.equal(reasoningDisclosureLabel({ status: "answering", thoughtMs: 400 }), "Thought for 1s");
    assert.equal(reasoningDisclosureLabel({ status: "finalizing", thoughtMs: 12400 }), "Thought for 12s");
  });

  it("rejects a sequence gap without a second request", async () => {
    const parser = createSseParser();
    parser.push('event: message_delta\ndata: {"seq":1,"text":"a"}\n\n');
    assert.throws(
      () => parser.push('event: message_delta\ndata: {"seq":3,"text":"c"}\n\n'),
      (err) => err.code === "sequence"
    );
  });
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  coInventStreamRequested,
  coInventStreamHealth,
  createCoInventSse,
  safeStreamError,
  isConversationalStreamMode,
} from "./coinvent-stream.mjs";
import { readResponsesStream, streamCreateOpts, REASONING_PREVIEW_CAP } from "./coinvent-provider.mjs";
import { readCoInventProviderStream } from "./coinvent-turn.mjs";
import { publicCoInventResult } from "./coinvent-output.mjs";

function fakeRes() {
  const chunks = [];
  const listeners = {};
  return {
    chunks,
    status: 0,
    headers: null,
    writableEnded: false,
    writeHead(status, headers) {
      this.status = status;
      this.headers = headers;
    },
    write(frame, cb) {
      chunks.push(String(frame));
      cb?.();
      return true;
    },
    end() {
      this.writableEnded = true;
    },
    on(name, fn) {
      listeners[name] = fn;
    },
    once(name, fn) {
      listeners[name] = fn;
    },
    emit(name) {
      listeners[name]?.();
    },
  };
}

function frames(res) {
  return res.chunks.join("");
}

describe("co-invent stream negotiation", () => {
  it("stays off unless the flag and Accept header and mode agree", () => {
    const env = { FF_CO_INVENT_STREAM: "1" };
    assert.equal(
      coInventStreamRequested({ headers: { accept: "text/event-stream" } }, "chat", env),
      true
    );
    assert.equal(
      coInventStreamRequested({ headers: { accept: "application/json" } }, "chat", env),
      false
    );
    assert.equal(
      coInventStreamRequested({ headers: { accept: "text/event-stream" } }, "score-pathway", env),
      false
    );
    assert.equal(
      coInventStreamRequested({ headers: { accept: "text/event-stream" } }, "chat", {}),
      false
    );
    assert.equal(isConversationalStreamMode("draft-how"), true);
    const health = coInventStreamHealth({});
    assert.equal(health.coInventStream, false);
  });

  it("writes start, deltas, one result, and ignores a second terminal", () => {
    const res = fakeRes();
    const sse = createCoInventSse(res, { requestId: "r1", mode: "chat", heartbeatMs: 0 });
    sse.open();
    sse.start();
    sse.status("thinking");
    sse.messageDelta("Hello");
    sse.status("answering");
    sse.result(publicCoInventResult({ message: "Hello there.", _quotaTokens: { inputTokens: 9 } }));
    sse.messageDelta("nope");
    sse.error({ code: "malformed_output" });
    const body = frames(res);
    assert.match(res.headers["Content-Type"], /text\/event-stream/);
    assert.equal(res.headers["Content-Length"], undefined);
    assert.match(body, /event: start/);
    assert.match(body, /event: message_delta/);
    assert.match(body, /Hello/);
    assert.match(body, /event: result/);
    assert.equal(body.includes("_quotaTokens"), false);
    assert.equal((body.match(/event: result/g) || []).length, 1);
    assert.equal(body.includes("event: error"), false);
    assert.equal(res.writableEnded, true);
  });

  it("errors before a result stay a single terminal event", () => {
    const res = fakeRes();
    const sse = createCoInventSse(res, { requestId: "r2", mode: "chat", heartbeatMs: 0 });
    sse.open();
    sse.error({ code: "provider_failed", message: "raw token sk-secret" });
    const body = frames(res);
    assert.match(body, /event: error/);
    assert.equal(body.includes("sk-secret"), false);
    assert.equal(safeStreamError("provider_failed").message.includes("snag"), true);
  });
});

describe("provider stream adapter", () => {
  it("forwards public deltas and keeps reasoning out of the answer", async () => {
    const deltas = [];
    const reasoning = [];
    const phases = [];
    async function* events() {
      yield { type: "response.reasoning_summary_text.delta", delta: "First thought", summary_index: 0 };
      yield { type: "response.reasoning_summary_text.done", text: "First thought", summary_index: 0 };
      yield { type: "response.reasoning_text.delta", delta: "duplicate raw trace" };
      yield { type: "response.reasoning_summary_text.delta", delta: " continues", summary_index: 1 };
      yield { type: "response.output_text.delta", delta: '{"message":"Hel', output_index: 0, item_id: "m1" };
      yield { type: "response.output_text.delta", delta: "lo", output_index: 0, item_id: "m1" };
      yield { type: "response.function_call_arguments.delta", delta: "{}" };
      yield { type: "response.output_text.delta", delta: " secret", output_index: 1, item_id: "other" };
      yield { type: "response.output_text.done", text: '{"message":"Hello"}', output_index: 0, item_id: "m1" };
      yield {
        type: "response.completed",
        response: {
          output_text: '{"message":"Hello","proposals":{}}',
          usage: { input_tokens: 4, output_tokens: 2, output_tokens_details: { reasoning_tokens: 7 } },
          status: "completed",
        },
      };
    }
    const read = await readResponsesStream(events(), {
      onDelta: (text) => deltas.push(text),
      onReasoning: (text) => reasoning.push(text),
      onPhase: (phase) => phases.push(phase),
    });
    assert.equal(deltas.join(""), "Hello");
    assert.equal(reasoning.join(""), "First thought\n\n continues");
    assert.equal(JSON.stringify(read).includes("duplicate raw trace"), false);
    assert.deepEqual(phases, ["answering", "finalizing"]);
    assert.equal(read.preview, "Hello");
    assert.equal(read.usage.input_tokens, 4);
    assert.equal(read.usage.output_tokens_details.reasoning_tokens, 7);
    assert.equal(read.assembled.includes("Hello"), true);
  });

  it("does not attach a JSON schema unless the probe flag is on", () => {
    const plain = streamCreateOpts({ model: "grok-4.7", temperature: 0.8 }, {});
    assert.equal(plain.stream, true);
    assert.equal(plain.text, undefined);
    assert.equal(plain.model, "grok-4.7");
    const forced = streamCreateOpts({ model: "grok-4.7" }, { FF_CO_INVENT_JSON_SCHEMA: "1" });
    assert.equal(forced.text.format.type, "json_schema");
    assert.equal(forced.text.format.schema.properties.message.type, "string");
  });

  it("stops the thinking preview at the cap and still reads the answer", async () => {
    const reasoning = [];
    async function* events() {
      yield { type: "response.reasoning_summary_text.delta", delta: "A".repeat(REASONING_PREVIEW_CAP + 50) };
      yield { type: "response.reasoning_summary_text.delta", delta: "more" };
      yield { type: "response.output_text.delta", delta: '{"message":"Done"}', output_index: 0, item_id: "m" };
      yield {
        type: "response.completed",
        response: { output_text: '{"message":"Done"}', status: "completed" },
      };
    }
    const read = await readResponsesStream(events(), {
      onReasoning: (text) => reasoning.push(text),
    });
    assert.equal(reasoning.join("").length, REASONING_PREVIEW_CAP);
    assert.equal(read.preview, "Done");
  });

  it("surfaces provider failure without treating a prefix as success", async () => {
    async function* events() {
      yield { type: "response.output_text.delta", delta: '{"message":"partial', output_index: 0, item_id: "m" };
      yield { type: "error", error: { message: "boom" } };
    }
    await assert.rejects(() => readResponsesStream(events(), {}), /provider_failed/);
  });
});

describe("provider accept and quota", () => {
  it("forwards reasoning deltas through the provider reader", async () => {
    const reasoning = [];
    async function* events() {
      yield { type: "response.reasoning_summary_text.delta", delta: "Weighing the gate", summary_index: 0 };
      yield { type: "response.output_text.delta", delta: '{"message":"Hi"}', output_index: 0, item_id: "m" };
      yield {
        type: "response.completed",
        response: { output_text: '{"message":"Hi"}', status: "completed" },
      };
    }
    const client = { responses: { create: async () => events() } };
    const read = await readCoInventProviderStream(client, { model: "grok-4.7" }, {
      onReasoning: (text) => reasoning.push(text),
    });
    assert.deepEqual(reasoning, ["Weighing the gate"]);
    assert.equal(read.preview, "Hi");
    assert.equal(JSON.stringify(read).includes("Weighing the gate"), false);
  });

  it("leaves quotaOutcome unset when create rejects before accept", async () => {
    let connected = false;
    const client = {
      responses: {
        create: async () => {
          const err = new Error("401 expired session");
          err.status = 401;
          throw err;
        },
      },
    };
    await assert.rejects(
      () => readCoInventProviderStream(client, { model: "grok-4.7" }, {
        onConnected: () => { connected = true; },
      }),
      (err) => {
        assert.match(err.message, /401 expired/);
        assert.equal(err.quotaOutcome, undefined);
        assert.equal(err.status, 401);
        return true;
      }
    );
    assert.equal(connected, false);
  });

  it("retains the hold when the stream fails after accept with no usage", async () => {
    let connected = false;
    async function* events() {
      yield { type: "error", error: { message: "boom" } };
    }
    const client = { responses: { create: async () => events() } };
    await assert.rejects(
      () => readCoInventProviderStream(client, { model: "grok-4.7" }, {
        onConnected: () => { connected = true; },
      }),
      (err) => {
        assert.equal(err.code, "provider_failed");
        assert.equal(err.quotaOutcome, "retain");
        assert.equal(err.quotaMeasure, undefined);
        return true;
      }
    );
    assert.equal(connected, true);
  });

  it("settles known usage when the stream fails after accept", async () => {
    async function* events() {
      yield {
        type: "response.completed",
        response: { usage: { input_tokens: 3, output_tokens: 1 }, status: "completed" },
      };
      yield { type: "error", error: { message: "boom" } };
    }
    const client = { responses: { create: async () => events() } };
    await assert.rejects(
      () => readCoInventProviderStream(client, { model: "grok-4.7" }, {}),
      (err) => {
        assert.equal(err.quotaOutcome, "settle");
        assert.deepEqual(err.quotaMeasure, { inputTokens: 3, outputTokens: 1 });
        return true;
      }
    );
  });
});

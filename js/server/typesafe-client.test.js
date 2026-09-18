/**
 * TypeSafe client env resolution — no network.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_TYPESAFE_MODEL,
  getTypeSafeClient,
  resolveTypeSafeApiKey,
  resolveTypeSafeModel,
  typesafeTraceOf,
  typesafeErrorOf,
  jsonSafeQuestions,
} from "./typesafe-client.mjs";

describe("resolveTypeSafeApiKey", () => {
  it("prefers FF_TYPESAFE_API_KEY over TYPESAFE_API_KEY", () => {
    assert.equal(resolveTypeSafeApiKey({}), "");
    assert.equal(resolveTypeSafeApiKey({ TYPESAFE_API_KEY: "  " }), "");
    assert.equal(
      resolveTypeSafeApiKey({ TYPESAFE_API_KEY: "ts-key" }),
      "ts-key"
    );
    assert.equal(
      resolveTypeSafeApiKey({
        FF_TYPESAFE_API_KEY: "ff-key",
        TYPESAFE_API_KEY: "ts-key",
      }),
      "ff-key"
    );
  });
});

describe("resolveTypeSafeModel", () => {
  it("defaults to jev-latest", () => {
    assert.equal(resolveTypeSafeModel({}), DEFAULT_TYPESAFE_MODEL);
    assert.equal(resolveTypeSafeModel({ FF_TYPESAFE_MODEL: "jev-1.13" }), "jev-1.13");
  });
});

describe("jsonSafeQuestions", () => {
  it("keeps type, instructions, and criteria", () => {
    const q = jsonSafeQuestions({
      timing: {
        type: "choice",
        instructions: { question: "Lamp?" },
        criteria: { green: { what: "ok" } },
        extraFn: () => {},
      },
    });
    assert.equal(q.timing.type, "choice");
    assert.equal(q.timing.instructions.question, "Lamp?");
    assert.equal(q.timing.criteria.green.what, "ok");
    assert.equal(q.timing.extraFn, undefined);
  });
});

describe("typesafeTraceOf", () => {
  it("builds a small inspect blob", () => {
    const t = typesafeTraceOf(
      { model: "jev-1.13.0", usage: { input_tokens: 3 } },
      { answers: { intent: "none" }, state: { userText: "hi" } }
    );
    assert.equal(t.model, "jev-1.13.0");
    assert.equal(t.answers.intent, "none");
    assert.equal(t.state.userText, "hi");
  });

  it("returns null when systemOne did not run", () => {
    assert.equal(
      typesafeTraceOf({ model: null, usage: null }, { answers: { intent: "none" } }),
      null
    );
    assert.equal(typesafeTraceOf(null, { answers: {} }), null);
  });
});

describe("typesafeErrorOf", () => {
  it("keeps a short message and mode", () => {
    const e = typesafeErrorOf(new Error("timeout"), "chat");
    assert.equal(e.message, "timeout");
    assert.equal(e.mode, "chat");
  });
});

describe("getTypeSafeClient", () => {
  it("returns null without a key", () => {
    assert.equal(getTypeSafeClient({ env: {}, apiKey: "" }), null);
    assert.equal(getTypeSafeClient({ env: { TYPESAFE_API_KEY: "" } }), null);
  });

  it("constructs a client when a key is passed", () => {
    const client = getTypeSafeClient({
      env: {},
      apiKey: "test-key",
      model: "jev-latest",
    });
    assert.ok(client);
    assert.equal(client.defaultModel, "jev-latest");
  });
});

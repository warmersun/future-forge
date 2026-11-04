/*
Copyright © 2026 Warmer Sun Education, a sole proprietorship by Tamas Simon

This file is part of Future Forge.

Future Forge is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Future Forge is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Future Forge. If not, see <https://www.gnu.org/licenses/>.
*/

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createMessageDecoder,
  jsonHasDuplicateKeys,
  parseModelJson,
  publicCoInventResult,
  reconcilePreview,
  PUBLIC_MESSAGE_CAP,
} from "./coinvent-output.mjs";

const SAMPLE = {
  message: "A seawall can grow with the tide.",
  proposals: {
    addTechIds: ["kelp"],
    removeTechIds: [],
    inventionName: null,
    inventionHow: "Kelp baffles the surge.",
    inventionImpact: null,
    howTarget: "pathway",
    howTechId: "kelp",
    scrutiny: null,
  },
  teaching: [{ techId: "kelp", blurb: "It slows water." }],
  endTutoring: false,
};

function decodeAll(text, cuts) {
  const decoder = createMessageDecoder();
  let out = "";
  let last = null;
  if (!cuts) {
    last = decoder.push(text);
    out = last.text;
  } else {
    for (const chunk of cuts) {
      last = decoder.push(chunk);
      out = last.text;
    }
  }
  return { out, last, decoder };
}

function everyChar(text) {
  return [...text];
}

describe("co-invent message decoder", () => {
  it("emits only the root message across every character boundary", () => {
    const text = JSON.stringify(SAMPLE);
    const { out, last } = decodeAll(text, everyChar(text));
    assert.equal(out, SAMPLE.message);
    assert.equal(last.messageClosed, true);
    assert.equal(last.stopped, false);
  });

  it("ignores a nested message and a message mentioned inside a proposal string", () => {
    const text = JSON.stringify({
      proposals: { inventionHow: 'see "message": hidden' },
      note: { message: "nested" },
      message: "Visible",
    });
    const { out } = decodeAll(text, everyChar(text));
    assert.equal(out, "Visible");
  });

  it("handles escapes, unicode, and a split surrogate pair", () => {
    const message = "line\nquote\" slash\\ café 😀";
    const text = JSON.stringify({ proposals: { inventionHow: null }, message });
    const chars = everyChar(text);
    const mid = chars.indexOf("\\");
    const cuts = [chars.slice(0, mid).join(""), chars.slice(mid).join("")];
    const { out } = decodeAll(text, cuts.length ? everyChar(text) : cuts);
    assert.equal(out, message);
  });

  it("reads a message when other keys come first", () => {
    const text = `{"proposals":{"inventionHow":"draft"},"message":"After"}`;
    const { out } = decodeAll(text, everyChar(text));
    assert.equal(out, "After");
  });

  it("stops on a duplicate root key and a non-string message", () => {
    const dup = createMessageDecoder();
    const dupStep = dup.push(`{"message":"a","message":"b"}`);
    assert.equal(dupStep.stopped, true);
    assert.equal(dupStep.stopReason, "duplicate_key");
    const bad = createMessageDecoder();
    const badStep = bad.push(`{"message":1}`);
    assert.equal(badStep.stopReason, "message_type");
    assert.equal(badStep.text, "");
  });

  it("does not scan prose for a message substring", () => {
    const decoder = createMessageDecoder();
    const step = decoder.push('Here is "message": "nope"');
    assert.equal(step.text, "");
    assert.equal(step.stopped, true);
  });

  it("accepts one leading json fence and caps like final sanitization", () => {
    const long = "x".repeat(PUBLIC_MESSAGE_CAP + 50);
    const fenced = "```json\n" + JSON.stringify({ message: long, proposals: {} }) + "\n```";
    const { out } = decodeAll(fenced, everyChar(fenced));
    assert.equal(out.length, PUBLIC_MESSAGE_CAP);
    assert.equal(out, long.slice(0, PUBLIC_MESSAGE_CAP));
  });

  it("rejects duplicate keys that JSON.parse would keep", () => {
    const text = '{"message":"first","message":"second"}';
    assert.equal(jsonHasDuplicateKeys(text), true);
    assert.equal(parseModelJson(text).ok, false);
    const parsed = parseModelJson(JSON.stringify(SAMPLE));
    assert.equal(parsed.ok, true);
    assert.equal(parsed.value.message, SAMPLE.message);
  });

  it("public results drop quota and inspect fields", () => {
    const pub = publicCoInventResult({
      ...SAMPLE,
      _quotaTokens: { inputTokens: 3 },
      llm: { system: "secret" },
      reservationId: "r",
    });
    assert.equal(pub.message, SAMPLE.message);
    assert.equal(pub._quotaTokens, undefined);
    assert.equal(pub.llm, undefined);
    assert.equal(pub.reservationId, undefined);
    assert.equal(pub.proposals.inventionHow, "Kelp baffles the surge.");
  });

  it("reconciles the preview to the sanitized message", () => {
    const capped = "abc".slice(0, PUBLIC_MESSAGE_CAP);
    const rec = reconcilePreview(capped, capped);
    assert.equal(rec.message, capped);
    assert.equal(rec.prefix, true);
  });
});

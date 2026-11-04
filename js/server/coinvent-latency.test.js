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
  ARCHITECTURE_DECISION,
  createLatencyTrace,
  markLatency,
  publicLatencyRecord,
  latencyRecordLeaksContent,
  usageCountsForTrace,
} from "../coinvent-latency.js";
import { createTurnLatency } from "./coinvent-turn.mjs";

describe("co-invent latency record", () => {
  it("keeps missing timings and missing tokens null", () => {
    const trace = createLatencyTrace({ mode: "chat", tutor: false, outputCap: null });
    markLatency(trace, "submit", 10);
    const record = publicLatencyRecord(trace);
    assert.equal(record.submit_to_ack_ms, null);
    assert.equal(record.provider_complete_ms, null);
    assert.equal(record.inputTokens, null);
    assert.equal(record.outputTokens, null);
    assert.equal(record.outputCap, null);
    assert.equal(record.outputCapApplied, null);
    assert.equal(latencyRecordLeaksContent(record), false);
  });

  it("computes durations on one clock and drops learner text", () => {
    const trace = createLatencyTrace({
      requestId: "r1",
      mode: "chat",
      tutor: true,
      transport: "http",
      model: "grok-4.7",
      effort: null,
      outputCap: 8192,
    });
    markLatency(trace, "submit", 0);
    markLatency(trace, "ack", 12);
    markLatency(trace, "first_visible_text", 40);
    markLatency(trace, "first_useful_sentence", 80);
    markLatency(trace, "provider_start", 5);
    markLatency(trace, "provider_complete", 100);
    trace.marks.message = "the learner asked about seawalls";
    const record = publicLatencyRecord(trace);
    assert.equal(record.submit_to_ack_ms, 12);
    assert.equal(record.first_visible_text_ms, 40);
    assert.equal(record.first_useful_sentence_ms, 80);
    assert.equal(record.provider_complete_ms, 95);
    assert.equal(record.effort, null);
    assert.equal(record.outputCap, 8192);
    assert.equal(record.message, undefined);
    assert.equal(JSON.stringify(record).includes("seawalls"), false);
  });

  it("does not treat absent provider usage as zero", () => {
    assert.equal(usageCountsForTrace(null).inputTokens, null);
    assert.equal(usageCountsForTrace({}).inputTokens, null);
    assert.equal(usageCountsForTrace({ input_tokens: 0, output_tokens: 3 }).inputTokens, 0);
    assert.equal(usageCountsForTrace({ input_tokens: 0, output_tokens: 3 }).outputTokens, 3);
  });

  it("records the one-call decision without a live comparison", () => {
    assert.equal(ARCHITECTURE_DECISION.choice, "one-call-streaming");
    assert.equal(ARCHITECTURE_DECISION.twoStage, false);
    assert.equal(ARCHITECTURE_DECISION.liveComparison, false);
  });

  it("times a streamed answer and leaves a buffered turn without a public delta", () => {
    const buffered = createTurnLatency({ mode: "chat", outputCap: null });
    buffered.noteOutputCap(null);
    buffered.mark("authority_start");
    buffered.mark("authority_done");
    buffered.startProvider();
    buffered.completeProvider(null);
    const quiet = buffered.publicRecord("ok");
    assert.equal(quiet.provider_connect_ms, null);
    assert.equal(quiet.provider_first_public_delta_ms, null);
    assert.equal(typeof quiet.provider_complete_ms, "number");
    assert.equal(quiet.authority_ms === null || typeof quiet.authority_ms === "number", true);
    assert.equal(quiet.outputCap, null);
    assert.equal(quiet.outputCapApplied, false);
    assert.equal(quiet.inputTokens, null);
    assert.equal(latencyRecordLeaksContent(quiet), false);

    const streamed = createTurnLatency({ mode: "tutor", tutor: true, outputCap: 8192 });
    streamed.noteOutputCap(8192);
    const seen = [];
    const delivery = streamed.watch({
      onConnected: () => seen.push("connected"),
      onDelta: (text) => seen.push(text),
    });
    streamed.startProvider();
    delivery.onConnected();
    delivery.onDelta("A seawall");
    delivery.onDelta(" holds");
    streamed.completeProvider({ input_tokens: 4, output_tokens: 2 });
    const live = streamed.publicRecord("ok");
    assert.deepEqual(seen, ["connected", "A seawall", " holds"]);
    assert.equal(typeof live.provider_connect_ms, "number");
    assert.equal(typeof live.provider_first_public_delta_ms, "number");
    assert.equal(live.outputCap, 8192);
    assert.equal(live.outputCapApplied, true);
    assert.equal(live.inputTokens, 4);
    assert.equal(live.outputTokens, 2);
    assert.equal(live.reasoningTokens, null);
    assert.equal(JSON.stringify(live).includes("seawall"), false);
  });
});

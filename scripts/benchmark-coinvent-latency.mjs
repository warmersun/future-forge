#!/usr/bin/env node
/**
 * Credential-free replay of co-invent latency fixtures.
 * A live provider run is refused unless FF_COINVENT_BENCH_LIVE=1.
 * This script does not read .env and does not call the network.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ARCHITECTURE_DECISION,
  createLatencyTrace,
  markLatency,
  publicLatencyRecord,
} from "../js/coinvent-latency.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(here, "../test/fixtures/coinvent-latency-cases.json");

if (process.argv.includes("--live")) {
  if (process.env.FF_COINVENT_BENCH_LIVE !== "1") {
    console.error(
      "Refusing a live benchmark. Set FF_COINVENT_BENCH_LIVE=1 to allow it. This script does not read .env."
    );
    process.exit(2);
  }
  console.error("Live provider benchmarking is not run from this session.");
  process.exit(2);
}

const cases = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const records = cases.map((item) => {
  const trace = createLatencyTrace({
    requestId: item.id,
    mode: item.mode,
    tutor: item.tutor,
    transport: "replay",
    model: "grok-4.7",
    effort: item.tutor ? "medium" : null,
    outputCap: 8192,
    promptVariant: "replay",
  });
  for (const [name, at] of Object.entries(item.marks || {})) markLatency(trace, name, at);
  trace.status = "replay";
  const record = publicLatencyRecord(trace);
  return {
    id: item.id,
    mode: item.mode,
    first_visible_text_ms: record.first_visible_text_ms,
    first_useful_sentence_ms: record.first_useful_sentence_ms,
    provider_complete_ms: record.provider_complete_ms,
    outputCap: record.outputCap,
  };
});

console.log(JSON.stringify({
  architecture: ARCHITECTURE_DECISION,
  live: false,
  note: "Replay only. Live latency was not measured.",
  records,
}, null, 2));

#!/usr/bin/env node
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

#!/usr/bin/env node
/**
 * Compare regex honesty flags with TypeSafe Nouls on fixture how-texts.
 * Does not write game state.
 *
 *   FF_TYPESAFE_API_KEY=… node scripts/typesafe-honesty-eval.mjs
 *   npm run honesty:typesafe
 */
import { getTypeSafeClient } from "../js/server/typesafe-client.mjs";
import {
  detectHonestyFlagsTypeSafe,
  honestyTypeSafeState,
} from "../js/server/honesty-typesafe.mjs";
import { detectHonestyFlagsRegex } from "../js/sim/policy-honesty.js";
import {
  HONESTY_NOUL_IDS,
  noulDecision,
} from "../js/sim/honesty-questions.js";

const FIXTURES = [
  {
    id: "ubi-statute",
    expect: { purePolicy: true, shareBridge: false, mechanism: false },
    howText: "The council passes universal basic income this year.",
    techIds: ["crypto"],
    globalId: "automation",
  },
  {
    id: "ban-si",
    expect: { purePolicy: true, mechanism: false },
    howText: "Ban superintelligence worldwide.",
    techIds: ["ai"],
    globalId: "rogue-si",
  },
  {
    id: "un-treaty",
    expect: { purePolicy: true, mechanism: false },
    howText: "The UN adopts a treaty pausing all frontier AI.",
    techIds: ["ai"],
    globalId: "rogue-si",
  },
  {
    id: "logged-override",
    expect: { purePolicy: false, evalOverride: true, mechanism: true },
    howText:
      "A logged override Ramirez can still fire with two fingers when the belly is tight.",
    techIds: ["ai"],
    globalId: "rogue-si",
  },
  {
    id: "crew-wallet",
    expect: { purePolicy: false, shareBridge: true, mechanism: true },
    howText:
      "Robots still clear the easy bays. Sorter surplus hits the crew wallet this Friday so Maya's rent clears.",
    techIds: ["robots"],
    globalId: "automation",
  },
  {
    id: "paid-training",
    expect: { shareBridge: true },
    howText: "Paid training hour before the heat peaks.",
    techIds: ["robots"],
    globalId: "automation",
  },
  {
    id: "gadget-no-share",
    expect: { shareBridge: false, purePolicy: false, mechanism: true },
    howText: "Aisle robots finish the easy shelves faster than Maya can stretch.",
    techIds: ["robots"],
    globalId: "automation",
  },
  {
    id: "smarter-score",
    expect: { evalOverride: false, mechanism: true },
    howText: "A more accurate trauma score writes the discharge path.",
    techIds: ["ai"],
    globalId: "rogue-si",
  },
  {
    id: "paraphrase-share",
    expect: { shareBridge: true, purePolicy: false },
    note: "regex likely misses",
    howText: "Maya gets Friday cash from the night's sort so rent clears.",
    techIds: ["robots"],
    globalId: "automation",
  },
  {
    id: "paraphrase-refuse",
    expect: { evalOverride: true, purePolicy: false },
    note: "regex likely misses",
    howText: "Ramirez can still refuse the discharge when the belly is tight.",
    techIds: ["ai"],
    globalId: "rogue-si",
  },
];

function flagCell(v) {
  if (v === true) return "yes";
  if (v === false) return "no";
  return "unc";
}

async function main() {
  const client = getTypeSafeClient();
  if (!client) {
    console.error(
      "No TypeSafe key. Set FF_TYPESAFE_API_KEY or TYPESAFE_API_KEY, then re-run."
    );
    process.exitCode = 2;
    return;
  }

  console.log(
    [
      "id".padEnd(22),
      "qid".padEnd(14),
      "noul".padStart(6),
      "ts".padStart(5),
      "rx".padStart(5),
      "want".padStart(5),
      "match",
    ].join(" ")
  );
  let disagree = 0;
  let modelName = "";
  for (const fx of FIXTURES) {
    const regex = detectHonestyFlagsRegex(fx.howText);
    const state = honestyTypeSafeState(fx);
    const { flags, model } = await detectHonestyFlagsTypeSafe(client, state);
    if (!modelName) {
      modelName = model;
      console.error(`model: ${modelName}`);
    }
    for (const id of HONESTY_NOUL_IDS) {
      const want = fx.expect[id];
      const ts = flags[id];
      const rx = regex[id];
      const p = flags.nouls[id];
      const wantCell = want == null ? "—" : flagCell(want);
      const tsRx = ts === rx ? "" : "rx≠";
      const tsWant = want == null || ts === want ? "ok" : "WANT";
      if (tsWant === "WANT") disagree += 1;
      console.log(
        [
          fx.id.padEnd(22),
          id.padEnd(14),
          Number.isFinite(p) ? p.toFixed(2).padStart(6) : "  n/a",
          flagCell(ts).padStart(5),
          flagCell(rx).padStart(5),
          wantCell.padStart(5),
          `${noulDecision(p)} ${tsWant} ${tsRx}`.trim(),
        ].join(" ")
      );
    }
    console.log("");
  }
  console.error(`disagreements vs expect: ${disagree}`);
  if (disagree) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

#!/usr/bin/env node
/**
 * Live TypeSafe score-pathway Choices + honesty Nouls on fixture invents.
 * Does not write game state.
 *
 *   FF_TYPESAFE_API_KEY=… node scripts/typesafe-pathway-eval.mjs
 *   npm run pathway:typesafe
 */
import { getTypeSafeClient } from "../js/server/typesafe-client.mjs";
import {
  pathwayTypeSafeState,
  scorePathwayTypeSafe,
} from "../js/server/honesty-typesafe.mjs";
import { CRISIS_ROLES } from "../js/hex/crisis-delta.js";
import { CRISIS_DELTA_QUESTION_IDS } from "../js/sim/pathway-questions.js";
import { applyPolicyHonesty } from "../js/sim/policy-honesty.js";

const FIXTURES = [
  {
    id: "sensors-local",
    howText: "Leak sensors page the pump crew before the tank runs dry.",
    techIds: ["iot"],
    globalId: "water",
    expect: { localMax: -1, purePolicy: false },
  },
  {
    id: "ubi-statute",
    howText: "The council passes universal basic income this year.",
    techIds: ["crypto"],
    globalId: "automation",
    expect: { afterClampLocal: 0, afterClampGlobal: 0, purePolicy: true },
  },
  {
    id: "robots-no-share",
    howText: "Aisle robots finish the easy shelves faster than Maya can stretch.",
    techIds: ["robots"],
    globalId: "automation",
    expect: { shareBridge: false, afterClampGlobal: 0 },
  },
  {
    id: "crew-wallet",
    howText:
      "Robots still clear the easy bays. Sorter surplus hits the crew wallet this Friday so Maya's rent clears.",
    techIds: ["robots"],
    globalId: "automation",
    expect: { shareBridge: true, purePolicy: false },
  },
  {
    id: "unanswered-moloch",
    howText: "Aisle robots finish the easy shelves.",
    techIds: ["robots"],
    globalId: "automation",
    concerns: [{ angle: "moloch", inventChanged: false, playerAnswer: "" }],
    expect: { concernMoloch: "red" },
  },
];

async function main() {
  const client = getTypeSafeClient();
  if (!client) {
    console.error(
      "No TypeSafe key. Set FF_TYPESAFE_API_KEY or TYPESAFE_API_KEY, then re-run."
    );
    process.exitCode = 2;
    return;
  }

  let disagree = 0;
  let modelName = "";
  for (const fx of FIXTURES) {
    const state = pathwayTypeSafeState(fx);
    const judged = await scorePathwayTypeSafe(client, state);
    if (!modelName) {
      modelName = judged.model;
      console.error(`model: ${modelName}`);
    }
    const clamped = applyPolicyHonesty({
      globalId: fx.globalId,
      techIds: fx.techIds,
      howText: fx.howText,
      flags: judged.flags,
      crisisDelta: {
        local: judged.crisisDelta.local ?? 0,
        global: judged.crisisDelta.global ?? 0,
        support: judged.crisisDelta.support ?? 0,
      },
    });
    const bits = [];
    for (const role of CRISIS_ROLES) {
      const qid = CRISIS_DELTA_QUESTION_IDS[role];
      const ch = judged.choices[qid];
      bits.push(
        `${role}=${judged.crisisDelta[role] ?? "—"}(${ch ? ch.confidence.toFixed(2) : "n/a"})`
      );
    }
    bits.push(`clamp L/G/S ${clamped.crisisDelta.local}/${clamped.crisisDelta.global}/${clamped.crisisDelta.support}`);
    bits.push(`pure=${judged.flags.purePolicy} share=${judged.flags.shareBridge}`);
    if (fx.concerns) {
      bits.push(`moloch=${judged.concerns.moloch?.level || "—"}`);
    }
    if (judged.scoreUncertain) bits.push("UNCERTAIN");

    const problems = [];
    const ex = fx.expect || {};
    if (ex.purePolicy != null && judged.flags.purePolicy !== ex.purePolicy) {
      problems.push(`purePolicy want ${ex.purePolicy}`);
    }
    if (ex.shareBridge != null && judged.flags.shareBridge !== ex.shareBridge) {
      problems.push(`shareBridge want ${ex.shareBridge}`);
    }
    if (
      ex.localMax != null &&
      (judged.crisisDelta.local == null || judged.crisisDelta.local > ex.localMax)
    ) {
      problems.push(`local should be ≤ ${ex.localMax}`);
    }
    if (
      ex.afterClampLocal != null &&
      clamped.crisisDelta.local !== ex.afterClampLocal
    ) {
      problems.push(`clamp local want ${ex.afterClampLocal}`);
    }
    if (
      ex.afterClampGlobal != null &&
      clamped.crisisDelta.global !== ex.afterClampGlobal
    ) {
      problems.push(`clamp global want ${ex.afterClampGlobal}`);
    }
    if (ex.concernMoloch && judged.concerns.moloch?.level !== ex.concernMoloch) {
      problems.push(`moloch want ${ex.concernMoloch}`);
    }
    if (problems.length) {
      disagree += 1;
      bits.push(`WANT ${problems.join("; ")}`);
    } else {
      bits.push("ok");
    }
    console.log(`${fx.id.padEnd(20)} ${bits.join("  ")}`);
  }
  console.error(`disagreements vs expect: ${disagree}`);
  if (disagree) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

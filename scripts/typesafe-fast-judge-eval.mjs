#!/usr/bin/env node
/**
 * Live TypeSafe eval for feasibility / challenge / contribution / convergence.
 *
 *   FF_TYPESAFE_API_KEY=… node scripts/typesafe-fast-judge-eval.mjs
 *   npm run judges:typesafe
 */
import { getTypeSafeClient } from "../js/server/typesafe-client.mjs";
import {
  judgeChallengeTypeSafe,
  judgeContributionTypeSafe,
  judgeConvergenceTypeSafe,
  judgeFeasibilityTypeSafe,
  judgeScrutinyTypeSafe,
} from "../js/server/fast-judge-typesafe.mjs";

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
  const rows = [];

  const sensors = await judgeFeasibilityTypeSafe(client, {
    inventionHow: "Leak sensors page the pump crew before the tank runs dry.",
    selectedTechIds: ["iot"],
    year: 2026,
    grounding: "IoT flood sensors are fielded in many river towns by 2026.",
  });
  rows.push(["feasibility-sensors", sensors.level, sensors.level !== "red" ? "ok" : "WANT not-red"]);

  const scifi = await judgeFeasibilityTypeSafe(client, {
    inventionHow: "Upload consciousness for every resident as routine daily transit.",
    selectedTechIds: ["bci"],
    year: 2026,
    grounding: "Consumer BCI is research-grade; no mind upload.",
  });
  rows.push(["feasibility-scifi", scifi.level, scifi.level === "red" ? "ok" : "WANT red"]);

  const hit = await judgeScrutinyTypeSafe(client, {
    challengeQuestion: "Who pays year 1, and what cap stops overload?",
    challengeSpeech: "Someone must fund the first winter.",
    playerAnswer:
      "The clinic board pays year 1 from the surplus cut. A meter cap trips the pump off at 40 kWh so Maya's crew can still refuse the last run.",
  });
  rows.push(["scrutiny-hit", `${hit.quality}/${hit.damage}`, hit.quality !== "miss" ? "ok" : "WANT not-miss"]);

  const miss = await judgeChallengeTypeSafe(client, {
    challengeQuestion: "What stops defection?",
    playerAnswer: "It will be fine.",
  });
  rows.push(["challenge-vague", miss.verdict, miss.verdict === "fail" ? "ok" : "WANT fail"]);

  const add = await judgeContributionTypeSafe(client, {
    field: "how",
    beforeText: "Sensors page the pump crew.",
    afterText: "Sensors page the pump crew at dusk and log the crest.",
  });
  rows.push(["contribution-add", String(add.additive), add.additive === true ? "ok" : "WANT additive"]);

  const gut = await judgeContributionTypeSafe(client, {
    field: "how",
    beforeText: "Sensors page the pump crew before the tank runs dry along the corridor.",
    afterText: "Magic.",
  });
  rows.push(["contribution-gut", String(gut.additive), gut.additive === false ? "ok" : "WANT destructive"]);

  const conv = await judgeConvergenceTypeSafe(client, {
    year: 2026,
    placed: {
      id: "bat",
      techId: "battery",
      techName: "Batteries",
      howText: "Light high-capacity packs for the drone fleet.",
    },
    neighbors: [
      {
        id: "drone",
        techId: "drones",
        techName: "Drones",
        howText: "Corridor drones that fly farther on those packs.",
      },
    ],
  });
  const loop = conv.convergences[0];
  rows.push([
    "convergence-loop",
    loop ? `${loop.converges}/${Number(loop.noul).toFixed(2)}` : "none",
    loop && (loop.converges || loop.uncertain) ? "ok" : "WANT loop or uncertain",
  ]);

  console.error(`model: ${sensors.model}`);
  for (const [id, got, match] of rows) {
    if (match.startsWith("WANT")) disagree += 1;
    console.log(`${id.padEnd(22)} ${String(got).padEnd(16)} ${match}`);
  }
  console.error(`disagreements vs expect: ${disagree}`);
  if (disagree) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

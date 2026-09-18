#!/usr/bin/env node
/**
 * Live TypeSafe eval for chat addTechIds / endTutoring / lobby tags.
 *
 *   FF_TYPESAFE_API_KEY=… node scripts/typesafe-function-call-eval.mjs
 *   npm run calls:typesafe
 */
import { getTypeSafeClient } from "../js/server/typesafe-client.mjs";
import {
  judgeChatFunctionTypeSafe,
  judgeLobbyTagTypeSafe,
} from "../js/server/function-call-typesafe.mjs";

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

  const add = await judgeChatFunctionTypeSafe(
    client,
    {
      message: "Let's put aisle robots on Maya's night sort.",
      proposals: { addTechIds: ["robots", "vr"] },
    },
    {
      availableTechs: [
        { id: "robots", name: "Robots" },
        { id: "vr", name: "Virtual Reality" },
        { id: "iot", name: "Internet of Things" },
      ],
    },
    [{ role: "user", content: "Add robots for the warehouse crew." }]
  );
  rows.push([
    "chat-add-robots",
    `${add.intent}:${add.addTechIds.join(",")}`,
    add.addTechIds.includes("robots") && !add.addTechIds.includes("vr")
      ? "ok"
      : "WANT robots not vr",
  ]);

  const none = await judgeChatFunctionTypeSafe(
    client,
    {
      message: "A sensor is a small device that notices a change.",
      proposals: { addTechIds: ["iot"] },
    },
    { availableTechs: [{ id: "iot", name: "Internet of Things" }] },
    [{ role: "user", content: "What is a sensor?" }]
  );
  rows.push([
    "chat-question",
    `${none.intent}:${none.addTechIds.join(",") || "—"}`,
    none.intent === "none" || none.addTechIds.length === 0 ? "ok" : "WANT none/empty",
  ]);

  const tutor = await judgeChatFunctionTypeSafe(
    client,
    { message: "You're ready — go invent.", proposals: { addTechIds: [] } },
    {
      tutorMode: true,
      availableTechs: [{ id: "iot", name: "Internet of Things" }],
    },
    [{ role: "user", content: "I get it. I'll invent on my own now." }]
  );
  rows.push([
    "tutor-end",
    String(tutor.endTutoring),
    tutor.endTutoring ? "ok" : "WANT endTutoring",
  ]);

  const share = await judgeLobbyTagTypeSafe(client, {
    kind: "policy",
    label: "Crew cut on the night sort",
    body: "Sorter surplus hits the crew wallet every Friday so Maya's rent clears.",
    globalId: "automation",
  });
  rows.push([
    "lobby-share",
    `${share.kind}:${share.effects.join(",")}`,
    share.effects.includes("share-required") ? "ok" : "WANT share-required",
  ]);

  const override = await judgeLobbyTagTypeSafe(client, {
    kind: "regulation",
    label: "Reachable override",
    body: "Ramirez can still fire a logged override when the belly is tight.",
    globalId: "rogue-si",
  });
  rows.push([
    "lobby-eval",
    `${override.kind}:${override.effects.join(",")}`,
    override.effects.includes("eval-required") ? "ok" : "WANT eval-required",
  ]);

  const flavor = await judgeLobbyTagTypeSafe(client, {
    kind: "policy",
    label: "Harbor lights on dusk",
    body: "Keep the quay lamps lit after six so neighbors can walk home.",
    globalId: "water",
  });
  rows.push([
    "lobby-flavor",
    flavor.effects.join(",") || "—",
    flavor.effects.length === 0 ? "ok" : "WANT no effects",
  ]);

  console.error(`model: ${add.model || share.model}`);
  for (const [id, got, match] of rows) {
    if (match.startsWith("WANT")) disagree += 1;
    console.log(`${id.padEnd(18)} ${String(got).padEnd(28)} ${match}`);
  }
  console.error(`disagreements vs expect: ${disagree}`);
  if (disagree) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

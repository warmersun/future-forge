import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const serverSrc = fs.readFileSync(path.join(root, "server.mjs"), "utf8");
const tideglass = JSON.parse(
  fs.readFileSync(path.join(root, "quests/preventing-mirror-life-tideglass.json"), "utf8")
);

describe("tutor prompt contract", () => {
  it("does not tell the model to send a one-breath telegram", () => {
    assert.equal(serverSrc.includes("one-breath"), false);
    assert.equal(serverSrc.includes("one or two full sentences that name the idea"), false);
    assert.equal(serverSrc.includes("One short core idea"), false);
  });

  it("asks for a short teaching paragraph that answers the question asked", () => {
    assert.match(serverSrc, /short paragraph: 4.8 full sentences/);
    assert.match(serverSrc, /SEQUENCE paces unsolicited next ideas/);
    assert.match(serverSrc, /answer the question they asked/i);
  });

  it("Tideglass curriculum matches the paragraph contract", () => {
    const ctx = String(tideglass.aiTutorContext || "");
    assert.equal(ctx.includes("one-breath"), false);
    assert.match(ctx, /short paragraph \(analogy \+ one mechanism\)/);
    assert.match(ctx, /SEQUENCE does not block a later idea/);
  });
});

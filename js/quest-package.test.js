import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { allTechIds } from "./data.js";
import {
  rowsByYear,
  selectPackageBank,
  validatePackageBanks,
} from "./quest-package.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIX = path.join(ROOT, "test/fixtures/packages/self-contained-worlds");
const TECHS = allTechIds();

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(FIX, rel), "utf8"));
}

function quest(id) {
  const tile = readJson(`quests/${id}.json`);
  return { id: tile.id, kind: tile.kind || "quest", file: `quests/${id}.json`, tile };
}

function banks(...names) {
  return Object.fromEntries(names.map((name) => [name, readJson(`predictions/${name}.json`)]));
}

describe("quest package banks", () => {
  it("selects each quest's complete bank and leaves the other calendar out", () => {
    const result = validatePackageBanks({
      quests: [quest("kiln-ferry-test"), quest("harbor-clock-test"), quest("plain-shelf-test")],
      banks: banks("kiln-ferry-bank", "harbor-clock-bank"),
      techIds: TECHS,
    });
    assert.equal(result.ok, true, JSON.stringify(result.errors));
    const kiln = selectPackageBank(result.banks, "kiln-ferry-bank");
    const harbor = selectPackageBank(result.banks, "harbor-clock-bank");
    assert.deepEqual(
      kiln.predictions.map((row) => row.id),
      ["kiln-ferry-due-2026", "kiln-ferry-ahead-2032"]
    );
    assert.equal(harbor.predictions.some((row) => row.id.startsWith("kiln-")), false);
    assert.equal(kiln.predictions[0].attribution.name, "Test fixture speaker");
    assert.equal(kiln.predictions[0].year, 2026);
    assert.equal(kiln.predictions[0].claimBand, "frontier");
    const split = rowsByYear(kiln, 2026);
    assert.deepEqual(split.at.map((row) => row.id), ["kiln-ferry-due-2026"]);
    assert.deepEqual(split.after.map((row) => row.id), ["kiln-ferry-ahead-2032"]);
    assert.equal(split.before.length, 0);
    kiln.predictions[0].year = 1999;
    assert.equal(result.banks["kiln-ferry-bank"].predictions[0].year, 2026);
  });

  it("lets two quests share one complete calendar without enabling the other quest's grant", () => {
    const result = validatePackageBanks({
      quests: [quest("kiln-ferry-test"), quest("kiln-shared-test")],
      banks: banks("kiln-ferry-bank"),
      techIds: TECHS,
    });
    assert.equal(result.ok, true, JSON.stringify(result.errors));
    assert.equal(result.bindings.length, 2);
    assert.equal(result.bindings.every((row) => row.predictionBankId === "kiln-ferry-bank"), true);
    const shared = selectPackageBank(result.banks, "kiln-ferry-bank");
    assert.equal(shared.predictions.length, 2);
    const ferry = quest("kiln-ferry-test").tile;
    assert.deepEqual(
      ferry.companion.exploration.premise.grants.map((grant) => grant.predictionId),
      ["kiln-ferry-due-2026"]
    );
    assert.equal(quest("kiln-shared-test").tile.companion, undefined);
  });

  it("rejects a missing bank, a missing grant row, a mismatched premise, and an orphan bank", () => {
    const missing = validatePackageBanks({
      quests: [quest("harbor-clock-test")],
      banks: banks("kiln-ferry-bank"),
      techIds: TECHS,
    });
    assert.equal(missing.ok, false);
    assert.match(missing.errors.map((e) => e.message).join("\n"), /missing bank harbor-clock-bank/);
    assert.match(missing.errors.map((e) => e.message).join("\n"), /orphan bank kiln-ferry-bank/);

    const tile = quest("kiln-ferry-test");
    tile.tile.companion.exploration.premise.grants[0].predictionId = "not-in-this-bank";
    const unresolved = validatePackageBanks({
      quests: [tile],
      banks: banks("kiln-ferry-bank"),
      techIds: TECHS,
    });
    assert.match(unresolved.errors.map((e) => e.message).join("\n"), /unresolved grant not-in-this-bank/);

    const mismatched = quest("kiln-ferry-test");
    mismatched.tile.companion.exploration.premise.bankId = "harbor-clock-bank";
    const mismatch = validatePackageBanks({
      quests: [mismatched, quest("harbor-clock-test")],
      banks: banks("kiln-ferry-bank", "harbor-clock-bank"),
      techIds: TECHS,
    });
    assert.match(mismatch.errors.map((e) => e.message).join("\n"), /mismatched premise bankId/);
  });

  it("does not require a bank on a module wrapper", () => {
    const result = validatePackageBanks({
      quests: [quest("module-kiln"), quest("kiln-ferry-test")],
      banks: banks("kiln-ferry-bank"),
      techIds: TECHS,
    });
    assert.equal(result.ok, true, JSON.stringify(result.errors));
    assert.equal(result.bindings.some((row) => row.questId === "module-kiln"), false);
  });

  it("keeps same bank ids in different packages as separate documents", () => {
    const left = validatePackageBanks({
      quests: [quest("kiln-ferry-test")],
      banks: banks("kiln-ferry-bank"),
      techIds: TECHS,
    });
    const right = validatePackageBanks({
      quests: [
        {
          ...quest("kiln-shared-test"),
          tile: { ...quest("kiln-shared-test").tile, predictionBankId: "collision-bank" },
        },
      ],
      banks: { "collision-bank": readJson("predictions/collision-bank.json") },
      techIds: TECHS,
    });
    assert.equal(left.ok, true, JSON.stringify(left.errors));
    assert.equal(right.ok, true, JSON.stringify(right.errors));
    assert.notEqual(
      left.banks["kiln-ferry-bank"].predictions[0].id,
      right.banks["collision-bank"].predictions[0].id
    );
  });
});

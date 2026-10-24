import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  _resetObjectQuestCache,
  catalogFromObjectReader,
  fetchObjectQuestCatalog,
  joinObjectKey,
  questsBucketFromEnv,
} from "./quest-object-storage.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
const tileRaw = fs.readFileSync(
  path.join(ROOT, "quests/spotlight-gene-seq.json"),
  "utf8"
);
const tile = JSON.parse(tileRaw);

function store(files) {
  return async (key) => {
    if (!Object.prototype.hasOwnProperty.call(files, key)) {
      const err = new Error("object_read_failed");
      throw err;
    }
    return files[key];
  };
}

describe("quests object storage", () => {
  beforeEach(() => _resetObjectQuestCache());

  it("treats an unset or off bucket as the public-catalog path", () => {
    assert.equal(questsBucketFromEnv({}), null);
    assert.equal(questsBucketFromEnv({ FF_QUESTS_BUCKET: "off" }), null);
    assert.equal(questsBucketFromEnv({ FF_QUESTS_BUCKET: "quests" }), "quests");
  });

  it("joins a prefix without doubling slashes", () => {
    assert.equal(joinObjectKey("", "/spotlight.json"), "spotlight.json");
    assert.equal(joinObjectKey("pack/", "spotlight.json"), "pack/spotlight.json");
  });

  it("loads catalog.json and tile keys, and records a missing key", async () => {
    const catalog = JSON.stringify({
      quests: [
        { id: tile.id, file: "spotlight-gene-seq.json" },
        { id: "missing", file: "missing.json" },
      ],
    });
    const result = await catalogFromObjectReader(
      store({
        "catalog.json": catalog,
        "spotlight-gene-seq.json": tileRaw,
      }),
      { url: "neon://quests/catalog.json", remoteBase: "neon://quests/" }
    );
    assert.equal(result.ok, true);
    assert.equal(result.quests.length, 1);
    assert.equal(result.quests[0].id, tile.id);
    assert.equal(result.quests[0].source, "remote");
    assert.equal(result.quests[0].remoteUrl, "neon://quests/spotlight-gene-seq.json");
    assert.ok(result.quests[0].mission);
    assert.equal(result.errors.length, 1);
    assert.equal(result.errors[0].file, "missing.json");
    assert.equal(result.errors[0].error, "object_read_failed");
  });

  it("does not cache a failed catalog, and does cache a good one", async () => {
    const fail = await fetchObjectQuestCatalog({
      bucket: "quests",
      readText: store({}),
    });
    assert.equal(fail.ok, false);
    let reads = 0;
    const catalog = JSON.stringify({
      quests: [{ id: tile.id, file: "spotlight-gene-seq.json" }],
    });
    const ok = await fetchObjectQuestCatalog({
      bucket: "quests",
      readText: async (key) => {
        reads += 1;
        return store({
          "catalog.json": catalog,
          "spotlight-gene-seq.json": tileRaw,
        })(key);
      },
    });
    assert.equal(ok.ok, true);
    assert.equal(ok.quests.length, 1);
    const again = await fetchObjectQuestCatalog({
      bucket: "quests",
      readText: async () => {
        reads += 1;
        throw new Error("should not read");
      },
    });
    assert.equal(again.cached, true);
    assert.equal(again.quests.length, 1);
    assert.equal(reads, 2);
  });

  it("mixes legacy entries and slim package cards without reading package file hints or escaped keys", async () => {
    const ref = { packageId: "demo", revision: `sha256:${"ab".repeat(32)}`, questId: "package-quest" };
    const reads = [];
    const result = await catalogFromObjectReader(async (key) => {
      reads.push(key);
      if (key === "private/legacy.json") return tileRaw;
      if (key === "private/catalog.json") return JSON.stringify({ quests: [
        { id: tile.id, file: "legacy.json" },
        { id: "package-quest", title: "Package", access: "paid", packageRef: ref, file: "https://evil.example/secret", mission: { secret: "private" } },
        { id: "escape", file: "../secret" },
      ] });
      throw new Error("unexpected key");
    }, { prefix: "private" });
    assert.equal(result.quests.length, 2);
    assert.ok(result.quests[0].mission);
    assert.equal(result.quests[1].mission, undefined);
    assert.equal(result.quests[1].access, "paid");
    assert.deepEqual(reads, ["private/catalog.json", "private/legacy.json"]);
    assert.equal(result.errors[0].error, "object_key_forbidden");
  });

  it("keeps an explicit packageRef and drops a forged one", async () => {
    const ref = {
      packageId: "kiln-ferry-test",
      revision: `sha256:${"ab".repeat(32)}`,
      questId: tile.id,
    };
    const catalog = JSON.stringify({
      quests: [
        { id: tile.id, file: "spotlight-gene-seq.json", packageRef: ref },
        {
          id: "forged",
          file: "spotlight-gene-seq.json",
          packageRef: { packageId: "../escape", revision: "latest", questId: tile.id },
        },
      ],
    });
    const result = await catalogFromObjectReader(
      store({
        "catalog.json": catalog,
        "spotlight-gene-seq.json": tileRaw,
      })
    );
    assert.equal(result.quests.length, 1);
    assert.deepEqual(result.quests[0].packageRef, ref);
    assert.equal(result.quests[0].mission, undefined);
    assert.equal(result.errors[0].error, "package_reference_forbidden");
  });
});

import { it } from "node:test";
import assert from "node:assert/strict";
import { parsePackageRef, packageObjectKey, containedPackageFile } from "./package-paths.mjs";

const ref = { packageId: "pkg", questId: "quest", revision: `sha256:${"ab".repeat(32)}` };
it("accepts exact references and rejects repaired, partial, or typed values", () => {
  assert.deepEqual(parsePackageRef(ref), ref);
  for (const invalid of [null, [], {}, { ...ref, packageId: " pkg" }, { ...ref, questId: "quest " }, { ...ref, revision: ref.revision + " " }, { ...ref, packageId: 42 }]) {
    assert.equal(parsePackageRef(invalid), null, JSON.stringify(invalid));
  }
});
it("rejects paths that an object or HTTP reader could reinterpret", () => {
  for (const file of ["/absolute", "../escape", "a/../escape", "a//b", "a\\b", "https://other.test/file", "%2e%2e/escape", "x?query", "x#fragment"]) {
    assert.equal(containedPackageFile("store/release", file), "", file);
    assert.equal(packageObjectKey("store", ref, file), "", file);
  }
  assert.equal(containedPackageFile("store/release", "quests/q.json"), "store/release/quests/q.json");
  assert.equal(packageObjectKey("store", { ...ref, packageId: "../x" }, "manifest.json"), "");
});

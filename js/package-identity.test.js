import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  comparePackagePaths,
  packageIdentityDescriptor,
  packageRevision,
  sha256Hex,
} from "./package-identity.js";

function nodeDigest(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

const SCHEMA = "future-forge.quest-package/v2";

describe("package identity", () => {
  it("matches a Python/Node golden revision for Unicode names, content and UTF-8 ordering", () => {
    // U+E000 sorts before the astral emoji in UTF-8, opposite UTF-16 order.
    const files = [
      ["assets/😀.txt", Buffer.from("测试\n")],
      ["quests/z.json", Buffer.from("{}")],
      ["assets/é.txt", Buffer.from("café ☀")],
      ["assets/\ue000.txt", Buffer.from([0, 255, 128])],
    ].map(([path, body]) => ({ path, digest: `sha256:${nodeDigest(body)}` }));
    const expected = "sha256:ec2d2b29c36492e6908abbda2c742004af445299952d03a15d2cc1fe8ca169d0";
    const python = spawnSync("python3", ["-c", `
import json, runpy, sys
module = runpy.run_path(sys.argv[1])
schema, package_id, files = json.load(sys.stdin)
print(module["package_revision"](schema, package_id, files))
`, fileURLToPath(new URL("../scripts/quest-package.py", import.meta.url))], {
      input: JSON.stringify([SCHEMA, "unicode-golden", Object.fromEntries(files.map(row => [row.path, row.digest]))]),
      encoding: "utf8",
    });
    assert.equal(python.status, 0, python.stderr);
    assert.equal(python.stdout.trim(), expected);
    assert.equal(packageRevision(SCHEMA, "unicode-golden", files, nodeDigest), expected);
    assert.equal(packageRevision(SCHEMA, "unicode-golden", [...files].reverse(), nodeDigest), expected);
  });
  it("sorts paths by UTF-8 bytes and ignores input order", () => {
    assert.ok(comparePackagePaths("predictions/é-bank.json", "predictions/z.json") > 0);
    assert.ok(comparePackagePaths("assets/a.png", "quests/a.json") < 0);
    const files = [
      { path: "quests/b.json", digest: "bb" },
      { path: "predictions/é.json", digest: "EE" },
      { path: "assets/a.png", digest: "sha256:aa" },
    ];
    const shuffled = [files[2], files[0], files[1]];
    assert.equal(
      packageIdentityDescriptor(SCHEMA, "pkg", files),
      packageIdentityDescriptor(SCHEMA, "pkg", shuffled)
    );
    const encoded = packageIdentityDescriptor(SCHEMA, "pkg", files);
    assert.equal(encoded.includes(" "), false);
    assert.equal(encoded.includes("\n"), false);
    assert.match(encoded, /predictions\/é\.json/);
    const parsed = JSON.parse(encoded);
    assert.deepEqual(parsed[0], SCHEMA);
    assert.deepEqual(parsed[1], "pkg");
    assert.deepEqual(parsed[2], [
      ["assets/a.png", "aa"],
      ["predictions/é.json", "ee"],
      ["quests/b.json", "bb"],
    ]);
  });

  it("changes when a dated claim, a scope, or an asset digest changes", () => {
    const base = [
      { path: "quests/q.json", digest: "11" },
      { path: "predictions/bank.json", digest: "22" },
      { path: "assets/cover.png", digest: "33" },
    ];
    const dated = [
      { path: "quests/q.json", digest: "11" },
      { path: "predictions/bank.json", digest: "23" },
      { path: "assets/cover.png", digest: "33" },
    ];
    const scoped = [
      { path: "quests/q.json", digest: "19" },
      { path: "predictions/bank.json", digest: "22" },
      { path: "assets/cover.png", digest: "33" },
    ];
    const asset = [
      { path: "quests/q.json", digest: "11" },
      { path: "predictions/bank.json", digest: "22" },
      { path: "assets/cover.png", digest: "34" },
    ];
    assert.notEqual(
      packageIdentityDescriptor(SCHEMA, "pkg", base),
      packageIdentityDescriptor(SCHEMA, "pkg", dated)
    );
    assert.notEqual(
      packageIdentityDescriptor(SCHEMA, "pkg", base),
      packageIdentityDescriptor(SCHEMA, "pkg", scoped)
    );
    assert.notEqual(
      packageIdentityDescriptor(SCHEMA, "pkg", base),
      packageIdentityDescriptor(SCHEMA, "pkg", asset)
    );
  });

  it("excludes manifest.json and agrees between crypto.subtle and node:crypto", async () => {
    const files = [
      { path: "manifest.json", digest: "should-not-matter" },
      { path: "quests/кильн.json", digest: "abc" },
      { path: "predictions/bank.json", digest: "def" },
    ];
    const without = files.filter((row) => row.path !== "manifest.json");
    assert.equal(
      packageIdentityDescriptor(SCHEMA, "кильн", files),
      packageIdentityDescriptor(SCHEMA, "кильн", without)
    );
    const left = await packageRevision(SCHEMA, "кильн", files, sha256Hex);
    const right = packageRevision(SCHEMA, "кильн", files, nodeDigest);
    assert.equal(left, right);
    assert.match(left, /^sha256:[0-9a-f]{64}$/);
    const again = packageRevision(SCHEMA, "кильн", [...files].reverse(), nodeDigest);
    assert.equal(again, left);
  });
});

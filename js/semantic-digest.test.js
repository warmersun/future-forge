import { it } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import vm from "node:vm";
import { sha256, semanticDigest } from "./semantic-digest.js";

it("matches SHA-256 standard vectors and Node across padding and UTF-8 boundaries", () => {
  assert.equal(sha256(""), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  assert.equal(sha256("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  const inputs = ["abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq", "a".repeat(1_000_000), "港口 🚢 café e\u0301 \ud800"];
  for (const size of [1, 55, 56, 63, 64, 65, 119, 120, 127, 128, 129, 4096]) {
    inputs.push("x".repeat(size));
  }
  for (const text of inputs) {
    assert.equal(sha256(text), createHash("sha256").update(text).digest("hex"));
  }
});

it("canonicalizes nested object keys without losing array order or domain separation", () => {
  const a = semanticDigest("test-v1", { z: [1, { y: 2, x: 3 }], a: "海" });
  assert.match(a, /^sha256:[a-f0-9]{64}$/);
  assert.equal(a, semanticDigest("test-v1", { a: "海", z: [1, { x: 3, y: 2 }] }));
  assert.notEqual(a, semanticDigest("test-v2", { a: "海", z: [1, { x: 3, y: 2 }] }));
  assert.notEqual(semanticDigest("test-v1", [1, 2]), semanticDigest("test-v1", [2, 1]));
  assert.notEqual(semanticDigest("test-v1", "1"), semanticDigest("test-v1", 1));
});

it("runs synchronously with browser primitives and no crypto, Buffer, process, or imports", () => {
  const source = fs.readFileSync(new URL("./semantic-digest.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\bimport\s/);
  const browser = vm.createContext({ TextEncoder });
  vm.runInContext(source.replaceAll("export function ", "function "), browser);
  assert.equal(vm.runInContext('typeof crypto + ":" + typeof Buffer + ":" + typeof process', browser), "undefined:undefined:undefined");
  assert.equal(vm.runInContext('sha256("abc")', browser), sha256("abc"));
  assert.equal(vm.runInContext('semanticDigest("test-v1", {b: 2, a: "🚢"})', browser), semanticDigest("test-v1", { a: "🚢", b: 2 }));
});

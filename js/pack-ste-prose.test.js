import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { packSteIssues, steWordCount } from "./pack-ste-prose.js";

function words(n) {
  return Array.from({ length: n }, () => "word").join(" ");
}

describe("packSteIssues", () => {
  it("accepts a 25-word description", () => {
    const text = `${words(25)}.`;
    assert.equal(steWordCount(text), 25);
    assert.deepEqual(packSteIssues(text, "description"), []);
  });

  it("flags a 26-word description", () => {
    const text = `${words(26)}.`;
    const issues = packSteIssues(text, "description");
    assert.ok(issues.some((r) => r.startsWith("sentence_over_25")));
  });

  it("flags a contraction", () => {
    const issues = packSteIssues("The nurse doesn't seal the swab.", "description");
    assert.ok(issues.includes("contraction"));
  });

  it("flags a semicolon", () => {
    const issues = packSteIssues("The nurse seals the swab; the truck left.", "description");
    assert.ok(issues.includes("semicolon"));
  });

  it("flags a Who-designs close", () => {
    const issues = packSteIssues(
      "The screen says discharge. Who designs a trauma score?",
      "description"
    );
    assert.ok(issues.includes("riddle_close"));
  });

  it("accepts a 20-word job and flags a 21-word job", () => {
    const ok = `${words(20)}.`;
    assert.equal(steWordCount(ok), 20);
    assert.deepEqual(packSteIssues(ok, "procedure"), []);
    const over = `${words(21)}.`;
    const issues = packSteIssues(over, "procedure");
    assert.ok(issues.some((r) => r.startsWith("sentence_over_20")));
  });
});

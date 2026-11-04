/*
Copyright © 2026 Warmer Sun Education, a sole proprietorship by Tamas Simon

This file is part of Future Forge.

Future Forge is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Future Forge is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Future Forge. If not, see <https://www.gnu.org/licenses/>.
*/

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GLOSSARY, PLAIN_MAX, glossaryEntry, termHtml, plainLine } from "./glossary.js";

const REQUIRED = [
  "emtech", "emerging-tech", "bits", "atoms", "world", "pathway", "honest", "look-ahead", "wait",
  "end-turn", "crisis-meter", "local", "global", "support", "challenger", "moloch", "ethicist",
  "stakeholder", "mother-nature", "coverage", "bonds", "timing", "convergence", "budget",
  "support-resource", "ap", "exponential", "log-scale", "doubling", "halving", "cagr", "reached",
  "predicted", "early-tech-risk", "elegance", "spotlight", "rd", "lobby", "art-of-the-possible", "learn",
];
const DO_NOT_SAY = /\b(developer|JSON|overlay|schema|modal|feature|API|score function|locked until|unlock the card)\b/i;

describe("GLOSSARY content", () => {
  it("has every required term", () => {
    for (const id of REQUIRED) assert.ok(glossaryEntry(id), `missing ${id}`);
  });
  it("every entry has a term and a plain line within the cap", () => {
    for (const [id, e] of Object.entries(GLOSSARY)) {
      assert.ok(e.term && e.term.trim(), `${id} term`);
      assert.ok(e.plain && e.plain.trim(), `${id} plain`);
      assert.ok(e.plain.length <= PLAIN_MAX, `${id} plain too long (${e.plain.length})`);
    }
  });
  it("never uses banned words", () => {
    for (const [id, e] of Object.entries(GLOSSARY)) {
      assert.ok(!DO_NOT_SAY.test(e.plain), `${id}: ${e.plain}`);
      if (e.analogy) assert.ok(!DO_NOT_SAY.test(e.analogy), `${id}: ${e.analogy}`);
    }
  });
});

describe("termHtml / plainLine", () => {
  it("wraps a label as a tappable dfn and escapes it", () => {
    const html = termHtml("pathway", "<Pathway>");
    assert.match(html, /^<dfn class="term" data-term="pathway" tabindex="0" role="button"/);
    assert.match(html, /&lt;Pathway&gt;<\/dfn>$/);
  });
  it("falls back to plain text for unknown ids", () => {
    assert.equal(termHtml("nope", "Label"), "Label");
  });
  it("uses the entry term when no label is given", () => {
    assert.match(termHtml("look-ahead"), />Look Ahead<\/dfn>$/);
  });
  it("plainLine returns the plain text or empty", () => {
    assert.equal(plainLine("bits"), GLOSSARY.bits.plain);
    assert.equal(plainLine("nope"), "");
  });
});

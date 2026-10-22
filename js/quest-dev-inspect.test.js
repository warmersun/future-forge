import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { catalogInspectCompanionHtml } from "./quest-dev-inspect.js";
import { validateQuestDocument } from "./quest-tile.js";

const fixture = JSON.parse(
  fs.readFileSync(
    new URL("../test/fixtures/quests/companion-moonshots-304.json", import.meta.url),
    "utf8"
  )
);

describe("developer companion inspect", () => {
  it("shows the companion and exploration structure", () => {
    const validated = validateQuestDocument(fixture);
    assert.equal(validated.ok, true);
    const html = catalogInspectCompanionHtml(validated.mission.companion, {
      pressureLabels: { local: "Shift backlog", global: "Build-out", support: "Handoff" },
    });
    assert.match(html, /id="quest-dev-companion"/);
    assert.match(html, /podcast/);
    assert.match(html, /opinion/);
    assert.match(html, /A guest says AGI is already here/);
    assert.match(html, /I do think that we have achieved AGI/);
    assert.match(html, /Listen|44:58/);
    assert.match(html, /44:58/);
    assert.match(html, /companion-dock-test/);
    assert.match(html, /dock-inspection-2026/);
    assert.match(html, /For this Quest, assume an AI can reliably inspect/);
    assert.match(html, /Shift backlog · local/);
    assert.match(html, /The night is stuck when damaged parcels/);
    assert.match(html, /Ethicist · ethicist/);
    assert.match(html, /Whose interests does your design protect|whose interests does your design protect/i);
    assert.match(html, /reflectionPrompt/);
    assert.match(html, /which constraint mattered most/);
    assert.match(html, /href="https:\/\/www\.youtube\.com\/watch\?v=kAwG9E1W_ME&amp;t=2698"/);
    assert.doesNotMatch(html, /Sponsored/);
    assert.doesNotMatch(html, /Moonshots episode 304, Chamath on diffusion/);
    assert.doesNotMatch(html, /<script/i);
  });

  it("says when a quest has no companion", () => {
    const html = catalogInspectCompanionHtml(null);
    assert.match(html, /No companion/);
    assert.doesNotMatch(html, /Exploration/);
    assert.doesNotMatch(html, /bankId/);
  });

  it("keeps a legacy companion without inventing an exploration", () => {
    const html = catalogInspectCompanionHtml({
      medium: "article",
      move: "milestone",
      collaboration: "independent",
      claim: "A lab reported a bench result.",
      invitation: "Use the reported bench result in this place.",
      source: { title: "Bench note", url: "https://example.com/bench", author: "Test Author" },
      evidence: {
        status: "demonstrated",
        limits: "The report covers one bench. It does not cover a staffed shift.",
        reviewed: "2026-10-21",
      },
    });
    assert.match(html, /No exploration/);
    assert.match(html, /Test Author/);
    assert.doesNotMatch(html, /No grants/);
    assert.doesNotMatch(html, /Sponsored/);
    assert.doesNotMatch(html, /partnerName/);
  });

  it("escapes text and refuses a non-https source link", () => {
    const html = catalogInspectCompanionHtml({
      medium: "article",
      move: "idea",
      claim: `<img src=x onerror="alert(1)">`,
      invitation: "Invent inside the place.",
      source: { title: "Note", url: "javascript:alert(1)", author: "Test Author" },
      evidence: { status: "argued", limits: "This is a proposed mechanism, not a measured result here." },
    });
    assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
    assert.doesNotMatch(html, /href="javascript:/);
    assert.match(html, /javascript:alert\(1\)/);
  });
});

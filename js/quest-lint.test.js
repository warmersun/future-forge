import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { QUEST_TILE_SCHEMA, validateQuestTile, validateQuestDocument } from "./quest-tile.js";
import { lintQuestTile, formatLintWarnings } from "./quest-lint.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TECH_IDS = ["gene-sequencing", "solar", "ai", "iot", "networks"];
const GLOBAL_IDS = ["infectious", "climate", "water"];

const PLACE = [
  "Nurse Amina seals another swab under the corrugated awning at **Crossing Clinic 7**. Three nurses share one bench with travelers and traders. A generator coughs after midnight. She checks the fever sheet taped to the fridge and the pattern does not match what she sees in the queue.",
  "Labeled tubes stack in the cooler. The weekly lab truck already rolled out at dawn, and central results return in days, not hours. By then the person on the bench has moved on. Or the ward is full. Rumors fill the gap first, and the market empties before anyone knows why.",
  "Dr. Okonkwo keeps two ledgers now. One for what the capital lab says weeks later, one for what the queue looks like today. The two rarely agree, and the second ledger is the one that decides who gets a bed tonight. Nobody upstream reads it.",
].join("\n\n");

const STRAIN = [
  "This is how outbreaks stay invisible. Truth lives in a capital lab. The calendar is a truck, not a shift. While samples travel, rumors move first, the wrong ward fills, and the next traveler is already gone across the border with whatever they carried in.",
  "The root is not that this bench lacks a machine. It is a system that only believes a result after it has left the people who needed it, and that pays for answers by the week instead of by the shift. Every clinic on this road lives under the same calendar.",
].join("\n\n");

const JOB =
  "Invent a way this clinic can know what the fever is before the next queue arrives, and a way the next clinic down the road hears it the same day. Stakeholder: **Dr. Okonkwo, clinic lead**.";

const BRIEF = `## The place\n\n${PLACE}\n\n## The bigger problem\n\n${STRAIN}\n\n## Your job\n\n${JOB}\n`;

const GROUNDING = [
  "## Technology",
  "- **emTech:** gene-sequencing",
  "- **Product category:** Portable clinic-rugged pathogen sequencers",
  "## Capabilities",
  "Same-shift provisional reads when power, reagents, and trained staff exist.",
  "## Milestone",
  "Cheaper field-rugged units and software through 2026.",
  "## Honest limits",
  "Power after dusk; no bioinformatics team; trust fragile — pilot language only.",
  "## Unlocks Use Case(s)",
  "Local sample-to-read workflows.",
  "## Applications",
  "Clinic sample-to-isolation protocols; shift-handoff boards.",
].join("\n");

function goodTile() {
  return {
    schema: QUEST_TILE_SCHEMA,
    kind: "quest",
    id: "spotlight-gene-seq-lint",
    title: "The fever sheet at Crossing Clinic 7",
    summary:
      "Nurse Amina seals another swab at Crossing Clinic 7. The fever sheet on the fridge does not match. The lab truck left at dawn — answers take days, and by then the bench is empty or the ward is full.",
    globalId: "infectious",
    placement: { mode: "replace-daily" },
    spotlight: {
      techId: "gene-sequencing",
      advanceTitle: "Rugged same-shift clinic reads",
      advanceSummary: "Portable units got cheaper and tougher.",
      asOf: "2026-07",
      encourageCopy: "Invent a way this clinic can know what the fever is before the next queue arrives.",
    },
    research: {
      topic: "portable sequencing",
      bullets: ["note"],
      sources: [{ title: "NHGRI", url: "https://www.genome.gov/sequencingcosts", accessed: "2026-07-27" }],
    },
    grounding: GROUNDING,
    mission: {
      id: "spotlight-gene-seq-lint",
      globalId: "infectious",
      title: "The fever sheet at Crossing Clinic 7",
      place: "Crossing Clinic 7 (fictive)",
      startYear: 2026,
      collapseYear: 2032,
      yearsPerTurn: 2,
      pressure: {
        local: { label: "Outbreak", description: "The fever pattern is real and invisible while swabs wait on the truck.", pressure: 3, pressureRise: 1, winMax: 1 },
        global: { label: "Blind spots", description: "Every clinic on the road answers to the same weekly truck.", pressure: 2, pressureRise: 1, winMax: 1 },
        support: { label: "Fear", description: "Rumors move before results; traders stop coming.", pressure: 2, pressureRise: 0, winMax: 1 },
      },
      scene:
        "Nurse Amina seals another swab and slides it into the cooler. The fever does not match the sheet on the fridge. The lab truck left at dawn. Answers take days. By then the queue has moved on — or the ward is full. Who can tell her what the fever is before the next queue arrives?",
      briefMd: BRIEF,
      stakeholder: "Dr. Okonkwo, clinic lead",
      suggested: ["gene-sequencing"],
      suggestedWhy: {
        "gene-sequencing": "A rugged bench reader can name the fever during the same shift, before Outbreak spreads past the queue.",
      },
      visionTheme: "care-city",
    },
  };
}

function lint(tile) {
  const v = validateQuestTile(tile, { techIds: TECH_IDS, globalIds: GLOBAL_IDS });
  assert.equal(v.ok, true, JSON.stringify(v.details));
  return lintQuestTile(tile, v).warnings.map((w) => w.code);
}

const has = (codes, prefix) => codes.some((c) => c === prefix || c.startsWith(prefix + ":"));

describe("quest-lint", () => {
  it("a compliant tile lints clean", () => {
    const codes = lint(goodTile());
    assert.deepEqual(codes, [], codes.join("\n"));
  });

  it("flags the spotlight tech named in player text", () => {
    const t = goodTile();
    t.summary = "Nurse Amina waits on gene sequencing at Crossing Clinic 7. The truck left at dawn.";
    assert.ok(has(lint(t), "tech_named_in_player_text:summary"));
    const t2 = goodTile();
    t2.mission.briefMd = BRIEF.replace("Truth lives in a capital lab.", "The sequencer lives in a capital lab.");
    assert.ok(has(lint(t2), "tech_named_in_player_text:briefMd"));
  });

  it("does not flag the family name inside suggestedWhy or grounding", () => {
    const t = goodTile();
    t.mission.suggestedWhy["gene-sequencing"] = "Gene sequencing on the bench names the fever before Outbreak spreads.";
    assert.ok(!has(lint(t), "tech_named_in_player_text"));
  });

  it("flags a theme-word lede", () => {
    const t = goodTile();
    t.summary = "Infectious diseases. This is about how far gene sequencing has to go so clinics can do it on site.";
    assert.ok(lint(t).includes("summary_theme_lede"));
  });

  it("flags encourageCopy that prescribes the tech", () => {
    const t = goodTile();
    t.spotlight.encourageCopy = "Build your invention around the new on-site capability.";
    assert.ok(lint(t).includes("encourage_prescribes_tech"));
  });

  it("flags legacy and unknown headings", () => {
    const t = goodTile();
    t.mission.briefMd = BRIEF.replace("## The bigger problem", "## What's strained") + "\n## Constraints\n\nOne line.\n";
    const codes = lint(t);
    assert.ok(has(codes, "brief_legacy_heading:What's strained"), codes.join("\n"));
    assert.ok(has(codes, "brief_legacy_heading:Constraints"));
    const t2 = goodTile();
    t2.mission.briefMd = BRIEF + "\n## Discourse map\n\nExtra.\n";
    assert.ok(has(lint(t2), "brief_unknown_heading:Discourse map"));
  });

  it("flags job before the story and a missing root-cause section", () => {
    const t = goodTile();
    t.mission.briefMd = `## Your job\n\n${JOB}\n\n## The place\n\n${PLACE}\n`;
    const codes = lint(t);
    assert.ok(codes.includes("brief_heading_order"), codes.join("\n"));
    assert.ok(codes.includes("brief_missing_section:strain"));
  });

  it("flags word count out of band and too many cards", () => {
    const t = goodTile();
    t.mission.briefMd = "## The place\n\nShort.\n\nStill short.\n\n## The bigger problem\n\nTiny.\n\n## Your job\n\nInvent.\n";
    assert.ok(has(lint(t), "brief_words_out_of_band"));
    const t2 = goodTile();
    const many = Array.from({ length: 9 }, (_, i) => `Paragraph ${i} of the place, one idea each, short.`).join("\n\n");
    t2.mission.briefMd = `## The place\n\n${many}\n\n## The bigger problem\n\n${STRAIN}\n\n## Your job\n\n${JOB}\n`;
    const codes = lint(t2);
    assert.ok(has(codes, "brief_cards_over_cap"), codes.join("\n"));
    assert.ok(has(codes, "place_paragraphs_out_of_band:9"));
  });

  it("flags ban-list and policy jobs", () => {
    const t = goodTile();
    t.mission.briefMd = BRIEF.replace("Stakeholder:", "Do not invent a factory. Pass a law if you must. Stakeholder:");
    const codes = lint(t);
    assert.ok(has(codes, "brief_ban_list:Do not invent"), codes.join("\n"));
    assert.ok(has(codes, "brief_ban_list:Pass a law"));
  });

  it("flags meter defaults drift and missing descriptions", () => {
    const t = goodTile();
    t.mission.pressure.support.pressureRise = 1;
    t.mission.pressure.local.pressure = 2;
    delete t.mission.pressure.global.description;
    const codes = lint(t);
    assert.ok(codes.includes("pressure_support_rises"));
    assert.ok(codes.includes("pressure_local_not_hotter"));
    assert.ok(codes.includes("pressure_missing_description:global"));
  });

  it("flags a high starting budget and any resources override", () => {
    const t = goodTile();
    t.resources = { startingBudget: 8, startingWill: 4 };
    assert.ok(lint(t).includes("resources_budget_high"));
    const t2 = goodTile();
    t2.mission.resources = { apMax: 4 };
    assert.ok(lint(t2).includes("resources_present"));
  });

  it("flags missing grounding and Honest limits past the AI clip", () => {
    const t = goodTile();
    delete t.grounding;
    assert.ok(lint(t).includes("grounding_missing"));
    const t2 = goodTile();
    t2.grounding = "## Technology\n" + "filler word ".repeat(400) + "\n## Honest limits\nLate.";
    assert.ok(has(lint(t2), "grounding_limits_past_clip"));
    const t3 = goodTile();
    t3.grounding = GROUNDING + "\n## Discourse map\nTutor notes.";
    assert.ok(has(lint(t3), "grounding_unknown_heading:Discourse map"));
  });

  it("flags empty research sources and placeholders", () => {
    const t = goodTile();
    t.research.sources = [];
    assert.ok(lint(t).includes("research_sources_empty"));
    const t2 = goodTile();
    t2.research.sources = [{ title: "x", url: "https://example.com" }];
    assert.ok(has(lint(t2), "research_source_placeholder"));
  });

  it("flags a suggested tech with no reason or a reason that names no meter", () => {
    const t = goodTile();
    t.mission.suggested = ["gene-sequencing", "iot", "networks"];
    t.mission.suggestedWhy.iot = "Cheap sensors could keep the cooler honest through the night.";
    const v = validateQuestTile(t, { techIds: TECH_IDS, globalIds: GLOBAL_IDS });
    // Validator may still enforce single-suggested; lint reads the authored array either way.
    const stub = v.ok ? v : { ok: true, kind: "quest", mission: { suggested: t.mission.suggested, suggestedWhy: t.mission.suggestedWhy, spotlight: { techId: "gene-sequencing" } } };
    const codes = lintQuestTile(t, stub).warnings.map((w) => w.code);
    assert.ok(codes.includes("suggestedWhy_missing:networks"), codes.join("\n"));
    assert.ok(codes.includes("suggestedWhy_no_meter_label:iot"));
    assert.ok(!codes.includes("suggestedWhy_missing:gene-sequencing"));
  });

  it("flags UI jargon in player copy and meter labels", () => {
    const t = goodTile();
    t.mission.pressure.local.description = "The overlay shows the fever pattern.";
    assert.ok(has(lint(t), "do_not_say:pressure.local.description:overlay"));
  });

  it("flags scaffold placeholders", () => {
    const t = goodTile();
    t.title = "What went wrong at this place";
    assert.ok(lint(t).includes("template_placeholder:title"));
  });

  it("flags lesson without totalLessons and learning without tutor context", () => {
    const t = goodTile();
    t.isLearningModule = true;
    t.module = "Fever reads";
    t.lesson = 1;
    const codes = lint(t);
    assert.ok(codes.includes("learning_lesson_without_total"), codes.join("\n"));
    assert.ok(codes.includes("learning_no_tutor_context"));
  });

  it("lints a module wrapper on wrapper fields only", () => {
    const wrapper = {
      schema: QUEST_TILE_SCHEMA,
      kind: "module",
      id: "module-lint",
      title: "Fever reads on the border road",
      summary: "Infectious diseases. This is about how far gene sequencing has to go.",
      globalId: "infectious",
      module: "Fever reads",
      lessons: ["spotlight-gene-seq-lint"],
      spotlight: { techId: "gene-sequencing" },
    };
    const v = validateQuestDocument(wrapper, { techIds: TECH_IDS, globalIds: GLOBAL_IDS });
    assert.equal(v.ok, true, JSON.stringify(v.details));
    const codes = lintQuestTile(wrapper, v).warnings.map((w) => w.code);
    assert.ok(codes.includes("summary_theme_lede"));
    assert.ok(has(codes, "tech_named_in_player_text:summary"));
    assert.ok(!codes.includes("grounding_missing"));
  });

  it("formatLintWarnings prints WARN lines", () => {
    const lines = formatLintWarnings([{ code: "x", hint: "y" }]);
    assert.deepEqual(lines, ["WARN x: y"]);
  });

  it("the skill's gene-seq fixture lints clean", () => {
    const raw = JSON.parse(
      readFileSync(join(ROOT, "skills/future-forge-quest/examples/spotlight-gene-seq.json"), "utf8")
    );
    const v = validateQuestDocument(raw);
    assert.equal(v.ok, true, JSON.stringify(v.details));
    const codes = lintQuestTile(raw, v).warnings.map((w) => w.code);
    assert.deepEqual(codes, []);
  });
});

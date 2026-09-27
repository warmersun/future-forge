import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { SEARCH_SYSTEM_LINE } from "./ai-search.mjs";
import { FAST_EVAL_MODES } from "./fast-eval.mjs";
import {
  buildImageLlmInspect,
  buildLlmInspect,
  joinPromptPart,
  splitImagePrompt,
  splitSystemPrompt,
  splitUserPrompt,
} from "./llm-inspect.mjs";

const CO_INVENTOR = `You are the co-inventor.

Role:
- Partner.

Scrutiny / challenge angles (plain language, local, specific):
1. moloch

Hard rules:
- Stay local.

Respond with a single JSON object (no markdown fences):
{ "message": "string" }
`;

const TUTOR = `You are the tutor.

Role:
- Patient tutor.

Tutor style (hard rules for teaching):
- One idea.

Ending tutoring (important):
- endTutoring when ready.

Modes:
- chat

Respond with a single JSON object (no markdown fences) like the co-inventor:
{ "message": "string" }
`;

const FAST_SYSTEM = `You score ONE invention pathway in Future Forge.
Return JSON only:
{"crisisDelta":{}}`;

describe("splitSystemPrompt", () => {
  it("splits co-inventor headings and joins back to the exact string", () => {
    const sections = splitSystemPrompt(CO_INVENTOR);
    assert.deepEqual(
      sections.map((s) => s.id),
      ["intro", "role", "scrutiny", "rules", "contract"]
    );
    assert.equal(sections.find((s) => s.id === "rules").tone, "warn");
    assert.equal(sections.find((s) => s.id === "contract").tone, "contract");
    assert.equal(joinPromptPart(sections, "system"), CO_INVENTOR);
  });

  it("splits tutor headings including tutor style, ending, and modes", () => {
    const sections = splitSystemPrompt(TUTOR);
    assert.deepEqual(
      sections.map((s) => s.id),
      ["intro", "role", "tutor-style", "ending", "modes", "contract"]
    );
    assert.equal(joinPromptPart(sections, "system"), TUTOR);
  });

  it("keeps a fast-eval system string as one System section", () => {
    const sections = splitSystemPrompt(FAST_SYSTEM);
    assert.equal(sections.length, 1);
    assert.equal(sections[0].id, "system");
    assert.equal(sections[0].label, "System");
    assert.equal(joinPromptPart(sections, "system"), FAST_SYSTEM);
  });

  it("peels the search addendum into its own section", () => {
    const text = `${FAST_SYSTEM}\n${SEARCH_SYSTEM_LINE}`;
    const sections = splitSystemPrompt(text);
    assert.equal(sections.at(-1).id, "search");
    assert.equal(sections.at(-1).text, SEARCH_SYSTEM_LINE);
    assert.equal(joinPromptPart(sections, "system"), text);
  });
});

describe("splitUserPrompt", () => {
  it("splits preamble, session JSON, and close, and quotes modeInstruction", () => {
    const state = JSON.stringify(
      { mode: "chat", modeInstruction: "Teach the stack." },
      null,
      2
    );
    const text =
      `Co-invention session state and conversation (JSON):\n${state}\n\n` +
      `Respond with the required JSON object only.`;
    const sections = splitUserPrompt(text);
    assert.deepEqual(
      sections.map((s) => s.id),
      ["preamble", "mode-instruction", "state", "close"]
    );
    assert.equal(sections[1].quote, true);
    assert.equal(sections[1].text, "Teach the stack.");
    assert.equal(sections[1].tone, "instruction");
    assert.equal(joinPromptPart(sections, "user"), text);
  });

  it("splits a fast-eval task prefix without a mode instruction", () => {
    const state = JSON.stringify({ pathway: { inventions: [] } });
    const text = `Score this pathway (JSON state):\n${state}\n\nJSON only.`;
    const sections = splitUserPrompt(text);
    assert.deepEqual(
      sections.map((s) => s.id),
      ["preamble", "state", "close"]
    );
    assert.equal(sections[0].label, "Task");
    assert.equal(sections[2].text, "\n\nJSON only.");
    assert.equal(joinPromptPart(sections, "user"), text);
  });

  it("leaves a single JSON user message as one section", () => {
    const text = JSON.stringify({ setting: { place: "Harbor" } });
    const sections = splitUserPrompt(text);
    assert.equal(sections.length, 1);
    assert.equal(sections[0].id, "user");
    assert.equal(joinPromptPart(sections, "user"), text);
  });
});

describe("splitImagePrompt", () => {
  it("splits vision frame, setting, happening, and tone", () => {
    const text = [
      "Photorealistic documentary still, 16:9.",
      "",
      "SETTING (this place only):",
      "A harbor clinic.",
      "",
      "WHAT IS HAPPENING IN THIS FRAME:",
      "A nurse wheels a cooler.",
      "",
      "Tone: hopeful; human-scale.",
    ].join("\n");
    const sections = splitImagePrompt(text);
    assert.deepEqual(
      sections.map((s) => s.id),
      ["intro", "setting", "happening", "tone"]
    );
    assert.equal(joinPromptPart(sections, "user"), text);
  });

  it("keeps an idea-image sentence as one image prompt", () => {
    const text = "Photoreal 4:3 documentary still. Natural light. A clinic yard.";
    const sections = splitImagePrompt(text);
    assert.equal(sections.length, 1);
    assert.equal(sections[0].label, "Image prompt");
    assert.equal(joinPromptPart(sections, "user"), text);
  });
});

describe("buildLlmInspect", () => {
  it("keeps exact system and user strings and the raw output", () => {
    const user =
      `Co-invention session state and conversation (JSON):\n${JSON.stringify({ modeInstruction: "Go." }, null, 2)}\n\n` +
      `Respond with the required JSON object only.`;
    const bundle = buildLlmInspect({
      system: CO_INVENTOR,
      user,
      model: "grok-4.7",
      temperature: 0,
      maxOutputTokens: 200,
      reasoning: { effort: "low" },
      tools: [{ type: "web_search" }, { type: "x_search" }],
      sent: true,
      rawOutput: '{"message":"ok"}',
    });
    assert.equal(bundle.kind, "text");
    assert.equal(bundle.system, CO_INVENTOR);
    assert.equal(bundle.user, user);
    assert.equal(joinPromptPart(bundle.sections, "system"), CO_INVENTOR);
    assert.equal(joinPromptPart(bundle.sections, "user"), user);
    assert.equal(bundle.rawOutput, '{"message":"ok"}');
    assert.equal(bundle.temperature, 0);
    assert.equal(bundle.reasoning, "low");
    assert.deepEqual(bundle.tools, ["web_search", "x_search"]);
    assert.equal(bundle.sent, true);
  });

  it("records a local miss as not sent and empty raw output", () => {
    const bundle = buildLlmInspect({
      system: FAST_SYSTEM,
      user: "JSON only.",
      sent: false,
      note: "local",
      rawOutput: "",
    });
    assert.equal(bundle.sent, false);
    assert.equal(bundle.note, "local");
    assert.equal(bundle.rawOutput, "");
    assert.equal(bundle.temperature, null);
  });
});

describe("buildImageLlmInspect", () => {
  it("nests a director text bundle and keeps the image prompt exact", () => {
    const prompt = "Photoreal still of a harbor.";
    const bundle = buildImageLlmInspect({
      prompt,
      model: "grok-imagine-image",
      imageMode: "generate",
      sent: true,
      director: {
        system: FAST_SYSTEM,
        user: '{"place":"Harbor"}',
        model: "grok-4.7",
        temperature: 0.2,
        sent: true,
        rawOutput: '{"mode":"generate"}',
      },
    });
    assert.equal(bundle.kind, "image");
    assert.equal(bundle.user, prompt);
    assert.equal(joinPromptPart(bundle.sections, "user"), prompt);
    assert.equal(bundle.director.kind, "text");
    assert.equal(bundle.director.rawOutput, '{"mode":"generate"}');
    assert.equal(bundle.director.system, FAST_SYSTEM);
  });
});

function extractTemplate(source, name) {
  const marker = `const ${name} = \``;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, name);
  let i = start + marker.length;
  let out = "";
  while (i < source.length) {
    const ch = source[i];
    if (ch === "\\") {
      out += ch + (source[i + 1] || "");
      i += 2;
      continue;
    }
    if (ch === "`") break;
    out += ch;
    i += 1;
  }
  return out;
}

describe("live prompt templates", () => {
  it("splits every fast-eval system string back to itself", () => {
    for (const [mode, spec] of Object.entries(FAST_EVAL_MODES)) {
      const sections = splitSystemPrompt(spec.system);
      assert.equal(joinPromptPart(sections, "system"), spec.system, mode);
    }
  });

  it("splits the co-inventor and tutor templates in both servers", () => {
    for (const file of ["server.mjs", "portal/server.mjs"]) {
      const source = fs.readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");
      for (const name of ["SYSTEM_PROMPT", "TUTOR_SYSTEM_PROMPT"]) {
        const text = extractTemplate(source, name);
        assert.equal(joinPromptPart(splitSystemPrompt(text), "system"), text, `${file} ${name}`);
      }
    }
  });
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  PROMPT_SECTIONS,
  KEYTERM_MAX,
  KEYTERM_LEN,
  buildVoiceInstructions,
  buildVoiceKeyterms,
  buildSessionUpdate,
  instructionSectionHeadings,
  SNAPSHOT_TECH_MAX,
  inventStateSnapshot,
  voiceToolSchemas,
} from "./voice-prompt.mjs";

const techs = [
  { id: "synbio", name: "Synthetic Biology", domain: "lifeforce" },
  { id: "ai", name: "AI", domain: "automator" },
  { id: "iot", name: "IoT", domain: "portal" },
];

const hexCtx = {
  hexInvent: true,
  tutorMode: false,
  year: 2028,
  place: "Rotterdam",
  challenge: { title: "Hold the seawall", problem: "Storm surge eats the quay." },
  selectedTechIds: ["synbio"],
  availableTechs: techs,
  pressure: { Floods: 4, Trust: 2 },
  hexBoard: {
    pathways: [{ howText: "Living kelp baffles cut the wake.", inventionIds: ["t1"] }],
  },
};

const legacyCtx = {
  hexInvent: false,
  tutorMode: true,
  year: 2027,
  place: "Accra",
  challenge: { title: "Cool the clinic" },
  selectedTechIds: ["iot"],
  availableTechs: techs,
  inventionHow: "A shaded courtyard with a cheap heat pump.",
  inventionImpact: "Nurses stop losing vaccines to afternoon heat.",
  inventionName: "Shade pump",
  pressure: [{ label: "Heat", level: 3 }],
};

describe("buildVoiceInstructions", () => {
  it("uses the documented H2 order", () => {
    const text = buildVoiceInstructions(hexCtx);
    assert.deepEqual(instructionSectionHeadings(text), PROMPT_SECTIONS);
  });

  it("bakes hex facts and forbids draft_life", () => {
    const text = buildVoiceInstructions(hexCtx);
    assert.match(text, /Rotterdam/);
    assert.match(text, /2028/);
    assert.match(text, /Hold the seawall/);
    assert.match(text, /Living kelp baffles/);
    assert.match(text, /Do not call `draft_life`/);
    assert.match(text, /hex board/i);
    assert.doesNotMatch(text, /Shade pump/);
  });

  it("omits crisis-meter levels while metrics are being re-checked", () => {
    const text = buildVoiceInstructions({ ...hexCtx, metricsPending: true });
    assert.match(text, /being re-checked/);
    assert.doesNotMatch(text, /Floods 4/);
    assert.doesNotMatch(text, /Trust 2/);
    const settled = buildVoiceInstructions(hexCtx);
    assert.match(settled, /Floods 4/);
  });

  it("bakes legacy how/life and tutor end_tutoring", () => {
    const text = buildVoiceInstructions(legacyCtx);
    assert.match(text, /Accra/);
    assert.match(text, /shaded courtyard/);
    assert.match(text, /Nurses stop losing/);
    assert.match(text, /end_tutoring/);
    assert.match(text, /tutor/i);
    assert.doesNotMatch(text, /Do not call `draft_life`/);
  });
});

describe("buildVoiceKeyterms", () => {
  it("includes place, crises, and tech names with caps", () => {
    const terms = buildVoiceKeyterms(hexCtx);
    assert.ok(terms.includes("Rotterdam"));
    assert.ok(terms.includes("Floods"));
    assert.ok(terms.includes("Synthetic Biology"));
    assert.ok(terms.includes("synbio"));
    assert.ok(terms.length <= KEYTERM_MAX);
    assert.ok(terms.every((t) => t.length <= KEYTERM_LEN));
  });

  it("dedupes and caps at KEYTERM_MAX", () => {
    const many = Array.from({ length: 80 }, (_, i) => ({
      id: `t${i}`,
      name: `Tech Name Number ${i} extra words here`,
    }));
    const terms = buildVoiceKeyterms({
      place: "X",
      availableTechs: many,
      selectedTechIds: many.map((t) => t.id),
    });
    assert.ok(terms.length <= KEYTERM_MAX);
    const lower = terms.map((t) => t.toLowerCase());
    assert.equal(new Set(lower).size, lower.length);
  });
});

describe("inventStateSnapshot / session.update", () => {
  it("omits legacy how on hex and lists available techs", () => {
    const snap = inventStateSnapshot({
      ...hexCtx,
      inventionHow: "should not appear",
    });
    assert.equal(snap.hexInvent, true);
    assert.equal(snap.how, "");
    assert.equal(snap.pathways[0].howText.includes("kelp"), true);
    assert.equal(snap.availableTechs.length, 3);
    assert.equal(snap.metricsPending, false);
    assert.equal(snap.pressure.some((p) => p.label === "Floods" && p.level === 4), true);
  });

  it("omits meter levels from the snapshot while metricsPending", () => {
    const snap = inventStateSnapshot({ ...hexCtx, metricsPending: true });
    assert.equal(snap.metricsPending, true);
    assert.deepEqual(snap.pressure, []);
  });

  it("caps a huge availableTechs list", () => {
    const many = Array.from({ length: SNAPSHOT_TECH_MAX + 40 }, (_, i) => ({
      id: `t${i}`,
      name: `Tech ${i}`,
    }));
    const snap = inventStateSnapshot({ ...hexCtx, availableTechs: many });
    assert.equal(snap.availableTechs.length, SNAPSHOT_TECH_MAX);
  });

  it("includes a spotlight note when the quest has one", () => {
    const text = buildVoiceInstructions({
      ...hexCtx,
      spotlightTechId: "synbio",
      guidance: "Pilot the kelp baffles first.",
    });
    assert.match(text, /Spotlight emTech id: synbio/);
    assert.match(text, /Pilot the kelp baffles first/);
  });

  it("session.update pins voice, VAD, tools, and transcribe", () => {
    const msg = buildSessionUpdate(hexCtx, { voice: "eve" });
    assert.equal(msg.type, "session.update");
    assert.equal(msg.session.voice, "eve");
    assert.equal(buildSessionUpdate(hexCtx, { voice: "ARA" }).session.voice, "ara");
    assert.equal(buildSessionUpdate(hexCtx, { voice: "nope" }).session.voice, "eve");
    assert.equal(msg.session.reasoning.effort, "none");
    assert.equal(msg.session.turn_detection.type, "server_vad");
    assert.equal(msg.session.resumption, undefined);
    assert.equal(msg.session.audio.input.transcription.model, "grok-transcribe");
    const names = msg.session.tools.map((t) => t.name);
    assert.deepEqual(names, [
      "get_invent_state",
      "suggest_techs",
      "draft_how",
      "draft_life",
      "end_tutoring",
    ]);
    assert.equal(voiceToolSchemas().length, 5);
  });
});

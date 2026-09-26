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
  listVoiceConcerns,
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
    assert.match(text, /target mint/);
    assert.match(text, /target pathway/);
    assert.doesNotMatch(text, /draft_life/);
    assert.doesNotMatch(text, /daily life/i);
    assert.doesNotMatch(text, /essay/);
    assert.match(text, /hex board/i);
    assert.doesNotMatch(text, /Shade pump/);
  });

  it("names a judged convergence and stays quiet when the board has none", () => {
    const plain = buildVoiceInstructions(hexCtx);
    assert.doesNotMatch(plain, /Convergences already/);
    assert.doesNotMatch(plain, /daily life/i);
    assert.doesNotMatch(plain, /essay/);
    assert.deepEqual(inventStateSnapshot(hexCtx).convergences, []);

    const ctx = {
      ...hexCtx,
      hexBoard: {
        ...hexCtx.hexBoard,
        convergences: [
          {
            tileIds: ["a", "b"],
            techIds: ["materials", "quantum"],
            techNames: ["Materials science", "Quantum simulation"],
            title: "Materials science and quantum simulation",
            reason: "Better coatings pull demand back onto quantum queues.",
            factor: 1.25,
          },
        ],
      },
    };
    const text = buildVoiceInstructions(ctx);
    assert.match(text, /Convergences already on the board/);
    assert.match(text, /Materials science and Quantum simulation/);
    assert.match(text, /Materials science and quantum simulation/);
    assert.match(text, /quantum queues/);
    assert.match(text, /Do not claim a convergence that is not listed/);
    assert.doesNotMatch(text, /daily life/i);
    assert.doesNotMatch(text, /essay/);
    const snap = inventStateSnapshot(ctx);
    assert.equal(snap.convergences.length, 1);
    assert.deepEqual(snap.convergences[0].techNames, [
      "Materials science",
      "Quantum simulation",
    ]);
    assert.equal(snap.convergences[0].title, "Materials science and quantum simulation");
    assert.match(snap.convergences[0].reason, /quantum queues/);
    assert.equal(snap.convergences[0].factor, 1.25);
  });

  it("names placed challenger concern tiles and stays quiet about ones not on the board", () => {
    const plain = buildVoiceInstructions(hexCtx);
    assert.match(plain, /No challenger concern tiles are on the board yet/);
    assert.doesNotMatch(plain, /Moloch/);
    assert.deepEqual(inventStateSnapshot(hexCtx).concerns, []);
    assert.deepEqual(listVoiceConcerns(hexCtx), []);

    const ctx = {
      ...hexCtx,
      hexBoard: {
        ...hexCtx.hexBoard,
        givens: [
          {
            id: "crisis-local",
            kind: "crisis",
            name: "Floods",
            role: "local",
            lamp: "red",
            q: 0,
            r: 0,
          },
          {
            id: "concern-moloch",
            kind: "concern",
            name: "Moloch",
            angle: "moloch",
            lamp: "red",
            q: 0,
            r: 4,
            challengeSpeech: "Freeriders eat the pilot.",
            challengeQuestion: "Who defects?",
            playerAnswer: "A bonded escrow pays only after proof.",
          },
          {
            id: "concern-nature",
            kind: "concern",
            angle: "nature",
            lamp: "yellow",
            q: null,
            r: null,
            challengeSpeech: "Not placed yet.",
          },
        ],
      },
    };
    const text = buildVoiceInstructions(ctx);
    assert.match(text, /Challenger concern tiles on the board/);
    assert.match(text, /Moloch, light red/);
    assert.match(text, /Freeriders eat the pilot/);
    assert.match(text, /Question: Who defects\?/);
    assert.match(text, /Written answer: A bonded escrow pays only after proof/);
    assert.match(text, /Do not claim a challenger that is not listed/);
    assert.doesNotMatch(text, /Not placed yet/);
    assert.doesNotMatch(text, /Mother Nature/);
    assert.doesNotMatch(text, /Floods, light/);
    const snap = inventStateSnapshot(ctx);
    assert.equal(snap.concerns.length, 1);
    assert.equal(snap.concerns[0].id, "concern-moloch");
    assert.equal(snap.concerns[0].angle, "moloch");
    assert.equal(snap.concerns[0].lamp, "red");
    assert.match(snap.concerns[0].speech, /Freeriders/);
    assert.equal(snap.concerns[0].question, "Who defects?");
    assert.match(snap.concerns[0].answer, /escrow/);

    const pending = buildVoiceInstructions({ ...ctx, metricsPending: true });
    assert.match(pending, /Moloch/);
    assert.match(pending, /Who defects\?/);
    assert.doesNotMatch(pending, /light red/);
    assert.match(pending, /Do not quote concern light colors/);
    assert.equal(inventStateSnapshot({ ...ctx, metricsPending: true }).concerns[0].lamp, null);
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

  it("lists lesson media ids and keeps speech free of URLs", () => {
    const text = buildVoiceInstructions({
      ...legacyCtx,
      aiTutorContext:
        "SEQUENCE: offer [Page 07](https://warmersun.com/lessons/p07.html).\nILLUSTRATIONS:\n- ![Software that can pay](https://warmersun.com/lessons/i07.png)",
    });
    assert.match(text, /show_lesson_media/);
    assert.match(text, /img1/);
    assert.match(text, /link1/);
    assert.match(text, /Software that can pay/);
    assert.match(text, /Spoken word only/);
    assert.doesNotMatch(text, /https?:\/\//);
  });
});

describe("buildVoiceKeyterms", () => {
  it("includes place, crises, challengers, and tech names with caps", () => {
    const terms = buildVoiceKeyterms({
      ...hexCtx,
      hexBoard: {
        ...hexCtx.hexBoard,
        givens: [
          {
            id: "concern-moloch",
            kind: "concern",
            name: "Moloch",
            angle: "moloch",
            q: 1,
            r: 0,
          },
        ],
      },
    });
    assert.ok(terms.includes("Rotterdam"));
    assert.ok(terms.includes("Floods"));
    assert.ok(terms.includes("Moloch"));
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
      "show_lesson_media",
      "end_tutoring",
    ]);
    assert.equal(voiceToolSchemas(hexCtx).length, 5);
    assert.equal(
      voiceToolSchemas(legacyCtx).some((tool) => tool.name === "draft_life"),
      true
    );
    assert.equal(msg.session.tools.some((tool) => tool.name === "draft_life"), false);
  });
});

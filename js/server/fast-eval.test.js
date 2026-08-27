/**
 * Fast eval: lean payloads and exact JSON — no co-inventor envelope.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  FAST_EVAL_MODES,
  SCORE_PATHWAY_SYSTEM,
  ASSESS_FEASIBILITY_SYSTEM,
  EVALUATE_CONVERGENCE_SYSTEM,
  IDEA_SPARKS_SYSTEM,
  POSE_CHALLENGE_SYSTEM,
  GROUNDING_LINE,
  ASSESS_GROUNDING_LINE,
  CONVERGENCE_GROUNDING_LINE,
  buildFastPayload,
  sanitizeFast,
  isFastEvalMode,
} from "./fast-eval.mjs";

const ENVELOPE_KEYS = ["proposals", "teaching", "addTechIds"];

describe("FAST_EVAL_MODES", () => {
  it("covers judge/eval modes and not conversational invent", () => {
    for (const m of [
      "score-pathway",
      "assess-feasibility",
      "evaluate-convergence",
      "idea-sparks",
      "pose-challenge",
      "judge-scrutiny-move",
      "judge-challenge",
      "judge-contribution",
      "coach-challenge",
      "draft-challenge",
    ]) {
      assert.equal(isFastEvalMode(m), true, m);
    }
    assert.equal(isFastEvalMode("chat"), false);
    assert.equal(isFastEvalMode("draft-how"), false);
    assert.equal(isFastEvalMode("scrutinize"), false);
  });

  it("system prompts do not require the co-inventor envelope", () => {
    for (const [mode, spec] of Object.entries(FAST_EVAL_MODES)) {
      assert.equal(
        /"proposals"/.test(spec.system),
        false,
        `${mode} system still mentions proposals`
      );
      assert.ok(spec.maxOutputTokens > 0);
    }
    assert.match(SCORE_PATHWAY_SYSTEM, /crisisDelta/);
    assert.match(SCORE_PATHWAY_SYSTEM, /challengeSpeech/);
    assert.match(SCORE_PATHWAY_SYSTEM, /description/i);
    assert.match(ASSESS_FEASIBILITY_SYSTEM, /"timing"/);
    assert.match(IDEA_SPARKS_SYSTEM, /"ideas"/);
    assert.match(POSE_CHALLENGE_SYSTEM, /challengeSpeech/);
    assert.equal(POSE_CHALLENGE_SYSTEM.includes("teaching"), false);
  });

  it("assess grounding is contradiction-only; other modes keep inventory authority", () => {
    assert.match(ASSESS_GROUNDING_LINE, /authoritative only on contradiction/i);
    assert.match(ASSESS_GROUNDING_LINE, /not a closed inventory/i);
    assert.match(ASSESS_FEASIBILITY_SYSTEM, /exists or is demonstrated by year/);
    assert.match(ASSESS_FEASIBILITY_SYSTEM, /no pilot tax/);
    assert.match(ASSESS_FEASIBILITY_SYSTEM, /Never red or yellow merely/);
    assert.equal(ASSESS_FEASIBILITY_SYSTEM.includes(ASSESS_GROUNDING_LINE), true);
    assert.equal(ASSESS_FEASIBILITY_SYSTEM.includes(GROUNDING_LINE), false);
    assert.equal(SCORE_PATHWAY_SYSTEM.includes(GROUNDING_LINE), true);
    assert.equal(IDEA_SPARKS_SYSTEM.includes(GROUNDING_LINE), true);
    assert.equal(POSE_CHALLENGE_SYSTEM.includes(GROUNDING_LINE), true);
    assert.equal(EVALUATE_CONVERGENCE_SYSTEM.includes(CONVERGENCE_GROUNDING_LINE), true);
    assert.equal(EVALUATE_CONVERGENCE_SYSTEM.includes(GROUNDING_LINE), false);
    assert.match(EVALUATE_CONVERGENCE_SYSTEM, /demand loop/i);
    // Regression: kettle-ford "small cargo hoppers" examples must not veto a
    // demonstrated 2026 cooperative 500 kg formation lift (not a contradiction).
    assert.match(ASSESS_FEASIBILITY_SYSTEM, /Omission is not a contradiction/);
    assert.match(
      ASSESS_FEASIBILITY_SYSTEM,
      /Different category.*not.*does not exist this year/i
    );
  });
});

describe("buildFastPayload", () => {
  it("score-pathway omits catalog, conversation, and invent drafts", () => {
    const p = buildFastPayload("score-pathway", {
      pathway: {
        howText: "The pair radios the crest together.",
        inventions: [
          {
            id: "secret-id",
            name: "SecretName",
            techId: "ai",
            howText: "Sensors alert flood crews along the corridor.",
            timingLevel: "yellow",
            year: 2026,
          },
        ],
      },
      place: "Portside",
      year: 2026,
      missionTitle: "Floods",
      scene: "The alley floods.",
      grounding: "x".repeat(5000),
      pressureBase: { Floods: 3 },
      winMax: { Floods: 2 },
      crisisRoles: [
        {
          role: "local",
          name: "Floods",
          meterKey: "Floods",
          description: "The quay goes under every spring tide.",
        },
      ],
      concerns: [
        {
          angle: "moloch",
          challengeSpeech: "Freeriders eat the pilot.",
          challengeQuestion: "Who defects?",
          playerAnswer: "A" + "a".repeat(2500),
          answerQuality: "hit",
        },
      ],
      availableTechs: [{ id: "ai", name: "AI", maturity: { now: "lots" } }],
      inventionHow: "should not appear",
    });
    const json = JSON.stringify(p);
    assert.equal(p.availableTechs, undefined);
    assert.equal(p.conversation, undefined);
    assert.equal(p.inventionHow, undefined);
    assert.equal(p.pathway.inventions[0].name, undefined);
    assert.equal(p.pathway.inventions[0].techId, "ai");
    assert.equal(p.concerns[0].challengeSpeech, "Freeriders eat the pilot.");
    assert.equal(p.pathway.howText, "The pair radios the crest together.");
    assert.match(p.pathway.inventions[0].howText, /Sensors alert/);
    assert.equal(p.pathway.inventions[0].techId, "ai");
    assert.equal(p.concerns[0].challengeQuestion, "Who defects?");
    assert.equal(p.concerns[0].analysis, undefined);
    assert.ok(p.concerns[0].playerAnswer.length <= 2000);
    assert.equal(p.concerns[0].answerQuality, "hit");
    assert.ok(p.grounding.length <= 3000);
    assert.equal(json.includes("SecretName"), false);
    assert.equal(json.includes("should not appear"), false);
    assert.equal(
      p.crisisRoles[0].description,
      "The quay goes under every spring tide."
    );
    for (const k of ENVELOPE_KEYS) {
      assert.equal(json.includes(k), false, k);
    }
  });

  it("score-pathway clips and defaults crisis description", () => {
    const long = buildFastPayload("score-pathway", {
      pathway: { inventions: [] },
      crisisRoles: [
        {
          role: "local",
          name: "Floods",
          meterKey: "Floods",
          description: "y".repeat(500),
        },
      ],
    });
    assert.equal(long.crisisRoles[0].description.length, 400);
    const empty = buildFastPayload("score-pathway", {
      pathway: { inventions: [] },
      crisisRoles: [{ role: "local", name: "Floods", meterKey: "Floods" }],
    });
    assert.equal(empty.crisisRoles[0].description, "");
  });

  it("assess-feasibility is how + stack only", () => {
    const p = buildFastPayload("assess-feasibility", {
      inventionHow: "Pilot corridor sensors with a city partner.",
      year: 2026,
      place: "Portside",
      selectedTechIds: ["ai"],
      availableTechs: [
        {
          id: "ai",
          name: "AI",
          summary: "Models.",
          maturity: { now: "huge" },
          milestones: ["a", "b"],
        },
      ],
      priorTiming: { level: "yellow", year: 2026 },
    });
    assert.equal(p.stack.length, 1);
    assert.equal(p.stack[0].maturity, undefined);
    assert.equal(p.availableTechs, undefined);
    assert.equal(p.timing, undefined);
    assert.equal(p.priorTiming.level, "yellow");
  });

  it("idea-sparks sends one focus tech, not a catalog", () => {
    const p = buildFastPayload("idea-sparks", {
      focusTechId: "ai",
      year: 2026,
      place: "Portside",
      availableTechs: [
        { id: "ai", name: "AI", summary: "Models." },
        { id: "drones", name: "Drones", summary: "Fly." },
      ],
      refresh: true,
      avoidTitles: ["Old Spark"],
    });
    assert.equal(p.focusTech.id, "ai");
    assert.equal(p.refresh, true);
    assert.deepEqual(p.avoidTitles, ["Old Spark"]);
  });

  it("evaluate-convergence payload includes names and tech names", () => {
    const p = buildFastPayload("evaluate-convergence", {
      placed: {
        id: "a",
        name: "Light pack",
        techId: "batteries",
        techName: "Batteries",
        howText: "High capacity, light cells.",
      },
      neighbors: [
        {
          id: "b",
          name: "Clinic drone",
          techId: "drones",
          techName: "Drones",
          howText: "Blood hops.",
        },
      ],
      year: 2026,
      place: "Portside",
    });
    assert.equal(p.placed.name, "Light pack");
    assert.equal(p.placed.techName, "Batteries");
    assert.equal(p.neighbors[0].name, "Clinic drone");
    assert.equal(p.neighbors[0].techName, "Drones");
    assert.equal(p.neighbors[0].id, "b");
  });

  it("pose payload has no proposals key", () => {
    const p = buildFastPayload("pose-challenge", {
      challengeAngle: "moloch",
      pathway: { howText: "A shared meter.", inventions: [] },
      place: "Portside",
      year: 2026,
      selectedTechIds: ["ai"],
      availableTechs: [{ id: "ai", name: "AI", summary: "x" }],
    });
    assert.equal(p.challengeAngle, "moloch");
    assert.equal(p.proposals, undefined);
    assert.equal(p.inventionName, undefined);
    assert.equal(p.pathway.howText, "A shared meter.");
  });

  it("pose and judge send pathway inventions, not an invention name", () => {
    const ctx = {
      challengeAngle: "moloch",
      inventionName: "SecretName",
      inventionHow: "should not be the only how",
      pathway: {
        howText: "The pair radios the crest together.",
        inventions: [
          { techId: "ai", howText: "Sensors on the quay.", timingLevel: "green" },
          { techId: "iot", howText: "Mesh radios the crest.", timingLevel: "yellow" },
        ],
      },
      concernPathway: {
        anyTouch: true,
        inventions: [
          { techId: "ai", howText: "Sensors on the quay.", timingLevel: "green" },
        ],
      },
      playerAnswer: "Bonded escrow after proof.",
    };
    const pose = buildFastPayload("pose-challenge", ctx);
    assert.equal(pose.inventionName, undefined);
    assert.equal(pose.inventionHow, undefined);
    assert.equal(pose.pathway.inventions.length, 2);
    assert.equal(pose.pathway.howText, "The pair radios the crest together.");
    assert.match(pose.pathway.inventions[0].howText, /Sensors on the quay/);
    assert.match(pose.pathway.inventions[1].howText, /Mesh radios/);

    const judge = buildFastPayload("judge-challenge", ctx);
    assert.equal(judge.inventionName, undefined);
    assert.equal(judge.inventionHow, undefined);
    assert.equal(judge.pathway.anyTouch, true);
    assert.equal(judge.pathway.inventions[0].techId, "ai");
    assert.ok(!JSON.stringify(pose).includes("SecretName"));
    assert.ok(!JSON.stringify(judge).includes("SecretName"));
  });

  it("unset island how stays empty; member tile howTexts are not joined", () => {
    const p = buildFastPayload("score-pathway", {
      pathway: {
        inventions: [
          { techId: "ai", howText: "Part A.", timingLevel: "green" },
          { techId: "iot", howText: "Part B.", timingLevel: "yellow" },
        ],
      },
      year: 2026,
      place: "Portside",
    });
    assert.equal(p.pathway.howText, "");
    assert.equal(p.pathway.inventions[0].howText, "Part A.");
    assert.equal(p.pathway.inventions[1].howText, "Part B.");
  });
});

describe("sanitizeFast", () => {
  it("score-pathway returns only crisisDelta + concerns", () => {
    const out = sanitizeFast(
      "score-pathway",
      {
        message: "hi",
        proposals: { addTechIds: ["ai"] },
        crisisDelta: { local: -9, global: 3, support: 0.2 },
        concerns: { moloch: { level: "yellow", reason: "ok" } },
      },
      "ai"
    );
    assert.equal(out.message, undefined);
    assert.equal(out.proposals, undefined);
    assert.equal(out.crisisDelta.local, -2);
    assert.equal(out.crisisDelta.global, 1);
    assert.equal(out.concerns.moloch.level, "yellow");
  });

  it("assess-feasibility returns only timing", () => {
    const out = sanitizeFast(
      "assess-feasibility",
      { timing: { level: "green", reason: "Pilot honest." }, message: "nope" },
      "ai"
    );
    assert.deepEqual(out.timing, { level: "green", reason: "Pilot honest." });
    assert.equal(out.message, undefined);
  });

  it("pose drops proposals envelope", () => {
    const out = sanitizeFast(
      "pose-challenge",
      {
        angle: "moloch",
        angleLabel: "Moloch",
        challengeSpeech: "Freeriders win.",
        challengeQuestion: "Who defects?",
        proposals: { addTechIds: [] },
        message: "",
      },
      "ai"
    );
    assert.equal(out.angle, "moloch");
    assert.equal(out.challengeSpeech, "Freeriders win.");
    assert.equal(out.proposals, undefined);
  });

  it("judge-contribution is additive + reason only", () => {
    const out = sanitizeFast(
      "judge-contribution",
      { additive: true, reason: "Keeps the core.", message: "extra" },
      "ai"
    );
    assert.equal(out.additive, true);
    assert.equal(out.reason, "Keeps the core.");
    assert.equal(out.proposals, undefined);
  });

  it("evaluate-convergence keeps pair hits and drops extras", () => {
    const out = sanitizeFast(
      "evaluate-convergence",
      {
        convergences: [
          {
            neighborId: "b",
            converges: true,
            enhancedId: "b",
            title: "Shared grid",
            reason: "One unblocks the other.",
            extra: true,
          },
          { neighborId: "ghost", converges: true, enhancedId: "ghost" },
        ],
        proposals: [],
        message: "nope",
      },
      "ai",
      { placed: { id: "a" }, neighbors: [{ id: "b" }] }
    );
    assert.equal(out.convergences.length, 1);
    assert.equal(out.convergences[0].neighborId, "b");
    assert.equal(out.convergences[0].converges, true);
    assert.equal(out.convergences[0].enhancedId, "b");
    assert.equal(out.convergences[0].extra, undefined);
    assert.equal(out.proposals, undefined);
  });
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { resolveScenarioPremise } from "./companion-context.js";
import {
  parseCompanion,
  parseExploration,
  publicCompanionSlice,
  stageCopy,
  sourceConstraintText,
  companionAccessLine,
  companionGateDecision,
  siblingSourceLine,
} from "./companion.js";
import { validateQuestDocument } from "./quest-tile.js";
import { catalogCard, needsPlayerBilling } from "./server/cloud-gate.mjs";

const fixture = JSON.parse(
  fs.readFileSync(new URL("../test/fixtures/quests/companion-moonshots-304.json", import.meta.url), "utf8")
);

function base(over = {}) {
  return {
    medium: "podcast",
    move: "opinion",
    source: {
      show: "Moonshots with Peter Diamandis",
      episode: "304",
      title: "Episode title",
      url: "https://www.youtube.com/watch?v=kAwG9E1W_ME&t=2698",
      cue: "44:58",
      speaker: "Chamath Palihapitiya",
    },
    claim: "A guest says the build-out is the block, not a weak model.",
    quote: "I do think that we have achieved AGI. It cannot diffuse.",
    interpretation: "That is one guest's judgement. A bench and a shift are different claims.",
    evidence: {
      status: "disputed",
      limits: "Recorded 20 Oct 2026. The sentence does not define AGI or prove a capability.",
      reviewed: "2026-10-21",
    },
    collaboration: "independent",
    invitation: "The demo works. This night shift cannot run it. What would you field, and what stays with people?",
    ...over,
  };
}

describe("parseCompanion pairs", () => {
  const limits = "This is long enough to say what the source does not establish here.";
  const pairs = [
    ["milestone", "demonstrated"],
    ["milestone", "inferred"],
    ["milestone", "disputed"],
    ["trend", "inferred"],
    ["trend", "proposed"],
    ["trend", "disputed"],
    ["idea", "proposed"],
    ["idea", "inferred"],
    ["idea", "disputed"],
    ["opinion", "proposed"],
    ["opinion", "inferred"],
    ["opinion", "disputed"],
    ["prediction", "prediction"],
  ];
  for (const [move, status] of pairs) {
    it(`${move} + ${status}`, () => {
      const raw = base({
        move,
        evidence: {
          status,
          limits,
          reviewed: "2026-10-21",
          ...(move === "trend" ? { scope: "Power demand at one dock" } : {}),
          ...(move === "prediction" ? { horizon: "next year" } : {}),
        },
      });
      const parsed = parseCompanion(raw, { access: "open" });
      assert.equal(parsed.ok, true, parsed.details?.join(","));
      assert.equal(parsed.value.move, move);
      assert.equal(parsed.value.evidence.status, status);
    });
  }

  it("rejects a prediction stored as demonstrated", () => {
    const parsed = parseCompanion(
      base({
        move: "prediction",
        evidence: {
          status: "demonstrated",
          limits: "A dated intention is not a result that already happened on this dock.",
          reviewed: "2026-10-21",
          horizon: "next year",
        },
      }),
      { access: "open" }
    );
    assert.equal(parsed.ok, false);
    assert.ok(parsed.details.includes("companion_bad_pair"));
  });

  it("rejects a milestone stored as a prediction", () => {
    const parsed = parseCompanion(
      base({
        move: "milestone",
        evidence: {
          status: "prediction",
          limits: "A milestone needs a result, not a forecast dressed as one.",
          reviewed: "2026-10-21",
        },
      }),
      { access: "open" }
    );
    assert.equal(parsed.ok, false);
    assert.ok(parsed.details.includes("companion_bad_pair"));
  });

  it("rejects a podcast with no cue, a post with no byline, and a bad URL", () => {
    const noCue = parseCompanion(base({ source: { ...base().source, cue: undefined } }), { access: "open" });
    assert.ok(noCue.details.includes("companion_missing_cue"));
    const post = parseCompanion(
      base({
        medium: "post",
        source: { title: "A post", url: "https://example.com/p" },
      }),
      { access: "open" }
    );
    assert.ok(post.details.includes("companion_missing_byline"));
    const http = parseCompanion(
      base({ source: { ...base().source, url: "http://example.com/a" } }),
      { access: "open" }
    );
    assert.ok(http.details.includes("companion_url_not_https"));
    const missing = parseCompanion(
      base({ source: { ...base().source, url: undefined } }),
      { access: "open" }
    );
    assert.ok(missing.details.includes("companion_missing_url"));
  });

  it("rejects a prediction without a horizon and a trend without a scope", () => {
    const prediction = parseCompanion(
      base({
        move: "prediction",
        evidence: {
          status: "prediction",
          limits: "The date is missing, so the puzzle cannot say what slips.",
          reviewed: "2026-10-21",
        },
      }),
      { access: "open" }
    );
    assert.ok(prediction.details.includes("companion_missing_horizon"));
    const trend = parseCompanion(
      base({
        move: "trend",
        evidence: {
          status: "inferred",
          limits: "The change is unnamed, so the place cannot tell if it stalls.",
          reviewed: "2026-10-21",
        },
      }),
      { access: "open" }
    );
    assert.ok(trend.details.includes("companion_missing_scope"));
  });

  it("rejects a quote without interpretation, a quote that is the claim, and a missing partner", () => {
    const noRead = parseCompanion(base({ interpretation: undefined }), { access: "open" });
    assert.ok(noRead.details.includes("companion_quote_needs_interpretation"));
    const same = parseCompanion(
      base({ quote: base().claim, interpretation: "Ours, and it still repeats the quote." }),
      { access: "open" }
    );
    assert.ok(same.details.includes("companion_quote_equals_claim"));
    const partner = parseCompanion(base({ collaboration: "co-produced" }), { access: "open" });
    assert.ok(partner.details.includes("companion_missing_partner"));
  });

  it("requires an explicit access value", () => {
    const parsed = parseCompanion(base(), {});
    assert.equal(parsed.ok, false);
    assert.ok(parsed.details.includes("companion_access_required"));
  });
});

describe("Moonshots fixture", () => {
  it("validates and the stage names the opinion", () => {
    const v = validateQuestDocument(fixture);
    assert.equal(v.ok, true, v.details?.join(","));
    const c = v.mission.companion;
    assert.equal(c.medium, "podcast");
    assert.equal(c.move, "opinion");
    assert.equal(c.source.cue, "44:58");
    assert.equal(c.evidence.status, "disputed");
    const stage = stageCopy(c);
    assert.equal(stage.kicker, "MOONSHOTS · EP 304 · OPINION");
    assert.equal(stage.invitation, fixture.companion.invitation);
    assert.match(stage.linkUrl, /t=2698/);
    assert.equal(stage.linkLabel, "Listen at 44:58");
    assert.equal(stage.moveLabel, "Opinion");
    assert.match(stage.evidenceSentence, /The claim is disputed\./);
    assert.equal(stage.collaborationLine, "Future Forge wrote this. Credit is not a partnership.");
    const constraint = sourceConstraintText(c);
    assert.ok(constraint.length <= 500);
    assert.match(constraint, /opinion/i);
    assert.doesNotMatch(constraint, /demonstrated/i);
    assert.equal(sourceConstraintText(null), "");
  });

  it("omits the key and still validates a quest without a companion", () => {
    const plain = structuredClone(fixture);
    delete plain.companion;
    const v = validateQuestDocument(plain);
    assert.equal(v.ok, true, v.details?.join(","));
    assert.equal(v.mission.companion, undefined);
  });

  it("keeps the claim when a companion has no quote", () => {
    const parsed = parseCompanion(
      base({ quote: undefined, interpretation: undefined, move: "idea", evidence: { ...base().evidence, status: "proposed" } }),
      { access: "open" }
    );
    assert.equal(parsed.ok, true, parsed.details?.join(","));
    const stage = stageCopy(parsed.value);
    assert.equal(stage.quote, "");
    assert.equal(stage.claim, parsed.value.claim);
    assert.equal(stage.claim.length > 0, true);
  });

  it("public slice keeps the claim and omits exploration", () => {
    const v = validateQuestDocument(fixture);
    assert.equal(v.ok, true, v.details?.join(","));
    const slice = publicCompanionSlice(v.mission.companion);
    assert.equal(slice.claim, fixture.companion.claim);
    assert.equal(Object.hasOwn(slice, "exploration"), false);
    assert.equal(v.mission.companion.exploration.premise.bankId, "companion-dock-test");
  });

  it("fails when access is omitted", () => {
    const bare = structuredClone(fixture);
    delete bare.access;
    const v = validateQuestDocument(bare);
    assert.equal(v.ok, false);
    assert.ok(v.details.includes("companion_access_required"));
  });
});

describe("stage copy for other moves", () => {
  it("a post milestone reads the piece and uses a milestone chip", () => {
    const parsed = parseCompanion(
      base({
        medium: "post",
        move: "milestone",
        source: {
          title: "The bench note",
          url: "https://example.com/bench",
          author: "Nia Cole",
          publication: "Dock Notes",
        },
        quote: undefined,
        interpretation: undefined,
        evidence: {
          status: "demonstrated",
          limits: "Shown on one bench in daylight. Not shown on a night shift.",
          reviewed: "2026-10-21",
        },
      }),
      { access: "open" }
    );
    assert.equal(parsed.ok, true, parsed.details?.join(","));
    const stage = stageCopy(parsed.value);
    assert.equal(stage.linkLabel, "Read the piece");
    assert.equal(stage.move, "milestone");
    assert.equal(stage.moveLabel, "Milestone");
    assert.match(stage.kicker, /DOCK NOTES · MILESTONE/);
    assert.equal(stage.byline, "Nia Cole, Dock Notes");
  });

  it("a prediction chip names the horizon", () => {
    const parsed = parseCompanion(
      base({
        move: "prediction",
        evidence: {
          status: "prediction",
          limits: "A stated intention for next year. Not a capability on the dock tonight.",
          reviewed: "2026-10-21",
          horizon: "next year",
        },
      }),
      { access: "account" }
    );
    assert.equal(parsed.ok, true, parsed.details?.join(","));
    const stage = stageCopy(parsed.value);
    assert.equal(stage.moveLabel, "A prediction, not a current capability");
    assert.match(stage.evidenceSentence, /next year/);
  });
});

describe("source details use ordinary prose", () => {
  function render(companion, opts = {}) {
    const game = fs.readFileSync(new URL("./game.js", import.meta.url), "utf8");
    const code = game.slice(
      game.indexOf("function appendDetailParagraph("),
      game.indexOf("/**\n * Quest title still.")
    );
    const document = {
      createElement(tag) {
        return {
          tag,
          textContent: "",
          childNodes: [],
          appendChild(child) { this.childNodes.push(child); },
          replaceChildren() { this.childNodes = []; },
        };
      },
    };
    const paint = new Function("document", "stageCopy", "resolveScenarioPremise", `${code}\nreturn paintSourceDetails;`)(
      document, stageCopy, resolveScenarioPremise
    );
    const container = document.createElement("div");
    paint(container, companion, opts);
    const text = container.childNodes.map((p) => p.textContent || p.childNodes.map((a) => a.textContent).join(" ")).join("\n");
    return { container, text };
  }

  it("shows authored assumptions without internal labels when the bank is not loaded", () => {
    const { container, text } = render(fixture.companion, { includePrivate: true });
    assert.ok(text.includes(fixture.companion.exploration.premise.grants[0].scope));
    assert.ok(text.includes(fixture.companion.exploration.premise.grants[0].limits));
    assert.ok(text.includes(fixture.companion.claim));
    assert.doesNotMatch(text, /Grant\.|Not granted\.|Evidence\.|Row attribution\.|the bank row|not_yet|\bdue\b/);
    assert.equal(container.childNodes.some((p) => p.childNodes.some((c) => c.tag === "strong")), false);
    const link = container.childNodes.at(-1).childNodes[0];
    assert.equal(link.href, fixture.companion.source.url);
    assert.equal(link.rel, "noopener noreferrer");
  });

  it("omits evidence already visible on the stage but keeps it in workshop details", () => {
    const evidence = stageCopy(fixture.companion).evidenceSentence;
    assert.ok(evidence);
    const game = fs.readFileSync(new URL("./game.js", import.meta.url), "utf8");
    const stage = game.slice(game.indexOf("function openCompanionStage("), game.indexOf("function openCompanionStage(") + 7000);
    assert.match(stage, /paintSourceDetails\(stageBody, companion, \{[^}]*evidenceShown: true,/);
    assert.match(stage, /setCompanionText\("companion-evidence", evidence\)/);
    const stageDetails = render(fixture.companion, { evidenceShown: true }).text;
    assert.equal(stageDetails.includes(evidence), false);
    assert.ok(stageDetails.includes(fixture.companion.exploration.premise.grants[0].limits));
    const workshopDetails = render(fixture.companion, { includePrivate: true }).text;
    assert.equal(workshopDetails.split(evidence).length - 1, 1);
  });

  it("describes a future or available capability in full sentences", () => {
    const bank = JSON.parse(fs.readFileSync(new URL("../test/fixtures/predictions/companion-dock-test.json", import.meta.url), "utf8"));
    const future = render(fixture.companion, { bank, year: 2025 }).text;
    assert.match(future, /This capability becomes available in this Quest in 2026\./);
    assert.doesNotMatch(future, /not_yet|the bank row/);
    const current = render(fixture.companion, { bank, year: 2026, claimShown: true }).text;
    assert.match(current, /You can rely on this capability from 2026 in this Quest\./);
    assert.equal(current.includes(fixture.companion.claim), false);
  });

  it("describes forecasts without label fragments and preserves month names", () => {
    for (const horizon of ["Around the end of 2027", "April 2027"]) {
      const copy = stageCopy({ ...base(), move: "prediction", evidence: { status: "prediction", horizon, limits: "The date may change." } });
      assert.match(copy.evidenceSentence, /^This is a forecast, not a demonstrated capability\./);
      assert.doesNotMatch(copy.evidenceSentence, /A prediction\.|Horizon:|Scope:/);
      assert.ok(copy.evidenceSentence.includes(horizon === "April 2027" ? "April 2027" : "around the end of 2027"));
    }
  });
});

describe("public card and gate", () => {
  it("catalogCard keeps the slice and drops grounding", () => {
    const v = validateQuestDocument(fixture);
    const card = catalogCard({
      ...v.tile,
      mission: { ...v.mission, aiTutorContext: "SECRET TUTOR", grounding: "SECRET GROUND" },
      grounding: "SECRET GROUND",
      aiTutorContext: "SECRET TUTOR",
      access: "account",
    });
    assert.equal(card.companion.medium, "podcast");
    assert.equal(card.companion.move, "opinion");
    assert.equal(card.companion.invitation, fixture.companion.invitation);
    assert.equal(card.mission, undefined);
    assert.equal(JSON.stringify(card).includes("SECRET"), false);
    assert.equal(JSON.stringify(card).includes("grounding"), false);
    const slice = publicCompanionSlice(v.mission.companion);
    assert.equal(slice.source.cue, "44:58");
    assert.equal(slice.research, undefined);
  });

  it("does not change billing", () => {
    const companion = fixture.companion;
    assert.equal(needsPlayerBilling({ access: "paid", companion }), true);
    assert.equal(needsPlayerBilling({ access: "paid", companion, sponsorName: "Acme" }), false);
    assert.equal(
      needsPlayerBilling({ access: "paid", companion, entitlement: "catalog.free" }),
      false
    );
  });

  it("access lines", () => {
    assert.match(companionAccessLine({ source: "hosted", access: "open" }), /Library/);
    assert.match(companionAccessLine({ access: "open" }, { placed: false }), /No account is required/);
    assert.match(companionAccessLine({ access: "account", source: "remote" }), /Sign-in is required/);
    assert.match(companionAccessLine({ access: "paid", source: "remote" }), /subscription is required/i);
    assert.match(
      companionAccessLine({ access: "paid", source: "remote", sponsorName: "Acme" }),
      /not required/
    );
    assert.match(companionAccessLine({ access: "open" }, { placed: false }), /fallible advisor/);
  });

  it("gate decision", () => {
    const plain = { id: "q", mission: {} };
    const entry = { id: "companion-moonshots-304", mission: { companion: fixture.companion } };
    assert.equal(companionGateDecision(plain, { getItem: () => null }), "play");
    assert.equal(companionGateDecision(entry, { getItem: () => null }), "gate");
    const mem = new Map();
    assert.equal(
      companionGateDecision(entry, {
        getItem: (k) => (mem.get(k) ? "1" : null),
      }),
      "gate"
    );
    mem.set("ff-companion-ok:companion-moonshots-304", "1");
    assert.equal(
      companionGateDecision(entry, { getItem: (k) => (mem.has(k) ? "1" : null) }),
      "resume-after-accept"
    );
  });

  it("sibling line stays empty for one quest", () => {
    const entry = { id: "a", title: "Night", mission: { companion: fixture.companion } };
    assert.equal(siblingSourceLine(entry, [entry]), "");
    const other = {
      id: "b",
      title: "Morning",
      mission: { companion: fixture.companion },
    };
    assert.match(siblingSourceLine(entry, [entry, other]), /Also from this episode: Morning/);
  });
});

function validExploration(over = {}) {
  const { premise: premiseOver, ...rest } = over;
  const premise =
    premiseOver === undefined
      ? {
          mode: "assumed",
          bankId: "companion-dock-test",
          statement:
            "For this Quest, assume inspection of visible parcel damage is available at this dock. Power and handling are not solved.",
          grants: [
            {
              predictionId: "dock-inspection-2026",
              scope: "Visible parcels on this dock.",
              limits: "Does not move parcels or provide power.",
            },
          ],
        }
      : premiseOver;
  return {
    version: 1,
    focus: "The night's parcels still have to reach the truck.",
    bridge: "The source suggests a capability. This fictional dock grants only the stated inspection.",
    pressureLinks: {
      local: {
        connection: "Ready parcels are the local job.",
        criterion: "Credit a workflow. Naming the grant is not relief.",
      },
    },
    challenges: {
      nature: {
        connection: "The circuit still fails when both loads run.",
        question: "How does the shift finish when the belt and the check cannot run together?",
      },
      moloch: {
        connection: "The vendor is paid for the demo.",
        question: "What changes the incentive when the crew pays for failures?",
      },
      ethicist: {
        connection: "A correct flag can still be shipped.",
        question: "Who decides when the deadline says ship it anyway?",
      },
      stakeholder: {
        connection: "One pilot is not a staffed shift.",
        question: "Who keeps this staffed after the pilot?",
      },
    },
    reflectionPrompt: "What did the invention make possible under that assumption?",
    ...rest,
    premise,
  };
}

describe("parseExploration", () => {
  it("keeps a complete assumed exploration and an evidence-grounded one", () => {
    const details = [];
    const assumed = parseExploration(validExploration(), details);
    assert.deepEqual(details, []);
    assert.equal(assumed.version, 1);
    assert.equal(assumed.premise.bankId, "companion-dock-test");
    assert.equal(assumed.premise.grants.length, 1);
    const groundedDetails = [];
    const grounded = parseExploration(
      validExploration({
        premise: {
          mode: "evidence-grounded",
          statement: "For this Quest, the source stays evidence. Nothing is granted early.",
          grants: [],
        },
      }),
      groundedDetails
    );
    assert.deepEqual(groundedDetails, []);
    assert.equal(grounded.premise.mode, "evidence-grounded");
    assert.equal(Object.hasOwn(grounded.premise, "bankId"), false);
    assert.deepEqual(grounded.premise.grants, []);
  });

  const rejects = [
    ["version 2", { version: 2 }, "exploration_bad_version"],
    ["version string", { version: "1" }, "exploration_bad_version"],
    ["unknown key", { extra: true }, "exploration_unknown_key"],
    ["focus too long", { focus: "x".repeat(281) }, "exploration_focus_too_long"],
    ["missing premise", { premise: null }, "exploration_missing_premise"],
    [
      "evidence-grounded bank",
      {
        premise: {
          mode: "evidence-grounded",
          bankId: "companion-dock-test",
          statement: "For this Quest, nothing is granted.",
          grants: [],
        },
      },
      "exploration_bank_not_allowed",
    ],
    [
      "empty assumed grants",
      {
        premise: {
          mode: "assumed",
          bankId: "companion-dock-test",
          statement: "For this Quest, assume the check is available.",
          grants: [],
        },
      },
      "exploration_bad_grants",
    ],
    [
      "four grants",
      {
        premise: {
          mode: "assumed",
          bankId: "companion-dock-test",
          statement: "For this Quest, assume the check is available.",
          grants: ["a", "b", "c", "d"].map((id) => ({
            predictionId: `row-${id}`,
            scope: "Visible parcels.",
            limits: "Not handling.",
          })),
        },
      },
      "exploration_bad_grants",
    ],
    [
      "duplicate row",
      {
        premise: {
          mode: "assumed",
          bankId: "companion-dock-test",
          statement: "For this Quest, assume the check is available.",
          grants: [
            {
              predictionId: "dock-inspection-2026",
              scope: "Visible parcels.",
              limits: "Not handling.",
            },
            {
              predictionId: "dock-inspection-2026",
              scope: "Visible parcels again.",
              limits: "Still not handling.",
            },
          ],
        },
      },
      "exploration_duplicate_prediction",
    ],
    [
      "untrimmed id",
      {
        premise: {
          mode: "assumed",
          bankId: " dock",
          statement: "For this Quest, assume the check is available.",
          grants: [
            {
              predictionId: "dock-inspection-2026",
              scope: "Visible parcels.",
              limits: "Not handling.",
            },
          ],
        },
      },
      "exploration_bad_bankId",
    ],
    ["unknown pressure", { pressureLinks: { drama: { connection: "x", criterion: "y" } } }, "exploration_unknown_pressure"],
    ["unknown critic", { challenges: { villain: { connection: "x", question: "y" } } }, "exploration_unknown_challenge"],
  ];

  for (const [name, patch, code] of rejects) {
    it(`rejects ${name}`, () => {
      const details = [];
      const value = parseExploration(validExploration(patch), details);
      assert.equal(value, null);
      assert.ok(details.includes(code), details.join(","));
    });
  }

  it("accepts a 280-character focus and leaves a legacy companion without exploration", () => {
    const details = [];
    const focus = "F".repeat(280);
    const parsed = parseExploration(validExploration({ focus }), details);
    assert.equal(parsed.focus, focus);
    assert.deepEqual(details, []);
    const legacy = parseCompanion(base(), { access: "open" });
    assert.equal(legacy.ok, true, legacy.details?.join(","));
    assert.equal(Object.hasOwn(legacy.value, "exploration"), false);
  });

  it("keeps markup in the claim as text", () => {
    const parsed = parseCompanion(
      base({ claim: "A guest says <b>build-out</b> is the block, not a weak model." }),
      { access: "open" }
    );
    assert.equal(parsed.ok, true, parsed.details?.join(","));
    assert.match(stageCopy(parsed.value).claim, /<b>build-out<\/b>/);
  });
});

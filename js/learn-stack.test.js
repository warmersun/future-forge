import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  LEARN_WHILE_IDEAS_DELAY_MS,
  LEARN_SECTIONS,
  LEARN_STILL_ONERROR,
  learnTechIds,
  learnButtonMeta,
  dockTransform,
  learnImagePath,
  learnImageJobs,
  learnSection,
  techLearnCardHtml,
} from "./learn-stack.js";

describe("learnTechIds", () => {
  it("non-hex uses stack ∩ learnOrder, then any extra selected", () => {
    assert.deepEqual(
      learnTechIds({
        hexInvent: false,
        focusedTechId: "ai",
        selectedTechIds: ["bio", "ai"],
        learnOrder: ["ai", "bio"],
      }),
      ["ai", "bio"]
    );
  });

  it("non-hex ignores focused tech that is not on the stack", () => {
    assert.deepEqual(
      learnTechIds({
        hexInvent: false,
        focusedTechId: "ai",
        selectedTechIds: [],
        learnOrder: [],
      }),
      []
    );
  });

  it("hex invent includes focused tech with an empty stack", () => {
    assert.deepEqual(
      learnTechIds({
        hexInvent: true,
        focusedTechId: "ai",
        selectedTechIds: [],
        learnOrder: [],
      }),
      ["ai"]
    );
  });

  it("hex invent puts focused tech first, then stacked learnOrder", () => {
    assert.deepEqual(
      learnTechIds({
        hexInvent: true,
        focusedTechId: "robotics",
        selectedTechIds: ["ai", "bio"],
        learnOrder: ["bio", "ai"],
      }),
      ["robotics", "bio", "ai"]
    );
  });

  it("hex invent does not duplicate focused tech already on the stack", () => {
    assert.deepEqual(
      learnTechIds({
        hexInvent: true,
        focusedTechId: "ai",
        selectedTechIds: ["ai", "bio"],
        learnOrder: ["bio", "ai"],
      }),
      ["ai", "bio"]
    );
  });
});

describe("learnButtonMeta", () => {
  it("disables when empty and uses hex-specific empty copy", () => {
    const hex = learnButtonMeta([], { hexInvent: true });
    assert.equal(hex.disabled, true);
    assert.match(hex.title, /emTech/i);
    const stack = learnButtonMeta([], { hexInvent: false });
    assert.equal(stack.disabled, true);
    assert.match(stack.title, /stack/i);
  });

  it("enables for a single focused hex tech", () => {
    const meta = learnButtonMeta(["ai"], { hexInvent: true });
    assert.equal(meta.disabled, false);
    assert.equal(meta.text, "Learn");
  });

  it("shows a count when several techs are in Learn", () => {
    const meta = learnButtonMeta(["ai", "bio", "robotics"]);
    assert.equal(meta.disabled, false);
    assert.equal(meta.text, "Learn (3)");
  });
});

describe("dockTransform", () => {
  it("returns null without rects or a zero-size source", () => {
    assert.equal(dockTransform(null, { left: 0, top: 0, width: 10, height: 10 }), null);
    assert.equal(
      dockTransform({ left: 0, top: 0, width: 0, height: 10 }, { left: 0, top: 0, width: 10, height: 10 }),
      null
    );
  });

  it("translates the source center onto the target center and scales down", () => {
    const t = dockTransform(
      { left: 0, top: 0, width: 200, height: 100 },
      { left: 400, top: 50, width: 40, height: 20 }
    );
    assert.ok(t);
    assert.equal(t.dx, 320);
    assert.equal(t.dy, 10);
    assert.ok(t.scale > 0 && t.scale <= 0.18);
  });
});

describe("LEARN_WHILE_IDEAS_DELAY_MS", () => {
  it("defers long enough to skip an instant local fallback", () => {
    assert.equal(LEARN_WHILE_IDEAS_DELAY_MS, 400);
  });
});

describe("learn stills", () => {
  it("maps a tech + section to assets/learn/{id}/{section}.jpg", () => {
    assert.equal(learnImagePath("gene-sequencing", "family"), "assets/learn/gene-sequencing/family.jpg");
    assert.equal(learnImagePath("../x", "family"), "");
    assert.equal(learnImagePath("ai", ""), "");
  });

  it("omits the figure when imageUrl is empty", () => {
    const html = learnSection({
      id: "family",
      title: "What is this family?",
      bodyHtml: "<p>Hello</p>",
      techName: "AI",
    });
    assert.equal(html.includes("learn-sec-art"), false);
    assert.match(html, /data-learn-sec="family"/);
    assert.match(html, /<p>Hello<\/p>/);
  });

  it("includes a figure with alt text and onerror hide hook", () => {
    const html = learnSection({
      id: "now",
      title: "What already works",
      bodyHtml: "<p>Now</p>",
      imageUrl: "assets/learn/ai/now.jpg",
      techName: "Artificial Intelligence",
    });
    assert.match(html, /class="learn-sec-art"/);
    assert.match(html, /src="assets\/learn\/ai\/now\.jpg"/);
    assert.match(html, /alt="Artificial Intelligence — What already works"/);
    assert.ok(html.includes(LEARN_STILL_ONERROR));
    assert.match(html, /onerror="/);
  });

  it("renders five stills on a Learn card", () => {
    const html = techLearnCardHtml(
      {
        id: "ai",
        name: "Artificial Intelligence",
        icon: "✦",
        domain: "automator",
        curve: "steep",
        summary: "Pattern-finding tools.",
        primer: "AI finds patterns.",
        inventionHint: "Scope a local workflow.",
        risk: "bias, overconfidence",
        useCasesNow: ["Triage support"],
        milestones: ["Copilots"],
        maturity: { now: "Assistive models.", near: "Narrow agents.", frontier: "Broad autonomy." },
        readyYear: 2026,
      },
      { newest: true, year: 2026, domainLabel: "Automator" }
    );
    assert.match(html, /data-tech-id="ai"/);
    assert.match(html, /Latest select/);
    const figs = html.match(/class="learn-sec-art"/g) || [];
    assert.equal(figs.length, LEARN_SECTIONS.length);
    for (const sec of LEARN_SECTIONS) {
      assert.match(html, new RegExp(`data-learn-sec="${sec.id}"`));
      assert.match(html, new RegExp(`src="assets/learn/ai/${sec.id}\\.jpg"`));
    }
    assert.match(html, /alt="Artificial Intelligence — What is this family\?"/);
    assert.ok(html.includes(LEARN_STILL_ONERROR));
  });

  it("builds one job per tech × section with no-text prompts", () => {
    const jobs = learnImageJobs([
      { id: "ai", name: "Artificial Intelligence", primer: "Finds patterns.", risk: "bias" },
    ]);
    assert.equal(jobs.length, LEARN_SECTIONS.length);
    assert.equal(jobs[0].image, "assets/learn/ai/family.jpg");
    assert.match(jobs[0].prompt, /4:3/);
    assert.match(jobs[0].prompt, /no readable text/);
    assert.match(jobs[0].prompt, /Artificial Intelligence/);
    assert.equal(learnImageJobs([{ id: "../bad", name: "Nope" }]).length, 0);
  });
});

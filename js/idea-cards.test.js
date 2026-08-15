import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  HOW_APPEND_MAX,
  ideaCacheKey,
  ideaImageId,
  appendHowText,
  normalizeIdeas,
  ideasOrFallback,
  localIdeaSparks,
  rotateLocalIdeaSparks,
} from "./idea-cards.js";

describe("ideaCacheKey / ideaImageId", () => {
  it("is stable for the same mission + tech + year + place", () => {
    const a = ideaCacheKey({
      missionId: "q1",
      techId: "drones",
      year: 2026,
      place: "Portside",
    });
    const b = ideaCacheKey({
      missionId: "q1",
      techId: "drones",
      year: 2026,
      place: "Portside",
    });
    assert.equal(a, b);
    assert.match(a, /q1\|drones\|2026\|Portside/);
  });

  it("changes when place or year changes", () => {
    const base = { missionId: "q1", techId: "ai", year: 2026, place: "A" };
    assert.notEqual(ideaCacheKey(base), ideaCacheKey({ ...base, place: "B" }));
    assert.notEqual(ideaCacheKey(base), ideaCacheKey({ ...base, year: 2028 }));
  });

  it("image id is a short idea- prefix and stable", () => {
    const id = ideaImageId({
      techId: "drones",
      ideaId: "last-mile",
      place: "Crossing Clinic 7",
      year: 2026,
    });
    assert.match(id, /^idea-[a-z0-9]+$/);
    assert.equal(
      id,
      ideaImageId({
        techId: "drones",
        ideaId: "last-mile",
        place: "Crossing Clinic 7",
        year: 2026,
      })
    );
    assert.notEqual(
      id,
      ideaImageId({
        techId: "drones",
        ideaId: "other",
        place: "Crossing Clinic 7",
        year: 2026,
      })
    );
  });
});

describe("appendHowText", () => {
  it("uses the spark when how is empty", () => {
    assert.equal(appendHowText("", "A starter."), "A starter.");
    assert.equal(appendHowText("   ", "A starter."), "A starter.");
  });

  it("appends with a blank line and never replaces", () => {
    assert.equal(
      appendHowText("Existing draft.", "A new spark."),
      "Existing draft.\n\nA new spark."
    );
  });

  it("ignores empty insert", () => {
    assert.equal(appendHowText("Keep me", "  "), "Keep me");
  });

  it("caps near 2400 so we stay under the how limit", () => {
    const existing = "x".repeat(2300);
    const next = appendHowText(existing, "y".repeat(400));
    assert.ok(next.length <= HOW_APPEND_MAX);
    assert.ok(next.startsWith(existing));
    assert.ok(next.includes("\n\n"));
  });

  it("leaves existing text alone when there is no room", () => {
    const existing = "x".repeat(HOW_APPEND_MAX);
    assert.equal(appendHowText(existing, "more"), existing);
  });
});

describe("normalizeIdeas", () => {
  it("clamps to 3 and slices field lengths", () => {
    const raw = [1, 2, 3, 4].map((n) => ({
      id: `idea-${n}`,
      title: "T".repeat(80),
      blurb: "B".repeat(200),
      insertText: "I".repeat(400),
      imagePrompt: "P".repeat(500),
    }));
    const ideas = normalizeIdeas(raw);
    assert.equal(ideas.length, 3);
    assert.equal(ideas[0].title.length, 60);
    assert.equal(ideas[0].blurb.length, 140);
    assert.equal(ideas[0].insertText.length, 280);
    assert.equal(ideas[0].imagePrompt.length, 400);
  });

  it("drops items without title or insert text", () => {
    assert.deepEqual(
      normalizeIdeas([{ title: "", insertText: "x" }, { title: "Ok", insertText: "" }]),
      []
    );
  });

  it("does not copy inventionHow-style proposals", () => {
    const ideas = normalizeIdeas([
      {
        title: "Clinic read",
        insertText: "In this clinic…",
        inventionHow: "A finished invention you should not apply.",
      },
    ]);
    assert.equal(ideas.length, 1);
    assert.equal(ideas[0].insertText, "In this clinic…");
    assert.equal(ideas[0].inventionHow, undefined);
  });
});

describe("localIdeaSparks", () => {
  const tech = {
    id: "drones",
    name: "Drones",
    useCasesNow: [
      "Last-mile medical logistics",
      "Infrastructure inspection",
      "Disaster search",
    ],
    inventionHint: "Small craft that deliver or watch.",
  };

  it("returns exactly 3 ideas with empty proposals-ready fields", () => {
    const ideas = localIdeaSparks(tech, { place: "Crossing Clinic 7", year: 2026 });
    assert.equal(ideas.length, 3);
    for (const idea of ideas) {
      assert.ok(idea.id);
      assert.ok(idea.title);
      assert.ok(idea.insertText.includes("Crossing Clinic 7"));
      assert.ok(idea.insertText.includes("Drones"));
      assert.ok(idea.imagePrompt);
      assert.equal(idea.inventionHow, undefined);
    }
  });

  it("pads when the catalog has fewer than 3 use cases", () => {
    const ideas = localIdeaSparks(
      { id: "ai", name: "Artificial Intelligence", useCasesNow: ["Triage support"] },
      { place: "North Stack", year: 2026 }
    );
    assert.equal(ideas.length, 3);
  });

  it("returns [] without a tech", () => {
    assert.deepEqual(localIdeaSparks(null, {}), []);
  });
});

describe("rotateLocalIdeaSparks", () => {
  const tech = {
    id: "drones",
    name: "Drones",
    useCasesNow: [
      "Last-mile medical logistics",
      "Infrastructure inspection",
      "Disaster search",
      "Harbor mapping",
    ],
  };

  it("returns 3 ideas with different ids than the first set", () => {
    const first = localIdeaSparks(tech, { place: "Here", year: 2026 });
    const next = rotateLocalIdeaSparks(
      tech,
      { place: "Here", year: 2026 },
      first.map((i) => i.title)
    );
    assert.equal(next.length, 3);
    const firstIds = new Set(first.map((i) => i.id));
    assert.ok(next.every((i) => !firstIds.has(i.id)));
  });

  it("prefers unused seeds when avoid titles match the first trio", () => {
    const first = localIdeaSparks(tech, { place: "Here", year: 2026 });
    const next = rotateLocalIdeaSparks(
      tech,
      { place: "Here", year: 2026 },
      first.map((i) => i.title)
    );
    assert.ok(next.some((i) => /harbor mapping/i.test(i.title)));
  });
});

describe("ideasOrFallback", () => {
  const tech = {
    id: "ai",
    name: "Artificial Intelligence",
    useCasesNow: ["Triage support", "Tutoring aids", "Early-warning scoring"],
  };

  it("keeps three good model ideas", () => {
    const raw = [1, 2, 3].map((n) => ({
      id: `m-${n}`,
      title: `Model ${n}`,
      insertText: `Spark ${n}`,
    }));
    const ideas = ideasOrFallback(raw, tech, { place: "Here", year: 2026 });
    assert.equal(ideas.length, 3);
    assert.equal(ideas[0].title, "Model 1");
  });

  it("pads with local sparks when the model returns none", () => {
    const ideas = ideasOrFallback([], tech, { place: "Here", year: 2026 });
    assert.equal(ideas.length, 3);
    assert.ok(ideas[0].insertText.includes("Here"));
  });
});

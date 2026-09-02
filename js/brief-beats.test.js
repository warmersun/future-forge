import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BRIEF_BEAT_CAPS,
  beatPlainExcerpt,
  briefBeatArtId,
  briefBeatAuthoredUrl,
  briefBeatImagePrompt,
  briefBeatStillUrl,
  captionMdFromBeatBody,
  deriveBriefBeats,
  isSafeBriefImageUrl,
  splitSentences,
  jobLineFromMission,
  normalizeBriefBeats,
  normalizeBriefHeading,
  resolveBriefBeats,
  roleFromHeading,
  splitBodyChunks,
  splitMarkdownSections,
  wordCount,
} from "./brief-beats.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadQuest(rel) {
  return JSON.parse(readFileSync(join(root, rel), "utf8"));
}

describe("brief-beats headings", () => {
  it("aliases curly apostrophe What's strained", () => {
    assert.equal(normalizeBriefHeading("What’s strained"), "what's strained");
    assert.equal(roleFromHeading("What’s strained"), "strain");
    assert.equal(roleFromHeading("What's strained"), "strain");
  });

  it("maps shipped and template heading variants", () => {
    assert.equal(roleFromHeading("Your job"), "job");
    assert.equal(roleFromHeading("Your brief"), "job");
    assert.equal(roleFromHeading("The place"), "place");
    assert.equal(roleFromHeading("What just became possible"), "possible");
    assert.equal(
      roleFromHeading("A capability that just became more real"),
      "possible"
    );
    assert.equal(roleFromHeading("Constraints"), "constraints");
    assert.equal(roleFromHeading("A surprise heading"), "other");
  });
});

describe("splitMarkdownSections", () => {
  it("keeps prefatory text as a place section", () => {
    const sections = splitMarkdownSections(
      "Before any heading.\n\n## Your job\n\nInvent it."
    );
    assert.equal(sections[0].role, "place");
    assert.match(sections[0].body, /Before any heading/);
    assert.equal(sections[1].role, "job");
  });
});

describe("splitBodyChunks", () => {
  it("splits paragraphs and keeps lists together", () => {
    const chunks = splitBodyChunks(
      "First para.\n\nSecond para.\n\n- a\n- b\n\n- c"
    );
    assert.equal(chunks.length, 3);
    assert.equal(chunks[0], "First para.");
    assert.equal(chunks[1], "Second para.");
    assert.match(chunks[2], /- a/);
    assert.match(chunks[2], /- c/);
  });

  it("splits very long prose on sentences", () => {
    const sentence = "The clinic waits on the truck every morning.";
    const long = Array(20).fill(sentence).join(" ");
    assert.ok(wordCount(long) > BRIEF_BEAT_CAPS.maxWords);
    const chunks = splitBodyChunks(long);
    assert.ok(chunks.length >= 2);
    for (const c of chunks) {
      assert.ok(wordCount(c) <= BRIEF_BEAT_CAPS.maxWords + 8);
    }
  });
});

describe("deriveBriefBeats", () => {
  it("returns empty for empty brief", () => {
    assert.deepEqual(deriveBriefBeats(""), []);
    assert.deepEqual(deriveBriefBeats("   "), []);
  });

  it("derives a walkthrough from a theme scene when briefMd is empty", () => {
    const scene =
      "Dr. Ramirez presses two fingers into the motorcycle rider's upper belly and feels the wall go tight. Her screen turns green. Discharge to observation, the model says. The override button sits gray. Who designs a trauma score a surgeon can still outrun?";
    const beats = deriveBriefBeats("", {
      scene,
      title: "Trauma scores that outvote the surgeon",
    });
    assert.ok(beats.length >= 2);
    assert.equal(beats[0].role, "place");
    assert.match(beats[0].bodyMd, /Ramirez/i);
    assert.equal(beats[beats.length - 1].role, "job");
  });

  it("resolveBriefBeats uses scene on theme missions", () => {
    const beats = resolveBriefBeats({
      title: "Buses that skip the night-shift clinic stop",
      scene:
        "Marcus watches the 28 skip Massachusetts Avenue at 1:14 a.m. The optimizer labels the stop dead weight. Who designs a schedule that still waits?",
      briefMd: "",
    });
    assert.ok(beats.length >= 2);
    assert.equal(beats[0].role, "place");
  });

  it("keeps punch-line sentences as separate caption lines", () => {
    const md = captionMdFromBeatBody(
      "Diego unlocks the clinic at 9 p.m. because the chairs are full. A grandmother holds a damp cloth. Dr. Ramirez still signs the chart."
    );
    assert.match(md, /9 p\.m\. because/);
    assert.equal(md.includes("\n\n"), true);
    const sentences = splitSentences(
      "Mr. Salim will not walk the dayroom. Fans stop."
    );
    assert.equal(sentences.length, 2);
    assert.match(sentences[0], /Mr\. Salim/);
  });

  it("paragraph-splits a heading-less brief", () => {
    const beats = deriveBriefBeats(
      "Nurse Amina seals a swab.\n\nThe truck already left.\n\nWho designs the workflow?"
    );
    assert.ok(beats.length >= 2);
    assert.equal(beats[0].role, "place");
  });

  it("walks gene-seq shipped headings (place-first, Your brief)", () => {
    const tile = loadQuest("quests/spotlight-gene-seq.json");
    const beats = deriveBriefBeats(tile.mission.briefMd, {
      summary: tile.summary,
    });
    assert.ok(beats.length >= 3);
    assert.ok(beats.length <= BRIEF_BEAT_CAPS.maxBeats);
    assert.equal(beats[0].role, "place");
    assert.equal(beats[beats.length - 1].role, "job");
    const roles = new Set(beats.map((b) => b.role));
    assert.ok(roles.has("strain"));
    assert.ok(roles.has("possible"));
    assert.ok(roles.has("constraints"));
    assert.match(beats[0].bodyMd, /Nurse Amina/i);
  });

  it("walks skill example job-first template into story-then-job order", () => {
    const tile = loadQuest(
      "skills/future-forge-quest/examples/spotlight-gene-seq.json"
    );
    const beats = deriveBriefBeats(tile.mission.briefMd, {
      summary: tile.summary,
    });
    assert.equal(beats[0].role, "place");
    assert.equal(beats[beats.length - 1].role, "job");
    assert.ok(beats.length <= BRIEF_BEAT_CAPS.maxBeats);
    const job = beats[beats.length - 1];
    assert.match(job.bodyMd, /same-shift|workflow|Invent/i);
  });

  it("caps a long place (tideglass) at 8 beats without dropping the job", () => {
    const tile = loadQuest("quests/preventing-mirror-life-tideglass.json");
    const beats = deriveBriefBeats(tile.mission.briefMd, {
      summary: tile.summary,
    });
    assert.ok(beats.length <= BRIEF_BEAT_CAPS.maxBeats);
    assert.equal(beats[0].role, "place");
    assert.equal(beats[beats.length - 1].role, "job");
    assert.match(beats[0].bodyMd, /Nia|Tideglass/i);
  });

  it("appends a job beat from summary when the brief has none", () => {
    const beats = deriveBriefBeats("## The place\n\nA clinic waits.", {
      summary: "Invent a same-shift workflow.",
    });
    assert.equal(beats[beats.length - 1].role, "job");
    assert.match(beats[beats.length - 1].bodyMd, /same-shift workflow/);
  });

  it("keeps unknown headings as other, never discarded", () => {
    const beats = deriveBriefBeats(
      "## The place\n\nHere.\n\n## A wild heading\n\nBonus fact.\n\n## Your job\n\nInvent it."
    );
    assert.ok(beats.some((b) => b.role === "other"));
    assert.ok(beats.some((b) => /Bonus fact/.test(b.bodyMd)));
    assert.equal(beats[beats.length - 1].role, "job");
  });
});

describe("normalizeBriefBeats / resolveBriefBeats", () => {
  const sample = [
    {
      id: "place-1",
      role: "place",
      title: "The place",
      bodyMd: "Nurse Amina seals a swab.",
    },
    {
      id: "strain-1",
      role: "strain",
      title: "What's strained",
      bodyMd: "The cooler fills while the truck is gone.",
    },
    {
      id: "job-1",
      role: "job",
      title: "Your job",
      bodyMd: "Invent the local workflow.",
    },
  ];

  it("accepts a valid authored set", () => {
    const n = normalizeBriefBeats(sample);
    assert.equal(n.ok, true);
    assert.equal(n.beats.length, 3);
    assert.equal(n.beats[0].id, "place-1");
  });

  it("rejects too few, missing id, bad url", () => {
    assert.equal(normalizeBriefBeats(sample.slice(0, 2)).ok, false);
    const noId = sample.map((b, i) => (i === 0 ? { ...b, id: "" } : b));
    assert.ok(
      normalizeBriefBeats(noId).details.some((d) => /missing_id/.test(d))
    );
    const badUrl = [
      ...sample.slice(0, 2),
      { ...sample[2], imageUrl: "javascript:alert(1)" },
    ];
    assert.ok(
      normalizeBriefBeats(badUrl).details.some((d) => /imageUrl/.test(d))
    );
  });

  it("authored wins over derive when valid", () => {
    const beats = resolveBriefBeats({
      briefMd: "## The place\n\nIgnored essay.",
      briefBeats: sample,
    });
    assert.equal(beats.length, 3);
    assert.equal(beats[0].bodyMd, "Nurse Amina seals a swab.");
  });

  it("invalid authored falls back to derive", () => {
    const beats = resolveBriefBeats({
      briefMd: "## The place\n\nClinic story.\n\n## Your job\n\nInvent it.",
      briefBeats: [{ id: "x", title: "Nope" }],
    });
    assert.ok(beats.length >= 2);
    assert.match(beats[0].bodyMd, /Clinic story/);
  });
});

describe("job line and stills", () => {
  it("prefers summary", () => {
    assert.equal(
      jobLineFromMission({
        summary: "Invent a workflow.",
        spotlight: { encourageCopy: "Use sequencing." },
      }),
      "Invent a workflow."
    );
  });

  it("uses title when there is no summary (theme quests)", () => {
    assert.equal(
      jobLineFromMission({
        title: "Trauma scores that outvote the surgeon",
        scene: "A long scene that should not become the job line.",
      }),
      "Trauma scores that outvote the surgeon"
    );
  });

  it("builds a problem postcard url", () => {
    assert.equal(
      briefBeatStillUrl({ role: "place" }, { globalId: "infectious" }),
      "assets/problems/infectious.jpg"
    );
    assert.equal(briefBeatStillUrl({ role: "place" }, { globalId: "../x" }), "");
  });

  it("accepts https and bundled assets stills, rejects unsafe urls", () => {
    assert.equal(
      isSafeBriefImageUrl("https://cdn.example.org/clinic.jpg"),
      true
    );
    assert.equal(
      isSafeBriefImageUrl("assets/quests/spotlight-gene-seq/place-1.jpg"),
      true
    );
    assert.equal(
      isSafeBriefImageUrl("/assets/quests/spotlight-gene-seq/place-1.webp"),
      true
    );
    assert.equal(isSafeBriefImageUrl("javascript:alert(1)"), false);
    assert.equal(isSafeBriefImageUrl("data:image/png;base64,aaaa"), false);
    assert.equal(isSafeBriefImageUrl("assets/quests/../secrets.jpg"), false);
    assert.equal(isSafeBriefImageUrl("quests/place-1.jpg"), false);
    assert.equal(
      briefBeatAuthoredUrl({
        imageUrl: "assets/quests/spotlight-gene-seq/place-1.jpg",
      }),
      "assets/quests/spotlight-gene-seq/place-1.jpg"
    );
    assert.equal(
      briefBeatStillUrl(
        { imageUrl: "assets/quests/spotlight-gene-seq/place-1.jpg" },
        { globalId: "infectious" }
      ),
      "assets/quests/spotlight-gene-seq/place-1.jpg"
    );
    assert.equal(briefBeatAuthoredUrl({ imageUrl: "javascript:x" }), "");
  });

  it("keeps authored relative stills on valid briefBeats", () => {
    const n = normalizeBriefBeats([
      {
        id: "place-1",
        role: "place",
        title: "The place",
        bodyMd: "Nurse Amina seals a swab.",
        imageUrl: "assets/quests/spotlight-gene-seq/place-1.jpg",
      },
      {
        id: "strain-1",
        role: "strain",
        title: "What's strained",
        bodyMd: "The cooler fills while the truck is gone.",
        imageUrl: "https://cdn.example.org/strain.png",
      },
      {
        id: "job-1",
        role: "job",
        title: "Your job",
        bodyMd: "Invent the local workflow.",
      },
    ]);
    assert.equal(n.ok, true);
    assert.equal(
      n.beats[0].imageUrl,
      "assets/quests/spotlight-gene-seq/place-1.jpg"
    );
    assert.equal(n.beats[1].imageUrl, "https://cdn.example.org/strain.png");
    assert.equal(n.beats[2].imageUrl, undefined);
  });

  it("hashes a stable distinct art id per beat", () => {
    const a = briefBeatArtId({
      missionId: "q1",
      beatId: "place-1",
      place: "Crossing Clinic 7",
    });
    const b = briefBeatArtId({
      missionId: "q1",
      beatId: "strain-1",
      place: "Crossing Clinic 7",
    });
    assert.match(a, /^brief-[0-9a-f]+$/);
    assert.equal(
      a,
      briefBeatArtId({
        missionId: "q1",
        beatId: "place-1",
        place: "Crossing Clinic 7",
      })
    );
    assert.notEqual(a, b);
  });

  it("writes a distinct Imagine prompt per beat role", () => {
    const place = { place: "Crossing Clinic 7" };
    const p = briefBeatImagePrompt(
      { role: "place", bodyMd: "Nurse Amina seals a swab." },
      place
    );
    assert.match(p, /Crossing Clinic 7/);
    assert.match(p, /Amina/);
    const job = briefBeatImagePrompt(
      { role: "job", bodyMd: "Invent a same-shift workflow." },
      place
    );
    assert.match(job, /open design problem/i);
    assert.notEqual(p, job);
  });

  it("excerpts beat text", () => {
    const ex = beatPlainExcerpt({
      title: "The place",
      bodyMd: "Nurse **Amina** seals a swab.",
    });
    assert.match(ex, /Amina/);
    assert.equal(ex.includes("**"), false);
  });
});

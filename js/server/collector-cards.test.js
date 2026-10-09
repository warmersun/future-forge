import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cloudWriteGate } from "./cloud-save.mjs";
import {
  parseIssueCard,
  composeCardBody,
  renderCardBodyHtml,
  renderCollectorCardPage,
  collectHttpResult,
  sanitizeCardLinks,
  parseCardPath,
  parseCollectPath,
  collectorImageHeaders,
  siblingCardImageCandidates,
  resolveCardImageFile,
} from "./collector-cards.mjs";
import {
  shouldFilterCollectorCards,
  filterCollectorCards,
  COLLECTOR_FILTER_AT,
} from "../collector-cards.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CARD_ID = "11111111-1111-4111-8111-111111111111";

test("page image is the sibling file next to the card JSON", () => {
  const jsonPath = "/cards/examples/drones-urban-delivery.json";
  const candidates = siblingCardImageCandidates(jsonPath);
  assert.deepEqual(
    candidates.map((p) => path.basename(p)),
    [
      "drones-urban-delivery.jpg",
      "drones-urban-delivery.jpeg",
      "drones-urban-delivery.png",
      "drones-urban-delivery.webp",
    ]
  );
  const png = candidates[2];
  assert.equal(
    resolveCardImageFile(jsonPath, (p) => p === png),
    png
  );
  assert.equal(
    resolveCardImageFile(jsonPath, () => false, "shots/custom.webp"),
    path.resolve("/cards/examples", "shots/custom.webp")
  );
  assert.equal(resolveCardImageFile(jsonPath, () => false), null);
});

test("example cards parse without storing the source note", () => {
  for (const name of ["synbio-protein-watermark.json", "drones-urban-delivery.json"]) {
    const raw = JSON.parse(
      fs.readFileSync(path.join(ROOT, "cards/examples", name), "utf8")
    );
    assert.ok(raw.source);
    const parsed = parseIssueCard(raw, { requireImage: false });
    assert.equal(parsed.ok, true, parsed.error);
    assert.equal(Object.hasOwn(parsed.card, "source"), false);
    assert.ok(parsed.card.title.length <= 80);
    assert.equal(parsed.card.links.length, 2);
  }
});

test("card page escapes text, drops javascript links, and points og:image at the card", () => {
  const html = renderCollectorCardPage(
    {
      id: CARD_ID,
      techId: "drones",
      title: `Urban <drone> "air"`,
      description: "Flies a meal.",
      body: "Line one.\n\nLine <two>.",
      links: [
        { label: "Ok", url: "https://example.com/note" },
        { label: "Bad", url: "javascript:alert(1)" },
      ],
    },
    { origin: "https://cloud.warmersun.com", clerkEnabled: false }
  );
  assert.match(html, /og:image" content="https:\/\/cloud\.warmersun\.com\/card\/11111111-1111-4111-8111-111111111111\/preview\.jpg"/);
  assert.match(html, /og:image:width" content="1200"/);
  assert.match(html, /og:image:height" content="630"/);
  assert.match(html, /og:image:type" content="image\/jpeg"/);
  assert.match(html, /twitter:image" content="https:\/\/cloud\.warmersun\.com\/card\/11111111-1111-4111-8111-111111111111\/preview\.jpg"/);
  assert.match(html, /twitter:card" content="summary_large_image"/);
  assert.match(html, /class="shot" src="https:\/\/cloud\.warmersun\.com\/card\/11111111-1111-4111-8111-111111111111\/image"/);
  assert.doesNotMatch(html, /<drone>/);
  assert.match(html, /Urban &lt;drone&gt;/);
  assert.doesNotMatch(html, /javascript:/);
  assert.match(html, /https:\/\/example\.com\/note/);
  assert.match(html, /Line &lt;two&gt;/);
  assert.equal(sanitizeCardLinks([{ label: "Bad", url: "javascript:alert(1)" }]).length, 0);
});

test("collect requires a sign-in and is idempotent once the gate passes", () => {
  const unsigned = cloudWriteGate(
    { enabled: true, signedIn: false, missingToken: true },
    { dbEnabled: true }
  );
  const denied = collectHttpResult(unsigned, { published: true });
  assert.equal(denied.status, 401);
  assert.equal(denied.body.error, "sign_in_required");

  const gate = cloudWriteGate(
    { enabled: true, signedIn: true, userId: "user_abc" },
    { dbEnabled: true }
  );
  const first = collectHttpResult(gate, { published: true }, { already: false });
  const again = collectHttpResult(gate, { published: true }, { already: true });
  assert.equal(first.status, 200);
  assert.equal(first.body.collected, true);
  assert.equal(first.body.already, false);
  assert.equal(again.body.already, true);
  assert.equal(collectHttpResult(gate, null).status, 404);
  assert.equal(collectHttpResult(gate, { published: false }).status, 404);
});

test("card paths accept a uuid and reject anything else", () => {
  assert.deepEqual(parseCardPath(`/card/${CARD_ID}`), { id: CARD_ID, image: false, share: false });
  assert.deepEqual(parseCardPath(`/card/${CARD_ID}/image`), { id: CARD_ID, image: true, share: false });
  assert.deepEqual(parseCardPath(`/card/${CARD_ID}/preview.jpg`), { id: CARD_ID, image: false, share: true });
  assert.deepEqual(parseCollectPath(`/api/me/cards/${CARD_ID}/collect`), { id: CARD_ID });
  assert.equal(parseCardPath("/card/not-a-uuid")?.invalid, true);
  assert.equal(parseCardPath("/signin"), null);
});

test("card image headers name the bytes for both GET and HEAD", () => {
  const headers = collectorImageHeaders(1200, {
    contentType: "image/jpeg",
    etag: 'W/"share-2026-10-08T00:00:00.000Z"',
  });
  assert.equal(headers["Content-Type"], "image/jpeg");
  assert.equal(headers["Content-Length"], "1200");
  assert.equal(headers.ETag, 'W/"share-2026-10-08T00:00:00.000Z"');
  assert.match(headers["Cache-Control"], /public/);
});

test("emTech filter appears once the collection reaches six cards", () => {
  const cards = Array.from({ length: COLLECTOR_FILTER_AT }, (_, i) => ({
    id: String(i),
    techId: i % 2 === 0 ? "drones" : "synbio",
    techName: i % 2 === 0 ? "Drones" : "Synthetic Biology",
  }));
  assert.equal(shouldFilterCollectorCards(cards.slice(0, 5)), false);
  assert.equal(shouldFilterCollectorCards(cards), true);
  assert.equal(filterCollectorCards(cards, "drones").length, 3);
  assert.equal(filterCollectorCards(cards, "all").length, 6);
});

test("card page includes Future Forge branding and logo assets", () => {
  const html = renderCollectorCardPage(
    {
      id: CARD_ID,
      techId: "drones",
      title: "Test Card",
      description: "Test description",
      body: "Test body",
      links: [],
    },
    { origin: "https://cloud.warmersun.com", clerkEnabled: false }
  );
  // Header branding with logo
  assert.match(html, /Future Forge by Warmer Sun/);
  assert.match(html, /\/assets\/brand\/ff-mark-footer\.png/);
  // Footer branding
  assert.match(html, /\/assets\/brand\/ff-by-warmersun-transparent-bg\.png/);
  // Check that logo assets exist
  assert.ok(fs.existsSync(path.join(ROOT, "assets/brand/ff-mark-footer.png")));
  assert.ok(fs.existsSync(path.join(ROOT, "assets/brand/ff-by-warmersun-transparent-bg.png")));
});

test("card page lights the gallery with the emTech domain color", () => {
  const html = renderCollectorCardPage(
    {
      id: CARD_ID,
      techId: "synbio",
      title: "Mark",
      description: "A mark.",
      body: "",
      links: [],
    },
    { origin: "https://cloud.warmersun.com", clerkEnabled: false }
  );
  assert.match(html, /--domain-rgb:52, 211, 153/);
  assert.match(html, /Synthetic Biology/);
  assert.match(html, /Collect this card/);
});

test("capability and use cases are optional, validated, and folded into the stored body", () => {
  const base = { techId: "drones", title: "T", description: "D" };
  const plain = parseIssueCard({ ...base, body: "Para one.\n\nPara two." }, { requireImage: false });
  assert.equal(plain.ok, true);
  assert.equal(plain.card.body, "Para one.\n\nPara two.");
  assert.equal(plain.card.capability, "");
  assert.deepEqual(plain.card.useCases, []);

  const full = parseIssueCard(
    { ...base, capability: "  We can now   do X. ", useCases: ["- Use A", " Use B "], body: "More." },
    { requireImage: false }
  );
  assert.equal(full.ok, true, full.error);
  assert.equal(full.card.capability, "We can now do X.");
  assert.deepEqual(full.card.useCases, ["Use A", "Use B"]);
  assert.equal(
    full.card.body,
    "## Capability\nWe can now do X.\n\n## Use cases\n- Use A\n- Use B\n\n## The details\n\nMore."
  );
  assert.equal(composeCardBody({ capability: "C", useCases: ["U"] }), "## Capability\nC\n\n## Use cases\n- U");

  for (const bad of [
    { capability: "" },
    { capability: 42 },
    { capability: "x".repeat(401) },
  ]) {
    assert.equal(parseIssueCard({ ...base, ...bad }, { requireImage: false }).error, "bad_capability");
  }
  for (const bad of [
    { useCases: [] },
    { useCases: "one" },
    { useCases: ["a", "b", "c", "d"] },
    { useCases: ["ok", " "] },
    { useCases: [7] },
    { useCases: ["x".repeat(201)] },
  ]) {
    assert.equal(parseIssueCard({ ...base, ...bad }, { requireImage: false }).error, "bad_use_cases");
  }
});

test("card body renders the Capability panel first, then the details; legacy bodies are unchanged", () => {
  const legacy = renderCardBodyHtml("Line one.\nstill one\n\nLine <two>.");
  assert.equal(legacy, '<div class="prose"><p>Line one.<br>still one</p><p>Line &lt;two&gt;.</p></div>');
  assert.equal(renderCardBodyHtml(""), "");

  const html = renderCardBodyHtml(
    composeCardBody({ capability: "We can <now> do X.", useCases: ["Use A", "Use B"], body: "More." })
  );
  assert.match(
    html,
    /^<section class="capability" aria-label="Capability"><h2>Capability<\/h2><p class="capability-text">We can &lt;now&gt; do X\.<\/p><h2>Use cases<\/h2><ul><li>Use A<\/li><li>Use B<\/li><\/ul><\/section><div class="prose"><h2>The details<\/h2><p>More\.<\/p><\/div>$/
  );

  const page = renderCollectorCardPage(
    {
      id: CARD_ID,
      techId: "drones",
      title: "Card",
      description: "Lead text.",
      body: composeCardBody({ capability: "Cap.", useCases: ["U1"] }),
      links: [],
    },
    { origin: "https://cloud.warmersun.com" }
  );
  const lead = page.indexOf('<p class="lead">');
  const panel = page.indexOf('<section class="capability"');
  assert.ok(lead > 0 && panel > lead, "capability panel sits right after the description");
  assert.ok(!page.slice(lead, panel).includes("<div class=\"prose\">"));
});

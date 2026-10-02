import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cloudWriteGate } from "./cloud-save.mjs";
import {
  parseIssueCard,
  renderCollectorCardPage,
  collectHttpResult,
  sanitizeCardLinks,
  parseCardPath,
  parseCollectPath,
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
  assert.match(html, /og:image" content="https:\/\/cloud\.warmersun\.com\/card\/11111111-1111-4111-8111-111111111111\/image"/);
  assert.match(html, /twitter:card" content="summary_large_image"/);
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
  assert.deepEqual(parseCardPath(`/card/${CARD_ID}`), { id: CARD_ID, image: false });
  assert.deepEqual(parseCardPath(`/card/${CARD_ID}/image`), { id: CARD_ID, image: true });
  assert.deepEqual(parseCollectPath(`/api/me/cards/${CARD_ID}/collect`), { id: CARD_ID });
  assert.equal(parseCardPath("/card/not-a-uuid")?.invalid, true);
  assert.equal(parseCardPath("/signin"), null);
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

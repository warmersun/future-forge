---
name: future-forge-collector-cards
license: MIT
description: >
  Research a real emerging-technology capability and author a Future Forge
  collector card JSON file (also called a collection card). Players open a
  public link, collect the card, and play it as a free reusable invention
  tile. Portable multi-harness skill — not tied to a single agent product.
  Knows the issue-script shape: id, techId, title, description, capability,
  useCases, body, links, source, and the sibling page image. Daily cards live in
  cards/daily/YYYY-MM-DD-<slug>.json and publish on merge through GitHub
  Actions. Use when asked to create, write, or edit a collector card,
  collection card, or cards/**/*.json capability tile.
---

# Future Forge collector-card author

**License: MIT** (this skill package only).

You write **one collector card**: a real capability, in general terms, that a learner can collect and then drop onto any board as an invention. The playable place stays fictive and is **not** in the card. The card is the capability.

## When to use

- "Write a collector card / collection card for this advance"
- "Turn this paper or announcement into a card players can collect"
- "Produce the JSON the issue script accepts"

## Deliverable

One JSON file next to its page image:

- **Daily card (weekday news flow):** `cards/daily/YYYY-MM-DD-<kebab-slug>.json`
- **One-off / example:** `cards/<slug>.json` (examples live in `cards/examples/`)
- Image: same basename, `.jpg` / `.jpeg` / `.png` / `.webp`, 16:9, ≤ 1.5 MB, **AI-generated** (no photos, no logos — same rule as Spotlight brief beats)
- The daily card **must** carry a fixed UUID `"id"`. Mint one once with `node -e "console.log(crypto.randomUUID())"` and keep it forever. Reusing or changing an id creates (or would create) a second card.
- Validate: `npm run validate:collector-card -- cards/daily/<file>.json`
- **Publish:** merging a daily card into `main` publishes it automatically (GitHub Actions + the `DATABASE_URL` repository secret). Do **not** run the issue script yourself for a daily card. For a one-off outside `cards/daily/`, run only when asked: `./scripts/issue-collector-card.sh cards/<slug>.json` (needs `DATABASE_URL`; prints `/card/<uuid>`). Dry-run: add `--dry-run`.

| Doc | Purpose |
|-----|---------|
| **`references/schema.md`** | Field caps, what is stored, what the player and the tile see |
| **`references/output-contract.md`** | Skeleton and omit rules |
| **`cards/examples/*.json`** | Two shipped cards — imitate their prose |

## What each field reaches

| Field | Public page | Played tile | Stored |
|-------|-------------|-------------|--------|
| `source` | — | — | **no** (operator note only) |
| `techId` | emTech name | the tile's emTech; free if it is the only tile of that tech | yes |
| `title` | heading, picker, link preview | tile name | yes, 1–80 |
| `description` | lede; link preview uses the first 300 | **how-text**; the first **400** characters are the picture prompt | yes, 1–4000 |
| `capability` | **Capability** panel right under the lede | — | yes, folded into the body (≤ 400) |
| `useCases` | **Use cases** list inside that panel | — | yes, folded into the body (1–3 × ≤ 200) |
| `body` | extra paragraphs under "The details" | — | yes, ≤ 8000 including the two sections above |
| `links` | list under the prose | — | yes, ≤ 8 |
| image file | 16:9 cover and link-preview image | — (tile art is generated from `description`) | yes |

A collected card can be played again. One card mints at most one tile on a board. Playing it does not spend Budget. It still occupies a stack slot when its emTech is not already on the field.

## Hard rules

1. **`techId`** is one id from `skills/future-forge-quest/references/tech-ids.md` or `TECHS` in `js/data.js`. Unknown ids fail validation.
2. **Player-facing prose is the capability, not the news.** `title`, `description`, `body`, and link `label`s do not name the company, lab, product, or paper. Those belong in `source` and in the link URLs.
3. **`description` is the invention.** One paragraph a learner could mean as "how this works here": the mechanism, in everyday words. Put that mechanism in the **first 400 characters** — that slice is the picture prompt and the link preview clips at 300. No quest, no named people, no "your job".
4. **`capability` and `useCases` are required on every card** (the validator enforces them for `cards/daily/`). `capability` answers, in plain words a 14-year-old understands: *what can we do now that we could not do before?* One or two sentences, ≤ 400 characters. Say what is demonstrated today; if it is an early lab result or a pilot, say so. `useCases` is a list of 1–3 (2–3 is better) concrete, plain-language uses, each ≤ 200 characters, phrased as what this could make possible. Every use case must be grounded in a claim the linked sources make. No speculation the sources do not support, no names of labs, companies, products, or journals.
5. **`title`** names the capability (≤ 80). **`body`** is the public-page extra: where this sits in a larger system, the bottleneck, and one honest limit. Blank line between paragraphs. Omit `body` if you have nothing to add.
6. **`source`** is required for the operator and is not stored or shown. One line: who announced or published what, and the date. No invented attribution.
7. **`links`**: 1–8 entries. `label` ≤ 80, saying what the page shows. `url` is `http` or `https` with no username or password. Primary sources only. A bad URL is dropped on issue, not repaired.
8. **No invented facts.** Counts, times, and limits in `description` and `body` must be in the linked sources. If you cannot cite it, leave it out.
9. **`id`.** Daily cards always include a fixed UUID. One-off / example cards omit it until they already have one (then keep it). Never invent a second id for the same card. No `""`, no `[]`. Omit unused optional keys (`published`, `image`). Set `published: false` only to hide a card. Set `image` only when the picture is not the sibling file (path relative to the JSON).
10. **New cards need a picture** before issue. Same basename as the JSON, AI-generated, 16:9, ≤ 1.5 MB, no photos or logos. The issuer refuses a new card with no image file. Daily cards fail validation without one.
11. Validate until the script prints `OK`. Justify any `warn:` in the hand-off. Do not run the issue script for a daily card — the merge publishes it. For anything else, do not run the issue script unless the user asked to publish.

## Procedure

### 1. Intake

Which real advance, and which single `techId` it belongs to? One card, one capability, one emTech.

### 2. Research

Read the primary sources. Keep a one-line citation for `source`. Collect only claims you can point at with a link. Note the honest limit (what still fails, what is a pilot, what the mark or the machine does not survive).

### 3. Write the card

- `title`: the capability in a short phrase.
- `description`: one paragraph, mechanism first, general terms, aim ≤ 400 characters.
- `capability`: what we can do now that we could not do before, in plain words. Honest about how early it is.
- `useCases`: 1–3 concrete uses this could make possible, each one sentence, each backed by the sources.
- `body`: system context, bottleneck, honest limit. One to three paragraphs.
- `links`: the pages you actually used.
- `source`: operator citation.

Match the voice of `cards/examples/drones-urban-delivery.json` and `cards/examples/synbio-protein-watermark.json`: full sentences, concrete, no hype adjectives, no unexplained acronyms.

### 4. Validate

```bash
npm run validate:collector-card -- cards/daily/YYYY-MM-DD-<slug>.json
```

`unknown_tech`, `bad_title`, `bad_description`, `bad_capability`, `bad_use_cases`, `bad_body`, `bad_id`, and (for daily cards) `id_required`, `capability_required`, `use_cases_required`, `bad_daily_name`, `image_required`, and `image_not_16x9` are failures. Fix them. For one-off cards a missing sibling image is a warning until you add the file; the issue script treats it as a failure for a new card.

### 5. Preview screenshots (required on every card PR)

Sic reviews the card as a reader sees it, so every collector-card PR carries screenshots of the local preview.

1. Render the card locally: `node scripts/preview-collector-card.mjs cards/daily/<file>.json` (serves `http://localhost:8766/card/preview`, no database).
2. Screenshot the full page with a headless browser (Chromium/Chrome via Playwright or similar), reduced motion on: **desktop** 1440×900 and **mobile** 390×844 (2× scale). Look at both: the title, the image, the Capability panel with its Use cases, and the details must all read correctly. The card number (`No. 0000·0000`) and "Sign in is unavailable" are preview placeholders.
3. Push the PNGs to the `card-previews` branch (orphan, never merged; create it if missing) as `previews/<card-basename>-desktop.png` and `-mobile.png`. For a re-shoot, add a suffix (`-v2`) instead of overwriting.
4. Post a PR comment with a one-line caption and both images, using `https://github.com/warmersun/future-forge/blob/card-previews/previews/<file>?raw=true` as the image URL. Never add the screenshots to the card PR's own branch.

### 6. Hand off

Tell the user the JSON path, the fixed `id`, whether an image is beside it, and any warning you left in place.

- **Daily card:** open a PR that adds the JSON + image under `cards/daily/`. Merging into `main` publishes it. Do not run the issue script.
- **One-off:** give the publish command only as the next step they can run:

```bash
./scripts/issue-collector-card.sh cards/<slug>.json
```

## Daily collector cards (weekday news)

Bob picks one real invention each weekday. Future Forge authors it as a collector card under `cards/daily/`, opens a PR in this repo, and Sic merges. The merge runs `.github/workflows/collector-cards-publish.yml`, which upserts the card into Neon on its UUID and posts the `/card/<uuid>` link on the PR.

| Rule | Detail |
|------|--------|
| Path | `cards/daily/YYYY-MM-DD-<kebab-slug>.json` + sibling image |
| `id` | Required. Stable UUID. The database primary key. Edits keep the same id and update the card in place. |
| `capability` + `useCases` | Required. Shown as a highlighted panel right under the description. |
| Preview | Desktop + mobile screenshots posted on the PR (images on the `card-previews` branch). |
| Image | AI-generated, 16:9, ≤ 1.5 MB, jpg/png/webp, no photos or logos |
| Scope | Only `cards/daily/` is published. `cards/examples/` and `test/fixtures/` never are. |
| Idempotency | `INSERT ... ON CONFLICT (id) DO UPDATE`. Re-runs and later merges never create a second card. |
| Secret | Repository secret `DATABASE_URL` = the Neon connection string (same value as on the portal). See the README. |
| Manual republish | Actions → Collector cards publish → Run workflow (optional dry run). |

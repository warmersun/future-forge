---
name: future-forge-collector-cards
license: MIT
description: >
  Research a real emerging-technology capability and author a Future Forge
  collector card JSON file (also called a collection card). Players open a
  public link, collect the card, and play it as a free reusable invention
  tile. Portable multi-harness skill — not tied to a single agent product.
  Knows the issue-script shape: id, techId, title, description, body, links,
  source, and the sibling page image. Daily cards live in
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
| `body` | extra paragraphs | — | yes, ≤ 8000 |
| `links` | list under the prose | — | yes, ≤ 8 |
| image file | 16:9 cover and link-preview image | — (tile art is generated from `description`) | yes |

A collected card can be played again. One card mints at most one tile on a board. Playing it does not spend Budget. It still occupies a stack slot when its emTech is not already on the field.

## Hard rules

1. **`techId`** is one id from `skills/future-forge-quest/references/tech-ids.md` or `TECHS` in `js/data.js`. Unknown ids fail validation.
2. **Player-facing prose is the capability, not the news.** `title`, `description`, `body`, and link `label`s do not name the company, lab, product, or paper. Those belong in `source` and in the link URLs.
3. **`description` is the invention.** One paragraph a learner could mean as "how this works here": the mechanism, in everyday words. Put that mechanism in the **first 400 characters** — that slice is the picture prompt and the link preview clips at 300. No quest, no named people, no "your job".
4. **`title`** names the capability (≤ 80). **`body`** is the public-page extra: where this sits in a larger system, the bottleneck, and one honest limit. Blank line between paragraphs. Omit `body` if you have nothing to add.
5. **`source`** is required for the operator and is not stored or shown. One line: who announced or published what, and the date. No invented attribution.
6. **`links`**: 1–8 entries. `label` ≤ 80, saying what the page shows. `url` is `http` or `https` with no username or password. Primary sources only. A bad URL is dropped on issue, not repaired.
7. **No invented facts.** Counts, times, and limits in `description` and `body` must be in the linked sources. If you cannot cite it, leave it out.
8. **`id`.** Daily cards always include a fixed UUID. One-off / example cards omit it until they already have one (then keep it). Never invent a second id for the same card. No `""`, no `[]`. Omit unused optional keys (`published`, `image`). Set `published: false` only to hide a card. Set `image` only when the picture is not the sibling file (path relative to the JSON).
9. **New cards need a picture** before issue. Same basename as the JSON, AI-generated, 16:9, ≤ 1.5 MB, no photos or logos. The issuer refuses a new card with no image file. Daily cards fail validation without one.
10. Validate until the script prints `OK`. Justify any `warn:` in the hand-off. Do not run the issue script for a daily card — the merge publishes it. For anything else, do not run the issue script unless the user asked to publish.

## Procedure

### 1. Intake

Which real advance, and which single `techId` it belongs to? One card, one capability, one emTech.

### 2. Research

Read the primary sources. Keep a one-line citation for `source`. Collect only claims you can point at with a link. Note the honest limit (what still fails, what is a pilot, what the mark or the machine does not survive).

### 3. Write the card

- `title`: the capability in a short phrase.
- `description`: one paragraph, mechanism first, general terms, aim ≤ 400 characters.
- `body`: system context, bottleneck, honest limit. One to three paragraphs.
- `links`: the pages you actually used.
- `source`: operator citation.

Match the voice of `cards/examples/drones-urban-delivery.json` and `cards/examples/synbio-protein-watermark.json`: full sentences, concrete, no hype adjectives, no unexplained acronyms.

### 4. Validate

```bash
npm run validate:collector-card -- cards/daily/YYYY-MM-DD-<slug>.json
```

`unknown_tech`, `bad_title`, `bad_description`, `bad_body`, `bad_id`, and (for daily cards) `id_required`, `bad_daily_name`, `image_required`, and `image_not_16x9` are failures. Fix them. For one-off cards a missing sibling image is a warning until you add the file; the issue script treats it as a failure for a new card.

### 5. Hand off

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
| Image | AI-generated, 16:9, ≤ 1.5 MB, jpg/png/webp, no photos or logos |
| Scope | Only `cards/daily/` is published. `cards/examples/` and `test/fixtures/` never are. |
| Idempotency | `INSERT ... ON CONFLICT (id) DO UPDATE`. Re-runs and later merges never create a second card. |
| Secret | Repository secret `DATABASE_URL` = the Neon connection string (same value as on the portal). See the README. |
| Manual republish | Actions → Collector cards publish → Run workflow (optional dry run). |

---
name: future-forge-collector-cards
license: MIT
description: >
  Research a real emerging-technology capability and author a Future Forge
  collector card JSON file (also called a collection card). Players open a
  public link, collect the card, and play it as a free reusable invention
  tile. Portable multi-harness skill — not tied to a single agent product.
  Knows the issue-script shape: techId, title, description, body, links,
  source, and the sibling page image. Use when asked to create, write, or
  edit a collector card, collection card, or cards/*.json capability tile.
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

- Path: `cards/<slug>.json` (examples live in `cards/examples/`)
- Image: same basename, `.jpg` / `.jpeg` / `.png` / `.webp`, 16:9, ≤ 1.5MB
- Validate: `npm run validate:collector-card -- cards/<slug>.json`
- Publish only when the user asks: `./scripts/issue-collector-card.sh cards/<slug>.json` (needs `DATABASE_URL`; prints `/card/<uuid>`)

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
8. **Omit** unused optional keys (`id`, `published`, `image`). No `""`, no `[]`. Include `id` only when updating a card that already has a UUID. Set `published: false` only to hide a card. Set `image` only when the picture is not the sibling file (path relative to the JSON).
9. **New cards need a picture** before issue. Same basename as the JSON. The issuer refuses a new card with no image file.
10. Validate until the script prints `OK`. Justify any `warn:` in the hand-off. Do not run the issue script unless the user asked to publish.

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
npm run validate:collector-card -- cards/<slug>.json
```

`unknown_tech`, `bad_title`, `bad_description`, `bad_body`, and `bad_id` are failures. Fix them. A missing sibling image is a warning until you add the file; the issue script treats it as a failure for a new card.

### 5. Hand off

Tell the user the JSON path, whether an image is beside it, and any warning you left in place. Give the publish command only as the next step they can run:

```bash
./scripts/issue-collector-card.sh cards/<slug>.json
```

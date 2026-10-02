# Collector card schema

The issue script (`scripts/issue-collector-card.mjs`) reads one JSON object and calls `parseIssueCard` in `js/server/collector-cards.mjs`. There is no `schema` version string. Unknown keys other than the ones below are ignored. `source` is read by authors and then dropped.

## Required

| Key | Type | Rules |
|-----|------|--------|
| `techId` | string | Trimmed. Must be a `TECHS` id in `js/data.js`. `tech_id` is accepted as an alias and stored as `techId`. |
| `title` | string | Trimmed, 1–80 characters. Tile name, page heading, picker label, link-preview title. |
| `description` | string | Trimmed, 1–4000 characters. Page lede. Tile how-text (clipped at 4000 when minted). Picture prompt is the first 400. Link preview uses the first 300 after whitespace collapse. |

## Operator note (not stored)

| Key | Type | Rules |
|-----|------|--------|
| `source` | string | Who announced or published what, and the date. The parser does not copy it onto the card. The validator warns when it is missing. Never shown to players. |

## Optional

| Key | Type | Rules |
|-----|------|--------|
| `body` | string | Trimmed, ≤ 8000. Public page only, split on blank lines into paragraphs. Single newlines inside a paragraph become `<br>`. Omit when empty. |
| `links` | array | Max 8 kept. Each item is `{ "label", "url" }`. Label trimmed and clipped at 80. URL must be `http:` or `https:` with a hostname and no username or password. Anything else is dropped. Omit the key when there are no links; the craft rule is still to include 1–8 real sources. |
| `id` | string | UUID. Include only to update a card that already exists. A non-UUID fails with `bad_id`. A new card gets a random UUID at issue time. |
| `published` | boolean | Default `true`. `false` hides the card (collect returns not found). Omit when publishing. |
| `image` | string | Path relative to the JSON. Overrides the sibling-file search. Omit when the picture sits next to the JSON. |

## Page image

Not a JSON field unless `image` overrides it. The issuer looks beside the JSON, same basename, first existing extension in this order: `.jpg`, `.jpeg`, `.png`, `.webp`.

- Types stored: `image/jpeg`, `image/png`, `image/webp`
- Size: 1 byte–1,500,000 bytes
- The page shows it at 16:9, `object-fit: cover`
- A new card with no file fails issue: `image_required: add <slug>.jpg next to the JSON`
- An update that passes `id` and no new file keeps the picture already stored

## Error codes

`parseIssueCard` returns `{ ok: false, error }` with one of:

| Code | Cause |
|------|--------|
| `unknown_tech` | Missing or unknown `techId` |
| `bad_title` | Empty or longer than 80 |
| `bad_description` | Empty or longer than 4000 |
| `bad_body` | Longer than 8000 |
| `bad_id` | `id` present and not a UUID |
| `image_required` | Only when the caller sets `requireImage` (the validator does not; the issue script requires a sibling file for new cards) |

## Played tile

Minted in the workshop from the library row, not from this file directly:

- `name` ← `title`
- `howText` ← `description`
- `techId` ← `techId`
- `origin` `"collector"`, `collectorCardId` ← the stored UUID
- Picture prompt ← `description` or `title`, first 400 characters
- Costs no Budget. Counts as a stack slot when that emTech is not already placed. A second tile of the same card is refused on that board.

# Collector card schema

The issue script (`scripts/issue-collector-card.mjs`) reads one JSON object and calls `parseIssueCard` in `js/server/collector-cards.mjs`. There is no `schema` version string. Unknown keys other than the ones below are ignored. `source` is read by authors and then dropped.

## Required

| Key | Type | Rules |
|-----|------|--------|
| `techId` | string | Trimmed. Must be a `TECHS` id in `js/data.js`. `tech_id` is accepted as an alias and stored as `techId`. |
| `title` | string | Trimmed, 1–80 characters. Tile name, page heading, picker label, link-preview title. |
| `description` | string | Trimmed, 1–4000 characters. Page lede. Tile how-text (clipped at 4000 when minted). Picture prompt is the first 400. Link preview uses the first 300 after whitespace collapse. |

## Capability and use cases (required for daily cards)

| Key | Type | Rules |
|-----|------|--------|
| `capability` | string | Plain words: what can we do now that we could not do before? Whitespace collapsed, 1–400 characters. Required for `cards/daily/`; optional elsewhere, but strongly expected. |
| `useCases` | array of strings | 1–3 items, each a plain sentence, 1–200 characters after trimming (a leading `- ` is stripped). Required for `cards/daily/`. `use_cases` is accepted as an alias. |

Both are stored inside `body` (no extra database columns). The issuer writes the body as:

```text
## Capability
<capability>

## Use cases
- <use case 1>
- <use case 2>

## The details

<your body paragraphs>
```

The card page renders that opening block as a highlighted panel directly under the description, then the details. The 8000-character `body` cap applies to that whole stored text. Cards without these fields store and render exactly as before. In a hand-written `body`, a paragraph that starts with `## ` becomes a heading and a paragraph whose lines all start with `- ` becomes a list.

## Operator note (not stored)

| Key | Type | Rules |
|-----|------|--------|
| `source` | string | Who announced or published what, and the date. The parser does not copy it onto the card. The validator warns when it is missing. Never shown to players. |

## Optional

| Key | Type | Rules |
|-----|------|--------|
| `body` | string | Trimmed, ≤ 8000. Public page only, split on blank lines into paragraphs. Single newlines inside a paragraph become `<br>`. Omit when empty. |
| `links` | array | Max 8 kept. Each item is `{ "label", "url" }`. Label trimmed and clipped at 80. URL must be `http:` or `https:` with a hostname and no username or password. Anything else is dropped. Omit the key when there are no links; the craft rule is still to include 1–8 real sources. |
| `id` | string | UUID. **Required for every file under `cards/daily/`.** For one-off cards, include it only to update a card that already exists; a new one-off without an id still gets a random UUID at issue time (legacy path). A non-UUID fails with `bad_id`. Changing an existing card's id would publish a second card — the PR check rejects that. |
| `published` | boolean | Default `true`. `false` hides the card (collect returns not found). Omit when publishing. |
| `image` | string | Path relative to the JSON. Overrides the sibling-file search. Omit when the picture sits next to the JSON. |

## Page image

Not a JSON field unless `image` overrides it. The issuer looks beside the JSON, same basename, first existing extension in this order: `.jpg`, `.jpeg`, `.png`, `.webp`.

- Types stored: `image/jpeg`, `image/png`, `image/webp`
- Size: 1 byte–1,500,000 bytes
- The page shows it at 16:9, `object-fit: cover`
- The picture itself must be **16:9** (within 2%), **AI-generated**, no photos and no logos (same rule as Spotlight brief beats). Daily cards fail validation when the aspect is wrong; examples only warn.
- A new card with no file fails issue: `image_required: add <slug>.jpg next to the JSON`. Daily cards also fail validation without the file.
- An update that passes `id` and no new file keeps the picture already stored

## Error codes

`parseIssueCard` returns `{ ok: false, error }` with one of:

| Code | Cause |
|------|--------|
| `unknown_tech` | Missing or unknown `techId` |
| `bad_title` | Empty or longer than 80 |
| `bad_description` | Empty or longer than 4000 |
| `bad_capability` | `capability` present but empty, not a string, or over 400 |
| `bad_use_cases` | `useCases` not an array of 1–3 non-empty strings of at most 200 characters |
| `bad_body` | Stored body (Capability + Use cases + body) longer than 8000 |
| `bad_id` | `id` present and not a UUID |
| `image_required` | Daily cards: the validator. New cards of any kind: the issue script. |

## Played tile

Minted in the workshop from the library row, not from this file directly:

- `name` ← `title`
- `howText` ← `description`
- `techId` ← `techId`
- `origin` `"collector"`, `collectorCardId` ← the stored UUID
- Picture prompt ← `description` or `title`, first 400 characters
- Costs no Budget. Counts as a stack slot when that emTech is not already placed. A second tile of the same card is refused on that board.


## Daily cards

Files under `cards/daily/` are published automatically when they land on `main`. Extra rules on top of the schema above:

| Rule | Detail |
|------|--------|
| File name | `YYYY-MM-DD-<kebab-slug>.json` (real calendar date, lowercase slug) |
| `id` | Required, fixed UUID. Mint once; never change. |
| `capability`, `useCases` | Required (see above). |
| Image | Sibling file required before the PR can pass. 16:9, ≤ 1.5 MB, jpg/png/webp, AI-generated. |
| Scope | Only this folder is published. `cards/examples/` is never published by the workflow. |

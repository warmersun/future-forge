# Output contract

Write one JSON object. UTF-8. Two-space indent. No trailing commentary in the file.

## Skeleton

```json
{
  "source": "Lab or company, what was announced, and the date. Not stored or shown.",
  "id": "5b7c2f0e-3d1a-4c6b-9e8f-0a1b2c3d4e5f",
  "techId": "synbio",
  "title": "Name the capability in a short phrase",
  "description": "One paragraph. The mechanism, in general terms, with any cited number. This is the invention how-text. Keep it within 400 characters so the picture prompt gets the whole mechanism.",
  "body": "Where this sits in a larger system. The bottleneck. An honest limit in its own sentence.",
  "links": [
    {
      "label": "What this page shows",
      "url": "https://example.com/primary-source"
    }
  ]
}
```

The `"id"` line is required for every daily card. Mint once with `node -e "console.log(crypto.randomUUID())"` and keep it.

## Omit

- `id` — only for a brand-new one-off / example card that has never been issued. Daily cards always include it. Never invent a second id for the same card.
- `published` — unless the card must stay hidden
- `image` — unless the picture is not `<same-basename>.jpg` / `.jpeg` / `.png` / `.webp` next to the JSON
- `body` — if the description already holds the only claim you can support
- empty strings, empty arrays, and `null`

## File name

- **Daily:** `cards/daily/YYYY-MM-DD-<kebab-slug>.json`
- **One-off / example:** `cards/<slug>.json` (or under `cards/examples/`)

Slug is kebab-case from the capability, not from the company. The page image uses that same basename, is AI-generated, 16:9, ≤ 1.5 MB, and has no photos or logos.

## Before hand-off

```bash
npm run validate:collector-card -- cards/daily/YYYY-MM-DD-<slug>.json
```

`OK` and no unexplained `warn:`. For a daily card the sibling image must already exist (validation fails without it). Merging the PR publishes it; do not run the issue script for daily cards.

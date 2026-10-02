# Output contract

Write one JSON object. UTF-8. Two-space indent. No trailing commentary in the file.

## Skeleton

```json
{
  "source": "Lab or company, what was announced, and the date. Not stored or shown.",
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

## Omit

- `id` — unless this file updates a card that already has a UUID
- `published` — unless the card must stay hidden
- `image` — unless the picture is not `<same-basename>.jpg` / `.jpeg` / `.png` / `.webp` next to the JSON
- `body` — if the description already holds the only claim you can support
- empty strings, empty arrays, and `null`

## File name

`cards/<slug>.json`. Slug is kebab-case from the capability, not from the company. The page image uses that same slug.

## Before hand-off

```bash
npm run validate:collector-card -- cards/<slug>.json
```

`OK` and no unexplained `warn:`. For a new card, the sibling image exists or the hand-off says the operator still has to add it before `./scripts/issue-collector-card.sh`.

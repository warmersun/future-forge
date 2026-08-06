# Quest tile schema (`future-forge.quest-tile/v1`)

Portable **Spotlight Quest** files for Future Forge. Learners import JSON; the game can replace the Daily Quest on that device.

## Pedagogy

1. Research a **real recent emTech advance**.
2. Write a **fictive** local crisis shaped so that technology’s new capability is a natural invent target.
3. Set **`suggested` to exactly one** catalog tech id (the spotlight).
4. Put the long learner-facing text in **`mission.briefMd`** (Markdown).

## Browser import

**JSON only.** Validate with:

```bash
npm run validate:quest -- path/to/quest.json
```

## Minimal shape

See `test/fixtures/quests/spotlight-gene-seq.json`.

Required:

| Field | Notes |
|-------|--------|
| `schema` | `"future-forge.quest-tile/v1"` |
| `kind` | `"quest"` (packs not supported in v1 UI) |
| `globalId` | Must match a theme in `js/data.js` `GLOBALS` |
| `spotlight.techId` | Must match `TECHS` id |
| `mission.suggested` | Exactly `[spotlight.techId]` |
| `mission.briefMd` | Non-empty Markdown brief |
| `mission.title`, `mission.place`, `mission.scene` | Scene = plain-text design-challenge lede (≤500 chars; craft in `skills/future-forge-quest/references/scene-prose.md` / `js/scene-prose.js`) |

Optional: `placement.mode` (`replace-daily` default | `alongside` | `library-only`), `research`, `author`, `tags`, `resources`.

### Optional `resources` (starting player resources)

Override solo (and multiplayer invent) starting resources for this Quest only. Omitted fields keep the global defaults from `js/data.js` `GAME` (`apMax: 3`, `startingBudget: 5`, `startingWill: 3`).

| Field | Notes |
|-------|--------|
| `apMax` | Action points per turn (integer ≥ 0) |
| `startingBudget` | Starting budget (integer ≥ 0) |
| `startingWill` | Starting political will / goodwill (integer ≥ 0) |

All three fields are optional. Only present keys override. Negative values, non-numbers, and non-integers are rejected by validation.

```json
"resources": {
  "apMax": 4,
  "startingBudget": 8,
  "startingWill": 5
}
```

Partial example (easier budget/will, default AP):

```json
"resources": {
  "startingBudget": 9,
  "startingWill": 5
}
```

When any value differs from the global default, selection UI (theme pick, daily/focus, External list, import library, multiplayer mission pick) shows a **Start · …** chip so learners see the adjusted start before they play.

## Markdown subset (rendered in-game)

Headings `#`–`###`, paragraphs, `**bold**`, `*italic*`, lists, `https?` links. No raw HTML, images, or scripts.

## License note

Example tiles and the portable authoring skill under `skills/future-forge-quest/` are **MIT**. The Future Forge game itself may use a different license.

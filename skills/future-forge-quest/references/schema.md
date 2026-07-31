# Schema pointer

Canonical schema name: **`future-forge.quest-tile/v1`**

Full field docs live in the game repo: `docs/quest-tile-schema.md`.

Required highlights:

- `kind: "quest"`
- `globalId` — valid theme id
- `spotlight.techId` — valid tech id
- `mission.suggested: [<same techId>]`
- `mission.briefMd` — non-empty Markdown (place section: design-challenge story craft — `references/scene-prose.md`)
- `mission.scene` — plain-text lede ≤500 chars; same story craft (spine + easy rhythm), not a dense compound sentence
- `placement.mode` — default `replace-daily`

Validate: `npm run validate:quest -- path.json`

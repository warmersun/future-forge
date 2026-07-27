# Schema pointer

Canonical schema name: **`future-forge.quest-tile/v1`**

Full field docs live in the game repo: `docs/quest-tile-schema.md`.

Required highlights:

- `kind: "quest"`
- `globalId` — valid theme id
- `spotlight.techId` — valid tech id
- `mission.suggested: [<same techId>]`
- `mission.briefMd` — non-empty Markdown
- `mission.scene` — short lede
- `placement.mode` — default `replace-daily`

Validate: `npm run validate:quest -- path.json`

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

## Crisis meters (`mission.pressure`) — structured (required)

```json
"pressure": {
  "local":   { "label": "Outbreak", "pressure": 2, "pressureRise": 1, "winMax": 1 },
  "global":  { "label": "Capacity", "pressure": 3, "pressureRise": 1, "winMax": 1 },
  "support": { "label": "Fear",     "pressure": 1, "pressureRise": 1, "winMax": 1 }
}
```

- Keys: only `local`, `global`, `support` (omit any role to hide that meter).
- Each entry: `label` (HUD name), `pressure` 0–5, `pressureRise` 0–3, `winMax` 0–5.
- Do **not** use flat maps or separate top-level `pressureRise` / `winMax`.

## Optional `grounding` (AI source of truth)

Free-text / Markdown string for authoritative Quest context (technology, capabilities, milestone, unlocked use cases). Passed to the co-inventor and feasibility assessor when present. Omit for default AI behavior.

## Optional learning module / tutor mode

- `isLearningModule` (boolean) — activates solo AI **tutor** mode + opens Co-Inventor tab
- `aiTutorContext` (string) — hidden tutor notes for the AI only
- `module` / `lesson` / `totalLessons` (positive integers) — progress label only; no unlock sequencing yet

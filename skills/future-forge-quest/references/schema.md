# Quest tile schema (`future-forge.quest-tile/v1`)

Canonical name: **`future-forge.quest-tile/v1`**

In the game repo, full docs also live at `docs/quest-tile-schema.md`. This skill reference is enough to author a valid tile.

Authoring recipes for **learning modules** and **sponsors**: `learning-and-sponsor.md`.

Validate:

```bash
npm run validate:quest -- path/to/quest.json
```

## Required

| Field | Notes |
|-------|--------|
| `schema` | `"future-forge.quest-tile/v1"` |
| `kind` | `"quest"` (packs not supported) |
| `globalId` | Valid theme id from game `GLOBALS` / theme list |
| `spotlight.techId` | One valid tech id (`references/tech-ids.md` or `js/data.js` `TECHS`) |
| `mission.suggested` | Exactly `[spotlight.techId]` |
| `mission.briefMd` | Non-empty Markdown (see `brief-template.md`); **The place** = design-challenge story craft |
| `mission.title`, `mission.place`, `mission.scene` | Scene ≤500 chars; craft in `scene-prose.md` |
| `mission.pressure` | **Structured** crisis meters (below) — flat maps are **rejected** |

Also set: `id`, `title`, `placement`, `spotlight` fields, `research`, years, stakeholder, `visionTheme` as in the output contract.

## Crisis meters — `mission.pressure` (required structured)

Dictionary of up to three perspectives. **Only present keys appear on the HUD** and in win/collapse checks. Omit a role for focused / easier quests.

| Key | Perspective |
|-----|-------------|
| `local` | Local harm / mitigation on the ground |
| `global` | Systemic / driver pressure |
| `support` | Trust, legitimacy, public fear |

Each active entry:

| Field | Notes |
|-------|--------|
| `label` | Short HUD name (plain English, 1–3 words, Title Case) |
| `pressure` | Starting level 0–5 |
| `pressureRise` | Rise per Wait 0–3 (default 1) |
| `winMax` | Hold at or under this after deploy 0–5 (default 1) |

```json
"pressure": {
  "local": {
    "label": "Outbreak",
    "pressure": 2,
    "pressureRise": 1,
    "winMax": 1
  },
  "support": {
    "label": "Fear",
    "pressure": 1,
    "pressureRise": 1,
    "winMax": 1
  }
}
```

**Do not** use flat maps like `"Outbreak": 2` or separate top-level `pressureRise` / `winMax`.

Subset of roles → selection UI shows a **Crisis · Local · Support** chip.

## Optional `resources` (starting player resources)

Override invent start values for this Quest only. Omitted keys keep game defaults (`apMax: 3`, `startingBudget: 5`, `startingWill: 3`).

| Field | Type |
|-------|------|
| `apMax` | integer ≥ 0 |
| `startingBudget` | integer ≥ 0 |
| `startingWill` | integer ≥ 0 |

```json
"resources": {
  "apMax": 4,
  "startingBudget": 8,
  "startingWill": 4
}
```

Selection UI shows **Start · …** when values differ from defaults. Tile top-level or under `mission`.

## Optional `grounding` (AI source of truth)

Free-text / Markdown for **authoritative capability context**. When present, Future Forge injects it into co-inventor, claim-timing assess, challenge pose/coach/judge, art-of-the-possible, etc. Prefer over generic model assumptions.

**Guidance only — not schema-enforced.** Full writing guide: **`grounding-template.md`**.

Causal chain (meaning, not required field order):

```
emTech → product category → capabilities → trends → predictions
  → milestones → use cases → applications
```

emTech alone is usually too broad; **product category** is the focus unit. Unlocks and applications sit under that category. Learner invent = **apply** those use cases locally.

Recommended structure (omit thin sections; may merge Trends+Predictions or Unlocks+Applications):

```markdown
## Technology
- **emTech:** …
- **Product category:** …

## Capabilities
…

## Trends & predictions
…

## Milestone
…

## Unlocks Use Case(s)
…

## Applications
…

## Honest limits
…
```

- Type: string. Non-strings rejected.
- Tile top-level or under `mission`.
- Soft safety ceiling ~50k chars.
- Sponsors may name a product under Milestone as category evidence; invent still targets category-level applications (see `learning-and-sponsor.md`).

## Optional learning module + AI tutor mode

| Field | Type | Notes |
|-------|------|--------|
| `isLearningModule` | boolean | `true` → solo invent opens **Co-Inventor** tab and uses **tutor** system prompt |
| `aiTutorContext` | string | **Hidden** curriculum notes for the AI only — never shown to the player |
| `module` | integer ≥ 1 | Module index (display) |
| `lesson` | integer ≥ 1 | Lesson index (display) |
| `totalLessons` | integer ≥ 1 | Denominator for `Lesson X/Y` |

Progress UI label format: **`Module 1 Lesson 1/3`** (module first). Selection chip: **Learn · Module 1 Lesson 1/3**.

Tutor style (enforced by server prompt when `isLearningModule` is true):

- One idea at a time; short explanations; check understanding.
- Scaffold inventing; do not dump full solutions.
- Use `aiTutorContext` as hidden teaching plan; use `grounding` for capability truth (product-category chain; see `grounding-template.md`).
- No full module unlock/sequencing yet — progress is display-only.

```json
"isLearningModule": true,
"aiTutorContext": "Lesson goal: … SEQUENCE: 1) … 2) … Never paste this to the player.",
"module": 1,
"lesson": 1,
"totalLessons": 3
```

## Optional sponsor attribution (display only)

| Field | Type | Notes |
|-------|------|--------|
| `sponsorName` | string | Shown as “Sponsored by …” |
| `sponsorBanner` | string | Plain-text **tagline** only — **not** an image URL |

- Display-only: no scoring, feasibility, or AI behavior change.
- Put capability truth in **`grounding`** (product category chain; product may evidence Milestone).
- Players invent an **application** of unlocked use cases; **naming a sponsored product is not a valid solution**.

```json
"sponsorName": "Moonshot.ai",
"sponsorBanner": "Kimi K3 open weights — invent the local application"
```

Selection chip: **Sponsored · {name}**.

## Other common fields

| Field | Notes |
|-------|--------|
| `placement.mode` | `replace-daily` (default) \| `alongside` \| `library-only` |
| `research` | `topic`, `bullets`, `sources` (`https` URLs), `showToPlayer` |
| `author`, `tags`, `license`, `summary`, `createdAt` | Metadata |
| `mission.startYear`, `collapseYear`, `yearsPerTurn` | Calendar |
| `mission.stakeholder` | Named role |
| `mission.visionTheme` | e.g. `care-city`, `learn-city`, `rebuild-city` |

## Field placement

Optional fields (`resources`, `grounding`, learning fields, sponsor fields) may sit at **tile top level** or under **`mission`**. Validation accepts both; runtime copies onto the mission.

## Invalid / rejected patterns

- Flat pressure maps or separate `pressureRise` / `winMax` objects at mission root for new tiles  
- Multi-tech `suggested` arrays  
- Non-string `grounding` / `aiTutorContext` / sponsor fields  
- Non-boolean `isLearningModule`  
- Non-positive-integer `module` / `lesson` / `totalLessons`  
- `kind: "quest-pack"`  

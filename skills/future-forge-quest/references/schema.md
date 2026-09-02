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
| `mission.briefMd` | Non-empty Markdown (see `brief-template.md`); **Your job** first, then **The place** (story craft); aim ~250–600 words. Short paragraphs — the UI steps them (see `brief-beats.md`) |
| `title`, `summary`, `spotlight.encourageCopy` | Plain invent job in everyday words (14-year-old test); see `scene-prose.md` Spotlight extras |
| `mission.title`, `mission.place`, `mission.scene` | Scene ≤500 chars; craft in `scene-prose.md`; everyday words |
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
| `description` | Optional. 1–3 everyday sentences of what this meter means in this place. Omit or `""` on old tiles. Recommended on new tiles. |
| `pressure` | Starting level 0–5 |
| `pressureRise` | Rise per Wait 0–3 (default 1) |
| `winMax` | Hold at or under this after deploy 0–5 (default 1) |

```json
"pressure": {
      "local": {
        "label": "Outbreak",
        "description": "The fever pattern is real and invisible while swabs wait on the weekly lab truck.",
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

`description` is **optional and recommended**. Place-specific strain, not the generic local/global/support lecture. Old tiles without it remain valid.

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

## Optional `trends` / `spotlightTrends` (Wait charts)

Plottable exponential series for the Wait overlay. Full schema: game `docs/capability-trend-schema.md` or skill **`future-forge-trends`**.

| Field | Notes |
|-------|--------|
| `trends` | Array (max 8) of capability-trend objects (`techId`, `name`, `summary`, `capability`, `unit`, `compounding`, `anchor`, `milestones`, …). Nested `schema` optional. Overrides catalog by `id`. |
| `spotlightTrends` | String ids to badge. May refer to catalog or embedded ids (dangling catalog refs OK at validate time). |

Markdown **`grounding`** stays AI SoT prose — it is **not** a substitute for chart data. Prefer authoring plottable tiles with `future-forge-trends`, then either publish to warmersun or embed here.

```json
"trends": [
  {
    "id": "gene-seq-cost-per-genome",
    "techId": "gene-sequencing",
    "name": "Cost per human genome",
    "summary": "…",
    "capability": "Affordable whole-genome sequencing",
    "unit": "USD / genome",
    "compounding": { "kind": "halving", "periodYears": 1.5 },
    "anchor": { "date": "2015-01-01", "value": 4000 },
    "milestones": [
      { "label": "$1,000 genome", "date": "2014", "value": 1000, "status": "reached" }
    ]
  }
],
"spotlightTrends": ["gene-seq-cost-per-genome"]
```

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
| `aiTutorContext` | string | **Hidden** curriculum notes for the AI only — never shown wholesale to the player. May include Markdown **resource links** and **illustration** URLs for the tutor to re-emit in chat (see `learning-and-sponsor.md`) |
| `module` | non-empty string | Module **title** (display + catalog group key; max 80 chars) |
| `lesson` | integer ≥ 1 | Lesson index (display) |
| `totalLessons` | integer ≥ 1 | Denominator for `Lesson X/Y` |

Progress UI label format: **`Open-weight AI · Lesson 1/3`** (module title first). Selection chip: **Learn · Open-weight AI · Lesson 1/3**.

Tutor style (enforced by server prompt when `isLearningModule` is true):

- One current idea per reply as a short teaching paragraph (analogy + one mechanism); full sentences.
- Do not quiz the learner; let them ask questions (learner-driven). Answer the question they asked — SEQUENCE does not block a later idea.
- Explain concepts/terms a typical high-school senior may not know on first use.
- Scaffold inventing; do not dump full solutions.
- Use `aiTutorContext` as hidden teaching plan; use `grounding` for capability truth (product-category chain; see `grounding-template.md`).
- Player-facing tutor messages support safe Markdown: **clickable https links** and **inline https images** (`[title](url)`, `![alt](url)`). Stock materials in `aiTutorContext`. **Explain first**, then at most one matching lesson page — never a URL alone, never a page rewrite, never send the learner away to invent.
- No full module unlock/sequencing yet — progress is display-only.

```json
"isLearningModule": true,
"aiTutorContext": "LESSON GOAL: …\nSEQUENCE: 1) …\nRESOURCES:\n- [Primer](https://example.org/primer)\nILLUSTRATIONS:\n- ![Stack diagram](https://example.org/diagram.png)\nNever paste this wholesale to the player.",
"module": "Open-weight AI for classrooms",
"lesson": 1,
"totalLessons": 3
```

## Optional `briefBeats` (authored walkthrough)

Omit when unused. The engine already derives a walkthrough from `briefMd`. Author beats for tighter captions, shipped stills (`imageUrl`), or live prompts (`imagePrompt`). Full rules: **`brief-beats.md`**.

| Field | Notes |
|-------|--------|
| `briefBeats` | Array, 3–8 objects. Tile top-level or under `mission`. Invalid arrays **fail** validation. |

Each beat:

| Field | Notes |
|-------|--------|
| `id` | Unique slug ≤40 |
| `role` | Optional: `job` \| `place` \| `strain` \| `possible` \| `constraints` \| `other` |
| `title` | Player kicker ≤60 |
| `bodyMd` | Caption ≤500 chars; no new facts vs `briefMd` |
| `imageUrl` | Optional `https://…` or `assets/…` still (`jpg`/`png`/`webp`). Walk shows it immediately — no Imagine wait |
| `imagePrompt` | Optional ≤400; live generate only when `imageUrl` is omitted |

`briefMd` remains required. Captions must not contradict the essay.

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

Optional fields (`resources`, `grounding`, learning fields, sponsor fields, `briefBeats`) may sit at **tile top level** or under **`mission`**. Validation accepts both; runtime copies onto the mission.

## Invalid / rejected patterns

- Flat pressure maps or separate `pressureRise` / `winMax` objects at mission root for new tiles  
- Multi-tech `suggested` arrays  
- Non-string `grounding` / `aiTutorContext` / sponsor fields  
- Non-boolean `isLearningModule`  
- Non-string or empty `module` (must be a non-empty title string)
- Non-positive-integer `lesson` / `totalLessons`  
- `kind: "quest-pack"`
- `briefBeats` that is not a 3–8 array of valid beat objects (omit the key instead)  

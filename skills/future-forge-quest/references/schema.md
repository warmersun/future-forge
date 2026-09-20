# Quest tile schema (`future-forge.quest-tile/v1`)

Canonical name: **`future-forge.quest-tile/v1`**

In the game repo, full docs also live at `docs/quest-tile-schema.md`. This skill reference is enough to author a valid tile.

Authoring recipes for **learning modules** and **sponsors**: `learning-and-sponsor.md`.

Validate (shape errors fail; craft lint prints `WARN <code>` lines after `OK:`; `--strict` fails on any warning):

```bash
npm run validate:quest -- path/to/quest.json --strict
```

## What reaches the player and the AI

Write for the surface, not the file. These are the real clips (`js/game.js`, `js/server/fast-eval.mjs`, `js/brief-beats.js`, `js/tech-why.js`).

| Field | Player surface | AI surface | Clip |
|-------|----------------|------------|------|
| `summary` | Invent banner lede, catalog / Friends cards | `fill-quest-summary` exemplar only | whole, ≤420 |
| `mission.briefMd` | Briefing walkthrough (one card per paragraph, merged to 8), then full brief | Conversational co-inventor `challenge.problem` as plain text | **first 2800 chars** |
| `mission.scene` | Co-inventor opening line; Future Vision fallback | Imagine locale lock; fast-eval `mission.scene` | 600 (fast-eval) |
| `grounding` | — | Every fast-eval call (score, assess, sparks, pose, judge, convergence) and the co-inventor | **first 3000 chars** in fast-eval; 50k in chat |
| `pressure[role].description` | Crisis hex popup | Idea sparks (240), score-pathway (400) | meaning in the first sentence |
| `mission.suggestedWhy[id]` | Under each **For this place** card; red-hex "What could help here?" (reasons containing the meter label rank first) | — | 120 |
| `spotlight.encourageCopy` | Under the Spotlight chip; synthesized **Your job** card when the brief has none | — | 280 |
| `spotlight.advanceTitle` / `advanceSummary` / `asOf` | Chip tooltip (`advanceSummary`); `whyHere` fallback | **Tutor mode only** (`isLearningModule`): the tutor names the advance after the learner has the story | 200 / 600 / 32 |
| `aiTutorContext` | — | Conversational tutor only (never fast-eval) | 50k |
| `rules` | HUD weather | Fast-eval `mission.rules` | body 280 |
| `resources` | **Start ·** chip; starting wallet | Economy lab | — |
| `trends` / `spotlightTrends` | Look Ahead charts | — | 8 series |

**Stored, not shown or read:** `research` (incl. `showToPlayer`), `visionTheme`, `placement.activeFrom` / `activeTo` / `priority`, `tags`, `author`, `license`, `version`. `research` is citation metadata for humans reading the file. Capability truth the AI must respect goes in `grounding`.

## Required

| Field | Notes |
|-------|--------|
| `schema` | `"future-forge.quest-tile/v1"` |
| `kind` | `"quest"` (playable) or `"module"` (learning-path wrapper; not playable). Packs (`quest-pack`) not supported |
| `globalId` | Valid theme id from game `GLOBALS` / theme list |
| `spotlight.techId` | One valid tech id (`references/tech-ids.md` or `js/data.js` `TECHS`) |
| `mission.suggested` | **Spotlight-first array, 1–5 valid unique tech ids**: `[spotlight.techId, …supporting]`. This is the **For this place** shelf. Supporting ids are convergence partners (one aimed at the global meter for act two; the economy lab plans with them). Errors: `suggested_spotlight_not_first`, `suggested_too_many` (>5), `suggested_bad_id:<id>`. Duplicates fold. Supporting techs stay offstage in player prose like the spotlight |
| `mission.suggestedWhy` | `{ [techId]: string }` — **one entry per suggested id**, one everyday-words sentence (≤120 chars): what the family could do *here* and which crisis meter label it eases. Under each shelf card and in the crisis-hex "What could help here?" list — a reason ranks first for a hex only if it **contains that meter's label as a literal substring** (`js/tech-why.js`). Family name allowed; no product names. Unknown ids / non-strings dropped; a non-object is rejected (`suggestedWhy_not_object`). Lint: `suggestedWhy_missing:<id>`, `suggestedWhy_no_meter_label:<id>` |
| `mission.briefMd` | Non-empty Markdown (see `brief-template.md`); **The place** → **The bigger problem** → **Your job**; aim ~250–600 words. Short paragraphs — the UI steps them (see `brief-beats.md`) |
| `title`, `summary`, `spotlight.encourageCopy` | Instance + outcome in everyday words (14-year-old test). `summary` is 2–3 short sentences (≤420 chars, shown **whole** on the banner and cards): named person, place, what went wrong now. `encourageCopy` is the outcome. Do **not** name the spotlight or a supporting tech or a sponsor product. See `scene-prose.md` |
| `mission.title`, `mission.place`, `mission.scene` | Scene ≤500 chars; it is the co-inventor's opening line and the Imagine locale lock, so it must stand alone; craft in `scene-prose.md`; everyday words |
| `mission.pressure` | **Structured** crisis meters (below) — flat maps are **rejected** |

Also set: `id`, `title`, `spotlight` fields, years, stakeholder as in the output contract. `research` is citation metadata (never read by the game); `placement` and `visionTheme` are legacy and inert.

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
| `description` | Optional, recommended. 1–3 everyday sentences of what this meter means in this place. Shown in the crisis-hex popup; the AI sees the first 240 chars (idea sparks) / 400 (score-pathway), so the meaning goes in the first sentence. Lint: `pressure_missing_description:<role>` |
| `pressure` | Starting level 0–5. **New tiles:** local **3**, global **2**, support **2**. |
| `pressureRise` | Rise **per calendar year** 0–3. End turn ×1; Wait × `yearsPerTurn`. **New tiles:** local **1**, global **1**, support **0** (time does not grind trust). |
| `winMax` | Hold at or under this after deploy 0–5 (typically **1**) |

Local is more urgent than global (lint `pressure_local_not_hotter`); support rise stays 0 unless trust is meant to rot (lint `pressure_support_rises`). Untreated local 3↑1 hits 5 in 2028. A first island should not also finish the global meter (`economy.md`).

```json
"pressure": {
      "local": {
        "label": "Outbreak",
        "description": "The fever pattern is real and invisible while swabs wait on the weekly lab truck.",
        "pressure": 3,
        "pressureRise": 1,
        "winMax": 1
      },
  "support": {
    "label": "Fear",
    "pressure": 2,
    "pressureRise": 0,
    "winMax": 1
  }
}
```

**Do not** use flat maps like `"Outbreak": 2` or separate top-level `pressureRise` / `winMax`.

`description` is **optional and recommended**. Place-specific strain, not the generic local/global/support lecture. Old tiles without it remain valid.

Subset of roles → selection UI shows a **Crisis · Local · Support** chip.

## Optional `resources` (starting player resources)

Override invent start values for this Quest only. Omitted keys keep game defaults (`apMax: 3`, `startingBudget: 5`, `startingWill: 3`).

Budget is a stock (not refilled by End turn). A scored pathway that **eases** a crisis role pays **+1 Budget per newly eased role**, once per role — the lab counts this, so a two-act tile should not need `startingBudget: 8` just to afford the second island. Raise start only when the **first** tile cannot be bought. Details: **`economy.md`**.

| Field | Type |
|-------|------|
| `apMax` | integer ≥ 0 |
| `startingBudget` | integer ≥ 0 |
| `startingWill` | integer ≥ 0 |

```json
"resources": {
  "apMax": 4,
  "startingBudget": 6,
  "startingWill": 4
}
```

Selection UI shows **Start · …** when values differ from defaults. Tile top-level or under `mission`.

## Optional `rules` (local policy weather)

Omit when unused. 1–3 named local rules already on the books in this place (a contract, lock, quota, or ban the scene is living under). Lobby can write more during play; a rule **does not drop crisis meters**.

| Field | Notes |
|-------|--------|
| `id` | Unique slug ≤48 |
| `kind` | `regulation` \| `law` \| `policy` \| `ban` (`contract` aliases to `policy`) |
| `label` | Short HUD name ≤80 |
| `body` | Optional. 1–3 everyday sentences of what the rule does *here* ≤400 |
| `effects` | Optional array of `share-required`, `eval-required`, `backlash`. Unknown ids fail validation. |

```json
"rules": [
  {
    "id": "override-lock",
    "kind": "policy",
    "label": "Override lock",
    "body": "Risk office grayed human overrides after extra laparotomies drove the liability score.",
    "effects": ["eval-required", "backlash"]
  }
]
```

Tile top-level or under `mission`. Empty array rejected — omit the key.

Side effect: any authored rule marks the Quest as having its own policy weather, which switches off the default theme backlash on the `automation` / `rogue-si` themes (`js/sim/policy-rules.js`). Author a rule because the place lives under it, not to tune backlash.

Tune starting wallet and crisis numbers with the evaluator (full guide: **`economy.md`**; in the game repo also `docs/quest-economy-lab.md`):

```bash
npm run economy:quest -- path/to/quest.json
```

`--write` applies the recommended patch (resources + pressure integers + optional collapseYear) after validation. Developer UI: `/tools/quest-economy` when the game server is started with `--developer`. Target verdict: **challenging** on both solo-no-AI and solo-AI, same calendar year. `too_easy` on either solo path is a failing quest verdict too. Lint flags `startingBudget` ≥ 7 (`resources_budget_high`).

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

**Only the first 3000 characters reach fast-eval** (score, assess, sparks, pose, judge, convergence — `js/server/fast-eval.mjs` `GROUNDING_CAP`). Keep grounding tight, and make sure `## Honest limits` starts inside that window: the limits are the only lines that can turn a timing light red. Lint: `grounding_missing`, `grounding_limits_past_clip:<offset>`, `grounding_limits_missing`, `grounding_unknown_heading:<h>`.

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
- Soft safety ceiling ~50k chars (conversational chat only; fast-eval reads 3000).
- Tutor-only material (discourse maps, debate framings, SEQUENCE) belongs in `aiTutorContext`, not here.
- Sponsors may name a product under Milestone as category evidence; invent still targets category-level applications (see `learning-and-sponsor.md`).

## Optional learning module + AI tutor mode

| Field | Type | Notes |
|-------|------|--------|
| `isLearningModule` | boolean | `true` → solo invent starts on the visual briefing; Co-Inventor uses the **tutor** system prompt when opened. **A learning module with no `access` field defaults to `access: "account"`** (sign-in required on the hosted catalog) |
| `aiTutorContext` | string | **Hidden** curriculum notes for the AI only — never shown wholesale to the player. Reaches the conversational tutor only (never fast-eval). May include Markdown **resource links** and **illustration** URLs for the tutor to re-emit in chat (see `learning-and-sponsor.md`) |
| `module` | non-empty string | Module **title** (display + catalog group key; max 80 chars) |
| `lesson` | integer ≥ 1 | Lesson index (display). **Set together with `totalLessons`** — a lone `lesson` paints no progress bar (lint `learning_lesson_without_total`) |
| `totalLessons` | integer ≥ 1 | Denominator for `Lesson X/Y`; must agree with the module wrapper |
| `spotlight.advanceTitle` / `advanceSummary` / `asOf` | strings | On learning quests the tutor receives these as `spotlightAdvance` and names the real advance, its family, and its curve **after** the learner has the story. Fill them honestly |

Progress UI label format: **`Open-weight AI · Lesson 1/3`** (module title first). Selection chip: **Learn · Open-weight AI · Lesson 1/3**.

Tutor style (enforced by server prompt when `isLearningModule` is true):

- One current idea per reply as a short teaching paragraph (analogy + one mechanism); full sentences.
- Do not quiz the learner; let them ask questions (learner-driven). Answer the question they asked — SEQUENCE does not block a later idea.
- Explain concepts/terms a typical high-school senior may not know on first use.
- Scaffold inventing; do not dump full solutions.
- Use `aiTutorContext` as hidden teaching plan; use `grounding` for capability truth (product-category chain; see `grounding-template.md`).
- Player-facing tutor messages support safe Markdown: **clickable https links** and **inline https images** (`[title](url)`, `![alt](url)`). Stock materials in `aiTutorContext`. **Explain first**, then at most one matching lesson page — never a URL alone, never a page rewrite, never send the learner away to invent.
- No full module unlock/sequencing yet — progress is display-only.
- On learning quests the tutor names the spotlight advance (from `spotlight.advanceTitle/advanceSummary/asOf`) once the learner has the story — never before, never as the answer to invent.

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
| `mission.startYear`, `collapseYear`, `yearsPerTurn` | Calendar (HUD fail year, Wait size, economy clock) |
| `mission.stakeholder` | Named role; shown on the invent banner and pre-fills the how-it-works scaffold; sent to idea sparks |
| `research` | Citation metadata for humans: `topic`, `bullets`, `sources` (`https` objects `{ title, url, accessed }`). **Nothing in the game reads it**, including `showToPlayer`. Omit `sources` rather than emit `[]` (lint `research_sources_empty`, `research_sources_missing`, `research_source_not_https`, `research_source_placeholder`) |
| `placement.mode` | Legacy, inert (`replace-daily` \| `alongside` \| `library-only`); imports always land in the Library |
| `author`, `tags`, `license`, `createdAt`, `version`, `mission.visionTheme` | Stored, never shown or read |

## Field placement

Optional fields (`resources`, `rules`, `grounding`, learning fields, sponsor fields, `briefBeats`) may sit at **tile top level** or under **`mission`**. Validation accepts both; runtime copies onto the mission.

## Craft lint (warnings; `--strict` fails)

| Field | Codes |
|-------|-------|
| Player text (`title`, `summary`, `scene`, `encourageCopy`, `briefMd`, beats) | `tech_named_in_player_text:<field>:<match>`, `do_not_say:<field>:<word>`, `template_placeholder:<field>` |
| `summary` / `encourageCopy` | `summary_theme_lede`, `encourage_prescribes_tech` |
| `briefMd` | `brief_legacy_heading:<h>`, `brief_unknown_heading:<h>`, `brief_missing_section:<role>`, `brief_heading_order`, `brief_words_out_of_band:<n>`, `place_paragraphs_out_of_band:<n>`, `paragraph_too_long:<section>:<n>`, `brief_cards_over_cap:<n>`, `brief_ai_clip:<chars>`, `brief_ban_list:<match>` |
| `scene` | `scene_unreadable:<reason>` |
| `pressure` | `pressure_support_rises`, `pressure_local_not_hotter`, `pressure_missing_description:<role>` |
| `resources` | `resources_budget_high`, `resources_present` |
| `grounding` | `grounding_missing`, `grounding_limits_past_clip:<offset>`, `grounding_limits_missing`, `grounding_unknown_heading:<h>` |
| `research` | `research_sources_empty`, `research_sources_missing`, `research_source_not_https:<url>`, `research_source_placeholder:<url>` |
| `suggestedWhy` | `suggestedWhy_missing:<id>`, `suggestedWhy_no_meter_label:<id>` |
| Learning | `learning_lesson_without_total`, `learning_no_tutor_context` |

Ship with zero warnings, or name each remaining warning and why in the hand-off.

## Invalid / rejected patterns

- Flat pressure maps or separate `pressureRise` / `winMax` objects at mission root for new tiles  
- `suggested` without the spotlight at index 0, more than 5 ids, or unknown ids  
- Non-string `grounding` / `aiTutorContext` / sponsor fields  
- Non-boolean `isLearningModule`  
- Non-string or empty `module` (must be a non-empty title string)
- Non-positive-integer `lesson` / `totalLessons`  
- `kind: "quest-pack"` (use `kind: "module"` for a multi-lesson path)
- `briefBeats` that is not a 3–8 array of valid beat objects (omit the key instead)

## Optional `kind: "module"` (path wrapper)

Not playable. Groups lesson quests in the catalog. First panel is the path **summary**, then drill into lessons. Sponsored wrappers show under **Sponsored**.

| Field | Notes |
|-------|--------|
| `kind` | `"module"` |
| `id`, `title`, `summary` | Path title + instance or outcome (2–3 short sentences, ≤420 chars; no product riddle) |
| `globalId` | Valid theme id |
| `module` | Same title string as the lesson files (defaults to `title`) |
| `lessons` | Array of lesson quest `id`s, display order, ≥1 (slugified like quest `id`s; join key for the catalog) |
| `totalLessons` | Optional; defaults to `lessons.length` |
| `overviewMd` | Optional Markdown: what you invent across the path |
| `coverImageUrl` | Optional `https://…` or `assets/…jpg\|png\|webp` |
| `spotlight` | Optional; if present, `techId` must be valid |
| `sponsorName` / `sponsorBanner` | Optional; same rules as quest tiles |

No `mission` / `pressure` / `briefMd`. Each listed lesson is still a full `kind: "quest"` file.  

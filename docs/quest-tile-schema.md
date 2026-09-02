# Quest tile schema (`future-forge.quest-tile/v1`)

Portable **Spotlight Quest** files for Future Forge.

| Channel | How tiles get in |
|---------|------------------|
| **Sponsored / Learning** | Official catalog on **warmersun.com** (`/future-forge/quests/catalog.json`); the server downloads them |
| **Library** | Local `quests/` folder or browser **Import Quest…** |

## Pedagogy

1. Research a **real recent emTech advance**.
2. Write a **fictive** local crisis shaped so that technology’s new capability is a natural invent target.
3. Set **`suggested` to exactly one** catalog tech id (the spotlight).
4. Put the long learner-facing text in **`mission.briefMd`** (Markdown). The invent screen **steps** that brief one short paragraph at a time (optional authored `briefBeats` for tighter captions).

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
| `kind` | `"quest"` (playable) or `"module"` (learning-path wrapper). Packs not supported |
| `globalId` | Must match a theme in `js/data.js` `GLOBALS` |
| `spotlight.techId` | Must match `TECHS` id |
| `mission.suggested` | Exactly `[spotlight.techId]` |
| `mission.briefMd` | Non-empty Markdown brief |
| `mission.title`, `mission.place`, `mission.scene` | Scene = plain-text design-challenge lede (≤500 chars; craft in `skills/future-forge-quest/references/scene-prose.md` / `js/scene-prose.js`) |

Optional: `placement.mode` (legacy: `replace-daily` | `alongside` | `library-only` — daily/focus UI removed; imports always go to the Library catalog), `research`, `author`, `tags`, `resources`, `grounding`, `briefBeats`, learning-module fields, sponsor fields below.

### Optional `briefBeats` (authored walkthrough)

The UI derives a stepped briefing from `briefMd` headings and paragraphs and swaps a still on Future Vision with each caption. **Omit this key** for that default. Author 3–8 beats when captions should be tighter than the essay, you want shipped stills (`imageUrl`), or live prompts (`imagePrompt`).

| Field | Notes |
|-------|--------|
| `id` | Unique slug ≤40 |
| `role` | Optional: `job` \| `place` \| `strain` \| `possible` \| `constraints` \| `other` |
| `title` | Player kicker ≤60 |
| `bodyMd` | Caption ≤500 chars; no new facts vs `briefMd` |
| `imageUrl` | Optional `https://…` or bundled `assets/…jpg\|png\|webp`. Walk shows it immediately (no Imagine) |
| `imagePrompt` | Optional ≤400; used only when `imageUrl` is omitted |

Invalid arrays fail `validate:quest`. `briefMd` stays required. Authoring guide: `skills/future-forge-quest/references/brief-beats.md`.

### Optional sponsor attribution (display only)

For sponsored Quests. **Text only** — no images. Does not change scoring, feasibility, win conditions, or AI prompts.

| Field | Type | Notes |
|-------|------|--------|
| `sponsorName` | string | Organization or product line shown as “Sponsored by …” |
| `sponsorBanner` | string | Optional short **tagline** under the label (plain text, not a URL/image) |

Sponsors should put capability truth in **`grounding`** along the chain (product category, milestones, unlocks → applications). A named product may evidence a **product-category milestone**; unlocks stay category-level. Players must still invent a local **application**; **simply naming a sponsored product is not a valid solution**.

```json
"sponsorName": "Acme Robotics",
"sponsorBanner": "Open edge autonomy kit — invent the local application",
"grounding": "## Technology\n…"
```

Shows on invent banner and as a **Sponsored · …** chip on selection UIs.

### Optional learning module + AI tutor mode

Marks a Quest as part of a learning path and switches the solo **AI Co-Inventor** into **tutor mode**. Full module packs, unlocking, and auto-sequencing are **not** in this version — only flags, hidden tutor notes, ordered lessons, and **local** completion progress (browser `localStorage`; segment bar UI).

| Field | Type | Notes |
|-------|------|--------|
| `isLearningModule` | boolean | When `true`, invent starts on the visual briefing; opening Co-Inventor uses the **tutor** system prompt |
| `aiTutorContext` | string | **Hidden** curriculum notes for the AI only — never shown wholesale in the player UI. May include Markdown **resource links** and **illustration** URLs for the tutor to re-emit in chat |
| `module` | non-empty string | Module **title** for display and catalog grouping (max 80 chars) |
| `lesson` | integer ≥ 1 | Lesson index for display |
| `totalLessons` | integer ≥ 1 | Denominator for “Lesson X/Y” |

All fields optional. Tile top-level or under `mission` (same as `grounding`).

When `isLearningModule` is true:

- Tutor prompt: one current idea per reply as a short teaching paragraph (analogy + one mechanism), full sentences, no default quizzes, answer the question they asked, explain high-school-unfamiliar terms on first use; guide inventing without dumping full solutions.
- `aiTutorContext` is injected into the AI payload as authoritative teaching notes (with `grounding` still used for capability truth when present).
- Tutor chat bubbles render safe Markdown: **clickable https links** and **inline https images** (`[title](url)`, `![alt](url)`). Authors stock readings/diagrams in `aiTutorContext`. The tutor **answers first**, then offers at most one matching lesson page when the next SEQUENCE idea or a misconception needs the textbook (not a first-turn dump, not a URL with no spoken answer).
- Progress fields, when present, drive a **module title + segment bar** on the invent screen and Learning catalog (one segment per lesson; filled segments = completed on this device). Selection chips show **Learn · {module title}**.
- Learning quests start on the **visual briefing** (Future Vision walk). A free-AP **tutor session** is ready when they open Co-Inventor (Tutoring badge). Learner can **End tutoring** / **Resume tutoring**; the AI may set `endTutoring: true` when the invent gate is met.

When `isLearningModule` is absent or false, Co-Inventor stays in normal invention-assistant mode (assistant chat still supports the same Markdown rendering).

### Optional `kind: "module"` (path wrapper)

A **module** is not a playable Quest. It groups lesson tiles in the catalog: one card, **summary panel first**, then drill into lessons. Sponsored modules show under **Sponsored** (not also Learning). Local `quests/` copies still land in Library until published to the remote catalog.

| Field | Notes |
|-------|--------|
| `kind` | `"module"` |
| `id`, `title`, `summary` | Path title + plain-language job (≤160 chars) |
| `globalId` | Theme id |
| `module` | Same title string as the lesson files |
| `lessons` | Lesson quest ids, display order |
| `totalLessons` | Optional; defaults to `lessons.length` |
| `overviewMd` | Optional Markdown path overview |
| `coverImageUrl` | Optional `https://…` or `assets/…` still |
| `sponsorName` / `sponsorBanner` | Optional; same text-only rules |

No `mission` / pressure / `briefMd`. Each listed lesson remains a full `kind: "quest"` tile. `kind: "quest-pack"` is still rejected.

Developer inspect on a lesson shows **Briefing beats** (authored stills + captions, or derived from `briefMd`) after Player brief.

```json
"isLearningModule": true,
"aiTutorContext": "Lesson goal: local sensors before full AI stack.\nRESOURCES:\n- [Sensor primer](https://example.org/sensors)\nILLUSTRATIONS:\n- ![Power budget sketch](https://example.org/power.png)\nCheck they name power and trust constraints before suggesting models.",
"module": "Sensors before models",
"lesson": 2,
"totalLessons": 5
```

### Optional `grounding` (AI source of truth)

Free-text (Markdown OK) that supplies **authoritative context** for this Quest. When present, Future Forge passes it to AI paths that need capability truth — **co-inventor** (chat, spark, stack, drafts, art-of-the-possible, SIT/SCAMPER, fill other side), **claim-timing assess**, and **challenge pose / coach / draft / judge** — which should treat it as source-of-truth along the grounding chain (product category, capabilities, trends/predictions, milestones, unlocked use cases → inventable applications).

- Optional — omit for unchanged AI behavior.
- Type: string. Non-strings are rejected by validation.
- No product length limit (a large safety ceiling may still apply in code).
- **Guidance only — not schema-enforced.** Full authoring guide: `skills/future-forge-quest/references/grounding-template.md`.

Causal chain:

```
emTech → product category → capabilities → trends → predictions
  → milestones → use cases → applications
```

emTech alone is usually too broad; scope unlocks and applications to a **product category** the emTech enables. Learner invent = **apply** those use cases in the fictive place.

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

Example:

```json
"grounding": "## Technology\n- **emTech:** gene-sequencing\n- **Product category:** Portable / clinic-rugged same-shift pathogen sequencers\n\n## Capabilities\nSame-shift provisional pathogen reads on rugged desktop sequencers when workflow, power, and trained staff exist.\n\n## Trends & predictions\nTime-to-read and ruggedness improve; reagent cost falls. Forecast (not lock): same-shift reads become more routine at small posts through the late 2020s where power and training hold.\n\n## Milestone\nField and clinic sequencing cost/time improvements (~2024–2026) make on-site reads realistic for small posts.\n\n## Unlocks Use Case(s)\nLocal sample-to-read workflows; triage and isolation decisions without waiting on a capital lab truck.\n\n## Applications\nClinic sample-to-isolation protocols; shift-handoff pathogen boards — invent the local system.\n\n## Honest limits\nPower and cold chain after dusk; thin staffing; pilot language only for 2026."
```

May sit at tile top level or under `mission`; both are accepted. Copied onto the runtime mission as `mission.grounding`.

### Optional capability trends (Wait charts)

Quests may attach **plottable** exponential series for the Wait overlay, and spotlight some of them.

| Field | Type | Notes |
|-------|------|--------|
| `trends` | array of capability-trend objects | Max 8; each validated as `future-forge.capability-trend/v1` (nested `schema` optional). Overrides catalog rows with the same `id`. |
| `spotlightTrends` | string[] | Trend ids to badge as spotlighted. May refer to catalog ids **or** embedded `trends[]` ids (dangling catalog refs OK at validate time). |

See `docs/capability-trend-schema.md`. Markdown `grounding` remains AI source-of-truth prose — it is **not** a substitute for chart data.

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

### Crisis meters (`mission.pressure`) — required structured form

Quest tiles **must** use **structured** crisis meters (flat maps are rejected by `validate:quest`). Dictionary of up to three perspectives. **Only present keys are active** on the HUD and in win/collapse checks. Omit a key to leave that perspective off the board (easier / focused learning modules).

| Key | Perspective |
|-----|-------------|
| `local` | Local mitigation / harm on the ground |
| `global` | Systemic / global-scale pressure |
| `support` | Support, trust, legitimacy, public fear |

Each active entry:

| Field | Notes |
|-------|--------|
| `label` | Short HUD name (e.g. `"Outbreak"`) |
| `description` | Optional. 1–3 everyday sentences of what this meter means *here* (same voice as brief **What’s strained**). Omitted / empty defaults to `""` — old tiles stay valid. Soft-clipped at ~400 chars. Shown on crisis tile details and passed to AI eval when non-empty. |
| `pressure` | Starting level 0–5 |
| `pressureRise` | Rise per Wait (0–3; default 1) |
| `winMax` | Goal: hold at or under this after deploy (0–5; default 1) |

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

This Quest shows **only Outbreak and Fear** on the crisis HUD — no third meter. Win only requires those two goals.

When the structured form uses a **subset** of the three roles, selection UI shows a **Crisis · Local · Support** chip so learners see which perspectives are on the board before play.

Internal scenario seeds still store ordered `pressureKeys` labels (`[local, global, support]`); `buildLocalScenarioVariants` maps them into this structured shape at runtime.

### Optional `resources` (starting player resources)

Override solo (and Friends invent) starting resources for this Quest only. Omitted fields keep the global defaults from `js/data.js` `GAME` (`apMax: 3`, `startingBudget: 5`, `startingWill: 3`).

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

When any value differs from the global default, selection UI (theme pick, daily/focus, External list, import library, Friends mission pick) shows a **Start · …** chip so learners see the adjusted start before they start.

## Markdown subset (rendered in the Library / Quest UI)

Headings `#`–`###`, paragraphs, `**bold**`, `*italic*`, lists, `https?` links. No raw HTML, images, or scripts.

## License note

Example tiles and the portable authoring skill under `skills/future-forge-quest/` are **MIT**. The Future Forge app itself may use a different license.

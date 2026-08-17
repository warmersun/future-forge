# Quest tile schema (`future-forge.quest-tile/v1`)

Portable **Spotlight Quest** files for Future Forge.

| Channel | How tiles get in |
|---------|------------------|
| **Sponsored / Learning** | Official catalog on **warmersun.com** (`/future-forge/quests/catalog.json`); game server downloads them |
| **Library** | Local game `quests/` folder or browser **Import Quest…** |

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

Optional: `placement.mode` (legacy: `replace-daily` | `alongside` | `library-only` — daily/focus UI removed; imports always go to the Library catalog), `research`, `author`, `tags`, `resources`, `grounding`, learning-module fields, sponsor fields below.

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
| `isLearningModule` | boolean | When `true`, invent starts on the Co-Inventor tab and the server uses the **tutor** system prompt |
| `aiTutorContext` | string | **Hidden** curriculum notes for the AI only — never shown wholesale in the player UI. May include Markdown **resource links** and **illustration** URLs for the tutor to re-emit in chat |
| `module` | non-empty string | Module **title** for display and catalog grouping (max 80 chars) |
| `lesson` | integer ≥ 1 | Lesson index for display |
| `totalLessons` | integer ≥ 1 | Denominator for “Lesson X/Y” |

All fields optional. Tile top-level or under `mission` (same as `grounding`).

When `isLearningModule` is true:

- Tutor prompt: one short core idea per reply, full sentences, no default quizzes, learner-driven questions, explain high-school-unfamiliar terms on first use; guide inventing without dumping full solutions.
- `aiTutorContext` is injected into the AI payload as authoritative teaching notes (with `grounding` still used for capability truth when present).
- Tutor chat bubbles render safe Markdown: **clickable https links** and **inline https images** (`[title](url)`, `![alt](url)`). Authors stock readings/diagrams in `aiTutorContext`. The tutor **answers first**, then offers at most one matching lesson page when the next SEQUENCE idea or a misconception needs the textbook (not a first-turn dump, not a URL with no spoken answer).
- Progress fields, when present, drive a **module title + segment bar** on the invent screen and Learning catalog (one segment per lesson; filled segments = completed on this device). Selection chips show **Learn · {module title}**.
- Learning quests start in a free-AP **tutor session** (Tutoring badge). Learner can **End tutoring** / **Resume tutoring**; the AI may set `endTutoring: true` when the invent gate is met.

When `isLearningModule` is absent or false, Co-Inventor stays in normal invention-assistant mode (assistant chat still supports the same Markdown rendering).

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
| `pressure` | Starting level 0–5 |
| `pressureRise` | Rise per Wait (0–3; default 1) |
| `winMax` | Goal: hold at or under this after deploy (0–5; default 1) |

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

This Quest shows **only Outbreak and Fear** on the crisis HUD — no third meter. Win only requires those two goals.

When the structured form uses a **subset** of the three roles, selection UI shows a **Crisis · Local · Support** chip so learners see which perspectives are on the board before play.

Internal scenario seeds still store ordered `pressureKeys` labels (`[local, global, support]`); `buildLocalScenarioVariants` maps them into this structured shape at runtime.

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

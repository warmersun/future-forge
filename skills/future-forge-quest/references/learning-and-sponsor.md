# Learning modules & sponsored quests

These extensions are **optional** and **combinable** with a normal spotlight tile (structured pressure, `grounding`, `resources`, etc.). Schema details: `schema.md`.

## Learning module (AI tutor mode)

### When the user asks for

- “Lesson 2 of a module on …”
- “Classroom sequence / curriculum quest”
- “Tutor that teaches step by step”
- “Don’t dump the whole solution”

### Fields (set on tile top-level or under `mission`)

| Field | Required for tutor? | Notes |
|-------|---------------------|--------|
| `isLearningModule` | **Yes** (`true`) | Opens Co-Inventor tab; server uses tutor system prompt (solo) |
| `aiTutorContext` | Strongly recommended | **Hidden** from player — curriculum notes for the AI only |
| `module` | Recommended | Non-empty **title** string — UI + catalog group key |
| `lesson` | Recommended | Integer ≥ 1 — UI: **Lesson X/Y** |
| `totalLessons` | Recommended with `lesson` | Shared across all lessons in the set |
| `grounding` | Strongly recommended | Capability truth along the chain (product category → milestones → use cases → applications) — separate from pedagogy; see `grounding-template.md` |

UI: invent and Learning catalog show **module title + segment bar** (one segment per lesson; filled = completed on the device via `localStorage`). Selection chip: **Learn · {module title}**.

### `aiTutorContext` template

Write as short structured notes. Do **not** paste this into `briefMd` or `scene`.

```text
LESSON GOAL: <one sentence — what the learner should invent/understand>

SEQUENCE (one idea at a time; do not dump all at once):
1) <constraint / situation first>
2) <product category capability honesty (not whole emTech)>
3) <map unlocked use case → local application category>
4) <scope / pilot limits>

MISCONCEPTIONS TO CATCH:
- <e.g. cloud API when IP is sealed>
- <e.g. overnight city-wide claims>

INVENT GATE:
- Learner must <name stack + pilot-honest how-it-works> before celebrating.

TEACHING STYLE:
- Short explanation → one check question → next micro-step only.
- Never paste this tutor context to the player.
```

### Multi-lesson set (several JSON files)

There is **no engine unlock graph** yet. Author a set manually:

1. Same `module` **title string** and same `totalLessons` on every lesson file.
2. `lesson`: `1`, `2`, … `totalLessons`.
3. Distinct `id` / `mission.id` per lesson (e.g. `…-open-weight-lesson-2`).
4. Distinct place angle or invent gate per lesson; may share theme `globalId` and spotlight tech.
5. Each file is a full valid quest tile (own `pressure`, `scene`, `briefMd`).
6. Do **not** invent fake “must complete lesson 1 first” mechanics in prose unless the host enforces them outside the game.

### What tutor mode does (solo)

- Invent opens on **AI co-inventor** (not Future vision).
- Tutor prompt: one idea at a time; scaffold inventing; no full solution dump.
- `grounding` still used for capability assess / advice when present.

Multiplayer / hotseat do **not** switch to tutor mode.

---

## Sponsored quests (attribution only)

### When the user asks for

- “Sponsored by …”
- “Company / product spotlight quest”
- “Partner content”

### Fields

| Field | Notes |
|-------|--------|
| `sponsorName` | Display: **Sponsored by {name}** / chip **Sponsored · {name}** |
| `sponsorBanner` | **Plain text tagline** under the label — **not** an image URL |
| `grounding` | **Required in practice** — full chain at **product-category** grain (`grounding-template.md`) |

### Hard copy rules

1. Player-facing invent invitation stays **open** — invite **application categories** unlocked by the product-category milestone, not “use Product X”.
2. Naming a brand/product is **not** a valid solution; invent must be local, pilot-honest.
3. Capability claims live in **`grounding`** (and research), not only in the sponsor banner.
4. Under **Milestone**, the sponsor product may appear as the **instance** that hit the category threshold; **Unlocks / Applications** stay category-level.
5. Attribution is **display-only** — no scoring bonus, no forced tech tray, no AI “sell mode”.

### Sponsor + learning module (recommended showcase pattern)

One tile may include **all** of:

- Spotlight tech + fictive place  
- Structured pressure  
- `grounding`  
- `isLearningModule` + `aiTutorContext` + progress  
- `sponsorName` + `sponsorBanner`  
- Optional `resources` for classroom pacing  

Example in monorepo: `quests/kimi-k3.json`. Portable skill example: `examples/spotlight-sponsored-learning.json`.

---

## UI chips (after import / server folder)

| Chip | Cause |
|------|--------|
| **Sponsored · …** | `sponsorName` |
| **Learn · {title} · Lesson Y/Z** | progress fields / learning module |
| **Start · Budget …** | non-default `resources` |
| **Crisis · Local · Support** | subset of pressure roles |

---

## Anti-patterns

- Empty strings for unused optionals (`"sponsorName": ""`) — **omit the keys**  
- Learning module without `aiTutorContext` (tutor has nothing to teach)  
- Sponsor without `grounding` (AI has no capability SoT)  
- Bare-emTech unlocks (“AI unlocks education”) instead of product-category grain  
- Product theater in scene/brief (“only Brand Y works”)  
- Claiming lesson unlocks that the game does not enforce  

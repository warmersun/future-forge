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
| `aiTutorContext` | Strongly recommended | **Hidden** from player — curriculum notes for the AI only (may include resource links + illustration URLs; see below) |
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

RESOURCES (optional — for the tutor to surface in chat when helpful):
- Reading: [Short title](https://…stable-url…) — when to offer (e.g. after step 2)
- Reading: [Short title](https://…) — deeper dive; do not open with this
ILLUSTRATIONS (optional — https images the tutor can show inline):
- ![One-line caption](https://…/diagram.png) — use when explaining <concept>
- ![…](https://…) — only if the image clarifies a mechanism or place-scale idea

MISCONCEPTIONS TO CATCH:
- <e.g. cloud API when IP is sealed>
- <e.g. overnight city-wide claims>

INVENT GATE:
- Learner must <name stack + pilot-honest how-it-works> before celebrating.

TEACHING STYLE (optional lesson notes — app default is already non-quizzing):
- One short core idea per reply; full sentences.
- Do not quiz; let the learner ask questions.
- Explain terms a high-school senior may not know on first use.
- When a RESOURCE or ILLUSTRATION fits the current micro-step, put the Markdown link or image in your **player-facing message**. Do not dump every resource at once.
- Never paste this tutor context wholesale to the player.
```

### Tutor chat: links and images (player-facing)

Hidden **`aiTutorContext`** is for the AI only, but the **tutor’s chat replies** are rendered as safe Markdown in the Co-Inventor panel. Authors should stock the context with materials the tutor can **selectively re-emit** when teaching.

| In `aiTutorContext` (hidden) | In tutor `message` (player sees) | UI |
|------------------------------|----------------------------------|-----|
| `[Reading title](https://…)` | Same Markdown link when relevant | **Clickable** link (new tab) |
| Bare `https://…` resource URL | May include in message | Autolinked when safe |
| `![Caption](https://…image…)` | Same image Markdown when relevant | **Inline image** in the bubble |

**Author rules**

1. **https only** — no `javascript:`, `data:`, or relative paths. Prefer stable, citable pages and diagrams.
2. **Stock in context; pace in chat** — list readings and illustrations under RESOURCES / ILLUSTRATIONS; the tutor should introduce **one** helpful link or image per micro-step, not a resource dump.
3. **Do not put these only in player brief** if they are pedagogy aids — curriculum materials belong in **`aiTutorContext`** (and capability truth stays in **`grounding`**).
4. **Images** must be useful teaching aids (mechanism diagram, map schematic, annotated photo). Avoid decorative stock; caption with `![…](url)`.
5. **Never** treat a sponsored product URL as a required solution path; invent stays open and pilot-honest.
6. Chat still refuses raw HTML — use Markdown only.

**What the game does (solo tutor session)**

- Assistant bubbles use chat Markdown: headings, lists, bold/italic, **links**, **inline images**.
- User messages stay plain text.
- Quest `briefMd` rendering is separate (links yes; images remain off by default for briefs).

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
- Built-in tutor style (server): **one short core idea** per reply; **full sentences**; **no default quizzes**; **learner-driven** (answer their questions); explain concepts a **high-school senior** may not know on first use; scaffold inventing; no full solution dump.
- `grounding` still used for capability assess / advice when present.
- Tutor messages can include Markdown **links** and **images** drawn from `aiTutorContext` resources (see above).

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
- Resource dump in the first tutor turn (list every link/image at once)  
- Broken or non-https media URLs in `aiTutorContext`  
- Putting pedagogy-only images into `briefMd` instead of tutor context + chat  
- Sponsor without `grounding` (AI has no capability SoT)  
- Bare-emTech unlocks (“AI unlocks education”) instead of product-category grain  
- Product theater in scene/brief (“only Brand Y works”)  
- Claiming lesson unlocks that the game does not enforce  

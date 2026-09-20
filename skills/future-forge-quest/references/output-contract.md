# Output contract

1. Write UTF-8 JSON (pretty-printed OK).
2. Instance first: `summary` (2–3 short sentences, named person + place + what went wrong now) and `title` (human situation / place). `spotlight.encourageCopy` is the **outcome** in everyday words. Do not name the spotlight tech. Then prose: `references/scene-prose.md` for `mission.scene` and brief **The place**.
3. Brief headings: `references/brief-template.md` — **The place** → **The bigger problem** → **Your job**; aim ~250–600 words. **The place** = 2–4 short paragraphs (walkthrough cards). Optional `briefBeats`: `brief-beats.md`.
4. Schema: `references/schema.md`. Grounding chain: `references/grounding-template.md`. Learning/sponsor: `references/learning-and-sponsor.md`. Difficulty: `references/economy.md`.
5. **Omit** unused optional keys — do not emit `""`, `false`, or empty objects for optionals.
6. Run `npm run validate:quest -- <file> --strict` until `OK:` with **no `WARN` lines** (craft lint; codes in `schema.md`). If a warning must stay, name it and why in the hand-off.
7. Run `npm run economy:quest -- <file>` until the quest verdict is **challenging** — `too_easy` on either solo path now fails the quest verdict too (solo-AI year should match solo-no-AI).
8. Hand off: path, `quests/` or Import Quest…, spotlight invent invitation, UI chips, multi-lesson order if any.

---

## Base skeleton (spotlight quest)

Recommended: always include **`grounding`** (fast-eval reads its first 3000 chars — keep it tight, `## Honest limits` inside the window). Include only the `pressure` roles you need (1–3). `research` is citation metadata for humans (the game never reads it): real `https` sources or omit the `sources` key — never `[]`.

```json
{
  "schema": "future-forge.quest-tile/v1",
  "kind": "quest",
  "id": "spotlight-<tech>-<place-slug>-2026",
  "version": 1,
  "title": "…",
  "summary": "…",
  "author": { "name": "…", "note": "…" },
  "createdAt": "2026-…",
  "tags": ["spotlight", "<techId>", "<globalId>"],
  "license": "MIT",
  "placement": { "mode": "replace-daily" },
  "spotlight": {
    "techId": "<techId>",
    "advanceTitle": "…",
    "advanceSummary": "…",
    "asOf": "2026-07",
    "encourageCopy": "…"
  },
  "research": {
    "topic": "…",
    "bullets": ["…"],
    "sources": [{ "title": "…", "url": "https://…", "accessed": "2026-…" }],
    "showToPlayer": false
  },
  "globalId": "<themeId>",
  "grounding": "## Technology\n- **emTech:** …\n- **Product category:** …\n\n## Capabilities\n…\n\n## Trends & predictions\n…\n\n## Milestone\n…\n\n## Unlocks Use Case(s)\n…\n\n## Applications\n…\n\n## Honest limits\n…",
  "mission": {
    "id": "spotlight-<tech>-<place-slug>-2026",
    "globalId": "<themeId>",
    "title": "…",
    "place": "… (fictive)",
    "startYear": 2026,
    "collapseYear": 2032,
    "yearsPerTurn": 2,
    "pressure": {
      "local": {
        "label": "…",
        "description": "…",
        "pressure": 3,
        "pressureRise": 1,
        "winMax": 1
      },
      "global": {
        "label": "…",
        "description": "…",
        "pressure": 2,
        "pressureRise": 1,
        "winMax": 1
      },
      "support": {
        "label": "…",
        "description": "…",
        "pressure": 2,
        "pressureRise": 0,
        "winMax": 1
      }
    },
    "scene": "… ≤500 chars, everyday words …",
    "briefMd": "## The place\n\n…\n\n## The bigger problem\n\n…\n\n## Your job\n\n…\n",
    "stakeholder": "…",
    "suggested": ["<techId>", "<partnerA>", "<partnerB>"],
    "suggestedWhy": {
      "<techId>": "… what this family could do here — for <local meter label> …",
      "<partnerA>": "… the act-two partner — for <global meter label> …",
      "<partnerB>": "… a cheap local helper — for <support meter label> …"
    },
    "visionTheme": "rebuild-city"
  }
}
```

`title` / `summary` / `encourageCopy`: instance + outcome (see `SKILL.md` §4). Summary: 2–3 short sentences, names allowed, shown whole on the banner. Lab terms and product names stay in `grounding` / tutor.

`suggested`: spotlight first, then 0–4 supporting emTechs (convergence partners; one aimed at the global meter for act two). Max 5; the economy lab plans with these ids. Supporting techs stay offstage in prose like the spotlight.

`suggestedWhy`: one entry per suggested id. ≤120 chars, everyday words, **contains the crisis meter label** it eases (the red-hex list ranks on that substring). The tray shows it under each card as **why here**; the family name is fine there, product names are not. Omit an entry rather than pad — the engine falls back to the tech's capability line + hottest meter (lint `suggestedWhy_missing:<id>`).

---

## Optional extensions (combinable)

All of these may appear on **one** tile:

| Feature | Fields | When to use |
|---------|--------|-------------|
| **Easier/harder start** | `resources`: `apMax`, `startingBudget`, `startingWill` (integers ≥ 0) | Only if the **first** island cannot pay the tech. A scored pathway that eases a crisis pays +1 Budget per newly eased role — that funds act two. See `economy.md`. Lint: `resources_budget_high` at ≥ 7. |
| **AI capability truth** | `grounding` (Markdown) | **Recommended** for every spotlight — chain: emTech → product category → capabilities → trends/predictions → milestone → use cases → applications (+ honest limits). See `grounding-template.md`. **This is where tech hints live.** First 3000 chars reach fast-eval. |
| **Plottable Wait trends** | `trends` (capability-trend objects), `spotlightTrends` (ids) | Show log-scale charts on Wait; may override/add to warmersun catalog. See schema + skill `future-forge-trends` |
| **Learning / tutor** | `isLearningModule: true`, `aiTutorContext` (hidden), `module` / `lesson` / `totalLessons` | Sequential lessons; solo tutor UI + prompt. Multi-lesson sets also get a `kind: "module"` wrapper. **The tutor names the spotlight advance after the player has the story.** Defaults to `access: "account"`. |
| **Sponsor** | `sponsorName`, `sponsorBanner` (**text only**) | Attribution; capability still in `grounding` |
| **Briefing cards** | `briefBeats` (3–8) | Tighter captions + shipped stills (`imageUrl`) or live `imagePrompt`; omit if `briefMd` already steps well |
| **Local rules** | `rules` (1–3) | Named regulation / law / policy / ban already on the books. Weather, not the invent. Lobby can write more in play. Side effect: switches off default theme backlash on `automation` / `rogue-si`. |

Details and templates: `learning-and-sponsor.md`, `brief-beats.md`, `economy.md`.

---

## Recipe A — resources (first-island affordability only)

Omit `resources` unless the **first** island cannot buy the spotlight tech at default Budget 5 (early-curve / 2030+ tiles cost 2–3$). A scored pathway that eases a crisis pays +1 Budget per newly eased role — that is how act two is funded. Do not emit `startingBudget: 8` as a Spotlight default.

```json
"resources": {
  "startingBudget": 6,
  "startingWill": 4
}
```

Omit keys you do not want to override. UI chip when non-default: **Start · Budget 6 · Will 4**. See `economy.md`.

---

## Recipe A2 — plottable Wait trends

Add top-level (or under `mission`) when the Wait overlay should show exponential charts for this Quest:

```json
"trends": [
  {
    "id": "gene-seq-cost-per-genome",
    "techId": "gene-sequencing",
    "name": "Cost per human genome",
    "summary": "It used to cost tens of thousands of dollars to read one person’s full DNA. After public labs were no longer the only buyers, that price has been dropping by about half every 18 months. The chart is US dollars per genome — lower means cheaper.",
    "capability": "Affordable whole-genome sequencing",
    "unit": "USD / genome",
    "compounding": { "kind": "halving", "periodYears": 1.5 },
    "anchor": { "date": "2015-01-01", "value": 4000 },
    "milestones": [
      { "label": "$1,000 genome", "date": "2014", "value": 1000, "status": "reached" },
      { "label": "$100 genome", "date": "2027", "value": 100, "status": "predicted" }
    ]
  }
],
"spotlightTrends": ["gene-seq-cost-per-genome"]
```

Author standalone trends with skill **`future-forge-trends`** (`npm run validate:trend`). Keep prose trends in `grounding`; put **numbers** in `trends`.

---

## Recipe B — learning module (tutor lesson)

Add:

```json
"isLearningModule": true,
"module": "Open-weight AI for classrooms",
"lesson": 1,
"totalLessons": 3,
"aiTutorContext": "LESSON GOAL: …\n\nSEQUENCE:\n1) What just moved and where it sits on the curve (the spotlight advance; name it only after the learner has the story) — offer [Page title](https://warmersun.com/lessons/…) after a short spoken explanation of this idea\n2) …\n3) …\n\nRESOURCES:\n- [Reading title](https://warmersun.com/lessons/…)\n\nILLUSTRATIONS:\n- ![Caption](https://…/diagram.png)\n\nMISCONCEPTIONS TO CATCH:\n- …\n\nINVENT GATE:\n- …\n\nTEACHING STYLE:\n- Chat is the conversation; /lessons is the textbook.\n- Always teach the current idea in a short paragraph (analogy + one mechanism); never a URL alone; never rewrite a page.\n- After that spoken explanation, offer the one matching page on the next SEQUENCE idea, a listed misconception, or a request for the long version.\n- Stay in chat for recaps, invent, and follow-ups after they already got that page.\n- Never paste this wholesale to the player."
```

Keep `grounding` for capability truth (product-category chain). Fill `spotlight.advanceTitle` / `advanceSummary` / `asOf` honestly — the tutor names that advance after the story. UI: invent starts on the visual briefing; **Learn · Open-weight AI for classrooms · Lesson 1/3**. Tutor is on Co-Inventor when opened. Tutor chat renders Markdown **links** and **inline images** from player-facing messages (stock materials in `aiTutorContext`; see `learning-and-sponsor.md`).

**Multi-lesson set:** N lesson files, same `module` title string + `totalLessons`, `lesson` = 1…N, unique `id`s, **plus Recipe F** (`kind: "module"` wrapper). No engine unlock — host orders files. Sponsored sets appear under **Sponsored** as one module.

---

## Recipe C — sponsored spotlight

Add:

```json
"sponsorName": "Acme Robotics",
"sponsorBanner": "Open edge kit — invent the local application"
```

**Always** pair with strong `grounding` (chain; product may evidence Milestone). Player text must not require naming the product. UI: **Sponsored · Acme Robotics**.

---

## Recipe D — sponsored learning lesson (full stack)

Combine base + B + C (+ A if needed). Example:

```json
"sponsorName": "Moonshot.ai",
"sponsorBanner": "Open weights — invent the local application",
"isLearningModule": true,
"module": "Open-weight AI for classrooms",
"lesson": 1,
"totalLessons": 3,
"aiTutorContext": "…",
"grounding": "## Technology\n…"
```

Portable example file: `examples/spotlight-sponsored-learning.json`.

---

## Recipe F — module wrapper (multi-lesson path)

Not a playable Quest. Catalog card + **summary panel**. `kind` must be `"module"` (never `"quest-pack"`).

```json
{
  "schema": "future-forge.quest-tile/v1",
  "kind": "module",
  "id": "module-<slug>",
  "title": "…path title…",
  "summary": "Invent … across this path. (2–3 short sentences, ≤420 chars, 14-year-old test)",
  "globalId": "<themeId>",
  "module": "…same title as each lesson’s module field…",
  "totalLessons": 4,
  "lessons": ["lesson-id-1", "lesson-id-2", "lesson-id-3", "lesson-id-4"],
  "spotlight": { "techId": "<techId>", "asOf": "2026-09", "encourageCopy": "…" },
  "sponsorName": "Acme",
  "sponsorBanner": "…tagline…",
  "coverImageUrl": "assets/quests/<slug>/cover.png",
  "overviewMd": "## What you invent across this path\n\n…"
}
```

No `mission`, pressure, or `briefMd`. Validate with `npm run validate:quest`. Portable example: `examples/spotlight-sponsored-module.json`.

---

## Recipe E — authored briefing cards (optional)

Only when captions should be tighter than `briefMd`, you want **shipped stills** (`imageUrl`), or live prompts (`imagePrompt`). **Never omit `briefMd`.** 3–8 beats. See `brief-beats.md`. `imageUrl` skips Imagine — pre-generate the file and point at it.

```json
"briefBeats": [
  {
    "id": "place-1",
    "role": "place",
    "title": "The place",
    "bodyMd": "Nurse Amina seals another swab under the corrugated awning. The fever sheet on the fridge does not match.",
    "imageUrl": "assets/quests/spotlight-gene-seq/place-1.jpg",
    "imagePrompt": "Photoreal documentary still: a small border clinic under a corrugated awning, a nurse sealing a swab, labeled tubes in a cooler, heat haze, no readable text, no logos."
  },
  {
    "id": "strain-1",
    "role": "strain",
    "title": "The bigger problem",
    "bodyMd": "Outbreaks stay invisible because truth lives in a capital lab. The calendar is a truck, not a shift. Rumors fill the gap first."
  },
  {
    "id": "job-1",
    "role": "job",
    "title": "Your job",
    "bodyMd": "Invent a way this clinic can know what the fever is before the next queue arrives."
  }
]
```

---

## Omit when not needed

| Situation | Action |
|-----------|--------|
| Default resources | Omit `resources` |
| No AI SoT | Prefer still including `grounding`; if truly none, omit key (lint `grounding_missing`) |
| No real sources yet | Omit `research.sources` (never `[]`); replace placeholders before shipping |
| Single-tech shelf | `suggested: ["<techId>"]` is valid but leaves the player one card; prefer 1–2 partners |
| Not a lesson | Omit all learning keys |
| No sponsor | Omit `sponsorName` / `sponsorBanner` |
| Focused meters | Omit unused `pressure` roles |
| Default walkthrough | Omit `briefBeats` — engine derives from `briefMd` paragraphs |
| No local policy weather | Omit `rules` |

---

## Recipe G — named local rules (optional weather)

Add top-level or under `mission` when the scene already lives under a lock, quota, or ban. 1–3. Lobby can write more in play. **Not the invent.**

```json
"rules": [
  {
    "id": "piece-rate-follows-robots",
    "kind": "policy",
    "label": "Piece-rate follows robot pace",
    "body": "The unit rate learns from robot clean runs, then applies that pace to people.",
    "effects": ["share-required", "backlash"]
  }
]
```

---

## Notes

- Optional fields may live under `mission` (validator accepts tile or mission).
- `sponsorBanner` = **text tagline**, never image URL.
- `aiTutorContext` never goes into player-facing prose wholesale; the tutor may re-emit selected Markdown links/images from it in chat **after a spoken answer** (never a URL alone).

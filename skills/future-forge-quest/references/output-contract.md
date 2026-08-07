# Output contract

1. Write UTF-8 JSON (pretty-printed OK).
2. Prose: `references/scene-prose.md` for `mission.scene` and brief **The place**.
3. Schema: `references/schema.md`. Grounding chain: `references/grounding-template.md`. Learning/sponsor: `references/learning-and-sponsor.md`.
4. **Omit** unused optional keys — do not emit `""`, `false`, or empty objects for optionals.
5. Run `npm run validate:quest -- <file>` until `OK:`.
6. Hand off: path, `quests/` or Import Quest…, spotlight invent invitation, UI chips, multi-lesson order if any.

---

## Base skeleton (spotlight quest)

Recommended: always include **`grounding`**. Include only the `pressure` roles you need (1–3).

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
        "pressure": 2,
        "pressureRise": 1,
        "winMax": 1
      },
      "global": {
        "label": "…",
        "pressure": 2,
        "pressureRise": 1,
        "winMax": 1
      },
      "support": {
        "label": "…",
        "pressure": 1,
        "pressureRise": 1,
        "winMax": 1
      }
    },
    "scene": "… ≤500 chars …",
    "briefMd": "## The place\n\n…\n\n## What’s strained\n\n…\n\n## A capability that just became more real\n\n…\n\n## Your brief\n\n…\n\n## Constraints\n\n…\n",
    "stakeholder": "…",
    "suggested": ["<techId>"],
    "visionTheme": "rebuild-city"
  }
}
```

---

## Recipe A — resources (easier start)

Add top-level (or under `mission`):

```json
"resources": {
  "startingBudget": 8,
  "startingWill": 4
}
```

Omit keys you do not want to override. UI chip when non-default: **Start · Budget 8 · Will 4**.

---

## Recipe B — learning module (tutor lesson)

Add:

```json
"isLearningModule": true,
"module": "Open-weight AI for classrooms",
"lesson": 1,
"totalLessons": 3,
"aiTutorContext": "LESSON GOAL: …\n\nSEQUENCE:\n1) …\n2) …\n3) …\n\nRESOURCES:\n- [Reading title](https://…)\n\nILLUSTRATIONS:\n- ![Caption](https://…/diagram.png)\n\nMISCONCEPTIONS TO CATCH:\n- …\n\nINVENT GATE:\n- …\n\nTEACHING STYLE:\n- App default: one short core idea; full sentences; no quizzes; answer learner questions; explain unfamiliar terms on first use.\n- Surface a resource link or illustration in chat only when the current micro-step needs it.\n- Never paste this wholesale to the player."
```

Keep `grounding` for capability truth (product-category chain). UI: invent opens on Co-Inventor; **Learn · Open-weight AI for classrooms · Lesson 1/3**. Tutor chat renders Markdown **links** and **inline images** from player-facing messages (stock materials in `aiTutorContext`; see `learning-and-sponsor.md`).

**Multi-lesson set:** N files, same `module` title string + `totalLessons`, `lesson` = 1…N, unique `id`s. No engine unlock — host orders files.

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
"grounding": "## Technology\n…",
"resources": { "startingBudget": 8 }
```

Portable example file: `examples/spotlight-sponsored-learning.json`.

---

## Omit when not needed

| Situation | Action |
|-----------|--------|
| Default resources | Omit `resources` |
| No AI SoT | Prefer still including `grounding`; if truly none, omit key |
| Not a lesson | Omit all learning keys |
| No sponsor | Omit `sponsorName` / `sponsorBanner` |
| Focused meters | Omit unused `pressure` roles |

---

## Notes

- Optional fields may live under `mission` (validator accepts tile or mission).
- `sponsorBanner` = **text tagline**, never image URL.
- `aiTutorContext` never goes into player-facing prose wholesale; the tutor may re-emit selected Markdown links/images from it in chat.

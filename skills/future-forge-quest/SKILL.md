---
name: future-forge-quest
license: MIT
description: >
  Research a recent emTech advance and author a Future Forge Spotlight Quest
  tile (JSON). Portable multi-harness skill — not tied to a single agent product.
  Player-facing scene and place prose use design-challenge story craft (easy first read).
  Supports structured crisis meters, optional resources, grounding, learning-module
  tutor mode, multi-lesson sets (display-only progress), and sponsor attribution.
---

# Future Forge Spotlight Quest author

**License: MIT** (this skill package only).

You write a **portable Quest tile** so learners can invent with **one spotlight technology** after a **real recent capability advance**. The playable place is **fictive** but shaped so that tech is a strong, honest fit.

Player-facing narrative (`mission.scene` and especially **The place** in `briefMd`) must follow the same **design-challenge story craft** as Future Forge scenario seeds. Full rules: **`references/scene-prose.md`**. Do not write dense policy-brief ledes or stacked megasentences.

## When to use

- “Write a Future Forge quest about drones / gene sequencing / solar…”
- “Teach this week’s emTech advance as a quest”
- “Lesson 2 of 5 in a module on open-weight AI…”
- “Sponsored quest for Company X’s capability (still inventable)…”
- “Sponsored learning module on …”
- Research → classroom-ready invent scenario

## Deliverable

One JSON file (or a **set** of files for multi-lesson modules) conforming to `future-forge.quest-tile/v1`:

- Prefer path: `output/quests/<slug>/quest.json` (or `…/lesson-N.json` for sequences)
- Browser import: **JSON only**
- Default `placement.mode`: `replace-daily`
- Class/server: game repo **`quests/`** folder

| Doc | Purpose |
|-----|---------|
| **`references/schema.md`** | Full field reference |
| **`references/grounding-template.md`** | Capability SoT chain (emTech → product category → … → applications) |
| **`references/learning-and-sponsor.md`** | Tutor + sponsor recipes, multi-lesson sets |
| **`references/output-contract.md`** | Skeleton + omit rules + recipes |
| **`references/scene-prose.md`** | Player-facing lede craft |
| **`references/brief-template.md`** | `briefMd` headings |

## Hard rules

1. **`spotlight.techId`** = one valid Future Forge tech id (`references/tech-ids.md` or `js/data.js` `TECHS`).
2. **`mission.suggested`** = exactly `[spotlight.techId]`.
3. **`mission.briefMd`** = long Markdown brief (target **600–1500 words**; max 12 000 chars). Headings: `brief-template.md`. **The place** = story craft, not a memo.
4. **`mission.scene`** = design-challenge lede (`scene-prose.md`, ≤**500** chars).
5. **`mission.pressure`** = **structured** roles only: `local` / `global` / `support` (omit roles to hide meters). Each: `{ label, pressure, pressureRise, winMax }`. **Flat maps rejected.**
6. Scenario is **fictive**; research notes go in `research` (usually not player-facing).
7. Do **not** force a single correct invention; invite the capability class. End on open design tension — no solution theater.
8. Sensitive themes: `references/sensitivity.md`.
9. **Omit** unused optional keys — do not emit `""` or `false` for optionals.
10. Validate: `npm run validate:quest -- <file>` until `OK:`.

## Optional extensions (combinable)

All of these may appear on **one** tile:

| Feature | Fields | When to use |
|---------|--------|-------------|
| **Easier/harder start** | `resources`: `apMax`, `startingBudget`, `startingWill` (integers ≥ 0) | Classroom pacing |
| **AI capability truth** | `grounding` (Markdown) | **Recommended** for every spotlight — chain: emTech → product category → capabilities → trends/predictions → milestone → use cases → applications (+ honest limits). See `grounding-template.md` |
| **Learning / tutor** | `isLearningModule: true`, `aiTutorContext` (hidden), `module` / `lesson` / `totalLessons` | Sequential lessons; solo tutor UI + prompt |
| **Sponsor** | `sponsorName`, `sponsorBanner` (**text only**) | Attribution; capability still in `grounding` |

Details and templates: **`references/learning-and-sponsor.md`**.

## Procedure

### 1. Intake

- emTech (name → tech id), theme, audience, year (~2026).
- Ask (or infer): learning module? multi-lesson set? sponsor? resource difficulty?
- If multi-lesson: which module **title**, which `lesson` / `totalLessons`?

### 2. Research the advance

- What changed? Near-term honest use? Constraints?
- `research.sources`: `https` only; no invented stats.
- Fill `spotlight.advanceTitle`, `advanceSummary`, `asOf`.
- Draft **`grounding`** per **`references/grounding-template.md`**:
  - emTech **enables** a **product category** (not bare tray id alone)
  - capabilities → **trends** → **predictions**
  - **milestone** unlocks **use cases** → **applications** the learner will invent
  - honest limits; sponsor product only as milestone evidence when sponsored

### 3. Invent the fictive Quest

- Place + lived harm + local driver as **story**.
- Inventable application of the capability (pilot-honest).
- `globalId`, stakeholder, structured **`pressure`** (1–3 roles).
- Optional **`resources`**.

### 4. Player-facing prose

**Read `references/scene-prose.md` first.**

1. `mission.scene` (≤500 chars)  
2. `briefMd` → **The place** (same craft)  
3. Remaining brief headings  

Spine: hook → complication → mechanism → stakes → **open** design challenge. No product theater.

### 5. Learning module (if applicable)

Follow **`references/learning-and-sponsor.md`**.

- Set `isLearningModule: true`.
- Write **`aiTutorContext`** with LESSON GOAL + numbered SEQUENCE (one idea at a time) + MISCONCEPTIONS + INVENT GATE. Never paste into player text.
- Set `module` (title string), `lesson`, `totalLessons` (UI: **{title} · Lesson X/Y**).
- Multi-lesson set: separate JSON files; same module title + totalLessons; `lesson` 1…N; unique ids. **No engine unlock** — do not invent fake prerequisites.

### 6. Sponsor (if applicable)

Follow **`references/learning-and-sponsor.md`**.

- `sponsorName` + optional text `sponsorBanner` (tagline, not image).
- Strong **`grounding`** required in practice (product category chain; product may appear under Milestone).
- Scene/brief stay open invent invitations — not “use Product X”.

### 7. Emit JSON + validate

Use **`references/output-contract.md`** (base skeleton + recipes). Run:

```bash
npm run validate:quest -- <file>
```

### 8. Hand off

- Path(s) to file(s)  
- Copy into **`quests/`** or Import Quest…  
- Spotlight tech + invent invitation  
- UI chips expected: Sponsored / Learn / Start / Crisis as applicable  
- If multi-lesson: list all files and intended order (host-managed for now)  

## Quality checklist

- [ ] Advance citable; place fictive  
- [ ] Exactly one suggested tech  
- [ ] Structured `pressure` (roles only)  
- [ ] Scene craft ≤500; place story craft  
- [ ] Open invent tension — no prescribed solution  
- [ ] `grounding` present for AI consistency (recommended always)  
- [ ] Grounding follows chain at **product-category** grain (not bare emTech unlocks)  
- [ ] Invent framed as **application** of unlocked use cases; open tension  
- [ ] Unused optionals **omitted** (not empty strings)  
- [ ] Learning: solid `aiTutorContext`; module title string; lesson/totalLessons integers ≥ 1; no fake unlocks  
- [ ] Sponsor: text-only; invent still required; capability chain in `grounding`  
- [ ] Combinations validated if used together  
- [ ] `npm run validate:quest` → `OK:`  

## Non-goals

- Multi-quest packs (`quest-pack` rejected)  
- Hard-locking the tech tray  
- Module unlock graphs / auto-advance  
- Sponsor scoring bonuses or forced product usage  
- Requiring any single vendor’s `.grok/` skill path  

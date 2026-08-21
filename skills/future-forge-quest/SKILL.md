---
name: future-forge-quest
license: MIT
description: >
  Research a recent emTech advance and author a Future Forge Spotlight Quest
  tile (JSON). Portable multi-harness skill — not tied to a single agent product.
  Player-facing prose states the invent job in everyday words first; story craft
  follows. Supports structured crisis meters, optional resources, grounding,
  learning-module tutor mode, multi-lesson sets (display-only progress), and
  sponsor attribution.
---

# Future Forge Spotlight Quest author

**License: MIT** (this skill package only).

You write a **portable Quest tile** so learners can invent with **one spotlight technology** after a **real recent capability advance**. The playable place is **fictive** but shaped so that tech is a strong, honest fit.

**Player clarity first.** Title, summary, and the first brief heading must state the invent job in everyday words. Story craft (scene / place) comes after. Full rules: **`references/scene-prose.md`**. Do not write dense policy-brief ledes, research jargon in player text, or stacked megasentences.

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
| **`references/scene-prose.md`** | Player-facing lede craft + plain-language job |
| **`references/brief-template.md`** | `briefMd` headings (job first) |

## Hard rules

1. **`spotlight.techId`** = one valid Future Forge tech id (`references/tech-ids.md` or `js/data.js` `TECHS`).
2. **`mission.suggested`** = exactly `[spotlight.techId]`.
3. **`mission.briefMd`** = Markdown brief (aim **~250–600 words**; max 12 000 chars). Headings: `brief-template.md` — **Your job** first, then story. Do not dump research or tutor curriculum into the brief.
4. **`mission.scene`** = design-challenge lede (`scene-prose.md`, ≤**500** chars). Everyday words; lab terms belong in `grounding` / `aiTutorContext`.
5. **`summary`**, **`title`**, and **`spotlight.encourageCopy`** state the invent job in plain language (see Procedure §4).
6. **`mission.pressure`** = **structured** roles only: `local` / `global` / `support` (omit roles to hide meters). Each: `{ label, pressure, pressureRise, winMax }`. **Flat maps rejected.**
7. Scenario is **fictive**;   research notes go in `research` (usually not player-facing). Capability truth goes in **`grounding`** (and tutor notes in **`aiTutorContext`**) — not as a lecture in player prose. Plottable exponential series for Wait charts go in optional **`trends`** / **`spotlightTrends`** (see schema) — grounding Markdown is not a substitute for chart data.
8. Do **not** force a single correct invention; invite the capability class. End on open design tension — no solution theater.
9. Sensitive themes: `references/sensitivity.md`.
10. **Omit** unused optional keys — do not emit `""` or `false` for optionals.
11. Validate: `npm run validate:quest -- <file>` until `OK:`.

## Optional extensions (combinable)

All of these may appear on **one** tile:

| Feature | Fields | When to use |
|---------|--------|-------------|
| **Easier/harder start** | `resources`: `apMax`, `startingBudget`, `startingWill` (integers ≥ 0) | Classroom pacing |
| **AI capability truth** | `grounding` (Markdown) | **Recommended** for every spotlight — chain: emTech → product category → capabilities → trends/predictions → milestone → use cases → applications (+ honest limits). See `grounding-template.md` |
| **Plottable Wait trends** | `trends` (capability-trend objects), `spotlightTrends` (ids) | Show log-scale charts on Wait; may override/add to warmersun catalog. See schema + skill `future-forge-trends` |
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

Research voice stays in `research` / `grounding`. Do **not** paste it into title, summary, scene, or brief.

### 3. Invent the fictive Quest

- Place + lived harm + local driver as **story**.
- Inventable application of the capability (pilot-honest).
- `globalId`, stakeholder, structured **`pressure`** (1–3 roles).
- Optional **`resources`**.

### 4. Player-language job (before story prose)

**Pass this test before writing scene or place:** *Could a 14-year-old restate the invent job from title + summary alone?*

1. **`summary`** (≤160 chars) — the plain job. Pattern: *Invent a [concrete thing] so [this person] can [everyday outcome].* No invented-place poetry, no “local cut,” no insider nouns (*opposite-handed peptides*, *open-weight*, *MoE*).
2. **`title`** — names the **job or human situation**, not only the fictive place. Good: *School lab rule before the science fair*. Weak: *The unposted rule at Tideglass High* (place poetry without the job).
3. **`spotlight.encourageCopy`** — same plain voice: what to invent, in everyday words.
4. Then write story: if a term would fail a high-school first read, use the everyday phrase in player text; put the lab term only in `grounding` / `aiTutorContext`.

### 5. Player-facing prose

**Read `references/scene-prose.md` first** (including Spotlight / learning extras).

1. `mission.scene` (≤500 chars) — story craft; everyday words  
2. `briefMd` — headings from **`references/brief-template.md`**: **Your job** first, then **The place**, strained, what became possible, constraints  
3. Keep brief lean (~250–600 words). Curriculum and deep capability lectures stay in `aiTutorContext` / `grounding`.

Spine for scene/place: hook → complication → mechanism → stakes → **open** design challenge. No product theater. A metaphor-only closer is not enough — **summary + Your job** must state the invent in plain words.

### 6. Learning module (if applicable)

Follow **`references/learning-and-sponsor.md`**.

- Set `isLearningModule: true`.
- Write **`aiTutorContext`** with LESSON GOAL + numbered SEQUENCE (one idea at a time) + MISCONCEPTIONS + INVENT GATE. Never paste wholesale into player text.
- Optionally stock **RESOURCES** (Markdown `https` links to readings, often `https://warmersun.com/lessons/…`) and **ILLUSTRATIONS** (`![caption](https://…)` diagrams) in `aiTutorContext`. `SEQUENCE` names the **idea**, then “offer [Page title](url) after a short spoken explanation of this idea.” Do not write “open pages/01.md” as if the tutor should only emit a path. See **`references/learning-and-sponsor.md`**.
- Set `module` (title string), `lesson`, `totalLessons` (UI: **{title} · Lesson X/Y**).
- Multi-lesson set: separate JSON files; same module title + totalLessons; `lesson` 1…N; unique ids. **No engine unlock** — do not invent fake prerequisites.
- The tutor teaches jargon; the tile’s player text must not require it to understand the job.

### 7. Sponsor (if applicable)

Follow **`references/learning-and-sponsor.md`**.

- `sponsorName` + optional text `sponsorBanner` (tagline, not image).
- Strong **`grounding`** required in practice (product category chain; product may appear under Milestone).
- Scene/brief stay open invent invitations — not “use Product X”.

### 8. Emit JSON + validate

Use **`references/output-contract.md`** (base skeleton + recipes). Run:

```bash
npm run validate:quest -- <file>
```

### 9. Hand off

- Path(s) to file(s)  
- Copy into **`quests/`** or Import Quest…  
- Spotlight tech + invent invitation  
- UI chips expected: Sponsored / Learn / Start / Crisis as applicable  
- If multi-lesson: list all files and intended order (host-managed for now)  

## Quality checklist

- [ ] Advance citable; place fictive  
- [ ] Exactly one suggested tech  
- [ ] Structured `pressure` (roles only)  
- [ ] **Plain-language test:** a 14-year-old can restate the invent job from **title + summary** alone  
- [ ] `encourageCopy` is everyday words (no research jargon)  
- [ ] Scene craft ≤500; place story craft; everyday words in player text  
- [ ] `briefMd`: **Your job** first; ~250–600 words; no capability/tutor lecture dump  
- [ ] Lab/research terms live in `grounding` / `aiTutorContext`, not as the only way to understand the job  
- [ ] Open invent tension — no prescribed solution  
- [ ] `grounding` present for AI consistency (recommended always)  
- [ ] Grounding follows chain at **product-category** grain (not bare emTech unlocks)  
- [ ] Invent framed as **application** of unlocked use cases; open tension  
- [ ] Unused optionals **omitted** (not empty strings)  
- [ ] Learning: solid `aiTutorContext`; module title string; lesson/totalLessons integers ≥ 1; no fake unlocks  
- [ ] Learning media (if any): https-only resource links / illustrations in `aiTutorContext`; paced for tutor chat, not a first-turn dump; SEQUENCE does not say “open the page, do not answer”  
- [ ] Sponsor: text-only; invent still required; capability chain in `grounding`  
- [ ] Combinations validated if used together  
- [ ] `npm run validate:quest` → `OK:`  

## Non-goals

- Multi-quest packs (`quest-pack` rejected)  
- Hard-locking the tech tray  
- Module unlock graphs / auto-advance  
- Sponsor scoring bonuses or forced product usage  
- Requiring any single vendor’s `.grok/` skill path  

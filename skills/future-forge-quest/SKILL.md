---
name: future-forge-quest
license: MIT
description: >
  Research a recent emTech advance and author a Future Forge Spotlight Quest
  tile (JSON). Portable multi-harness skill — not tied to a single agent product.
  Player-facing prose is a brief fictive story (named people, concrete place),
  then the bigger problem and its root cause, then an outcome-only invent job.
  Capability hints stay in grounding and tutor mode. Supports structured crisis
  meters, optional resources, grounding, learning-module tutor mode, multi-lesson
  sets (display-only progress), sponsor attribution, and the quest economy
  evaluator (too easy / too hard / tight).
---

# Future Forge Spotlight Quest author

**License: MIT** (this skill package only).

You write a **portable Quest tile** so learners can invent after a **real recent capability advance**. The playable place is **fictive**. The spotlight tech is a strong, honest fit — but **player-facing prose never names it as the answer**.

**Player path:** instance story → bigger problem + root cause → outcome job. Full rules: **`references/scene-prose.md`**. Do not write dense policy-brief ledes, research jargon in player text, product riddles, or stacked megasentences.

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
- Multi-lesson: also emit a **`kind: "module"`** wrapper that lists lesson ids and the path summary
- Browser import: **JSON only**
- Default `placement.mode`: `replace-daily`
- Class/server: game repo **`quests/`** folder

| Doc | Purpose |
|-----|---------|
| **`references/schema.md`** | Full field reference |
| **`references/grounding-template.md`** | Capability SoT chain (emTech → product category → … → applications) |
| **`references/learning-and-sponsor.md`** | Tutor + sponsor recipes, multi-lesson sets |
| **`references/output-contract.md`** | Skeleton + omit rules + recipes |
| **`references/scene-prose.md`** | Instance story + RCA + outcome job |
| **`references/brief-template.md`** | `briefMd` headings (place → bigger problem → job) |
| **`references/brief-beats.md`** | How the invent screen steps the brief; optional authored `briefBeats` |
| **`references/economy.md`** | Quest economy evaluator — too easy / too hard / tight; CLI + lab |

## Hard rules

1. **`spotlight.techId`** = one valid Future Forge tech id (`references/tech-ids.md` or `js/data.js` `TECHS`).
2. **`mission.suggested`** = exactly `[spotlight.techId]`. This is how the tray hints. **Do not repeat the hint in player prose.**
3. **`mission.briefMd`** = Markdown brief (aim **~250–600 words**; max 12 000 chars). Headings: `brief-template.md` — **The place**, then **The bigger problem**, then **Your job**. **Write short paragraphs** (one idea each, especially **The place**) — the invent screen steps them as a visual walkthrough. Do not dump research or tutor curriculum into the brief. Optional **`briefBeats`**: see `brief-beats.md` (omit when unused).
4. **`mission.scene`** = instance lede (`scene-prose.md`, ≤**500** chars). Everyday words; lab terms belong in `grounding` / `aiTutorContext`.
5. **`summary`** = the instance in 2–3 short sentences (≤420 chars): named person, place, what went wrong now. **`title`** names the human situation and/or fictive place. **`spotlight.encourageCopy`** states the **outcome** in everyday words (see Procedure §4). None of these name the spotlight tech or a sponsor product.
6. **`mission.pressure`** = **structured** roles only: `local` / `global` / `support` (omit roles to hide meters). Each: `{ label, pressure, pressureRise, winMax }` plus optional **`description`** (1–3 everyday sentences of what that meter means *here*). **Flat maps rejected.** Old tiles without `description` remain valid. **New-tile defaults** (integers; rise is per calendar year): local **3↑1**, global **2↑1**, support **2↑0**. `winMax` typically 1. Local is more urgent than global. Support rise **0** unless you mean trust to rot with time. One island must not finish both local and global — see `economy.md`.
7. Scenario is **fictive**; research notes go in `research` (usually not player-facing). Capability truth goes in **`grounding`** (and tutor notes in **`aiTutorContext`**) — not as a lecture in player prose. Plottable exponential series for Wait charts go in optional **`trends`** / **`spotlightTrends`** (see schema) — grounding Markdown is not a substitute for chart data.
8. Do **not** force a single correct invention. Do **not** write “invent with [tech]”, “build around [product]”, or a “do not invent X” ban-list in player fields. End on open design tension — no solution theater, no product riddle. **Your job is never “pass a law / ban / UBI bill.”** A rule or incentive may be the **root cause** (bigger problem) or the weather the pathway flies through. The invent still makes something scarce more abundant with emTechs in this place this year. Policy as the sole how-it-works is invalid.
9. Sensitive themes: `references/sensitivity.md`.
10. **Omit** unused optional keys — do not emit `""` or `false` for optionals.
11. Validate: `npm run validate:quest -- <file>` until `OK:`.
12. Economy: `npm run economy:quest -- <file>` until the quest verdict is **challenging** (`references/economy.md`). Do not ship a tile the lab calls too easy or too hard without a reason.

## Optional extensions (combinable)

All of these may appear on **one** tile:

| Feature | Fields | When to use |
|---------|--------|-------------|
| **Easier/harder start** | `resources`: `apMax`, `startingBudget`, `startingWill` (integers ≥ 0) | Only if the **first** island cannot pay the tech. A scored pathway that eases a crisis pays +1 Budget per newly eased role — that funds act two. See `economy.md`. |
| **AI capability truth** | `grounding` (Markdown) | **Recommended** for every spotlight — chain: emTech → product category → capabilities → trends/predictions → milestone → use cases → applications (+ honest limits). See `grounding-template.md`. **This is where tech hints live.** |
| **Plottable Wait trends** | `trends` (capability-trend objects), `spotlightTrends` (ids) | Show log-scale charts on Wait; may override/add to warmersun catalog. See schema + skill `future-forge-trends` |
| **Learning / tutor** | `isLearningModule: true`, `aiTutorContext` (hidden), `module` / `lesson` / `totalLessons` | Sequential lessons; solo tutor UI + prompt. Multi-lesson sets also get a `kind: "module"` wrapper. **Tutor may hint the capability class after the player has the story.** |
| **Sponsor** | `sponsorName`, `sponsorBanner` (**text only**) | Attribution; capability still in `grounding` |
| **Briefing cards** | `briefBeats` (3–8) | Tighter captions + shipped stills (`imageUrl`) or live `imagePrompt`; omit if `briefMd` already steps well |
| **Local rules** | `rules` (1–3) | Named regulation / law / policy / ban already on the books. Weather, not the invent. Lobby can write more in play. |

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

- Named people + concrete place + lived harm as **one instance** of the global issue.
- Root cause of the bigger problem (the system that keeps producing it).
- Open outcome the player invents toward (pilot-honest). Do not decide the product in the story.
- `globalId`, stakeholder, structured **`pressure`** (1–3 roles). Defaults: local 3↑1, global 2↑1, support 2↑0 (`winMax` 1). Omit a role to hide it. Local this year; global after a year tick.
- Optional **`resources`** — omit unless the first tile is too expensive to buy at default Budget 5. Do not bump start cash to fund a second island; pathway-ease income does that (`economy.md`). Optional **`rules`** (1–3 named local locks; omit when unused).

### 4. Player-language instance (before capability notes)

**Pass this test:** *Could a 14-year-old retell who is in trouble, what went wrong in that place, and what the bigger problem is — without naming a product?*

1. **`summary`** (2–3 short sentences, ≤420 chars) — the **instance**, spoken. Named person, place, what went wrong **now**. Lead with the hook so the first two sentences still work as the invent-banner lede (engine clips on a sentence at ~160 chars).
   - Gold: *Nurse Amina seals another swab at Crossing Clinic 7. The fever sheet on the fridge does not match. The lab truck left at dawn — answers take days, and by then the bench is empty or the ward is full.*
   - Fail: *Infectious diseases. This is about how far gene sequencing has to go so clinics can do it quick and cheap on site.*
   If a draft names the spotlight tech or a sponsor product, it fails.
2. **`title`** — human situation and/or fictive place. Good: *The fever sheet at Crossing Clinic 7* / *The unposted rule at Tideglass High*. Weak: theme-word + tech gap with nobody in the room.
3. **`spotlight.encourageCopy`** — outcome only, everyday words. Gold: *Invent a way this clinic can know what the fever is before the next queue arrives.* Fail: *Build your invention around gene sequencing.*
4. Everyday words in all player fields; lab terms only in `grounding` / `aiTutorContext`.

### 5. Player-facing prose

**Read `references/scene-prose.md` first.**

1. `mission.scene` (≤500 chars) — instance spine; everyday words; no tech name
2. `briefMd` — headings from **`references/brief-template.md`**: **The place**, **The bigger problem**, **Your job**. **The place** = 2–4 short paragraphs (hook / complication / mechanism / stakes). See **`brief-beats.md`**.
3. Keep brief lean (~250–600 words). Curriculum and capability lectures stay in `aiTutorContext` / `grounding`. Do not author **What just became possible** or **Constraints**.
4. Optional **`briefBeats`** only when captions must be tighter than the essay, you want shipped stills (`imageUrl` — walk shows them immediately), or live `imagePrompt`s. Never a substitute for `briefMd`. No `possible` / `constraints` beats on new tiles.

Spine for scene/place: hook → complication → mechanism → stakes → **open** design challenge. Then zoom out for root cause. Then outcome job. No product theater.

### 6. Learning module (if applicable)

Follow **`references/learning-and-sponsor.md`**.

- Set `isLearningModule: true`.
- Write **`aiTutorContext`** with LESSON GOAL + numbered SEQUENCE (one idea at a time) + MISCONCEPTIONS + INVENT GATE. Never paste wholesale into player text.
- Optionally stock **RESOURCES** (Markdown `https` links to readings, often `https://warmersun.com/lessons/…`) and **ILLUSTRATIONS** (`![caption](https://…)` diagrams) in `aiTutorContext`. `SEQUENCE` names the **idea**, then “offer [Page title](url) after a short spoken explanation of this idea.” Do not write “open pages/01.md” as if the tutor should only emit a path. See **`references/learning-and-sponsor.md`**.
- Set `module` (title string), `lesson`, `totalLessons` (UI: **{title} · Lesson X/Y**).
- Multi-lesson set: separate JSON files **plus a `kind: "module"` wrapper**; same module title + totalLessons; `lesson` 1…N; unique ids. **No engine unlock** — do not invent fake prerequisites. The wrapper is the catalog card and **summary panel** (title, summary, `overviewMd`); lessons drill down from there. Sponsored sets show under **Sponsored**, not Learning.
- The tutor may introduce the capability class **after** the player has the story. The tile’s player text must not require jargon — or the product name — to understand the job.

### 7. Sponsor (if applicable)

Follow **`references/learning-and-sponsor.md`**.

- `sponsorName` + optional text `sponsorBanner` (tagline, not image).
- Strong **`grounding`** required in practice (product category chain; product may appear under Milestone).
- Scene/brief stay open invent invitations — not “use Product X”, not “invent with Product X without saying the name.”

### 8. Emit JSON + validate

Use **`references/output-contract.md`** (base skeleton + recipes). Run:

```bash
npm run validate:quest -- <file>
npm run economy:quest -- <file>
```

Shape first (`OK:`), then difficulty (`challenging`). See **`references/economy.md`**.

### 9. Hand off

- Path(s) to file(s)
- Copy into **`quests/`** or Import Quest…
- Spotlight tech lives in `suggested` / `grounding` / tutor — not in the player lede
- UI chips expected: Sponsored / Learn / Start / Crisis as applicable
- If multi-lesson: list the **module wrapper** plus all lesson files and intended order (host-managed for now)

## Quality checklist

- [ ] Advance citable; place fictive
- [ ] Exactly one suggested tech
- [ ] Structured `pressure` (roles only; optional `description` recommended — place-specific, not the generic role lecture). New tiles: local 3↑1, global 2↑1, support 2↑0 unless you have a reason.
- [ ] **Plain-language test:** a 14-year-old can retell who is in trouble, what went wrong, and the bigger problem from **title + summary** (instance story; names allowed; no product)
- [ ] `encourageCopy` is an outcome in everyday words (no tech name, no research jargon)
- [ ] Scene craft ≤500; place is a brief little story; everyday words in player text
- [ ] `briefMd`: **The place** → **The bigger problem** → **Your job**; ~250–600 words; no capability/tutor lecture dump
- [ ] **The place** is 2–4 short paragraphs (one idea each) so the derived walkthrough is readable
- [ ] **The bigger problem** is root cause analysis, not a meter dump
- [ ] **Your job** is outcome only — no “invent with [tech]”, no ban-list, no “pass a law / UBI / treaty”
- [ ] If `briefBeats` is present: 3–8 beats, captions ≤500 chars, no new facts vs `briefMd`; `imageUrl` is `https://…` or `assets/…` still (skips Imagine); omit the key otherwise; no `possible` / `constraints` beats
- [ ] Lab/research terms and product names live in `grounding` / `aiTutorContext`, not as the only way to understand the job
- [ ] Open invent tension — no prescribed solution
- [ ] `grounding` present for AI consistency (recommended always)
- [ ] Grounding follows chain at **product-category** grain (not bare emTech unlocks)
- [ ] Unused optionals **omitted** (not empty strings); omit `rules` when the scene has no named local lock
- [ ] Learning: solid `aiTutorContext`; module title string; lesson/totalLessons integers ≥ 1; no fake unlocks
- [ ] Multi-lesson: `kind: "module"` wrapper with the same `module` title, `lessons` ids in order, and a path `summary` / `overviewMd` that is still an instance or outcome (not a product riddle)
- [ ] Learning media (if any): https-only resource links / illustrations in `aiTutorContext`; paced for tutor chat, not a first-turn dump; SEQUENCE does not say “open the page, do not answer”
- [ ] Sponsor: text-only; invent still required; capability chain in `grounding`; player text does not smuggle the product
- [ ] Combinations validated if used together
- [ ] `npm run validate:quest` → `OK:`
- [ ] `npm run economy:quest` → quest verdict `challenging`; solo-AI year matches solo-no-AI

## Non-goals

- Multi-quest packs (`quest-pack` rejected — use `kind: "module"` for a learning path)
- Hard-locking the tech tray
- Module unlock graphs / auto-advance
- Sponsor scoring bonuses or forced product usage
- Requiring any single vendor’s `.grok/` skill path
- Player-facing “invent Product Y” or “invent with Product Y without saying Y”
- Player-facing “pass a law / ban / UBI bill” as the invent (policy is weather, not the win)

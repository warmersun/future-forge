---
name: future-forge-quest
license: MIT
description: >
  Research a recent emTech advance and author a Future Forge Spotlight Quest
  tile (JSON). A learning quest ships as one .ffquest file: the tile plus the
  lesson pages it teaches from.   Portable multi-harness skill — not tied to a
  single agent product. Player-facing prose is a short instance of the global
  problem and what that problem is. The ask may be an invention, or recognizing
  which emTech, capability, and use case fit. Ships with a validator, a lint
  for play data, and a difficulty lab (too easy / too hard / challenging).
---

# Future Forge Spotlight Quest author

**License: MIT** (this skill package only).

You write a **portable Quest tile** so learners can face a **real recent capability advance**. The playable place is **fictive**. Sometimes they invent an outcome. Sometimes the point is to realize which emTech, which capability, and which use case fits this place. Naming that technology is allowed.

**Player path:** one instance of the global problem, then what that problem is. Full craft: **`references/scene-prose.md`**. Less is more.

## Start here

```bash
# write the tile (references/output-contract.md)
npm run validate:quest -- <file> --strict                 # OK: + lint: clean
npm run economy:quest -- <file>                           # quest verdict: challenging
```

Write the tile from **`references/output-contract.md`**. New tiles use a spotlight-first shelf, 7-heading `grounding`, brief headings **The place** and **The bigger problem** (**Your job** is optional), and pressure 3↑1 / 2↑1 / 2↑0. Omit `resources` unless the first island cannot buy the spotlight tech.

| Doc | Purpose |
|-----|---------|
| **`references/scene-prose.md`** | Short player prose: the instance and the global problem |
| **`references/brief-template.md`** | `briefMd` headings: The place, The bigger problem; optional Your job |
| **`references/schema.md`** | Field reference, what each field reaches, lint codes |
| **`references/grounding-template.md`** | Capability truth chain (emTech → product category → … → applications) |
| **`references/economy.md`** | Difficulty lab: what challenging means, tech cost, two-act meters |
| **`references/output-contract.md`** | Skeleton, optional extensions, recipes A–G |
| **`references/learning-and-sponsor.md`** | Tutor lessons, multi-lesson sets, sponsors |
| **`references/brief-beats.md`** | How the briefing walk derives cards; optional authored `briefBeats` |
| **`references/tech-ids.md`**, **`references/sensitivity.md`** | Valid ids; charged themes |

## What the player and the AI actually see

Write for these surfaces, not for the JSON. Numbers are character clips in the engine.

| Field | Player | AI | Clip |
|-------|--------|----|------|
| `summary` | Invent banner lede, every catalog card | — | whole, ≤420 |
| `mission.briefMd` | Briefing walk: **one card per paragraph**, merged to 8; then the full brief | Co-inventor, as plain text | **first 2800** |
| `mission.scene` | Co-inventor's opening line; vision fallback | Imagine locale lock; fast-eval | 500 (600 in AI) |
| `grounding` | — | **Every** AI judgement: score, timing, sparks, challenge, judge | **first 3000** (fast-eval) |
| `pressure[role].description` | Crisis hex popup | Sparks (240), scoring (400) | first sentence carries it |
| `mission.suggestedWhy[id]` | Under each **For this place** card; red-hex "What could help here?" | — | 120; must contain the meter label to rank first |
| `spotlight.encourageCopy` | Under the Spotlight chip; the **Your job** card if the brief has none | — | 280 |
| `spotlight.advance*` | Chip tooltip | **Tutor mode only**: the tutor names the advance after the story | 200 / 600 |
| `aiTutorContext` | — | Conversational tutor only (never fast-eval) | 50k |
| `rules` | HUD weather + honesty gates | Fast-eval | body 280 |
| `research`, `visionTheme`, `placement`, `tags`, `author` | — | — | stored, never shown or read |

## Hard rules

1. **`spotlight.techId`** = one valid tech id (`references/tech-ids.md` or `js/data.js` `TECHS`).
2. **`mission.suggested`** = `[spotlight, …2–4 supporting]` (max 5, spotlight first). Supporting techs are **convergence partners** for this place: pick from the tech's `pairs` or by fit, and make sure one is honest against the **global** meter (act two). Each id gets a **`mission.suggestedWhy`** sentence (≤120 chars, everyday words) that says what this family could do *here* and **contains the label of the crisis meter it eases**. The family name is fine. A product name is not.
3. **`mission.briefMd`** = Markdown, as short as clarity allows. Required headings: **The place** (what is wrong here) and **The bigger problem** (what this is an instance of). **Your job** is optional: an outcome to invent, or which emTech, capability, and use case to reach for. Each paragraph is a walkthrough card. The engine merges down to 8.
4. **`mission.scene`** ≤500 chars. The instance, able to stand alone. It is the co-inventor's opening line.
5. **`summary`** = the instance, short (≤420). **`title`** names the situation or the place. **`spotlight.encourageCopy`**, when present, is the optional ask (an outcome, or the applicable emTech / capability / use case).
6. **`mission.pressure`** = structured roles `local` / `global` / `support` (omit a role to hide its meter), each `{ label, description, pressure, pressureRise, winMax }`. New tiles: local **3↑1**, global **2↑1**, support **2↑0**, `winMax` 1. Local hotter than global; support rise 0 unless you mean trust to rot with time. `description` is place-specific and shown to players.
7. **`grounding`** (Markdown) is the capability truth every AI judgement reads: chain from emTech → product category → capabilities → trends/predictions → milestone → use cases → applications → **honest limits**. Keep it inside **3000 characters** or put **Honest limits** early; anything past the window cannot turn a light red. Tutor-only material (debate framings, discourse maps, SEQUENCE) goes in `aiTutorContext`. `research` is citation metadata for humans; nothing in the game reads it.
8. **The ask is optional, and it is not a policy.** It may be an outcome to invent, or a recognition: which emTech, which capability, which use case fits. No "pass a law / ban / UBI" as the win. A rule may be the **root cause** and may be authored as **`rules`** weather.
9. **`resources`** only when the **first** island cannot buy the spotlight tech at Budget 5 (frontier techs cost 2–3$). Pathway ease pays +1 Budget per eased role; that funds act two. `startingBudget: 8` is the classic mistake.
10. Sensitive themes: `references/sensitivity.md`. Fictive places only; no real victims.
11. **Omit** unused optional keys. No `""`, no `[]`, no `false` for optionals.
12. Ship only at `npm run validate:quest -- <file> --strict` → `OK:` + `lint: clean` (or each remaining `WARN` justified in the hand-off) **and** `npm run economy:quest -- <file>` → quest verdict **challenging** on both solo paths, same year. A learning quest with lesson pages also ships only after `npm run pack:quest` succeeds (step 9).

## Procedure

### 1. Intake

emTech (name → tech id), theme (`globalId`), audience, year (`mission.startYear`; 2026 is the usual present, and any year the place needs is valid). Learning module? Multi-lesson set? Sponsor? If multi-lesson: module title, `lesson` / `totalLessons`. If the place fits none of the named themes, set `globalId` to `other`.

### 2. Research → grounding

- What changed, near-term honest use, constraints. Fill `spotlight.advanceTitle`, `advanceSummary`, `asOf` — on learning quests the **tutor** names this advance after the learner has the story, so write it as you would say it to a 17-year-old.
- Draft **`grounding`** per `references/grounding-template.md` at **product-category** grain. Honest limits inside the first 3000 characters.
- `research.sources`: `https` only, real pages, no invented stats. It is for humans reading the file.

### 3. Invent the fictive Quest

- One instance of the global problem, and a plain statement of what that problem is. How it is told — people, voice, length — is yours. The ask, if you write one, is an invention or a recognition of the fitting emTech, capability, and use case.
- Stakeholder, structured `pressure` with descriptions, optional `rules` (1–3 named local locks already on the books; weather, not the invent — note any authored rule also switches off default theme backlash on `automation` / `rogue-si`).
- Shelf: spotlight + 2–4 supporting techs, each with a `suggestedWhy` that names its meter.

### 4. Player-language instance

**Test:** *Can the reader say what is happening in that place, and what global problem it is an instance of?*

- **`summary`** is the instance, short.
- **`title`** names the situation or the place.
- **`encourageCopy`**, if you write it, is the ask: an outcome, or the emTech, capability, and use case that fit.
- **`suggestedWhy`** says what this family could do here and contains the meter label. A product name fails.

### 5. Player-facing prose

Read `references/scene-prose.md`, then write `mission.scene` and `briefMd` (`references/brief-template.md`). Say the instance and what the global problem is. Cut every line that does not serve that. Optional `briefBeats` only for tighter captions or shipped stills (`references/brief-beats.md`).

### 6. Learning module (if applicable)

`references/learning-and-sponsor.md`. Set `isLearningModule: true`; write `aiTutorContext` with LESSON GOAL, SEQUENCE (idea 1 = **what just moved and where it sits on the curve**; the tutor says it after the story), RESOURCES / ILLUSTRATIONS, MISCONCEPTIONS, INVENT GATE (a capability pathway, never a rule text). A page that ships in the package is a package path (`lessons/<folder>/01-job.html`, `lessons/<folder>/illustrations/cover.png`). A reading that does not ship in the package stays `https://`. Set `module`, `lesson`, `totalLessons` together. Multi-lesson sets also emit a `kind: "module"` wrapper whose `totalLessons` agrees with the lessons. A learning quest without `access` requires sign-in on the hosted catalog.

### 7. Sponsor (if applicable)

`sponsorName` + text `sponsorBanner`. Strong `grounding` (the product may evidence the Milestone). Player text stays an open outcome; naming the product is never a valid solution.

### 8. Validate, lint, evaluate

```bash
npm run validate:quest -- <file> --strict
npm run economy:quest -- <file>
```

Fix every `WARN <code>` (codes and meanings: `references/schema.md` → Craft lint). Then read the lab: `too_hard` usually means a frontier spotlight tile costs more than Budget 5 / Will 3 buys, or local is not hotter than global; `too_easy` means one cheap tile clears everything with years to spare. Do not raise `startingBudget` to fund act two.

### 9. Package a learning quest

When the quest has lesson pages, the hand-off is one `<id>.ffquest`. That file is a zip of the quest tile(s) and the lesson pages those tiles teach from. Loose JSON is not the hand-off.

Build a source directory. Do not write `manifest.json`. `pack` does.

```text
quests/<id>.json                         file name is the id
lessons/<folder>/index.html              the book: title and a link to each page
lessons/<folder>/NN-<slug>.html          one file per lesson page, in teaching order
lessons/<folder>/illustrations/…         the figures those pages show
assets/…                                 stills this quest ships (cover, briefing)
```

- Only `quests/`, `lessons/`, and `assets/`. Quest JSON sits directly in `quests/`.
- One lesson folder for a single quest. A multi-lesson path is one `.ffquest`: the `kind: "module"` wrapper plus every lesson quest it lists, and the lesson folders those quests cite. The package id is the wrapper id when there is one, otherwise the quest id. The folder slug is lowercase and does not have to match the id. The kind string `quest-pack` is invalid; it is not a second packaging format.
- Lesson HTML uses page-relative links (`href="01-job.html"`, `src="illustrations/cover.png"`).
- Quest text that cites a shipped page or image uses a package path (`lessons/<folder>/01-job.html`, `assets/cover.png`). A reading that is not in the zip stays `https://`. Write the package path yourself. `pack` only rewrites `https://warmersun.com/lessons/…` and `https://warmersun.com/future-forge/quests/assets/…`. Any other host, including a placeholder, is left as written and is not checked as a file in the zip.

From the game repo, after each tile is strict-clean and **challenging**:

```bash
npm run pack:quest -- <srcdir> -o <outdir>/<id>.ffquest
```

`pack` checks the tree, runs the strict quest validator, and writes the zip. Hand off that file. The format spec is `docs/quest-package.md` in the game repo. Stage and deploy only when asked.

A spotlight with no lesson pages still hands off the JSON: path, `quests/` or Import Quest…, the UI chips (Spotlight / Sponsored / Learn / Start / Crisis), any lint warning you kept and why, and multi-lesson order if any.

## What lint cannot check (you still must)

- The place is fictive and the people have dignity.
- The instance and the global problem are both clear, and the close is not a solution.
- **The bigger problem** names the global problem. It is not a meter dump or a capability lecture.
- Supporting techs are honest convergence partners for this place, not padding.
- `aiTutorContext` teaches the advance **after** the story and never gets pasted into player text.

## Non-goals

- Hard-locking the tech tray; module unlock graphs; sponsor scoring bonuses
- Player-facing "pass a law / ban / UBI bill" as the win (policy is weather, not the win)

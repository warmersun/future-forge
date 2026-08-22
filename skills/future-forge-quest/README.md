# Future Forge — Spotlight Quest authoring skill

**License: MIT** — do whatever; take it as-is.

This package teaches **any** AI agent harness how to research a recent emerging-technology (emTech) advance and write a portable **Quest tile** (JSON) for [Future Forge](https://github.com/warmersun/future-forge).

It does **not** relicense the Future Forge app. Only this skill tree (and example tiles) are MIT.

## What the skill supports

| Area | Summary |
|------|---------|
| **Core spotlight** | One tech, fictive place, plain invent job + design-challenge prose |
| **Crisis meters** | Structured `mission.pressure`: `local` / `global` / `support` (omit roles to focus) |
| **Resources** | Optional starting AP / Budget / Will |
| **Grounding** | Markdown AI source-of-truth along the chain: emTech → product category → capabilities → trends/predictions → milestones → use cases → applications |
| **Plottable trends** | Optional `trends` / `spotlightTrends` for Wait log-scale charts (see `future-forge-trends` skill) |
| **Learning modules** | Tutor mode, hidden `aiTutorContext` (may stock resource links + illustrations for chat), progress `Module X Lesson Y/Z` |
| **Multi-lesson sets** | Multiple JSON files with shared module/totalLessons (display-only; no engine unlock yet) |
| **Sponsors** | Text-only `sponsorName` / `sponsorBanner`; invent still required |

All optional features may be **combined** on one tile (see `examples/spotlight-sponsored-learning.json`).

| Doc | Purpose |
|-----|---------|
| **`SKILL.md`** | Procedure + hard rules |
| **`references/schema.md`** | Full field reference |
| **`references/grounding-template.md`** | Capability SoT chain (authoring guidance) |
| **`references/learning-and-sponsor.md`** | Tutor sequences, multi-lesson, sponsor recipes |
| **`references/output-contract.md`** | Skeleton + recipes A–D |
| **`references/scene-prose.md`** | Player-facing lede craft + plain-language job |

## Not under `.grok/`

Works with Grok, Claude Code, Cursor, Codex, and plain “read this folder” workflows. Optional: symlink into a harness skills directory — never required.

## Quick start

1. Follow **`SKILL.md`** — especially the **player-language job** pass (title + summary must pass the 14-year-old invent-job test).
2. Read **`references/scene-prose.md`** before drafting scene / place (Spotlight extras: everyday words; job not hidden in jargon).
3. Read **`references/brief-template.md`** (**Your job** first; ~250–600 words).
4. Read **`references/schema.md`** and **`grounding-template.md`** (+ **`learning-and-sponsor.md`** if module or sponsor).
5. Write the JSON; **omit** unused optional keys. Keep lab terms in `grounding` / `aiTutorContext`.
6. Validate:

```bash
npm run validate:quest -- output/quests/<slug>/quest.json
```

7. Hand-off:
   - Copy into game **`quests/`** and refresh (External Quests), or  
   - **Import Quest…** on the title screen (per browser).

## Examples

| File | Demonstrates |
|------|----------------|
| `examples/spotlight-gene-seq.json` | Structured pressure (local+support), resources, grounding |
| `examples/spotlight-sponsored-learning.json` | Sponsor + learning module + tutor context + grounding + resources |

Monorepo also has richer classroom tiles under `quests/` (e.g. `kimi-k3.json`).

## Local CLI scaffold

```bash
npm run author:quest -- --tech gene-sequencing --local-only
```

CLI output is a **stub** — re-check against `references/schema.md`, add `grounding` / learning / sponsor as needed, and re-validate.

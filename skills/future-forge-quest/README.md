# Future Forge — Spotlight Quest authoring skill

**License: MIT** — do whatever; take it as-is.

This package teaches **any** AI agent harness how to research a recent emerging-technology (emTech) advance and write a portable **Quest tile** (JSON) for [Future Forge](https://github.com/warmersun/future-forge).

It does **not** relicense the Future Forge app. Only this skill tree (and example tiles) are MIT.

## Quick start

```bash
npm run author:quest -- --tech gene-sequencing --local-only   # scaffold with current defaults
# edit output/quests/<slug>/quest.json: research → grounding, story → player fields
npm run validate:quest -- output/quests/<slug>/quest.json --strict   # OK: + lint: clean
npm run economy:quest  -- output/quests/<slug>/quest.json            # quest verdict: challenging
```

Then copy into the game's `quests/` folder (Library) or use **Import Quest…** on the title screen.

Follow **`SKILL.md`**. It opens with the table of what each field actually reaches (player surface, AI surface, character clip), then the hard rules, then the procedure. Read **`references/scene-prose.md`** before writing any player text.

## What the skill supports

| Area | Summary |
|------|---------|
| **Core spotlight** | One spotlight tech + 2–4 supporting emTechs on the **For this place** shelf, each with a plain-words *why here*. Fictive place; instance story → bigger problem / root cause → outcome job. Tech names stay in the tray, `grounding`, and tutor mode. |
| **Crisis meters** | Structured `mission.pressure`: `local` / `global` / `support` with a place-specific `description` each. Defaults: local 3↑1, global 2↑1, support 2↑0. |
| **Grounding** | Markdown capability truth every AI judgement reads (first 3000 chars in fast paths): emTech → product category → capabilities → trends → milestone → use cases → applications → honest limits. |
| **Rules** | 1–3 named local locks already on the books (law / regulation / policy / ban). Weather and honesty gates, never the invent. |
| **Resources** | Optional starting AP / Budget / Will — only when the first tile is unaffordable. Pathway ease pays +1 Budget per eased role. |
| **Plottable trends** | Optional `trends` / `spotlightTrends` for Look Ahead charts (see the `future-forge-trends` skill). |
| **Learning modules** | Tutor mode with hidden `aiTutorContext`; the tutor names the real advance after the learner has the story. Progress `Module · Lesson X/Y`; `kind: "module"` wrapper for multi-lesson paths. |
| **Sponsors** | Text-only `sponsorName` / `sponsorBanner`; invent still required; product may evidence the grounding Milestone. |
| **Briefing walkthrough** | The invent screen steps `briefMd` one paragraph per card (max 8); optional `briefBeats` for tighter captions and shipped stills. |
| **Validator + lint + lab** | `validate:quest` checks shape, then prints craft `WARN` codes (`--strict` fails on any). `economy:quest` simulates four players; target verdict **challenging**. |

| Doc | Purpose |
|-----|---------|
| **`SKILL.md`** | Surfaces table, hard rules, procedure |
| **`references/scene-prose.md`** | Instance story + root cause + outcome job |
| **`references/brief-template.md`** | `briefMd` headings and card arithmetic |
| **`references/schema.md`** | Field reference, what reaches whom, lint codes |
| **`references/grounding-template.md`** | Capability truth chain and the 3000-char window |
| **`references/economy.md`** | Difficulty lab, tech cost, two-act meters |
| **`references/output-contract.md`** | Skeleton, optional extensions, recipes A–G |
| **`references/learning-and-sponsor.md`** | Tutor sequences, multi-lesson sets, sponsors |
| **`references/brief-beats.md`** | Walkthrough derivation; authored beats |

## Not under `.grok/`

Works with Grok, Claude Code, Cursor, Codex, and plain "read this folder" workflows. Optional: symlink into a harness skills directory — never required.

## Examples

Every example is `--strict` clean and rates **challenging** in the lab. Imitate them; they are kept in sync with the rules.

| File | Demonstrates |
|------|----------------|
| `examples/spotlight-plain.json` | **Start here.** Plain spotlight: three meters with descriptions, `rules`, supporting techs, grounding, no resources |
| `examples/spotlight-gene-seq.json` | The gold prose example (Crossing Clinic 7); `trends`, `briefBeats` with a shipped still. `quests/spotlight-gene-seq.json` is an identical copy |
| `examples/spotlight-sponsored-learning.json` | Sponsor + learning module + tutor context that names the advance |
| `examples/spotlight-sponsored-module.json` | `kind: "module"` wrapper for a multi-lesson sponsored path |

## Hand-off

- Library / classroom: copy into game `quests/` and refresh (External Quests), or **Import Quest…** on the title screen.
- Official Sponsored / Learning catalog: see the game repo's `quests/README.md`.

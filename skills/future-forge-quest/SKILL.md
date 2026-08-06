---
name: future-forge-quest
license: MIT
description: >
  Research a recent emTech advance and author a Future Forge Spotlight Quest
  tile (JSON). Portable multi-harness skill — not tied to a single agent product.
  Player-facing scene and place prose use design-challenge story craft (easy first read).
---

# Future Forge Spotlight Quest author

**License: MIT** (this skill package only).

You write a **portable Quest tile** so learners can invent with **one spotlight technology** after a **real recent capability advance**. The playable place is **fictive** but shaped so that tech is a strong, honest fit.

Player-facing narrative (`mission.scene` and especially **The place** in `briefMd`) must follow the same **design-challenge story craft** as Future Forge scenario seeds. Full rules: **`references/scene-prose.md`**. Do not write dense policy-brief ledes or stacked megasentences.

## When to use

- “Write a Future Forge quest about drones / gene sequencing / solar…”
- “Teach this week’s emTech advance as a quest”
- Research → classroom-ready invent scenario

## Deliverable

One JSON file conforming to `future-forge.quest-tile/v1`:

- Prefer path: `output/quests/<slug>/quest.json`
- Browser import: **JSON only**
- Default `placement.mode`: `replace-daily`

Schema details: `docs/quest-tile-schema.md` (game repo) and `references/schema.md`.

## Hard rules

1. **`spotlight.techId`** = one valid Future Forge tech id (see `references/tech-ids.md` or `js/data.js` `TECHS`).
2. **`mission.suggested`** = exactly `[spotlight.techId]`.
3. **`mission.briefMd`** = long Markdown brief (target **600–1500 words**; max 12 000 chars). Use headings from `references/brief-template.md`. **The place** section is story craft (see `references/scene-prose.md`), not a memo.
4. **`mission.scene`** = plain-text design-challenge lede following `references/scene-prose.md` (≤**500** chars schema cap). Hook → complication → mechanism → stakes → open challenge; short breaths + punch-lines. Not a single dense compound sentence.
5. Scenario is **fictive**; research notes go in `research` (usually not player-facing).
6. Do **not** force a single correct invention; invite the capability class. End the scene/place story on the open design tension — no solution theater.
7. Sensitive themes: follow `references/sensitivity.md`.
8. After writing, run: `npm run validate:quest -- <file>` and fix until OK.

## Procedure

### 1. Intake

- Target emTech (name or id), optional global theme, audience, year (~2026 default).
- Map free text → catalog **tech id**.

### 2. Research the advance

- What recently changed? Near-term honest use? Constraints?
- Sources in `research.sources` (`https` URLs only). Do not invent statistics.
- Fill `spotlight.advanceTitle`, `advanceSummary`, `asOf`.

### 3. Invent the fictive Quest

- Concrete place + lived harm + local driver (as **story**, not checklist labels).
- Problem shape that an **application** of the new capability can address (pilot-honest).
- Pick `globalId` from game themes.
- Meters: structured `mission.pressure` with roles `local` / `global` / `support` (omit any role to hide that meter). Each: `{ label, pressure, pressureRise, winMax }` — labels plain English 1–3 words; values 0–5 (rise 0–3).
- Stakeholder: named role (also ground the scene hook in a person when possible).

### 4. Write player-facing prose (style first)

**Read `references/scene-prose.md` before drafting.**

1. Write **`mission.scene`** (≤500 chars) with the full spine and easy rhythm.  
2. Expand **`briefMd` → The place** with the same craft at fuller length.  
3. Complete remaining brief headings (strained / capability / invent invitation / constraints) in the same voice — scannable, still concrete.

Quick capsule (not a substitute for the full reference):

- Spine: hook → complication → mechanism through action → human stakes → **open** design challenge  
- Voice: third person, plain-but-not-flat, no meta / workshop jargon  
- Rhythm: vary sentence length; **2–4 short punch-lines**; one idea per breath  
- Must include lived harm + local driver as story  
- Do **not** shorten for its own sake; do **not** stack dense clauses  

### 5. Emit JSON + validate

Use structure in `references/output-contract.md`. Validate with the CLI.

### 6. Hand off

Tell the user how to import and that Daily is replaced on-device until they restore stock daily.

## Quality checklist

- [ ] Advance real enough to cite; place fictive  
- [ ] Exactly one suggested tech  
- [ ] `mission.scene` uses design-challenge craft (spine + punch rhythm; ≤500 chars)  
- [ ] **The place** in `briefMd` is lived story, not a brief dump  
- [ ] Ends on open invent tension — no prescribed solution  
- [ ] Brief is Markdown, inventable, not a lecture only  
- [ ] Meters human-readable  
- [ ] `npm run validate:quest` passes  

## Non-goals

- Multi-quest packs (v1 UI rejects packs)
- Hard-locking the tech tray in the game
- Requiring any single vendor’s `.grok/` skill path

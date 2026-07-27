---
name: future-forge-quest
license: MIT
description: >
  Research a recent emTech advance and author a Future Forge Spotlight Quest
  tile (JSON). Portable multi-harness skill — not tied to a single agent product.
---

# Future Forge Spotlight Quest author

**License: MIT** (this skill package only).

You write a **portable Quest tile** so learners can invent with **one spotlight technology** after a **real recent capability advance**. The playable place is **fictive** but shaped so that tech is a strong, honest fit.

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
3. **`mission.briefMd`** = long Markdown brief (target **600–1500 words**; max 12 000 chars). Use headings from `references/brief-template.md`.
4. **`mission.scene`** = short plain-text lede (≤500 chars).
5. Scenario is **fictive**; research notes go in `research` (usually not player-facing).
6. Do **not** force a single correct invention; invite the capability class.
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

- Concrete place + lived harm + local driver.
- Problem shape that an **application** of the new capability can address (pilot-honest).
- Pick `globalId` from game themes.
- Meters: plain English, 1–3 words, values 0–5.
- Stakeholder: named role.

### 4. Write `briefMd`

Follow `references/brief-template.md`. Player-facing; scannable headings; no paywalled paper dump.

### 5. Emit JSON + validate

Use structure in `references/output-contract.md`. Validate with the CLI.

### 6. Hand off

Tell the user how to import and that Daily is replaced on-device until they restore stock daily.

## Quality checklist

- [ ] Advance real enough to cite; place fictive  
- [ ] Exactly one suggested tech  
- [ ] Brief is Markdown, inventable, not a lecture only  
- [ ] Meters human-readable  
- [ ] `npm run validate:quest` passes  

## Non-goals

- Multi-quest packs (v1 UI rejects packs)
- Hard-locking the tech tray in the game
- Requiring any single vendor’s `.grok/` skill path

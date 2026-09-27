---
name: future-forge-predictions
license: MIT
description: >
  Research dated technology predictions (a person's forecasts, an analyst
  report, or a curated outlook) and author a Future Forge predictions bank
  JSON file (future-forge.predictions/v1) that a server side-loads with
  FF_PREDICTIONS_FILE. The bank drives the year dialog, outcome foresight
  cards, and the AI world clock that judges invention timing. Portable
  multi-harness skill — not tied to a single agent product. Ships with a
  validator and examples, including an Elon Musk bank with attribution.
---

# Future Forge predictions-bank author

**License: MIT** (this skill package only).

You write **one predictions bank**: a dated list of milestones, trends, and predictions. A Future Forge server loads exactly one bank. It then:

- shows the rows for the current game year when a learner clicks the calendar year (and after the calendar advances)
- picks outcome-screen foresight cards from it
- sends the AI a **world clock** for the current game year: rows already **due** (year ≤ game year) count as demonstrated, and the nearest rows **not yet** due count as still ahead. The claim-timing judge treats this as binding.

So the years you choose change how harshly invention timing gets judged. Place them honestly.

## When to use

- "Make a predictions file from Elon Musk's (or Ray Kurzweil's, or an analyst's) forecasts"
- "Side-load a more aggressive / more conservative timeline into Future Forge"
- "Produce `future-forge.predictions/v1` JSON"
- "Add attribution to predictions"

## Deliverable

One JSON file conforming to `future-forge.predictions/v1`:

- Prefer path: `predictions/<id>.json` (or `output/predictions/<id>.json` outside the repo)
- Validate: `npm run validate:predictions -- <file>`
- Side-load: `FF_PREDICTIONS_FILE=<file> npm start` (path or https URL)

| Doc | Purpose |
|-----|---------|
| **`references/schema.md`** | Full field reference, caps, and how each field is used |
| **`references/output-contract.md`** | Skeleton + omit rules + hand-off |
| **`references/research.md`** | Evidence, year placement, and attribution rules |
| **`examples/musk-abundance.json`** | Fully attributed single-source bank |
| **`examples/default-excerpt.json`** | Curated multi-source rows (milestone / trend / prediction mix) |

## Hard rules

1. **`schema`** is exactly `"future-forge.predictions/v1"`. `id` (kebab-case) and `title` are required.
2. Every row has **`id`** (unique), integer **`year`** 2024–2040, **`kind`** (`milestone` | `trend` | `prediction`), **`headline`**, **`detail`**, and **`claimBand`** (`now` | `near` | `frontier`).
3. **`techIds`** are real Future Forge tech ids only (`skills/future-forge-quest/references/tech-ids.md` or `TECHS` in `js/data.js`). Unknown ids fail validation. **`globalIds`** are theme ids (listed in `references/schema.md`).
4. **Attribution is for forecasts that belong to someone.** When the whole bank is one person's forecasts, set bank-level `attribution` once. Use row-level `attribution` for mixed banks. Never attribute a statement the person did not make. Never put words in a `quote` that are not verbatim.
5. **No invented facts.** A `milestone` must have actually happened by its `year`. A `prediction` must be labeled as a forecast in `detail` ("Prediction: …"). Put how you placed the year in `sourceNote`.
6. **Year placement:** when a source gives a range ("2026–2027"), use the **later** year. When it gives "within N years" from a dated statement, add N to the statement year. When undated, say so in `sourceNote` and pick the earliest year the source's framing allows, not the most dramatic.
7. **Replace, not merge.** A side-loaded bank replaces the default. If the user wants the default rows too, copy `predictions/default.json` rows into the file and add theirs.
8. **Omit** unused optional keys. Validate until every file reports `OK`.

## Procedure

### 1. Intake

- Whose predictions, or what outlook? One attributed person, a mix, or unattributed?
- Replace the default entirely, or extend it?
- Which techs and themes matter most to the user's Quests?

### 2. Research

- Collect each claim with where and when it was said (see `references/research.md`).
- Separate **milestones** (already happened, citable), **trends** (direction of travel), and **predictions** (forecasts with a year).

### 3. Place years and bands

- Apply the year-placement rule above. Record your reasoning in `sourceNote` (≤200 chars).
- `claimBand`: `now` = routine by that year; `near` = pilots and early deployments; `frontier` = a stretch claim even for its year. Bold forecasts are usually `frontier`.

### 4. Tag for relevance

- `techIds` decide which rows the AI and the year dialog rank first for a learner's stack. Tag the 1–3 techs the claim is actually about.
- `globalIds` rank rows for a Quest's theme. Tag only clear fits.

### 5. Write player copy

- `headline` ≤120 chars: a plain statement a high-school senior can read aloud.
- `detail` ≤600 chars: one or two full sentences. Start forecasts with "Prediction:". Introduce any term a newcomer would not know.
- No arrow chains, no hype adjectives, no unexplained acronyms.

### 6. Emit JSON and validate

```bash
npm run validate:predictions -- predictions/<id>.json
```

### 7. Hand off

Tell the user how to side-load it:

```bash
FF_PREDICTIONS_FILE=predictions/<id>.json npm start
```

or add `FF_PREDICTIONS_FILE=…` to `.env`. On a running server, `GET /api/predictions?refresh=1` re-reads the file; browsers pick it up on reload.

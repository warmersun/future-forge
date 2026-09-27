# Future Forge — Predictions-bank authoring skill

**License: MIT** — do whatever; take it as-is.

This package teaches **any** AI agent harness how to research dated technology predictions and write a portable **predictions bank** JSON file (`future-forge.predictions/v1`) that a [Future Forge](https://github.com/warmersun/future-forge) server side-loads.

It does **not** relicense the Future Forge app. Only this skill tree (and example banks) are MIT.

## What the bank drives

| Surface | Effect |
|---------|--------|
| **Year dialog** | Rows for the current game year when the learner clicks the calendar, and after the calendar advances |
| **Outcome cards** | One milestone, one trend, and one prediction for the learner's stack |
| **AI world clock** | Timing judge (binding), idea sparks, text co-inventor, tutor, and voice co-inventor all see the rows due by the game year and the nearest rows still ahead |
| **Attribution** | Shown as "— name" in the dialog and cards; the AI cites it when a forecast drives a timing call |

| Doc | Purpose |
|-----|---------|
| **`SKILL.md`** | Procedure + hard rules |
| **`references/schema.md`** | Field reference and how each field is used |
| **`references/output-contract.md`** | Skeletons |
| **`references/research.md`** | Evidence, year placement, attribution |

## Quick start

1. Follow **`SKILL.md`**.
2. Write the JSON and validate it:

```bash
npm run validate:predictions -- predictions/<id>.json
```

3. Side-load it:

```bash
FF_PREDICTIONS_FILE=predictions/<id>.json npm start
```

## Example banks

| File | What it shows |
|------|---------------|
| `examples/musk-abundance.json` | One attributed source (bank-level `attribution`), frontier forecasts 2027–2040 |
| `examples/default-excerpt.json` | Unattributed mix of milestones, trends, and predictions from the shipped default |

The full shipped default lives at `predictions/default.json`.

# Future Forge — Capability-trend authoring skill

**License: MIT** — do whatever; take it as-is.

This package teaches **any** AI agent harness how to research an exponential emerging-technology capability trend and write a portable **capability-trend** JSON file for [Future Forge](https://github.com/warmersun/future-forge) Wait charts.

It does **not** relicense the Future Forge game engine. Only this skill tree (and example tiles) are MIT.

## What the skill supports

| Area | Summary |
|------|---------|
| **Trend tile** | One measured capability series per file |
| **Compounding** | `doubling` / `halving` / `cagr` |
| **Milestones** | Reached and predicted markers with date + value |
| **Catalog** | warmersun `future-forge/trends/catalog.json` |
| **Quest embed** | Optional via quest skill `trends` / `spotlightTrends` |

| Doc | Purpose |
|-----|---------|
| **`SKILL.md`** | Procedure + hard rules |
| **`references/schema.md`** | Field reference |
| **`references/output-contract.md`** | Skeleton |
| **`references/research.md`** | Evidence rules |

## Quick start

1. Follow **`SKILL.md`**.
2. Read **`references/research.md`** (no invented stats).
3. Write the JSON; validate:

```bash
npm run validate:trend -- output/trends/<id>.json
```

4. Hand-off to warmersun trends catalog or embed on a Quest.

## Example tiles

Under `examples/` and mirrored in `test/fixtures/trends/`:

| File | techId |
|------|--------|
| `gene-seq-cost-per-genome.json` | gene-sequencing |
| `pathogen-seq-turnaround-hours.json` | gene-sequencing |
| `ai-training-flops-frontier.json` | ai |
| `solar-utility-lcoe.json` | solar |
| `li-ion-pack-cost.json` | battery |
| `warehouse-robot-deployed.json` | robots |
| `leo-broadband-users.json` | networks |

Catalog: `test/fixtures/trends/catalog.json` (used as offline fallback when warmersun trends are not checked out).

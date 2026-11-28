# Future Forge — Capability & Trend Authoring Skill (`v2`)

**License: MIT** — do whatever; take it as-is.

This package teaches **any** AI agent harness how to research an emerging-technology capability, trace its dated milestones (plus an optional log-scale quantitative curve), map the concrete use cases those milestones unlock, and write a portable `future-forge.capability-trend/v2` JSON file for [Future Forge](https://github.com/warmersun/future-forge).

It does **not** relicense the Future Forge app. The app is GNU GPL version 3 or later. Only this skill tree (and example tiles) are MIT.

## What the skill supports

| Area | Summary |
|------|---------|
| **Mental model** | `emTech → Capability → Milestones (optional curve) → Use Cases` |
| **Capability file** | One distinct capability per JSON file (`<id>.json`) |
| **Quantitative curve** | Optional all-or-nothing (`doubling` / `halving` / `cagr`) when primary numeric data exists |
| **Milestone-only** | Supported cleanly (`hasCurve: false`) when progress is stepwise or lacks a single numeric series |
| **Catalog & Bundle** | warmersun `future-forge/trends/` → `catalog.json` + `bundle.json` via `publish-trends.sh` |
| **Quest embed** | Optional via quest skill `trends` / `spotlightTrends` |

| Doc | Purpose |
|-----|---------|
| **`SKILL.md`** | Procedure + hard rules |
| **`references/schema.md`** | Full `v2` field reference |
| **`references/output-contract.md`** | `v2` skeletons (curve & milestone-only) |
| **`references/research.md`** | Evidence rules + Honest copy |

## Quick start

1. Follow **`SKILL.md`**.
2. Read **`references/research.md`** (no invented stats).
3. Write `<id>.json` and validate:

```bash
npm run validate:trend -- path/to/<id>.json
```

4. Stage into `~/dev/warmersun/future-forge/trends/` and publish with `./scripts/publish-trends.sh`, or embed on a Quest.

## Example tiles

Under `examples/` (and `test/fixtures/trends/`):

| File | techId | Curve? |
|------|--------|--------|
| `gene-seq-cost-per-genome.json` | gene-sequencing | Yes (`halving`) |
| `pathogen-seq-turnaround-hours.json` | gene-sequencing | Yes (`halving`) |
| `ai-training-flops-frontier.json` | ai | Yes (`cagr`) |
| `solar-utility-lcoe.json` | solar | Yes (`halving`) |
| `li-ion-pack-cost.json` | battery | Yes (`halving`) |
| `warehouse-robot-deployed.json` | robots | Yes (`cagr`) |
| `leo-broadband-users.json` | networks | Yes (`doubling`) |
| `quantum-random-number-generation.json` | quantum-internet | No (milestone-only) |

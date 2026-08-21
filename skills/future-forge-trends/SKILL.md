---
name: future-forge-trends
license: MIT
description: >
  Research an exponential emTech capability trend and author a Future Forge
  capability-trend JSON file (log-scale Wait charts). Portable multi-harness
  skill — not tied to a single agent product. Output is plottable: compounding
  rate, anchor, milestones with dates and values.
---

# Future Forge capability-trend author

**License: MIT** (this skill package only).

You write a **portable capability-trend tile** so learners see how a measured capability compounds over time on the **Wait +2 years** overlay (log-Y charts, milestone dots).

## When to use

- “Author a sequencing-cost / solar LCOE / AI compute trend for Future Forge”
- “Add plottable exponential trends to warmersun `/future-forge/trends/`”
- “Produce `future-forge.capability-trend/v1` JSON”

## Deliverable

One JSON file conforming to `future-forge.capability-trend/v1`:

- Prefer path: `output/trends/<id>.json`
- Catalog entry: `{ "id", "techId", "file" }` in `catalog.json`
- Validate: `npm run validate:trend -- <file>`

| Doc | Purpose |
|-----|---------|
| **`references/schema.md`** | Full field reference |
| **`references/output-contract.md`** | Skeleton + omit rules |
| **`references/research.md`** | Evidence rules (no invented stats) |

## Hard rules

1. **`techId`** = one valid Future Forge tech id (`skills/future-forge-quest/references/tech-ids.md` or `js/data.js` `TECHS`).
2. **`anchor.value`** and every milestone **`value`** must be **> 0** (log scale).
3. **`compounding`** must be justified by the milestone series or a named empirical pattern (see `research.md`). Do not invent rates.
4. Milestones use **`status`**: `reached` | `predicted`. Label forecasts as forecasts in `summary` when needed.
5. **`sources`**: `https` only; no fake paper titles.
6. **Omit** unused optional keys.
7. Validate until `OK:`.

## Procedure

### 1. Intake

- emTech → `techId`, capability name, unit of measure, approximate year span.

### 2. Research

- Find citable series or well-known compounding patterns (halving periods, CAGR).
- Pick an **anchor** (date + value) near the middle or a well-documented point.
- Collect **milestones** (reached and predicted) with date + value in the **same unit**.

### 3. Fit compounding

- Prefer `halving` / `doubling` when the public story is a period (e.g. ~18-month cost halving).
- Prefer `cagr` when sources quote annual growth/decline rates.
- Curve is a **model**; milestones are observations — they need not sit exactly on the line.

### 4. Emit JSON + validate

```bash
npm run validate:trend -- output/trends/<id>.json
```

### 5. Hand off

- Add to warmersun `future-forge/trends/` + `catalog.json`, **or**
- Embed on a Quest via `trends` / `spotlightTrends` (see `future-forge-quest` skill).

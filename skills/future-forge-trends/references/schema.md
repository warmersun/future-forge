# Capability trend schema (`future-forge.capability-trend/v1`)

Canonical name: `future-forge.capability-trend/v1`

In the game repo, full docs also live at `docs/capability-trend-schema.md`.

Validate:

```bash
npm run validate:trend -- path/to/trend.json
```

## Required


| Field         | Notes                                                                  |
| ------------- | ---------------------------------------------------------------------- |
| `schema`      | `"future-forge.capability-trend/v1"` (optional when nested in a quest) |
| `id`          | kebab-case, unique in catalog                                          |
| `techId`      | Valid Future Forge tech id                                             |
| `name`        | ≤80 chars — chart title (everyday words)                               |
| `summary`     | ≤900 chars — teaching copy in full sentences; ceiling, not a target    |
| `capability`  | ≤160 chars — what is advancing (everyday words)                        |
| `unit`        | ≤80 chars — Y-axis unit (everyday words)                               |
| `compounding` | See below                                                              |
| `anchor`      | `{ date, value }` with `value` > 0                                     |
| `milestones`  | Non-empty array                                                        |




## Compounding


| `kind`     | Extra               | Curve                |
| ---------- | ------------------- | -------------------- |
| `doubling` | `periodYears` > 0   | v = v_0 · 2^{Δt/T}   |
| `halving`  | `periodYears` > 0   | v = v_0 · 2^{-Δt/T}  |
| `cagr`     | `annualRate` (> −1) | v = v_0 · (1+r)^{Δt} |




## Milestones

```json
{
  "id": "optional-slug",
  "label": "$1,000 genome",
  "date": "2014",
  "value": 1000,
  "status": "reached"
}
```

`status`: `reached` | `predicted`. `date` may be `"2014"` or ISO `"2015-01-01"`.

## Optional


| Field     | Notes                                        |
| --------- | -------------------------------------------- |
| `domain`  | `{ start, end }` year or ISO — chart X range |
| `sources` | `[{ label, url }]` with `https` only         |




## Catalog

```json
{
  "schema": "future-forge.capability-trend-catalog/v1",
  "updated": "2026-08-21",
  "trends": [
    { "id": "gene-seq-cost-per-genome", "techId": "gene-sequencing", "file": "gene-seq-cost-per-genome.json" }
  ]
}
```


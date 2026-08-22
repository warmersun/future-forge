# Capability trend schema (`future-forge.capability-trend/v1`)

Portable **quantitative exponential trend** files for Future Forge Wait charts.

| Channel | How trends get in |
|---------|------------------|
| **Official catalog** | warmersun.com `/future-forge/trends/catalog.json` (server downloads) |
| **Quest tile** | Optional embedded `trends[]` on a quest (overrides catalog by `id`) |

Validate:

```bash
npm run validate:trend -- path/to/trend.json
```

## Minimal shape

See `test/fixtures/trends/gene-seq-cost-per-genome.json`.

| Field | Notes |
|-------|--------|
| `schema` | `"future-forge.capability-trend/v1"` (optional when nested in a quest) |
| `id` | kebab-case, unique in catalog |
| `techId` | Must match a `TECHS` id |
| `name`, `summary`, `capability`, `unit` | Required strings (caps 80 / 900 / 160 / 80). Summary is plain sentences; introduce terms. The 900-char summary cap is a safety ceiling, not a brevity goal. |
| `compounding` | `{ kind: "doubling"\|"halving"\|"cagr", … }` |
| `anchor` | `{ date, value }` — value must be **> 0** (log-Y) |
| `milestones` | Non-empty array of `{ label, date, value, status }` |
| `domain` | Optional `{ start, end }` year or ISO date |
| `sources` | Optional `{ label, url }` with `https` only |

### Compounding

| `kind` | Extra field | Curve |
|--------|-------------|--------|
| `doubling` | `periodYears` > 0 | \(v = v_0 \cdot 2^{\Delta t / T}\) |
| `halving` | `periodYears` > 0 | \(v = v_0 \cdot 2^{-\Delta t / T}\) |
| `cagr` | `annualRate` (> −1) | \(v = v_0 \cdot (1+r)^{\Delta t}\) |

Milestones are plot markers; they need not sit exactly on the model curve.

### Milestone status

| `status` | Meaning |
|----------|---------|
| `reached` | Already observed / widely accepted |
| `predicted` | Forecast — label as such in UI |

## Catalog (`future-forge.capability-trend-catalog/v1`)

```json
{
  "schema": "future-forge.capability-trend-catalog/v1",
  "updated": "2026-08-21",
  "trends": [
    { "id": "gene-seq-cost-per-genome", "techId": "gene-sequencing", "file": "gene-seq-cost-per-genome.json" }
  ]
}
```

## Quest embedding

Optional on a quest tile (top-level or under `mission`):

```json
"trends": [ { /* capability-trend object */ } ],
"spotlightTrends": ["gene-seq-cost-per-genome"]
```

Quest trends override catalog rows with the same `id`. Spotlight ids may refer to catalog or embedded trends.

# Capability & Trend Schema (`future-forge.capability-trend/v2`)

Portable **emTech Capability → Milestones (Trend) → Use Cases** files for the 4-Lane Ontology Board, Look Ahead charts, and Invent Capability Explorer.

One JSON file describes **one Capability** belonging to a Future Forge `techId`. Every capability carries dated milestones (reached and/or predicted) and unlocked `useCases`. When an honest, primary-sourced numeric series exists, the file also includes an all-or-nothing quantitative log-scale curve (`unit`, `compounding`, `anchor`, and numeric `milestone.value`); otherwise those curve fields are omitted cleanly (`hasCurve: false`).

| Channel | How capabilities & trends get in |
|---------|----------------------------------|
| **Official catalog** | warmersun.com `/trends/catalog.json` + `/trends/bundle.json` (server downloads) |
| **Quest tile** | Optional embedded `trends[]` on a quest (overrides catalog by `id`) |

Validate:

```bash
npm run validate:trend -- path/to/capability.json
```

## Schema fields

See `test/fixtures/trends/gene-seq-cost-per-genome.json` (with curve) and `skills/future-forge-trends/examples/quantum-random-number-generation.json` (milestone-only).

| Field | Notes |
|-------|-------|
| `schema` | `"future-forge.capability-trend/v2"` (optional when nested in a quest) |
| `id` | kebab-case, unique in catalog, matches filename stem |
| `techId` | Must match a `TECHS` id |
| `name` | ≤80 chars — everyday capability title |
| `capability` | ≤160 chars — operational mechanism (what this capability does) |
| `summary` | ≤900 chars — plain-language teaching prose (full sentences, introduce terms) |
| `trendSummary` | ≤180 chars — concise 1-sentence trajectory headline shown in Lane 1 |
| `milestones` | Non-empty array (max 24) of `{ id?, label (≤80), date, status ("reached"\|"predicted"), detail? (≤280), attribution? (≤160), value? (>0), useCases? }` |
| `axis` | Optional: `"price" \| "speed" \| "capacity" \| "range" \| "scale" \| "quality"` |
| `useCases` | Optional top-level fallback array (max 8) of `{ id?, title (≤80), blurb (≤280), world? ("bits"\|"atoms"\|"split") }` |
| `domain` | Optional `{ start, end }` year or ISO date (auto-derived if omitted) |
| `sources` | Optional `{ label (≤120), url }` with `https` only |

> **Hard use-case rule:** At least one valid use case must appear either on a milestone's `useCases[]` or in top-level `useCases[]`.

### Optional quantitative curve (all-or-nothing)

Either **all** of `{ unit (≤80), compounding, anchor, and numeric milestone.value > 0 on every milestone }` are present (`hasCurve: true`), or **none** of them are present (`hasCurve: false`). Partial mixes fail validation (`partial_curve_fields`).

| `kind` | Extra field | Curve |
|--------|-------------|-------|
| `doubling` | `periodYears` > 0 | \(v = v_0 \cdot 2^{\Delta t / T}\) |
| `halving` | `periodYears` > 0 | \(v = v_0 \cdot 2^{-\Delta t / T}\) |
| `cagr` | `annualRate` (> −1) | \(v = v_0 \cdot (1+r)^{\Delta t}\) |

Milestones are evidence markers; they need not sit exactly on the model curve.

### Milestone status

| `status` | Meaning |
|----------|---------|
| `reached` | Already observed / widely accepted |
| `predicted` | Forecast — never relabeled as reached when game year advances |

## Catalog & Bundle (`v2`)

```json
{
  "schema": "future-forge.capability-trend-catalog/v2",
  "updated": "2026-11-27",
  "bundle": "bundle.json",
  "trends": [
    {
      "id": "gene-seq-cost-per-genome",
      "techId": "gene-sequencing",
      "file": "gene-seq-cost-per-genome.json",
      "name": "Cost per human genome",
      "hasCurve": true
    }
  ]
}
```

When `bundle` is present, `js/trends-remote.mjs` loads `bundle.json` (`future-forge.capability-trend-bundle/v2`) in a single request and falls back to parallel per-file fetches if needed.

## Quest embedding

Optional on a quest tile (top-level or under `mission`):

```json
"trends": [ { /* capability-trend v2 object */ } ],
"spotlightTrends": ["gene-seq-cost-per-genome"]
```

Quest entries override catalog rows with the same `id`.

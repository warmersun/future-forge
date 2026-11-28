# Capability & trend schema (`future-forge.capability-trend/v2`)

Canonical name: `future-forge.capability-trend/v2`

In the game repo, full docs live at `docs/capability-trend-schema.md`.

Validate:

```bash
npm run validate:trend -- path/to/<id>.json
```

## Required (every capability)

| Field | Notes |
|-------|-------|
| `schema` | `"future-forge.capability-trend/v2"` (optional when nested in a quest) |
| `id` | kebab-case ≤80 chars, unique in catalog, matches filename stem |
| `techId` | Valid Future Forge tech id (`js/data.js` `TECHS`) |
| `name` | ≤80 chars — short everyday capability title |
| `capability` | ≤160 chars — operational mechanism (what this capability does) |
| `summary` | ≤900 chars — teaching prose in full sentences; introduce terms |
| `trendSummary` | ≤180 chars — crisp 1-sentence trajectory headline shown in Lane 1 |
| `milestones` | Non-empty array (max 24) |
| **Use cases** | At least 1 valid `{ title, blurb, world? }` on a milestone's `useCases[]` and/or top-level `useCases[]` |

## Optional metadata

| Field | Notes |
|-------|-------|
| `axis` | `"price" \| "speed" \| "capacity" \| "range" \| "scale" \| "quality"` |
| `useCases` | Top-level fallback array (max 8) of `{ id?, title (≤80), blurb (≤280), world? ("bits"\|"atoms"\|"split") }` |
| `domain` | `{ start, end }` year or ISO — auto-derived from milestones/anchor if omitted |
| `sources` | `[{ label (≤120), url }]` with `https://` only (max 12) |

## Optional quantitative curve (all-or-nothing)

Include **all** of these together for a log-scale curve (`hasCurve: true`), or omit **all** of them for a milestone-only capability (`hasCurve: false`):

- `unit`: ≤80 chars — Y-axis unit in everyday words
- `compounding`:
  - `{ "kind": "doubling", "periodYears": > 0 }` (\(v = v_0 \cdot 2^{\Delta t / T}\))
  - `{ "kind": "halving", "periodYears": > 0 }` (\(v = v_0 \cdot 2^{-\Delta t / T}\))
  - `{ "kind": "cagr", "annualRate": > -1 }` (\(v = v_0 \cdot (1+r)^{\Delta t}\))
- `anchor`: `{ "date": "YYYY" | "YYYY-MM-DD", "value": > 0 }`
- `milestones[i].value`: `> 0` on **every** milestone

## Milestones

```json
{
  "id": "optional-slug",
  "label": "$1,000 genome",
  "date": "2014",
  "value": 1000,
  "status": "reached",
  "detail": "Optional 1-sentence context (<=280 chars).",
  "attribution": "Optional speaker/agency/source name (<=160 chars).",
  "useCases": [
    {
      "title": "Hospital rare-disease sequencing",
      "blurb": "Run whole-genome reads for undiagnosed patients in tertiary clinics.",
      "world": "atoms"
    }
  ]
}
```

- `status`: `"reached"` | `"predicted"`.
- `date`: `"2014"`, `"2026-09"`, or `"2015-01-01"`.
- `value`: required `> 0` when curve fields are present; omitted on milestone-only capabilities.

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

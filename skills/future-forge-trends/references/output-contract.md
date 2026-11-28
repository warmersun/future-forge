# Output contract (`v2`)

1. Write UTF-8 JSON (pretty-printed).
2. Schema: `references/schema.md`. Evidence: `references/research.md`.
3. Player copy: full sentences; introduce terms; crisp `trendSummary`; concrete `useCases` on threshold milestones.
4. **Omit** unused optional keys (do not emit `unit`/`compounding`/`anchor`/`value` on milestone-only capabilities).
5. Run `npm run validate:trend -- <file>` until `OK:`.
6. Hand off: copy to `~/dev/warmersun/future-forge/trends/<id>.json` and run `./scripts/publish-trends.sh`, or embed in a Quest's `trends[]`.

---

## Skeleton A — Quantitative Curve Capability (`hasCurve: true`)

```json
{
  "schema": "future-forge.capability-trend/v2",
  "id": "<kebab-capability-slug>",
  "techId": "<techId>",
  "axis": "price",
  "name": "…",
  "summary": "…",
  "capability": "…",
  "trendSummary": "…",
  "unit": "…",
  "compounding": { "kind": "halving", "periodYears": 1.5 },
  "anchor": { "date": "2015-01-01", "value": 4000 },
  "domain": { "start": "2001", "end": "2036" },
  "milestones": [
    {
      "id": "example-reached",
      "label": "…",
      "date": "2014",
      "value": 1000,
      "status": "reached",
      "useCases": [
        {
          "title": "…",
          "blurb": "…",
          "world": "atoms"
        }
      ]
    },
    {
      "id": "example-predicted",
      "label": "…",
      "date": "2028",
      "value": 100,
      "status": "predicted",
      "useCases": [
        {
          "title": "…",
          "blurb": "…",
          "world": "atoms"
        }
      ]
    }
  ],
  "sources": [
    { "label": "…", "url": "https://…" }
  ]
}
```

For rising series use `"kind": "doubling"` or `"kind": "cagr"` with `"annualRate": 0.4`.

---

## Skeleton B — Milestone-Only Capability (`hasCurve: false`)

```json
{
  "schema": "future-forge.capability-trend/v2",
  "id": "<kebab-capability-slug>",
  "techId": "<techId>",
  "axis": "speed",
  "name": "…",
  "summary": "…",
  "capability": "…",
  "trendSummary": "…",
  "milestones": [
    {
      "id": "example-reached",
      "label": "…",
      "date": "2026",
      "status": "reached",
      "useCases": [
        {
          "title": "…",
          "blurb": "…",
          "world": "bits"
        }
      ]
    },
    {
      "id": "example-predicted",
      "label": "…",
      "date": "2029",
      "status": "predicted",
      "useCases": [
        {
          "title": "…",
          "blurb": "…",
          "world": "bits"
        }
      ]
    }
  ],
  "sources": [
    { "label": "…", "url": "https://…" }
  ]
}
```

See `examples/gene-seq-cost-per-genome.json` and `examples/quantum-random-number-generation.json`.

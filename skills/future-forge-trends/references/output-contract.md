# Output contract

1. Write UTF-8 JSON (pretty-printed OK).
2. Schema: `references/schema.md`. Evidence: `references/research.md`.
3. Player copy: full sentences; introduce terms; you do not have to be brief (`research.md` → Honest copy).
4. **Omit** unused optional keys.
5. Run `npm run validate:trend -- <file>` until `OK:`.
6. Hand off: warmersun `future-forge/trends/` + catalog entry, or quest `trends` / `spotlightTrends`.

---

## Skeleton

```json
{
  "schema": "future-forge.capability-trend/v1",
  "id": "<kebab-capability-slug>",
  "techId": "<techId>",
  "name": "…",
  "summary": "…",
  "capability": "…",
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
      "status": "reached"
    },
    {
      "id": "example-predicted",
      "label": "…",
      "date": "2027",
      "value": 100,
      "status": "predicted"
    }
  ],
  "sources": [
    { "label": "…", "url": "https://…" }
  ]
}
```

For rising series use `"kind": "doubling"` or `"kind": "cagr"` with `"annualRate": 0.4`.

See `examples/gene-seq-cost-per-genome.json`.

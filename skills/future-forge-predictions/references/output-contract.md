# Output contract

1. Write UTF-8 JSON (pretty-printed OK).
2. Schema: `references/schema.md`. Evidence and year placement: `references/research.md`.
3. Player copy: full sentences, plain words; forecasts start with "Prediction:".
4. **Omit** unused optional keys. Do not write `status`; the game computes it.
5. Run `npm run validate:predictions -- <file>` until it reports `OK`.
6. Package-local handoff: include `predictions/<id>.json` with the Quest, bind top-level `predictionBankId` (and assumed `premise.bankId`), then pack/verify v2 and preview with `./scripts/sideload-local-package.sh <archive>`.
7. Only an explicitly requested legacy/default-world override uses `FF_PREDICTIONS_FILE=<file> npm start`. No ambient merge or per-server bank switching is needed for v2.

---

## Skeleton — one attributed source

```json
{
  "schema": "future-forge.predictions/v1",
  "id": "<kebab-bank-slug>",
  "title": "<Who>: <what the timeline covers>",
  "attribution": { "name": "<Person>" },
  "predictions": [
    {
      "id": "<slug>-<year>",
      "year": 2029,
      "kind": "prediction",
      "techIds": ["robots", "ai"],
      "headline": "…",
      "detail": "Prediction: …",
      "claimBand": "frontier",
      "sourceNote": "Said in <month year>; 'within N years' placed at <year>."
    }
  ]
}
```

## Skeleton — mixed sources

Leave out the bank `attribution`. Put `attribution` on each forecast row that belongs to someone. Leave milestones and consensus trends unattributed.

```json
{
  "schema": "future-forge.predictions/v1",
  "id": "<kebab-bank-slug>",
  "title": "…",
  "predictions": [
    {
      "id": "…",
      "year": 2026,
      "kind": "milestone",
      "techIds": ["solar", "battery"],
      "headline": "…",
      "detail": "…",
      "claimBand": "now"
    },
    {
      "id": "…",
      "year": 2032,
      "kind": "prediction",
      "techIds": ["ai"],
      "headline": "…",
      "detail": "Prediction: …",
      "claimBand": "frontier",
      "attribution": {
        "name": "<Person>",
        "url": "https://…",
        "date": "2025-03"
      }
    }
  ]
}
```

## Extending the default

For an explicitly requested legacy override, the side-loaded file replaces the default. To extend it, copy `predictions/default.json`, change `id` and `title`, then append your rows. Package-local banks are complete authored calendars: copy only the baseline rows intended for that Quest. Different assumptions belong in separate banks; never automatically merge unrelated worlds.

See `examples/musk-abundance.json` and `examples/default-excerpt.json`.

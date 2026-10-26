# Predictions bank

Future Forge uses the `future-forge.predictions/v1` schema for calendars. Ordinary and legacy play use the default bank loaded at boot. A self-contained v2 Quest instead reads its complete package-local bank through the run's exact package/revision/member identity. These calendars are not merged; unrelated packages may reuse an internal bank ID without sharing rows.

| Surface | Code | What it reads |
|---------|------|---------------|
| Inline Invent Capability outlook | `js/capability-explorer-model.js` | Related rows from the run's active bank, matched by technology; three nearest by year initially, with an option to show all |
| Year dialog (click the HUD year; bulletin after the calendar advances) | `foresightForYear` → `showYearBulletinModal` | 3–6 rows: new this year first, then still-active. Stack and theme hits rank higher |
| Multiplayer bulletins | `js/sim/mp-session.js`, `js/sim/actions.js` | Same, computed on the server and synced in the place snapshot |
| Outcome foresight cards | `foresightForStack` | One milestone and one trend due by the outcome year, one prediction still ahead |
| AI world clock | `worldClockForYear` via `worldClockContext` in `js/server/fast-eval.mjs` | Due rows plus the nearest not-yet rows, each tagged `status: "due" \| "not_yet"` |

Module: `js/sim/world-foresight.js` (validation, active bank, selectors). Loader: `js/predictions-bank.mjs`.

The outlook can show these dated rows alongside a trend chart, but they are related by technology, not measurements of that curve. A date passing does not verify a prediction. Viewing evidence is read-only: it neither advances the simulation nor creates a new authoritative grant for AI. The HUD year dialog and Look Ahead / Wait entrypoints remain available. Package-bound or assumed-premise runs do not fall back to the ambient bank when their bound evidence is unavailable.

## Loading and side-loading

| `FF_PREDICTIONS_FILE` | Bank |
|-----------------------|------|
| unset | `predictions/default.json` |
| path (absolute, repo-relative, or `file:` URL) | That file |
| `https://…` | Fetched at boot (12 s timeout) |

- An invalid or missing side-load logs its errors and falls back to the default.
- A side-loaded bank **replaces** the default. It does not merge.
- `GET /api/predictions` returns `{ ok, source, fallback, count, bank, errors }`. `?refresh=1` re-reads the source. Local paths are reported repo-relative.
- The browser fetches `/api/predictions` at startup and activates the bank with `setWorldForesightBank`. Without a server (static hosting) the bank is empty and the year dialog reads as a quiet year.
- **Self-contained v2 distribution:** include `predictions/<bank-id>.json` and set the Quest's literal `predictionBankId`. An assumed companion's `premise.bankId` must agree. Selectors use the run-owned calendar for bulletins, outcome cards, and model context; client-provided bank/grant fields are not official world authority. Continue resolves the stored immutable reference with current access checks. Invalid or unavailable saved worlds fail explicitly rather than falling back.
- **Legacy/developer side-loading:** an assumed companion Quest may pin the loaded bank when `exploration.premise.bankId` matches. Continue retains a valid snapshot; an invalid or missing assumed snapshot cannot resume under a replacement default. `FF_PREDICTIONS_FILE=test/fixtures/predictions/companion-dock-test.json npm start` remains a developer/default-world feature, not a requirement for distributing v2 packages. Do not combine unrelated Quest assumptions into one process bank. See [Quest packages](quest-package.md) for the worked v2 example.

## The AI world clock

For the current game year and the learner's stack and theme, `worldClockForYear` returns:

- **Due rows** (`year ≤ game year`), ranked by stack hit (+4), theme hit (+3), `frontier` (+2), due this year or last (+1), then newest first.
- **Not-yet rows** (`year > game year`) that are `frontier` or relevant to the stack or theme, nearest year first. About a third of the slots are reserved for them.

| AI call | Limit | How binding |
|---------|-------|-------------|
| `assess-feasibility` (claim timing judge) | 12 | **Binding.** Due = demonstrated; a claim resting on a not-yet row as routine → yellow or red. Beats model knowledge and web search on timing. Grounding still wins on explicit contradiction |
| `idea-sparks` | 8 (focus tech) | Build on due rows; not-yet rows are forecasts |
| Text co-inventor and tutor (chat, spark, drafts, art-of-the-possible, SIT, SCAMPER, …) | 12 | Keep suggestions consistent; label forecasts |
| Voice co-inventor | 6 in instructions, 8 in `get_invent_state` | Spoken paragraph: already real vs still ahead, with attribution |

Not included on purpose: `score-pathway`, `pose-challenge`, `judge-*`, `coach-challenge`, `draft-challenge`, `evaluate-convergence`, `evaluate-neighbors`, `generate-scenarios`.

The AI is asked to name the row headline and cite the attribution ("per Elon Musk's forecast") when a row drives a timing call.

When the AI is unavailable, the local fallback judges timing from how-it-works text alone (`detectClaimStretch`). It does not read the bank.

## Schema

Full reference: [`skills/future-forge-predictions/references/schema.md`](../skills/future-forge-predictions/references/schema.md).

```json
{
  "schema": "future-forge.predictions/v1",
  "id": "musk-abundance",
  "title": "Elon Musk: AI, robots, and abundance",
  "attribution": { "name": "Elon Musk" },
  "predictions": [
    {
      "id": "musk-optimus-surgeon-2029",
      "year": 2029,
      "kind": "prediction",
      "techIds": ["robots", "ai"],
      "headline": "Optimus out-operates the best surgeons",
      "detail": "Prediction: the Optimus humanoid robot becomes a better surgeon than the world's best human surgeons, roughly within three years.",
      "claimBand": "frontier",
      "sourceNote": "Source says roughly three years; placed at 2029."
    }
  ]
}
```

- Required per row: `id`, `year` (2024–2040), `kind` (`milestone` | `trend` | `prediction`), `headline`, `detail`, `claimBand` (`now` | `near` | `frontier`).
- Optional: `techIds` (validated against `TECHS` on the server), `globalIds`, `sourceNote`, `attribution` (`{ name, url?, date?, quote? }` or a name string).
- Bank-level `attribution` applies to rows without their own.

## Authoring

- Validate: `npm run validate:predictions -- <file>` (no args: default and `predictions/examples/`).
- Agent skill: `skills/future-forge-predictions/` (also linked under `.grok/skills/`).
- Examples: `predictions/examples/musk-abundance.json`.

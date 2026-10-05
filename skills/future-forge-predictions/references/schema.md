# Schema: `future-forge.predictions/v1`

Source of truth: `validatePredictionsBank` in `js/sim/world-foresight.js`. Strings are trimmed and clipped to their cap.

## Document

| Field | Required | Type | Cap | Notes |
|-------|----------|------|-----|-------|
| `schema` | yes | string | — | Exactly `"future-forge.predictions/v1"` |
| `id` | yes | string | 80 | Kebab-case bank id. `future-forge-default` is the shipped default |
| `title` | yes | string | 120 | Shown in the year dialog kicker when the bank is not the default |
| `attribution` | no | object or string | — | Default attribution for every row that has none |
| `predictions` | yes | array | 500 rows | Non-empty |

Unknown top-level keys are warnings, not errors.

## Row

| Field | Required | Type | Cap | Notes |
|-------|----------|------|-----|-------|
| `id` | yes | string | 80 | Unique within the bank |
| `year` | yes | integer | 2024–2040 | Year the row becomes **due** |
| `kind` | yes | enum | — | `milestone` (happened), `trend` (direction of travel), `prediction` (forecast) |
| `headline` | yes | string | 120 | Plain statement; shown bold in the year dialog |
| `detail` | yes | string | 600 | One or two sentences. Forecasts start with "Prediction:" |
| `claimBand` | yes | enum | — | `now` routine · `near` pilots · `frontier` stretch |
| `techIds` | no | string[] | 40 each | Future Forge tech ids; unknown ids fail validation |
| `globalIds` | no | string[] | 40 each | Theme ids (below) |
| `sourceNote` | no | string | 200 | How the year was placed; where the claim came from |
| `attribution` | no | object or string | — | Overrides the bank attribution |

Unknown row keys are warnings.

## Attribution

A string is shorthand for `{ "name": "…" }`.

| Field | Required | Cap | Notes |
|-------|----------|-----|-------|
| `name` | yes | 80 | Shown as "— name" in the year dialog and outcome cards; cited by the AI |
| `url` | no | 400 | `https://` only |
| `date` | no | 20 | When the statement was made, e.g. `"2025-06"` |
| `quote` | no | 400 | Verbatim only |

## How the game uses each field

| Consumer | Uses |
|----------|------|
| Year dialog | Up to 5 rows: new this year first, then still-active. `kind`, `headline`, `detail`, attribution name |
| Outcome cards | One `milestone` and one `trend` due by the outcome year, and one `prediction` still ahead of it. Stack hits beat theme hits |
| AI world clock | Up to 12 rows (8 for idea sparks, 6 in voice). Due rows ranked by stack hit, theme hit, `frontier`, recency. Plus the nearest not-yet rows that are `frontier` or relevant. Each row carries `status: "due" \| "not_yet"` and the attribution name |

`status` is computed from `year` against the game year. You never write it.

The timing judge treats a **due** row as demonstrated, and a **not_yet** row the claim depends on as grounds for yellow or red. Moving a year earlier makes the judge more lenient on matching claims. Moving it later makes it stricter.

## Theme ids (`globalIds`)

`rogue-si`, `genocide`, `poverty`, `chem-bio`, `asteroid`, `weather`, `mideast`, `nuclear`, `slavery`, `women`, `education`, `automation`, `refugees`, `ag`, `food`, `eco`, `infectious`, `climate`, `cancer`, `mental`, `alzheimer`, `ageing`, `water`, `air`, `energy-access`, `homeless`, `cities`, `child`, `maternal`, `coord`, `radicalization`, `fgm`, `short-termism`, `misinfo`, `totalitarianism`, `women-stem`, `memory`, `rural-roads`, `smoking`, `sanitation`, `waste`, `reproductive`, `amr`, `other`

Source of truth: `GLOBALS` in `js/data.js`.

## Tech ids (`techIds`)

See `skills/future-forge-quest/references/tech-ids.md` or `TECHS` in `js/data.js`.

# Predictions bank

One JSON file of dated predictions (`future-forge.predictions/v1`) drives everything the game knows about "what is possible by year Y":

- the **year dialog** (click the year in the HUD, or the bulletin after the calendar advances)
- the **outcome screen** foresight cards
- the **AI world clock**: the claim-timing judge, "Ask for ideas", the text co-inventor and tutor, and the voice co-inventor all receive the rows due by the current game year, plus the nearest rows not yet due

The server loads one bank at boot. Everyone on that server — solo, hotseat, and online rooms — sees the same bank.

## Files

| File | Role |
|------|------|
| `default.json` | Shipped default (curated 2026 snapshot) |
| `examples/musk-abundance.json` | Ready side-load: Elon Musk's AI / robots / abundance timeline, every row attributed |

## Side-load a different bank

1. Author a bank with the skill at `skills/future-forge-predictions/`, or edit a copy of `default.json`.
2. Validate: `npm run validate:predictions -- path/to/bank.json`
3. Start the server pointing at it:

```bash
FF_PREDICTIONS_FILE=predictions/examples/musk-abundance.json npm start
```

| Env | Effect |
|-----|--------|
| `FF_PREDICTIONS_FILE` unset | `predictions/default.json` |
| `FF_PREDICTIONS_FILE=path/to/bank.json` | Local file (absolute, repo-relative, or `file:` URL) |
| `FF_PREDICTIONS_FILE=https://…/bank.json` | Remote file |

If the side-loaded file is missing or invalid, the server logs the errors and falls back to `default.json`. `GET /api/predictions?refresh=1` re-reads the file without a restart; browsers pick it up on reload.

A side-loaded bank **replaces** the default. It is not merged. If you want the default rows as well, copy them into your file.

Schema reference and AI semantics: [`docs/predictions-bank.md`](../docs/predictions-bank.md).

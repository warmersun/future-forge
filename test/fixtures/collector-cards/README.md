Test fixtures for the collector-card publish flow. These live outside
`cards/`, so the publish workflow never sees them. The PNG is a solid colour
written by `test/collector-card-png.mjs`; it is test data, not card art.

Validate the sample as if it were a daily card:

    FF_CARDS_ROOT=test/fixtures/collector-cards npm run validate:collector-card -- test/fixtures/collector-cards/cards/daily/2026-10-08-sample-card.json

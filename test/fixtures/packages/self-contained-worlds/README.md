# Self-contained world fixtures

Synthetic test data. Every claim in these banks is invented for package tests.
Do not treat a row as a real forecast, a verified capability, or a speaker's statement.

Two calendars:

- `kiln-ferry-bank` belongs to `kiln-ferry-test` and, when shared, to `kiln-shared-test`.
- `harbor-clock-bank` belongs to `harbor-clock-test` and uses a different calendar.
- `collision-bank` is a different calendar in a different package. Package revisions namespace it from `kiln-ferry-bank`.

`module-kiln` is a wrapper. It does not reference a bank.

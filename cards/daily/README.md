# Daily collector cards

One card per weekday, published automatically when its PR is merged into `main`.

- File: `YYYY-MM-DD-<kebab-slug>.json`, with the page image beside it under the same name (`.jpg`, `.png`, or `.webp`).
- Every card carries its own fixed UUID `"id"`. Mint it once (`node -e "console.log(crypto.randomUUID())"`) and never change it.
- The image is AI-generated, 16:9, at most 1.5 MB, with no photos and no logos.
- Only this folder is published. `cards/examples/` never is.

Details: the README section "Daily collector cards" and `skills/future-forge-collector-cards/`.

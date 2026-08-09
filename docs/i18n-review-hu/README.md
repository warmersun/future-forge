# Hungarian translation review pack

Side-by-side **English / Hungarian** strings for review and correction.

**Agent handoff:** see [CONTINUE.md](./CONTINUE.md) for branch state, apply-corrections procedure, and known gaps.

| File | Contents | Entries (approx) |
|------|----------|------------------|
| [01-ui.md](./01-ui.md) | UI chrome (`locales/hu/ui.json`) | 852 |
| [02-catalog.md](./02-catalog.md) | Domains, shelves, globals, angles, vision, missions, year news, foresight | 217 |
| [03-techs.md](./03-techs.md) | Technology catalog | 444 |
| [04-problem-briefs.md](./04-problem-briefs.md) | Theme problem briefs | 129 |
| [05-scenario-seeds.md](./05-scenario-seeds.md) | Local mission angle packs (largest) | 1213 |
| [06-market-news.md](./06-market-news.md) | Market news headlines/bodies | 244 |

## How to edit

1. Open any file above.
2. Change only text after **`HU:`** (or the HU block for long strings).
3. **Do not rename** keys in headings like ``### `title.tagline` ``.
4. Optional reviewer notes: add `**NOTE:** your comment` under an entry.

## After you finish

Tell the agent something like:

> Apply my corrections from `docs/i18n-review-hu/`

It should parse the HU fields and write back into `locales/hu/*.json` (and re-run i18n tests).

## Glossary

Canonical terminology: [`../i18n-glossary-hu.md`](../i18n-glossary-hu.md)

## Notes

- Some UI keys have **HU** but no extracted **EN** (legacy/removed screens, or defaults only on dynamic paths). Review HU on its own merits.
- Scenario seed places (city names) are often left in English on purpose — edit if you want localization.
- Brand names **Future Forge** and **Warmer Sun** stay untranslated.

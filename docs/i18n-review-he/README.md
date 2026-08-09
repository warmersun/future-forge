# Hebrew translation review pack

Side-by-side **English / Hebrew** strings for review and correction.

| File | Contents | Entries (approx) |
|------|----------|------------------|
| [01-ui.md](./01-ui.md) | UI chrome (`locales/he/ui.json`) | 852 |
| [02-catalog.md](./02-catalog.md) | Domains, shelves, globals, angles, vision, missions, year news, foresight | 217 |
| [03-techs.md](./03-techs.md) | Technology catalog | 444 |
| [04-problem-briefs.md](./04-problem-briefs.md) | Theme problem briefs | 129 |
| [05-scenario-seeds.md](./05-scenario-seeds.md) | Local mission angle packs (largest) | 1213 |
| [06-market-news.md](./06-market-news.md) | Market news headlines/bodies | 244 |

## How to edit

1. Open any file above.
2. Change only text after **`HE:`** (or the HE block for long strings).
3. **Do not rename** keys in headings like `` `title.tagline` ``.
4. Optional reviewer notes: add `**NOTE:** …` under an entry.

## After you finish

Tell the agent something like:

> Apply my corrections from `docs/i18n-review-he/`

It should parse the HE fields and write back into `locales/he/*.json` (and re-run i18n tests).

## Notes

- First-pass packs may be machine-translated — edit freely for natural Hebrew.
- Scenario seed places (city names) are often left in English on purpose.
- Brand names **Future Forge** and **Warmer Sun** stay untranslated.
- Regenerate this pack: `node scripts/i18n-export-review-md.mjs --locale he`

# Agent handoff — Hungarian i18n review

**Status (2026-08-09):** Review pack generated; human + agent polish **in progress** on FR/ES/HE/HU review markdown (keys/EN left intact). Do not force-push. Apply locale JSON only when user asks.

## Branch / repo

| Item | Value |
|------|--------|
| Branch | `translation` (tracks `origin/translation`) |
| Base | rebased onto `origin/main` (`df687d3`) |
| HEAD when left | `9fcd1a6` — structured pressure fixture fix |
| Remote | force-pushed after rebase; in sync at handoff time |
| Uncommitted | `docs/i18n-review-hu/` is **untracked** until someone commits it |

## What’s done

1. Rebased `translation` onto main; merged main features (quest hub, tutor, TTS, server hardening) with i18n.
2. `npm test` green (310) after fixture pressure fix.
3. Side-by-side EN/HU review docs generated under this folder (~3100 entries).

## Review pack layout

| File | Target pack | Notes |
|------|-------------|--------|
| `01-ui.md` | `locales/hu/ui.json` | Nested JSON; keys are dotted paths |
| `02-catalog.md` | domains, shelves, globals, angles, vision, missions, year-news, foresight | Mixed packs |
| `03-techs.md` | `locales/hu/techs.json` | Nested maturity/milestones/etc. |
| `04-problem-briefs.md` | `locales/hu/problem-briefs.json` | Arrays by index |
| `05-scenario-seeds.md` | `locales/hu/scenario-seeds.json` | Keys like `seedId.title`, `seedId.scene`, … |
| `06-market-news.md` | `locales/hu/market-news.json` | `id.headline`, `id.body` |
| `README.md` | — | User instructions |
| Glossary | `docs/i18n-glossary-hu.md` | Locked terms (MI, feltalálni, küldetés, …) |

### Entry format (stable — parse this)

```markdown
### `dotted.key.path`

**EN:** English text
**HU:** Hungarian text
```

Long strings use blank lines after `**EN:**` / `**HU:**` then a body until `---` or next `###`.

Optional: `**NOTE:** …` under an entry (reviewer comment — do not put into locale JSON unless they ask).

## When user says “apply my corrections”

1. Diff or re-parse all `docs/i18n-review-hu/0*.md` for `### \`key\`` + following `**HU:**` values.
2. Map keys back into the correct `locales/hu/*.json` files (do not change EN sources).
3. Preserve JSON structure; only update string leaves (and arrays by index).
4. Re-run: `node --test js/i18n.test.js js/i18n/content.test.js js/data.claim-locale.test.js` and preferably full `npm test`.
5. Commit only if they ask — suggest message like `i18n(hu): apply review corrections from docs/i18n-review-hu`.

### Key → pack mapping tips

- **UI:** unflatten dotted keys into nested `ui.json` (e.g. `title.tagline` → `{ title: { tagline } }`).
- **Scenario seeds:** first path segment is `seedId` (may contain `--`); rest is field (`title`, `scene`, `stakeholder`, `places.N`, `pressureKeys.N`).
- **Catalog file `02`:** section headings indicate pack; keys are `id.field` or `yearNews.i.text` / `foresight.i.text`.
- **Missing HU** shown as `_(missing)_` — skip write-back unless user filled real text.
- **Missing EN** in UI is normal for some keys; still apply HU if present.

### Regenerating the pack (if EN/HU sources move)

Script approach used once: export EN via node (`js/scenario-seeds.js`, `js/data.js`, `js/problem-briefs.js`, `js/sim/market-news.js`), extract UI EN from `t(..., "default")` + `index.html`, flatten HU packs, write this folder. No checked-in generator yet — re-derive or add `scripts/i18n-review-export.mjs` if needed. **Do not overwrite user edits** when regenerating; merge or export to a new dated folder.

## Known gaps (not blocking)

- 1 scenario seed missing HU overlay: `_default--crisis-lands-in-place`
- Some UI keys in HU have no extracted EN (legacy daily/pins chrome, etc.)
- Full content + AI localization still “in progress” per README language notes
- Review docs not committed to git yet

## Later: fr / es / he (2026-08-09)

First-pass French, Spanish, and Hebrew shipped on `translation` (uncommitted at handoff unless committed later):

- Registry: `SUPPORTED_LOCALES` includes `fr`/`es`/`he`; `isRtlLocale` / `documentDirection` for `he`
- Packs: `locales/{fr,es,he}/` (same filenames as HU); rebuild via `npm run i18n:build:packs`
- Static: `locales` is in `PUBLIC_DIRS` (`js/server/static.mjs`) — required for pack HTTP
- Tests: `js/i18n/packs-fr-es-he.test.js` + extended `js/i18n.test.js`
- Quality is machine first-pass (Google Translate free API), not native review

## User intent

- **Not** opening a PR to `main` yet.
- **Not** reviewing all text now — pack is parked for later partial or full review.
- Playtest path when needed: `npm start` → `/?lang=hu&i18nDebug=1`

## Do not

- Force-push `translation` without asking (already rewritten once on rebase).
- “Fix” Hungarian copy at scale without user-edited HU in this pack.
- Commit secrets or re-login gh unless push is requested (`gh` is installed at `~/.local/bin/gh`; user `warmersun` has logged in).

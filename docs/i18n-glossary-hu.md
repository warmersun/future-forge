# Hungarian glossary (Future Forge)

Source of truth for UI copy, AI draft scripts, and human review.  
**Brand (do not translate):** Future Forge, Warmer Sun.

Update this file when you settle on better terms; keep `locales/hu/ui.json` in sync for player-facing chrome.

## Locked terminology

| Concept | Use | Avoid |
|---------|-----|--------|
| Artificial intelligence | **MI** (mesterséges intelligencia) | English “AI” in Hungarian UI |
| Invent (verb) | **feltalálni** — *Találj fel…* | **kitalálni** (means “make up / figure out,” not invent) |
| Invention (noun) | **találmány** | kitalálás |
| Invent with AI | **Találj fel MI-vel** | Találj ki AI-val |

## Core loop

| English | Hungarian (current) | Notes |
|---------|---------------------|--------|
| Quest | küldetés | Crisis episode / local mission |
| Theme | téma | Global problem shelf |
| Mission | küldetés / misszió | Prefer **küldetés** in UI |
| Invent / Invention | feltalálni / találmány | Verb: **találj fel**; noun: **találmány** |
| How it works | Hogyan működik | Story face |
| Everyday life | Mindennapi élet | Story face |
| Feasibility | Megvalósíthatóság | Timing traffic light |
| Challenge | Próba | Scrutiny gate (alt: Kihívás — pick one; UI uses **Próba** unless revised) |
| Deploy / Field | Telepítés | Deploy bay |
| Pilot | Pilot | Or **próbaüzem** — decide before full UI pass |
| Scale | Méretezés | |
| Wait | Várakozás | Advance calendar |
| End turn | Kör vége | |
| Collapse | Összeomlás | |
| Crisis | Válság | |
| Pressure meter | Nyomásmérő | HUD crisis meters |

## Resources

| English | Hungarian (current) |
|---------|---------------------|
| AP / Action points | AP / akciópont |
| Budget | Költségvetés |
| Support | Támogatás | (not “player trust”) |
| Will | Támogatás | Align with Support in UI |

## Co-inventor & MI

| English | Hungarian (current) |
|---------|---------------------|
| AI / artificial intelligence | **MI** / mesterséges intelligencia |
| AI Co-Inventor | **MI társfeltaláló** |
| Spark ideas | Ötletindító |
| Suggest stack | Tech-stack javaslat |
| Art of the possible | A lehetséges művészete |
| Name it | Nevezd el |
| Timing check | Időzítés-ellenőrzés |
| Teach me | Taníts |
| Fill other side | Töltsd ki a másik oldalt |

## Challengers

| English | Hungarian (current) |
|---------|---------------------|
| Moloch | Moloch |
| Ethicist | Etikus |
| Stakeholder | Érdekelt |
| Mother Nature | Anyatermészet |

## Domains (tech tray)

| English | Hungarian (current) |
|---------|---------------------|
| Power | Erő |
| Automator | Automatizáló |
| Mover | Mozgató |
| LifeForce | Életerő |
| Link | Kapcsolat |
| Portal | Portál |

Tech **ids** (`ai`, `solar`, …) stay ASCII English in code/JSON. Display **names** and player-facing copy use **MI**, not “AI”.

### Content packs (`locales/hu/`)

| File | Contents |
|------|----------|
| `domains.json` | Domain tray labels (Erő, Automatizáló, …) |
| `shelves.json` | Theme shelf titles |
| `globals.json` | 43 theme titles + blurbs |
| `techs.json` | 29 techs (name, summary, learn, maturity, …) — **AI → Mesterséges intelligencia** |
| `challenge-angles.json` | Moloch / Etikus / Érdekelt / Anyatermészet |
| `vision-stages.json` | Ma / Korai építés / … |
| `year-news.json` | Year-advance news lines |
| `foresight.json` | Learn/outcome foresight bank |
| `missions.json` | Baked tutorial & showcase missions (e.g. Portside) |
| `problem-briefs.json` | 43 theme briefs (currentState / rootCauses / warnings) |
| `scenario-seeds.json` | ~173 local missions by stable `seedId` |
| `market-news.json` | 122 market event headline + body |

Resolvers: `js/i18n/content.js` (`locTech`, `locGlobal`, `locScenario`, `locProblemBrief`, `locMarketEvent`, `applyQuestLocale`, …).

### Claim heuristics (Phase 5)

`detectClaimStretch(how, techs, year, locale)` and `hasPilotLanguage(text, locale)` accept **hu**.  
Hungarian pilot words: *próbaüzem, kísérleti, felügyelt, korlátozott, partner, mintaprojekt…*  
Reasons returned in Hungarian when `locale === "hu"`.

### Draft long-form (AI → review)

```bash
npm run i18n:draft:briefs
npm run i18n:draft:scenarios              # all themes
npm run i18n:draft:scenarios -- --start-here
npm run i18n:draft:scenarios -- --theme climate
```

Requires SuperGrok (`grok login`) or `XAI_API_KEY`. Skips keys already present. Fluent review of Start Here scenes is the quality gate.

### AI output language (Phase 4)

Client sends `context.locale` + `context.outputLanguage` on every `/api/co-invent` call (`aiLocaleContext()`).  
Server appends a mandatory language directive to the system prompt.  
Friends rooms store **host locale** at create time; room AI uses host language for shared content.

## Style (same as English seeds)

- Hemingway clarity; smart high-school senior audience.
- Introduce jargon in plain words on first use.
- Local and concrete; not UN-resolution tone.
- Pressure meter labels: 1–3 short words, human, no camelCase — in Hungarian when locale is `hu`.
- Prefer **feltalál-** stem for invent/co-invent; never **kitalál-** for the core loop.

## Locale codes

- `en` — default, English source in code / HTML fallbacks  
- `hu` — Hungarian packs under `locales/hu/`

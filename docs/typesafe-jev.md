# TypeSafe (Jev) judges

Future Forge still **writes** with Grok (how-it-works drafts, challenge speeches, idea sparks, vision). **Judgments that move lamps, Budget, stack applies, or lobby weather** go through [TypeSafe](https://docs.typesafe.ai/) **Jev**, a System One model that returns typed yes/no (Noul) and closed-set (Choice) answers instead of JSON-in-prose.

Code owns docking, meters, AP, insolvency, pathway-ease math, and clamps. Jev answers narrow meaning questions. If the TypeSafe key is missing or a call fails, the existing Grok / regex / local path is unchanged.

**portal** (`npm run portal`) does not call TypeSafe or xAI.

Mint a key at [console.typesafe.ai/keys](https://console.typesafe.ai/keys). Keep it on the **game** server only (`dangerouslyAllowBrowser` stays off).

---

## Enable

On the game process (`npm start` / `npm run start:dev`):

```bash
# preferred
export FF_TYPESAFE_API_KEY=apikey_…
# or the SDK default
export TYPESAFE_API_KEY=apikey_…

# optional
# FF_TYPESAFE_MODEL=jev-latest
```

`FF_TYPESAFE_API_KEY` wins if both are set. Do not commit the key. Add it to gitignored `.env` (see `.env.example`).

Without a key, hex scoring, challenges, chat applies, and lobby writes behave as they did before this work: Grok JSON where configured, keyword regex / length heuristics as local fallback.

Usage events from Jev are recorded as `source: "typesafe"` on the same `/api/co-invent` session when `--usage` is on.

In **developer mode**, the side-tab **AI inspect** shows the **full model request**, not only the `/api/co-invent` HTTP body. **Prompt** wrapping (system prompt, user instructions, TypeSafe questions, Imagine style lines) is gold and **collapsed by default**; the **context payload** JSON the app built from game state is cyan. Filter **Jev** lists TypeSafe overlays. Grok drafts stay under **Text**; Imagine stays under **Images**. Lobby `tag-lobby-rule` is Jev-only.

---

## Request path

All Jev calls happen in `handleCoInvent` (`server.mjs`) **after** Grok or the local partner returns (except `tag-lobby-rule`, which skips Grok).

| Incoming mode | Overlay | Entry |
| --- | --- | --- |
| `score-pathway` | Honesty Nouls + crisis/concern Choices, then `clampPathwayScore` | `applyHonestyToScorePathway` |
| `assess-feasibility` | Timing Nouls + Choice lamp | `applyTypeSafeFastJudge` |
| `judge-challenge` | Choice `pass \| partial \| fail` | same |
| `judge-scrutiny-move` | Choice `hit \| glance \| miss`; damage 2/1/0 in code | same |
| `judge-contribution` | Noul additive; clear shorten is destructive in code | same |
| `evaluate-convergence` | Noul demand-loop per neighbor | same |
| `chat`, `spark` | Intent Choice + tech Nouls + tutor `endTutoring` | `applyTypeSafeFunctionCall` |
| `suggest-stack` | Tech Nouls only (intent forced to add) | same |
| `tag-lobby-rule` | Kind Choice + effect Nouls; **no Grok, no AP** | same |

Grok one-sentence HUD copy is kept **only when its signed verdict still matches** the locked TypeSafe answer. Otherwise canned lines from the question files are used.

---

## What Jev decides

### Pathway score (`score-pathway`)

One `systemOne` call:

1. **Honesty Nouls** (`js/sim/honesty-questions.js`):
   - `mechanism` — fieldable capability, not only a statute
   - `purePolicy` — invent is only a law / ban / UBI bill / treaty
   - `shareBridge` — surplus, cash, paid skill, or meaning actually reaches people here (bare “UBI” is no)
   - `evalOverride` — a human can still take the last call
2. **Crisis Choices** (`js/sim/pathway-questions.js`): `local` / `global` / `support` over `ease2 \| ease1 \| none \| worsen` → deltas `-2…+1`
3. **Concern Choices**: `red \| yellow \| green` per posed critic

Then `applyPolicyHonesty` still clamps: a statute cannot ease meters; unpaired robots/AI/self-driving on **automation** cannot ease global; unpaired AI/computing on **rogue-si** cannot ease global. Lobby-tagged `share-required` / `eval-required` / `backlash` feed that clamp via `honestyNeeds`.

Unanswered critic + unchanged invent stays **red in code** (Jev cannot upgrade it).

### Uncertainty and Budget

Noul band **0.30–0.70 inclusive** is uncertain (`NOUL_UNCERTAIN_LOW` / `HIGH`). Uncertain is **not** treated as yes.

Choice confidence below **0.45** (`CHOICE_CONFIDENCE_FLOOR`) is uncertain. An uncertain *ease* is forced to delta `0`.

If a **used** honesty flag is uncertain, or any score Choice is uncertain, the payload sets `honestyUncertain` and/or `scoreUncertain`. The hex workshop **does not grant pathway-ease Budget** in that case. Wrong Budget is treated as the expensive error.

The client regex clamp in `js/hex/hex-workshop.js` reuses server `honestyFlags` so it cannot undo a paraphrase share/override that Jev accepted.

### Timing (`assess-feasibility`)

Nouls: explicit grounding forbid, sci-fi treated as routine, demonstrated-by-year. Choice lamp is only a tie-break when “demonstrated” is uncertain.

Code rules still win:

- no stack → red
- how-text shorter than 20 characters cannot be green
- red only on a *certain* forbid or sci-fi (uncertain forbid is not red)
- same claims at a later year cannot score harsher (`clampTimingForYearAdvance`)

### Challenge / scrutiny / contribution / convergence

| Mode | Typed answer | Extra code |
| --- | --- | --- |
| Scrutiny | `hit \| glance \| miss` | Uncertain hit → glance; damage 2/1/0 |
| Challenge | `pass \| partial \| fail` | Uncertain pass → partial |
| Contribution | additive Noul | After-text shorter than 55% of before is destructive even if the noul is mushy; uncertain otherwise keeps Grok/local |
| Convergence | demand-loop Noul per neighbor | Uncertain keeps Grok; certain no clears a heuristic “any two techs” loop |

### Chat stack applies

Grok still writes the chat bubble. Jev selects the **handler**:

- Intent: `none \| add_tech \| remove_tech \| rewrite_how \| rewrite_life \| end_tutoring`
- Noul per proposed catalog id (plus name-mentions over-found from the turn text)
- Tutor Noul: end the free tutor session

A question turn does not apply a leftover how-draft or sneak `addTechIds`. Only catalog ids Jev marks **yes** are applied. `endTutoring: true` from Grok is dropped unless Jev agrees.

### Lobby weather

Player still picks kind and types label/body. Before `commitLobby`, the client calls `tag-lobby-rule` (TypeSafe only).

- Kind Choice: `regulation \| law \| policy \| ban` (low confidence keeps the dropdown)
- Effect Nouls: `share-required`, `eval-required`, `backlash`

Only certain yes effects are stored on the rule. Flavor text stays effect-free. `writeLobbyRule` copies `effects` so a crew-cut rule can actually require a share on the next pathway score. Tagging spends **no AP** (`AI_FREE_MODES`).

---

## Question files (review here first)

When lamps, Budget, or lobby weather disagree with an invent, change the question text — not the hex sim.

| File | Rubric |
| --- | --- |
| `js/sim/honesty-questions.js` | Pathway honesty Nouls + noul band |
| `js/sim/pathway-questions.js` | Crisis/concern Choices, canned reasons, confidence floor |
| `js/sim/fast-judge-questions.js` | Timing, challenge, scrutiny, contribution, convergence |
| `js/sim/function-call-questions.js` | Chat intent, tech Nouls, lobby kind/effects |

Server SDK wrappers (do not import from the browser):

- `js/server/typesafe-client.mjs`
- `js/server/honesty-typesafe.mjs` + `honesty-score.mjs`
- `js/server/fast-judge-typesafe.mjs` + `fast-judge-score.mjs`
- `js/server/function-call-typesafe.mjs` + `function-call-score.mjs`

Composition that stays in ordinary code: `js/sim/policy-honesty.js`, `js/sim/policy-rules.js`, `js/sim/deploy.js` (`clampTimingForYearAdvance`).

---

## Eval scripts

Need `FF_TYPESAFE_API_KEY` or `TYPESAFE_API_KEY`. They do not write game state.

| Command | Fixture set |
| --- | --- |
| `npm run honesty:typesafe` | Statute vs share vs override paraphrases |
| `npm run pathway:typesafe` | Crisis deltas + unanswered Moloch stays red |
| `npm run judges:typesafe` | Timing, scrutiny, challenge, contribution, convergence |
| `npm run calls:typesafe` | Chat add-tech / question / tutor-end / lobby tags |

Treat cookbook bands (0.30–0.70 noul, ~0.45 choice) as starting points. Tune on these fixtures, not on demo notebook numbers.

---

## What Jev does not do

- Invent how-it-works, idea-spark titles, pose/draft/coach copy, or Imagine prompts
- Hex geometry, AP, insolvency, or pathway-ease **math** (it only gates whether a settled ease **pays**)
- Quest JSON schema / `md-lite` HTML safety
- **portal** Cloud APIs
- Live `--ai-search` rerank (Grok web/X search is still a Grok tool; Jev does not rerank those passages yet)

Thresholds and canned sentences are examples to evaluate in this domain. Typed output guarantees the interface, not truth.

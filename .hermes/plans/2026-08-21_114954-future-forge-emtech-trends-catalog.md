# Future Forge emTech capability-trend catalog — implementation plan

> **For Hermes:** Do not implement until the user explicitly approves this plan. HITL after each research batch. **No publish until every techId has a tile or an explicit skip.** User 2026-08-21: new orchestrator skill `future-forge-emtech-trends-refresh`; keep portable `future-forge-trends` generic.

**Goal:** Keep a live, plottable exponential-capability catalog at `https://warmersun.com/future-forge/trends/catalog.json` covering every Future Forge `techId`, fed by the OOM knowledge graph + primary series, authored as `future-forge.capability-trend/v1` JSON, so the learning-game Wait overlay can pull it — and encode that whole loop in one iteratively improved skill.

**Architecture:** Split **one-tile authoring** (keep existing portable `future-forge-trends`) from a **class-level orchestrator** (`future-forge-emtech-trends-refresh`) that: inventory → KG query/refresh → Trend-analysis Rule → JSON + validate → HITL table → stage `warmersun/future-forge/trends/` → git-safe whole-site publish → verify pull. One **primary plottable series per `techId`** (optional second only when pedagogically distinct, as gene-seq already is). Skip JSON when the series is not exponential or is too data-poor — never invent rates.

**Tech stack:** Grafeo MCP (`oom-kg`), `oom-research` Trend-analysis Rule, `future-forge-trends` schema, `npm run validate:trend`, warmersun `solar-epoch-2map` via `here.now` `publish.sh`, game `FF_TRENDS_REMOTE_URL` / `GET /api/trends`.

---

## Current context (verified 2026-08-21)

| Surface | State |
|---------|--------|
| Future Forge `TECHS` | **29** ids in `js/data.js` |
| Live catalog | `https://warmersun.com/future-forge/trends/catalog.json` → **404**. No `warmersun/future-forge/trends/` folder. |
| Game pull path | `js/trends-remote.mjs` → default `https://warmersun.com/future-forge/trends/catalog.json`. Unset env falls back to local warmersun path, then `test/fixtures/trends/catalog.json`. |
| Existing tiles | **7** fixtures/examples: gene-seq cost, pathogen turnaround, AI training FLOP, solar LCOE, Li-ion pack cost, warehouse robots, LEO broadband users. Covers **6** techIds (gene-sequencing has two). |
| KG | 498 nodes / 560 edges. **13/29** EmTech taxonomy nodes present. 29 Trend takes, 47 Milestones, 108 Capabilities (many UAP-incident mislabels). AI EmTech has **null** `last_refreshed_date`. |
| Skills today | `future-forge-trends` authors **one** JSON tile. It does **not** run KG refresh, cover all techs, or publish the catalog. |

### techId coverage

**Have a fixture:** `ai`, `solar`, `battery`, `robots`, `networks`, `gene-sequencing` (×2).

**Missing a plottable tile (23):** `computing`, `energy`, `crypto`, `quantum`, `geothermal`, `tidal`, `wind`, `wave`, `nuclear`, `transportation`, `self-driving`, `drones`, `quantum-internet`, `space`, `synbio`, `bci`, `genetic-engineering`, `alt-proteins`, `vr`, `print3d`, `iot`, `materials`, `nano`.

### KG EmTech present vs missing

**Present:** 3D Printing, Alternative Proteins, Artificial Intelligence, Battery Technology, Computing, Drones, Gene Sequencing, Genetic Engineering, Internet of Things, Networks, Robots, Synthetic Biology, Transportation.

**Missing taxonomy nodes (do not invent extra EmTechs; pre-load from schema only):** Energy, Crypto-Currency, Quantum Computing, Geothermal Power, Tidal Power, Solar Power, Wind Power, Wave Power, Nuclear Power, Self-Driving Cars, Quantum Internet, Space Exploration, Brain-Computer Interface, Virtual Reality, Material Science, Nano-Technology.

---

## Non-goals

- Do not author quests, tutorials, or Wait-overlay UI changes.
- Do not replace or bloat portable `future-forge-trends` with Warmer Sun publish / Grafeo specifics.
- Do not invent milestone values, compounding rates, or paper titles.
- Do not force a JSON tile when the honest classification is linear / logistic / data-poor.
- Do not partial-publish warmersun (never upload `.git`; whole `solar-epoch-2map` tree only).
- Do not cron the refresh until the skill has survived one full manual pass.
- No code edits in `learning-game` unless a later HITL finds the pull path itself is broken.

---

## Proposed skill (after approval)

**Name:** `future-forge-emtech-trends-refresh`

**Location:** `~/.hermes/skills/future-forge/future-forge-emtech-trends-refresh/` (peer of `future-forge-trends` / `future-forge-quest`). Mirror into `learning-game/skills/` only if we later want it in the game repo; default is user-local so we can iterate without a game commit.

**Trigger:** “Refresh Future Forge trends catalog”, “cover all emTechs with exponential capability tiles”, periodic catalog update, “deploy trends to warmersun.com/future-forge/trends”.

**Related skills (load, do not fork):** `oom-dynamic-knowledge-graph`, `oom-research` (Trend-analysis Rule + question-first), `future-forge-trends` (JSON contract), `oom-ai-podcast-signal` (AI techIds only, takes not facts), `warmersun-blog-publish` (git-safe whole-site publish).

### Skill body (executable, not a stub)

1. **Inventory** — read live `TECHS` from `js/data.js`; fetch live catalog (or note 404); query Grafeo EmTech/Capability/Trend/Milestone for each techId.
2. **Pick metric** — one primary capability per techId from the candidate table below; require a stable unit, multi-year series, multiplicative change, named mechanism. Record skip + reason when the Trend-analysis Rule fails.
3. **KG first** — hybrid GQL on Capability + Milestone + Trend; Fact Refresh Protocol on stale facts; pre-load missing taxonomy EmTech names **from the fixed list only**.
4. **Evidence** — primary series (NHGRI, IRENA, Epoch AI, Our World in Data, lab cost curves). X/podcast = leads. Contrarian pass (`[metric] overhyped/failed/s-curve`).
5. **Classify** — write the required Trend-analysis block (metric, period, compounding rate, mechanism, bottlenecks, next paradigm, reach).
6. **Emit** — `future-forge.capability-trend/v1` JSON via existing contract; `npm run validate:trend` until `OK:`.
7. **KG write** — Capability hub, Milestone + `HAS_MILESTONE` / `REACHES`, Trend take + `PREDICTS` / `LOOKS_AT`. Create-safety before every `create_node`.
8. **HITL table** — techId, metric, rate, reached vs predicted milestones, sources, skip/reason. Wait for yes before staging.
9. **Stage** — `/mnt/data/dev/warmersun/future-forge/trends/<id>.json` + `catalog.json` (`future-forge.capability-trend-catalog/v1`, `updated` = today).
10. **Publish** — rsync exclude `.git` → file count ≤1000 → `publish.sh --slug solar-epoch-2map`. Verify `catalog.json` 200 and one tile URL 200. Confirm `https://warmersun.com/future-forge/` still 200.
11. **Refresh loop** — re-run inventory; tiles older than 90 days or KG facts past type budget are in-scope. Log skips.

**References to add under the skill:**

- `references/tech-id-map.md` — FF `techId` ↔ KG EmTech name (exact taxonomy strings).
- `references/candidate-metrics.md` — one primary series per techId, skip rules, source families.
- `references/publish.md` — stage path, catalog schema, git-safe publish, verify curls.
- `references/hitl.md` — approval table template; never publish without it.

---

## Candidate primary series (proposal — HITL before research)

| techId | Primary metric (unit) | Likely compounding | Source family | Risk |
|--------|------------------------|--------------------|---------------|------|
| computing | GPU/$ or supercomputer FLOPS | doubling ~1–2 y | TOP500 / Epoch | Moore vs GPU split |
| energy | (skip umbrella — use child tiles) | — | — | Prefer solar/wind/battery/nuclear |
| crypto | (skip or hashrate — weak pedagogy) | — | — | Not a learner-honest “capability” by default |
| quantum | Physical qubits on one device **or** skip | stepwise | IBM/Google papers | Often not exponential |
| geothermal | Installed GW or LCOE | maybe logistic | IRENA | May skip |
| tidal | skip unless a clean GW series | — | — | Data-poor |
| solar | Utility LCOE USD/MWh | ~5 y halving | IRENA | **have fixture** |
| wind | LCOE USD/MWh | multi-year decline | IRENA | |
| wave | skip unless series exists | — | — | Data-poor |
| nuclear | skip if not multiplicative | — | — | Usually stepwise/cost-up |
| battery | Pack USD/kWh | ~Wright / ~halving | BNEF / Our World in Data | **have fixture** |
| ai | Frontier training FLOP | ~3–4×/y CAGR | Epoch AI | **have fixture**; podcast takes only |
| robots | Warehouse robots deployed | doubling-class | IFR / vendor | **have fixture** |
| networks | LEO broadband users | CAGR | operator reports | **have fixture** |
| transportation | EV share of new sales % | logistic later | IEA | May be logistic — classify honestly |
| self-driving | Unsupervised / paid miles | stepwise + exp. tail | Waymo etc. | Fragile metric |
| drones | Consumer $/airframe or BVLOS ops | deflation | Teal/FAA | |
| quantum-internet | skip until a stable km/QKD series | — | — | Early |
| space | Launch USD/kg to LEO | Wright | CSIS / FAA | |
| synbio | DNA synthesis USD/bp | halving-class | DARPA/industry | |
| bci | Electrode count or bandwidth | stepwise | Neuralink/Synchron papers | May skip |
| genetic-engineering | Clinical CRISPR programs **or** skip | — | ClinicalTrials | Weak unit |
| gene-sequencing | USD/genome | ~18 mo halving | NHGRI | **have fixture** |
| alt-proteins | Cultivated meat USD/kg | decline | Good Food Institute | Sparse |
| vr | Headset pixels/degree or shipped units | — | IDC | Pick one |
| print3d | Industrial AM system cost or parts | — | Wohlers | |
| iot | Connected devices | CAGR | IoT Analytics | Saturation risk |
| materials | skip unless one hard metric | — | — | Easy to fake |
| nano | skip unless one hard metric | — | — | Easy to fake |

`energy` and `crypto` default to **no tile** unless HITL picks a metric. Coverage “all emTechs” then means: a tile **or** an explicit skip with Trend-analysis classification in the research ledger.

---

## Phased execution (after plan approval)

### Phase 0 — Skill v0 (no catalog yet)

**Objective:** Capture the workflow so later batches are mechanical.

**Files:**
- Create: `/home/sic/.hermes/skills/future-forge/future-forge-emtech-trends-refresh/SKILL.md`
- Create: `…/references/tech-id-map.md`
- Create: `…/references/candidate-metrics.md`
- Create: `…/references/publish.md`
- Create: `…/references/hitl.md`

**Steps:** Author per `hermes-agent-skill-authoring` (frontmatter, When to Use, numbered steps, pitfalls, verification). Do not invent new EmTech names. Do not cron.

**Verify:** `skill_view` in a **new** session; description starts with “Use when …”; body is executable.

**HITL:** Show SKILL.md path; wait for “skill is good enough to run” before Phase 1–2 research.

### Phase 1 — Source-check the existing 7 (no publish)

**Objective:** Treat fixtures as draft tiles. Spot-check sources. Do **not** stage or publish until Phase 2 is complete for all 29 techIds.

**Files:** read-only `learning-game/test/fixtures/trends/*`. If a fixture is wrong, HITL before rewriting.

**Steps:**
1. Re-read each fixture; confirm source URLs 200 and values not obviously stale.
2. If a fixture is wrong, **stop and HITL** — do not silently “fix” numbers.
3. Carry the 7 into the coverage matrix as “draft tile, pending same HITL table as new tiles.”

### Phase 2 — Remaining techIds in four HITL batches

Batch by Future Forge pairs (starter tray first):

| Batch | techIds | Notes |
|-------|---------|--------|
| 2a Starter / bits-atoms | `wind`, `iot`, `drones`, `print3d`, `materials` | Unblocks Spark tray besides already-tiled solar/battery/ai/networks/robots/gene-seq |
| 2b Power remainder | `computing`, `energy` (skip-or-metric), `crypto` (skip-or-metric), `nuclear`, `geothermal`, `tidal`, `wave`, `quantum` | Many likely skips |
| 2c Mover + space | `transportation`, `self-driving`, `space`, `quantum-internet` | |
| 2d LifeForce + link + nano | `synbio`, `genetic-engineering`, `alt-proteins`, `bci`, `vr`, `nano` | |

**Per tech (this is one “task”):**

1. Query Grafeo for EmTech + Capabilities + Trends.
2. Web/X primary series; AI techIds also `oom-ai-podcast-signal` (takes only).
3. Write Trend-analysis block into research package (below).
4. If exponential: author JSON → validate → KG nodes → add to HITL table.
5. If not: ledger skip, no JSON.

**Research package (oom-research, not chat-only):**

```
/mnt/data/dev/learning-game/output/future-forge-emtech-capability-trends/
  index.md              # YAML kg_nodes only here
  question-ledger.md
  references.md
  01-inventory.md
  02-power.md
  03-automator.md
  04-mover.md
  05-lifeforce.md
  06-link-portal.md
  07-skips-and-contrarian.md
```

Ledger-first: high-density question ledger **before** section files. Target ~8–15 primaries (one per family + method + deploy + honesty of exponential claims), 6–8 secondaries each.

`index.md` kg_nodes: only names confirmed via Grafeo `MATCH` by `name`.

### Phase 3 — Skill patch from the first full pass

Patch pitfalls that actually fired (bad metrics, publish ARG_MAX, fixture drift, UAP-capability pollution in KG queries). Still no cron unless asked.

---

## Question ledger seed (promote to `question-ledger.md` in Phase 2)

Primary questions (v1 — expand to 6–8 secondaries each when research starts):

1. Which Future Forge techIds have a **measured, stable, multiplicative** capability series, and which must be classified non-exponential or data-poor?
2. What compounding rate (doubling / halving / CAGR) is justified by the last decade of evidence vs the long-term average?
3. Which milestones are **reached** (primary-sourced) vs **predicted** (model extrapolation), and how does the Wait chart avoid teaching invented futures as facts?
4. How should KG Capability hubs map to exactly one plottable `unit` so we do not fork duplicate capabilities?
5. What is the live contract between `catalog.json` and `js/trends-remote.mjs`, and what breaks if a tile is invalid JSON or `value ≤ 0`?
6. Where is the KG too thin or polluted (UAP-as-Capability, missing taxonomy EmTechs, stale `last_refreshed_date`) for a catalog pass?
7. What contrarian evidence would falsify each exponential claim (S-curve, Wright vs Moore, hype series)?
8. How do we refresh without silently overwriting Trend takes or old PTC history?
9. Should `energy` / `crypto` / `materials` / `nano` have tiles, or only children / skips?
10. What cadence keeps the catalog honest without a weekly research boil-the-ocean?

---

## Publish recipe (do not run until Phase 1 HITL)

```bash
# 1) Stage tiles already in /mnt/data/dev/warmersun/future-forge/trends/
# 2) Hub must keep existing /future-forge/index.html

rsync -a --delete --exclude='.git' --exclude='.DS_Store' \
  /mnt/data/dev/warmersun/ /tmp/warmersun-publish/
find /tmp/warmersun-publish -type f | wc -l   # must be ≤1000

bash /home/sic/.hermes/skills/productivity/here-now/scripts/publish.sh \
  /tmp/warmersun-publish \
  --slug solar-epoch-2map --client hermes \
  --title "Warmer Sun" \
  --description "Warmer Sun — Future Forge, inventing practice, and essays"
# timeout ~300s
```

**Verify:**

```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://warmersun.com/future-forge/trends/catalog.json
curl -sS -o /dev/null -w "%{http_code}\n" https://warmersun.com/future-forge/trends/gene-seq-cost-per-genome.json
curl -sS -o /dev/null -w "%{http_code}\n" https://warmersun.com/future-forge/
curl -sS https://warmersun.com/future-forge/trends/catalog.json | jq '.schema,.updated,.trends|length'
```

---

## Risks

- **Invented pedagogy:** forcing 29 exponentials teaches the wrong lesson. Mitigation: skip table is a first-class output.
- **KG pollution:** UAP incident nodes labeled `Capability` will poison hybrid search. Mitigation: query `(:EmTech)-[:ENABLES]->(:Capability)` not `MATCH (c:Capability)` alone.
- **Fixture rot:** shipping the 7 without a source spot-check. Mitigation: Phase 1 HITL.
- **Partial publish:** wiping Future Forge HTML. Mitigation: whole-tree rsync, verify `/future-forge/` 200.
- **Scope explosion:** full oom-research for 29 techs before any live catalog (user-chosen). Mitigation: four HITL batches; skip table is a first-class output; one publish at the end.
- **Game stays on fixtures** until that publish. Local `test/fixtures/trends/catalog.json` remains the offline fallback.

---

## Locked decisions (2026-08-21)

1. **Publish gate:** wait until every techId has a tile **or** an explicit skip. One catalog ship after the coverage matrix is complete.
2. **Skill:** new orchestrator `future-forge-emtech-trends-refresh`. Do not fold KG/publish into portable `future-forge-trends`.

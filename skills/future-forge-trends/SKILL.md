---
name: future-forge-trends
license: MIT
description: >
  Research an emerging technology capability, its dated milestones (and optional
  log-scale quantitative trend curve), and the concrete use cases those
  milestones unlock, then author a Future Forge capability file
  (future-forge.capability-trend/v2). Portable multi-harness skill — not tied
  to a single agent product.
---

# Future Forge capability & trend author (`v2`)

**License: MIT** (this skill package only).

Future Forge models progress as a causal chain:

`emTech → Capability → Milestones (the Trend / Progress) → Use Cases → Pathway`

You write **one JSON file per Capability** conforming to `future-forge.capability-trend/v2`. When an honest, primary-sourced multi-year quantitative series exists, include its compounding curve so the player can toggle the **log-Y chart**. When progress is real but stepwise or qualitative, omit the curve fields cleanly (`hasCurve: false`) and let the milestones, `trendSummary`, and unlocked `useCases` teach the trajectory on Lane 1–2 of the 4-Lane Board.

## Deliverable

One JSON file conforming to `future-forge.capability-trend/v2`:

- Target path in catalog: `~/dev/warmersun/future-forge/trends/<id>.json` (or `output/trends/<id>.json` during drafting)
- Filename stem **must** equal `id`
- Validate: `npm run validate:trend -- <file>`

| Doc | Purpose |
|-----|---------|
| **`references/schema.md`** | Full `v2` field reference + all-or-nothing curve rule |
| **`references/output-contract.md`** | Skeletons (with curve & milestone-only) + omit rules |
| **`references/research.md`** | Evidence rules (no invented stats) + Honest copy |

## Hard rules

1. **`techId`** = one valid Future Forge tech id (`js/data.js` `TECHS`).
2. **One Capability per file.** Break each emTech into distinct operational capabilities (price, speed, capacity, range, scale, quality) instead of one generic summary.
3. **`trendSummary`** (≤180 chars) is required: one crisp plain-language sentence describing the trajectory.
4. **Unlocked `useCases`**: every file must include at least one valid `{ title, blurb, world? }` on key threshold milestone(s) (and/or top-level fallback `useCases[]`). Attach `useCases` to the specific threshold milestones that unlock them rather than repeating identical uses on every dot.
5. **All-or-nothing quantitative curve**: either include **all** of `unit`, `compounding`, `anchor` (`value > 0`), and `value > 0` on every milestone (`hasCurve: true`), or omit **all** of them (`hasCurve: false`). Never mix partial curve fields or invent numbers just to draw a chart.
6. Milestones use **`status`**: `"reached"` | `"predicted"`. Never claim a prediction as `"reached"`.
7. **`sources`**: `https://` only; no fake paper titles or DOI links.
8. **Omit** unused optional keys.
9. Validate until `OK:`.
10. **Honest player copy** — `name`, `capability`, `trendSummary`, `summary` (≤900 chars), `unit`, and `useCases` must use normal full sentences and introduce technical terms before using acronyms.

## Procedure

### 1. Intake & Capability Breakdown

- Identify the `techId` and the specific operational capability (`axis`: `price` | `speed` | `capacity` | `range` | `scale` | `quality`).

### 2. Research Milestones & Unlocked Use Cases

- Collect dated **`reached`** milestones from primary or reputable secondary sources (IRENA, Epoch AI, NHGRI, IFR, peer-reviewed papers, FDA/agency logs) and clearly labeled **`predicted`** milestones where documented.
- Decide whether a single stable, strictly positive unit captures the trajectory across years:
  - **Yes (`hasCurve: true`):** pick an `anchor` `{ date, value }`, collect milestone `value`s in the **same unit**, and fit `doubling`, `halving`, or `cagr`.
  - **No (`hasCurve: false`):** keep the milestone-only timeline (`label`, `date`, `status`, optional `detail`/`attribution`, and `useCases`).
- For each threshold milestone, define concrete, general **`useCases`** (`title`, `blurb`, optional `world`: `"bits"|"atoms"|"split"`) that become practical once that milestone is reached.

### 3. Write Player Copy

**You do not have to be brief in `summary` (up to 900 chars).** Use normal sentences (subject, verb, object). Introduce any term or acronym (`QKD`, `LCOE`, `FLOP`, `CAGR`, etc.) in plain words before using it. Keep `name`, `trendSummary`, `capability`, `unit`, and `useCases` crisp and jargon-free.

Full before/after: **`references/research.md`** → Honest copy.

### 4. Emit JSON + Validate

```bash
npm run validate:trend -- path/to/<id>.json
```

### 5. Hand off

- Copy validated `<id>.json` files into `~/dev/warmersun/future-forge/trends/`, then run `(cd ~/dev/warmersun && ./scripts/publish-trends.sh)` (rebuilds `catalog.json` + `bundle.json` and publishes `https://warmersun.com/trends/`), **or**
- Embed on a Quest via `trends` / `spotlightTrends` (see `future-forge-quest` skill).

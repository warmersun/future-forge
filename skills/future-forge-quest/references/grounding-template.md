# Grounding template (AI capability source of truth)

Optional free-text **`grounding`** (Markdown) is the Quest’s **capability truth** for co-inventor, tutor, claim-timing, and challenge. It is **guidance, not a schema** — omit thin sections rather than pad; validators only require a string when present.

Player-facing invent invitation stays in `mission.scene` / `briefMd`. Grounding is for **AI consistency**, not a second brief.

---

## The chain (canonical)

Write grounding so meaning follows this causal chain. Headings may merge thin steps, but do not skip the grain.

```
emTech
  enables → product category
              has → capabilities
                      advance over time → trends
                      trends extrapolated → predictions
                      capabilities reach → milestones
                                            unlock → use cases
                                                      give → applications
                                                             (application categories)
```

| Step | Meaning | Authoring note |
|------|---------|----------------|
| **emTech** | Broad emerging-tech family (Future Forge tray id) | Usually too broad alone for invent |
| **Product category** | What the emTech *enables* as a product shape | **Focus unit** for the rest of grounding |
| **Capabilities** | What that product category can do now | Operational, honest |
| **Trends** | How those capabilities are advancing | Cost, quality, access, regulation, adoption |
| **Predictions** | Extrapolations of trends | Label as forecasts, not locks |
| **Milestones** | Thresholds capabilities reach (done or expected) | What just (or will) become real |
| **Use cases** | Scenarios the milestone *unlocks* for this category | Not the whole emTech surface |
| **Applications** | Application categories those use cases make inventable | Seeds for the learner’s local invent |

**Invent loop:** grounding ends at truth that makes applications inventable. The learner (with co-inventor/tutor) builds a concrete **application** of those use cases in the fictive place/year.

**emTech alone is too broad.** Unlocks and applications sit under the **product category**, not “everything AI / biotech can do.”

---

## Recommended Markdown

```markdown
## Technology
- **emTech:** Future Forge tech id / family (tray context).
- **Product category:** what that emTech enables (focus unit — usually required).

## Capabilities
What this product category can do now (operational mechanisms, not marketing).

## Trends & predictions
How those capabilities are advancing, and short extrapolations.
Label forecasts as forecasts (not locks). Near vs stretch is fine.
No fake paper titles.

## Milestone
Capability threshold reached *or expected* for this product category
around the quest year — the step that makes new use cases real.
Sponsored: may name the product *instance* that hit it.

## Unlocks Use Case(s)
Use cases this milestone unlocks **for this product category**.

## Applications
Application categories those use cases make inventable — seeds for
local invent (not a single prescribed solution).
May be folded into Unlocks if short; keep the *apply* idea explicit.

## Honest limits
Pilot scope, dual-use, cost, skills, power, provenance for this category.
```

### Optional merges

| Merge | When |
|-------|------|
| Trends + Predictions → `## Trends & predictions` | Default for short groundings |
| Unlocks + Applications → one section with both lists | When applications are obvious from use cases |

---

## Grain examples

| emTech (tray) | Product category (enabled by) | Milestone unlocks use case → application category |
|---------------|-------------------------------|-----------------------------------------------------|
| `ai` | Identity-locked multi-scene generative video | Identity+voice refs → multi-scene civic explainers → local counter-context desk workflow |
| `ai` | Open-weight long-context coding agents | Downloadable near-frontier weights → sealed-lab multi-day tutoring → institutional on-prem tutor stack |
| `gene-sequencing` | Portable / clinic-rugged pathogen sequencers | Same-shift field reads → local triage without capital truck → clinic sample-to-isolation protocol |

---

## Sponsored quests

1. Same chain: emTech → product category → …  
2. Under **Milestone**, the sponsor product may appear as the **instance** that crossed the threshold.  
3. **Unlocks / Applications** stay **category-level** invent invites (capability class), not “use Brand X.”  
4. `sponsorName` / `sponsorBanner` are display attribution only — not the capability SoT.  
5. Scene/brief never require naming the brand; **naming a product is not a valid solution**.

---

## Short example

```markdown
## Technology
- **emTech:** gene-sequencing
- **Product category:** Portable / clinic-rugged same-shift pathogen sequencers

## Capabilities
Provisional pathogen reads on rugged desktop or field units when workflow,
power, reagents, and trained staff exist — not capital-lab monopoly only.

## Trends & predictions
Time-to-read and ruggedness improve; reagent kits get cheaper; software
turns raw reads into provisional signals for non-specialist posts.
**Forecast (not lock):** same-shift reads become routine at more border
and rural clinics through the late 2020s where power and training hold.

## Milestone
Cheaper, more field-rugged sequencers and software (~2024–2026) make
on-site clinic reads realistic for small posts.

## Unlocks Use Case(s)
Local sample-to-read workflows; triage and isolation decisions without
waiting on a distant lab truck.

## Applications
Clinic sample-to-isolation protocols; shift-handoff pathogen boards;
trust-preserving result counseling workflows — invent the local system.

## Honest limits
Power and cold chain after dusk; no full bioinformatics team; public
trust fragile — pilot language only for 2026.
```

---

## Anti-patterns

- Jumping from bare emTech to unlocks (“AI unlocks education”)
- Unlocks for the whole tray card, not the product category
- Trends not tied to **capabilities advancing**
- Predictions stated as certainties or fake citations
- Milestone as a marketing date with no unlocked use cases
- Applications prescribed as the one correct invention (or “buy our product”)
- Pasting grounding into `briefMd` / `scene` wholesale
- Empty optional sections left as placeholders — **omit** instead

---

## Authoring vs play

| Artifact | Job |
|----------|-----|
| `grounding` | Capability truth along the chain (AI SoT) |
| `research` | Citable notes (usually hidden) |
| `briefMd` / `scene` | Lived place + invent invitation to **apply** |
| Learner invent | Concrete **application** in place/year |
| `aiTutorContext` | Pedagogy sequence (hidden); may map unlocks → local application |
| Sponsor fields | Attribution only |

See also: `schema.md`, `learning-and-sponsor.md`, `output-contract.md`.

# Quest prose style (design-challenge stories)

**Source of truth for Future Forge player-facing quest writing.**
Same craft as in-app scenario seeds (`js/scene-prose.js`): nonfiction short stories that pose a **design challenge**. Easy first read — **not** shorter text for its own sake.

Player text has three jobs, in this order:

1. **Instance** — a brief little story (named people, concrete fictive place)
2. **Bigger problem** — what that scene is a case of, plus **root cause**
3. **Outcome job** — what must get better; open invent; no product

Capability truth, product names, and “invent with this tech” hints live in **`grounding`** and **tutor mode** only.

Use this for:

| Field | How to apply |
|-------|----------------|
| `mission.scene` | Full spine in plain text. Schema max **500 characters**. Short breaths, punch-lines, open challenge. |
| `mission.briefMd` → **The place** | Longer lived story (same spine/voice/rhythm). **2–4 short paragraphs** (blank line between) — the invent screen shows each as a walkthrough card. |
| `mission.briefMd` → **The bigger problem** | Zoom-out + root cause. Everyday words. Not a capability lecture. |
| `mission.briefMd` → **Your job** | Outcome only (see `brief-template.md`). |
| `summary` | The instance in 2–3 spoken sentences (names and place **allowed**). |
| `title` | Human situation and/or fictive place. |
| `spotlight.encourageCopy` | Outcome in everyday words — never the tray tech. |

---

## Purpose

Each piece is a **flight simulator for a design decision**. The reader should finish able to:

1. Retell one concrete scene
2. Name the bigger problem and why it keeps happening
3. Feel the open design problem — not leave with a product riddle or a solution brief

**Core test:** *If the reader remembers only one thing, what decision becomes sharper?*

**Plain-language test:** *Could a 14-year-old retell who is in trouble, what went wrong in that place, and what the bigger problem is — without naming a product or an emTech?*

---

## Story spine (mandatory order for scene / The place)

1. **Hook** — specific person, place, moment, action. No thesis opener. No definition opener. No “In today’s world…”. No “Imagine…”.
2. **Complication** — the world pushes back (constraint, failure, tradeoff, surprise) inside the scene.
3. **Mechanism in motion** — the local system/driver that keeps the theme problem going is revealed **through what people do**, not a lecture.
4. **Stakes** — human-scale consequence (one person, team, or decision — not “society”).
5. **Challenge land** — close on the **open** design tension. Do **not** solve it. Do **not** list takeaways. Do **not** name the spotlight tech.

### Content that must appear (as story, not labels)

- **(1) Lived local harm** people feel now
- **(2) Local driver/system** that keeps producing the theme problem — not only how people shelter from symptoms

Pick **one** plot type per scene: **Challenge** (obstacle vs grit/constraint), **Connection** (trust / who is left out), or **Creativity** (a novel move that redefines the problem). Do not blend all three.

Then **The bigger problem** zooms out: this scene is one instance of [global issue]. Root cause: the system that keeps producing it.

---

## Voice

- Confident and declarative. Plain but not flat. Warm but unsentimental.
- **Third person** by default.
- No meta, no workshop jargon, no “this case shows,” “as designers we must,” “the lesson here is.”
- **Everyday words in player text.** If a lab or research term would fail a high-school first read, use the everyday phrase in scene / brief / title / summary. Put the lab term in **`grounding`** or **`aiTutorContext`**. Prefer not to resume the scene with the jargon after a one-line definition — that still hides the job.

---

## Rhythm (this fixes hard-to-read dense stacks)

- Vary sentence length. After a complex beat, land a **short punch-line** sentence — often its own breath.
- Use punch-line sentences **2–4 times** per scene (more dilutes them).
- Default beat: **Explain → Concretize → Land.**
- Prefer **one idea per sentence breath**. Do not stack three clauses with *while / because / so / which* into one megasentence.
- Avoid semicolon chains and em-dash lists of abstractions.
- **Do not shorten for its own sake** — keep texture and stakes; make the path through the story easy.

---

## Opening & closing tests

| | Fails | Passes |
|---|--------|--------|
| **Open** | Thesis, trend, definition, “Imagine…”, abstract problem statement, theme-word lede (*Infectious diseases. This is about how far…*) | Specific person does a specific thing in a specific moment; tension already seeded |
| **Close** | Lessons, principles, solution checklist, “they fixed it”, product name, “invent with [tech]” | Short final beat leaves the design challenge sharp, open, hard to unsee |

---

## Cut

- Repeated restatements of the same insight
- Empty intensifiers (`very`, `incredibly`, `really`)
- Throat-clearing (`It is worth noting`, `Interestingly`, `In today’s landscape`)
- Sentences that tell the reader how to feel
- Policy-brief packing / framework dumps
- Solution theater
- Research or tutor curriculum dumped into player prose
- **Product riddle:** “Company X launched Y… invent Y, or invent *with* Y, just don’t say Y”
- **Capability lecture** in the brief (*What just became possible*, “sequencers got cheaper”, “do not invent sequencing from scratch”)
- Theme-word ledes (*Totalitarianism. This is about how far on-device AI has to go…*)

---

## Spotlight / learning extra

Catalog theme seeds can stay in lived-harm story voice. **Spotlight and learning tiles** must make the **human problem** unmistakable and keep the **tech offstage**:

1. **`summary` + `title` + The place** carry the instance (people, place, moment).
2. **The bigger problem** carries root cause. **Your job** / `encourageCopy` state the outcome in everyday words.
3. A **metaphor-only** closer is not enough — the reader must know what must get better.
4. Capability lectures, product-category chains, lesson SEQUENCE, brand names, and “invent with [spotlight tech]” belong in **`grounding`** / **`aiTutorContext`** — never as the bulk of `briefMd`, never in `summary` / `scene` / `encourageCopy`.
5. Ban insider shorthand in player fields: “local cut,” unexplained “open-weight,” “MoE,” “genome-scale opposite-handed DNA,” “filtered backbone,” etc.

The tray already suggests the tech (`mission.suggested`). Naming it in player prose turns the quest into a riddle whose answer is the product.

---

## Bad vs good

### Dense stack (never write like this)

**BAD:**

> In the chawl maternity room, mothers share cots under a tin roof that holds the day’s heat long after dark while the grid dies and fans stop and the sterilizer goes cold, so a new mother spikes a fever with no clean way to cool her because a wiring plan built for lights and phones—landlords still meter power by the room—never reaches the birth floor.

**GOOD (same facts, story craft):**

> Night holds the day’s heat under the tin roof. Mothers share cots on the birth floor. When the grid dies, fans stop. The sterilizer goes cold. A new mother spikes a fever, and there is no clean way to cool her or keep instruments safe. Landlords still meter power by the room. The wiring was built for lights and phones, not for round-the-clock birth care. Backup never reaches this floor.

### Product riddle (never ship like this)

**BAD (research voice + hidden product):**

- Title: *Same-shift fever answers at Crossing Clinic 7*
- Summary: *Infectious diseases. This is about how far gene sequencing has to go so clinics can do it quick and cheap on site.*
- Encourage: *Build your invention around gene sequencing — the new on-site capability is the point of this Quest.*
- Job: *Invent a workflow that uses gene sequencing honestly here. Do not invent sequencing from scratch.*

**GOOD (same fictive place; instance → RCA → outcome):**

- Title: *The fever sheet at Crossing Clinic 7*
- Summary: *Nurse Amina seals another swab at Crossing Clinic 7. The fever sheet on the fridge does not match. The lab truck left at dawn — answers take days, and by then the bench is empty or the ward is full.*
- Scene: Amina, the cooler, the truck, the rumors. Who can tell her what the fever is before the next queue arrives?
- Bigger problem: Outbreaks stay invisible because truth lives in a capital lab. The calendar is a truck, not a shift. Rumors move first.
- Job / encourage: *Invent a way this clinic can know what the fever is before the next queue arrives.*
- Gene sequencing, kits, and rugged machines live in `grounding` / tutor notes. `mission.suggested` is `["gene-sequencing"]`.

### Place titles are good

**GOOD:** *The unposted rule at Tideglass High* — names the situation and the place.

**WEAKER:** *School lab rule before the science fair* — job English with no one in the room.

Lab terms (*chirality*, *opposite-handed*, *ribosome*) still live in `grounding` / tutor notes, not as the only way to understand the story.

---

## `mission.scene` under the 500-character cap

Keep the full spine. Prefer **several short sentences** over one long lede. End on the open design tension (a sharp question or unfinished beat is fine). Still use everyday words. Do not name the spotlight tech.

**Shape to aim for (illustrative length, invent your own place):**

> Meena wipes her sister’s forehead with a cloth that is already warm. Night holds the day’s heat under the tin roof. When the grid dies, fans stop. The sterilizer goes cold. Landlords still meter power by the room. Backup never reaches this floor. Who keeps a newborn safe through a night that will not cool?

---

## Quality bar (ship only when true)

- [ ] One-sentence Commander’s Intent is clear (decision becomes sharper)
- [ ] **Title + summary** pass the 14-year-old test: who, where, what went wrong — no product required
- [ ] Opens on a concrete scene (named person or clear role + action)
- [ ] Harm + local driver both visible as story
- [ ] **The bigger problem** names the global issue and its root cause
- [ ] Mechanism shown through action, not lecture
- [ ] One plot type carries the piece
- [ ] Punch-line sentences used 2–4 times (scene or place section)
- [ ] **The place** is 2–4 short paragraphs (one idea each) so the derived walkthrough is readable
- [ ] Ends on open design challenge — not a solution, not a product
- [ ] Player text never says “invent with [tech]” / “do not invent X” / a sponsor product
- [ ] Dense stacked clauses avoided; easy on first read
- [ ] `mission.scene` ≤ 500 characters

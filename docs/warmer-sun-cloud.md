# Warmer Sun Cloud — what we can build now

**Status:** **done / ready / todo** below. Cloud APIs are live on Render; the playable SPA is **game**.  
**Clerk application:** `Warmer Sun Cloud`  
**Today:** optional Sign in on Future Forge (`feat/clerk-auth`). Neon Postgres is provisioned (migrations `001`–`011`, no Daily scores table). Unsigned progress is **this browser’s localStorage**. Signed-in Cloud play **imports** the local solved set and last run into Neon ([A2](#A2)); after that, cloud is source of truth for solved ids (localStorage is a cache). Quest log: [C1](#C1). Continue: [C3](#C3).

**game** vs **portal** (same git repo, two Node processes):

| Name | Command | What |
|------|---------|------|
| **game** | `npm start` → `server.mjs` | Future Forge engine as it was before this branch. Self-host, Invent Night, unsigned play. No Clerk, no Neon. |
| **portal** | `npm run portal` → `portal/server.mjs` | Warmer Sun Cloud **HTTP APIs** (Clerk, Neon, quest boards, webhooks). No game UI. **Render**. |

Do not run both on port 8765. Render runs **only portal**.

Letter IDs that are **done** are in the repo. **Ready** means the next work is code, not a vendor search. That bucket is empty: every feature we could write on Clerk + Neon + Render is **done**. **Todo** waits on **another building block** (a vendor or ops pick). Until we provision one, nothing moves to Ready.

---

## Stance

**The product is for people.** Someone curious about emerging tech, a friend at Invent Night, a teenager who wants a practice, an adult who wants a daily invent. Direct to consumer. Warmer Sun Cloud is the **hosted account + catalog APIs** (portal); the playable SPA is **game**. Not a school platform.

**The engine stays free.** Self-host, unsigned play, friends in a room, hex invent — that remains the CC / hobby path. Cloud is what you **cannot keep in one browser**: a name that follows you, a history, a paid catalog, a public scoreboard, AI that we pay for.

**Do not build for classrooms.** No LMS, no roster, no assignments, no gradebook, no teacher dashboard, no “section 3B due Friday,” no Canvas/Google Classroom. If a school wants Future Forge, that is a **commercial license** (see `COMMERCIAL.md`), not a product surface we design around.

Orgs that pay are **companies, clubs that commercialize, consultancies, other hosts** — not an education SaaS detour.

---

## What is already true

| Piece | Today |
|--------|--------|
| Identity | Clerk (`user_…`). Optional. Sign in chip on **game**; Clerk UI on **`https://cloud.warmersun.com/signin`**. |
| Play | Works unsigned. Self-host needs no Clerk. |
| Progress | `localStorage` always (cache). Signed-in + portal `DATABASE_URL`: `solved_quests` + `runs` in Neon after [A2](#A2) import / later holds. Quest log: [C1](#C1). Continue board: [C3](#C3). |
| Daily | A **Learning** module (`isLearningModule`), not a UTC rotation. Play it from the Learning hub. Ranked on that tile’s [D1](#D1) board. |
| Lessons | Quest tiles with `isLearningModule`. Tutor UI gated by [A1](#A1). No paywall ([B1](#B1) todo). Cloud progress via [C1](#C1) / [C3](#C3). |
| Friends | Rooms + WebSocket on **game**. Signed-in players send Clerk names ([E4](#E4)). Unsigned stays per-room names. |
| Money | None in software. `COMMERCIAL.md` is a **license** conversation (self-host / education / commercial / cloud operator). Clerk Billing is unused. |
| Database | **Neon Postgres** (`DATABASE_URL` in gitignored `.env.portal`, pooler host, `us-west-2`). Cloud tables from `js/server/db/*.sql`. Usage JSONL is still only operator cost logs. |

**Implementation default for almost everything below**

1. Keep Clerk as the user store (email, Google, profile, later Billing).  
2. Cloud rows live in **Neon**, keyed by `clerk_user_id`. No ORM: `pg`/`postgres` + `.sql` migrations.  
3. Browser sends `Authorization: Bearer <session JWT>` (already wired).  
4. Server verifies with `@clerk/backend`, then reads/writes **our** tables — never trust the client’s `userId`.  
5. Unsigned play stays on localStorage. Signed-in Cloud play **mirrors** (and eventually owns) that state.

Clerk user `publicMetadata` / `unsafeMetadata` is **not** a save game. Boards and run history will not fit. Metadata is for flags: `plan`, `display_name`, `founding`.

---

## Status: done / ready / todo

Three buckets. **Done** is in the repo or provisioned. **Ready** means a building block exists so the next work is code, not a vendor search. **Todo** still needs a building block (or is later product). Empty Ready + leftover Todo = pick the next block, then features become Ready.

### Done

| Item | Where |
|------|--------|
| Optional Sign in / Sign out | `js/auth.js` device handshake; Clerk UI on portal `GET /signin` |
| [**A1**](#A1) catalog/tutor account door | `js/server/cloud-gate.mjs` — strip `aiTutorContext` unsigned; tutor `401`; Learning lock |
| **App host** = **portal** | Render Web Service, `npm run portal`. Live: `https://future-forge-0yil.onrender.com`. [H](#H). |
| `GET /api/health` `clerk` + `db` blocks, `GET /api/me`, JWT on expensive POSTs | `portal/server.mjs`, `js/server/clerk-auth.mjs` |
| [**A2**](#A2) save-at-pride / first sign-in import | `POST /api/me/import`, `POST /api/me/runs`; outcome Sign in CTA; union merge ([C4](#C4)) |
| [**C4**](#C4) Merge localStorage on first sign-in | same as [A2](#A2) — union of solved ids; cloud wins last run |
| SQL migrations `users` / `solved_quests` / `runs` / `run_state` / `quest_scores` | `js/server/db/*.sql` (no `daily_scores`), `pg` Pool |
| [**C1**](#C1) Quest log | `GET /api/me/runs`, `POST /api/me/runs/start`; signed-in Quest log screen |
| [**D1**](#D1) Per-quest leaderboard | `quest_scores` + `GET /api/board/:questId` (quest, catalog card). Title **Leaderboard** is `GET /api/board` top 10 inventors (sum of quest scores). Stills: top 3 BYTEA |
| [**C2**](#C2) Achievements | `js/server/achievements.mjs`; `GET /api/me/achievements`; title strip |
| [**E1**](#E1) Public inventor page (in-game) | `GET /api/u/:username` 404 if private; opt-in profile |
| [**B2**](#B2) Per-user AI quota (free cap) | signed-in daily hit cap; unsigned still IP-limited |
| [**B3**](#B3) Sponsored lessons stay free | `needsPlayerBilling` is false for sponsor / catalog.free |
| [**E3**](#E3) Cloud pins | `GET/PUT /api/me/pins` max 3 |
| [**E4**](#E4) Friends rooms with Clerk names | room player `clerkUserId`; friends `runs` on hold |
| [**E7**](#E7) Founding / season badges | first 100 accounts; Invent Night 2026 on Wednesday Friends |
| [**E8**](#E8) Display name / hide email | profile hideEmail; public page never includes email; `POST /api/report` |
| Clerk → DB webhooks | `POST /api/webhooks/clerk` verifies Svix; user.deleted cascades Neon rows |
| [**C3**](#C3) Continue the board | `PUT/GET /api/me/run-state` — hex, invent panel, chats; strips data-URL art; Continue on title |
| Clerk app **Warmer Sun Cloud** (dev keys) | Dashboard + `.env.portal` |
| Neon project, pooler `DATABASE_URL` (gitignored) | `.env.portal`; pinged `neondb` as `neondb_owner` |
| Neon agent skills | `.agents/skills/neon`, `neon-postgres` |
| No ORM; Clerk = identity, Neon = Postgres only | [Decisions locked](#decisions-locked) |
| Unsigned engine: localStorage progress, theme play, learning tiles, Friends WS, usage JSONL | existing **game** |
| Paper licenses (self-host / education / commercial / cloud operator) | `COMMERCIAL.md` — [F1](#F1), [F3](#F3), [F4](#F4) as **contracts**, not Cloud UX |
| ToS / privacy that names Cloud stored runs | `warmersun.com/terms/`, `warmersun.com/privacy/` (effective 25 August 2026) |

### Ready (building blocks exist — write the feature)

None. Clerk + Neon + Render are spent: every lettered ID those blocks unlocked is **done**. Remaining IDs stay **todo** until we pick another block (table below).

### Next building blocks (would fill Ready)

The first stack was Clerk identity + Neon + portal-on-Render. That is **done**. Each row here is a *pick*, not a feature. After the pick, the listed IDs become **ready**.

| Building block | What to pick | Then Ready |
|----------------|--------------|------------|
| **Clerk production** | Claim the app; `pk_live_` / `sk_live_`; production instance | Real users on a public origin. Not a lettered feature — ops so Cloud is not on keyless dev keys. |
| **Clerk Billing** | Enable Billing; Free vs Cloud plans; `subscription.*` webhooks | [B1](#B1) paid modules, [B2](#B2) quota by plan. Same vendor as identity. |
| **Clerk Organizations** | Enable Orgs (with Billing) | [F2](#F2) company seats. Only when a company asks with money. |
| **Gated catalog CDN** | here.now passworded Site or Drive API key (`HERENOW_GATED_SECRET`) | Finish [A1](#A1): `aiTutorContext` off the public CDN. Portal already strips on *our* API. |
| **Marketing surface** | Where `warmersun.com` is served; optional `/cloud` 302 | A Learning tile on the marketing site; [E1](#E1) `warmersun.com/u/…`. In-game pages are already **done**. |
| **Observability** | Beyond Render logs | Ops. Not a player feature. |

### Todo (missing a building block or later product)

| Item | Why it is todo |
|------|----------------|
| **Clerk production** instance | Claim the keyless app; `pk_live_` / `sk_live_`; custom domain |
| [**B1**](#B1) Paid lesson modules | Clerk **Billing** not enabled |
| [**B2**](#B2) Quota by paid plan | same |
| [**F2**](#F2) Company seats on our Cloud | Clerk Organizations + Billing not on |
| Observability beyond console | Render logs today |
| Optional: `warmersun.com/cloud` redirect | Ops after first deploy |

[**E9**](#E9) (cross-device is why Sign in exists) is a product rule, not a feature — it is [C1](#C1)+[C3](#C3)+[A2](#A2). [**D3**](#D3) (what not to rank) is a rule, not work. [**D2**](#D2) weekly door, [**E2**](#E2) streaks, [**E6**](#E6) ghost, and [**E10**](#E10) Daily homepage are **dropped**.

---

<a id="A"></a>
## A. Account as a door (not as the whole game)

<a id="A1"></a>
### A1. “You need an account for lessons” — **done** (Node gate + Learning lock); CDN leak still [H](#H)

**Idea.** Core invent (pick a theme, hex board, friends, surprise mission) stays open. The **catalog that we curate** — learning modules, sponsored spotlights — asks you to sign in. Reason: those are *our* drops, they cost us AI, and they only mean something if the same person can come back tomorrow.

**How.**  
- Tag tiles: `access: "open" | "account" | "paid"`. Default today’s theme play = `open`. Learning modules = `account`.  
- Hub splits Themes / Sponsored / **Learning** / Library. Unsigned: Learning (and `access: account|paid` tiles) show a lock + Sign in. There is no official Daily/weekly door — a Daily practice is a Learning tile. Boards are [D1](#D1).  
- **The browser lock is UX only.** **portal** (`portal/server.mjs`) is the real gate: no session → no tutor context. **game** does not gate theme play.  
- `GET /api/quests` may list cards (title, access, price chip) for everyone; **bodies that matter** (`aiTutorContext`, full brief) stay off the wire until the server has allowed the user. Tutor AI (`POST /api/co-invent` in tutor mode) requires a verified Clerk JWT. Do not trust a client-supplied `aiTutorContext` for a gated tile — load it from the server catalog by id after the check.  
- Self-host without Clerk keys: no gate (operator’s catalog, operator’s AI bill).  
- Do **not** hide the whole title screen behind Clerk. That kills self-host and Invent Night drop-ins.

**Public gate:** **portal** on Render ([H](#H)), doorway at `warmersun.com/cloud` when the redirect is set. here.now is files, not the gate.

**Softer variant:** anyone can *play* a Learning tile unsigned on self-host; on Cloud you need an account for tutor + to **count** a hold on the quest board.

<a id="A2"></a>
### A2. Soft account, hard save — **done** (import + live run write; quest-log UI is [C1](#C1))

**Idea.** Never block the first quest. After “pathway holds,” prompt: *Save this to your Warmer Sun Cloud account.* Conversion at the moment of pride, not at the door.

**How.** Keep unsigned localStorage. On outcome screen, if Clerk is on and signed out, CTA Sign in. After first sign-in, `POST /api/me/import` uploads the local solved-ids + last run (size-capped). Signed-in later holds `POST /api/me/runs`. Then cloud is source of truth for that user’s solved set. Merge rule: [C4](#C4). Clerk off or no `DATABASE_URL`: no-op.

---

<a id="B"></a>
## B. Free vs paid lessons

Lessons are quest tiles with a tutor (`isLearningModule`, `module`, `lesson`, `totalLessons`). Paid is a **catalog entitlement**, not a new game mode.

<a id="B1"></a>
### B1. Free shelf + paid modules — **todo** (Clerk Billing)

**Idea.** Lesson 1 of a module (or a named “open” set) is free with an account. The rest of the module is a paid pack: *Inventing with gene sequencing*, *Power as abundance*, etc. The invent job stays inventing — you are not buying a certificate.

**How.**  
- Tile field `entitlement` (string), e.g. `"lesson.gene-seq"` or `"catalog.free"`.  
- Clerk **Billing**: two plans to start — **Cloud Free** (account, free lessons, modest AI) and **Cloud** (paid modules, higher AI). Optional add-on packs later.  
- Server checks `has({ plan, feature })` from Clerk **or** a local entitlements table filled by Billing webhooks (`subscription.*`). Same check on **start-run** and **tutor co-invent**, not only on the hub. Hub price chip is cosmetic.  
- Hub: paid cards show a price / “Included in Cloud”. Click without plan → Clerk `<PricingTable />` or Checkout. After pay, webhook → user can start.  
- Self-host without Clerk: all local `quests/` tiles playable (operator’s catalog, operator’s AI bill). Paywall is **Warmer Sun Cloud’s** catalog, not the engine.

<a id="B2"></a>
### B2. Meter the expensive bit (AI), not the hexes — **done** (free cap); **todo** (plan cap)

**Idea.** Hex invent is cheap. Co-inventor, Imagine, TTS are not. Free account: daily AI budget. Paid: higher cap. Prevents “free Cloud” from becoming an xAI invoice.

**How.** Usage JSONL + per-IP rate limits stay for unsigned / self-host. Signed Cloud uses per-`clerk_user_id` daily counters in Neon. `gateExpensive` consults identity when present. Return `402` / `429` with a plain message: *Today’s co-inventor energy is spent — comes back at midnight, or upgrade.* Plan-based caps wait on [B1](#B1).

<a id="B3"></a>
### B3. Sponsored lessons stay free (with a name) — **done**

**Idea.** A company pays **us** to author a spotlight (already have `sponsorName`). Player does not pay. That is advertising / patronage, not a student license.

**How.** Tile `access: "account"` + `entitlement: "catalog.free"` + sponsor fields. No Billing check. Optional: sponsor wants a *campaign id* in run records so they know how many people invented, not who the children are.

---

<a id="C"></a>
## C. Cloud memory (quests taken, achievements, continue)

Replace “this laptop remembers” with “your account remembers.”

<a id="C1"></a>
### C1. Quest log — **done**

**Idea.** A list: what you started, what you held, what collapsed, which lesson N/M. Open it on your phone tomorrow.

**How.**  
Table `runs` (`id`, `clerk_user_id`, `quest_id`, `kind` theme|lesson|friends|import, `started_at`, `ended_at`, `outcome` hold|collapse|abandon, `stars`, `year_reached`, `tech_ids[]`, `place`).  
Write on start and on outcome (the same moment we write `STORAGE_SOLVED` / run reports).  
`GET /api/me/runs`. Profile screen: list + filters. Unsigned: keep localStorage only.

A log row is enough for “what I took.” The live workshop (hex, invent panel, chats) is [C3](#C3).

<a id="C2"></a>
### C2. Achievements — **done**

**Idea.** Consumer badges, not transcripts. *Held a pathway. Used a converter to dock bits to atoms. Summoned all four challengers. Invented on a sponsored spotlight. First Friends hold.* Flavor in the practice’s language.

**How.**  
Table `achievements` (`clerk_user_id`, `code`, `unlocked_at`, `run_id`).  
Server awards on run complete from a small rules file (`js/server/achievements.mjs`) — never let the client say “I unlocked.”  
Surface: Achievements on the title strip when signed in.

<a id="C3"></a>
### C3. Continue the board — **done**

**Idea.** Close the laptop mid-quest, open another device, board and crisis lights are still there.

**How.** Snapshot the full workshop: hex board, invent panel (R&D, AI idea sparks, user-minted custom tiles), co-inventor + tutor chats. Table `run_state` (`board`, `play`, `chats` JSONB, mission id, year, tutor flag). Debounced `PUT` while playing; restore Continue on the title screen if signed in. Strip `data:` Imagine stills on the way in so the PUT does not 413. Cap blob size.

<a id="C4"></a>
### C4. Merge on first sign-in — **done** (solved-id union + last completed run; board continue is [C3](#C3))

**Idea.** People will invent unsigned, then Sign in. Don’t lose the local solved set.

**How.** One-shot import ([A2](#A2)). Conflict rule: union of solved ids; cloud wins on the last completed run if both exist (skip local `lastRun` when the account already has a `runs` row). Show a single toast: *Saved N quests to your account.* Mid-quest board snapshots stay [C3](#C3).

---

<a id="D"></a>
## D. Leaderboards (same quest, comparable invents)

Leaderboards only work if **everyone got the same job**. That is a **catalog quest** (Learning, sponsored, Library) — not “any theme you picked,” not a UTC-day rotation.

<a id="D1"></a>
### D1. Per-quest leaderboard — **done** (portal APIs; catalog card)

**Idea.** One board per **stable catalog quest**. Same job → comparable invents. Theme `gen-…` missions have no board. Each signed-in person appears **once** (personal best). Rank **score** = honesty stars of the hold ÷ years from the quest’s present (`year_reached - startYear`, same-year counts as 1). Multiply, do not add. **Waits** break ties only. The **pathway write-up** (placed invents + how-it-works) sits on the row. Vision stills only for the **current top 3** (`BYTEA` in Neon). Daily, if you want one, is a Learning tile on that board — not a featured door.

**How.**  
- `POST /api/me/quests/:id/score` copies year/stars/waits from the owned `runs` row; stores `pathway_text`.  
- `PUT /api/me/quests/:id/still` JPEG if that user is in the top 3. Displace deletes the blob.  
- `GET /api/board/:questId` public **top 10** + you + write-ups; `GET /api/board/:id/still/:user` the JPEG.  
- Title **Leaderboard** (`GET /api/board`): top 10 **inventors**. Score = sum of that person’s per-quest scores (★ ÷ years). Tie-break: more quests, then fewer waits.  
- Each catalog card still has that quest’s own board.  
- Unsigned practice does not submit.

<a id="D2"></a>
### D2. Seasonal / weekly — **dropped**

A UTC-week featured door was the same product as Daily-the-rotation. Invent Night stays a Wednesday Friends ritual. Ranking is always the quest board.

<a id="D3"></a>
### D3. What not to rank

Don’t rank “most lessons completed” as if it were homework. Don’t rank AI tokens used. Rank **holds** and **honesty stars** — things that match the practice.

---

<a id="E"></a>
## E. Other consumer things that fit

<a id="E1"></a>
### E1. Public inventor page — **done** in-game; **todo** as `warmersun.com/u/…`

**Idea.** `warmersun.com/u/sic` — display name, badges, last few public holds, favorite emTech. Opt-in. Default private.

**How.** `users.profile` (`username` unique, `bio`, `public` bool). Username via Clerk or our table. Only publish runs with `share: true` (outcome screen already has a share card — add “Publish to my page”).

<a id="E2"></a>
### E2. Streaks (the Daily habit) — **dropped**

Consecutive official-Daily check-ins needed a featured door. Daily is a Learning module now. No streak chip.

<a id="E3"></a>
### E3. Pins in the cloud (watch later) — **done**

**Idea.** Three pins already exist locally. Signed-in, they follow you. “I want this mission when I have an hour.”

**How.** Table `pins` (max 3 server-side). Replace `future-forge:pins` when signed in.

<a id="E4"></a>
### E4. Friends rooms with real names — **done**

**Idea.** Invent with friends, but the host sees *Tamas*, not `Player 2`, and the run can land on everyone’s quest log.

**How.** On room create/join, pass Clerk user id (server already has the JWT on REST). Store `clerk_user_id` on the room player. Outcome fan-out: each signed-in player gets a `runs` row (`kind: friends`). Unsigned guests still play; they just don’t keep the souvenir.

<a id="E5"></a>
### E5. Pathway gallery — **dropped** (was a dump of every published hold)

A public feed of every hold is not the product. Readable invents belong on the **per-quest leaderboard** ([D1](#D1)): write-up on every score row, vision still only for the current top 3. Inventor page ([E1](#E1)) can link to boards. No object store.

<a id="E6"></a>
### E6. Rematch / ghost — **dropped**

Share-ghost links (`?daily=&beat=&year=`) were a Daily-door feature. The board is the quest list.

<a id="E7"></a>
### E7. Founding / season badges — **done**

**Idea.** First N Cloud accounts, or “Invent Night 2026,” as a cosmetic badge. Consumer myth, not a certificate.

**How.** `achievements` codes granted by webhook on `user.created` if `created_at` before a cutoff, or by attending a tagged Friends room.

<a id="E8"></a>
### E8. Display name, age gate, block — **done**

**Idea.** Young audience is in the mission of the practice. Cloud needs a chosen name, a way to hide email, a way to block a gallery item. Still not a school.

**How.** Clerk username + our profile. Gallery report → operator queue (email). Keep it small.

<a id="E9"></a>
### E9. Cross-device is the actual reason to sign in

If we only paywall lessons and never save, people will screenshot. **C1 + [C3](#C3) + [A2](#A2)** are the product. Billing is how the catalog and AI get paid.

<a id="E10"></a>
### E10. Official Daily as a homepage ritual — **dropped**

There is no `GET /api/daily`. If marketing wants a ritual, put a **Learning** tile on the site. Not a UTC API.

---

<a id="F"></a>
## F. If an org wants a commercial license

This is **not** “add Classes.” It is money + rights, matching `COMMERCIAL.md`.

<a id="F1"></a>
### F1. They want to **self-host** (company, consultancy, paid workshop as a business) — **done** (paper in `COMMERCIAL.md`)

**Idea.** They run Node. They bring their own xAI key. They do not need our Cloud quest boards. They pay for the **right** to use Future Forge commercially (internal training, client workshops, embedding).

**How.**  
- License is a **contract + invoice**, not a Clerk plan. Spreadsheet / HelloSign / Stripe invoice is enough.  
- Optional: a license key they put in `.env` (`FF_LICENSE_KEY`) that unlocks a watermark-free commercial build, or we just trust the contract (simpler, honest for v1).  
- Their instance can disable Warmer Sun Cloud Sign in entirely (already the default without Clerk keys).  
- We do **not** ship them an LMS. If they invent a teacher mode, that is their fork under the license.

<a id="F2"></a>
### F2. They want **seats on our Cloud** (company Invent Night, lab, studio) — **todo** (Clerk Orgs + Billing)

**Idea.** A company buys a **team pack**: N people who invent on warmersun.com under the company’s tab. They want SSO (Google Workspace / Okta), a shared bill, maybe a private gallery. They do **not** need assignments.

**How.**  
- Clerk **Organizations** actually fit here (B2B team), even though we refuse school orgs. One Clerk org per customer company.  
- Clerk Billing **per-seat** on the org. Admin invites by email.  
- Features: pooled AI quota, private gallery, company display name on Friends rooms.  
- Explicitly **no**: roster CSV from SIS, due dates, observer role that grades the board.  
- If they ask for “our manager can see completion %,” sell them the **quest log export for the org** (who invented this month) — a **usage story**, not a gradebook. Make it opt-in at the employee profile.

<a id="F3"></a>
### F3. They want to **resell hosting** (another cloud) — **done** (paper only)

**Idea.** Cloud / Managed Service tier in `COMMERCIAL.md`. Rare. Contract + branding rules. They are not our consumer.

**How.** Paper. Maybe a private source drop or a support retainer. Do not build multi-tenant white-label into v1 of Warmer Sun Cloud.

<a id="F4"></a>
### F4. Education institutions — **done** (paper; no classroom UX)

They need a paid **Education** license to self-host. We still **do not build classroom UX**. If a university wants seats on Cloud, treat them like [F2](#F2) (a company-shaped org) or send them to self-host. Do not grow a “for schools” SKU in the UI.

---

## Suggested order (if we do any of this)

Items 1–7 are **done**. Remaining wait on a **next building block** (Clerk Billing, production instance, object storage, marketing surface).

1. **`runs` log + first-sign-in import** ([C1](#C1), [C4](#C4), [A2](#A2)) — **done**  
2. **Per-quest boards** ([D1](#D1)) — **done**  
3. **Achievements + profile privacy** ([C2](#C2), [E1](#E1)) — **done** (in-game; `warmersun.com/u/…` is **todo**)  
4. **AI quota (free cap)** ([B2](#B2)) — **done**; plan cap is **todo**  
5. **Paid lesson entitlements** ([B1](#B1)) — **todo** Clerk Billing  
6. **Friends identity** ([E4](#E4)) — **done**; gallery ([E5](#E5)) **dropped** (use [D1](#D1) boards)  
7. **Continue board** ([C3](#C3)) — **done**  
8. **Org seats** ([F2](#F2)) — **todo**; only when a company asks with money

---

## Non-goals (write them on the wall)

- LMS, LTI, grade pass-back, attendance, seating charts  
- Teacher / pupil roles, “assign this quest to a class”  
- Rubrics for a human marker (Moloch is already the hard question)  
- Forcing Sign in on self-host or on the hex engine  
- Storing essays for an institution to inspect  
- Selling “hours of professional development”

If a feature’s main customer is a teacher, it does not belong in Warmer Sun Cloud.

---

## Open product choices (decide when we implement, not now)

- Paid **modules** vs one monthly Cloud sub that unlocks all paid lessons?  
- Leaderboard public on the marketing site, or only in-game?  
- Username required, or “Tamas S.” from Clerk?  
- How brutal is the AI free cap? (This is a cost decision.)

Identity, quest log, per-quest boards, Continue, and the portal host are **done**. Nothing is **ready**. Next is a building block, not a feature: Clerk production, Clerk Billing ([B1](#B1)), or the marketing surface.

---

## Decisions locked

These are settled. Do not re-open them in implementation.

1. **No ORM.** This repo is vanilla JS, not TypeScript. Skip Drizzle, Prisma, and the rest. Talk to Neon with a Postgres driver (`pg` or `postgres`) and plain SQL (`CREATE TABLE`, migrations as `.sql` files under `js/server/db/`). Typed query builders buy nothing here.
2. **Clerk is identity; Neon is only Postgres.** Do not enable Neon Auth (or Supabase Auth, or a second user table that pretends to be login). Session JWT we already verify is the user. Neon stores `runs`, achievements, quest scores — keyed by `clerk_user_id`.
3. **The Cloud host is the gate.** Two here.now Sites (public files vs gated files). Only **portal** knows the gated credential. Neon, Clerk verify, and entitlements live **on portal**, not on here.now. Live xAI (co-inventor, Imagine, TTS) is **game**, not portal. **game** (self-host) never talks to the gated Site. Details: [H](#H).
4. **The host is a Render Web Service running portal** (`npm run portal`, `render.yaml`). Funnel on this machine was a laptop prototype. Optional: `https://warmersun.com/cloud` 302s to the Render URL.

---

<a id="H"></a>
## H. The Cloud host — portal on Render

**Status:** **done** (Render). **Where it runs:** **portal** (`portal/server.mjs`, `npm run portal`) on a Render **Web Service** is Cloud HTTP APIs plus **`GET /signin`** (`https://cloud.warmersun.com`, API also at `https://future-forge-0yil.onrender.com`). **game** (`npm start`) is the playable SPA at `http://127.0.0.1:8765`. Set `FF_PORTAL_URL` on game to the Render origin. Optional: **`https://warmersun.com/cloud`** 302s to the game SPA, not to JSON APIs.

Warmer Sun Cloud (**portal**) is the hosted product. It is an always-on Node process that:

- Verifies Clerk JWTs  
- Owns Neon (`runs`, entitlements, quotas)  
- Does **not** call xAI — live co-inventor / Imagine / TTS is **game**  
- Is the **only** client that can read gated catalog files  

here.now stays a **CDN for files**.

```
Browser
  │
  ├─ public here.now     free SPA, free catalog JSON, theme play
  │                      (anyone can GET)
  │
  └─ portal (Render)     Cloud APIs + GET /signin (Clerk + Neon, no playable SPA, no xAI)
         │
         └─ gated here.now   paid tiles, aiTutorContext, lesson bodies
                             credential known only to portal
```

**Public Site** — game shell, open tiles, marketing. Free stuff never needs the host.

**Gated Site** — password-protected (or a here.now **Drive** with an API key — same idea, better for servers). Browsers get 401. The host stores `HERENOW_GATED_SECRET` (or Drive token) in env, fetches JSON server-side, and only then returns a lesson to a Clerk user who is allowed.

**Why the host cannot be bypassed (for Cloud catalog):** the gated URL is useless without the secret. The secret never ships in `js/`. Leaking it is an ops incident (rotate), not “inspect element.” This is a **shared secret**, not per-user crypto — good enough to keep `aiTutorContext` off the public CDN.

**Self-host** is unchanged: local `quests/` + their `FF_XAI_API_KEY`. They never call the gated Site. They incur their own AI cost. That is the point.

**Extend the host later** without moving files: Billing `has()`, gallery, extra quotas. Friends WS stays on **game**. One portal process, one Neon, one gated-catalog secret.

**Caveat:** confirm here.now **site password** is something Node can send (HTTP Basic / header), not only a browser interstitial + cookie. If it is cookie-only, use a **Drive + API key** instead of a passworded Site — same split, designed for server fetch.

**Does not live on here.now:** Neon, Clerk verify. WebSockets and live xAI are **game**, not portal. The game SPA calls Render `/api/*` (CORS `*`). Do not serve the SPA from portal.

### Where it runs

Render **Web Service** (see `render.yaml`):

1. Build `npm install`. Start `npm run portal`. Health `GET /api/health`.  
2. Env in the Dashboard: Clerk keys, `DATABASE_URL` (+ `DATABASE_URL_UNPOOLED`), `FF_TRUST_PROXY=1`. **No `FF_XAI_API_KEY`.** Render injects `PORT`.  
3. Optional: on warmersun.com, **`/cloud` → 302** to the game; Sign in stays **`https://cloud.warmersun.com/signin`**.

Local Cloud: `npm run portal` (Clerk + Neon in gitignored `.env.portal`). Engine only: `npm start` (`.env`).

**Clerk / CORS**

- Production Clerk keys only load on `warmersun.com` (or a subdomain). Sign in is **`https://cloud.warmersun.com/signin`**. CNAME that host to Render; add the custom domain on Render. Cloudflare-proxied TLS is fine here (public host, not loopback).
- Local **game** is HTTP **`:8765` only** (`http://127.0.0.1:8765` or `http://localhost:8765`). Do not bind port 443. The game never calls `Clerk.load()`.
- Dashboard allowed origins + `CLERK_AUTHORIZED_PARTIES`: `https://cloud.warmersun.com`, `https://warmersun.com`, plus loopback game origins (`http://127.0.0.1:8765`, `http://localhost:8765`). If `CLERK_AUTHORIZED_PARTIES` is set on Render it **replaces** code defaults — keep those hosts. Google and X **Authorized JavaScript origins**: `https://cloud.warmersun.com` and `https://warmersun.com` only.
- Webhooks: `https://future-forge-0yil.onrender.com/api/webhooks/clerk` (must stay the same hostname until you add a custom domain).
- Device handshake (`POST /api/device/start`, `GET /api/device/status`) CORS is loopback game origins plus optional `FF_GAME_DEVICE_ORIGINS` (comma-separated Funnel/public game origins). Other Cloud APIs stay CORS `*`. Do not serve the playable SPA from portal.

**Ops honesty:** Render sleep on free instances = Cloud down; use a paid instance if Sign in / boards must stay up. Custom domain, Clerk production keys, and the `/cloud` redirect are ops after the first deploy. Funnel on a laptop was the prototype; do not point production webhooks at `*.ts.net`.

---

<a id="G"></a>
## G. Outstanding building blocks — research and recommendation

**Researched:** 2026-08-25. Prices and plan names move; re-check before spending. Clerk is identity only. Neon is the store (provisioned; schema **done**). Host pick: Render for **portal**, not Fly.

<a id="G0"></a>
### G0. Constraints of *this* stack (do not pretend we are Next.js)

| Constraint | Why it matters |
|------------|----------------|
| Long-running Node (`server.mjs`) | Not a serverless function. Friends rooms use **WebSockets**. Vercel / Netlify / Cloudflare Workers are the wrong shape. |
| Disk already in play | Shared TTS cache under `data/tts-cache/`. The process wants a volume, not a read-only lambda. |
| Clerk already chosen | Do not buy a second auth (Supabase Auth, Firebase Auth, PlayFab). |
| Catalog vs game | `warmersun.com` already publishes quest/trend JSON. The **game** is a Node process (`npm start`). Cloud DB belongs on **portal**, not inside the static site. |
| Scale | Sole prop, consumer, Invent Night + Daily. Hundreds of users first, not 100k DAU. **xAI tokens will dwarf the database bill.** |
| Self-host must stay simple | Hobby `npm start` without Cloud. No required Neon account for a LAN night. |

README deploy: **portal** on Render (`npm run portal`); **game** is `npm start` with `FF_PORTAL_URL`. Self-host engine stays `npm start` without Clerk.

<a id="G1"></a>
### G1. Outstanding blocks (the shopping list)

| Block | What it is | Bucket | Needed for |
|-------|------------|--------|------------|
| **1. App host** | Always-on Node + HTTPS | **Done** — Render Web Service running **portal** | Public webhooks, [A1](#A1), [E5](#E5) |
| **2. Database** | Relational store keyed by `clerk_user_id` | **Done** — Neon, `.env.portal` | [C1](#C1), [D1](#D1), [B2](#B2) |
| **3. Schema + migrations** | Versioned `.sql`, no ORM | **Done** — `js/server/db/001`–`010` | Same |
| **4. Clerk → our DB** | Webhooks + JWT on writes | **Done** — JWT + `POST /api/webhooks/clerk` | Names on the board, delete-account |
| **5. Public webhook URL** | TLS endpoint Clerk/Svix can POST | **Done** — `https://future-forge-0yil.onrender.com/api/webhooks/clerk` | (4) in production |
| **6. Backups** | PITR off the app disk | **Done** — Neon instant restore on the project | Not losing the quest log |
| **7. Clerk production instance** | `pk_live_` / claimed app | **Todo** | Real users on warmersun.com |
| **8. Billing** | Clerk Billing + `subscription.*` | **Todo** | [B1](#B1), [F2](#F2) |
| **9. Object storage** | Gallery stills | **Not needed** — top-3 stills are Neon BYTEA on [D1](#D1) | Dropped [E5](#E5) |
| **10. Secrets / env** | `DATABASE_URL`, Clerk keys | **Done** locally (`.env.portal`) and on Render | Deploy |
| **11. Observability** | Process up, webhook failures | **Todo** | Operating Cloud |
| **12. Legal** | Privacy / ToS for stored runs | **Done** — warmersun.com/terms and /privacy (25 Aug 2026) | Cloud rows, Continue, leaderboard stills named |

**Do not need in v1:** Redis, Kafka, a second region, Kubernetes, a game BaaS (PlayFab / Nakama / LootLocker / Beamable). Those are live-ops platforms for Unity/Unreal studios. We already have a game server.

<a id="G2"></a>
### G2. Market: what people buy for this job

Three markets, only one is ours.

**1. Game backend-as-a-service** (PlayFab, Nakama, LootLocker, Beamable, AccelByte). Leaderboards and cloud save are checkboxes. Pricing at even 1k DAU is tens to hundreds of USD, and the SDKs assume a game engine. **Skip.** We would throw away `server.mjs` and Clerk.

**2. Backend-as-a-service** (Supabase, Firebase). Postgres + auth + storage in one bill. Supabase Pro is a **$25/mo floor**; free tier **pauses after a week idle** — hostile to “today’s Daily.” Auth would duplicate Clerk. Supabase *can* sit behind Clerk as third-party auth; that is extra moving parts we do not need. **Skip as the primary backend.**

**3. “Just a database” + “just a VM”** — the 2026 indie default for a custom Node app that already has Clerk.

| Option | Kind | 2026 entry (approx.) | Fit |
|--------|------|----------------------|-----|
| **Neon** | Serverless Postgres | Free: 0.5 GB, 100 CU-hours/mo, scale-to-zero, commercial use. Paid Launch ~usage; light apps often **~$5–20/mo** | Strong. Clerk publishes a Neon guide. Branching for migrations. |
| **Supabase Postgres only** | Always-on Postgres (+ unused Auth) | Free pauses; Pro **$25/mo** | Paying for auth we will not use. |
| **Turso / libSQL** | Hosted SQLite | Free generous; paid from **~$5/mo**; **row-read** meter | Fine for a key-value save; leaderboards + “top N + your row” are SQL we want in Postgres. Edge replicas are irrelevant (one Node process). |
| **Fly.io Postgres** | DIY cluster on Fly machines | Dev single-node **~$2–8/mo**; **Managed** Postgres advertised from **~$38/mo** | DIY is cheap and you babysit backups. Managed is pricey for v1. |
| **Railway Postgres** | Metered, same project as the app | Hobby **$5/mo** credit + usage; small DB often **~$7–22/mo** | Fine if the **app** is also on Railway. Ties DB to that PaaS. |
| **Render Postgres** | Flat-ish | Basic from **~$6–7/mo**; free DB auto-deleted after a trial | Fine, less loved for WS than Fly. |
| **Hetzner / small VPS** | You run Postgres or SQLite | CX22-class **~€4–6/mo** for app+disk | Cheapest always-on. You are the DBA. |
| **SQLite on the app volume** | File next to TTS cache | $0 extra | Perfect **prototype**. Weak backups and multi-instance (we must not run two Nodes writing one file). |

Clerk’s own docs (2026): prefer **session JWT** for the current user; **sync a user row via webhooks** when you show *other* people’s names (leaderboard, gallery). Store extra fields in our DB, keyed by `clerk_user_id`. Do not stuff save-games into Clerk metadata (1.2 KB cookie cap).

<a id="G3"></a>
### G3. Recommendation

**Done in spirit, host pick updated:** schema is Postgres; Cloud Postgres is Neon; **portal** Node is on **Render** (`npm run portal`), not Fly. Do not put the database on the app’s local disk in production. The Fly.io notes below are the 2026-08-25 research that led here — do not re-open the host pick.

Why this split:

1. **Postgres** is what Clerk tutorials and every “top N + your score” query assume. Unique `(user_id, daily_date)`, window functions, backups you are not inventing.
2. **Neon** is the cheapest *managed* Postgres that does not pause-for-a-week, does not include a second auth product, and has a real free tier with commercial use. Clerk documents it. Scale-to-zero is acceptable: our Node is always on and will take a ~0.5s cold query after idle; Daily traffic is bursty. When Daily is a ritual, turn off scale-to-zero (Launch plan, still small money).
3. **Fly.io** matches the process we actually run (WebSocket rooms, TTS volume, `npm start`). Shared-cpu 1 GB is on the order of **$6/mo**. Volume for `data/tts-cache` is cents/GB. Region: `sea` or `yyz` (we are Vancouver-adjacent). Fly Managed Postgres at ~$38/mo is **not** worth it vs Neon.
4. **SQLite** is allowed as a **local-only** `FF_CLOUD_DB=sqlite:./data/cloud.sqlite` so `npm start` on a laptop can develop [C1](#C1) without Neon. Production Warmer Sun Cloud sets `DATABASE_URL=postgres://…`. If SQLite vs Postgres SQL diverges, drop the sqlite path rather than fork the schema.
5. **No ORM** — `pg` or `postgres` plus `.sql` migrations in `js/server/db/`. This repo is untyped JS; Drizzle/Prisma would be extra machinery. See **Decisions locked**.
6. **Webhooks:** `POST /api/webhooks/clerk`, `verifyWebhook` from `@clerk/backend`, env `CLERK_WEBHOOK_SECRET` (alias `CLERK_WEBHOOK_SIGNING_SECRET`). Local: `npx clerk webhooks listen --forward-to http://127.0.0.1:8765/api/webhooks/clerk` (first-party; skip ngrok unless that fails). Events: `user.created`, `user.updated`, `user.deleted`. Upsert `users(clerk_user_id, display_name, image_url)`.
7. **Writes from the game** still use the session JWT we already attach. Never trust a client-supplied `userId`.
8. **Object storage** not required. Per-quest stills are Neon BYTEA for the current top 3.
9. **Billing** stays Clerk Billing when we reach [B1](#B1) — one vendor with identity.
10. **Claim** the Clerk app into the Warmer Sun Cloud workspace and create a **production** instance before any real consumer data. Keyless dev keys are not a production identity.

**If Fly is annoying:** Railway (app + Postgres in one project) is the second choice. **If you already have a happy VPS for `/forge`:** keep the Node there, still put Postgres on Neon (backups and “I destroyed the box” are the point). **If spend must be ~€5 total:** Hetzner VPS + SQLite + daily `sqlite3 .backup` to object storage — acceptable for a private beta of *you plus Invent Night*, not for a public leaderboard you cannot restore.

<a id="G4"></a>
### G4. Rough monthly bill (Cloud v1, hundreds of users)

| Item | Ballpark |
|------|----------|
| Fly Machine 1 GB + small volume | ~$6–12 |
| Neon Free (then Launch if always-warm) | $0, then ~$5–20 |
| Clerk | Inside the existing MAU free/cheap band at this scale |
| TLS / domain | Already have warmersun.com |
| **xAI** | **The actual bill.** Quotas ([B2](#B2)) exist so this does not go unbounded. |

Infrastructure for save + Daily is cheap. Schema, webhook, and `runs` are **done**. Remaining spend risk is xAI, not the host.

<a id="G5"></a>
### G5. First infra slice — **done**

1. Clerk app **Warmer Sun Cloud**; **dev** keys on localhost and on Render. Production instance is **todo**.  
2. Neon project, region `us-west-2`. `DATABASE_URL` in gitignored `.env.portal`.  
3. SQL migrations `001`–`011` (`users`, `runs`, achievements, profile, quota, pins, `run_state`, `quest_scores`). No `daily_scores`. No ORM.  
4. `POST /api/webhooks/clerk` on portal.  
5. `POST /api/me/runs` (JWT required) + `GET /api/me/runs`.  
6. Portal on Render; webhook URL `https://future-forge-0yil.onrender.com/api/webhooks/clerk`.

Skip paid lessons, gallery, and org seats until that loop stays boringly reliable.

<a id="G6"></a>
### G6. Sources (2026)

- Clerk: [sync data with webhooks](https://clerk.com/docs/guides/development/webhooks/syncing), [Neon integration](https://clerk.com/docs/guides/development/integrations/databases/neon), [webhooks overview](https://clerk.com/docs/guides/development/webhooks/overview)  
- Neon vs Supabase vs Railway (SaaS Postgres, May–Aug 2026 roundups): free-tier pause vs scale-to-zero, Pro $25 floor vs Neon usage  
- Fly.io [resource pricing](https://fly.io/docs/about/pricing/) — machines, volumes, unmanaged vs managed Postgres  
- This repo: `README.md` deploy section; `portal/server.mjs` Cloud APIs; `server.mjs` game HTTP + `ws`; Clerk + Neon in `.env.portal`  
- Game BaaS pricing surveys (PlayFab / Nakama / LootLocker at 200–1k DAU) — used only as **negative** space

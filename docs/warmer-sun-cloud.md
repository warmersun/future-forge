# Warmer Sun Cloud — what we can build now

**Status:** ideation plus a few locked building blocks. See **implemented / ready / todo** below.  
**Clerk application:** `Warmer Sun Cloud`  
**Today:** optional Sign in on Future Forge (`feat/clerk-auth`). Neon Postgres is provisioned. Unsigned progress is **this browser’s localStorage**. Signed-in Cloud play **imports** the local solved set and last run into Neon ([A2](#A2)); after that, cloud is source of truth for solved ids (localStorage is a cache). Quest log: [C1](#C1).

This note is a menu. Each item is: the **idea**, then a **short how**. Pick later. Do not build all of it.

---

## Stance

**The product is for people.** Someone curious about emerging tech, a friend at Invent Night, a teenager who wants a practice, an adult who wants a daily invent. Direct to consumer. Warmer Sun Cloud is the **hosted game + account + catalog**, not a school platform.

**The engine stays free.** Self-host, unsigned play, friends in a room, hex invent — that remains the CC / hobby path. Cloud is what you **cannot keep in one browser**: a name that follows you, a history, a paid catalog, a public scoreboard, AI that we pay for.

**Do not build for classrooms.** No LMS, no roster, no assignments, no gradebook, no teacher dashboard, no “section 3B due Friday,” no Canvas/Google Classroom. If a school wants Future Forge, that is a **commercial license** (see `COMMERCIAL.md`), not a product surface we design around.

Orgs that pay are **companies, clubs that commercialize, consultancies, other hosts** — not an education SaaS detour.

---

## What is already true

| Piece | Today |
|--------|--------|
| Identity | Clerk (`user_…`). Optional. Sign in / UserButton / Sign out works. |
| Play | Works unsigned. Self-host needs no Clerk. |
| Progress | `localStorage` always (cache). Signed-in + `DATABASE_URL`: `solved_quests` + `runs` in Neon after [A2](#A2) import / later holds. Quest log: [C1](#C1). |
| Daily | Server `GET /api/daily` picks one UTC-day tile ([D1](#D1)). Unsigned practice does not submit. |
| Lessons | Quest tiles with `isLearningModule`. Tutor UI. No paywall. No cloud progress. |
| Friends | Rooms + WebSocket. Names are per room, not Clerk. |
| Money | None in software. `COMMERCIAL.md` is a **license** conversation (self-host / education / commercial / cloud operator). Clerk Billing is unused. |
| Database | **Neon Postgres** (`DATABASE_URL` in gitignored `.env`, pooler host, `us-west-2`). Empty of Cloud tables. Usage JSONL is still only operator cost logs. |

**Implementation default for almost everything below**

1. Keep Clerk as the user store (email, Google, profile, later Billing).  
2. Cloud rows live in **Neon**, keyed by `clerk_user_id`. No ORM: `pg`/`postgres` + `.sql` migrations.  
3. Browser sends `Authorization: Bearer <session JWT>` (already wired).  
4. Server verifies with `@clerk/backend`, then reads/writes **our** tables — never trust the client’s `userId`.  
5. Unsigned play stays on localStorage. Signed-in Cloud play **mirrors** (and eventually owns) that state.

Clerk user `publicMetadata` / `unsafeMetadata` is **not** a save game. Boards and run history will not fit. Metadata is for flags: `plan`, `display_name`, `founding`.

---

## Status: implemented / ready / todo

Three buckets. **Implemented** is in the repo or provisioned. **Ready** means the architecture is in place (Clerk identity + Neon) so the next work is code, not a vendor search. **Todo** still needs a pick (host, Billing, production Clerk) or is explicitly later.

### Implemented

| Item | Where |
|------|--------|
| Optional Sign in / UserButton / Sign out | `feat/clerk-auth`, `js/auth.js` |
| [**A1**](#A1) catalog/tutor account door | `js/server/cloud-gate.mjs` — strip `aiTutorContext` unsigned; tutor `401`; hub lock |
| `GET /api/health` `clerk` + `db` blocks, `GET /api/me`, JWT on expensive POSTs | `server.mjs`, `js/server/clerk-auth.mjs` |
| [**A2**](#A2) save-at-pride / first sign-in import | `POST /api/me/import`, `POST /api/me/runs`; outcome Sign in CTA; union merge ([C4](#C4)) |
| [**C4**](#C4) Merge localStorage on first sign-in | same as [A2](#A2) — union of solved ids; cloud wins last run |
| SQL migrations `users` / `solved_quests` / `runs` | `js/server/db/001_users_solved_runs.sql`, `pg` Pool |
| [**C1**](#C1) Quest log | `GET /api/me/runs`, `POST /api/me/runs/start`; signed-in Quest log screen |
| [**D1**](#D1) Daily hold board | `GET /api/daily`, `POST /api/daily/submit`, `GET /api/daily/board` |
| [**D2**](#D2) Seasonal / weekly board | `GET /api/weekly` + `period=YYYY-Www` on `daily_scores` |
| [**C2**](#C2) Achievements | `js/server/achievements.mjs`; `GET /api/me/achievements`; title strip |
| [**E1**](#E1) Public inventor page (in-game) | `GET /api/u/:username` 404 if private; opt-in profile |
| [**E2**](#E2) Streaks | `GET /api/me/streak` from official daily_scores |
| [**B2**](#B2) Per-user AI quota (free cap) | signed-in daily hit cap; unsigned still IP-limited |
| [**B3**](#B3) Sponsored lessons stay free | `needsPlayerBilling` is false for sponsor / catalog.free |
| [**E3**](#E3) Cloud pins | `GET/PUT /api/me/pins` max 3 |
| [**E4**](#E4) Friends rooms with Clerk names | room player `clerkUserId`; friends `runs` on hold |
| Clerk app **Warmer Sun Cloud** (dev keys) | Dashboard + `.env` |
| Neon project, pooler `DATABASE_URL` (gitignored) | `.env`; pinged `neondb` as `neondb_owner` |
| Neon agent skills | `.agents/skills/neon`, `neon-postgres` |
| No ORM; Clerk = identity, Neon = Postgres only | [Decisions locked](#decisions-locked) |
| Unsigned engine: localStorage progress, client Daily, learning tiles, Friends WS, usage JSONL | existing game |
| Paper licenses (self-host / education / commercial / cloud operator) | `COMMERCIAL.md` — [F1](#F1), [F3](#F3), [F4](#F4) as **contracts**, not Cloud UX |

### Ready (building blocks exist — write the feature)

Clerk user id + Neon are enough. `users` / `solved_quests` / `runs` exist. Webhooks and remaining routes are still to type.

| Item | Why it is ready |
|------|-----------------|
| [**A1**](#A1) Account door | **Implemented:** strip tutor context on `GET /api/quests`, `401` tutor co-invent, hub Sign in lock. Daily **count** is [D1](#D1). Gated CDN is [H](#H). |
| [**C3**](#C3) Continue the board | Neon can store a JSON snapshot; large — treat as v2 of [C1](#C1) |

| [**E6**](#E6) Rematch / ghost | Daily id + target year; no new vendor |
| [**E7**](#E7) Founding / season badges | `achievements` + `user.created` webhook (webhook route is code, Svix is Clerk) |
| [**E8**](#E8) Display name / hide email | Clerk already has name; extra flags in Neon |
| Clerk → DB webhooks (`user.created/updated/deleted`) | `verifyWebhook` in `@clerk/backend`; local `clerk webhooks listen` |

### Todo (missing a pick or a later product)

| Item | Why it is todo |
|------|----------------|
| **App host** = Warmer Sun Cloud API | **Picked:** self-host + Tailscale **Funnel** + `warmersun.com/cloud` redirect. [H](#H). Ops still: keep the box up, Clerk origins, webhook URL. |
| **Clerk production** instance | Claim the keyless app; `pk_live_` / `sk_live_`; custom domain |
| [**B1**](#B1) Paid lesson modules | Clerk **Billing** not enabled |
| [**B2**](#B2) Quota by paid plan | same |
| [**E5**](#E5) Pathway gallery as a public site | Needs a host; images may need object storage (not picked) |
| [**E10**](#E10) Daily as warmersun.com homepage | Catalog site vs game process still two surfaces |
| [**F2**](#F2) Company seats on our Cloud | Clerk Organizations + Billing not on |
| Object storage (R2 / Tigris) | Only when gallery stills are real |
| Legal: ToS / privacy for **stored runs** | Site privacy exists; Cloud save is new data |
| Observability beyond console | Fine until we have a host |

[**E9**](#E9) (cross-device is why Sign in exists) is a product rule, not a feature — it is [C1](#C1)+[C3](#C3)+[A2](#A2). [**D3**](#D3) (what not to rank) is a rule, not work.

---

<a id="A"></a>
## A. Account as a door (not as the whole game)

<a id="A1"></a>
### A1. “You need an account for lessons and the official Daily” — **implemented** (Node gate + hub lock); Daily **count** still [D1](#D1); CDN leak still [H](#H)

**Idea.** Core invent (pick a theme, hex board, friends, surprise mission) stays open. The **catalog that we curate** — Daily, learning modules, sponsored spotlights — asks you to sign in. Reason: those are *our* drops, they cost us AI, and they only mean something if the same person can come back tomorrow.

**How.**  
- Tag tiles: `access: "open" | "account" | "paid"`. Default today’s theme play = `open`. Learning modules and official Daily = `account`.  
- Hub already splits Themes / Sponsored / Learning. Unsigned: Learning and Daily cards show a lock + Sign in.  
- **The browser lock is UX only.** The Node server (`server.mjs`) is the real gate: no session → no start token, no official Daily submit, no tutor context. That check is ordinary code on a process we already have **locally**.  
- `GET /api/quests` may list cards (title, access, price chip) for everyone; **bodies that matter** (`aiTutorContext`, full brief) stay off the wire until the server has allowed the user. **Starting** (`POST /api/runs`) and tutor AI (`POST /api/co-invent` in tutor mode) require a verified Clerk JWT. Do not trust a client-supplied `aiTutorContext` for a gated tile — load it from the server catalog by id after the check.  
- Self-host without Clerk keys: no gate (operator’s catalog, operator’s AI bill).  
- Do **not** hide the whole title screen behind Clerk. That kills self-host and Invent Night drop-ins.

**Public gate:** the [Cloud host](#H) on this machine, Funnel HTTPS, doorway at `warmersun.com/cloud`. here.now is files, not the gate.

**Softer variant:** anyone can *play* Daily; you need an account to **count** it (streak, leaderboard, “I held the pathway”). Practice vs official.

<a id="A2"></a>
### A2. Soft account, hard save — **implemented** (import + live run write; quest-log UI is [C1](#C1))

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
- Clerk **Billing**: two plans to start — **Cloud Free** (account, Daily, free lessons, modest AI) and **Cloud** (paid modules, higher AI). Optional add-on packs later.  
- Server checks `has({ plan, feature })` from Clerk **or** a local entitlements table filled by Billing webhooks (`subscription.*`). Same check on **start-run** and **tutor co-invent**, not only on the hub. Hub price chip is cosmetic.  
- Hub: paid cards show a price / “Included in Cloud”. Click without plan → Clerk `<PricingTable />` or Checkout. After pay, webhook → user can start.  
- Self-host without Clerk: all local `quests/` tiles playable (operator’s catalog, operator’s AI bill). Paywall is **Warmer Sun Cloud’s** catalog, not the engine.

<a id="B2"></a>
### B2. Meter the expensive bit (AI), not the hexes — **implemented** (free cap); **todo** (plan cap)

**Idea.** Hex invent is cheap. Co-inventor, Imagine, TTS are not. Free account: daily AI budget. Paid: higher cap. Prevents “free Cloud” from becoming an xAI invoice.

**How.** We already have usage JSONL + per-IP rate limits. Add per-`clerk_user_id` daily counters in the DB. `gateExpensive` consults identity when present: unsigned IP limit (LAN/self-host); signed Cloud uses user quota by plan. Return `402` / `429` with a plain message: *Today’s co-inventor energy is spent — comes back at midnight, or upgrade.*

<a id="B3"></a>
### B3. Sponsored lessons stay free (with a name) — **implemented**

**Idea.** A company pays **us** to author a spotlight (already have `sponsorName`). Player does not pay. That is advertising / patronage, not a student license.

**How.** Tile `access: "account"` + `entitlement: "catalog.free"` + sponsor fields. No Billing check. Optional: sponsor wants a *campaign id* in run records so they know how many people invented, not who the children are.

---

<a id="C"></a>
## C. Cloud memory (quests taken, achievements, continue)

Replace “this laptop remembers” with “your account remembers.”

<a id="C1"></a>
### C1. Quest log — **implemented**

**Idea.** A list: what you started, what you held, what collapsed, which Daily dates, which lesson N/M. Open it on your phone tomorrow.

**How.**  
Table `runs` (`id`, `clerk_user_id`, `quest_id`, `kind` daily|theme|lesson|friends, `started_at`, `ended_at`, `outcome` hold|collapse|abandon, `stars`, `year_reached`, `tech_ids[]`, `place`).  
Write on start and on outcome (the same moment we write `STORAGE_SOLVED` / run reports).  
`GET /api/me/runs`. Profile screen: list + filters. Unsigned: keep localStorage only.

Do **not** upload full hex boards in v1 unless we need Continue ([C3](#C3)). A log row is enough for “what I took.”

<a id="C2"></a>
### C2. Achievements — **implemented**

**Idea.** Consumer badges, not transcripts. *Held a pathway. Held three Dailies in a week. Used a converter to dock bits to atoms. Summoned all four challengers. Invented on a sponsored spotlight. First Friends hold.* Flavor in the practice’s language.

**How.**  
Table `achievements` (`clerk_user_id`, `code`, `unlocked_at`, `run_id`).  
Server awards on run complete from a small rules file (`js/server/achievements.mjs`) — never let the client say “I unlocked.”  
Surface: UserButton menu → Achievements, and a strip on the title screen when signed in.

<a id="C3"></a>
### C3. Continue the board — **ready** (v2; Neon can hold JSON)

**Idea.** Close the laptop mid-quest, open another device, board and crisis lights are still there.

**How.** Harder. Snapshot `hex` board JSON (we already strip data-URL art for multiplayer wire). Table `run_state` (current run, board blob, mission id, year, tutor flag). Debounced `PUT` while playing; restore on load if signed in. Cap blob size; store Imagine images by cache key, not inline. v2.

<a id="C4"></a>
### C4. Merge on first sign-in — **implemented** (solved-id union + last completed run; board continue is [C3](#C3))

**Idea.** People will invent unsigned, then Sign in. Don’t lose the local solved set.

**How.** One-shot import ([A2](#A2)). Conflict rule: union of solved ids; cloud wins on the last completed run if both exist (skip local `lastRun` when the account already has a `runs` row). Show a single toast: *Saved N quests to your account.* Mid-quest board snapshots stay [C3](#C3).

---

<a id="D"></a>
## D. Leaderboards (make Daily mean something)

Leaderboards only work if **everyone got the same job**. That is Daily (or a named seasonal quest), not “any theme you picked.”

<a id="D1"></a>
### D1. Daily hold board — **implemented**

**Idea.** UTC day D: one official mission (server-picked, same tile for all Cloud players). Leaderboard: who held the pathway, how early (calendar year in-game), stars, maybe fewest Wait ticks. Reset next day. Yesterday’s board stays readable.

**How.**  
- Server `GET /api/daily?date=YYYY-MM-DD` returns the canonical tile (stop hashing only in the browser).  
- On hold, `POST /api/daily/submit` with outcome stats. Server verifies session, checks the run is that day’s id, writes `daily_scores`.  
- `GET /api/daily/board` returns top N + **your** row. Display Clerk first name / chosen username, not email.  
- Anti-cheat v1 is modest: must have a server-started run id; ignore impossible years; one row per user per day (best score). Dedicated cheaters are a later problem.  
- Unsigned can still play a *local* daily; it does not submit.

<a id="D2"></a>
### D2. Seasonal / weekly — **implemented**

**Idea.** Invent Night already locks a Wednesday. Cloud can lock a **Quest of the week** — same spotlight for seven days, a week board, a champion strip on warmersun.com.

**How.** Same as [D1](#D1) with `period=2026-W34` instead of a date. Editorial: we publish the tile in `quests/` and point Daily/weekly at it.

<a id="D3"></a>
### D3. What not to rank

Don’t rank “most lessons completed” as if it were homework. Don’t rank AI tokens used. Rank **holds**, **honesty stars**, **streaks of showing up** — things that match the practice.

---

<a id="E"></a>
## E. Other consumer things that fit

<a id="E1"></a>
### E1. Public inventor page — **implemented** in-game; **todo** as `warmersun.com/u/…`

**Idea.** `warmersun.com/u/sic` — display name, badges, last few public holds, favorite emTech. Opt-in. Default private.

**How.** `users.profile` (`username` unique, `bio`, `public` bool). Username via Clerk or our table. Only publish runs with `share: true` (outcome screen already has a share card — add “Publish to my page”).

<a id="E2"></a>
### E2. Streaks (the Daily habit) — **implemented**

**Idea.** A fire for consecutive official Dailies, not for logging in. Invent Night is weekly; Daily is the solo habit.

**How.** Derived from `daily_scores`. Show on title chip: *3 days*. Missing a day breaks it. No guilt email.

<a id="E3"></a>
### E3. Pins in the cloud (watch later) — **implemented**

**Idea.** Three pins already exist locally. Signed-in, they follow you. “I want this mission when I have an hour.”

**How.** Table `pins` (max 3 server-side). Replace `future-forge:pins` when signed in.

<a id="E4"></a>
### E4. Friends rooms with real names — **implemented**

**Idea.** Invent with friends, but the host sees *Tamas*, not `Player 2`, and the run can land on everyone’s quest log.

**How.** On room create/join, pass Clerk user id (server already has the JWT on REST). Store `clerk_user_id` on the room player. Outcome fan-out: each signed-in player gets a `runs` row (`kind: friends`). Unsigned guests still play; they just don’t keep the souvenir.

<a id="E5"></a>
### E5. Pathway gallery (show the invent, not the grade) — **todo** (host; optional object storage)

**Idea.** A public feed of **held pathways**: place, stack, one-line how-it-works, vision still. TikTok-brain for inventing, not a student portfolio for a teacher.

**How.** Opt-in publish from outcome ([E1](#E1)). `GET /api/gallery` newest / daily-only. Report/hide button (young audience). No comments in v1 (moderation cost).

<a id="E6"></a>
### E6. Rematch / ghost — **ready**

**Idea.** “Your friend held today’s Daily in year 2034. Try to beat that year.” Not a live spectator sport.

**How.** Share link `?daily=2026-08-25&beat=user_…` loads the same tile plus a target year. On hold, compare. Could feed [D1](#D1).

<a id="E7"></a>
### E7. Founding / season badges — **ready**

**Idea.** First N Cloud accounts, or “Invent Night 2026,” as a cosmetic badge. Consumer myth, not a certificate.

**How.** `achievements` codes granted by webhook on `user.created` if `created_at` before a cutoff, or by attending a tagged Friends room.

<a id="E8"></a>
### E8. Display name, age gate, block — **ready**

**Idea.** Young audience is in the mission of the practice. Cloud needs a chosen name, a way to hide email, a way to block a gallery item. Still not a school.

**How.** Clerk username + our profile. Gallery report → operator queue (email). Keep it small.

<a id="E9"></a>
### E9. Cross-device is the actual reason to sign in

If we only paywall lessons and never save, people will screenshot. **C1 + [C3](#C3) + [A2](#A2)** are the product. Billing is how the catalog and AI get paid.

<a id="E10"></a>
### E10. Official Daily as a homepage ritual — **todo** (where the marketing site is served)

**Idea.** warmersun.com opens on *today’s place* — scene, one button, Sign in if needed. Marketing and game are the same object.

**How.** `GET /api/daily` is public (the tile). Start-run is not. Static site or the game title screen fetches it.

---

<a id="F"></a>
## F. If an org wants a commercial license

This is **not** “add Classes.” It is money + rights, matching `COMMERCIAL.md`.

<a id="F1"></a>
### F1. They want to **self-host** (company, consultancy, paid workshop as a business) — **implemented** (paper in `COMMERCIAL.md`)

**Idea.** They run Node. They bring their own xAI key. They do not need our Daily leaderboard. They pay for the **right** to use Future Forge commercially (internal training, client workshops, embedding).

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
### F3. They want to **resell hosting** (another cloud) — **implemented** (paper only)

**Idea.** Cloud / Managed Service tier in `COMMERCIAL.md`. Rare. Contract + branding rules. They are not our consumer.

**How.** Paper. Maybe a private source drop or a support retainer. Do not build multi-tenant white-label into v1 of Warmer Sun Cloud.

<a id="F4"></a>
### F4. Education institutions — **implemented** (paper; no classroom UX)

They need a paid **Education** license to self-host. We still **do not build classroom UX**. If a university wants seats on Cloud, treat them like [F2](#F2) (a company-shaped org) or send them to self-host. Do not grow a “for schools” SKU in the UI.

---

## Suggested order (if we do any of this)

Smallest path that makes Cloud *feel* real. Items 1–4 are **ready**. 5–8 wait on **todo** vendors or a host.

1. **`runs` log + first-sign-in import** ([C1](#C1), [C4](#C4), [A2](#A2)) — **implemented**  
2. **Server Daily + submit + 24h board** ([D1](#D1)) — **implemented** ([E10](#E10) homepage is **todo**)  
3. **Achievements + profile privacy** ([C2](#C2), [E1](#E1), [E2](#E2)) — **ready**  
4. **AI quota (free cap)** ([B2](#B2)) — **ready**; plan cap is **todo**  
5. **Paid lesson entitlements** ([B1](#B1)) — **todo** Clerk Billing  
6. **Friends identity** ([E4](#E4)) **ready**; **gallery** ([E5](#E5)) **todo** host  
7. **Continue board** ([C3](#C3)) — **ready** but v2  
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

- Gate **start** of Daily vs only **submit**?  
- Paid **modules** vs one monthly Cloud sub that unlocks all paid lessons?  
- Leaderboard public on the marketing site, or only in-game?  
- Username required, or “Tamas S.” from Clerk?  
- How brutal is the AI free cap? (This is a cost decision.)

Identity and the first Neon write are done. The next *useful* thing is probably **the quest log UI** ([C1](#C1)), then **one shared Daily**.

---

## Decisions locked

These are settled. Do not re-open them in implementation.

1. **No ORM.** This repo is vanilla JS, not TypeScript. Skip Drizzle, Prisma, and the rest. Talk to Neon with a Postgres driver (`pg` or `postgres`) and plain SQL (`CREATE TABLE`, migrations as `.sql` files under `js/server/db/`). Typed query builders buy nothing here.
2. **Clerk is identity; Neon is only Postgres.** Do not enable Neon Auth (or Supabase Auth, or a second user table that pretends to be login). Session JWT we already verify is the user. Neon stores `runs`, achievements, Daily scores — keyed by `clerk_user_id`.
3. **The Cloud host is the gate.** Two here.now Sites (public files vs gated files). Only the host process knows the gated credential. Neon, Clerk verify, entitlements, and AI for Cloud users live **on that host**, not on here.now. Self-host never talks to the gated Site. Details: [H](#H).
4. **v1 of that host is this machine, public via Tailscale Funnel**, advertised as `https://warmersun.com/cloud` (redirect). Not Fly/Railway until we outgrow a always-on box you already run. Use **Funnel** (public HTTPS, friends need no Tailscale), not **Serve** (tailnet-only). Same pattern as [friends over Funnel](multiplayer-internet-tailscale-funnel.md).

---

<a id="H"></a>
## H. The Cloud host — two here.now Sites

**Status:** architecture lock. **Where it runs (v1):** you self-host `server.mjs`; Tailscale **Funnel** gives a public `https://<machine>.<tailnet>.ts.net`; **`https://warmersun.com/cloud`** 302s there. Fly/Railway later if the box cannot stay up. here.now still cannot gate.

Warmer Sun Cloud is **not** the static game. It is a small always-on Node API that:

- Verifies Clerk JWTs  
- Owns Neon (`runs`, entitlements, quotas)  
- Pays xAI for Cloud users and meters it  
- Is the **only** client that can read gated catalog files  

here.now stays a **CDN for files**.

```
Browser
  │
  ├─ public here.now     free SPA, free catalog JSON, theme play
  │                      (anyone can GET)
  │
  └─ Cloud host API      Clerk + Neon + AI
         │
         └─ gated here.now   paid tiles, aiTutorContext, official Daily bodies
                             credential known only to the host
```

**Public Site** — game shell, open tiles, marketing. Free stuff never needs the host (except Cloud AI, if we even offer that unsigned — default: no).

**Gated Site** — password-protected (or a here.now **Drive** with an API key — same idea, better for servers). Browsers get 401. The host stores `HERENOW_GATED_SECRET` (or Drive token) in env, fetches JSON server-side, and only then returns a lesson to a Clerk user who is allowed.

**Why the host cannot be bypassed (for Cloud catalog):** the gated URL is useless without the secret. The secret never ships in `js/`. Leaking it is an ops incident (rotate), not “inspect element.” This is a **shared secret**, not per-user crypto — good enough to keep `aiTutorContext` off the public CDN.

**Self-host** is unchanged: local `quests/` + their `FF_XAI_API_KEY`. They never call the gated Site. They incur their own AI cost. That is the point.

**Extend the host later** without moving files: `/api/runs`, Daily submit, quotas, Billing `has()`, webhooks, Friends WS. One process, one Neon, one secret.

**Caveat:** confirm here.now **site password** is something Node can send (HTTP Basic / header), not only a browser interstitial + cookie. If it is cookie-only, use a **Drive + API key** instead of a passworded Site — same split, designed for server fetch.

**Does not live on here.now:** Neon, Clerk verify, WebSockets, xAI. Optional here.now **proxy** `/api/*` → Funnel is fine so the public SPA can look same-origin-ish; the gate is still this process.

### Where it runs (v1)

Same Node you already Funnel for friends rooms ([multiplayer Funnel](multiplayer-internet-tailscale-funnel.md)):

1. `npm start` (Cloud keys in `.env`: Clerk, `DATABASE_URL`, gated here.now secret, xAI).  
2. `tailscale funnel 8765` → `https://<machine>.<tailnet>.ts.net`.  
3. On the warmersun.com site: **`/cloud` → 302** to that Funnel URL (or to the public here.now SPA with API base set to Funnel). Pretty name; real origin is `*.ts.net`.

Use **Funnel**, not **Serve**. Cloud users and Clerk webhooks are not on your tailnet.

**Clerk / CORS**

- Dashboard allowed origins + `CLERK_AUTHORIZED_PARTIES`: `https://<machine>.<tailnet>.ts.net` (and `http://127.0.0.1:8765` for local). A redirect does **not** make Clerk cookies live on `warmersun.com`.  
- Webhooks: `https://<machine>.<tailnet>.ts.net/api/webhooks/clerk` (must stay the same hostname).  
- If the SPA stays on public here.now, it calls Funnel `/api/*` (we already allow CORS).

**Ops honesty:** laptop sleep = Cloud down. Funnel hostname changes if you rename the machine or tailnet — update the `/cloud` redirect, Clerk origins, and webhook URL together. That is acceptable for v1; a VPS is what you buy when that gets annoying.

---

<a id="G"></a>
## G. Outstanding building blocks — research and recommendation

**Researched:** 2026-08-25. Prices and plan names move; re-check before spending. This is the missing “where does the database live?” layer. Clerk is identity only. Cloud features in A–E all assume a store we do not have yet.

<a id="G0"></a>
### G0. Constraints of *this* stack (do not pretend we are Next.js)

| Constraint | Why it matters |
|------------|----------------|
| Long-running Node (`server.mjs`) | Not a serverless function. Friends rooms use **WebSockets**. Vercel / Netlify / Cloudflare Workers are the wrong shape. |
| Disk already in play | Shared TTS cache under `data/tts-cache/`. The process wants a volume, not a read-only lambda. |
| Clerk already chosen | Do not buy a second auth (Supabase Auth, Firebase Auth, PlayFab). |
| Catalog vs game | `warmersun.com` already publishes quest/trend JSON. The **game** is a Node process (`/forge` today). Cloud DB belongs next to the game, not inside the static site. |
| Scale | Sole prop, consumer, Invent Night + Daily. Hundreds of users first, not 100k DAU. **xAI tokens will dwarf the database bill.** |
| Self-host must stay simple | Hobby `npm start` without Cloud. No required Neon account for a LAN night. |

README already names the deploy shape: VPS or PaaS (Fly, Railway, Render), `npm start`, TLS in front.

<a id="G1"></a>
### G1. Outstanding blocks (the shopping list)

| Block | What it is | Bucket | Needed for |
|-------|------------|--------|------------|
| **1. App host** | Always-on Node + WS + HTTPS | **Picked v1:** this machine + Tailscale Funnel + `warmersun.com/cloud` | Public webhooks, [A1](#A1), [E5](#E5) |
| **2. Database** | Relational store keyed by `clerk_user_id` | **Implemented** — Neon, `.env` | [C1](#C1), [D1](#D1), [B2](#B2) |
| **3. Schema + migrations** | Versioned `.sql`, no ORM | **Ready** | Same |
| **4. Clerk → our DB** | Webhooks + JWT on writes | **Ready** — JWT done; webhook route is code | Names on the board, delete-account |
| **5. Public webhook URL** | TLS endpoint Clerk/Svix can POST | **Todo** — needs app host | (4) in production |
| **6. Backups** | PITR off the app disk | **Implemented** — Neon instant restore on the project | Not losing the quest log |
| **7. Clerk production instance** | `pk_live_` / claimed app | **Todo** | Real users on warmersun.com |
| **8. Billing** | Clerk Billing + `subscription.*` | **Todo** | [B1](#B1), [F2](#F2) |
| **9. Object storage** | Gallery stills | **Todo** — not picked | [E5](#E5) images |
| **10. Secrets / env** | `DATABASE_URL`, Clerk keys | **Implemented** locally; **todo** on a host | Deploy |
| **11. Observability** | Process up, webhook failures | **Todo** | Operating Cloud |
| **12. Legal** | Privacy / ToS for stored runs | **Todo** | Before storing runs |

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

**Build the schema against Postgres from day one. Prototype locally with Postgres (Neon free branch or Docker). Host Cloud Postgres on Neon. Host the Node process on Fly.io (or keep the current `/forge` host if it already does always-on Node + WS + a volume). Do not put the database on the app’s local disk in production.**

Why this split:

1. **Postgres** is what Clerk tutorials and every “top N + your score” query assume. Unique `(user_id, daily_date)`, window functions, backups you are not inventing.
2. **Neon** is the cheapest *managed* Postgres that does not pause-for-a-week, does not include a second auth product, and has a real free tier with commercial use. Clerk documents it. Scale-to-zero is acceptable: our Node is always on and will take a ~0.5s cold query after idle; Daily traffic is bursty. When Daily is a ritual, turn off scale-to-zero (Launch plan, still small money).
3. **Fly.io** matches the process we actually run (WebSocket rooms, TTS volume, `npm start`). Shared-cpu 1 GB is on the order of **$6/mo**. Volume for `data/tts-cache` is cents/GB. Region: `sea` or `yyz` (we are Vancouver-adjacent). Fly Managed Postgres at ~$38/mo is **not** worth it vs Neon.
4. **SQLite** is allowed as a **local-only** `FF_CLOUD_DB=sqlite:./data/cloud.sqlite` so `npm start` on a laptop can develop [C1](#C1) without Neon. Production Warmer Sun Cloud sets `DATABASE_URL=postgres://…`. If SQLite vs Postgres SQL diverges, drop the sqlite path rather than fork the schema.
5. **No ORM** — `pg` or `postgres` plus `.sql` migrations in `js/server/db/`. This repo is untyped JS; Drizzle/Prisma would be extra machinery. See **Decisions locked**.
6. **Webhooks:** `POST /api/webhooks/clerk`, `verifyWebhook` from `@clerk/backend`, env `CLERK_WEBHOOK_SIGNING_SECRET`. Local: `npx clerk webhooks listen --forward-to http://127.0.0.1:8765/api/webhooks/clerk` (first-party; skip ngrok unless that fails). Events: `user.created`, `user.updated`, `user.deleted`. Upsert `users(clerk_user_id, display_name, image_url)`.
7. **Writes from the game** still use the session JWT we already attach. Never trust a client-supplied `userId`.
8. **Object storage** later (Tigris on Fly, or R2) when gallery images are real. v1 leaderboard is names + numbers.
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

Infrastructure for save + Daily is cheap. Do not wait on a bigger host. Wait on schema + webhook + one `runs` table.

<a id="G5"></a>
### G5. First infra slice (when we leave ideation)

1. Claim Clerk app; keep using **dev** keys on localhost.  
2. Neon project `warmer-sun-cloud-dev`, region close to Fly. `DATABASE_URL` in `.env` (gitignored).  
3. SQL migrations: `users`, `runs` — nothing else. No ORM.  
4. `POST /api/webhooks/clerk` + `clerk webhooks listen` in dev.  
5. `POST /api/me/runs` (JWT required) + `GET /api/me/runs`.  
6. Only then: deploy Node to Fly (or current host) and point Clerk webhook at `https://…/api/webhooks/clerk`.

Skip paid lessons, gallery, and org seats until that loop is boringly reliable.

<a id="G6"></a>
### G6. Sources (2026)

- Clerk: [sync data with webhooks](https://clerk.com/docs/guides/development/webhooks/syncing), [Neon integration](https://clerk.com/docs/guides/development/integrations/databases/neon), [webhooks overview](https://clerk.com/docs/guides/development/webhooks/overview)  
- Neon vs Supabase vs Railway (SaaS Postgres, May–Aug 2026 roundups): free-tier pause vs scale-to-zero, Pro $25 floor vs Neon usage  
- Fly.io [resource pricing](https://fly.io/docs/about/pricing/) — machines, volumes, unmanaged vs managed Postgres  
- This repo: `README.md` deploy section; `server.mjs` long-running HTTP + `ws`; `data/tts-cache`; Clerk already in `.env`  
- Game BaaS pricing surveys (PlayFab / Nakama / LootLocker at 200–1k DAU) — used only as **negative** space

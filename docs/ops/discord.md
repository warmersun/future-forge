# Future Forge Discord — ops notes

**Purpose:** Pick up server admin without rediscovering IDs, permissions, or Week-0 layout.  
**Do not rebuild from zero.** Channels, pins, and events below are already live.  
**Stack lock:** site + shares · Discord · X. Invent-first copy. Host: Sic / Warmer Sun.

Related weekly loop: `docs/ops/invent-night-weekly-habit.md`.

---

## Identifiers

| Thing | Value |
|-------|--------|
| Guild | Future Forge · `1532063979239641219` |
| Invite (return path) | https://discord.gg/CXaaQWqrTj |
| Owner | Sic (`sic_warmersun`) · `565673600099680256` |
| Hermes application / bot user | `1543077530800488478` (app name **Hermes**; nick in this guild **Hermes**) |
| Hermes role (managed, Administrator) | `1543088293829156957` |
| Host role (Sic) | `1543089402081845320` |

Token lives in Hermes env as `DISCORD_BOT_TOKEN`. Never commit it. REST base: `https://discord.com/api/v10`.

---

## Live layout (Week 0 — done 2026-08-28)

Default Discord `#general` / **General** voice were reused, not duplicated.

| Category | Channel | ID | Job |
|----------|---------|----|-----|
| Start here | `#welcome` | `1543089368988782683` | How this server works. System/join channel. |
| Start here | `#general` | `1532063979961057423` | Hangout. Invents do **not** go here. |
| Invent | `#inventions` | `1543089373824815217` | One-sentence invents. |
| Invent | `#invent-nights` | `1543089377062690919` | When / where. |
| Invent | `#prompts` | `1543089381055791205` | Prompts that helped inventing. |
| Invent | `#install-help` | `1543089384490795048` | Unstick the table. |
| Voice | **Invent Night** | `1532063979961057424` | Online night + screen share. |

Each text channel has a **topic** and **one pinned intro** (Hermes). Edit the pin rather than posting a second manifesto.

Server description: *Inventing practice. Connect emerging tech to a real problem. You invent. AI helps. You lead.*

---

## Events (do not double-book Wednesday)

| Event | When (Vancouver) | Where |
|-------|------------------|--------|
| Future Forge Live In-Person | Wed 2 Sept 2026, 18:30–20:30 | VPL Central (external). Luma https://luma.com/83h0kdy5 |
| Future Forge Invent Night — Sep 9 — free 60 min | Wed 9 Sept 2026, 18:30–19:30 | Voice **Invent Night** (`1543089944422252614`) |

Weekly default remains **Wednesday 18:30–19:30 America/Vancouver**, online Discord, unless that week is posted IRL. Title format: `Future Forge Invent Night — [Mon D] — free 60 min`.

---

## Hermes admin (the actual failure mode)

The bot can sit in the guild with **zero extra permissions**. First invite used Developer Portal `install_params.permissions: "0"`. Then it only has `@everyone`, and `@everyone` cannot create channels, pin, or patch the guild.

**Re-grant Administrator** (updates the existing bot; does not add a second one), while logged in as owner:

https://discord.com/oauth2/authorize?client_id=1543077530800488478&permissions=8&scope=bot%20applications.commands&guild_id=1532063979239641219&disable_guild_select=true

Check: `GET /users/@me/guilds` → this guild’s `permissions` bit `ADMINISTRATOR` (`1<<3`). Discord also creates the managed **Hermes** role.

Manual fallback: Server Settings → Roles → role with Administrator **above** `@everyone` → assign to the bot.

Hermes `discord` / `discord_admin` **toolsets are Discord-gateway only**, not CLI/desktop. From this repo/session, use the REST API with the bot token. Do not print the token.

---

## API pitfalls (already hit)

1. **One parent at a time.** `PATCH /guilds/{id}/channels` with several `parent_id` changes → `40009`. Move each channel with `PATCH /channels/{id}` `{parent_id}`, then reorder positions without parent changes.
2. **Bot nick.** `PATCH /guilds/{id}/members/{bot_id}` `{nick}` → 403. Use `PATCH /guilds/{id}/members/@me` `{nick: "Hermes"}`.
3. **Probe channels.** If a permission probe creates a throwaway channel, **delete it immediately**. Do not leave `#ff-perm-probe`.
4. **Do not create a competing online event** on a Wednesday that is already IRL.

---

## Copy rules (when editing pins)

- Lead with **inventing practice**, not “learning game.”
- Table: https://warmersun.com/forge/
- Story: https://warmersun.com/future-forge/
- Count invents, not followers / vibes.
- Underclaim: free invent night, no fake partners, no university-program theater.

---

## Next time (only if needed)

- New Wednesday: Discord scheduled event + one post in `#invent-nights` (T-7 in the habit OS). Prefer Events over a second link tool.
- Do **not** add TikTok / extra Discord channels until four nights have actually run (habit rule 6).
- Developer Portal: set the bot’s global username if it still shows as `bot1543…` outside this guild (nick is already Hermes here).
- X pin (habit 3.1) is still open; not a Discord job.

# Output contract

1. Write UTF-8 JSON file (pretty-printed OK).
2. Confirm player-facing prose matches `references/scene-prose.md`:
   - `mission.scene` — spine + punch rhythm; ≤500 characters; open design challenge
   - `mission.briefMd` **The place** — longer lived story, same craft; no solution theater
3. Run `npm run validate:quest -- <file>`.
4. Exit only when validation prints `OK:`.
5. Tell the user:
   - Path to the file
   - **Preferred for multiplayer/class:** copy into the game repo’s `quests/` folder, then open/refresh Future Forge (External Quests on home + theme pick)
   - **Or** open Future Forge → **Import Quest…** (per browser; can replace Daily)
   - Spotlight tech name and one-line invent invitation

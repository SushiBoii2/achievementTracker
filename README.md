# AchievementTracker (Vencord userplugin)

Tracks Discord-usage achievements client-side, ranked **Bronze → Silver → Gold →
Platinum → Mythic → Hidden → Ascendant → Transcendent**, with secret variants,
and saves your progress to a **local JSON file you choose yourself** (no
Discord/Anthropic/third-party server involved).

## Install

1. Copy this whole `achievementTracker` folder into `src/userplugins/` in
   your Vencord dev checkout (folder name **must** be `achievementTracker`,
   camelCase).
2. Run your normal Vencord build (`pnpm build` / `pnpm buildWeb`, or just
   `pnpm dev` from the Vencord repo) and inject as usual.
3. Enable **AchievementTracker** in Vencord's plugin list.
4. Open its settings and click **"Choose save file location"** — pick any
   `.json` file/path on your computer. Nothing is tracked or persisted until
   you do this (by design — no default hidden write location).

## Customizing the look (new)

In the plugin's settings there's now a **Rarity Appearance** panel: for each
tier (Bronze → Transcendent) plus a separate row for Secret achievements,
you can set:
- **Icon** — type any emoji or short glyph
- **Text color** — native color picker
- **Background color** — native color picker

Changes apply live to the achievements window and the tab pills. There's a
**Reset to Defaults** button if you want to go back to the tinted defaults.

## Opening the window (new)

Three ways in, all equivalent:
1. The 🏆 toolbar button (see below)
2. **Settings → Quick Access → "Open Achievements Window"** button
3. A global keyboard shortcut, default **Ctrl+Shift+Alt+A**, fully
   rebindable from **Settings → Keyboard Shortcut → "Change Shortcut"**
   (click it, then press whatever combo you want; Esc cancels)

## Where's the button?

A 🏆 trophy icon is added to Discord's top toolbar — the same row as the
Inbox / Help icons in the top-right, visible on the Friends page and inside
every server/DM (the exact spot you circled in your screenshot). Click it to
open the achievements browser.

**Fallback:** that toolbar patch targets Discord's internal renderer, which
occasionally shifts after a Discord client update (this is normal for *any*
Vencord plugin that adds toolbar icons, not specific to this one). If the
icon ever disappears after an update, type `/achievements` in any chat box —
it opens the exact same window and doesn't depend on the toolbar patch at
all.

## What's actually tracked

Everything with a progress bar in the achievement list is driven by real
Discord client events (Flux dispatcher) or is computed from data Discord
genuinely exposes to the client: your message count, reactions given/received,
voice/stream time, friends added, servers joined/created, unique emojis used,
thread participation, poll votes, login streaks, exact-timestamp sends (like
`07:07:07`), and your account's true creation date (decoded from your user
ID's snowflake, so age-based achievements like *Anniversary* / *Discord
Elder* are always exactly correct — no tracking needed for those).

A handful of "secret" achievements use short-lived in-memory correlation
(e.g. *Oops...* = delete within 3s of sending; *Ghost Ping* = same, but the
message also pinged someone; *Echo* = you're the first to react to your own
message; *Double Take* = identical message content sent ~1 year apart).

## What was intentionally skipped

The original list (~420 entries) includes a large number of achievements
that **no Discord client plugin can honestly track**, because the data
either lives only on Discord's backend, depends on other users' private
actions, or refers to real-world events with no API:

- Anything requiring **global rankings** ("top 1% of users", "first 100
  users worldwide", "top 0.1% completion")
- Anything about **other people's** actions you have no visibility into
  (who else reacted with what within N seconds across a whole server,
  whether a friend equips a matching avatar, moderation history in servers
  you don't moderate)
- **Real-world astronomical/calendar events** (solar eclipses, blue moons)
  that would need an external API and aren't really "Discord achievements"
- Anything gated behind **Discord's own backend systems** with no client
  read-access (random gifts *from Discord itself*, Partner/Verified status
  grants, exact Nitro-boost-country distribution, "profile views" — Discord
  doesn't expose a views counter)
- A few **purely subjective/unverifiable** ones ("without triggering
  Slowmode" is approximated, not strictly verified)

These are simply not present in `achievements.ts` rather than being included
as fake/non-functional entries — per the instruction to skip what isn't
truly possible. If you want any of the borderline ones added anyway as
manual/self-reported achievements (a button you click to claim them
yourself), that's an easy follow-up.

## Data & privacy

All data lives only in the JSON file you pick. Nothing is sent anywhere.
You can open the file yourself at any time — it's plain readable JSON.

# AchievementTracker (Vencord userplugin)

Tracks Discord-usage achievements client-side, ranked **Bronze → Silver → Gold →
Platinum → Mythic → Hidden → Ascendant → Transcendent**, with secret variants,
and saves your progress **locally and automatically** via Vencord's built-in
DataStore (browser-local IndexedDB) — no Discord/Anthropic/third-party server
involved, and no setup required.

## Install

1. Copy this whole `achievementTracker` folder into `src/userplugins/` in
   your Vencord dev checkout (folder name **must** be `achievementTracker`,
   camelCase).
2. Run your normal Vencord build (`pnpm build` / `pnpm buildWeb`, or just
   `pnpm dev` from the Vencord repo) and inject as usual.
3. Enable **AchievementTracker** in Vencord's plugin list. That's it —
   tracking and saving both start immediately, nothing else to configure.

## v2 changes (this update)

- **Storage rewritten to auto-persist.** Previously progress only saved if
  you manually picked a JSON file in Settings; if you never did, everything
  reset on every restart, which is why achievements silently "didn't work"
  for a lot of people. Progress now saves itself via Vencord's DataStore
  (IndexedDB) the moment anything changes. The old file-picker is still
  there, but repurposed as an **Export/Import backup** tool for moving your
  progress to a new machine.
- **Toolbar icon patch replaced with a reliable one.** The old patch guessed
  at brittle, frequently-renamed internal class names (`privateChannels`,
  etc.), which is why the button could vanish after a Discord update. It now
  hooks the same stable `toolbar:_,mobileToolbar:_` destructure that
  actively-maintained plugins like MessageLoggerEnhanced use, via a real
  `HeaderBarIcon` component so it matches Discord's native icon styling.
  The old, unreliable sidebar/user-panel button patches were removed in
  favor of this one solid entry point (plus the `/achievements` command and
  the Settings quick-access button, which never depended on any patch).
- **A batch of previously-defined-but-unreachable achievements were wired
  up** (`Rapid Fire`, `Recognizable`, `Wrong Window`, `The Cleaner`, DM/Group
  DM tracking, etc.) — they existed in the list but had no code path that
  could ever unlock them.
- **~35 new achievements** were added from a pasted community list, covering
  message formatting (spoilers, code blocks, all-caps, base64, tables...),
  media uploads (video/audio/archives/data volume), reactions, nicknames,
  camera-on, and a few of the fun/secret ones (tableflip spam, "Nondeez",
  hint-button spam, Nandos). See "What was intentionally skipped" below for
  what wasn't added and why.
- **Notification popups hardened** against React 18 vs. legacy `ReactDOM`
  API differences, so they render either way instead of silently failing.
- **A couple of achievements that genuinely can't be auto-detected**
  (`About Me`, `Profile Complete`) now have a **"Mark as achieved"** button
  right on their row in the achievements window, since there's no Discord
  event to hook for "you filled out your bio."

## Customizing the look

In the plugin's settings there's a **Rarity Appearance** panel: for each tier
(Bronze → Transcendent) plus a separate row for Secret achievements, you can
set an icon, text color, and background color. Changes apply live. There's a
**Reset to Defaults** button too.

## Opening the window

Four ways in, all equivalent:
1. The 🏆 toolbar button (top-right header row, same row as Inbox/Help)
2. **Settings → Quick Access → "Open Achievements Window"** button
3. Typing `/achievements` in any chat box
4. A global keyboard shortcut, default **Ctrl+Shift+Alt+A**, rebindable from
   **Settings → Keyboard Shortcut → "Change Shortcut"**

If you run this alongside `vc-message-logger-enhanced`, the 🏆 icon sits to
the left of its logs button in the same toolbar. That ordering comes from
Vencord loading userplugins alphabetically by folder name, so
`achievementTracker` patches the toolbar before `vc-message-logger-enhanced`
does — if a future Vencord update ever changes that load order and flips the
two, let me know and I'll pin the order explicitly instead of relying on it.

## What's actually tracked

Everything with a progress bar is driven by real Discord client events (Flux
dispatcher) or computed from data Discord genuinely exposes to the client:
message count and content patterns, reactions given/received/removed,
voice/stream/camera time, friends added, servers joined/created, nickname
changes, unique emojis used, thread participation, poll votes, login
streaks, exact-timestamp sends (like `07:07:07`), attachment types/sizes,
and your account's true creation date (decoded from your snowflake ID, so
age-based achievements are always exactly correct).

A handful of "secret" achievements use short-lived in-memory correlation
(e.g. *Oops...* = delete within 3s of sending; *Wrong Window* = that,
followed by "wrong chat" within 15s; *The Cleaner* = exactly 404 of your own
messages deleted in one calendar day; *Echo* = you're the first to react to
your own message).

## What was intentionally skipped

Both the original list and the larger pasted list include entries that **no
Discord client plugin can honestly track**, because the data either lives
only on Discord's backend, depends on other users' private actions, needs
real-world location data, or refers to things with no client-visible event:

- **Global rankings** or cross-server aggregate stats
- **Real-world location** (continents/states/countries visited — no travel
  API a Discord client plugin can access)
- Things gated behind **other people's client state** you can't observe
  (exact "everyone else left the server" ordering, a specific person's DND
  status streak, whether Discord itself is showing you a random gift)
- A few **client-settings-over-time** ones where Discord doesn't expose a
  "changed at" history (theme/streamer-mode/invisible-status streaks across
  app restarts) — these would need to survive the app being fully closed
  with no way to know how long it was closed for
- Ones needing an unverifiable exact real-time race (e.g. two users sending
  in the same channel at the exact same second) if there's no reliable
  client-side signal for it

These are simply not present in `achievements.ts` rather than included as
fake/non-functional entries. A very small number that are plausible but
unverifiable (`About Me`, `Profile Complete`) are included with a manual
"Mark as achieved" toggle instead of automatic detection — ask if you'd like
more of the borderline ones added the same way.

## Backup & Restore

Settings → **Backup & Restore** lets you export your current progress to a
JSON file, or import one back in (merged with, not overwriting, whatever's
already tracked). This is optional — normal play doesn't need it.

## Data & privacy

All data lives only in your browser-local Vencord storage (IndexedDB) unless
you explicitly export it. Nothing is sent anywhere.

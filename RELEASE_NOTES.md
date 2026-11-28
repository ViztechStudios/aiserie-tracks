# RELEASE NOTES

## Aiserie Tracks v4.5.0 — Foundation & Finish

A repair-and-craft update aimed squarely at what testers felt on device: the bottom rail vanishing, a launch experience that looked unfinished, and an app icon that never seemed to change. Everything below is visible the moment you update.

### The bottom rail always shows now

- **Fixed the "buttons below are missing but still clickable" bug.** On Android (new architecture), the screens layer carries explicit z-index values of its own while the tab rail had none — the device could stack the opaque screen canvas **over** the rail, hiding HOME · WALLETS · + · REPORTS · FINANCE while taps still fell through to them.
- The rail now carries an explicit, deterministic z (index + elevation, scoped to its own layer so modals, sheets and toasts are untouched). The rail can no longer lose a stacking fight on any platform or device.

### A new app icon — and this one changes

- The mark is redrawn from scratch: **the Ledger A** — one geometric A on a deep pine field, a single mango-gold node at the apex (the track's peak). The old orbit-ring + sparkle + bars composition is gone.
- Every launcher layer is rebuilt: legacy icon, adaptive foreground / background / monochrome (Android 13+ themed icons included), plus 192/512/maskable web icons and the iOS apple-touch icon. If your launcher caches the old artwork, a device restart re-reads it.
- The same mark now leads the whole identity — boot curtain, PWA install icon, browser favicon.

### The launch actually looks finished

- **Native splash rebuilt.** The old splash art had a light mint background baked into it — a square sticker floating on the deep green launch screen. The new splash is a transparent glyph designed for the jungle canvas, centered, calm.
- **Boot curtain simplified.** Away with the orbiting satellite, the three ticks and the sheen sweep; what remains is the monogram settling onto a frosted tile, the wordmark, and one honest progress line. Boot is ~15% shorter (1.25s curtain minimum) and completely loop-free.
- **PWA opens polished too.** The web app used to sit on a bare background while the bundle downloaded; it now paints an inline, theme-aware Ledger A splash the instant the page opens and dissolves it the moment the app mounts — zero extra network requests.

### Small overlaps and rough edges, fixed

- The Finance money-plan amount can no longer wrap mid-number on narrow phones ("₱25,675.0 / 0") — the envelopes badge drops to its own row instead so the money line keeps its full width.
- Re-audited Home, Wallets, Reports and Finance at small-phone sizes in both themes: content clears the rail, month chips and the wallet strip scroll cleanly, nothing clips.

### Unchanged on purpose

- No features removed, no layout restructured, no data touched. Backup/restore, budgets, bills, goals, recurring rules, reports, receipt scanning and purchase detection all behave exactly as v4.4.0.
- No new permissions, no new network calls (the PWA boot splash is inline HTML/CSS).

### For testers

- 48 logic tests pass — `npm test`.
- Verified on the web build: rail visible on every screen (dark + light, 390px and 360px), boot curtain and PWA splash sequences, launcher icon set generated at every density.

## Aiserie Tracks v4.4.0 — Polish & Poise
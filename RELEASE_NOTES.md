# RELEASE NOTES

## Aiserie Tracks v4.3.0 — Showroom Match

The app now looks exactly like the mockups on the Aiserie website: a deep jungle-night canvas with a moonlit aurora glow, and frosted glass panes floating straight on it. Same identity, every feature kept — and the website is now one tap away from inside the app.

### The showroom look

- **Jungle night by default** — the app opens on the deep green canvas (`#0B241A`) with a moonlit mint glow up top and a whisper of gold; the light mint paper stays one tap away in Settings. Users who already picked a scheme keep it.
- **Glass on an open canvas** — page headers are transparent veils now: no painted fern blocks anywhere, the frosted panes sit directly on the aurora, exactly like the site mockups. Screen titles stay in the display serif.
- **A brighter accent** — links, the active tab and focus marks use the site's mint-teal; income is mint green, expenses coral.
- **Home, redrawn to the mockup** — the safe-to-spend hero ("SAFE TO SPEND TODAY", with `+in / −out` chips), the total-balance and savings-rate tiles, the advisor line, and a compact RECENT pane whose "See all" expands into the full month ledger with chips, search and filters. Wallet strip, streak and scan/settings actions all stay.
- **Wordmark tab rail** — HOME · WALLETS · [+] · REPORTS · FINANCE as quiet uppercase labels; the active tab turns mint with a springing dot. The Insights tab is now labelled "Reports" (the page is still Insights).
- **Wallets** — the hero reads "Across N wallets · synced on-device" like the mockup, and the history header gained a `+₱X this month / −₱X this month` delta chip for the wallet you're browsing.
- **Light mode kept coherent** — every hero ink, chip and trio tile is theme-aware; the status bar now follows the scheme instead of always-white.

### Fixes

- **Tab bleed (the "overlapping tabs" report)** — page content scrolled beneath the rail used to ghost through the tab labels; the rail is now a solid ink of the canvas with a hairline edge, so nothing ever shows through. Screens also keep more clearance above the rail.
- Month chips render correctly on the transparent headers in both themes (selected = deep pine pill in light, gold in dark).

### New: the website, in-app

- Settings → Updates → **Visit the Aiserie website** opens [aiserie-tracks-site.onrender.com](https://aiserie-tracks-site.onrender.com/) — the feature tour, the 22-wallet catalog and install guides.
- The About card carries a link pill to the same site.

### Unchanged on purpose

- No feature was removed or redesigned away: the wallet deck, receipt scanning, purchase detection, backup/restore, budgets, bills, goals, chores, recurring rules and reports all work as in v4.2.0.
- No new permissions, no new network calls (the update check remains the only one), no biometrics.

### For testers

- 48 logic tests cover balances, transfers, recurring scheduling, backup validation and fidelity, PIN hashing + lockout, amount parsing and compaction — `npm test`.
- Verified on the web build: home/wallets/reports/finance/settings in both themes, the See-all expansion, and both website links.

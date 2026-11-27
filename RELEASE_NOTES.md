# RELEASE NOTES

## Aiserie Tracks v4.4.0 — Polish & Poise

A refinement update with one goal: everything you touch and see should feel calm, crisp and professional. No new features to learn — the same app, noticeably better behaved.

### Bank & e-wallet tiles, re-engineered

- The 22 brand logos (GCash, Maya, Coins.ph, GrabPay, ShopeePay, BPI, BDO, Metrobank, AUB, UnionBank, Security Bank, Landbank, RCBC, PNB, China Bank, EastWest, PSBank, Maribank, GoTyme, CIMB, Tonik, Cash) were inconsistent before: different baked-in margins, corner radii and optical sizes, so a big black Maya blob sat next to a tiny Grab bag in a white square.
- Every asset is now a **tight, edge-to-edge squircle with one uniform corner radius** (`scripts/logo_normalize.py` — crop to tile, square-pad, re-round, optimize). Same weight everywhere: the wallet deck, the dock, the home wallet strip, the wallet list, the 22-brand picker and the transaction-sheet chips.
- A new shared `BrandLogo` renderer clips each tile to the matching radius and adds a hairline edge, so white tiles stay legible on glass and on mint paper.

### Calm motion, everywhere

- **Presses no longer bounce.** Every tappable surface now sinks slightly on touch and settles back on a smooth ease-out — the springy release overshoot is gone app-wide (press depths are gently dampened too).
- **Sections enter quietly.** Cards fade and rise a short distance on a smooth ease; the springy pop on every section is gone.
- **The tab dot fades in** instead of springing; the theme-segment pill, toast, update sheet, chore check-offs and empty-state mascots all settle on eases now.
- **Chart bars grow without overshoot**; the money counters land with a 2% settle instead of a 4.5% pulse; the mascots breathe ~40% slower and shallower.
- One deliberate exception family remains untouched: the boot curtain and privacy shield keep their cinematic moments — those are meant to be seen.

### Unchanged on purpose

- No features removed, no layout restructured, no data touched. Backup/restore, budgets, bills, goals, recurring rules, reports, receipt scanning and purchase detection all behave exactly as v4.3.0.
- No new permissions, no new network calls.

### For testers

- 48 logic tests pass — `npm test`.
- Verified on the web build: deck/dock/picker/list tiles at every size, both themes, and the full press/entrance motion pass.

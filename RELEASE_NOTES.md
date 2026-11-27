# RELEASE NOTES

## Aiserie Tracks v4.2.0 — Stability, Security & Release Readiness

A refinement update on top of v4.1.0 "Orbit & Frost": same identity, same frosted-glass look, same features — everything just works better.

### Stability

- Fixed the startup/interaction crash reported on v4.1.0 ("Attempting to run JS driven animation on animated node that has been moved to 'native'") — the app-wide shared theme animation value was removed; every animated value is now owned by the component that renders it, so this crash class cannot come back.
- Corrupted storage is no longer overwritten with empty data: a damaged payload is quarantined on disk before the app ever writes fresh state, and one broken key can no longer take the other stores down.
- A failed "replace" restore now restores your previous data automatically instead of leaving the device empty.
- Boot feels ~1.2 s faster — the Orbit & Frost intro still plays, but the enforced wait behind it is shorter.

### Security & privacy

- Wrong PIN attempts now trigger a real lockout: 30 s after the 3rd try, doubling up to 5 minutes, persisted across restarts.
- The PIN hash is now key-stretched (1,200 SHA-256 rounds); v4.0/4.1 hashes upgrade transparently after your next successful unlock.
- Fixed a deadlock where the privacy curtain could bury the PIN pad after backgrounding the app before unlocking.
- "Erase all data" now really erases everything, including the theme preference, update marker and any quarantined copies.
- Removed an unused native dependency (expo-blur) from the app.

### Data integrity

- Backups carry the privacy-shield preference again (it was exported but silently dropped on restore since v4.0).
- Merge restore tells you the true number of new records and warns when a recurring rule from the file already exists here by name, amount and frequency.
- Export filenames no longer collide when you back up twice in the same minute.
- "Reclaim storage space" now previews what it will delete and asks first — it was the one destructive action without a confirmation.
- Monthly recurring schedules keep their anchor day: a January-31 salary now lands on Mar 31 instead of drifting to the 28th forever.

### Financial accuracy

- Reconciling an overdrawn wallet to a negative balance no longer silently flips the sign (a "-500" correction used to save +500).
- Amount fields understand European-style input ("1.250,50") without misreading it a thousand-fold.
- Week-over-week insights bucket days in local time (was UTC, off by one in the Americas).
- Category breakdowns can no longer disagree with headline totals when a category id is unknown.
- Budget alerts announce the highest crossing of a pass (was: whichever budget was checked last), and old alert history is pruned so storage stays tidy.
- Goals say so when a piggy is full instead of quietly discarding the excess.

### Performance

- Ledger rows are memoized: editing one transaction no longer re-renders every row of the ledger.
- Wallet balances are computed once per change, not per card per render; the streak scan and JSON serialization moved off the hot path.

### Interface polish

- Fixed the tab rail on notched iPhones (icon plates poked over the rail's top edge), camera buttons buried under the rail on the Scan screen, the currency picker pinned under the status bar, sheets and modal headers ignoring safe areas, the mascot overlapping the safe-to-spend figure, and the blue-tinted dark transaction sheet (now fern-tinted).
- Toasts now speak in tones: green for saved, red for errors. Saving, editing and deleting transactions, wallets, budgets and bills give visible feedback everywhere.
- Screen-reader labels added across the tab rail, PIN pad, quick actions and icon buttons.

### For testers

- 48 logic tests cover balances, transfers, recurring scheduling (including the new anchor behavior), backup validation and fidelity, PIN hashing + lockout, amount parsing and compaction — `npm test`.

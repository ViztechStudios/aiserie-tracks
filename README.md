# Aiserie Tracks

A jungle-green **personal finance tracker** that runs as a **native Android app (APK)**, an **iPhone/iPad app**, and an **installable PWA** — built with [Expo](https://expo.dev), React Native and TypeScript.

v4.1.0 "Orbit & Frost" completes the product identity: the **Orbit A monogram** now leads every icon, splash and boot moment, cards are **frosted glass** over a softly lit aurora backdrop, and the boot screen is a quiet orbit around the mark — on top of v4.0.0's privacy shield and the crash-proofing work from v3.x–v4.0.

![stack](https://img.shields.io/badge/Expo-SDK%2058-0EA5E9) ![platform](https://img.shields.io/badge/Android%20%7C%20iOS%20%7C%20Web-Expo%20EAS%20%2B%20PWA-22D3EE) ![cost](https://img.shields.io/badge/distribution-%240-success)

## Features

- **🫧 Glassmorphism, done tastefully** — every card is a frosted pane: translucent fill, hairline edge, soft top sheen, real depth from the aurora orbs behind it. Dark mode included, cross-fading live
- **🅰️ One mark everywhere** — the Orbit A monogram (letter, orbit ring, ascending bars, spark) drives the app icon, Android adaptive layers, favicon, PWA icons and every launch screen; `scripts/brand_sync.py` regenerates the whole set from one master SVG
- **🐾 Two companions, redrawn** — the pup and tabby are now clean flat illustrations (no sticker outlines); they wave from the lock gate, recovery screen and empty states
- **🫥 Privacy shield** — balances hide behind a branded curtain whenever you leave the app; lifts on return, under the optional PIN pad. Toggle in Settings → Privacy & storage
- ** Income & expense log** — categories, wallets, dates, notes; tap to edit, long-press to delete
- **👛 Wallets & balances, one tap each** — 22 official brand tiles (GCash, Maya, Coins.ph, GrabPay, ShopeePay, BPI, BDO, Metrobank, AUB, UnionBank, Security Bank, Landbank, RCBC, PNB, China Bank, EastWest, PSBank, Maribank, GoTyme, CIMB, Tonik, Cash). The logo, name and color fill in automatically — just type the balance. Custom wallets still supported
- **🔔 Purchase detection** — paste any e-wallet/bank SMS or notification text and Aiserie reads the amount + direction on-device, then pre-fills a transaction. No message access, no monitoring
- **🧾 Receipt scanning** — on-device OCR (ML Kit) reads the total from a photo of a receipt and defaults to the *Groceries* category. Nothing is uploaded. (PWA falls back to manual entry.)
- **🧠 Finance advisor** — safe-to-spend per day, month-end projections, savings rate, category concentration warnings, momentum and recurring-bill reminders
- **✅ Things-to-do** — money chores with springy check-offs, star pinning, progress ring
- **🐷 Savings goals** — piggy banks with progress, contributions and withdrawals
- **🚀 Update nudges** — on boot the app checks GitHub Releases; when a newer version exists, a glass "Update available" card deep-links to `releases/latest` (3-day snooze, manual check in Settings)
- **📊 Visual reports** — category donut chart, 6-month income/expense bars, month-by-month navigation
- **₱ Philippine-first** — default currency is **PHP**, switchable to USD, EUR, GBP, JPY, SGD and more
- **💙 Personal** — greets the user by name (default **Aiserie**, editable in Settings)
- **🔒 Private by design** — all data on-device (AsyncStorage on native, localStorage on web). No account, no cloud, no tracking. Privacy Policy & T&C included in-app
- **📱 Responsive** — phones and tablets, with a mobile-first web layout and real `<input type="date">` on web
- **💾 Backup & restore** — one JSON file with everything, exported on-device; import validates first, then merges without duplicating — or replaces everything after a double confirmation
- **📊 Reports (CSV & PDF)** — income, expenses, category breakdown, wallet balances and every transaction for any period
- **🔁 Recurring transactions** — daily/weekly/monthly/yearly schedules with deterministic ids so re-runs never duplicate money
- **🔔 Budget alerts** — envelopes notify once at 50 / 75 / 90 / 100% (configurable), reset each month
- **🛡️ Crash-proof by design** — malformed records are repaired at load or paused, never fatal; a root error boundary swaps any render bug for a branded recovery screen; the boot curtain has a *Continue anyway* escape; every money counter runs on disjoint animation-driver graphs

## Project structure

```
aiserie-tracks/
├── App.tsx                     # providers + navigation root
├── index.ts                    # registerRootComponent entry
├── app.json                    # Expo config (icons, splash, web/PWA, baseUrl)
├── eas.json                    # EAS profiles: preview (APK), production (AAB)
├── assets/                     # runtime assets (icon set, mascots, textures, bank tiles)
├── assets-art/                 # source art (master SVGs + mascot sources)
├── public/                     # PWA static assets (copied into every web export)
│   ├── icons/                  # 192 / 512 / maskable-512 manifest icons
│   ├── splash/                 # per-device iPhone startup images
│   ├── apple-touch-icon.png    # iOS home screen icon (180×180)
│   └── sw.js                   # offline-shell service worker
├── scripts/
│   ├── brand_sync.py           # regenerates every icon & splash from the master mark
│   ├── mascot_sync.py          # redraws the three companion illustrations
│   └── patch-pwa-html.mjs      # post-export PWA patcher (manifest, iOS meta, SW)
├── .github/workflows/
│   ├── web-deploy.yml          # every push -> web build -> GitHub Pages (PWA)
│   ├── android-apk.yml         # manual dispatch -> runner-built APK -> GitHub Release
│   └── eas-build.yml           # manual dispatch -> Expo cloud APK/AAB builds
└── src/                        # app code (components, screens, store, utils…)
```

## Run locally

```bash
npm install
npx expo start          # native: scan QR with Expo Go
npx expo start --web    # web: opens http://localhost:8081 in the browser
```

In Expo Go everything works except on-device OCR — the scan screen falls back to manual entry.

## Distribute at zero cost

| Platform | How users get it | Cost | Automation |
| --- | --- | --- | --- |
| **Android** | Signed **APK** downloaded from a GitHub Release | ₱0 — no Play Console needed | `android-apk.yml` (manual dispatch) |
| **iPhone / iPad** | **PWA** — Safari → Share → *Add to Home Screen* | ₱0 — no Apple Developer fee | `web-deploy.yml` on every push |
| **Future Play Store** | `eas build -p android --profile production` → **AAB** | $25 one-time, only when you decide | same workflow, `profile: production` |
| **Future App Store** | EAS iOS build → **.ipa** | $99/yr, only when you decide | same workflow, `platform: ios` |

### 1. iOS as an installable PWA (fully automatic)

Every push to `main` builds the web app (`npm run export:web` = `expo export --platform web` + PWA patcher) and publishes it to **GitHub Pages** with free HTTPS. All installability requirements are handled by the patcher: `manifest.webmanifest`, `apple-touch-icon`, per-device startup images, standalone meta and an offline service worker.

Live URL: `https://viztechstudios.github.io/aiserie-tracks/`

**iPhone install steps (shown in-app too, Settings → Install on iPhone):**
open the site in **Safari** → **Share** □↑ → **Add to Home Screen** → **Add**. Aiserie launches full-screen with its own icon and splash — no App Store, no fee.

### 2. Android as a downloadable APK

Latest release: [Releases → latest](https://github.com/ViztechStudios/aiserie-tracks/releases/latest) → download `AiserieTracks-v<version>.apk` → allow *"install unknown apps"* for the browser when Android asks → install. Updating keeps every record; existing installs see the update nudge automatically.

Two build paths, both signed with the same keystore so installs upgrade cleanly:

```bash
# A) GitHub runner (default — does not consume EAS cloud quota)
#    repo → Actions → "Android APK (runner build)" → Run workflow
#    the run attaches the APK straight to the matching GitHub Release

# B) Expo EAS cloud (30 free builds/month)
npx eas build -p android --profile preview     # -> signed installable APK
```

### 3. Alternative web hosting (Vercel / Cloudflare Pages)

The export is a plain static folder, so any free static host works. For root-domain hosting, set the base path to empty in `app.json` first:

```jsonc
"experiments": { "baseUrl": "" }   // then: npm run export:web
```

```bash
npx vercel dist --prod                # Vercel
npx wrangler pages deploy dist        # Cloudflare Pages
```

(GitHub Pages keeps the `/aiserie-tracks` base path configured in `app.json`.)

## Brand assets — one mark, every surface

The **Orbit A** is drawn parametrically as SVG (`scripts/brand_sync.py`) and rendered to PNG; `scripts/mascot_sync.py` redraws the companion illustrations. Both regenerate the entire brand set, so a future identity tweak is always synced to the app icons:

```bash
python3 scripts/brand_sync.py     # icon, favicon, splash, adaptive layers, PWA icons, 14 launch screens
python3 scripts/mascot_sync.py    # mascot-wave / mascot-duo / mascot-advisor
```

## Tests

Pure logic (balances, transfers, monthly totals, recurring scheduling, backup validation, budget alerts, PIN hashing) is covered by a dependency-free test suite:

```bash
npm test        # 40 assertions — exits non-zero on any failure
```

## Security & privacy notes

- All data stays in AsyncStorage on-device; the only network call is the GitHub releases update check (public version number only). Backup files and reports are written locally or shared via the system share sheet — nothing is uploaded.
- Backup import validates structure and sanitizes every entry (drops corrupt rows, dedupes ids, clamps values) before anything is written.
- Permissions are minimal: camera (receipt scanning) only.

## Receipt scanning notes

- OCR uses [`@react-native-ml-kit/text-recognition`](https://github.com/AugmentedMode/react-native-ml-kit) (Google ML Kit), fully **on-device**; the module is loaded lazily and never bundled into the web build.
- In **Expo Go** and on **web** the app detects the missing native module and falls back to manual entry instead of crashing.

## Tech stack

Expo SDK 58 · React Native 0.88 · react-native-web (PWA) · TypeScript · @react-navigation/bottom-tabs · AsyncStorage · expo-linear-gradient · expo-camera · react-native-svg · @react-native-ml-kit/text-recognition

---

Made with 🐾 by ViztechStudios · MIT licensed

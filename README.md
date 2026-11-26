# Aiserie Tracks 🐾

A jungle-green, hand-drawn **personal finance tracker** that runs as a **native Android app (APK)**, an **iPhone/iPad app**, and an **installable PWA** — built with [Expo](https://expo.dev), React Native and TypeScript. v3.0.0 "Piggy banks & polish" is the biggest update yet: **animated money counters** everywhere, **savings goals**, **search & filters**, an **optional PIN app lock**, a **storage meter with reclaim**, and a **40 % smaller APK** — on top of the v2.7.0 reliability work (backup & restore, CSV/PDF reports, recurring transactions, budget alerts) and the v2.6.0 hand-drawn Fern & Bark rebrand.

![stack](https://img.shields.io/badge/Expo-SDK%2058-0EA5E9) ![platform](https://img.shields.io/badge/Android%20%7C%20iOS%20%7C%20Web-Expo%20EAS%20%2B%20PWA-22D3EE) ![cost](https://img.shields.io/badge/distribution-%240-success)

## Features

- **🌙 Dark mode, done properly** — System / Light / Dark switch in Settings; dark is a deep **midnight navy glass** with glowing sky accents, and every surface (aurora wash, headers, glass cards, tab bar, modals) **cross-fades live** when you flip the switch
- **🐾 One brand, everywhere** — hand-drawn *Fern & Bark* badge (pup, tabby and a peso-coin) across the **iOS app icon**, Android adaptive icons (with monochrome layer), native splash, favicon, PWA manifest icons and per-device iOS launch screens; boot curtain with a gold badge plate, floating motion, sheen sweep and the *Made by Viztech Studios* credit
- **🔁 Logo changes are one command** — `python3 scripts/brand_sync.py` redraws the master logo and regenerates **every** icon and splash (iOS included) from it, so the app icon can never drift out of sync again
- **Income & expense log** — categories, wallets, dates, notes; tap to edit, long-press to delete
- **👛 Wallets & balances, one tap each** — pick from **22 official brand tiles**: GCash, Maya, Coins.ph, GrabPay, ShopeePay, BPI, BDO, Metrobank, AUB, UnionBank, Security Bank, Landbank, RCBC, PNB, China Bank, EastWest, PSBank, Maribank, GoTyme, CIMB, Tonik and Cash. The logo, name and color fill in automatically — just type the balance. Balances adjust as you log transactions; reconcile in one tap. Custom wallets still supported.
- **🔔 Purchase detection** — paste any e-wallet/bank SMS or notification text and Aiserie reads the amount + direction on-device, then pre-fills a transaction. No message access, no monitoring.
- **🧾 Receipt scanning** — point your camera at a grocery receipt and on-device OCR (ML Kit) reads the total, defaults to the *Groceries* category. Nothing is uploaded. (PWA falls back to manual entry.)
- **🧠 Finance advisor** — safe-to-spend per day, month-end projections, savings rate, category concentration warnings, momentum and recurring-bill reminders
- **✅ Things-to-do** — money chores with springy check-offs, star pinning, progress ring
- **🚀 Update nudges** — on boot the app checks GitHub Releases; when a newer version exists, a glass "Update available" card deep-links to `releases/latest` (3-day snooze, manual check in Settings)
- **📊 Visual reports** — category donut chart, 6-month income/expense bars, month-by-month navigation
- **₱ Philippine-first** — default currency is **PHP**, switchable to USD, EUR, GBP, JPY, SGD and more
- **💙 Personal** — greets the user by name (default **Aiserie**, editable in Settings)
- **🔒 Private by design** — all data on-device (AsyncStorage on native, localStorage on web). No account, no cloud, no tracking. Privacy Policy & T&C included in-app.
- **📱 Responsive** — phones and tablets, with a mobile-first web layout and real `<input type="date">` on web
- **✨ Gentle animations** — entrance fades, count-up balances, springy press feedback, animated theme cross-fade
- **💾 Backup & restore** — one JSON file with everything (transactions, wallets, budgets, bills, recurring, tasks, settings), exported on-device; import validates the file first, then merges without overwriting or duplicating existing records — or replaces everything after a double confirmation. Perfect for moving to a new phone
- **📊 Reports (CSV & PDF)** — income, expenses, category breakdown, wallet balances and every transaction for any period: this/last month, last 3 months, year, all time or custom range. CSV opens in Excel/Sheets; the PDF is branded and readable
- **🔁 Recurring transactions** — schedule salary, rent or subscriptions daily/weekly/monthly/yearly; Aiserie logs them automatically with **deterministic ids so re-runs and restores never duplicate money**. Pause, edit or delete any time; a 90-day backfill horizon keeps old schedules from flooding the ledger
- **🔔 Budget alerts** — envelopes notify once when spending reaches 50 / 75 / 90 / 100% (configurable per budget), reset each month, and a month summary shows caps vs actual spending

## Project structure

```
aiserie-tracks/
├── App.tsx                     # providers + navigation root
├── index.ts                    # registerRootComponent entry
├── app.json                    # Expo config (icons, splash, web/PWA, baseUrl)
├── eas.json                    # EAS profiles: preview (APK), production (AAB)
├── public/                     # PWA static assets (copied into every web export)
│   ├── icons/                  # 192 / 512 / maskable-512 manifest icons
│   ├── splash/                 # per-device iPhone startup images
│   ├── apple-touch-icon.png    # iOS home screen icon (180×180)
│   └── sw.js                   # offline-shell service worker
├── scripts/
│   └── patch-pwa-html.mjs      # post-export PWA patcher (manifest, iOS meta, SW)
├── .github/workflows/
│   ├── web-deploy.yml          # every push -> web build -> GitHub Pages (PWA)
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
| **Android** | Signed **APK** downloaded from a GitHub Release | ₱0 — no Play Console needed | EAS Build workflow (manual dispatch) |
| **iPhone / iPad** | **PWA** — Safari → Share → *Add to Home Screen* | ₱0 — no Apple Developer fee | `web-deploy.yml` on every push |
| **Future Play Store** | `eas build -p android --profile production` → **AAB** | $25 one-time, only when you decide | same workflow, `profile: production` |
| **Future App Store** | EAS iOS build → **.ipa** | $99/yr, only when you decide | same workflow, `platform: ios` |

### 1. iOS as an installable PWA (fully automatic)

Every push to `main` runs `.github/workflows/web-deploy.yml`: it builds the web app (`npm run export:web` = `expo export --platform web` + PWA patcher) and publishes it to **GitHub Pages** with free HTTPS. All installability requirements are handled by the patcher:

- `manifest.webmanifest` — name, standalone display, portrait, theme colors, icons at 192/512/maskable
- `apple-touch-icon` + per-device `apple-touch-startup-image` splash screens (7 iPhone sizes)
- `apple-mobile-web-app-capable` meta set → launches full-screen from the Home Screen icon
- Service worker → offline shell

**One-time setup:** repo → *Settings* → *Pages* → *Build and deployment source* → **GitHub Actions** (or the deploy job's first run will surface the exact button). Live URL:
`https://viztechstudios.github.io/aiserie-tracks/`

**iPhone install steps (shown in-app too, Settings → Install & share):**
open the site in **Safari** → **Share** □↑ → **Add to Home Screen** → **Add**. Aiserie now launches full-screen with its own icon and splash — no App Store, no fee.

### 2. Android as a downloadable APK

**✅ v3.0.0 APK is live:** [Releases → v3.0.0](https://github.com/ViztechStudios/aiserie-tracks/releases/latest) → download `AiserieTracks-v3.0.0.apk` → allow *"install unknown apps"* for the browser when Android asks → install. v3.0.0 ("Piggy banks & polish") adds animated money counters, savings goals, search & filters on the ledger, an optional 4-digit PIN app lock, and a storage meter with a one-tap reclaim — plus the APK ships only ARM chips (arm64 + armv7), roughly halving the download. Updating keeps every record; existing installs see the update nudge automatically.

How it was built, and how future versions get built (Expo free tier, 30 builds/month):

```bash
npm install -g eas-cli
eas login                                  # free Expo account
npx eas init                               # already done — projectId 7009b2cc… lives in app.json
eas build -p android --profile preview     # -> signed installable APK
```

Then attach the new APK to a release: Releases page → Edit → drag & drop, or `gh release upload <tag> app-release.apk`.

> CI also works: `EXPO_TOKEN` is already configured as a repository secret, so the **EAS Build** workflow can build from the Actions tab (manual dispatch, platform `android`, profile `preview`) — no local commands needed.

### 3. Alternative web hosting (Vercel / Cloudflare Pages)

The export is a plain static folder, so any free static host works. For root-domain hosting, first set the base path to empty in `app.json`:

```jsonc
"experiments": { "baseUrl": "" }   // then: npm run export:web
```

```bash
# Vercel
npx vercel dist --prod

# Cloudflare Pages
npx wrangler pages deploy dist
```

(GitHub Pages keeps the `/aiserie-tracks` base path configured in `app.json`.)

### Future store compatibility

Nothing needs to be rebuilt: the same codebase produces store artifacts whenever you want them — `production` profile already outputs an **AAB** with `autoIncrement` for Play, and `eas build -p ios --profile production` produces the App Store **IPA**. Bundle IDs (`com.aiserie.tracks`) are already configured for both.

## Brand assets — one logo, every surface

The logo is drawn as a parametric SVG in the same flat style as the in-app mascots and rendered to PNG. `scripts/brand_sync.py` regenerates the entire brand set from that single master, so a future logo update is always synced to the app icons (iOS included):

```bash
python3 scripts/brand_sync.py   # redraws + rewrites everything below
```

Regenerated outputs: `assets/icon.png` (1024 — this is what EAS uses for the **iOS app icon** and Android legacy icon), `assets/favicon.png`, `assets/splash-icon.png` (native splash + boot curtain), `assets/android-icon-{foreground,background,monochrome}.png`, `public/icons/icon-{192,512,maskable-512}.png`, `public/apple-touch-icon.png` (iOS home-screen web icon) and all 14 `public/splash/startup-*.png` iOS launch screens.

## Tests

Pure logic (balances, transfers, monthly totals, recurring scheduling, backup validation, budget alerts) is covered by a dependency-free test suite:

```bash
npm test        # 29 assertions — exits non-zero on any failure
```

## Security & privacy notes

- All data stays in AsyncStorage on-device; the only network call is the GitHub releases update check (public version number only). Backup files and reports are written locally or shared via the system share sheet — nothing is uploaded.
- Backup import validates structure and sanitizes every entry (drops corrupt rows, dedupes ids, clamps values) before anything is written.
- `npm audit --omit=dev` reports 3 *moderate* advisories inside Expo's build tooling (`minimatch` via `@expo/fingerprint`) — build-time only, not shipped in the app; fixing them requires force-upgrading the Expo SDK.
- Permissions are unchanged: camera (receipt scanning) only. No biometrics in this version, per project scope.

## Receipt scanning notes

- OCR uses [`@react-native-ml-kit/text-recognition`](https://github.com/AugmentedMode/react-native-ml-kit) (Google ML Kit), fully **on-device**; the module is loaded lazily and never bundled into the web build.
- Works in development and production builds created with EAS. In **Expo Go** and on **web** the app detects the missing native module and falls back to manual entry instead of crashing.

## Tech stack

Expo SDK 58 · React Native 0.88 · react-native-web (PWA) · TypeScript · @react-navigation/bottom-tabs · AsyncStorage · expo-linear-gradient · expo-camera · react-native-svg · @react-native-ml-kit/text-recognition

## Security note

The GitHub token and any Expo access token used during setup were shared in chat — **rotate/revoke both** in GitHub → Settings → Developer settings and expo.dev → Account Settings → Access tokens once everything is running.

---

Made with 🐾 by ViztechStudios · MIT licensed

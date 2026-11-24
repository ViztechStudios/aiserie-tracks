# Aiserie Tracks 🌊

A light-blue, ocean-gradient **personal finance tracker** that runs as a **native Android app (APK)**, an **iPhone/iPad app**, and an **installable PWA** — built with [Expo](https://expo.dev), React Native and TypeScript.

![stack](https://img.shields.io/badge/Expo-SDK%2058-0EA5E9) ![platform](https://img.shields.io/badge/Android%20%7C%20iOS%20%7C%20Web-Expo%20EAS%20%2B%20PWA-22D3EE) ![cost](https://img.shields.io/badge/distribution-%240-success)

## Features

- **Income & expense log** — categories, wallets, dates, notes; tap to edit, long-press to delete
- **👛 Wallets & balances** — track GCash, Maya, bank accounts and cash in one read-only view. Balances are set manually (never connected, never logged in) and auto-adjust as you log transactions to them; reconcile in one tap.
- **🔔 Purchase detection** — paste any e-wallet/bank SMS or notification text and Aiserie reads the amount + direction on-device, then pre-fills a transaction. No message access, no monitoring.
- **🧾 Receipt scanning** — point your camera at a grocery receipt and on-device OCR (ML Kit) reads the total, defaults to the *Groceries* category. Nothing is uploaded. (PWA falls back to manual entry.)
- **🧠 Finance advisor** — safe-to-spend per day, month-end projections, savings rate, category concentration warnings, momentum and recurring-bill reminders
- **📊 Visual reports** — category donut chart, 6-month income/expense bars, month-by-month navigation
- **₱ Philippine-first** — default currency is **PHP**, switchable to USD, EUR, GBP, JPY, SGD and more
- **💙 Personal** — greets the user by name (default **Aiserie**, editable in Settings)
- **🔒 Private by design** — all data on-device (AsyncStorage on native, localStorage on web). No account, no cloud, no tracking. Privacy Policy & T&C included in-app.
- **📱 Responsive** — phones and tablets, with a mobile-first web layout and real `<input type="date">` on web
- **✨ Gentle animations** — subtle entrance fades, count-up balances, soft press feedback

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

**✅ v1.3.0 APK is live:** [Releases → v1.3.0](https://github.com/ViztechStudios/aiserie-tracks/releases/tag/v1.3.0) → download `AiserieTracks-v1.3.0.apk` → allow *"install unknown apps"* for the browser when Android asks → install. v1.3.0 adds the Tasks (things-to-do) tab, the glass UI overhaul and app-wide animations; **Android 13+ only** (minSdk 33). Updating from v1.2.0 keeps all data. The in-app Settings → **Get the Android app (APK)** row (visible on the PWA) links to `releases/latest` directly.

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

## Receipt scanning notes

- OCR uses [`@react-native-ml-kit/text-recognition`](https://github.com/AugmentedMode/react-native-ml-kit) (Google ML Kit), fully **on-device**; the module is loaded lazily and never bundled into the web build.
- Works in development and production builds created with EAS. In **Expo Go** and on **web** the app detects the missing native module and falls back to manual entry instead of crashing.

## Tech stack

Expo SDK 58 · React Native 0.88 · react-native-web (PWA) · TypeScript · @react-navigation/bottom-tabs · AsyncStorage · expo-linear-gradient · expo-camera · react-native-svg · @react-native-ml-kit/text-recognition

## Security note

The GitHub token and any Expo access token used during setup were shared in chat — **rotate/revoke both** in GitHub → Settings → Developer settings and expo.dev → Account Settings → Access tokens once everything is running.

---

Made with 🌊 by ViztechStudios · MIT licensed

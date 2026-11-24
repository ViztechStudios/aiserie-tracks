# Aiserie Tracks 🌊

A light-blue, ocean-gradient **personal finance tracker** for **iOS and Android**, built with [Expo](https://expo.dev) and React Native.

![stack](https://img.shields.io/badge/Expo-SDK%2058-0EA5E9) ![platform](https://img.shields.io/badge/iOS%20%26%20Android-Expo%20EAS-22D3EE)

## Features

- **Income & expense log** — categories, dates, notes; tap to edit, long-press to delete
- **🧾 Receipt scanning** — point your camera at a grocery receipt and on-device OCR (ML Kit) reads the total, defaults to the *Groceries* category. Nothing is uploaded; all recognition happens on the phone.
- **🧠 Finance advisor** — rule-based coaching: safe-to-spend per day, month-end projections, savings rate, category concentration warnings, week-over-week momentum and recurring-bill reminders
- **📊 Visual reports** — category donut chart, 6-month income/expense bars, month-by-month navigation
- **₱ Philippine-first** — default currency is **PHP**, switchable to USD, EUR, GBP, JPY, SGD and more in Settings
- **🔒 Private by design** — all data lives on-device (AsyncStorage). No account, no cloud, no tracking.

## Project structure

```
aiserie-tracks/
├── App.tsx                  # providers + navigation root
├── app.json                 # Expo config (name, icons, splash, permissions)
├── eas.json                 # EAS build profiles (preview APK, production)
├── .github/workflows/
│   └── eas-build.yml        # GitHub -> Expo cloud builds
└── src/
    ├── components/          # header, cards, charts, transaction modal…
    ├── data/                # categories, currencies, sample data
    ├── navigation/          # bottom tabs with center Scan FAB
    ├── screens/             # Home, History, Scan, Advisor, Settings
    ├── store/               # FinanceContext (storage) + UIContext (modals)
    ├── theme.ts             # ocean-gradient design tokens
    └── utils/               # money, stats/advisor engine, receipt parser
```

## Run locally

```bash
npm install
npx expo start
```

Scan the QR code with **Expo Go** on your phone (App Store / Play Store). In Expo Go everything works except on-device OCR — the scan screen falls back to manual entry there.

## Publish to iOS and Android (GitHub → Expo, fully connected)

This repo ships with **`.github/workflows/eas-build.yml`**, so GitHub can trigger Expo cloud builds for you. One-time setup:

1. **Create a free Expo account** at [expo.dev](https://expo.dev), then:
   ```bash
   npm install -g eas-cli
   eas login
   npx eas init        # links this repo to an Expo project, writes projectId into app.json
   ```
2. **Create an Expo access token**: expo.dev → Account Settings → **Access Tokens** → New token.
3. **Add it to GitHub**: this repo → *Settings* → *Secrets and variables* → *Actions* → New repository secret → name `EXPO_TOKEN`.
4. Push to `main` (or run the **EAS Build** workflow manually from the Actions tab) — GitHub builds the app in Expo's cloud:
   - **Android**: `preview` profile produces an **APK** you can install directly on any phone; `production` produces an **AAB** for Google Play.
   - **iOS**: build on EAS's macOS cloud runners — no Mac needed. `production` produces an `.ipa` for App Store Connect (requires the [Apple Developers Program](https://developer.apple.com/programs/)).

Prefer building from your computer? `eas build -p android --profile preview` works too.

### Store listings

- **Google Play**: one-time $25 fee, then submit the AAB from the `production` profile.
- **App Store**: $99/yr Apple Developer Program, then submit the `.ipa` (or use `eas submit`).

## Receipt scanning notes

- OCR uses [`@react-native-ml-kit/text-recognition`](https://github.com/AugmentedMode/react-native-ml-kit) (Google ML Kit), fully **on-device**.
- Works in development builds and production builds created with EAS. In **Expo Go** the native module is unavailable — the app detects this and lets you enter the total manually instead of crashing.

## Tech stack

Expo SDK 58 · React Native 0.88 · TypeScript · @react-navigation/bottom-tabs · AsyncStorage · expo-linear-gradient · expo-camera · react-native-svg · @react-native-ml-kit/text-recognition

## Security note

The GitHub token used to create this repository was shared in chat and should be **revoked and regenerated** in GitHub → Settings → Developer settings after setup is complete.

---

Made with 🌊 by ViztechStudios · MIT licensed

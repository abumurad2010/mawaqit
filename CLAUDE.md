# CLAUDE.md — Mawaqit

## 1. Project Overview

**Mawaqit | مواقيت** is a React Native / Expo mobile app for Islamic prayer times, Qibla direction, Quran reading, and Islamic supplications (athkar).

- **Target platforms**: iOS (primary), Android, Web (PWA)
- **Framework**: Expo SDK 54, React 19, React Native 0.81
- **Routing**: Expo Router 6 (file-based, similar to Next.js)
- **Language**: TypeScript (strict mode)
- **Current version**: 1.1.6 (iOS buildNumber 9, Android versionCode 9)
- **Bundle IDs**: `com.mawaqit.app` (both platforms)
- **EAS Project ID**: `d5cbdb82-1df0-4afd-8015-5e50919eac1b`

---

## 2. Directory Structure

```
mawaqit/
├── app/                        # Expo Router screens (file-based routing)
│   ├── _layout.tsx             # Root layout: fonts, providers, notification handler
│   ├── (tabs)/                 # Bottom-tab main UI
│   │   ├── _layout.tsx         # Tab bar configuration
│   │   ├── index.tsx           # Prayer Times (main screen)
│   │   ├── calendar.tsx        # Hijri/Gregorian calendar
│   │   ├── qibla.tsx           # Qibla compass
│   │   ├── athkar.tsx          # Islamic supplications
│   │   ├── quran.tsx           # Quran surah list
│   │   └── settings.tsx        # All app settings (~127KB, largest file)
│   ├── surah/[number].tsx      # Scrollable surah reader
│   ├── surah-transliteration/[number].tsx
│   ├── quran-reader.tsx        # Mushaf page-by-page reader (604 pages)
│   ├── search.tsx              # Quran full-text search
│   ├── bookmarks.tsx           # Saved ayah bookmarks
│   ├── about.tsx
│   ├── privacy.tsx
│   └── quran-toc.tsx
│
├── assets/
│   ├── sounds/
│   │   ├── athan.mp3           # Bundled athan (used for playback)
│   │   └── athan.wav           # WAV version (661 KB)
│   ├── quran.json              # Full offline Quran (Uthmani, 114 surahs)
│   └── quran-surah-names.json
│
├── components/                 # Reusable UI components
│   ├── AppLogo.tsx
│   ├── ErrorBoundary.tsx / ErrorFallback.tsx
│   ├── ThemeToggle.tsx / LangToggle.tsx
│   ├── LocationModal.tsx       # GPS + manual location picker
│   ├── MosqueFrame.tsx
│   ├── TimeRoller.tsx          # Time picker wheel
│   └── KeyboardAwareScrollViewCompat.tsx
│
├── constants/
│   ├── i18n.ts                 # 15-language translations (566 lines)
│   ├── colors.ts               # Light/dark/accessibility theme tokens
│   ├── typography.ts           # Font family definitions
│   ├── athkar-data.ts          # Supplications database (110 KB)
│   └── thikr-reminders.ts      # Thikr reminder items (15 KB)
│
├── contexts/
│   └── AppContext.tsx          # Single global context (settings, location, bookmarks)
│
├── lib/
│   ├── prayer-times.ts         # USNO prayer algorithm, 14 calc methods
│   ├── audio.ts                # Athan playback (expo-audio)
│   ├── audio.web.ts            # No-op web stub
│   ├── notifications.ts        # Prayer + thikr notification scheduling
│   ├── notifications.web.ts    # No-op web stub
│   ├── qibla.ts                # Great-circle bearing
│   ├── hijri.ts                # Gregorian ↔ Hijri conversion
│   ├── quran-api.ts            # Bundled Quran data accessors
│   ├── quran-transliteration.ts
│   ├── quran-translations.ts
│   ├── method-by-country.ts    # Default prayer method per country code
│   ├── maghrib-offsets.ts      # Country-specific Maghrib adjustments
│   ├── query-client.ts         # React Query config
│   └── prev-tab.ts             # Previous tab tracking
│
├── server/                     # Express.js backend (Replit hosting)
│   ├── index.ts                # Express setup, CORS
│   ├── routes.ts               # GET /api/adhan (audio serving)
│   ├── cache/                  # Pre-built audio files
│   └── storage.ts
│
├── public/                     # Web PWA assets
│   ├── manifest.json
│   ├── sw.js                   # Service worker
│   └── icon-192.png, icon-512.png
│
├── widgets_disabled/           # iOS home screen widget (currently disabled)
│   ├── MawaqitWidget.tsx
│   └── MawaqitWidget.native.tsx
│
├── app.json                    # Expo config (version, bundle IDs, plugins)
├── eas.json                    # EAS Build profiles + App Store submission
├── package.json
├── tsconfig.json               # Strict mode, @/* alias → root
├── metro.config.js             # Custom blocklist (excludes .local/)
└── babel.config.js
```

---

## 3. Key Files

| File | Purpose |
|------|---------|
| `app/_layout.tsx` | Root layout: loads fonts, wraps providers, sets up notification listeners that trigger `playAthan()` |
| `app/(tabs)/_layout.tsx` | Bottom tab bar; reverses tab order for RTL languages |
| `app/(tabs)/index.tsx` | Prayer times screen; date navigation, slide animation, swipe gesture |
| `app/(tabs)/settings.tsx` | All settings; 127 KB, heaviest file; draft state pattern throughout |
| `contexts/AppContext.tsx` | Single source of truth for all persisted state |
| `lib/prayer-times.ts` | Pure USNO astronomical calculation, no external API |
| `lib/audio.ts` | Athan playback with session-ID race-condition guard |
| `lib/notifications.ts` | Schedules 7 days of prayer + thikr notifications |
| `constants/i18n.ts` | All UI strings in 15 languages + RTL detection |
| `constants/colors.ts` | All color tokens; pass `isDark` to get the right palette |

---

## 4. Architecture

### State Management
One React Context (`AppContext`) holds all persisted state. No Redux. No Zustand.

```
AsyncStorage ←→ AppContext ←→ useApp() hook → any component
```

`updateSettings(partial)` merges and persists to AsyncStorage. Computed values (`isDark`, `isRtl`, `colors`, `maghribOffset`, `resolvedSecondLang`) are derived inside the context.

### Routing
Expo Router file-based routing. The `(tabs)` folder creates the bottom tab bar automatically. Dynamic routes like `surah/[number].tsx` use `useLocalSearchParams()`.

### Provider Stack (app/_layout.tsx)
```
ErrorBoundary
  SafeAreaProvider
    QueryClientProvider
      GestureHandlerRootView
        AppProvider
          Stack (Expo Router)
```

### Platform Stubs
Files ending in `.web.ts` are automatically picked by Metro on web builds. `lib/audio.web.ts` and `lib/notifications.web.ts` are no-ops that prevent native module crashes.

### Notification → Audio Flow
```
Scheduled notification fires
  → addNotificationReceivedListener (foreground)
  → addNotificationResponseReceivedListener (background tap)
  → if data.playAthan === true → playAthan(data.athanType)
```

### Prayer Time Calculation
Pure JS, offline, no external API. `lib/prayer-times.ts` implements the USNO algorithm for 14 calculation methods. Input: lat/lng/date/method. Output: named prayer times as `HH:MM` strings.

---

## 5. Important Packages

| Package | Version | Why |
|---------|---------|-----|
| `expo` | ~54.0.27 | Core framework and managed workflow |
| `expo-router` | ~6.0.17 | File-based navigation (required by Expo SDK 54) |
| `expo-audio` | ~1.1.1 | Athan playback; **use the new expo-audio API, not expo-av** |
| `expo-av` | ^16.0.8 | Legacy; still installed but prefer expo-audio for new audio code |
| `expo-notifications` | ~0.29.14 | Local scheduled notifications for prayer times and thikr |
| `expo-location` | ~19.0.8 | GPS coordinates for prayer time calculation |
| `expo-blur` | ~15.0.8 | Tab bar glass effect on iOS |
| `react-native-reanimated` | ~4.1.1 | Animations (date swipe, transitions) |
| `@tanstack/react-query` | ^5.83.0 | Used minimally; mainly for Quran transliteration API caching |
| `@expo-google-fonts/amiri` | | Arabic text rendering |
| `@expo-google-fonts/inter` | | UI text |
| `drizzle-orm` | ^0.39.3 | ORM for the Express server (Replit deployment only) |
| `express` | ^5.0.1 | Backend for audio file serving on Replit |
| `zod` | ^3.24.2 | Schema validation (server) |

### expo-audio API (important)
`expo-audio` (`~1.1.1`) uses a **different API** from the older `expo-av`. Key differences:

```ts
// expo-audio (correct)
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

setAudioModeAsync({
  playsInSilentMode: true,
  shouldPlayInBackground: false,  // NOT staysActiveInBackground
  interruptionMode: 'duckOthers', // NOT shouldDuckAndroid
  shouldRouteThroughEarpiece: false, // NOT playThroughEarpieceAndroid
  allowsRecording: false,
});

const player = createAudioPlayer(source);
player.volume = 1.0;
player.play(); // Call play() directly — don't wait for status event
```

The `AudioStatus` shape: `{ playing, isLoaded, didJustFinish, currentTime, duration, ... }`.

---

## 6. Known Issues and Workarounds

### iOS Home Screen Widget — Disabled
Widget code exists in `widgets_disabled/` but is not integrated. Expo's widget support (`expo-widgets`) was not stable enough at build time. Do not move files back into the main tree without verifying compatibility with current Expo SDK.

### Metro Blocklist
`metro.config.js` excludes `.local/` with a custom blocklist regex. This prevents Metro's file watcher from crashing when Claude Code or other agents write temporary files during sessions.

### Legacy Notification Format Migration
Old notification preferences were stored as plain strings (`'banner'`, `'athan_full'`, `'athan_abbreviated'`). `AppContext.tsx` migrates these on load to the current object format `{ banner: boolean, athan: 'none' | 'full' | 'abbreviated' }`. Do not remove this migration code.

### UIBackgroundModes Duplication
`app.json` contains duplicate entries in `UIBackgroundModes` (`fetch` and `remote-notification` appear twice). This is harmless but cosmetically ugly. EAS Build deduplicates them natively.

### expo-av Still Installed
`expo-av` is still in `package.json` (legacy). All new audio code should use `expo-audio`. The two packages can coexist but do not mix their APIs.

### Notification Permission on iOS
iOS only prompts for notification permission once. If the user denies and later grants in Settings, the app detects this via an `AppState` listener in `app/_layout.tsx` that calls `getPermissionsAsync()` on foreground transition. Do not remove that listener.

---

## 7. Build Process

### Development
```bash
npm install
npx expo start          # Standard Expo dev server
npm run expo:dev        # Dev with Replit tunnel proxy
npm run server:dev      # Express backend (tsx watch mode)
```

### iOS (via EAS)
```bash
eas build --platform ios --profile production
eas submit --platform ios   # Submits to App Store Connect
```
- Apple Team ID: `V7A6L6J2Y3`
- Apple ID: `abumurad2010@gmail.com`
- ASC App ID: `6761035153`

### Android (via EAS)
```bash
eas build --platform android --profile production
```
- Keystore: `@jamalal68__mawaqit.jks` (root of repo — do not delete)
- `versionCode` is set manually in `app.json` (not auto-incremented)

### Web (PWA)
```bash
npm run expo:static:build   # Exports static Expo web bundle
npm run server:build        # Builds Express server with esbuild
npm run server:prod         # Runs production server
```

### Version Bumping Convention
When releasing a new build:
1. `app.json` → bump `version` (semver) + `buildNumber` (iOS, string integer)
2. `app.json` → bump `versionCode` (Android, integer) — currently kept in sync with `buildNumber`
3. Commit message: `Bump version X.X.X→X.X.Y, buildNumber N→N+1`

---

## 8. Environment Variables

No `.env` file is used in the React Native app itself. Configuration lives in `app.json` and `eas.json`.

The Express server (Replit only) may use:
| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string (drizzle-orm) |
| `PORT` | Server port (defaults to 5000) |

If adding new environment variables for the native app, use EAS Secrets or `app.config.ts` (dynamic config). Do not put secrets in `app.json`.

---

## 9. Current Version and Recent Changes

**Version**: 1.1.6 · iOS buildNumber 9 · Android versionCode 9

### Recent Changes
| Version | Summary |
|---------|---------|
| 1.1.6 | Fix athan audio: correct expo-audio API params (`shouldPlayInBackground`, `interruptionMode: 'duckOthers'`); call `play()` directly instead of waiting for status event |
| 1.1.5 | Fix athan audio stop on tab leave; fix Settings header layout |
| 1.1.4 | Fix ROW 1 header: ThemeToggle + LangToggle left of logo |
| 1.1.3 | Various UI fixes |

---

## 10. Coding Conventions

### General
- **TypeScript strict mode** throughout. No `any` unless wrapping a third-party API gap (cast with a comment).
- **No default exports** in lib/ and contexts/. Named exports only.
- **No new files** unless genuinely needed. Prefer editing existing files.
- **No speculative abstractions**. Don't create helpers for one-off operations.

### Styling
- All colors come from `useApp().colors` (the `C` alias is conventional: `const C = useApp().colors`).
- No raw hex values in component files. Add tokens to `constants/colors.ts` if missing.
- `StyleSheet.create()` at the bottom of each file for static styles; inline styles only for dynamic values.

### Internationalization
- All user-visible strings go through the `t()` translation object from `constants/i18n.ts`.
- Never hardcode English strings in JSX. Even temporary strings need a key.
- RTL layout: use `isRtl` from `useApp()` to conditionally flip `flexDirection`, `textAlign`, icon mirroring.

### State
- Settings changes use the **draft pattern** in `settings.tsx`: local state mirrors saved state, committed only on "Save".
- Use `updateSettings()` from `useApp()` to persist. This handles AsyncStorage automatically.
- Bookmarks, last-read page, and country code each have dedicated setters on the context.

### Audio
- Always call `stopAthan()` before `playAthan()` (already done inside `playAthan`, but be aware).
- The session-ID guard in `lib/audio.ts` is intentional — don't simplify it away.

### Notifications
- Notifications are rescheduled from `AppContext` whenever location or notification settings change.
- The 7-day scheduling window is intentional (iOS limit is 64 scheduled notifications).
- Thikr notifications use a day-seed (`parseInt(YYYYMMDD)`) for deterministic daily ordering — don't change this to `Math.random()`.

### Platform Guards
- Use the `.web.ts` suffix for web stubs, not `Platform.OS === 'web'` checks inline.
- `Platform.OS === 'ios'` / `'android'` checks are fine for styling differences.

### File Size
- `settings.tsx` is intentionally large (~127 KB). It's a single settings screen and splitting it would add complexity without benefit. Work within it.
- `constants/athkar-data.ts` is a data file (110 KB). Do not restructure it.

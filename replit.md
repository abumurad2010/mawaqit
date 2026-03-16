# Mawaqit — Islamic Prayer App

## Overview

A full-featured, free Islamic app with GPS-based prayer times, Qibla compass, fully offline Quran with transliteration and translation, Hijri/Gregorian calendar, dark/light/system theme, 15-language support, 7 accessibility colour themes, and installable as a Progressive Web App.

## Features

### Prayer Times
- Astronomically accurate calculations using the full USNO algorithm
- 8 calculation methods: MWL, ISNA, Egypt, Umm Al-Qura, Karachi, Tehran, Jafari, Jordan
- Asr method: Standard (Shafi) or Hanafi
- Configurable Maghrib offset (0–10 min)
- GPS-based automatic location or manual city search
- Countdown timer to next prayer
- Active prayer highlighted on the home screen
- After-midnight fix: prayer times correctly show tomorrow's Fajr for UTC+ timezones
- Adhan notifications with full or abbreviated call
- Plays full or abbreviated Adhan audio on notification arrival (foreground + background)
- Dhuha prayer shown (gold, "Nafl" badge) after Sunrise with exact time configurable via time-roller
- Tahajjud/Qiyam shown (gold, "Nafl" badge) after Isha with exact time configurable via time-roller
- Dhuha and Tahajjud notifications fire at the user-selected exact time each day

### Qibla Compass
- Live compass using device magnetometer + GPS
- Points to Mecca (21.4225°N, 39.8262°E) via great-circle bearing
- Shows distance to Mecca in km
- Lock-in animation + 3-step haptic vibration pattern (Heavy → Medium → Success) when aligned
- Fully theme-aware: disc, tick marks, and direction labels respect the active colour theme

### Quran
- Complete Arabic Quran text (Uthmani script) bundled in-app — zero network calls
- Page-by-page Mushaf reading (604 pages)
- Surah number displayed in every banner header (Arabic-Indic numerals: ١، ٢، etc.) alongside the surah name
- Surah list with table of contents
- Full-text search across all 6,236 ayahs — diacritic/accent-insensitive (Arabic harakat and Latin combining marks stripped before matching, with lazy-initialized normalized index)
- Bookmarks on individual ayahs with timestamps; bookmark navigates to the correct Mushaf page and briefly highlights the target ayah number marker
- Bismillah handling (stripped from Surah Al-Fatiha and At-Tawbah, displayed as a header for others)
- Adjustable Arabic font size
- Long-press an ayah number to bookmark/unbookmark it

### Quran Transliteration & Translation
- Romanised Arabic phonetics (transliteration) for every ayah — fully offline, bundled in `assets/quran-translit.json`
- Translation in 14 languages — fully offline, bundled in `assets/quran-translations.json`
- Segmented tab switcher: Mushaf / Transliteration views
- Per-surah view with phonetics and translation side by side
- Surah names in 14 languages from `assets/quran-surah-names.json`

### Hijri Calendar
- Dual Gregorian/Hijri calendar view
- Tap any day to see prayer times for that date
- Accurate Hijri conversion via `lib/hijri.ts`
- Moon phase emoji displayed on every calendar day cell
- Tap the Moon Phase card to see a detailed modal: phase name (EN/AR), illumination %, lunar age, and Islamic significance
- New Moon date and local time shown for the current view month — location-aware UTC offset

### Bookmarks
- Two bookmark types: Mushaf (page-based) and Transliteration (surah-based)
- Timestamps shown on each bookmark row
- Mushaf bookmarks navigate to the correct reader page and highlight the saved ayah

### Settings
- Theme: Dark / Light / System
- 7 Accessibility colour themes (see below)
- Language: 15 languages with auto-detection from GPS country code
- Location: Auto GPS or manual city search
- Calculation method and Asr method
- Maghrib offset in minutes
- Arabic font size slider
- Adhan sound: Full / Abbreviated / Off
- Notification permission management

### Accessibility Colour Themes
Seven themes selectable from Settings › Accessibility:
- **Default** — Classic green (`#1a7a4a`)
- **High Contrast** — Pure black/white with vivid tint, maximum readability
- **Colorblind** — Blue accent, deuteranopia/protanopia-friendly
- **Warm** — Amber/sepia tones, reduced blue light for night use
- **Blossom** — Rose/pink accent for a softer aesthetic
- **Ocean** — Sky blue accent, calm and cool
- **Violet** — Lavender accent, muted and elegant

All themes are implemented in `constants/colors.ts` via `getColors(isDark, theme)` and propagated throughout every screen. `heroCardBg` uses `rgba()` semi-transparency so the `bg-prayer.png` background image shows through on the home screen.

### Progressive Web App (PWA)
- Installable directly from the browser — no App Store required
- Android Chrome: automatic install banner/button in address bar
- iPhone Safari: Share → "Add to Home Screen"
- Desktop Chrome/Edge: install icon in address bar
- Fully offline after first load via service worker (`public/sw.js`)
- Cache-first strategy for app shell; network-first for API calls
- Web app manifest at `/manifest.json` with `display: standalone`, correct icons, theme colour
- Icons at 192×192, 512×512 (Android/Chrome), and 180×180 (Apple touch icon)

### Multilingual Support
15 languages with full UI translation:
Arabic (AR), English (EN), French (FR), Spanish (ES), Russian (RU), Chinese (ZH), Turkish (TR), Urdu (UR), Indonesian (ID), Bengali (BN), Persian (FA), Malay (MS), Portuguese (PT), Swahili (SW), Hausa (HA)

Auto-detected from GPS country code on first launch.

## Architecture

- **Frontend**: Expo Router + React Native (Expo Go compatible, also runs on web)
- **Backend**: Express.js — serves API, Expo landing page, static build, and public PWA assets
- **State**: `contexts/AppContext.tsx` with AsyncStorage persistence
- **Quran Data**: Fully bundled; no API calls at runtime
  - `assets/quran-translit.json` — transliteration (633 KB)
  - `assets/quran-translations.json` — 14-language translations (16 MB)
  - `assets/quran-surah-names.json` — surah names in 14 languages (36 KB)
- **PWA**: `public/sw.js`, `public/manifest.json`, `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png`

## Key Files

| File | Purpose |
|------|---------|
| `app/(tabs)/index.tsx` | Prayer times home screen |
| `app/(tabs)/qibla.tsx` | Qibla compass |
| `app/(tabs)/quran.tsx` | Quran surah list |
| `app/(tabs)/calendar.tsx` | Hijri calendar with daily prayer times |
| `app/quran-reader.tsx` | Page-by-page Mushaf reader |
| `app/surah/[number].tsx` | Surah transliteration/translation screen |
| `app/settings.tsx` | Settings modal |
| `app/search.tsx` | Quran full-text search |
| `app/bookmarks.tsx` | Saved bookmarks |
| `app/+html.tsx` | Custom HTML head for PWA meta tags |
| `lib/prayer-times.ts` | Full USNO astronomical prayer time calculations |
| `lib/qibla.ts` | Great-circle bearing to Mecca |
| `lib/hijri.ts` | Gregorian ↔ Hijri calendar conversion |
| `lib/quran-api.ts` | Bundled Quran text loader + page index |
| `lib/quran-transliteration.ts` | Offline transliteration + translation loader |
| `lib/audio.ts` | Adhan audio playback |
| `contexts/AppContext.tsx` | Global settings, bookmarks, location state |
| `constants/colors.ts` | 7-theme colour palette system |
| `constants/i18n.ts` | 15-language translation strings |
| `constants/typography.ts` | Font constants (Amiri Arabic, Outfit UI, serif fallbacks) |
| `public/sw.js` | Service worker for PWA offline caching |
| `public/manifest.json` | Web app manifest |
| `scripts/build.js` | Production web build script (Metro → static-build/) |
| `server/index.ts` | Express server |

## Packages

| Package | Purpose |
|---------|---------|
| `@expo-google-fonts/amiri` | Arabic Amiri font |
| `@expo-google-fonts/outfit` | UI font |
| `expo-sensors` | Magnetometer for Qibla compass |
| `expo-location` | GPS for prayer times and Qibla |
| `expo-av` | Adhan audio playback |
| `expo-notifications` | Prayer time push notifications |
| `expo-haptics` | Haptic feedback (Qibla lock-in, bookmarks) |
| `react-native-svg` | Compass SVG rendering |
| `@tanstack/react-query` | Server state management |
| `@react-native-async-storage/async-storage` | Settings and bookmark persistence |
| `react-native-safe-area-context` | Safe area insets |
| `react-native-gesture-handler` | Gesture support |

## Running

- Backend: `npm run server:dev` (port 5000)
- Frontend: `npm run expo:dev` (port 8081)

## Deployment

Configured for Replit Autoscale deployment:
- **Build**: `npm run expo:static:build && npm run server:build`
- **Run**: `npm run server:prod`

The build compiles the Expo web app into `static-build/` and bundles the Express server into `server_dist/`. The Express server then serves the API, all static web files, and PWA assets from a single process on port 5000.

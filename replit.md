# Mawaqit - Islamic Prayer App

## Overview

A full-featured Islamic app with accurate prayer times, Qibla compass, full Quran, and Hijri calendar.

## Features

- **Prayer Times** — Astronomically accurate (full USNO algorithm) with 8 calculation methods (MWL, ISNA, Egypt, Umm Al-Qura, Karachi, Tehran, Jafari, Jordan). Configurable Maghrib offset (0-10 min).
- **Qibla Compass** — Live compass using device magnetometer + GPS to point to Mecca (21.4225°N, 39.8262°E). Shows distance to Mecca.
- **Full Quran** — Complete Arabic Quran text bundled in app, searchable, with bookmarks on specific ayahs, page-by-page reading, table of contents.
- **Hijri Calendar** — View prayer times for any day with Gregorian/Hijri dual calendar.
- **Settings** — Dark/light/auto theme, Arabic/English language, location (auto GPS or manual city search), calculation method, Asr method, Maghrib offset, font size.

## Architecture

- **Frontend**: Expo Router + React Native (Expo Go compatible)
- **Backend**: Express.js (serves Expo landing page and static build)
- **State**: `contexts/AppContext.tsx` with AsyncStorage persistence
- **Data**: Quran text bundled in `lib/quran-api.ts`

## Key Files

- `app/(tabs)/index.tsx` — Prayer times main screen
- `app/(tabs)/qibla.tsx` — Qibla compass screen
- `app/(tabs)/quran.tsx` — Quran surah list
- `app/(tabs)/calendar.tsx` — Hijri calendar with daily prayer times
- `app/surah/[number].tsx` — Surah reading screen
- `app/settings.tsx` — Settings modal
- `app/search.tsx` — Quran search modal
- `app/bookmarks.tsx` — Saved bookmarks modal
- `lib/prayer-times.ts` — Full USNO astronomical prayer time calculations
- `lib/qibla.ts` — Great-circle bearing to Mecca
- `lib/hijri.ts` — Gregorian to Hijri calendar conversion
- `lib/quran-api.ts` — Bundled Quran text (Uthmani script from quran.com)
- `contexts/AppContext.tsx` — Global settings + bookmarks state
- `constants/i18n.ts` — Arabic/English translations
- `constants/colors.ts` — Green-themed color palette (light + dark)

## Packages

- `@expo-google-fonts/amiri` — Arabic font
- `expo-sensors` — Magnetometer for Qibla compass
- `expo-location` — GPS for prayer times + Qibla
- `react-native-svg` — Compass SVG rendering
- `expo-haptics` — Haptic feedback

## Running

- Backend: `npm run server:dev` (port 5000)
- Frontend: `npm run expo:dev` (port 8081)

# Mawaqit — Full Application Documentation

> لا تنسونا من صالح دعائكم

Mawaqit is a free, ad-free Islamic utility app built with Expo (React Native). It covers the full daily religious toolkit: GPS-based prayer times, Qibla compass, offline Quran with transliteration, Hijri/Gregorian calendar, smart notifications with athan playback, and full multilingual support across 15 languages with automatic RTL layout.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Navigation & Routing](#navigation--routing)
4. [Global State — AppContext](#global-state--appcontext)
5. [Prayer Times](#prayer-times)
6. [Qibla Compass](#qibla-compass)
7. [Quran Reader](#quran-reader)
8. [Quran Transliteration](#quran-transliteration)
9. [Calendar](#calendar)
10. [Notifications & Athan](#notifications--athan)
11. [Internationalization (i18n)](#internationalization-i18n)
12. [Settings](#settings)
13. [Theming](#theming)
14. [Backend](#backend)
15. [Libraries & Dependencies](#libraries--dependencies)
16. [Data Files](#data-files)
17. [Key Design Decisions](#key-design-decisions)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 54/55 (React Native) |
| Routing | expo-router (file-based, similar to Next.js Pages Router) |
| State | React Context API + AsyncStorage |
| Server state | @tanstack/react-query |
| Styling | React Native StyleSheet |
| Animations | react-native-reanimated |
| UI blur / glass | expo-blur, expo-glass-effect |
| Icons | @expo/vector-icons (Ionicons), lucide-react-native |
| Backend | Express.js + TypeScript |
| Database | Drizzle ORM + PostgreSQL (server-side, minimal usage) |

---

## Project Structure

```
mawaqit/
├── app/                          # All screens (expo-router)
│   ├── _layout.tsx               # Root layout: fonts, theme, notification handler
│   ├── (tabs)/
│   │   ├── _layout.tsx           # Bottom tab bar configuration
│   │   ├── index.tsx             # Prayer Times screen
│   │   ├── qibla.tsx             # Qibla Compass screen
│   │   ├── quran.tsx             # Quran tab (surah list + mode switcher)
│   │   ├── calendar.tsx          # Hijri/Gregorian calendar
│   │   └── settings.tsx          # App settings
│   ├── quran-reader.tsx          # Mushaf-style page reader (604 pages)
│   ├── surah/[number].tsx        # Single-surah scrollable reader
│   ├── surah-transliteration/
│   │   └── [number].tsx          # Transliteration + translation reader
│   ├── search.tsx                # Full-text Quran search
│   ├── bookmarks.tsx             # Saved ayah bookmarks
│   └── location.tsx              # Manual location picker
│
├── components/
│   ├── AppLogo.tsx               # Mawaqit calligraphic logo
│   ├── LangToggle.tsx            # AR ↔ second-language toggle button
│   ├── ThemeToggle.tsx           # Light/dark theme toggle
│   ├── PageBackground.tsx        # Decorative gradient background
│   └── ErrorBoundary.tsx         # App crash boundary with reload
│
├── contexts/
│   └── AppContext.tsx            # Global settings, location, bookmarks
│
├── constants/
│   ├── colors.ts                 # Light/dark color tokens
│   └── i18n.ts                   # 15-language translation system
│
├── lib/
│   ├── prayer-times.ts           # Core astronomical prayer calculation
│   ├── qibla.ts                  # Great-circle Qibla bearing calculation
│   ├── hijri.ts                  # Gregorian ↔ Hijri date conversion
│   ├── quran-api.ts              # Bundled Quran data access layer
│   ├── quran-transliteration.ts  # API-backed transliteration + caching
│   ├── notifications.ts          # Notification scheduling (7-day ahead)
│   ├── audio.ts                  # Athan playback via expo-audio
│   ├── method-by-country.ts      # Default prayer method per country
│   └── maghrib-offsets.ts        # Country-specific Maghrib adjustments
│
├── assets/
│   ├── quran.json                # Full 114-surah Quran (Uthmani script, offline)
│   └── sounds/
│       └── athan.wav             # Athan audio file for playback
│
└── server/
    ├── index.ts                  # Express server entry point
    └── templates/
        └── landing-page.html     # Landing page served at port 5000
```

---

## Navigation & Routing

The app uses expo-router's file-based routing. Every file in `app/` becomes a route automatically.

**Bottom tabs** (defined in `app/(tabs)/_layout.tsx`):
- **Prayer Times** (`index.tsx`) — home tab, clock icon
- **Qibla** (`qibla.tsx`) — compass icon
- **Quran** (`quran.tsx`) — book icon
- **Calendar** (`calendar.tsx`) — calendar icon
- **Settings** (`settings.tsx`) — gear icon

Tab labels are fully translated via the i18n system.

**Stack routes** (pushed on top of tabs):
- `/quran-reader` — Mushaf page reader
- `/surah/[number]` — single surah view
- `/surah-transliteration/[number]` — transliteration reader
- `/search` — Quran search
- `/bookmarks` — bookmarks list
- `/location` — manual location picker

**Root layout** (`app/_layout.tsx`) handles:
- Loading and caching the Amiri Arabic font (regular + bold variants)
- Applying the correct status bar style for light/dark theme
- Registering the foreground notification handler that triggers athan playback
- Preventing the native splash screen from hiding until fonts are loaded

---

## Global State — AppContext

All user-configurable state lives in `contexts/AppContext.tsx`, persisted to `AsyncStorage`.

### AppSettings shape

```typescript
interface AppSettings {
  lang: Lang;                                    // 'ar' | 'en' | 'fr' | ...
  secondLang: SecondLang;                        // Lang | 'auto'
  themeMode: 'light' | 'dark' | 'auto';
  calcMethod: CalcMethod;                        // e.g. 'MWL', 'ISNA', 'UmmAlQura'
  asrMethod: 'standard' | 'hanafi';
  locationMode: 'auto' | 'manual';
  manualLocation: { lat: number; lng: number; label: string } | null;
  fontSize: 'small' | 'medium' | 'large';
  maghribAdjustment: number;                     // minutes added after sunset
  hijriAdjustment: number;                       // -2 to +2 days
  prayerNotifications: Record<string, PrayerNotifConfig>;
}

interface PrayerNotifConfig {
  banner: boolean;          // show a system banner notification
  athan: 'none' | 'full' | 'abbreviated';  // athan audio mode
}
```

### Derived values exposed by context

| Property | Description |
|---|---|
| `isDark` | true when effective theme is dark |
| `lang` | active language (always `'ar'` unless LangToggle switched) |
| `secondLang` | stored second language setting |
| `resolvedSecondLang` | `secondLang === 'auto'` resolved via country code |
| `isRtl` | true for Arabic, Urdu, Persian |
| `location` | `{ lat, lng, label }` from GPS or manual entry |
| `countryCode` | ISO country code from reverse geocoding |
| `locationUtcOffset` | timezone offset in hours (from timeapi.io) |
| `maghribBase` | default Maghrib offset for user's country |
| `maghribOffset` | maghribBase + user adjustment |
| `bookmarks` | array of `{ surahNumber, ayahNumber, text }` |

### Migration logic

Each time settings are loaded from AsyncStorage, a migration pipeline runs:
- Old `'athan_full'` / `'athan_abbreviated'` string values → new `PrayerNotifConfig` objects
- Old `notificationPrayers` array → per-prayer config objects
- Missing `secondLang` → `'auto'`
- Invalid `calcMethod` values → `'MWL'`

---

## Prayer Times

**File:** `lib/prayer-times.ts`  
**Screen:** `app/(tabs)/index.tsx`

### Algorithm

The prayer time calculation is a pure astronomical implementation — no external API required after location is known.

Steps:
1. Compute Julian Day Number from the calendar date
2. Calculate Sun's mean anomaly, ecliptic longitude, right ascension, declination, and equation of time
3. Derive solar noon (Dhuhr)
4. Calculate Fajr and Isha from configurable twilight angles (depends on selected method)
5. Asr: shadow length ratio method (standard = 1×, Hanafi = 2×)
6. Maghrib: sunset + country-specific offset
7. Sunrise and Dhuha derived from solar geometry
8. Qiyam: midpoint between Isha and next day's Fajr

### Calculation methods

14+ methods are bundled in `lib/method-by-country.ts`:

| Code | Authority |
|---|---|
| MWL | Muslim World League |
| ISNA | Islamic Society of North America |
| Egypt | Egyptian General Authority |
| Makkah / UmmAlQura | Umm Al-Qura University |
| Karachi | University of Islamic Sciences |
| Tehran | Institute of Geophysics |
| Jafari | Shia Ithna Ashari |
| Gulf | Gulf Region |
| Kuwait | Kuwait |
| Qatar | Qatar |
| Singapore | MUIS Singapore |
| France | UOIF |
| Turkey | Diyanet |
| Russia | Russia |

The recommended method is automatically suggested based on the user's country code.

### Maghrib adjustments

`lib/maghrib-offsets.ts` contains a hardcoded table of the standard Maghrib safety margin (extra minutes after astronomical sunset) for each country, matching the standards of their respective Dar al-Ifta or Islamic authority. Users can further adjust ±10 minutes.

### Screen UI

- Dual-date header: Gregorian + Hijri (with user-configured adjustment)
- Next prayer countdown timer (live, updates every second)
- Prayer rows: Fajr, Sunrise, Dhuha, Dhuhr, Asr, Maghrib, Isha, Qiyam
- Current prayer highlighted with a pulsing tint indicator
- Location label with tap-to-change shortcut

---

## Qibla Compass

**File:** `app/(tabs)/qibla.tsx` + `lib/qibla.ts`

### Calculation

The Qibla bearing is calculated using the spherical law of cosines (great-circle formula) from the user's GPS coordinates to the Kaaba in Mecca (21.4225° N, 39.8262° E).

```
bearing = atan2(
  sin(Δλ) · cos(φ₂),
  cos(φ₁) · sin(φ₂) − sin(φ₁) · cos(φ₂) · cos(Δλ)
)
```

### Hardware compass

The device's magnetometer (`expo-sensors`) is sampled at ~50ms intervals. The raw bearing is smoothed with exponential moving average to eliminate jitter. Magnetic declination is not currently corrected (typically within 1–5° for most regions).

### Alignment detection

When the compass bearing is within ±3° of the Qibla direction, a visual glow effect and haptic feedback notify the user that the device is correctly aimed at Mecca.

### UI

- SVG-rendered compass rose that rotates with the device
- Qibla direction needle always points toward Mecca
- Degree display (e.g., "127° SE")
- Alignment glow animation when on target

---

## Quran Reader

**Files:** `app/(tabs)/quran.tsx`, `app/quran-reader.tsx`, `app/surah/[number].tsx`, `lib/quran-api.ts`

### Data model

The full Quran is bundled in `assets/quran.json` — a compact JSON object keyed by surah number (1–114), each containing an array of ayah objects:

```json
{
  "1": [
    { "n": 1, "t": "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ", "j": 1, "p": 1 },
    ...
  ]
}
```

Fields: `n` = ayah number, `t` = Uthmani Arabic text, `j` = Juz number, `p` = Mushaf page (1–604).

At module load time, `lib/quran-api.ts` synchronously builds:
- `SURAH_META` — array of 114 surah metadata objects (name, transliteration, English name, ayah count, revelation type, hasBismillah)
- `PAGE_INDEX` — array of 604 arrays, each containing the ayahs on that Mushaf page
- `SURAH_START_PAGES` — map from surah number → first page in the Mushaf

### Mushaf reader (`quran-reader.tsx`)

- Pages 1–604 navigated by horizontal swipe (RTL-aware via PanResponder)
- Each page renders its ayahs as flowing Arabic text in a single `<Text>` element with ﴿n﴾ separators between ayahs
- Surah banners rendered when a new surah starts on the current page
- Bismillah shown for all surahs except At-Tawbah
- Long-press any ayah to bookmark it
- Font size selectable via "Aa" panel (small / medium / large), stored in settings
- Last-read page persisted to AsyncStorage, shown as "Continue Reading" shortcut

### Surah list (`quran.tsx`)

- Displays all 114 surahs with: Arabic name, transliteration, English translation, Meccan/Medinan classification, verse count
- Mode switcher (see Transliteration section below)
- Search and Bookmarks accessible from the header

### Search (`search.tsx`)

Full-text search over all 6,236 ayahs (Arabic text only). Results show surah name, ayah number, and the matching Arabic text snippet. Tap any result to jump to the Mushaf reader at that page.

### Bookmarks (`bookmarks.tsx`)

Persisted to AsyncStorage as an array of `{ surahNumber, ayahNumber, text }`. Bookmarks are created via long-press in the Mushaf reader. The bookmarks screen shows them in a list; tapping any opens the Mushaf at that ayah's page.

---

## Quran Transliteration

**Files:** `app/surah-transliteration/[number].tsx`, `lib/quran-transliteration.ts`

### Mode switcher

The Quran tab (`quran.tsx`) contains a segmented control at the top:

- **Mushaf** — navigates to the Mushaf page reader (existing behavior)
- **Transliteration** — navigates to the transliteration reader for the tapped surah

### Data source

Transliteration and translations are fetched from the free `api.alquran.cloud` API on first access, then cached indefinitely in AsyncStorage.

API call: `GET https://api.alquran.cloud/v1/surah/{number}/editions/en.transliteration,{translationEdition}`

This returns both the romanized Arabic transliteration and the translation in the user's chosen language in a single round-trip.

### Supported translation languages

All 14 non-Arabic languages are supported. The translation edition used per language:

| Language | Edition |
|---|---|
| English | en.sahih |
| French | fr.hamidullah |
| German | de.aburida |
| Spanish | es.cortes |
| Russian | ru.kuliev |
| Chinese | zh.jian |
| Turkish | tr.yazir |
| Urdu | ur.ahmedali |
| Indonesian | id.indonesian |
| Bengali | bn.bengali |
| Persian | fa.ghomshei |
| Malay | ms.basmeih |
| Portuguese | pt.elhayek |
| Swahili | sw.barwani |
| Hausa | ha.gumi |

### Reader UI

For each ayah:
1. **Arabic text** — Uthmani script, Amiri font, right-aligned (from bundled data, always available offline)
2. **Transliteration** — romanized Arabic phonetics, italic, tinted color
3. **Translation** — in the selected language; RTL layout for Urdu and Persian

Language can be changed at any time via a picker in the header. The new language is fetched and cached on demand.

While data is loading, skeleton placeholder lines are shown per ayah. If fetching fails (no internet), a retry banner is displayed.

---

## Calendar

**File:** `app/(tabs)/calendar.tsx` + `lib/hijri.ts`

### Hijri conversion

`lib/hijri.ts` implements the Kuwaiti algorithm for converting Gregorian dates to Hijri. The user can adjust the result by ±2 days via settings (to match their local moon sighting authority).

### UI

- Month grid view with both Gregorian day numbers and Hijri day numbers overlaid
- Header shows current Hijri month name (in Arabic) and Gregorian month
- Navigation arrows to move forward/backward through months
- Tap any date to see the calculated prayer times for that location and date

---

## Notifications & Athan

**Files:** `lib/notifications.ts`, `lib/audio.ts`, `app/_layout.tsx`

### Scheduling

Notifications are scheduled up to 7 days in advance using `expo-notifications`. Each prayer can have independent settings:

- **Banner** — system notification with default chime sound
- **Athan (Full)** — silent system notification that triggers app-side athan playback
- **Athan (Abbreviated)** — same as full, but playback auto-stops after 8 seconds
- Both can be enabled simultaneously (banner + athan)

When any setting changes (location, calc method, Maghrib offset, notification prefs), all existing scheduled notifications are cancelled and rebuilt.

### PrayerNotifConfig

```typescript
interface PrayerNotifConfig {
  banner: boolean;
  athan: 'none' | 'full' | 'abbreviated';
}
```

Settings are stored per-prayer key: `fajr`, `dhuha`, `dhuhr`, `asr`, `maghrib`, `isha`, `qiyam`.

### Notification handler

Registered in `app/_layout.tsx` via `Notifications.addNotificationReceivedListener`. When a notification arrives with `data.playAthan === true`, the handler calls `playAthan(data.athanType)` from `lib/audio.ts`.

### Athan audio

`lib/audio.ts` uses expo-audio to play `assets/sounds/athan.wav`. In abbreviated mode, playback is stopped via a 8-second timeout. Only one athan plays at a time — starting a new one stops the previous.

---

## Internationalization (i18n)

**File:** `constants/i18n.ts`

### Supported languages

15 languages total: Arabic (ar), English (en), French (fr), Spanish (es), Russian (ru), Chinese (zh), Turkish (tr), Urdu (ur), Indonesian (id), Bengali (bn), Persian (fa), Malay (ms), Portuguese (pt), Swahili (sw), Hausa (ha).

### Language system design

Arabic is always fixed as the "primary" language (the app's religious language). The user selects a "second language" as their non-Arabic language. A `LangToggle` component in every screen header switches between Arabic and the second language.

- `lang` — the currently displayed language (either `'ar'` or `resolvedSecondLang`)
- `secondLang` — stored preference (`Lang | 'auto'`)
- `resolvedSecondLang` — if `'auto'`, auto-detected from the user's country code via `detectSecondLang()`
- `isRtl` — `true` for Arabic, Urdu, and Persian — triggers full layout mirroring

### Translation strings

The `t(lang)` function returns a flat translations object with ~45 strings covering all screen labels, prayer names, navigation titles, and the closing dua. English is the fallback for any missing key in non-Arabic languages.

### RTL layout

When `isRtl` is true:
- `flexDirection` is reversed to `row-reverse`
- Text alignment switches to `right`
- The Amiri font is applied (Arabic/Urdu/Persian rendering)

---

## Settings

**File:** `app/settings.tsx`

All settings are draft-edited and only persisted when the user taps "Save". Changes to notification prefs or prayer calculation parameters automatically reschedule all notifications.

### Sections

**Language**
- Language picker showing all 14 non-Arabic options + Auto
- Auto option detects language from country code

**Prayer Calculation**
- Calculation method selector (14+ methods) with country-default suggestion
- Asr school: Standard (Shafi/Maliki/Hanbali) or Hanafi
- Hijri date adjustment: −2 to +2 days
- Maghrib adjustment: ±10 minutes (on top of country default)

**Display**
- Quran font size: Small / Medium / Large
- Theme: Light / Dark / Auto (system)

**Notifications**
- Per-prayer configuration for all 7 prayer times
- Each row has two independent toggles:
  - 🔔 Banner — silent badge/banner notification
  - 🔊 Athan — triggers app-side athan playback
- When Athan is enabled, a sub-row appears with Full / Abbr. / Preview controls

---

## Theming

**File:** `constants/colors.ts`

Two complete color palettes: `Colors.light` and `Colors.dark`.

Selected tokens:

| Token | Light | Dark |
|---|---|---|
| `background` | #F2F1EC | #0C0C0E |
| `backgroundCard` | #FFFFFF | #1C1C1E |
| `backgroundSecond` | #E8E7E0 | #2C2C2E |
| `text` | #1A1A1A | #F5F5F5 |
| `textSecond` | #3A3A3C | #EBEBF5 |
| `textMuted` | #8E8E93 | #8E8E93 |
| `tint` | #1B6B3A | #2ECC71 |
| `gold` | #C9A84C | #FFD700 |
| `separator` | rgba(0,0,0,0.1) | rgba(255,255,255,0.08) |

The theme follows the system setting by default (`Appearance.getColorScheme()`), configurable to always-light or always-dark via settings.

---

## Backend

**File:** `server/index.ts`  
**Port:** 5000

The Express backend is minimal — the app is local-first. Current responsibilities:

- Serves `server/templates/landing-page.html` at the root URL
- Provides a health check endpoint at `/api/health`
- Hosts the Expo development server proxy in the Replit environment

The Drizzle ORM + PostgreSQL setup (`shared/schema.ts`) defines a `users` table but is not currently used by the app — it exists for future server-side features (e.g., cloud backup of bookmarks).

---

## Libraries & Dependencies

### Frontend (React Native / Expo)

| Library | Usage |
|---|---|
| expo-router | File-based navigation |
| expo-location | GPS for prayer times and Qibla |
| expo-sensors | Magnetometer for compass |
| expo-notifications | Schedule prayer alerts |
| expo-audio | Athan playback |
| expo-blur | Glass/blur card effects |
| expo-glass-effect | Liquid glass tab bar on iOS 26 |
| expo-haptics | Touch feedback |
| react-native-reanimated | Smooth animations and transitions |
| react-native-svg | Compass SVG rendering |
| react-native-safe-area-context | Safe area insets |
| @tanstack/react-query | Data fetching + caching |
| @react-native-async-storage/async-storage | Local persistence |
| @expo/vector-icons | Ionicons icon set |

### Backend

| Library | Usage |
|---|---|
| express | HTTP server |
| drizzle-orm | ORM for PostgreSQL |
| @neondatabase/serverless | Postgres connection |
| typescript | Type safety |

---

## Data Files

### `assets/quran.json`

The entire Quran in Uthmani script. Format: `{ "[surahNum]": [{ n, t, j, p }] }`. Loaded synchronously at app startup into memory. Fully offline — never requires network access.

### `assets/sounds/athan.wav`

The athan audio file played on prayer notification. Used by both "Full" (plays to completion) and "Abbreviated" (auto-stops after 8 seconds) modes.

### `constants/i18n.ts`

Embedded translation strings for all 15 languages (~45 strings each, ~45 × 15 = 675 string pairs). Includes prayer names, UI labels, navigation titles, error messages, and the closing dua.

---

## Key Design Decisions

**Fully offline-first**  
The Quran (6,236 ayahs), prayer calculation algorithm, Qibla bearing, and Hijri conversion all work with zero network access. Location can be set manually. Only transliteration and translations require the network (fetched once, cached permanently).

**No ads, no tracking, no accounts**  
The app has no analytics, no login, no cloud sync, and no monetization layer. All data stays on the user's device.

**Arabic as the primary language**  
Arabic is never "replaced" by the second language — the LangToggle switches the entire UI between Arabic and the user's chosen language, preserving the sacred-language-first design philosophy.

**Astronomical accuracy**  
Prayer times are computed using the same algorithms as major Islamic apps and physical prayer timetables. Method selection respects the scholarly consensus per country (auto-suggested via `lib/method-by-country.ts`).

**Single notification per prayer**  
Rather than one notification for the banner and one for the athan, a single scheduled notification carries both responsibilities. The `sound: false` flag suppresses the system chime when athan is enabled (so the app can play the full athan instead). The notification handler in `_layout.tsx` checks `data.playAthan` to decide whether to invoke expo-audio.

**Compact JSON format**  
The Quran JSON uses single-character keys (`n`, `t`, `j`, `p`) instead of full names to reduce the bundle size. The full file is approximately 2.5 MB uncompressed.

---

*لا تنسونا من صالح دعائكم*

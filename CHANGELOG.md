# Mawaqit — Changelog (March 13–16, 2026)

---

## March 16, 2026

### Settings Screen — UI & UX Overhaul

**Font system**
- All English labels, headings, and picker text in Settings now use `Inter` (sans-serif) instead of Georgia/serif.
- Arabic text continues to use Amiri throughout. The change is isolated to `app/settings.tsx` and does not affect the Quran reader or other screens.

**First Adhan — shorter intervals + compact picker**
- Reminder intervals changed from `[0, 10, 20, 30]` minutes to `[0, 5, 10, 15, 20, 25, 30]` minutes, giving users finer-grained control.
- Replaced the inline chip row with a compact dropdown button that opens a centred modal picker.
- Picker labels shortened: `"5 minutes before the Adhan"` → `"5 min"`, `"Off — no early reminder"` → `"Off"`.
- Type updated to `number` (from `string`) in `AppContext`, `notifications.ts`, and `settings.tsx`.

**Dhuha & Qiyam rows — compact inline layout**
- Collapsed each prayer from a 4-row card into a single compact inline row: toggle switch + time button side-by-side.
- Toggling a prayer off dims the time button (opacity 0.38) and disables taps on it automatically.

**Maghrib row**
- Compacted to a single row showing the offset stepper inline.

**Accessibility theme tiles**
- Changed from a vertical 7-row list to a 2-column tile grid.
- Tiles made more compact: padding reduced, swatch reduced from 26 px to 20 px, font from 12 pt to 11 pt, border radius from 12 to 10.
- Checkmark icon resized to match the smaller swatch.

**Roller modals — dismiss on outside tap**
- Dhuha, Qiyam, and Eid Prayer roller sheets now close when tapping anywhere outside the sheet.
- Implemented by wrapping the modal overlay in a `Pressable` and using an inner `Pressable` on the sheet itself to stop event propagation.

---

### Eid Prayer Time

**User-configurable Eid prayer time**
- Added an "Eid Prayer" row to the Dhuha & Qiyam card in Settings.
- Time is set via the same `TimeRoller` component used for Dhuha/Qiyam (scroll-wheel hour/minute picker).
- Time persists per device via `AppContext` (`eidPrayerTime`, default `'07:30'`).
- The main prayer screen (`index.tsx`) now reads this setting instead of calculating `sunrise + 30 min`.

**Conditional visibility — near Eid only**
- The Eid Prayer row (and its roller modal) is hidden by default.
- It appears automatically when the current Hijri date falls within:
  - 29–30 Ramadan (Eid al-Fitr approaching)
  - 1 Shawwal (Eid al-Fitr day)
  - 8–10 Dhul Hijjah (Eid al-Adha period)
- The Hijri adjustment setting is respected in the proximity calculation.

---

### Gold Accessibility Theme (8th theme)

- `AccessibilityTheme` type extended with `'gold'`.
- Full light/dark colour palette added to `constants/colors.ts`:
  - Light: primary `#8B6800`, tint `#8B6800`, accent gold `#B8860B`
  - Dark: primary `#FFD60A`, tint `#FFD60A`, accent gold `#FFE033`
- Gold tile added to the accessibility grid in `app/settings.tsx` and `settings.tsx` (legacy):
  - Swatch: `#8B6800` (light) / `#FFD60A` (dark)
  - Label: "Gold" / "الذهبي"

---

### Help Buttons — Dhuha, Qiyam & Eid

- `HelpKey` type extended: added `'dhuha'` and `'eid'`.
- Help texts written and localized in all **15 languages**: Arabic, English, French, Spanish, Russian, Chinese, Turkish, Urdu, Indonesian, Bengali, Persian, Malay, Portuguese, Swahili, Hausa.

**Dhuha & Qiyam section header**
- Added a `?` help button next to the section title. The popup explains:
  - What Dhuha prayer is (voluntary, 2–8 rak'ahs, after sunrise before Dhuhr)
  - What Qiyam/Tahajjud is (night vigil prayer, last third of night before Fajr)
  - How to use the toggles and reminder time pickers

**Eid Prayer row**
- Added a `?` help button inline. The popup explains:
  - Which days it applies to (1 Shawwal / 10 Dhul Hijjah)
  - That the time should match the official announcement from the user's mosque or city
  - That the row only appears near Eid

---

### Moon Phases — Calendar Tab

**New `lib/moon-phases.ts` library**
- Implements accurate astronomical moon phase calculation (Jean Meeus algorithm).
- Returns phase name, illumination percentage, age (days since new moon), and emoji icon.
- Includes a `getNextNewMoon()` / `getPreviousNewMoon()` lookup for exact new moon timestamps.
- Phase names corrected to standard Islamic/astronomical terminology.

**Calendar screen (`app/(tabs)/calendar.tsx`)**
- Moon phase icon and illumination percentage displayed on each calendar day.
- Tapping a day with a notable phase opens a detail popup showing:
  - Phase name and emoji
  - Illumination percentage
  - Moon age
  - Exact new moon time (when applicable) with dismiss button
- New moon popup now shows the precise time of the event, not just the date.
- Popup closes on outside tap.

**Terminology updates**
- Standardised moon phase names across the app and library.
- Updated prayer terminology in the calendar view to be consistent with the main screen.

---

### Nafl Prayer Display — Main Screen

**`app/(tabs)/index.tsx`**
- Dhuha and Qiyam prayer rows are now conditionally shown/hidden based on the user's `showDhuha` / `showQiyam` toggle in Settings.
- Eid prayer row appears on the main screen only on Eid days (calculated from Hijri date + user adjustment).
- Added localization keys for Dhuha and Qiyam prayer names in `constants/i18n.ts` (15 languages).

---

### `TimeRoller` Component

**New `components/TimeRoller.tsx`**
- Reusable scroll-wheel hour/minute picker.
- Props: `value` (HH:MM string), `onChange`, `tintColor`, `textColor`, `bgColor`.
- Used by Dhuha, Qiyam, and Eid prayer time settings.
- Works on iOS, Android, and web.

---

## March 15, 2026

### Customizable Dhuha & Tahajjud Prayer Times

- Added `dhuhaTime` and `tahajjudTime` fields to `AppContext` (default `'07:30'` and `'03:00'`).
- Added `showDhuha` and `showQiyam` boolean flags to `AppContext` (default `true`).
- Settings screen gained roller-modal pickers for both prayer times.
- Notifications updated in `lib/notifications.ts` to schedule reminders at the user-configured times.
- Main screen updated to display the stored times for each nafl prayer.

---

## March 14, 2026

### App Startup — Always Opens on Timings Tab

- On cold launch and on app resume from background, the app now always navigates to the Timings (home) tab.
- Implemented via `AppState` listener in `app/_layout.tsx` and a forced tab-index reset in `app/(tabs)/_layout.tsx`.
- Prevents the user landing on a different tab after switching away and returning.

---

## Files Changed (summary)

| File | Changes |
|---|---|
| `app/(tabs)/index.tsx` | Eid/Nafl display, showDhuha/showQiyam guards, Eid time from settings |
| `app/(tabs)/calendar.tsx` | Full moon phase integration, popup UI, terminology fixes |
| `app/(tabs)/_layout.tsx` | Force timings tab on resume |
| `app/_layout.tsx` | AppState listener for tab reset, font loading cleanup |
| `app/settings.tsx` | All settings UI changes (font, intervals, tiles, rollers, help buttons) |
| `settings.tsx` (legacy) | Gold theme tile, first adhan type fix |
| `contexts/AppContext.tsx` | `dhuhaTime`, `tahajjudTime`, `showDhuha`, `showQiyam`, `eidPrayerTime`, `firstAdhanOffset` type |
| `constants/colors.ts` | Gold theme palette (light + dark), `AccessibilityTheme` type extended |
| `constants/i18n.ts` | Dhuha/Qiyam prayer name keys for 15 languages |
| `components/TimeRoller.tsx` | New scroll-wheel time picker component |
| `lib/moon-phases.ts` | New moon phase calculation library |
| `lib/notifications.ts` | Dhuha/Qiyam notification scheduling, `firstAdhanOffset` type fix |

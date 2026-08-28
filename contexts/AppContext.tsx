import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import type { CalcMethod, AsrMethod } from '@/lib/prayer-times';
import { zoneOffsetHours, standardOffset, isDstActive, methodBakedMaghribAdj } from '@/lib/prayer-times';
import tzlookup from 'tz-lookup'; // types provided by types/tz-lookup.d.ts
import { updateWidgetFromParams } from '@/lib/widget';

import type { Lang } from '@/constants/i18n';
import { isRtlLang, detectSecondLang } from '@/constants/i18n';
import { BUNDLED_LANGS, SUPPORTED_TRANSLIT_LANGS } from '@/lib/quran-transliteration';
import { getRecommendedMethod } from '@/lib/method-by-country';
import { getMaghribOffset } from '@/lib/maghrib-offsets';
import { schedulePrayerNotifications, cancelAllPrayerNotifications, scheduleThikrNotifications, cancelThikrNotifications } from '@/lib/notifications';
import { getColors } from '@/constants/colors';
import type { AccessibilityTheme, ColorPalette } from '@/constants/colors';

/** Returns sensible iqama offset defaults (minutes after azan) for a given country code. */
export function getDefaultIqamaOffsets(cc: string | null): Record<string, number> {
  const base = { fajr: 10, dhuhr: 10, asr: 10, maghrib: 5, isha: 10 };
  if (!cc) return base;
  const c = cc.toUpperCase();
  if (['SA', 'AE', 'QA', 'KW', 'BH', 'OM'].includes(c))
    return { fajr: 20, dhuhr: 15, asr: 15, maghrib: 5, isha: 15 };
  if (['EG', 'JO', 'SY', 'LB', 'PS', 'IQ', 'LY', 'SD', 'YE'].includes(c))
    return { fajr: 20, dhuhr: 10, asr: 10, maghrib: 5, isha: 10 };
  if (['PK', 'BD', 'IN', 'AF'].includes(c))
    return { fajr: 20, dhuhr: 15, asr: 15, maghrib: 5, isha: 15 };
  if (['MA', 'DZ', 'TN'].includes(c))
    return { fajr: 15, dhuhr: 10, asr: 10, maghrib: 5, isha: 10 };
  if (c === 'TR') return { fajr: 15, dhuhr: 10, asr: 10, maghrib: 5, isha: 10 };
  if (['MY', 'ID', 'SG', 'BN'].includes(c))
    return { fajr: 15, dhuhr: 10, asr: 10, maghrib: 5, isha: 10 };
  return base;
}

/** @deprecated use PrayerNotifConfig instead */
type _OldPrayerNotifType = 'none' | 'banner' | 'athan_full' | 'athan_abbreviated';

export interface PrayerNotifConfig {
  banner: boolean;
  athan: 'none' | 'full' | 'abbreviated';
}

/** Backwards-compat export so other files don't need immediate updates */
export type PrayerNotifType = PrayerNotifConfig;
export type SecondLang = Lang | 'auto';

export interface Bookmark {
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  ayahText: string;
  timestamp: number;
  type?: 'mushaf' | 'transliteration';
}

export interface LocationData {
  lat: number;
  lng: number;
  city?: string;
  localName?: string; // Localized city name from reverse geocoding (in app language)
  country?: string;
  countryCode?: string;
  /** Set when this location came from a favorite/saved city (SavedCity.id).
   *  Anchors per-city method memory. */
  savedCityId?: string;
}

export interface SavedCity {
  id: string;
  lat: number;
  lng: number;
  city: string;
  countryCode?: string;
  /** Manual method override for this specific city; when unset the effective method
   *  falls back to calcMethodByCountry, then to getRecommendedMethod. */
  calcMethod?: CalcMethod;
}

export interface PrayerOffsets {
  fajr: number;
  dhuhr: number;
  asr: number;
  isha: number;
}

/** @deprecated kept for migration only */
export type TahajjudPortion = 'last_third' | 'last_quarter' | 'last_sixth';

interface AppSettings {
  lang: Lang;
  secondLang: SecondLang;
  translitLang: Lang;
  themeMode: 'auto' | 'light' | 'dark';
  accessibilityTheme: AccessibilityTheme;
  calcMethod: CalcMethod;
  /** Deprecated in 1.3.8. Replaced by calcMethodByCountry (per-country memory) and
   *  SavedCity.calcMethod (per-city memory). Kept only so older persisted settings
   *  parse; migration folds it into calcMethodByCountry on first launch. */
  calcMethodAuto: boolean;
  /** Per-country user override of the calc method. Populated on save when the
   *  effective location is NOT a saved city; consulted before falling back to
   *  getRecommendedMethod. Key = ISO 3166-1 alpha-2 country code. */
  calcMethodByCountry: Record<string, CalcMethod>;
  asrMethod: AsrMethod;
  /** Daylight-saving override for manual locations. 'auto' = trust the IANA zone
   *  (device tzdata); 'on'/'off' force standard-time+1 / standard-time. Escape hatch
   *  for stale device tzdata (Morocco Ramadan, Iran 2022, Lebanon 2023). */
  dstMode: 'auto' | 'on' | 'off';
  locationMode: 'auto' | 'manual';
  manualLocation: LocationData | null;
  fontSize: 'small' | 'medium' | 'large' | 'xlarge' | 'xxlarge';
  maghribAdjustment: number;
  hijriAdjustment: number;
  firstAdhanOffset: number;
  prayerNotifications: Record<string, PrayerNotifType>;
  dhuhaTime: string;     // "HH:MM" exact local time for Dhuha
  tahajjudTime: string;  // "HH:MM" exact local time for Tahajjud/Qiyam
  jumuahTime: string | null; // "HH:MM" custom Jumu'ah time on Fridays, null = use calculated Dhuhr
  showDhuha: boolean;    // whether to show Dhuha row on timings tab
  showQiyam: boolean;    // whether to show Qiyam row on timings tab
  eidPrayerTime: string; // "HH:MM" official Eid prayer time (shown only on Eid days)
  iqamaOffsets: Record<string, number>; // per-prayer iqama delay in minutes (user overrides)
  thikrRemindersEnabled: boolean;
  /** @deprecated No longer used. DST is now handled automatically via the
   *  location's IANA timezone (see locationTimezone). Field kept so persisted
   *  settings from ≤1.3.5 still parse; safe to remove in a future migration. */
  dstEnabled: boolean;
  defaultTab: string;
  selectedAdhan: string;
  prayerAdhan: Record<string, string>;
  adhanLength: 'full' | 'short';
  prePrayerReminder: number;
  /** When true, the Settings "adjust all prayer times" toggle exposes per-prayer
   *  ± minute fields for Fajr/Dhuhr/Asr/Isha. Maghrib always has its own field
   *  regardless of this toggle. */
  perPrayerOffsetsEnabled: boolean;
  /** ± minute offsets applied to Fajr/Dhuhr/Asr/Isha when perPrayerOffsetsEnabled
   *  is true. Values persist even when the toggle is off so re-enabling restores
   *  the last configuration; the offsets are only APPLIED when enabled. */
  prayerOffsets: PrayerOffsets;
  /** Saved/favorite cities the user can switch to instantly, without triggering
   *  GPS. Each entry can carry its own calcMethod override (per-city memory). */
  savedCities: SavedCity[];
}

interface AppContextValue extends AppSettings {
  isDark: boolean;
  isRtl: boolean;
  colors: ColorPalette;
  /** Method actually applied to prayer-time calculations (per-city → per-country →
   *  recommended). Same as `calcMethod` on this value — exposed as a distinct field
   *  so callers can be explicit about intent when writing preview/what-if calcs. */
  effectiveCalcMethod: CalcMethod;
  resolvedSecondLang: Lang;
  location: LocationData | null;
  setLocation: (loc: LocationData | null) => void;
  maghribBase: number;
  maghribOffset: number;
  /** Total user-visible maghrib offset in minutes: method-baked (Jordan/Turkey/
   *  Moonsighting) + country base + user tune. Used by the Settings badge; the
   *  calculation itself uses maghribOffset (base + user), because the method-baked
   *  portion is already applied inside adhan/prayer-times.ts. */
  maghribEffective: number;
  maghribUserAdj: number;
  setMaghribUserAdj: (adj: number) => void;
  countryCode: string | null;
  locationUtcOffset: number | null;
  /** IANA timezone for a manual location (e.g. "Europe/London"), or null in
   *  GPS/auto mode where device-local time is used. DST-aware display key. */
  locationTimezone: string | null;
  /** Fixed display offset for the DST override ('on'/'off'); null = auto (use zone). */
  dstOverrideOffset: number | null;
  /** Milliseconds to shift absolute instants (notifications/widget) so the alarm
   *  fires at the displayed wall-clock under a DST override. 0 in auto mode. */
  dstShiftMs: number;
  /** Resolved DST state for the Settings subtitle. */
  dstResolved: { applicable: boolean; on: boolean; autoOn: boolean; offsetLabel: string; abbrev: string | null; mismatch: boolean };
  bookmarks: Bookmark[];
  addBookmark: (b: Bookmark) => void;
  removeBookmark: (surahNumber: number, ayahNumber: number) => void;
  isBookmarked: (surahNumber: number, ayahNumber: number) => boolean;
  updateSettings: (partial: Partial<AppSettings>) => void;
  lastReadPage: number;
  setLastReadPage: (page: number) => void;
  lastReadSurah: number;
  setLastReadSurah: (surah: number) => void;
  translitLastSurah: number;
  setTranslitLastSurah: (surah: number) => void;
  translitLastPage: number;
  setTranslitLastPage: (page: number) => void;
  quranNavTarget: { surah: number; ayah: number; timestamp: number } | null;
  setQuranNavTarget: (target: { surah: number; ayah: number; timestamp: number } | null) => void;
  /** Persist a new favorite city. If one already exists at the same
   *  (lat,lng) rounded to 4 decimals it is refreshed in-place. Returns the id. */
  addSavedCity: (c: Omit<SavedCity, 'id'>) => Promise<string>;
  /** Remove a favorite by id. If the current location came from this favorite,
   *  the tab keeps showing its coords — user can pick another. */
  removeSavedCity: (id: string) => Promise<void>;
  /** Switch the active location to a saved city with NO GPS trip. */
  useSavedCity: (id: string) => Promise<void>;
  /** Switch to an arbitrary (searched or ad-hoc) location atomically — used by
   *  the "tap search result to switch immediately" flow before deciding to save. */
  switchToLocation: (loc: LocationData) => Promise<void>;
  /** Store the calc-method override for the current location: on a saved city it
   *  writes SavedCity.calcMethod; anywhere else it writes calcMethodByCountry. */
  setEffectiveCalcMethod: (m: CalcMethod) => Promise<void>;
}

const DEFAULT_SETTINGS: AppSettings = {
  lang: 'ar',
  secondLang: 'auto',
  translitLang: 'en',
  themeMode: 'dark',
  accessibilityTheme: 'default',
  calcMethod: 'MWL',
  calcMethodAuto: true,
  calcMethodByCountry: {},
  asrMethod: 'standard',
  dstMode: 'auto',
  locationMode: 'auto',
  manualLocation: null,
  fontSize: 'medium',
  maghribAdjustment: 0,
  hijriAdjustment: 0,
  firstAdhanOffset: 0,
  prayerNotifications: {},
  dhuhaTime: '07:30',
  tahajjudTime: '03:00',
  showDhuha: true,
  showQiyam: true,
  eidPrayerTime: '07:30',
  iqamaOffsets: {},
  thikrRemindersEnabled: false,
  dstEnabled: false,
  defaultTab: 'index',
  selectedAdhan: 'makkah',
  prayerAdhan: {},
  adhanLength: 'short',
  prePrayerReminder: 0,
  jumuahTime: null,
  perPrayerOffsetsEnabled: false,
  prayerOffsets: { fajr: 0, dhuhr: 0, asr: 0, isha: 0 },
  savedCities: [],
};

const VALID_CALC_METHODS = [
  'MWL','ISNA','Egypt','MakkahUmmQura','Karachi','Jordan',
  'Kuwait','Qatar','Algeria','Morocco','Singapore','Turkey','France','Russia',
  'Moonsighting',
];

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [location, setLocationState] = useState<LocationData | null>(null);
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [lastReadPage, setLastReadPageState] = useState(1);
  const [lastReadSurah, setLastReadSurahState] = useState(1);
  const [translitLastSurah, setTranslitLastSurahState] = useState(1);
  const [translitLastPage, setTranslitLastPageState] = useState(1);
  const [maghribUserAdj, setMaghribUserAdjState] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [quranNavTarget, setQuranNavTarget] = useState<{ surah: number; ayah: number; timestamp: number } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [s, b, lrp, lrs, cc, tls, tlp] = await Promise.all([
          AsyncStorage.getItem('settings'),
          AsyncStorage.getItem('bookmarks'),
          AsyncStorage.getItem('lastReadPage'),
          AsyncStorage.getItem('lastReadSurah'),
          AsyncStorage.getItem('countryCode'),
          AsyncStorage.getItem('translitLastSurah'),
          AsyncStorage.getItem('translitLastPage'),
        ]);
        if (s) {
          const parsed = JSON.parse(s);
          delete parsed.maghribOffset;
          if (parsed.calcMethod && !VALID_CALC_METHODS.includes(parsed.calcMethod)) {
            parsed.calcMethod = 'MWL';
          }
          // 1.3.8 migration: fold the boolean calcMethodAuto into calcMethodByCountry.
          // Old value `false` + a saved country → stash that user's explicit choice
          // under their country so it still applies when they return; every other
          // country falls back to getRecommendedMethod.
          if (!parsed.calcMethodByCountry) parsed.calcMethodByCountry = {};
          if (parsed.calcMethodAuto === false && parsed.calcMethod && cc) {
            parsed.calcMethodByCountry = {
              ...parsed.calcMethodByCountry,
              [cc]: parsed.calcMethod,
            };
          }
          if (!parsed.prayerOffsets) parsed.prayerOffsets = { fajr: 0, dhuhr: 0, asr: 0, isha: 0 };
          if (typeof parsed.perPrayerOffsetsEnabled !== 'boolean') parsed.perPrayerOffsetsEnabled = false;
          if (!Array.isArray(parsed.savedCities)) parsed.savedCities = [];
          // Migrate old string-format notifications → new {banner, athan} object format
          if (parsed.prayerNotifications) {
            const migrated: Record<string, PrayerNotifConfig> = {};
            for (const [k, v] of Object.entries(parsed.prayerNotifications)) {
              if (typeof v === 'string') {
                // Old string format migration
                const old = v as string;
                if (old === 'banner')            migrated[k] = { banner: true,  athan: 'none' };
                else if (old === 'athan_full')   migrated[k] = { banner: false, athan: 'full' };
                else if (old === 'athan_abbreviated') migrated[k] = { banner: false, athan: 'abbreviated' };
                else                             migrated[k] = { banner: false, athan: 'none' };
              } else if (typeof v === 'object' && v !== null) {
                migrated[k] = v as PrayerNotifConfig;
              }
            }
            parsed.prayerNotifications = migrated;
          } else if (parsed.notificationPrayers) {
            const notifs: Record<string, PrayerNotifConfig> = {};
            const oldPrayers: string[] = parsed.notificationPrayers || [];
            const oldAthan: boolean = parsed.notificationAthan || false;
            const oldAthanType: string = parsed.athanType || 'full';
            for (const p of oldPrayers) {
              notifs[p] = oldAthan
                ? { banner: false, athan: oldAthanType === 'abbreviated' ? 'abbreviated' : 'full' }
                : { banner: true, athan: 'none' };
            }
            parsed.prayerNotifications = notifs;
          }
          delete parsed.notificationPrayers;
          delete parsed.notificationBanner;
          delete parsed.notificationAthan;
          delete parsed.athanType;
          // Ensure secondLang exists (migration for existing users)
          if (!parsed.secondLang) {
            parsed.secondLang = 'auto';
          }
          // Derive translitLang from app language for new installs.
          // Use SUPPORTED_TRANSLIT_LANGS (excludes fa/ur which use Arabic script natively).
          if (!parsed.translitLang) {
            const userLang: Lang = parsed.lang ?? DEFAULT_SETTINGS.lang;
            parsed.translitLang = SUPPORTED_TRANSLIT_LANGS.includes(userLang) ? userLang : 'en';
          }
          const merged = { ...DEFAULT_SETTINGS, ...parsed };
          setSettings(merged);
        }
        if (b) setBookmarks(JSON.parse(b));
        if (lrp) setLastReadPageState(parseInt(lrp, 10));
        if (lrs) setLastReadSurahState(parseInt(lrs, 10));
        if (cc) setCountryCode(cc);
        if (tls) setTranslitLastSurahState(parseInt(tls, 10));
        if (tlp) setTranslitLastPageState(parseInt(tlp, 10));
      } catch {}
      setLoaded(true);
    })();
  }, []);

  // Effective location: use manual location if in manual mode, else GPS location.
  const effectiveLocation: LocationData | null =
    settings.locationMode === 'manual' && settings.manualLocation
      ? settings.manualLocation
      : location;

  // Prefer the country code stored with the manual location when in manual mode.
  // This ensures Jumu'ah "Auto (by location)" works from both manual and GPS locations,
  // not just when device GPS has been used recently.
  const effectiveCountryCode: string | null =
    settings.locationMode === 'manual' && settings.manualLocation?.countryCode
      ? settings.manualLocation.countryCode
      : countryCode;

  // Effective method resolution: per-city (SavedCity.calcMethod) → per-country
  // (calcMethodByCountry[cc]) → recommended (getRecommendedMethod). This is the SINGLE
  // source of truth for what method the app applies.
  const currentSavedCity: SavedCity | null =
    effectiveLocation?.savedCityId
      ? (settings.savedCities?.find(c => c.id === effectiveLocation.savedCityId) ?? null)
      : null;
  const countryOverride: CalcMethod | undefined =
    effectiveCountryCode ? settings.calcMethodByCountry?.[effectiveCountryCode] : undefined;
  const effectiveCalcMethod: CalcMethod =
    currentSavedCity?.calcMethod
      ?? countryOverride
      ?? getRecommendedMethod(effectiveCountryCode, effectiveLocation?.lat ?? null);

  // Maghrib ihtiyat has TWO independent sources: (1) the METHOD-baked adjustment adhan
  // (or our custom Aladhan-23 Jordan) applies inside calculatePrayerTimes — Jordan +5,
  // Turkey +7 (Diyanet), Moonsighting +3, else 0; (2) the country-table BASE we layer
  // on top only when the method itself does NOT already carry one — so we don't double
  // count Jordan (5+5) or Turkey (7+5). Everything else uses the country default
  // (SA:2, EG:3, GB:2, …). The user's ± tune stacks on top of the base.
  //   maghribOffset       = what the CALCULATION receives (base + user, NOT baked adj)
  //   maghribEffective    = what the USER SEES as their true total (baked + base + user)
  //                         → drives the Settings badge only; never touched by adhan.
  const methodCarriesMaghribAdj =
    effectiveCalcMethod === 'Jordan' || effectiveCalcMethod === 'Turkey';
  const maghribBase = methodCarriesMaghribAdj ? 0 : getMaghribOffset(effectiveCountryCode);
  const maghribOffset = maghribBase + maghribUserAdj;
  const maghribEffective = methodBakedMaghribAdj(effectiveCalcMethod) + maghribBase + maghribUserAdj;

  // Resolve a non-null IANA timezone in BOTH modes — so the DST switch renders
  // everywhere — but from the RIGHT source in each:
  //   • GPS/auto → the OS device timezone (Intl). In GPS mode the device is
  //     physically where you are, so its zone is authoritative — the same source
  //     every other app on the phone trusts. Do NOT re-derive from coordinates:
  //     tz-lookup's polygons are coarse (e.g. the Hopi Reservation resolves to
  //     America/Denver and would adopt DST, but the device correctly reads
  //     America/Phoenix, which does not — the exact case the override exists for).
  //   • manual → tz-lookup(coords), because a manually-picked city has no device
  //     zone to trust. If tz-lookup is wrong there, the manual on/off override is
  //     the escape hatch.
  const locationTimezone: string | null = (() => {
    if (settings.locationMode === 'manual' && settings.manualLocation) {
      try { return tzlookup(settings.manualLocation.lat, settings.manualLocation.lng); }
      catch { return null; }
    }
    if (effectiveLocation) {
      try { return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null; }
      catch { return null; }
    }
    return null;
  })();

  // Numeric offset kept for the astronomy helpers (moon phases, crescent windows)
  // that still work in offset space. DST-aware — derived from the resolved timezone
  // for the current instant — instead of the old crude lng/15 guess. Falls back to
  // lng/15 only if the zone can't be resolved.
  const locationUtcOffset: number | null = effectiveLocation
    ? (zoneOffsetHours(locationTimezone, new Date())
        ?? Math.round(effectiveLocation.lng / 15))
    : null;

  // ── Daylight-saving resolution + override (all location modes) ───────────────
  // The zone is resolved from coordinates in every mode, so the switch is always
  // meaningful. auto → trust the IANA zone per-instant (Intl, DST-aware); on →
  // force standard+1; off → force standard. In auto mode the display path renders
  // per-instant in the zone (dstOverrideOffset stays null, so it tracks DST as the
  // viewed date changes); on/off pin a fixed offset and shift the notification /
  // widget instants by dstShiftMs so the alarm fires at the displayed wall-clock
  // even on a stale device clock. The switch POSITION is the resolved effective
  // state, date-dependent in auto (London: BST in Jul, GMT in Jan).
  const _dstNow = new Date();
  const dstAutoOffset = zoneOffsetHours(locationTimezone, _dstNow);
  const dstStandard = standardOffset(locationTimezone, _dstNow);
  const dstAutoOn = isDstActive(locationTimezone, _dstNow); // null if zone unresolved
  const dstOverrideOffset: number | null =
    settings.dstMode === 'auto' || dstStandard === null
      ? null
      : settings.dstMode === 'on'
      ? dstStandard + 1
      : dstStandard;
  const dstShiftMs =
    dstOverrideOffset !== null && dstAutoOffset !== null
      ? Math.round((dstOverrideOffset - dstAutoOffset) * 60) * 60000
      : 0;
  const dstEffectiveOffset =
    settings.dstMode === 'auto' ? dstAutoOffset : dstOverrideOffset;
  const _utcLabel = (off: number | null): string => {
    if (off === null) return '';
    const sign = off < 0 ? '-' : '+';
    const abs = Math.abs(off);
    const h = Math.floor(abs);
    const mm = Math.round((abs - h) * 60);
    return mm === 0 ? `UTC${sign}${h}` : `UTC${sign}${h}:${String(mm).padStart(2, '0')}`;
  };
  let _tzAbbrev: string | null = null;
  if (locationTimezone) {
    try {
      _tzAbbrev = new Intl.DateTimeFormat('en-US', { timeZone: locationTimezone, timeZoneName: 'short' })
        .formatToParts(_dstNow).find(p => p.type === 'timeZoneName')?.value ?? null;
    } catch { _tzAbbrev = null; }
  }
  const dstResolved = {
    applicable: locationTimezone !== null,       // true in both modes once the zone resolves
    // Resolved effective state for the current selection (date-dependent in auto).
    on: settings.dstMode === 'auto' ? (dstAutoOn ?? false) : settings.dstMode === 'on',
    // What 'auto' resolves to today — the "expected" value shown when an override disagrees.
    autoOn: dstAutoOn ?? false,
    offsetLabel: _utcLabel(dstEffectiveOffset),
    abbrev: _tzAbbrev,                           // zone abbrev (BST/GMT/…) for the auto subtitle
    mismatch:
      settings.dstMode !== 'auto' &&
      dstOverrideOffset !== null &&
      dstAutoOffset !== null &&
      Math.abs(dstOverrideOffset - dstAutoOffset) > 0.01,
  };

  const isDark =
    settings.themeMode === 'dark'
      ? true
      : settings.themeMode === 'light'
      ? false
      : systemScheme === 'dark';

  const resolvedSecondLang: Lang =
    settings.secondLang === 'auto'
      ? detectSecondLang(effectiveCountryCode)
      : settings.secondLang;

  const isRtl = isRtlLang(settings.lang);

  const colors: ColorPalette = getColors(isDark, settings.accessibilityTheme ?? 'default');

  // Load per-country Maghrib user adjustment whenever the active country changes.
  useEffect(() => {
    if (!effectiveCountryCode) { setMaghribUserAdjState(0); return; }
    AsyncStorage.getItem(`maghribOffset_${effectiveCountryCode}`)
      .then(v => setMaghribUserAdjState(v !== null ? parseInt(v, 10) : 0))
      .catch(() => {});
  }, [effectiveCountryCode]);

  useEffect(() => {
    if (!effectiveLocation) {
      console.log('[Notifications] rescheduleAll skipped — effectiveLocation is null');
      return;
    }
    const { prayerNotifications, lang, asrMethod, thikrRemindersEnabled } = settings;
    // Notifications/widget must use the SAME effective method the UI displays
    // (per-city → per-country → recommended), not the raw settings.calcMethod.
    const calcMethod = effectiveCalcMethod;
    const hasAny = Object.values(prayerNotifications).some(v => v.banner || v.athan !== 'none');
    console.log(`[Notifications] rescheduleAll triggered — hasAny=${hasAny} thikrEnabled=${thikrRemindersEnabled} location=${effectiveLocation.lat.toFixed(3)},${effectiveLocation.lng.toFixed(3)}`);

    const perPrayerOn = settings.perPrayerOffsetsEnabled;
    const _pOff = settings.prayerOffsets ?? { fajr: 0, dhuhr: 0, asr: 0, isha: 0 };
    const fajrOffset  = perPrayerOn ? (_pOff.fajr  ?? 0) : 0;
    const dhuhrOffset = perPrayerOn ? (_pOff.dhuhr ?? 0) : 0;
    const asrOffset   = perPrayerOn ? (_pOff.asr   ?? 0) : 0;
    const ishaOffset  = perPrayerOn ? (_pOff.isha  ?? 0) : 0;

    const rescheduleAll = async () => {
      try {
        let prayerCount = 0;
        if (hasAny) {
          prayerCount = await schedulePrayerNotifications({
            location: effectiveLocation,
            calcMethod,
            asrMethod,
            maghribOffset,
            fajrOffset,
            dhuhrOffset,
            asrOffset,
            ishaOffset,
            prayerNotifications,
            lang,
            firstAdhanOffset: settings.firstAdhanOffset ?? 0,
            countryCode: effectiveCountryCode,
            locationUtcOffset,
            dhuhaTime: settings.dhuhaTime ?? '07:30',
            tahajjudTime: settings.tahajjudTime ?? '03:00',
            selectedAdhan: settings.selectedAdhan ?? 'makkah',
            prayerAdhan: settings.prayerAdhan ?? {},
            prePrayerReminder: settings.prePrayerReminder ?? 0,
            jumuahTime: settings.jumuahTime ?? null,
            timezone: locationTimezone,
            dstShiftMs,
          });
        } else {
          await cancelAllPrayerNotifications();
        }
        if (thikrRemindersEnabled) {
          await cancelThikrNotifications();
          await scheduleThikrNotifications({
            lang,
            location: effectiveLocation,
            calcMethod,
            asrMethod,
            maghribOffset,
            timezone: locationTimezone,
            dstShiftMs,
            reservedSlots: prayerCount,
          });
        } else {
          await cancelThikrNotifications();
        }
      } catch { /* notifications unavailable on this platform */ }

      // Push the full 48-hour prayer timeline (today + tomorrow) to the iOS
      // WidgetKit extension. The widget builds one TimelineEntry per prayer
      // transition with policy .atEnd, so it auto-refreshes after the last entry.
      try {
        updateWidgetFromParams({
          lat: effectiveLocation.lat,
          lng: effectiveLocation.lng,
          method: calcMethod,
          asrMethod,
          maghribOffset,
          fajrOffset,
          dhuhrOffset,
          asrOffset,
          ishaOffset,
          lang,
          timezone: locationTimezone,
          dstShiftMs,
        });
      } catch { /* non-critical */ }
    };

    rescheduleAll();
  }, [effectiveLocation, settings.prayerNotifications, effectiveCalcMethod, settings.asrMethod, settings.lang, maghribOffset, settings.firstAdhanOffset, effectiveCountryCode, locationUtcOffset, locationTimezone, settings.dhuhaTime, settings.tahajjudTime, settings.thikrRemindersEnabled, settings.selectedAdhan, settings.prayerAdhan, settings.prePrayerReminder, settings.jumuahTime, dstShiftMs, settings.perPrayerOffsetsEnabled, settings.prayerOffsets]);

  // Date-rollover watcher: while the app stays open across midnight, push a
  // fresh widget timeline so "today" rolls to the next calendar day.
  useEffect(() => {
    if (!effectiveLocation) return;
    const _pOff2 = settings.prayerOffsets ?? { fajr: 0, dhuhr: 0, asr: 0, isha: 0 };
    const _perPrayerOn = settings.perPrayerOffsetsEnabled;
    const tick = () => {
      try {
        updateWidgetFromParams({
          lat: effectiveLocation.lat,
          lng: effectiveLocation.lng,
          method: effectiveCalcMethod,
          asrMethod: settings.asrMethod,
          maghribOffset,
          fajrOffset:  _perPrayerOn ? _pOff2.fajr  : 0,
          dhuhrOffset: _perPrayerOn ? _pOff2.dhuhr : 0,
          asrOffset:   _perPrayerOn ? _pOff2.asr   : 0,
          ishaOffset:  _perPrayerOn ? _pOff2.isha  : 0,
          lang: settings.lang,
          timezone: locationTimezone,
          dstShiftMs,
        });
      } catch { /* non-critical */ }
    };
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(0, 0, 30, 0);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    const timeoutId = setTimeout(tick, msUntilMidnight);
    return () => clearTimeout(timeoutId);
  }, [effectiveLocation, effectiveCalcMethod, settings.asrMethod, settings.lang, maghribOffset, locationTimezone, dstShiftMs, settings.perPrayerOffsetsEnabled, settings.prayerOffsets]);

  const updateSettings = async (partial: Partial<AppSettings>) => {
    const next = { ...settings, ...partial };
    setSettings(next);
    await AsyncStorage.setItem('settings', JSON.stringify(next));
  };

  const setLocation = async (loc: LocationData | null) => {
    setLocationState(loc);
    if (loc?.countryCode) {
      setCountryCode(loc.countryCode);
      await AsyncStorage.setItem('countryCode', loc.countryCode);
    }
  };

  const addBookmark = async (b: Bookmark) => {
    setBookmarks(prev => {
      const next = [b, ...prev.filter(x => !(x.surahNumber === b.surahNumber && x.ayahNumber === b.ayahNumber))];
      AsyncStorage.setItem('bookmarks', JSON.stringify(next));
      return next;
    });
  };

  const removeBookmark = async (surahNumber: number, ayahNumber: number) => {
    setBookmarks(prev => {
      const next = prev.filter(x => !(x.surahNumber === surahNumber && x.ayahNumber === ayahNumber));
      AsyncStorage.setItem('bookmarks', JSON.stringify(next));
      return next;
    });
  };

  const isBookmarked = (surahNumber: number, ayahNumber: number) =>
    bookmarks.some(b => b.surahNumber === surahNumber && b.ayahNumber === ayahNumber);

  const setLastReadPage = async (page: number) => {
    setLastReadPageState(page);
    await AsyncStorage.setItem('lastReadPage', String(page));
  };

  const setLastReadSurah = async (surah: number) => {
    setLastReadSurahState(surah);
    await AsyncStorage.setItem('lastReadSurah', String(surah));
  };

  const setTranslitLastSurah = async (surah: number) => {
    setTranslitLastSurahState(surah);
    await AsyncStorage.setItem('translitLastSurah', String(surah));
  };

  const setTranslitLastPage = async (page: number) => {
    setTranslitLastPageState(page);
    await AsyncStorage.setItem('translitLastPage', String(page));
  };

  const setMaghribUserAdj = async (adj: number) => {
    setMaghribUserAdjState(adj);
    if (effectiveCountryCode) {
      await AsyncStorage.setItem(`maghribOffset_${effectiveCountryCode}`, String(adj));
    }
  };

  const addSavedCity: AppContextValue['addSavedCity'] = async (c) => {
    // De-dupe by ~11 m precision so re-saving the same GPS pin doesn't create a copy.
    const key = (lat: number, lng: number) => `${lat.toFixed(4)},${lng.toFixed(4)}`;
    const existing = settings.savedCities.find(x => key(x.lat, x.lng) === key(c.lat, c.lng));
    const id = existing?.id ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const nextList = existing
      ? settings.savedCities.map(x => x.id === id ? { ...x, ...c, id } : x)
      : [...settings.savedCities, { ...c, id }];
    await updateSettings({ savedCities: nextList });
    return id;
  };

  const removeSavedCity: AppContextValue['removeSavedCity'] = async (id) => {
    await updateSettings({ savedCities: settings.savedCities.filter(x => x.id !== id) });
  };

  const useSavedCity: AppContextValue['useSavedCity'] = async (id) => {
    const city = (settings.savedCities ?? []).find(x => x.id === id);
    if (!city) return;
    const loc: LocationData = {
      lat: city.lat, lng: city.lng, city: city.city,
      countryCode: city.countryCode, savedCityId: city.id,
    };
    // Atomic switch. Set the raw location + countryCode STATE first so the sync
    // effect in index.tsx sees the new city on the SAME render as settings.manualLocation,
    // avoiding a 1-frame window where effectiveCalcMethod already switched to the new
    // country but the prayer-times calc still used the previous location's coords.
    setLocationState(loc);
    if (loc.countryCode) {
      setCountryCode(loc.countryCode);
      AsyncStorage.setItem('countryCode', loc.countryCode).catch(() => {});
    }
    await updateSettings({ locationMode: 'manual', manualLocation: loc });
  };

  const switchToLocation = async (loc: LocationData): Promise<void> => {
    // Non-saved location switch (search-result-tap flow in LocationModal). Same atomic
    // pattern as useSavedCity so the method + times switch in one render.
    setLocationState(loc);
    if (loc.countryCode) {
      setCountryCode(loc.countryCode);
      AsyncStorage.setItem('countryCode', loc.countryCode).catch(() => {});
    }
    await updateSettings({ locationMode: 'manual', manualLocation: loc });
  };

  const setEffectiveCalcMethod: AppContextValue['setEffectiveCalcMethod'] = async (m) => {
    if (currentSavedCity) {
      const nextList = settings.savedCities.map(x =>
        x.id === currentSavedCity.id ? { ...x, calcMethod: m } : x,
      );
      await updateSettings({ savedCities: nextList });
    } else if (effectiveCountryCode) {
      await updateSettings({
        calcMethodByCountry: { ...settings.calcMethodByCountry, [effectiveCountryCode]: m },
      });
    } else {
      // No location yet — stash on the raw calcMethod field as a last resort.
      await updateSettings({ calcMethod: m });
    }
  };

  const value = useMemo<AppContextValue>(
    () => ({
      ...settings,
      calcMethod: effectiveCalcMethod, // override raw setting with the location-aware effective method
      effectiveCalcMethod,
      isDark,
      isRtl,
      colors,
      resolvedSecondLang,
      location,
      setLocation,
      maghribBase,
      maghribOffset,
      maghribEffective,
      maghribUserAdj,
      setMaghribUserAdj,
      countryCode: effectiveCountryCode,
      locationUtcOffset,
      locationTimezone,
      dstOverrideOffset,
      dstShiftMs,
      dstResolved,
      bookmarks,
      addBookmark,
      removeBookmark,
      isBookmarked,
      updateSettings,
      lastReadPage,
      setLastReadPage,
      lastReadSurah,
      setLastReadSurah,
      translitLastSurah,
      setTranslitLastSurah,
      translitLastPage,
      setTranslitLastPage,
      quranNavTarget,
      setQuranNavTarget,
      addSavedCity,
      removeSavedCity,
      useSavedCity,
      switchToLocation,
      setEffectiveCalcMethod,
    }),
    [settings, isDark, isRtl, colors, resolvedSecondLang, location, maghribBase, maghribOffset, maghribEffective, maghribUserAdj, effectiveCountryCode, effectiveCalcMethod, currentSavedCity, locationUtcOffset, locationTimezone, dstOverrideOffset, dstShiftMs, dstResolved, bookmarks, lastReadPage, lastReadSurah, translitLastSurah, translitLastPage, quranNavTarget],
  );

  if (!loaded) return null;

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

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
import { zoneOffsetHours, standardOffset, isDstActive } from '@/lib/prayer-times';
import tzlookup from 'tz-lookup'; // types provided by types/tz-lookup.d.ts
import { updateWidgetFromParams } from '@/lib/widget';

import type { Lang } from '@/constants/i18n';
import { isRtlLang, detectSecondLang } from '@/constants/i18n';
import { BUNDLED_LANGS, SUPPORTED_TRANSLIT_LANGS } from '@/lib/quran-transliteration';
import { getRecommendedMethod } from '@/lib/method-by-country';
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
  /** When true, calcMethod follows the location recommendation (getRecommendedMethod);
   *  set false the moment the user picks a method explicitly. */
  calcMethodAuto: boolean;
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
}

interface AppContextValue extends AppSettings {
  isDark: boolean;
  isRtl: boolean;
  colors: ColorPalette;
  resolvedSecondLang: Lang;
  location: LocationData | null;
  setLocation: (loc: LocationData | null) => void;
  maghribBase: number;
  maghribOffset: number;
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
}

const DEFAULT_SETTINGS: AppSettings = {
  lang: 'ar',
  secondLang: 'auto',
  translitLang: 'en',
  themeMode: 'dark',
  accessibilityTheme: 'default',
  calcMethod: 'MWL',
  calcMethodAuto: true,
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

  // The per-country Maghrib ihtiyat is now supplied by adhan's own method parameters
  // (e.g. Diyanet Turkey +7, Jordan +5). The old per-country DEFAULT table would
  // stack on top of that (Turkey +12, Jordan +10), so it is no longer applied — only
  // the user's explicit tune (maghribUserAdj) is layered on adhan's output.
  const maghribBase = 0;
  const maghribOffset = maghribUserAdj;

  // Effective method: follows the location recommendation (Moonsighting for the UK
  // and above ~48°) until the user picks one explicitly (calcMethodAuto → false).
  const effectiveCalcMethod: CalcMethod = settings.calcMethodAuto
    ? getRecommendedMethod(effectiveCountryCode, effectiveLocation?.lat ?? null)
    : settings.calcMethod;

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
    const { prayerNotifications, lang, calcMethod, asrMethod, thikrRemindersEnabled } = settings;
    const hasAny = Object.values(prayerNotifications).some(v => v.banner || v.athan !== 'none');
    console.log(`[Notifications] rescheduleAll triggered — hasAny=${hasAny} thikrEnabled=${thikrRemindersEnabled} location=${effectiveLocation.lat.toFixed(3)},${effectiveLocation.lng.toFixed(3)}`);

    const rescheduleAll = async () => {
      try {
        let prayerCount = 0;
        if (hasAny) {
          prayerCount = await schedulePrayerNotifications({
            location: effectiveLocation,
            calcMethod,
            asrMethod,
            maghribOffset,
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
          lang,
          timezone: locationTimezone,
          dstShiftMs,
        });
      } catch { /* non-critical */ }
    };

    rescheduleAll();
  }, [effectiveLocation, settings.prayerNotifications, settings.calcMethod, settings.asrMethod, settings.lang, maghribOffset, settings.firstAdhanOffset, effectiveCountryCode, locationUtcOffset, locationTimezone, settings.dhuhaTime, settings.tahajjudTime, settings.thikrRemindersEnabled, settings.selectedAdhan, settings.prayerAdhan, settings.prePrayerReminder, settings.jumuahTime, dstShiftMs]);

  // Date-rollover watcher: while the app stays open across midnight, push a
  // fresh widget timeline so "today" rolls to the next calendar day.
  useEffect(() => {
    if (!effectiveLocation) return;
    const tick = () => {
      try {
        updateWidgetFromParams({
          lat: effectiveLocation.lat,
          lng: effectiveLocation.lng,
          method: settings.calcMethod,
          asrMethod: settings.asrMethod,
          maghribOffset,
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
  }, [effectiveLocation, settings.calcMethod, settings.asrMethod, settings.lang, maghribOffset, locationTimezone, dstShiftMs]);

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

  const value = useMemo<AppContextValue>(
    () => ({
      ...settings,
      calcMethod: effectiveCalcMethod, // override raw setting with the location-aware effective method
      isDark,
      isRtl,
      colors,
      resolvedSecondLang,
      location,
      setLocation,
      maghribBase,
      maghribOffset,
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
    }),
    [settings, isDark, isRtl, colors, resolvedSecondLang, location, maghribBase, maghribOffset, maghribUserAdj, effectiveCountryCode, effectiveCalcMethod, locationUtcOffset, locationTimezone, dstOverrideOffset, dstShiftMs, dstResolved, bookmarks, lastReadPage, lastReadSurah, translitLastSurah, translitLastPage, quranNavTarget],
  );

  if (!loaded) return null;

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

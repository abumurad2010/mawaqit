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

import type { Lang } from '@/constants/i18n';
import { isRtlLang, detectSecondLang } from '@/constants/i18n';
import { BUNDLED_LANGS } from '@/lib/quran-transliteration';
import { getMaghribOffset, DEFAULT_OFFSET } from '@/lib/maghrib-offsets';
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
  asrMethod: AsrMethod;
  locationMode: 'auto' | 'manual';
  manualLocation: LocationData | null;
  fontSize: 'small' | 'medium' | 'large' | 'xlarge' | 'xxlarge';
  maghribAdjustment: number;
  hijriAdjustment: number;
  firstAdhanOffset: number;
  prayerNotifications: Record<string, PrayerNotifType>;
  dhuhaTime: string;     // "HH:MM" exact local time for Dhuha
  tahajjudTime: string;  // "HH:MM" exact local time for Tahajjud/Qiyam
  showDhuha: boolean;    // whether to show Dhuha row on timings tab
  showQiyam: boolean;    // whether to show Qiyam row on timings tab
  eidPrayerTime: string; // "HH:MM" official Eid prayer time (shown only on Eid days)
  iqamaOffsets: Record<string, number>; // per-prayer iqama delay in minutes (user overrides)
  thikrRemindersEnabled: boolean;
  dstEnabled: boolean;
  defaultTab: string;
  selectedAdhan: string;
  prayerAdhan: Record<string, string>;
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
  countryCode: string | null;
  locationUtcOffset: number | null;
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
}

const DEFAULT_SETTINGS: AppSettings = {
  lang: 'ar',
  secondLang: 'auto',
  translitLang: 'en',
  themeMode: 'dark',
  accessibilityTheme: 'default',
  calcMethod: 'MWL',
  asrMethod: 'standard',
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
};

const VALID_CALC_METHODS = [
  'MWL','ISNA','Egypt','MakkahUmmQura','Karachi','Jordan',
  'Kuwait','Qatar','Algeria','Morocco','Singapore','Turkey','France','Russia',
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
  const [loaded, setLoaded] = useState(false);

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
          // Derive translitLang from app language for new installs
          if (!parsed.translitLang) {
            const userLang: Lang = parsed.lang ?? DEFAULT_SETTINGS.lang;
            parsed.translitLang = BUNDLED_LANGS.includes(userLang) ? userLang : 'en';
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

  const maghribBase = getMaghribOffset(effectiveCountryCode);
  const maghribOffset = maghribBase + (settings.maghribAdjustment ?? 0);

  const locationUtcOffset: number | null =
    settings.locationMode === 'manual' && settings.manualLocation
      ? Math.round(settings.manualLocation.lng / 15)
      : null;

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

  useEffect(() => {
    if (!effectiveLocation) return;
    const { prayerNotifications, lang, calcMethod, asrMethod, thikrRemindersEnabled, dstEnabled } = settings;
    const hasAny = Object.values(prayerNotifications).some(v => v.banner || v.athan !== 'none');
    const dstOffsetMs = dstEnabled ? 3600000 : 0;

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
            dstOffsetMs,
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
            dstOffsetMs,
            reservedSlots: prayerCount,
          });
        } else {
          await cancelThikrNotifications();
        }
      } catch { /* notifications unavailable on this platform */ }
    };

    rescheduleAll();
  }, [effectiveLocation, settings.prayerNotifications, settings.calcMethod, settings.asrMethod, settings.lang, maghribOffset, settings.firstAdhanOffset, effectiveCountryCode, locationUtcOffset, settings.dhuhaTime, settings.tahajjudTime, settings.thikrRemindersEnabled, settings.dstEnabled, settings.selectedAdhan, settings.prayerAdhan]);

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

  const value = useMemo<AppContextValue>(
    () => ({
      ...settings,
      isDark,
      isRtl,
      colors,
      resolvedSecondLang,
      location,
      setLocation,
      maghribBase,
      maghribOffset,
      countryCode: effectiveCountryCode,
      locationUtcOffset,
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
    }),
    [settings, isDark, isRtl, colors, resolvedSecondLang, location, maghribBase, maghribOffset, effectiveCountryCode, locationUtcOffset, bookmarks, lastReadPage, lastReadSurah, translitLastSurah, translitLastPage],
  );

  if (!loaded) return null;

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

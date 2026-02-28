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
import { getMaghribOffset, DEFAULT_OFFSET } from '@/lib/maghrib-offsets';
import { schedulePrayerNotifications, cancelAllPrayerNotifications } from '@/lib/notifications';

export interface Bookmark {
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  ayahText: string;
  timestamp: number;
}

export interface LocationData {
  lat: number;
  lng: number;
  city?: string;
  country?: string;
  countryCode?: string;
}

interface AppSettings {
  lang: Lang;
  themeMode: 'auto' | 'light' | 'dark';
  calcMethod: CalcMethod;
  asrMethod: AsrMethod;
  locationMode: 'auto' | 'manual';
  manualLocation: LocationData | null;
  fontSize: 'small' | 'medium' | 'large';
  maghribAdjustment: number;
  hijriAdjustment: number;
  notificationPrayers: string[];
  notificationBanner: boolean;
  notificationAthan: boolean;
}

interface AppContextValue extends AppSettings {
  isDark: boolean;
  location: LocationData | null;
  setLocation: (loc: LocationData | null) => void;
  maghribBase: number;
  maghribOffset: number;
  countryCode: string | null;
  /** UTC offset in whole hours for manual location (Math.round(lng/15)), or null for auto */
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
}

const DEFAULT_SETTINGS: AppSettings = {
  lang: 'ar',
  themeMode: 'auto',
  calcMethod: 'MWL',
  asrMethod: 'standard',
  locationMode: 'auto',
  manualLocation: null,
  fontSize: 'medium',
  maghribAdjustment: 0,
  hijriAdjustment: 0,
  notificationPrayers: [],
  notificationBanner: true,
  notificationAthan: false,
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [location, setLocationState] = useState<LocationData | null>(null);
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [lastReadPage, setLastReadPageState] = useState(1);
  const [lastReadSurah, setLastReadSurahState] = useState(1);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [s, b, lrp, lrs, cc] = await Promise.all([
          AsyncStorage.getItem('settings'),
          AsyncStorage.getItem('bookmarks'),
          AsyncStorage.getItem('lastReadPage'),
          AsyncStorage.getItem('lastReadSurah'),
          AsyncStorage.getItem('countryCode'),
        ]);
        if (s) {
          const parsed = JSON.parse(s);
          delete parsed.maghribOffset;
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        }
        if (b) setBookmarks(JSON.parse(b));
        if (lrp) setLastReadPageState(parseInt(lrp, 10));
        if (lrs) setLastReadSurahState(parseInt(lrs, 10));
        if (cc) setCountryCode(cc);
      } catch {}
      setLoaded(true);
    })();
  }, []);

  const maghribBase = getMaghribOffset(countryCode);
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

  useEffect(() => {
    if (!location) return;
    const { notificationPrayers, notificationBanner, notificationAthan, lang, calcMethod, asrMethod } = settings;
    if (notificationPrayers.length === 0 || (!notificationBanner && !notificationAthan)) {
      cancelAllPrayerNotifications();
      return;
    }
    schedulePrayerNotifications({
      location,
      calcMethod,
      asrMethod,
      maghribOffset,
      notificationPrayers,
      notificationBanner,
      notificationAthan,
      lang,
    });
  }, [location, settings.notificationPrayers, settings.notificationBanner, settings.notificationAthan, settings.calcMethod, settings.asrMethod, settings.lang, maghribOffset]);

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

  const value = useMemo<AppContextValue>(
    () => ({
      ...settings,
      isDark,
      location,
      setLocation,
      maghribBase,
      maghribOffset,
      countryCode,
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
    }),
    [settings, isDark, location, maghribBase, maghribOffset, countryCode, locationUtcOffset, bookmarks, lastReadPage, lastReadSurah],
  );

  if (!loaded) return null;

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

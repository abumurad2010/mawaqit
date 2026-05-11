import { NativeModules, Platform } from 'react-native';
import type { Lang } from '@/constants/i18n';
import type { PrayerTimes } from '@/lib/prayer-times';

// Per-language abbreviations for each prayer key.
// Keys match prayer-times.ts: fajr, dhuhr, asr, maghrib, isha.
// RTL scripts (ar, ur, fa) use the natural short Arabic/Persian word — no truncation needed.
const PRAYER_ABBR: Record<Lang, Record<string, string>> = {
  en: { fajr: 'FJR', dhuhr: 'DHR', asr: 'ASR', maghrib: 'MGB', isha: 'ISH' },
  ar: { fajr: 'فجر', dhuhr: 'ظهر', asr: 'عصر', maghrib: 'مغرب', isha: 'عشاء' },
  fr: { fajr: 'FJR', dhuhr: 'DHR', asr: 'ASR', maghrib: 'MGB', isha: 'ISH' },
  es: { fajr: 'FJR', dhuhr: 'DHR', asr: 'ASR', maghrib: 'MGB', isha: 'ISH' },
  ru: { fajr: 'ФДЖ', dhuhr: 'ДХУ', asr: 'АСР', maghrib: 'МАГ', isha: 'ИША' },
  zh: { fajr: '晨',  dhuhr: '晌',  asr: '晡',  maghrib: '昏',   isha: '宵'  },
  tr: { fajr: 'SBH', dhuhr: 'ÖGL', asr: 'İKD', maghrib: 'AKŞ', isha: 'YTS' },
  ur: { fajr: 'فجر', dhuhr: 'ظہر', asr: 'عصر', maghrib: 'مغرب', isha: 'عشاء' },
  id: { fajr: 'FJR', dhuhr: 'DHR', asr: 'ASR', maghrib: 'MGB', isha: 'ISH' },
  bn: { fajr: 'ফজ', dhuhr: 'যহ',  asr: 'আস', maghrib: 'মাগ',  isha: 'এশা' },
  fa: { fajr: 'فجر', dhuhr: 'ظهر', asr: 'عصر', maghrib: 'مغرب', isha: 'عشاء' },
  ms: { fajr: 'FJR', dhuhr: 'ZHR', asr: 'ASR', maghrib: 'MGB', isha: 'ISH' },
  pt: { fajr: 'FJR', dhuhr: 'DHR', asr: 'ASR', maghrib: 'MGB', isha: 'ISH' },
  sw: { fajr: 'FJR', dhuhr: 'DHR', asr: 'ASR', maghrib: 'MGB', isha: 'ISH' },
  ha: { fajr: 'FJR', dhuhr: 'DHR', asr: 'ASR', maghrib: 'MGB', isha: 'ISH' },
};

/** Returns a short display label for a prayer key in the given language. */
export function getPrayerAbbreviation(prayerKey: string, lang: Lang): string {
  return PRAYER_ABBR[lang]?.[prayerKey] ?? prayerKey.slice(0, 3).toUpperCase();
}

export function updateWidget(
  prayerName: string,
  prayerTime: string,
  countdown: string,
  prayerName2: string,
  prayerTime2: string,
): void {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
  try {
    NativeModules.WidgetDataModule?.updateWidgetData(
      prayerName, prayerTime, countdown, prayerName2, prayerTime2,
    );
  } catch {
    // Widget update must never crash the app
  }
}

/**
 * Finds the next two upcoming prayers in `times`, then pushes all fields to the
 * WidgetKit extension via the native WidgetDataModule bridge.
 *
 * Uses seconds-of-day comparison (same strategy as getNextPrayer in prayer-times.ts)
 * so it never fails due to Date object timezone edge-cases.
 */
export function updateWidgetFromPrayerTimes(times: PrayerTimes, lang: Lang): void {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
  try {
    const now = new Date();
    const nowSecs = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    const keys = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

    const upcoming: Array<{ key: (typeof keys)[number]; time: Date }> = [];
    for (const key of keys) {
      const time = times[key];
      const tSecs = time.getHours() * 3600 + time.getMinutes() * 60;
      if (tSecs > nowSecs) upcoming.push({ key, time });
      if (upcoming.length === 2) break;
    }

    if (upcoming.length === 0) return;

    const fmt = (d: Date) =>
      `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

    const first = upcoming[0]!;
    const second = upcoming[1];

    const prayerName  = getPrayerAbbreviation(first.key, lang);
    const prayerTime  = fmt(first.time);
    const diffMs      = first.time.getTime() - now.getTime();
    const diffMin     = Math.round(diffMs / 60000);
    const countdown   = diffMin > 0 ? `in ${diffMin} min` : '';

    const prayerName2 = second ? getPrayerAbbreviation(second.key, lang) : '';
    const prayerTime2 = second ? fmt(second.time) : '';

    updateWidget(prayerName, prayerTime, countdown, prayerName2, prayerTime2);
  } catch {
    // Non-critical
  }
}

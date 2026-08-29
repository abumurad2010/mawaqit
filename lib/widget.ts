import { NativeModules, Platform } from 'react-native';
import type { Lang } from '@/constants/i18n';
import {
  calculatePrayerTimes,
  type AsrMethod,
  type CalcMethod,
  type PrayerTimes,
} from '@/lib/prayer-times';

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

const FARDH_KEYS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

interface PrayerSlot {
  name: string;
  time: string;
  timestamp: number;  // seconds since epoch
}

/** Returns a short display label for a prayer key in the given language. */
export function getPrayerAbbreviation(prayerKey: string, lang: Lang): string {
  return PRAYER_ABBR[lang]?.[prayerKey] ?? prayerKey.slice(0, 3).toUpperCase();
}

function fmt(d: Date): string {
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function buildSlots(times: PrayerTimes, lang: Lang): PrayerSlot[] {
  return FARDH_KEYS.map(key => ({
    name: getPrayerAbbreviation(key, lang),
    time: fmt(times[key]),
    timestamp: Math.floor(times[key].getTime() / 1000),
  }));
}

/** Legacy single-shot update for the small/quick widget data path. */
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

/** Force WidgetKit to reload all timelines without rewriting data. */
export function reloadWidgetTimelines(): void {
  if (Platform.OS !== 'ios') return;
  try {
    NativeModules.WidgetDataModule?.reloadAllTimelines?.();
  } catch {
    // non-critical
  }
}

/**
 * Push today + tomorrow's full prayer timeline to the native widget so
 * WidgetKit can build a 48-hour timeline that automatically transitions
 * between prayers without app intervention.
 *
 * Call whenever effective prayer-times input changes: app launch, location
 * change, calc method change, date roll-over.
 */
export function updateWidgetTimeline(
  todayTimes: PrayerTimes,
  tomorrowTimes: PrayerTimes,
  lang: Lang,
): void {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
  try {
    const today = buildSlots(todayTimes, lang);
    const tomorrow = buildSlots(tomorrowTimes, lang);

    const nowSecs = Math.floor(Date.now() / 1000);
    const all = [...today, ...tomorrow];
    const idx = all.findIndex(s => s.timestamp > nowSecs);
    const first = idx >= 0 ? all[idx] : null;
    const second = idx >= 0 && idx + 1 < all.length ? all[idx + 1] : null;

    const diffMin = first ? Math.round((first.timestamp - nowSecs) / 60) : 0;
    const countdown = diffMin > 0 ? `in ${diffMin} min` : '';

    NativeModules.WidgetDataModule?.updateWidgetTimeline?.(
      JSON.stringify(today),
      JSON.stringify(tomorrow),
      first?.name ?? '',
      first?.time ?? '',
      countdown,
      second?.name ?? '',
      second?.time ?? '',
    );
  } catch {
    // non-critical
  }
}

/**
 * Convenience helper: given the location + calc params, computes today's and
 * tomorrow's prayer times and pushes the full timeline payload to the widget.
 */
export function updateWidgetFromParams(params: {
  lat: number;
  lng: number;
  method: CalcMethod;
  asrMethod: AsrMethod;
  maghribOffset: number;
  fajrOffset?: number;
  dhuhrOffset?: number;
  asrOffset?: number;
  ishaOffset?: number;
  lang: Lang;
  timezone?: string | null; // IANA zone of the location (manual mode); null → device-local
  dstShiftMs?: number;
}): void {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
  try {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 24 * 3600 * 1000);

    const perPrayer = {
      fajrOffset:  params.fajrOffset  ?? 0,
      dhuhrOffset: params.dhuhrOffset ?? 0,
      asrOffset:   params.asrOffset   ?? 0,
      ishaOffset:  params.ishaOffset  ?? 0,
    };
    const t = calculatePrayerTimes({
      lat: params.lat,
      lng: params.lng,
      date: today,
      method: params.method,
      asrMethod: params.asrMethod,
      maghribOffset: params.maghribOffset,
      ...perPrayer,
      timezone: params.timezone ?? null,
    });
    const tm = calculatePrayerTimes({
      lat: params.lat,
      lng: params.lng,
      date: tomorrow,
      method: params.method,
      asrMethod: params.asrMethod,
      maghribOffset: params.maghribOffset,
      ...perPrayer,
      timezone: params.timezone ?? null,
    });
    const dsh = params.dstShiftMs ?? 0;
    const shift = (pt: PrayerTimes): PrayerTimes => dsh === 0 ? pt : ({
      fajr: new Date(pt.fajr.getTime()+dsh), sunrise: new Date(pt.sunrise.getTime()+dsh),
      dhuhr: new Date(pt.dhuhr.getTime()+dsh), asr: new Date(pt.asr.getTime()+dsh),
      maghrib: new Date(pt.maghrib.getTime()+dsh), isha: new Date(pt.isha.getTime()+dsh),
      transit: new Date(pt.transit.getTime()+dsh),
    });
    updateWidgetTimeline(shift(t), shift(tm), params.lang);
  } catch {
    // non-critical
  }
}

/**
 * @deprecated Prefer `updateWidgetFromParams` which writes a full 48-hour
 * timeline. This wrapper is kept so existing call-sites keep working.
 *
 * Finds the next two upcoming prayers in `times` and pushes the legacy
 * single-shot data plus a synthesized today-only timeline.
 */
export function updateWidgetFromPrayerTimes(times: PrayerTimes, lang: Lang): void {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
  try {
    const now = new Date();
    const nowSecs = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

    const upcoming: Array<{ key: (typeof FARDH_KEYS)[number]; time: Date }> = [];
    for (const key of FARDH_KEYS) {
      const time = times[key];
      const tSecs = time.getHours() * 3600 + time.getMinutes() * 60;
      if (tSecs > nowSecs) upcoming.push({ key, time });
      if (upcoming.length === 2) break;
    }

    const first = upcoming[0];
    const second = upcoming[1];

    const prayerName  = first ? getPrayerAbbreviation(first.key, lang) : '';
    const prayerTime  = first ? fmt(first.time) : '';
    const diffMs      = first ? first.time.getTime() - now.getTime() : 0;
    const diffMin     = Math.round(diffMs / 60000);
    const countdown   = diffMin > 0 ? `in ${diffMin} min` : '';

    const prayerName2 = second ? getPrayerAbbreviation(second.key, lang) : '';
    const prayerTime2 = second ? fmt(second.time) : '';

    // Today-only timeline (no tomorrow data here — call updateWidgetFromParams
    // for the full 48-hour version).
    const today = buildSlots(times, lang);
    NativeModules.WidgetDataModule?.updateWidgetTimeline?.(
      JSON.stringify(today),
      JSON.stringify([]),
      prayerName,
      prayerTime,
      countdown,
      prayerName2,
      prayerTime2,
    );
  } catch {
    // Non-critical
  }
}

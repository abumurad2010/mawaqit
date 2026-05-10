import { NativeModules, Platform } from 'react-native';
import type { Lang } from '@/constants/i18n';
import { t } from '@/constants/i18n';
import type { PrayerTimes } from '@/lib/prayer-times';

export function updateWidget(
  prayerName: string,
  prayerTime: string,
  countdown: string,
  prayerName2: string,
  prayerTime2: string,
): void {
  if (Platform.OS !== 'ios') return;
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
  if (Platform.OS !== 'ios') return;
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

    const tr = t(lang);
    const labelMap: Record<string, string> = {
      fajr:    String(tr.fajr),
      dhuhr:   String(tr.dhuhr),
      asr:     String(tr.asr),
      maghrib: String(tr.maghrib),
      isha:    String(tr.isha),
    };

    const fmt = (d: Date) =>
      `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

    const first = upcoming[0]!;
    const second = upcoming[1];

    const prayerName = labelMap[first.key] ?? first.key;
    const prayerTime = fmt(first.time);
    const diffMs    = first.time.getTime() - now.getTime();
    const diffMin   = Math.round(diffMs / 60000);
    const countdown = diffMin > 0 ? `in ${diffMin} min` : '';

    const prayerName2 = second ? (labelMap[second.key] ?? second.key) : '';
    const prayerTime2 = second ? fmt(second.time) : '';

    updateWidget(prayerName, prayerTime, countdown, prayerName2, prayerTime2);
  } catch {
    // Non-critical
  }
}

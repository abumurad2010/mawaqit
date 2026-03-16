import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { calculatePrayerTimes } from './prayer-times';
import type { CalcMethod, AsrMethod } from './prayer-times';
import type { LocationData, PrayerNotifConfig } from '@/contexts/AppContext';
import { t } from '@/constants/i18n';
import type { Lang } from '@/constants/i18n';

function getPrayerLabels(lang: Lang): Record<string, string> {
  const tr = t(lang);
  return {
    fajr: tr.fajr, fajrFirst: tr.firstAdhan,
    dhuha: tr.dhuha, dhuhr: tr.dhuhr,
    asr: tr.asr, maghrib: tr.maghrib, isha: tr.isha, qiyam: tr.qiyam,
  };
}

/** Parse "HH:MM" and return a Date on the given base day at that local time. */
function parseExactTime(hhmm: string, baseDate: Date): Date {
  const parts = hhmm.split(':');
  const h = Math.min(23, Math.max(0, parseInt(parts[0] ?? '0', 10)));
  const m = Math.min(59, Math.max(0, parseInt(parts[1] ?? '0', 10)));
  const d = new Date(baseDate);
  d.setHours(h, m, 0, 0);
  return d;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function cancelAllPrayerNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function schedulePrayerNotifications(params: {
  location: LocationData;
  calcMethod: CalcMethod;
  asrMethod: AsrMethod;
  maghribOffset: number;
  prayerNotifications: Record<string, PrayerNotifConfig>;
  lang: Lang;
  firstAdhanOffset?: 0 | 10 | 20 | 30;
  countryCode?: string | null;
  locationUtcOffset?: number | null;
  daysAhead?: number;
  dhuhaTime?: string;     // "HH:MM" exact local time
  tahajjudTime?: string;  // "HH:MM" exact local time
}) {
  await cancelAllPrayerNotifications();
  if (Platform.OS === 'web') return;

  const { prayerNotifications, lang } = params;
  const labels = getPrayerLabels(lang);
  const daysAhead = params.daysAhead ?? 7;
  const now = new Date();

  for (let d = 0; d < daysAhead; d++) {
    const date = new Date();
    date.setDate(date.getDate() + d);

    const times = calculatePrayerTimes({
      lat: params.location.lat,
      lng: params.location.lng,
      date,
      method: params.calcMethod,
      asrMethod: params.asrMethod,
      maghribOffsetMinutes: params.maghribOffset,
    });

    const firstAdhanMs = (params.firstAdhanOffset ?? 0) * 60 * 1000;

    const prayerTimeMap: Record<string, Date | null> = {
      fajrFirst: firstAdhanMs > 0 ? new Date(times.fajr.getTime() - firstAdhanMs) : null,
      fajr: times.fajr,
      dhuha: parseExactTime(params.dhuhaTime ?? '07:30', date),
      dhuhr: times.dhuhr,
      asr: times.asr,
      maghrib: times.maghrib,
      isha: times.isha,
      qiyam: parseExactTime(params.tahajjudTime ?? '03:00', date),
    };

    for (const [prayerKey, cfg] of Object.entries(prayerNotifications)) {
      const hasBanner = cfg.banner;
      const hasAthan = cfg.athan !== 'none';
      if (!hasBanner && !hasAthan) continue;

      const prayerTime = prayerTimeMap[prayerKey];
      if (!prayerTime || prayerTime <= now) continue;

      const sound: string | false = hasAthan ? false : 'default';

      await Notifications.scheduleNotificationAsync({
        content: {
          title: labels[prayerKey] ?? prayerKey,
          body: lang === 'ar' ? 'حان وقت الصلاة' : "It's time to pray",
          data: { prayerKey, playAthan: hasAthan, athanType: cfg.athan },
          sound,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: prayerTime },
      });
    }
  }
}

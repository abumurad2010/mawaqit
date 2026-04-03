import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { calculatePrayerTimes } from './prayer-times';
import type { CalcMethod, AsrMethod } from './prayer-times';
import type { LocationData, PrayerNotifConfig } from '@/contexts/AppContext';
import { t } from '@/constants/i18n';
import type { Lang } from '@/constants/i18n';
import { THIKR_ITEMS, THIKR_TIMES, getThikrText } from '@/constants/thikr-reminders';

const isNative = Platform.OS !== 'web';

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
  if (!isNative) return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function cancelAllPrayerNotifications() {
  if (!isNative) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch { /* ignore on web/unavailable */ }
}

export async function cancelThikrNotifications() {
  if (!isNative) return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const thikrIds = scheduled
      .filter(n => (n.content.data as Record<string, unknown>)?.type === 'thikr_reminder')
      .map(n => n.identifier);
    await Promise.all(thikrIds.map(id => Notifications.cancelScheduledNotificationAsync(id)));
  } catch { /* ignore */ }
}

export async function scheduleThikrNotifications(params: {
  lang: Lang;
  daysAhead?: number;
}) {
  if (!isNative) return;
  const { lang } = params;
  const daysAhead = params.daysAhead ?? 7;
  const tr = t(lang);
  const title = tr.thikr_reminder_title;
  const now = new Date();

  for (let d = 0; d < daysAhead; d++) {
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + d);

    const daySeed = baseDate.getFullYear() * 10000 + (baseDate.getMonth() + 1) * 100 + baseDate.getDate();
    const shuffled = [...THIKR_ITEMS].sort((a, b) => {
      const ha = Math.sin(daySeed * THIKR_ITEMS.indexOf(a) + 1) * 10000;
      const hb = Math.sin(daySeed * THIKR_ITEMS.indexOf(b) + 1) * 10000;
      return (ha - Math.floor(ha)) - (hb - Math.floor(hb));
    });
    const daily = shuffled.slice(0, 5);

    for (let i = 0; i < THIKR_TIMES.length; i++) {
      const [hh, mm] = THIKR_TIMES[i].split(':').map(Number);
      const notifTime = new Date(baseDate);
      notifTime.setHours(hh!, mm!, 0, 0);
      if (notifTime <= now) continue;

      const item = daily[i]!;
      const body = getThikrText(item, lang);

      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: { type: 'thikr_reminder' },
            sound: false,
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: notifTime },
        });
      } catch { /* ignore */ }
    }
  }
}

export async function schedulePrayerNotifications(params: {
  location: LocationData;
  calcMethod: CalcMethod;
  asrMethod: AsrMethod;
  maghribOffset: number;
  prayerNotifications: Record<string, PrayerNotifConfig>;
  lang: Lang;
  firstAdhanOffset?: number;
  countryCode?: string | null;
  locationUtcOffset?: number | null;
  daysAhead?: number;
  dhuhaTime?: string;     // "HH:MM" exact local time
  tahajjudTime?: string;  // "HH:MM" exact local time
}) {
  await cancelAllPrayerNotifications();
  if (!isNative) return;

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
      maghribOffset: params.maghribOffset,
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

      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: labels[prayerKey] ?? prayerKey,
            body: lang === 'ar' ? 'حان وقت الصلاة' : "It's time to pray",
            data: { prayerKey, playAthan: hasAthan, athanType: cfg.athan },
            sound,
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: prayerTime },
        });
      } catch { /* ignore */ }
    }
  }
}

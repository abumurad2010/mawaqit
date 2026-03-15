import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { calculatePrayerTimes } from './prayer-times';
import type { CalcMethod, AsrMethod } from './prayer-times';
import type { LocationData, PrayerNotifConfig, TahajjudPortion } from '@/contexts/AppContext';
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

export function getDhuhaTime(sunrise: Date, offsetMinutes: number = 20): Date {
  return new Date(sunrise.getTime() + offsetMinutes * 60 * 1000);
}

const TAHAJJUD_FRACTIONS: Record<TahajjudPortion, number> = {
  last_third: 2 / 3,
  last_quarter: 3 / 4,
  last_sixth: 5 / 6,
};

export function getTahajjudTime(isha: Date, fajrNextDay: Date, portion: TahajjudPortion = 'last_third'): Date {
  const fraction = TAHAJJUD_FRACTIONS[portion];
  return new Date(isha.getTime() + (fajrNextDay.getTime() - isha.getTime()) * fraction);
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
  dhuhaOffsetMinutes?: number;
  tahajjudPortion?: TahajjudPortion;
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

    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    const nextTimes = calculatePrayerTimes({
      lat: params.location.lat,
      lng: params.location.lng,
      date: nextDate,
      method: params.calcMethod,
      asrMethod: params.asrMethod,
      maghribOffsetMinutes: params.maghribOffset,
    });

    const firstAdhanMs = (params.firstAdhanOffset ?? 0) * 60 * 1000;
    const prayerTimeMap: Record<string, Date | null> = {
      fajrFirst: firstAdhanMs > 0 ? new Date(times.fajr.getTime() - firstAdhanMs) : null,
      fajr: times.fajr,
      dhuha: getDhuhaTime(times.sunrise, params.dhuhaOffsetMinutes ?? 20),
      dhuhr: times.dhuhr,
      asr: times.asr,
      maghrib: times.maghrib,
      isha: times.isha,
      qiyam: getTahajjudTime(times.isha, nextTimes.fajr, params.tahajjudPortion ?? 'last_third'),
    };

    for (const [prayerKey, cfg] of Object.entries(prayerNotifications)) {
      const hasBanner = cfg.banner;
      const hasAthan = cfg.athan !== 'none';

      if (!hasBanner && !hasAthan) continue;

      const prayerTime = prayerTimeMap[prayerKey];
      if (!prayerTime || prayerTime <= now) continue;

      // When athan is enabled the app plays audio via expo-audio on receipt —
      // system sound must be absent so iOS doesn't also play the default chime.
      // expo-notifications requires a string or boolean for 'sound'; passing
      // null/undefined crashes on iOS native. Use false to silence the system tone.
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

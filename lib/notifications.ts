import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { calculatePrayerTimes } from './prayer-times';
import type { CalcMethod, AsrMethod } from './prayer-times';
import type { LocationData, PrayerNotifConfig } from '@/contexts/AppContext';
import { t } from '@/constants/i18n';
import type { Lang } from '@/constants/i18n';
import { resolveJumaaMode, getJumaaTime } from './jumaa';
import type { JumaaMode } from './jumaa';

function getPrayerLabels(lang: Lang): Record<string, string> {
  const tr = t(lang);
  return {
    fajr: tr.fajr, dhuha: tr.dhuha, dhuhr: tr.dhuhr,
    asr: tr.asr, maghrib: tr.maghrib, isha: tr.isha, qiyam: tr.qiyam,
    jumaa: tr.jumaa,
  };
}

function getDhuhaTime(sunrise: Date): Date {
  return new Date(sunrise.getTime() + 20 * 60 * 1000);
}

function getQiyamTime(isha: Date, fajrNextDay: Date): Date {
  return new Date(isha.getTime() + (fajrNextDay.getTime() - isha.getTime()) * (2 / 3));
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
  jumaaMode?: JumaaMode;
  countryCode?: string | null;
  locationUtcOffset?: number | null;
  daysAhead?: number;
}) {
  await cancelAllPrayerNotifications();
  if (Platform.OS === 'web') return;

  const { prayerNotifications, lang } = params;
  const labels = getPrayerLabels(lang);
  const daysAhead = params.daysAhead ?? 7;
  const now = new Date();
  const resolvedJumaaMode = resolveJumaaMode(params.jumaaMode ?? 'auto', params.countryCode ?? null);

  for (let d = 0; d < daysAhead; d++) {
    const date = new Date();
    date.setDate(date.getDate() + d);
    const isFriday = date.getDay() === 5;

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

    const prayerTimeMap: Record<string, Date | null> = {
      fajr: times.fajr,
      dhuha: getDhuhaTime(times.sunrise),
      dhuhr: times.dhuhr,
      asr: times.asr,
      maghrib: times.maghrib,
      isha: times.isha,
      qiyam: getQiyamTime(times.isha, nextTimes.fajr),
      jumaa: isFriday ? getJumaaTime(resolvedJumaaMode, times.dhuhr, params.locationUtcOffset ?? null) : null,
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

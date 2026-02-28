import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { calculatePrayerTimes } from './prayer-times';
import type { CalcMethod, AsrMethod } from './prayer-times';
import type { LocationData, PrayerNotifType } from '@/contexts/AppContext';
import { t } from '@/constants/i18n';
import type { Lang } from '@/constants/i18n';

function getPrayerLabels(lang: Lang): Record<string, string> {
  const tr = t(lang);
  return {
    fajr: tr.fajr, dhuha: tr.dhuha, dhuhr: tr.dhuhr,
    asr: tr.asr, maghrib: tr.maghrib, isha: tr.isha, qiyam: tr.qiyam,
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
  prayerNotifications: Record<string, PrayerNotifType>;
  lang: Lang;
  daysAhead?: number;
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

    const prayerTimeMap: Record<string, Date | null> = {
      fajr: times.fajr,
      dhuha: getDhuhaTime(times.sunrise),
      dhuhr: times.dhuhr,
      asr: times.asr,
      maghrib: times.maghrib,
      isha: times.isha,
      qiyam: getQiyamTime(times.isha, nextTimes.fajr),
    };

    for (const [prayerKey, notifType] of Object.entries(prayerNotifications)) {
      if (notifType === 'none') continue;
      const prayerTime = prayerTimeMap[prayerKey];
      if (!prayerTime || prayerTime <= now) continue;

      const isAthan = notifType === 'athan_full' || notifType === 'athan_abbreviated';
      const athanType = notifType === 'athan_abbreviated' ? 'abbreviated' : 'full';

      await Notifications.scheduleNotificationAsync({
        content: {
          title: labels[prayerKey] ?? prayerKey,
          body: lang === 'ar' ? 'حان وقت الصلاة' : "It's time to pray",
          data: { prayerKey, playAthan: isAthan, athanType },
          sound: notifType === 'banner' ? 'default' : null,
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: prayerTime },
      });
    }
  }
}

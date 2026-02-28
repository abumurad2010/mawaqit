import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { calculatePrayerTimes } from './prayer-times';
import type { CalcMethod, AsrMethod } from './prayer-times';
import type { LocationData } from '@/contexts/AppContext';

export const NOTIFIABLE_PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
export type NotifiablePrayer = typeof NOTIFIABLE_PRAYERS[number];

export const PRAYER_LABELS: Record<'ar' | 'en', Record<NotifiablePrayer, string>> = {
  ar: { fajr: 'الفجر', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء' },
  en: { fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha' },
};

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
  notificationPrayers: string[];
  notificationBanner: boolean;
  notificationAthan: boolean;
  lang: 'ar' | 'en';
  daysAhead?: number;
}) {
  await cancelAllPrayerNotifications();

  if (!params.notificationBanner && !params.notificationAthan) return;
  if (params.notificationPrayers.length === 0) return;
  if (Platform.OS === 'web') return;

  const labels = PRAYER_LABELS[params.lang];
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

    for (const prayerKey of params.notificationPrayers) {
      const prayerTime = times[prayerKey as keyof typeof times];
      if (!prayerTime || !(prayerTime instanceof Date)) continue;
      if (prayerTime <= now) continue;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: labels[prayerKey as NotifiablePrayer] ?? prayerKey,
          body: params.lang === 'ar' ? 'حان وقت الصلاة' : 'It\'s time to pray',
          data: { prayerKey, playAthan: params.notificationAthan },
          sound: params.notificationBanner ? 'default' : null,
        },
        trigger: { date: prayerTime },
      });
    }
  }
}

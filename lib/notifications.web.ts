import type { Lang } from '@/constants/i18n';
import type { LocationData, PrayerNotifConfig } from '@/contexts/AppContext';
import type { CalcMethod, AsrMethod } from './prayer-times';

export async function requestNotificationPermission(): Promise<boolean> { return false; }
export async function cancelAllPrayerNotifications(): Promise<void> {}
export async function cancelThikrNotifications(): Promise<void> {}
export async function scheduleThikrNotifications(_params: { lang: Lang; daysAhead?: number }): Promise<void> {}
export async function schedulePrayerNotifications(_params: {
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
  dhuhaTime?: string;
  tahajjudTime?: string;
}): Promise<void> {}

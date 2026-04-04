import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { calculatePrayerTimes } from './prayer-times';
import type { CalcMethod, AsrMethod } from './prayer-times';
import type { LocationData, PrayerNotifConfig } from '@/contexts/AppContext';
import { t } from '@/constants/i18n';
import type { Lang } from '@/constants/i18n';
import { THIKR_ITEMS, getThikrText } from '@/constants/thikr-reminders';

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

/**
 * Generate up to `count` timestamps in [fajrMs, ishaMs) with guaranteed
 * ≥30-minute gaps between any two consecutive results.
 *
 * Algorithm:
 *  1. Divide the Fajr→Isha window into non-overlapping 30-minute slots.
 *  2. Shuffle the slot indices with a deterministic day-seed.
 *  3. Pick the first `count` slots (or fewer if the window is shorter).
 *  4. Sort picked slots chronologically.
 *  5. Each picked slot maps to: fajr + slot*30 min (start of the slot).
 *
 * Because every notification occupies a distinct 30-minute slot, no two
 * consecutive notifications are ever closer than 30 minutes apart.
 */
function generateThikrTimes(
  fajrMs: number,
  ishaMs: number,
  count: number,
  daySeed: number,
): number[] {
  const windowMins = Math.floor((ishaMs - fajrMs) / 60000);
  const slotCount = Math.floor(windowMins / 30);
  if (slotCount <= 0 || count <= 0) return [];

  // Build slot array [0, 1, 2, ..., slotCount-1]
  const slots = Array.from({ length: slotCount }, (_, i) => i);

  // Deterministic Fisher-Yates shuffle using daySeed
  for (let i = slots.length - 1; i > 0; i--) {
    const rng = Math.abs(Math.sin(daySeed * 9301 + i * 49297 + 233)) % 1;
    const j = Math.floor(rng * (i + 1));
    const tmp = slots[i]!;
    slots[i] = slots[j]!;
    slots[j] = tmp;
  }

  // Pick first `count` slots (capped by available slots), sort chronologically
  const picked = slots.slice(0, Math.min(count, slotCount)).sort((a, b) => a - b);

  // Map each slot index → absolute timestamp (start of 30-min slot)
  return picked.map(slot => fajrMs + slot * 30 * 60000);
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

const THIKR_DAILY_COUNT = 18;
const THIKR_WINDOW_AFTER_ISHA_MS = 5 * 60 * 60 * 1000; // 5 hours after Isha

export async function scheduleThikrNotifications(params: {
  lang: Lang;
  location: LocationData;
  calcMethod: CalcMethod;
  asrMethod: AsrMethod;
  maghribOffset: number;
  daysAhead?: number;
}) {
  if (!isNative) return;
  const { lang, location } = params;
  const daysAhead = params.daysAhead ?? 7;
  const tr = t(lang);
  const title = tr.thikr_reminder_title;
  const now = new Date();

  for (let d = 0; d < daysAhead; d++) {
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + d);

    // Calculate actual Fajr and Isha times for this location and day
    const times = calculatePrayerTimes({
      lat: location.lat,
      lng: location.lng,
      date: baseDate,
      method: params.calcMethod,
      asrMethod: params.asrMethod,
      maghribOffset: params.maghribOffset,
    });

    const fajrMs = times.fajr.getTime();
    // Window ends 5 hours after Isha
    const ishaMs = times.isha.getTime() + THIKR_WINDOW_AFTER_ISHA_MS;

    // Unique seed per calendar day (YYYYMMDD integer)
    const daySeed =
      baseDate.getFullYear() * 10000 +
      (baseDate.getMonth() + 1) * 100 +
      baseDate.getDate();

    const thikrTimes = generateThikrTimes(fajrMs, ishaMs, THIKR_DAILY_COUNT, daySeed);

    // Deterministically shuffle thikr items for today
    const shuffled = [...THIKR_ITEMS].sort((a, b) => {
      const ia = THIKR_ITEMS.indexOf(a);
      const ib = THIKR_ITEMS.indexOf(b);
      const ha = Math.abs(Math.sin(daySeed * 6271 + ia * 28657 + 3)) % 1;
      const hb = Math.abs(Math.sin(daySeed * 6271 + ib * 28657 + 3)) % 1;
      return ha - hb;
    });

    for (let i = 0; i < thikrTimes.length; i++) {
      const notifTime = new Date(thikrTimes[i]!);
      if (notifTime <= now) continue;

      // Cycle through shuffled items (wraps if count > THIKR_ITEMS.length)
      const item = shuffled[i % shuffled.length]!;
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

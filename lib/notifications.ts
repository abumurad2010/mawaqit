import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculatePrayerTimes } from './prayer-times';
import type { CalcMethod, AsrMethod } from './prayer-times';
import type { LocationData, PrayerNotifConfig } from '@/contexts/AppContext';
import { t } from '@/constants/i18n';
import type { Lang } from '@/constants/i18n';
import { THIKR_ITEMS, getThikrText } from '@/constants/thikr-reminders';

const isNative = Platform.OS !== 'web';
const IOS_MAX_NOTIFICATIONS = 64;

/** Maps voice key → abbreviated .caf filename bundled in the iOS app.
 *  Note: 'system' is special-cased in the schedule loop to use Apple's
 *  built-in notification chime — the entry below is unused but kept for
 *  documentation. */
const IOS_CAF_SOUNDS: Record<string, string> = {
  'system':      'default',
  'makkah':      'adhan_makka_abb.caf',
  'madinah':     'adhan_madinah_abb.caf',
  'egypt':       'adhan_egypt_abb.caf',
  'aqsa':        'adhan_alaqsa_abb.caf',
  'halab':       'adhan_halab_abb.caf',
  'hussaini':    'al_hussaini_abb.caf',
  'bakir':       'bakir_bash_abb.caf',
  'abdul-hakam': 'abdul_hakam_abb.caf',
  'athan-midi':  'athan_midi_abb.caf',
};

/**
 * Maps voice key → notification sound filename for Android.
 * Keys ending in '_full' use full-length mp3s (bundled via app.json sounds).
 * Plain keys use abbreviated mp3s from assets/sounds/abb/.
 */
const ANDROID_MP3_SOUNDS: Record<string, string> = {
  'system':           'default',
  // Abbreviated (short) versions
  'makkah':           'adhan_makka_abb.mp3',
  'madinah':          'adhan_madinah_abb.mp3',
  'egypt':            'adhan_egypt_abb.mp3',
  'aqsa':             'adhan_alaqsa_abb.mp3',
  'halab':            'adhan_halab_abb.mp3',
  'hussaini':         'al_hussaini_abb.mp3',
  'bakir':            'bakir_bash_abb.mp3',
  'abdul-hakam':      'abdul_hakam_abb.mp3',
  'athan-midi':       'athan_midi_abb.mp3',
  // Full-length versions — bundled via app.json sounds array
  'makkah_full':      'adhan_makkah.mp3',
  'madinah_full':     'adhan_madinah.mp3',
  'egypt_full':       'adhan_egypt.mp3',
  'aqsa_full':        'adhan_alaqsa.mp3',
  'halab_full':       'adhan_halab.mp3',
  'hussaini_full':    'al_hussaini.mp3',
  'bakir_full':       'bakir_bash.mp3',
  'abdul-hakam_full': 'abdul_hakam.mp3',
  'athan-midi_full':  'athan_midi.mp3',
};

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

const THIKR_DAILY_COUNT = 25;
// iOS 64-slot budget allocation: 30 slots reserved for thikr (10/day × 3 days)
const THIKR_IOS_DAILY_COUNT = 10;
const THIKR_IOS_DAYS = 3;
const IOS_THIKR_RESERVED_SLOTS = THIKR_IOS_DAILY_COUNT * THIKR_IOS_DAYS; // 30
const THIKR_WINDOW_AFTER_ISHA_MS = 5 * 60 * 60 * 1000; // 5 hours after Isha

export async function scheduleThikrNotifications(params: {
  lang: Lang;
  location: LocationData;
  calcMethod: CalcMethod;
  asrMethod: AsrMethod;
  maghribOffset: number;
  daysAhead?: number;
  timezone?: string | null; // IANA zone of the location (manual mode); null → device-local
  reservedSlots?: number; // notifications already scheduled (iOS budget tracking)
}) {
  if (!isNative) return;
  const { lang, location } = params;
  const isIos = Platform.OS === 'ios';
  const daysAhead = isIos ? THIKR_IOS_DAYS : (params.daysAhead ?? 7);
  const dailyCount = isIos ? THIKR_IOS_DAILY_COUNT : THIKR_DAILY_COUNT;
  const thikrBudget = isIos
    ? Math.max(0, IOS_MAX_NOTIFICATIONS - (params.reservedSlots ?? 0))
    : Infinity;
  let thikrScheduled = 0;
  const tr = t(lang);
  const title = tr.thikr_reminder_title;
  const now = new Date();

  // Read or generate a persistent device-unique salt so each device gets
  // a different daily schedule even on the same calendar day.
  let deviceSalt = 0;
  try {
    const stored = await AsyncStorage.getItem('thikr_device_salt');
    if (stored !== null) {
      deviceSalt = parseInt(stored, 10) || 0;
    } else {
      deviceSalt = Math.floor(Math.random() * 0x7fffffff);
      await AsyncStorage.setItem('thikr_device_salt', String(deviceSalt));
    }
  } catch { /* salt stays 0; schedule still works, just not device-unique */ }

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
      timezone: params.timezone ?? null,
    });

    const fajrMs = times.fajr.getTime();
    // Window ends 5 hours after Isha
    const ishaMs = times.isha.getTime() + THIKR_WINDOW_AFTER_ISHA_MS;

    // Unique seed per calendar day (YYYYMMDD integer) XORed with device salt
    const daySeed =
      baseDate.getFullYear() * 10000 +
      (baseDate.getMonth() + 1) * 100 +
      baseDate.getDate();
    const effectiveSeed = daySeed ^ deviceSalt;

    const thikrTimes = generateThikrTimes(fajrMs, ishaMs, dailyCount, effectiveSeed);

    // Deterministically shuffle thikr items for today
    const shuffled = [...THIKR_ITEMS].sort((a, b) => {
      const ia = THIKR_ITEMS.indexOf(a);
      const ib = THIKR_ITEMS.indexOf(b);
      const ha = Math.abs(Math.sin(effectiveSeed * 6271 + ia * 28657 + 3)) % 1;
      const hb = Math.abs(Math.sin(effectiveSeed * 6271 + ib * 28657 + 3)) % 1;
      return ha - hb;
    });

    for (let i = 0; i < thikrTimes.length; i++) {
      if (thikrScheduled >= thikrBudget) break;
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
            sticky: false,
            autoDismiss: true,
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: notifTime },
        });
        thikrScheduled++;
      } catch { /* ignore */ }
    }
    if (thikrScheduled >= thikrBudget) break;
  }
}

export async function scheduleTestNotification(): Promise<void> {
  if (!isNative) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Mawaqit — Test',
      body: 'Notifications are working! ✓',
      sound: true,
      data: {},
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      repeats: false,
    },
  });
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
  timezone?: string | null; // IANA zone of the location (manual mode); null → device-local
  daysAhead?: number;
  dhuhaTime?: string;     // "HH:MM" exact local time
  tahajjudTime?: string;  // "HH:MM" exact local time
  selectedAdhan?: string;
  prayerAdhan?: Record<string, string>;
  prePrayerReminder?: number;
  jumuahTime?: string | null;
}): Promise<number> {
  const enabledKeys = Object.entries(params.prayerNotifications)
    .filter(([, v]) => v.banner || v.athan !== 'none')
    .map(([k]) => k);
  await cancelAllPrayerNotifications();
  if (!isNative) return 0;

  const { prayerNotifications, lang } = params;
  const labels = getPrayerLabels(lang);
  const tr = t(lang);
  const prayerBody = tr.its_time_to_pray;
  const firstAdhanBody = tr.its_time_for_first_adhan;
  // iOS 64-slot budget: 3 days × enabled prayers (adhans) + 30 thikr + N pre-prayer reminders
  const daysAhead = params.daysAhead ?? 3;
  const now = new Date();
  let scheduledCount = 0;
  let skippedPastCount = 0;
  let scheduleErrors = 0;

  // iOS 64-slot budget allocation for pre-prayer reminders.
  //   prayerSlots   = enabled prayers × daysAhead (upper bound for adhans)
  //   thikrSlots    = IOS_THIKR_RESERVED_SLOTS (30)
  //   prePrayerBudget = 64 - prayerSlots - thikrSlots
  // Day-by-day iteration below (d=0..daysAhead) ensures pre-prayer slots go
  // to the soonest prayers first; once budget exhausted, later pre-prayers
  // are silently skipped while adhans still schedule.
  const isIos = Platform.OS === 'ios';
  const enabledPrayerCount = enabledKeys.length;
  const prayerSlotsReserved = enabledPrayerCount * daysAhead;
  const prePrayerBudget = isIos
    ? Math.max(0, IOS_MAX_NOTIFICATIONS - prayerSlotsReserved - IOS_THIKR_RESERVED_SLOTS)
    : Infinity;
  let prePrayerScheduled = 0;
  let prePrayerSkippedBudget = 0;
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
      maghribOffset: params.maghribOffset,
      timezone: params.timezone ?? null,
    });

    const firstAdhanMs = (params.firstAdhanOffset ?? 0) * 60 * 1000;
    const jumuahTimeStr = isFriday ? (params.jumuahTime ?? null) : null;

    const prayerTimeMap: Record<string, Date | null> = {
      fajrFirst: firstAdhanMs > 0 ? new Date(times.fajr.getTime() - firstAdhanMs) : null,
      fajr: times.fajr,
      dhuha: parseExactTime(params.dhuhaTime ?? '07:30', date),
      dhuhr: jumuahTimeStr
        ? parseExactTime(jumuahTimeStr, date)
        : times.dhuhr,
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
      if (!prayerTime) continue;
      if (prayerTime <= now) { skippedPastCount++; continue; }

      const athanVoice = params.prayerAdhan?.[prayerKey] ?? params.selectedAdhan ?? 'makkah';
      const sound: string = Platform.OS === 'ios'
        ? (athanVoice === 'system' ? 'default' : (IOS_CAF_SOUNDS[athanVoice] || 'adhan_makka_abb.caf'))
        : (athanVoice === 'system' ? 'default' : (ANDROID_MP3_SOUNDS[athanVoice] ?? 'adhan_makka_abb.mp3'));

      const effectiveTitle = (prayerKey === 'dhuhr' && jumuahTimeStr)
        ? (tr.jumuah as string ?? labels[prayerKey])
        : (labels[prayerKey] ?? prayerKey);

      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: effectiveTitle,
            body: prayerKey === 'fajrFirst' ? firstAdhanBody : prayerBody,
            data: { prayerKey, playAthan: hasAthan, athanType: cfg.athan, athanVoice },
            sound,
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: prayerTime },
        });
        scheduledCount++;
      } catch (err) {
        scheduleErrors++;
        console.warn('[Notifications] Failed to schedule', prayerKey, err);
      }

      // Pre-prayer reminder (silent banner): fires for any prayer that has any
      // notification configured (banner or athan), so athan-only prayers also
      // receive the advance reminder. iOS-only: capped by `prePrayerBudget` so
      // pre-prayer reminders never crowd out adhans or thikr in the 64-slot queue.
      const prePrayerReminder = params.prePrayerReminder ?? 0;
      if (prePrayerReminder > 0 && (hasBanner || hasAthan) && prayerKey !== 'fajrFirst') {
        if (prePrayerScheduled >= prePrayerBudget) {
          prePrayerSkippedBudget++;
        } else {
          const reminderTime = new Date(prayerTime.getTime() - prePrayerReminder * 60 * 1000);
          if (reminderTime > now) {
            const reminderBody = `${effectiveTitle} ${tr.prayerReminderIn.replace('{n}', String(prePrayerReminder))}`;
            try {
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: labels[prayerKey] ?? prayerKey,
                  body: reminderBody,
                  data: { prayerKey, playAthan: false },
                  sound: false,
                },
                trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminderTime },
              });
              scheduledCount++;
              prePrayerScheduled++;
            } catch (err) {
              scheduleErrors++;
              console.warn('[Notifications] Failed to schedule pre-prayer reminder', prayerKey, err);
            }
          }
        }
      }
    }
  }
  console.log(`[Notifications] schedulePrayerNotifications done: scheduled=${scheduledCount} skippedPast=${skippedPastCount} errors=${scheduleErrors} daysAhead=${daysAhead} prePrayer=${prePrayerScheduled}/${prePrayerBudget === Infinity ? 'inf' : prePrayerBudget} prePrayerSkippedBudget=${prePrayerSkippedBudget}`);
  return scheduledCount;
}

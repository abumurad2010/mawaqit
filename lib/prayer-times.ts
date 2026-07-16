/**
 * Prayer Times Calculator
 * Full USNO astronomical algorithm with multiple calculation methods
 * Accurate for any location in the world
 */


import * as adhan from 'adhan';

export type CalcMethod =
  | 'MWL'
  | 'ISNA'
  | 'Egypt'
  | 'MakkahUmmQura'
  | 'Karachi'
  | 'Jordan'
  | 'Kuwait'
  | 'Qatar'
  | 'Algeria'
  | 'Morocco'
  | 'Singapore'
  | 'Turkey'
  | 'France'
  | 'Russia'
  | 'Moonsighting'
  | 'Custom';

export type AsrMethod = 'standard' | 'hanafi';

/** High-latitude rule for Fajr/Isha when the depression angle is unreachable
 *  (persistent twilight above ~48deg). Maps directly to adhan's HighLatitudeRule. */
export type HighLatRule = 'middle_of_night' | 'seventh_of_night' | 'twilight_angle';

/** User-set parameters for the 'Custom' calculation method. */
export interface CustomMethodParams {
  fajrAngle: number;
  ishaAngle: number;
  ishaInterval?: number; // if set, Isha is this many minutes after Maghrib (overrides ishaAngle)
  fajrMins?: number;
  sunriseMins?: number;
  dhuhrMins?: number;
  asrMins?: number;
  maghribMins?: number;
  ishaMins?: number;
}

export interface PrayerTimesParams {
  lat: number;
  lng: number;
  date?: Date;
  method?: CalcMethod;
  asrMethod?: AsrMethod;
  maghribOffset?: number; // per-country/user ihtiyat minutes after sunset (lib/maghrib-offsets.ts)
  /** IANA timezone of the LOCATION. Only used by callers for display (formatTimeInZone);
   *  adhan computes absolute instants for the date's calendar day at the coordinates. */
  timezone?: string | null;
  /** High-latitude rule (adhan). When omitted, adhan's per-method default applies. */
  highLatRule?: HighLatRule;
  /** Parameters for method='Custom' (user-set angles + per-prayer offsets). */
  customParams?: CustomMethodParams;
}

export interface PrayerTimes {
  fajr: Date;
  sunrise: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
  /** True solar transit (astronomical noon) - Dhuhr must be strictly after this. */
  transit: Date;
}

type AdhanHighLat = (typeof adhan.HighLatitudeRule)[keyof typeof adhan.HighLatitudeRule];
const HIGH_LAT_MAP: Record<HighLatRule, AdhanHighLat> = {
  middle_of_night: adhan.HighLatitudeRule.MiddleOfTheNight,
  seventh_of_night: adhan.HighLatitudeRule.SeventhOfTheNight,
  twilight_angle: adhan.HighLatitudeRule.TwilightAngle,
};

/**
 * Build adhan CalculationParameters for a shipped method. Nine map to adhan's
 * native factories; five (Jordan, Algeria, Morocco, France/UOIF, Russia) use
 * CalculationMethod.Other() with parameters sourced from Aladhan's published
 * method list (api.aladhan.com/v1/methods). Custom is fully user-defined.
 */
function buildParams(method: CalcMethod, custom?: CustomMethodParams): adhan.CalculationParameters {
  const CM = adhan.CalculationMethod;
  switch (method) {
    case 'MWL':           return CM.MuslimWorldLeague();
    case 'ISNA':          return CM.NorthAmerica();
    case 'Egypt':         return CM.Egyptian();
    case 'MakkahUmmQura': return CM.UmmAlQura();
    case 'Karachi':       return CM.Karachi();
    case 'Kuwait':        return CM.Kuwait();
    case 'Qatar':         return CM.Qatar();
    case 'Singapore':     return CM.Singapore();
    case 'Turkey':        return CM.Turkey();
    case 'Moonsighting':  return CM.MoonsightingCommittee();
    // Aladhan 23 - Jordan: Fajr 18, Isha 18, Maghrib +5 min
    case 'Jordan':  { const p = CM.Other(); p.fajrAngle = 18; p.ishaAngle = 18; p.methodAdjustments.maghrib = 5; return p; }
    // Aladhan 19 - Algeria: Fajr 18, Isha 17
    case 'Algeria': { const p = CM.Other(); p.fajrAngle = 18; p.ishaAngle = 17; return p; }
    // Aladhan 21 - Morocco: Fajr 19, Isha 17
    case 'Morocco': { const p = CM.Other(); p.fajrAngle = 19; p.ishaAngle = 17; return p; }
    // Aladhan 12 - UOIF France: Fajr 12, Isha 12
    case 'France':  { const p = CM.Other(); p.fajrAngle = 12; p.ishaAngle = 12; return p; }
    // Aladhan 14 - Russia: Fajr 16, Isha 15
    case 'Russia':  { const p = CM.Other(); p.fajrAngle = 16; p.ishaAngle = 15; return p; }
    case 'Custom': {
      const p = CM.Other();
      p.fajrAngle = custom?.fajrAngle ?? 18;
      if (custom?.ishaInterval) p.ishaInterval = custom.ishaInterval;
      else p.ishaAngle = custom?.ishaAngle ?? 17;
      if (custom) {
        p.methodAdjustments.fajr    = custom.fajrMins    ?? 0;
        p.methodAdjustments.sunrise = custom.sunriseMins ?? 0;
        p.methodAdjustments.dhuhr   = custom.dhuhrMins   ?? 0;
        p.methodAdjustments.asr     = custom.asrMins     ?? 0;
        p.methodAdjustments.maghrib = custom.maghribMins ?? 0;
        p.methodAdjustments.isha    = custom.ishaMins    ?? 0;
      }
      return p;
    }
    default: return CM.MuslimWorldLeague();
  }
}

/**
 * Compute prayer times using adhan-js (the ecosystem-standard engine). Returns
 * absolute instants; render with formatTimeInZone for the location's wall-clock.
 *
 * adhan carries each method's own per-prayer adjustments (e.g. Diyanet Turkey's
 * sunrise -7 / dhuhr +5 / asr +4 / maghrib +7) and its dhuhr precautionary margin,
 * so Turkey is no longer MWL-with-a-label and Dhuhr no longer lands on the meridian.
 * The per-country/user maghrib ihtiyat (maghribOffset) is applied on top, kept
 * separate from the method table.
 */
export function calculatePrayerTimes(params: PrayerTimesParams): PrayerTimes {
  const {
    lat,
    lng,
    date = new Date(),
    method = 'MWL',
    asrMethod = 'standard',
    maghribOffset = 0,
    highLatRule,
    customParams,
  } = params;

  const coords = new adhan.Coordinates(lat, lng);
  const p = buildParams(method, customParams);
  p.madhab = asrMethod === 'hanafi' ? adhan.Madhab.Hanafi : adhan.Madhab.Shafi;
  if (highLatRule) p.highLatitudeRule = HIGH_LAT_MAP[highLatRule];
  // Beyond the polar circle even sunrise/sunset are undefined; resolve to the
  // nearest latitude that has valid times rather than returning NaN.
  p.polarCircleResolution = adhan.PolarCircleResolution.AqrabBalad;
  // Per-country / user Maghrib ihtiyat, layered on adhan's method output.
  p.adjustments.maghrib = (p.adjustments.maghrib ?? 0) + maghribOffset;

  const pt = new adhan.PrayerTimes(coords, date, p);

  // True solar transit = midpoint of the astronomical sunrise/sunset. Computed from
  // a reference method with no sunrise/maghrib adjustments so it is method-independent.
  const refParams = adhan.CalculationMethod.MuslimWorldLeague();
  refParams.polarCircleResolution = adhan.PolarCircleResolution.AqrabBalad;
  const ref = new adhan.PrayerTimes(coords, date, refParams);
  const transit = new Date((ref.sunrise.getTime() + ref.sunset.getTime()) / 2);

  // Guarantee Dhuhr strictly after transit: methods with a zero dhuhr adjustment and
  // adhan's nearest-minute rounding can land on/just before the meridian (a forbidden
  // time). Bump to the next minute only in that case; adhan's dhuhr margin is otherwise
  // already applied and rounded.
  let dhuhr = pt.dhuhr;
  if (dhuhr.getTime() <= transit.getTime()) {
    dhuhr = new Date((Math.floor(dhuhr.getTime() / 60000) + 1) * 60000);
  }

  return {
    fajr: pt.fajr,
    sunrise: pt.sunrise,
    dhuhr,
    asr: pt.asr,
    maghrib: pt.maghrib,
    isha: pt.isha,
    transit,
  };
}

export function formatTime(date: Date, use24h = false, amStr = 'AM', pmStr = 'PM'): string {
  const h = date.getHours();
  const m = date.getMinutes().toString().padStart(2, '0');
  if (use24h) return `${h.toString().padStart(2, '0')}:${m}`;
  const period = h >= 12 ? pmStr : amStr;
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${period}`;
}

/** Format time at a specific UTC offset (for manual locations).
 *  Pass null to fall back to device local time.
 *  @deprecated Prefer formatTimeInZone, which is DST-aware. Kept for the
 *  astronomy/moon helpers that still operate in numeric-offset space. */
export function formatTimeAtOffset(date: Date, utcOffsetHours: number | null, use24h = false, amStr = 'AM', pmStr = 'PM'): string {
  if (utcOffsetHours === null) return formatTime(date, use24h, amStr, pmStr);
  const utcMin = date.getUTCHours() * 60 + date.getUTCMinutes();
  // Round to whole minutes (not whole hours) so fractional zones — +3:30 (Tehran),
  // +4:30 (Kabul), +5:30 (India), +5:45 (Kathmandu) — render correctly.
  const localMin = ((utcMin + Math.round(utcOffsetHours * 60)) % 1440 + 1440) % 1440;
  const h = Math.floor(localMin / 60);
  const m = (localMin % 60).toString().padStart(2, '0');
  if (use24h) return `${h.toString().padStart(2, '0')}:${m}`;
  const period = h >= 12 ? pmStr : amStr;
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${period}`;
}

/**
 * Whether this JS runtime's Intl actually honours arbitrary IANA `timeZone`
 * values. This is THE load-bearing assumption of the timezone fix: under Hermes,
 * Intl may exist but ignore `timeZone` (returning device-local time), which would
 * silently reproduce the v1.3.5 bug. Probed once, lazily, and cached.
 *
 * Probe: format a fixed instant (2026-07-15T22:06Z) in Europe/Amsterdam and in
 * UTC. A conforming engine yields "00:06" (Amsterdam, UTC+2 in July) ≠ "22:06"
 * (UTC). If they match, or the call throws, IANA zones are unsupported.
 */
let _intlIanaSupported: boolean | null = null;
let _intlFallbackWarned = false;
function warnIntlFallbackOnce(): void {
  if (_intlFallbackWarned) return;
  _intlFallbackWarned = true;
  console.error('[MAWAQIT] Intl IANA timezone unsupported - falling back');
}
export function intlSupportsIanaTimeZone(): boolean {
  if (_intlIanaSupported !== null) return _intlIanaSupported;
  try {
    const probe = new Date('2026-07-15T22:06:00Z');
    const fmt = (tz: string) => new Intl.DateTimeFormat('en-GB', {
      timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(probe);
    const ams = fmt('Europe/Amsterdam');
    const utc = fmt('UTC');
    _intlIanaSupported = ams !== utc && ams.startsWith('00');
  } catch {
    _intlIanaSupported = false;
  }
  if (!_intlIanaSupported) warnIntlFallbackOnce();
  return _intlIanaSupported;
}

/**
 * Format a UTC instant as wall-clock time in a specific IANA timezone
 * (e.g. "Europe/London"). Unlike formatTimeAtOffset, this is DST-aware — the
 * offset is resolved by Intl for the exact instant, so a July time renders in
 * BST (+1) and a January time in GMT (+0) automatically, with no manual toggle.
 *
 * Pass `timezone = null` to fall back to device-local time (correct for GPS/auto
 * mode, where the device is physically in the location). If the runtime lacks
 * IANA-zone support we degrade to device-local formatting — but LOUDLY: a single
 * console.error is emitted so the failure can never again silently reproduce the
 * v1.3.5 bug and pass every test.
 */
export function formatTimeInZone(
  date: Date,
  timezone: string | null,
  use24h = false,
  amStr = 'AM',
  pmStr = 'PM',
): string {
  if (!timezone) return formatTime(date, use24h, amStr, pmStr);
  if (!intlSupportsIanaTimeZone()) {
    // Capability probe already emitted the loud warning; degrade to device-local.
    return formatTime(date, use24h, amStr, pmStr);
  }
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date);
    let h = parseInt(parts.find(p => p.type === 'hour')?.value ?? 'NaN', 10);
    const mm = parts.find(p => p.type === 'minute')?.value ?? '00';
    if (Number.isNaN(h)) { warnIntlFallbackOnce(); return formatTime(date, use24h, amStr, pmStr); }
    if (h === 24) h = 0; // some engines emit '24' for midnight under hour12:false
    if (use24h) return `${h.toString().padStart(2, '0')}:${mm}`;
    const period = h >= 12 ? pmStr : amStr;
    const h12 = h % 12 || 12;
    return `${h12}:${mm} ${period}`;
  } catch {
    warnIntlFallbackOnce();
    return formatTime(date, use24h, amStr, pmStr);
  }
}

/**
 * DST-aware UTC offset (in hours) for an IANA timezone at a given instant.
 * Returns null if `timezone` is null or the zone can't be resolved. Used by the
 * astronomy helpers (moon phases, crescent windows) that still compute in
 * numeric-offset space — this gives them a real, DST-correct offset instead of
 * the old crude longitude/15 approximation.
 */
export function zoneOffsetHours(timezone: string | null, date: Date): number | null {
  if (!timezone) return null;
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(date);
    const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value ?? 'NaN', 10);
    let hh = get('hour'); if (hh === 24) hh = 0;
    const asUTC = Date.UTC(get('year'), get('month') - 1, get('day'), hh, get('minute'), get('second'));
    if (Number.isNaN(asUTC)) return null;
    return Math.round((asUTC - date.getTime()) / 60000) / 60;
  } catch {
    return null;
  }
}

/**
 * Standard-time UTC offset (hours) for an IANA zone, ignoring DST. DST always ADDS,
 * so the minimum of the January and July offsets is standard time in both
 * hemispheres. Returns null if the zone can't be resolved. Used by the DST override.
 */
export function standardOffset(zone: string | null, refDate: Date = new Date()): number | null {
  if (!zone) return null;
  const y = refDate.getFullYear();
  const jan = zoneOffsetHours(zone, new Date(Date.UTC(y, 0, 1)));
  const jul = zoneOffsetHours(zone, new Date(Date.UTC(y, 6, 1)));
  if (jan === null || jul === null) return null;
  return Math.min(jan, jul);
}

/**
 * Whether daylight saving is in force in `zone` on `date`: the zone's offset for
 * that instant exceeds its standard (non-DST) offset. Date-dependent — London is
 * true on 16 Jul (BST) and false on 15 Jan (GMT); Amman/Riyadh are false always.
 * Returns null when the zone can't be resolved. This is the truth the DST switch
 * position renders in 'auto' mode.
 */
export function isDstActive(zone: string | null, date: Date): boolean | null {
  const off = zoneOffsetHours(zone, date);
  const std = standardOffset(zone, date);
  if (off === null || std === null) return null;
  return off > std;
}

/**
 * Render a prayer instant for display. When `overrideOffset` is null the time is
 * rendered in the IANA zone (DST-aware via Intl — the 'auto' DST mode). When a
 * fixed offset is given (DST override 'on'/'off'), the instant is rendered at that
 * offset, bypassing the device's tzdata.
 */
export function formatPrayerTime(
  date: Date,
  zone: string | null,
  overrideOffset: number | null | undefined,
  use24h = false,
  amStr = 'AM',
  pmStr = 'PM',
): string {
  if (overrideOffset !== null && overrideOffset !== undefined) {
    return formatTimeAtOffset(date, overrideOffset, use24h, amStr, pmStr);
  }
  return formatTimeInZone(date, zone, use24h, amStr, pmStr);
}

/**
 * Returns the next prayer after `now`.
 *
 * IMPORTANT: `now` MUST be passed from the caller (the component's `now` state).
 * Do NOT let this function create its own `new Date()` — it must use the SAME
 * timestamp that `iqamaStatus` uses so both computations are consistent within
 * a single render cycle.  Using a fresh `new Date()` here caused the iqama→next-prayer
 * transition bug: `iqamaStatus` (using state `now`) said iqama was over, but
 * `getNextPrayer` (using a private new Date()) could disagree by up to 1 second,
 * producing a render where neither branch was correct.
 *
 * Comparison uses only local-time getters (getHours, getMinutes, getDate …) —
 * NO UTC methods anywhere in this function.
 */
export function getNextPrayer(
  times: PrayerTimes,
  now: Date,
): { name: keyof PrayerTimes; time: Date } | null {
  const order: (keyof PrayerTimes)[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

  // ── Find the first prayer whose local time is still in the future ──
  //
  // COMPARISON STRATEGY — seconds-of-day only, no Date objects.
  //
  // Why NOT "localPrayer > now" (Date comparison):
  //   Reconstructing a Date with new Date(y, m, d, h, min, s) then comparing
  //   it to `now` as a Date object brings the calendar DATE into the comparison.
  //   If the prayer Date's internal UTC timestamp lands on a different calendar
  //   day than `now` due to any timezone/DST/device-clock edge case, every prayer
  //   reads as "past" even though its local hour:minute is clearly in the future.
  //   The diagnostic logs confirmed this: at 18:22 local, Maghrib (18:53) and
  //   Isha (20:05) both showed "past ✗" via Date comparison but "future" via
  //   seconds-of-day — the date mismatch made their UTC timestamps appear earlier
  //   than `now`'s UTC timestamp.
  //
  // Why seconds-of-day IS correct:
  //   Prayer times are inherently a time-of-day concept (Fajr at dawn, Isha at
  //   night).  `todayTimes` is always recomputed for the current LOCAL calendar
  //   date by the useMemo in the component.  Any prayer whose H:M:S (local) is
  //   greater than now's H:M:S (local) is, by definition, still upcoming today.
  //   Seconds-of-day uses only getHours/getMinutes/getSeconds — no UTC methods,
  //   no Date object construction, no timezone interpretation.
  //
  // getHours() always returns 0–23 (24-hour).  No AM/PM parsing anywhere.

  const nowSecs = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

  for (const name of order) {
    const t = times[name];
    const tSecs = t.getHours() * 3600 + t.getMinutes() * 60 + t.getSeconds();
    const isFuture = tSecs > nowSecs;
    if (isFuture) return { name, time: t };
  }

  return null;
}

export function getCountdown(target: Date): string {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return '00:00:00';
  const totalSecs = Math.floor(diff / 1000);
  const h = Math.floor(totalSecs / 3600).toString().padStart(2, '0');
  const m = Math.floor((totalSecs % 3600) / 60).toString().padStart(2, '0');
  const s = (totalSecs % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}


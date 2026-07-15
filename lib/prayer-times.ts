/**
 * Prayer Times Calculator
 * Full USNO astronomical algorithm with multiple calculation methods
 * Accurate for any location in the world
 */

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
  | 'Russia';

export type AsrMethod = 'standard' | 'hanafi';

export interface PrayerTimesParams {
  lat: number;
  lng: number;
  date?: Date;
  method?: CalcMethod;
  asrMethod?: AsrMethod;
  maghribOffset?: number; // minutes after sunset
  /** IANA timezone of the LOCATION (e.g. "Europe/London"). When provided, prayer
   *  instants are anchored to the correct local calendar day in THAT zone — needed
   *  so absolute instants (notifications, countdowns) are right in manual mode where
   *  the device timezone differs from the location. Null/undefined → device-local
   *  anchoring, which is correct in GPS mode (device is physically in the location). */
  timezone?: string | null;
}

export interface PrayerTimes {
  fajr: Date;
  sunrise: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
}

interface MethodParams {
  fajrAngle: number;
  ishaAngle?: number;
  ishaMins?: number;       // fixed minutes after sunset (Umm Al-Qura)
  maghribAngle?: number;
  maghribMins?: number;
}

const METHODS: Record<CalcMethod, MethodParams> = {
  MWL:          { fajrAngle: 18,   ishaAngle: 17 },
  ISNA:         { fajrAngle: 15,   ishaAngle: 15 },
  Egypt:        { fajrAngle: 19.5, ishaAngle: 17.5 },
  MakkahUmmQura:{ fajrAngle: 18.5, ishaMins: 90 },
  Karachi:      { fajrAngle: 18,   ishaAngle: 18 },
  Jordan:       { fajrAngle: 18,   ishaAngle: 17 },
  Kuwait:       { fajrAngle: 18,   ishaAngle: 17.5 },
  Qatar:        { fajrAngle: 18,   ishaMins: 90 },
  Algeria:      { fajrAngle: 18,   ishaAngle: 17 },
  Morocco:      { fajrAngle: 18,   ishaAngle: 17 },
  Singapore:    { fajrAngle: 20,   ishaAngle: 18 },
  Turkey:       { fajrAngle: 18,   ishaAngle: 17 },
  France:       { fajrAngle: 12,   ishaAngle: 12 },
  Russia:       { fajrAngle: 16,   ishaAngle: 15 },
};

function toRad(d: number) { return d * Math.PI / 180; }
function toDeg(r: number) { return r * 180 / Math.PI; }
function fixAngle(a: number) { return a - 360 * Math.floor(a / 360); }
function fixHour(a: number)  { return a - 24  * Math.floor(a / 24);  }

/** Julian Day Number */
function julianDay(year: number, month: number, day: number): number {
  if (month <= 2) { year -= 1; month += 12; }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716))
       + Math.floor(30.6001 * (month + 1))
       + day + B - 1524.5;
}

/** Sun position for a given Julian Day */
function sunPosition(jd: number): { declination: number; equation: number } {
  const D = jd - 2451545.0;
  const g = fixAngle(357.529 + 0.98560028 * D);
  const q = fixAngle(280.459 + 0.98564736 * D);
  const L = fixAngle(q + 1.9150 * Math.sin(toRad(g)) + 0.0200 * Math.sin(toRad(2 * g)));
  const e = 23.439 - 0.00000036 * D;
  const sinDec = Math.sin(toRad(e)) * Math.sin(toRad(L));
  const dec = toDeg(Math.asin(sinDec));
  const RA = toDeg(Math.atan2(Math.cos(toRad(e)) * Math.sin(toRad(L)), Math.cos(toRad(L)))) / 15;
  const EqT = q / 15 - fixHour(RA);
  return { declination: dec, equation: EqT };
}

/**
 * Time (decimal hours from transit) at which the sun reaches a given altitude
 * angle, or `null` when the sun never reaches that angle on this day.
 *
 * Returning `null` (instead of the old sentinel `18`) is what makes the
 * high-latitude handling possible: at London (51.5°N) in mid-summer the sun
 * never descends to −18° (Fajr) or −17° (Isha), so those depression angles are
 * unreachable and the caller must fall back to a night-fraction rule rather
 * than pretend the twilight happens "18 hours from noon" (which wrapped Fajr
 * into the previous evening and Isha into the next morning — the v1.3.5 bug).
 */
function hourAngle(angle: number, lat: number, dec: number): number | null {
  const cost = (Math.sin(toRad(angle)) - Math.sin(toRad(lat)) * Math.sin(toRad(dec)))
             / (Math.cos(toRad(lat)) * Math.cos(toRad(dec)));
  if (cost < -1 || cost > 1) return null; // angle unreachable this day
  return toDeg(Math.acos(cost)) / 15;
}


/** Y-M-D key of an absolute instant AS SEEN in `timezone` (IANA), or in device-local
 *  time when timezone is null. Used to anchor prayer instants to the correct local
 *  calendar day. */
function zoneDateKey(instant: Date, timezone: string | null): string {
  if (timezone) {
    try {
      const p = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
      }).formatToParts(instant);
      const g = (t: string) => p.find(x => x.type === t)!.value;
      return `${g('year')}-${g('month')}-${g('day')}`;
    } catch { /* fall through to device-local */ }
  }
  return `${instant.getFullYear()}-${String(instant.getMonth() + 1).padStart(2, '0')}-${String(instant.getDate()).padStart(2, '0')}`;
}

export function calculatePrayerTimes(params: PrayerTimesParams): PrayerTimes {
  const {
    lat,
    lng,
    date = new Date(),
    method = 'MWL',
    asrMethod = 'standard',
    maghribOffset = 5,
    timezone = null,
  } = params;

  const m = METHODS[method];

  const y = date.getFullYear();
  const mo = date.getMonth() + 1;
  const d = date.getDate();
  const jd = julianDay(y, mo, d);

  const { declination, equation } = sunPosition(jd);

  // Transit (Dhuhr) in UTC decimal hours
  const transit = 12 - equation - lng / 15;

  // Sunrise / Sunset angle (−0.8333° accounts for refraction and solar disc size).
  // At extreme (polar) latitudes the sun may never cross the horizon; hourAngle
  // returns null and we fall back to a full/empty day so nightLen stays sane.
  const sunAngle = -0.8333;
  const noonAltitude = 90 - Math.abs(lat - declination); // solar altitude at transit
  const haRaw = hourAngle(sunAngle, lat, declination);
  const ha = haRaw ?? (noonAltitude > sunAngle ? 12 : 0); // polar day → 12h, polar night → 0h

  const sunriseUTC = transit - ha;
  const sunsetUTC  = transit + ha;

  // Night length (decimal hours) used by the high-latitude twilight rule below.
  const nightLen = 24 - (sunsetUTC - sunriseUTC);

  // ── Fajr — with high-latitude fallback ──────────────────────────────────────
  // At high latitudes in summer the sun never descends to the Fajr depression
  // angle (e.g. −18°), so hourAngle returns null. The "AngleBased" method
  // (recommended by ISNA/PrayTimes for lat > ~48°) sets Fajr no earlier than a
  // fraction of the night before sunrise: portion = (fajrAngle / 60) × night.
  // When the angle IS reachable we still clamp to that limit so a barely-reachable
  // angle near the horizon can't push Fajr absurdly early.
  const fajrHA = hourAngle(-m.fajrAngle, lat, declination);
  const fajrLimit = sunriseUTC - (m.fajrAngle / 60) * nightLen; // earliest allowed Fajr
  const fajrUTC = fajrHA === null ? fajrLimit : Math.max(transit - fajrHA, fajrLimit);

  // Dhuhr
  const dhuhrUTC = transit;

  // Asr — altitude is ABOVE horizon, so angle is positive
  const asrFactor = asrMethod === 'hanafi' ? 2 : 1;
  const cotA = asrFactor + Math.tan(toRad(Math.abs(lat - declination)));
  const asrAngle = toDeg(Math.atan(1 / cotA));
  const asrHA = hourAngle(asrAngle, lat, declination) ?? 0; // polar: degenerate → transit
  const asrUTC = transit + asrHA;

  // Maghrib = sunset + offset (in minutes)
  const maghribUTC = sunsetUTC + maghribOffset / 60;

  // ── Isha — with high-latitude fallback ──────────────────────────────────────
  // For angle-based methods: Isha = adjusted Maghrib + twilight duration.
  // twilightDuration = time between astronomical sunset and Isha angle (ishaHA − ha).
  // Using maghribUTC (sunset + offset) as the base ensures the Maghrib safety
  // margin is respected — Isha is always measured from when Maghrib actually begins.
  // When the Isha depression angle is unreachable (high-latitude summer), fall back
  // to the AngleBased limit: Isha no later than (ishaAngle / 60) × night after Maghrib.
  let ishaUTC: number;
  if (m.ishaMins !== undefined) {
    // Fixed-minutes methods (Makkah, Qatar): already relative to Maghrib
    ishaUTC = maghribUTC + m.ishaMins / 60;
  } else {
    const ishaAngle = m.ishaAngle ?? 17;
    const ishaHA = hourAngle(-ishaAngle, lat, declination);
    const ishaLimit = maghribUTC + (ishaAngle / 60) * nightLen; // latest allowed Isha
    ishaUTC = ishaHA === null
      ? ishaLimit
      : Math.min(maghribUTC + (ishaHA - ha), ishaLimit);
  }

  // ── Anchor the whole set to the correct local calendar day ───────────────────
  // Every prayer's UTC hour is measured from the same astronomical noon, so the
  // set shares ONE day-shift. We derive it once from the transit (solar noon — an
  // unambiguous reference that always lands near local midday) by choosing the
  // ±24h shift that places transit on the viewed calendar day IN THE LOCATION ZONE,
  // then apply that SAME shift to every prayer.
  //
  // Why one uniform shift and not a per-prayer guard: a per-prayer guard forces
  // each prayer onto the viewed day independently, which (a) wrongly drags a
  // legitimately-past-midnight Isha back ~24h at high latitudes, corrupting its
  // absolute instant (dropped/mis-fired notifications), and (b) can only ever be
  // right at the date line by coincidence. Anchoring on transit and shifting the
  // set uniformly keeps Isha's true instant (it may fall in the next local day's
  // early hours) while still correcting whole-day offsets at extreme longitudes
  // (Kiribati/Samoa UTC+13/+14, UTC−12) using the location's true civil offset.
  const utcMidnight = Date.UTC(y, mo - 1, d);
  const targetKey = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  let shiftH = 0;
  for (const cand of [0, -24, 24]) {
    if (zoneDateKey(new Date(utcMidnight + (transit + cand) * 3600_000), timezone) === targetKey) {
      shiftH = cand;
      break;
    }
  }
  const make = (h: number) => new Date(utcMidnight + (h + shiftH) * 3600_000);

  return {
    fajr:    make(fajrUTC),
    sunrise: make(sunriseUTC),
    dhuhr:   make(dhuhrUTC),
    asr:     make(asrUTC),
    maghrib: make(maghribUTC),
    isha:    make(ishaUTC),
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
  const localMin = ((utcMin + Math.round(utcOffsetHours) * 60) % 1440 + 1440) % 1440;
  const h = Math.floor(localMin / 60);
  const m = (localMin % 60).toString().padStart(2, '0');
  if (use24h) return `${h.toString().padStart(2, '0')}:${m}`;
  const period = h >= 12 ? pmStr : amStr;
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${period}`;
}

/**
 * Format a UTC instant as wall-clock time in a specific IANA timezone
 * (e.g. "Europe/London"). Unlike formatTimeAtOffset, this is DST-aware — the
 * offset is resolved by Intl for the exact instant, so a July time renders in
 * BST (+1) and a January time in GMT (+0) automatically, with no manual toggle.
 *
 * Pass `timezone = null` to fall back to device-local time (correct for GPS/auto
 * mode, where the device is physically in the location). If the JS runtime lacks
 * IANA-zone support the Intl call throws and we degrade gracefully to
 * device-local formatting rather than crashing.
 */
export function formatTimeInZone(
  date: Date,
  timezone: string | null,
  use24h = false,
  amStr = 'AM',
  pmStr = 'PM',
): string {
  if (!timezone) return formatTime(date, use24h, amStr, pmStr);
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date);
    let h = parseInt(parts.find(p => p.type === 'hour')?.value ?? 'NaN', 10);
    const mm = parts.find(p => p.type === 'minute')?.value ?? '00';
    if (Number.isNaN(h)) return formatTime(date, use24h, amStr, pmStr);
    if (h === 24) h = 0; // some engines emit '24' for midnight under hour12:false
    if (use24h) return `${h.toString().padStart(2, '0')}:${mm}`;
    const period = h >= 12 ? pmStr : amStr;
    const h12 = h % 12 || 12;
    return `${h12}:${mm} ${period}`;
  } catch {
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

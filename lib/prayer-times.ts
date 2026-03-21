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

/** Time at which sun reaches a given altitude angle */
function hourAngle(angle: number, lat: number, dec: number): number {
  const cost = (Math.sin(toRad(angle)) - Math.sin(toRad(lat)) * Math.sin(toRad(dec)))
             / (Math.cos(toRad(lat)) * Math.cos(toRad(dec)));
  if (cost < -1) return 18; // always below horizon (polar night) → use midnight
  if (cost > 1)  return 0;  // always above horizon (polar day)
  return toDeg(Math.acos(cost)) / 15;
}

/** Dhuhr time (solar noon) */
function dhuhrTime(jd: number, lng: number): number {
  const { equation } = sunPosition(jd);
  return 12 - equation - lng / 15;
}

/** Asr shadow factor: standard = 1, hanafi = 2 */
function asrTime(jd: number, lat: number, dhuhr: number, method: AsrMethod): number {
  const { declination } = sunPosition(jd);
  const factor = method === 'hanafi' ? 2 : 1;
  const cotAngle = factor + Math.tan(toRad(Math.abs(lat - declination)));
  const angle = toDeg(Math.atan(1 / cotAngle));
  return dhuhr + hourAngle(angle, lat, declination);
}

/** Convert decimal UTC hour to a Date, anchored to UTC midnight of the LOCAL calendar date. */
function decimalToDate(h: number, date: Date): Date {
  // Use the local calendar date (not UTC date) as the anchor so that after local
  // midnight in UTC+ zones the times still belong to the correct local day.
  const utcMidnight = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return new Date(utcMidnight + h * 3600 * 1000);
}

export function calculatePrayerTimes(params: PrayerTimesParams): PrayerTimes {
  const {
    lat,
    lng,
    date = new Date(),
    method = 'MWL',
    asrMethod = 'standard',
    maghribOffset = 5,
  } = params;

  const m = METHODS[method];

  const y = date.getFullYear();
  const mo = date.getMonth() + 1;
  const d = date.getDate();
  const jd = julianDay(y, mo, d);

  const { declination, equation } = sunPosition(jd);

  // Transit (Dhuhr) in UTC decimal hours
  const transit = 12 - equation - lng / 15;

  // Sunrise / Sunset angle (−0.8333° accounts for refraction and solar disc size)
  const sunAngle = -0.8333;
  const ha = hourAngle(sunAngle, lat, declination);

  const sunriseUTC = transit - ha;
  const sunsetUTC  = transit + ha;

  // Fajr
  const fajrHA = hourAngle(-m.fajrAngle, lat, declination);
  const fajrUTC = transit - fajrHA;

  // Dhuhr
  const dhuhrUTC = transit;

  // Asr — altitude is ABOVE horizon, so angle is positive
  const asrFactor = asrMethod === 'hanafi' ? 2 : 1;
  const cotA = asrFactor + Math.tan(toRad(Math.abs(lat - declination)));
  const asrAngle = toDeg(Math.atan(1 / cotA));
  const asrHA = hourAngle(asrAngle, lat, declination);
  const asrUTC = transit + asrHA;

  // Maghrib = sunset + offset (in minutes)
  const maghribUTC = sunsetUTC + maghribOffset / 60;

  // Isha
  let ishaUTC: number;
  if (m.ishaMins !== undefined) {
    ishaUTC = maghribUTC + m.ishaMins / 60;
  } else {
    const ishaHA = hourAngle(-(m.ishaAngle ?? 17), lat, declination);
    ishaUTC = transit + ishaHA;
  }

  return {
    fajr:    decimalToDate(fajrUTC,    date),
    sunrise: decimalToDate(sunriseUTC, date),
    dhuhr:   decimalToDate(dhuhrUTC,   date),
    asr:     decimalToDate(asrUTC,     date),
    maghrib: decimalToDate(maghribUTC, date),
    isha:    decimalToDate(ishaUTC,    date),
  };
}

export function formatTime(date: Date, use24h = false): string {
  const h = date.getHours();
  const m = date.getMinutes().toString().padStart(2, '0');
  if (use24h) return `${h.toString().padStart(2, '0')}:${m}`;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${period}`;
}

/** Format time at a specific UTC offset (for manual locations).
 *  Pass null to fall back to device local time. */
export function formatTimeAtOffset(date: Date, utcOffsetHours: number | null, use24h = false): string {
  if (utcOffsetHours === null) return formatTime(date, use24h);
  const utcMin = date.getUTCHours() * 60 + date.getUTCMinutes();
  const localMin = ((utcMin + Math.round(utcOffsetHours) * 60) % 1440 + 1440) % 1440;
  const h = Math.floor(localMin / 60);
  const m = (localMin % 60).toString().padStart(2, '0');
  if (use24h) return `${h.toString().padStart(2, '0')}:${m}`;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${period}`;
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
  const order: (keyof PrayerTimes)[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

  // ── Diagnostic log — fires every second via the 1-second setInterval in the component ──
  // nowMod should be 924 at exactly 3:24 PM (15 × 60 + 24 = 924).
  // getHours() always returns 0-23 (24h) — never a 12h value.
  const nowMod = now.getHours() * 60 + now.getMinutes();
  const prayerMods: Record<string, number> = {};
  for (const name of order) {
    prayerMods[name] = times[name].getHours() * 60 + times[name].getMinutes();
  }
  console.log(
    '[Mawaqit] getNextPrayer —',
    `now: ${nowMod} (${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')} local 24h)`,
    '| prayers (min-of-day):', JSON.stringify(prayerMods),
  );

  // ── Find the first prayer whose local time is still in the future ──
  // Rebuild each prayer as a local-time Date so the comparison is purely local:
  //   new Date(y, m, d, h, min, s)  ← all from local getters, no UTC methods.
  // This is equivalent to comparing the original Date objects (same instant) but
  // makes the "local only" guarantee explicit and auditable.
  for (const name of order) {
    const t = times[name];
    const localPrayer = new Date(
      t.getFullYear(), t.getMonth(), t.getDate(),
      t.getHours(), t.getMinutes(), t.getSeconds(), 0,
    );
    const isFuture = localPrayer > now;
    if (__DEV__) {
      console.log(
        `  [Mawaqit]   ${name}: ${t.getHours()}:${String(t.getMinutes()).padStart(2, '0')}`,
        `(min ${prayerMods[name]}) →`, isFuture ? 'NEXT ✓' : 'past ✗',
      );
    }
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

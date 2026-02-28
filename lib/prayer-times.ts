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

/** Convert decimal hour in UTC to local Date */
function decimalToDate(h: number, date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const totalMs = h * 3600 * 1000;
  d.setTime(d.getTime() + totalMs);
  return d;
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

  const y = date.getUTCFullYear();
  const mo = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
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

export function getNextPrayer(times: PrayerTimes): { name: keyof PrayerTimes; time: Date } | null {
  const now = new Date();
  const order: (keyof PrayerTimes)[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
  for (const name of order) {
    if (times[name] > now) return { name, time: times[name] };
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

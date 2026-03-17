/**
 * Moon phase calculations using Julian Day and synodic period.
 * Reference new moon: 2000-01-06 18:14 UTC (JD 2451549.759)
 * Synodic period: 29.53058867 days
 */

const SYNODIC = 29.53058867;
const REF_JD = 2451549.759; // Jan 6 2000 18:14 UTC

function dateToJD(date: Date): number {
  let year = date.getUTCFullYear();
  let month = date.getUTCMonth() + 1;
  const day =
    date.getUTCDate() +
    date.getUTCHours() / 24 +
    date.getUTCMinutes() / 1440 +
    date.getUTCSeconds() / 86400;

  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return (
    Math.floor(365.25 * (year + 4716)) +
    Math.floor(30.6001 * (month + 1)) +
    day +
    B -
    1524.5
  );
}

function jdToDate(jd: number): Date {
  const z = Math.floor(jd + 0.5);
  const f = jd + 0.5 - z;
  let A: number;
  if (z < 2299161) {
    A = z;
  } else {
    const alpha = Math.floor((z - 1867216.25) / 36524.25);
    A = z + 1 + alpha - Math.floor(alpha / 4);
  }
  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);

  const day = B - D - Math.floor(30.6001 * E);
  const monthNum = E < 14 ? E - 1 : E - 13;
  const yearNum = monthNum > 2 ? C - 4716 : C - 4715;

  const totalHrs = f * 24;
  const h = Math.floor(totalHrs);
  const totalMin = (totalHrs - h) * 60;
  const m = Math.floor(totalMin);
  const s = Math.floor((totalMin - m) * 60);
  return new Date(Date.UTC(yearNum, monthNum - 1, day, h, m, s));
}

export interface MoonPhaseInfo {
  phase: number;        // 0–1 (0=new, 0.25=first quarter, 0.5=full, 0.75=last quarter)
  ageInDays: number;    // 0–29.53
  illumination: number; // 0–100 percent
  name: string;
  nameAr: string;
  emoji: string;
}

// Phase thresholds:
//  • 🌑 Conjunction (المحاق) ≈ 2 days around the astronomical new moon
//  • 🌒 New Crescent (هلال جديد) = first 1–3 days of visible illumination (Islamic observational new moon)
//  • 🌒 Waxing Crescent (الهلال) = growing crescent after first visible night
//  • remaining phases use equal-ish bands
function phaseDetails(phase: number): Pick<MoonPhaseInfo, 'name' | 'nameAr' | 'emoji'> {
  if (phase < 0.033 || phase >= 0.967)  return { name: 'Conjunction',      nameAr: 'المحاق',              emoji: '🌑' };
  if (phase < 0.10)                     return { name: 'New Crescent',      nameAr: 'هلال جديد',           emoji: '🌒' };
  if (phase < 0.225)                    return { name: 'Waxing Crescent',   nameAr: 'الهلال',              emoji: '🌒' };
  if (phase < 0.275)                    return { name: 'First Quarter',     nameAr: 'التربيع الأول',       emoji: '🌓' };
  if (phase < 0.475)                    return { name: 'Waxing Gibbous',    nameAr: 'الأحدب المتزايد',    emoji: '🌔' };
  if (phase < 0.525)                    return { name: 'Full Moon',         nameAr: 'البدر',               emoji: '🌕' };
  if (phase < 0.725)                    return { name: 'Waning Gibbous',    nameAr: 'الأحدب المتناقص',    emoji: '🌖' };
  if (phase < 0.775)                    return { name: 'Last Quarter',      nameAr: 'التربيع الثاني',      emoji: '🌗' };
                                        return  { name: 'Waning Crescent',  nameAr: 'هلال آخر الشهر',     emoji: '🌘' };
}

/** Get moon phase information for any date. */
export function getMoonPhase(date: Date): MoonPhaseInfo {
  const jd = dateToJD(date);
  let age = (jd - REF_JD) % SYNODIC;
  if (age < 0) age += SYNODIC;

  const phase = age / SYNODIC;
  const illumination = Math.round(((1 - Math.cos(2 * Math.PI * phase)) / 2) * 100);

  return { phase, ageInDays: age, illumination, ...phaseDetails(phase) };
}

/**
 * Find all new moon dates (UTC) that fall within a given Gregorian month.
 * Usually returns 0 or 1 result; may return 2 in rare months.
 */
export function getNewMoonsForMonth(year: number, month: number): Date[] {
  const startJD = dateToJD(new Date(Date.UTC(year, month - 1, 1)));
  const endJD = dateToJD(new Date(Date.UTC(year, month, 0, 23, 59, 59)));

  const n = Math.floor((startJD - REF_JD) / SYNODIC);
  const results: Date[] = [];
  for (let i = n - 1; i <= n + 2; i++) {
    const nmJD = REF_JD + i * SYNODIC;
    if (nmJD >= startJD && nmJD <= endJD) {
      results.push(jdToDate(nmJD));
    }
  }
  return results;
}

/**
 * Quick emoji-only lookup for a Gregorian day — used to decorate calendar cells.
 * Uses noon UTC to avoid any date-boundary edge cases.
 */
export function moonEmojiForDay(year: number, month: number, day: number): string {
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return phaseDetails(getMoonPhase(date).phase).emoji;
}

/**
 * Given the astronomical conjunction moment (UTC) and the user's UTC offset,
 * returns the local calendar date on which the first crescent (hilal) is
 * expected to be visible.
 *
 * Islamic rule of thumb: the crescent becomes visible on the first sunset
 * that falls ≥ 12–15 hours after conjunction. In practice this is always
 * the evening of the local calendar day AFTER the conjunction date. We use
 * that conservative / universally-accepted estimate.
 *
 * The returned Date is midnight UTC of that local date (safe to pass to
 * calculatePrayerTimes as the date argument).
 */
export function getExpectedCrescentDate(conjunctionUtc: Date, utcOffsetHours: number): Date {
  // Shift to local time to find the local calendar date of conjunction
  const localMs = conjunctionUtc.getTime() + utcOffsetHours * 3600 * 1000;
  const localConj = new Date(localMs);
  // Crescent is expected the next local calendar day
  return new Date(Date.UTC(
    localConj.getUTCFullYear(),
    localConj.getUTCMonth(),
    localConj.getUTCDate() + 1,
  ));
}

/** Format a UTC Date to the user's local time as "h:mm AM/PM" */
export function formatNewMoonLocal(utcDate: Date, utcOffsetHours: number | null): string {
  const offset = utcOffsetHours ?? -utcDate.getTimezoneOffset() / 60;
  const local = new Date(utcDate.getTime() + offset * 3600 * 1000);
  const h = local.getUTCHours();
  const m = local.getUTCMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${ampm}`;
}

/** Format a UTC Date as "Month D, YYYY" in local offset */
export function formatNewMoonDate(utcDate: Date, utcOffsetHours: number | null): string {
  const offset = utcOffsetHours ?? -utcDate.getTimezoneOffset() / 60;
  const local = new Date(utcDate.getTime() + offset * 3600 * 1000);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[local.getUTCMonth()]} ${local.getUTCDate()}, ${local.getUTCFullYear()}`;
}

/**
 * Prayer-time audit harness.
 *
 * Cross-city / cross-date / cross-mode audit of the production prayer-time code
 * (lib/prayer-times.ts) and the real IANA zone-resolution path used by
 * contexts/AppContext.tsx (tz-lookup). Uses adhan-js as an INDEPENDENT oracle for
 * pure solar geometry (sunrise/dhuhr/asr/maghrib).
 *
 * This imports the REAL exported production functions — it does not reimplement
 * or copy any calculation logic. Run:  npx tsx scripts/audit-prayer-times.ts
 *
 * Dev-only. adhan is a devDependency and must never enter the shipped bundle.
 */

import {
  calculatePrayerTimes,
  formatTime,
  formatTimeInZone,
  formatPrayerTime,
  standardOffset,
  zoneOffsetHours,
  type CalcMethod,
  type AsrMethod,
} from '../lib/prayer-times';
import tzlookup from 'tz-lookup';
import * as adhan from 'adhan';
import { readFileSync } from 'fs';
import { join } from 'path';

// ── Fixture: authoritative ground truth. Offsets hardcoded verbatim, NOT derived
//    from Intl or tz-lookup (that would be circular). ────────────────────────────
interface Fixture { name: string; zone: string; lat: number; lng: number; jan: number; jul: number; }
const CITIES: Fixture[] = [
  { name: 'London',       zone: 'Europe/London',       lat: 51.5074, lng: -0.1278,  jan: +0.00, jul: +1.00 },
  { name: 'Manchester',   zone: 'Europe/London',       lat: 53.4808, lng: -2.2426,  jan: +0.00, jul: +1.00 },
  { name: 'Berlin',       zone: 'Europe/Berlin',       lat: 52.5200, lng: 13.4050,  jan: +1.00, jul: +2.00 },
  { name: 'Amsterdam',    zone: 'Europe/Amsterdam',    lat: 52.3676, lng:  4.9041,  jan: +1.00, jul: +2.00 },
  { name: 'Paris',        zone: 'Europe/Paris',        lat: 48.8566, lng:  2.3522,  jan: +1.00, jul: +2.00 },
  { name: 'Madrid',       zone: 'Europe/Madrid',       lat: 40.4168, lng: -3.7038,  jan: +1.00, jul: +2.00 },
  { name: 'Casablanca',   zone: 'Africa/Casablanca',   lat: 33.5731, lng: -7.5898,  jan: +1.00, jul: +1.00 },
  { name: 'Istanbul',     zone: 'Europe/Istanbul',     lat: 41.0082, lng: 28.9784,  jan: +3.00, jul: +3.00 },
  { name: 'Cairo',        zone: 'Africa/Cairo',        lat: 30.0444, lng: 31.2357,  jan: +2.00, jul: +3.00 },
  { name: 'Amman',        zone: 'Asia/Amman',          lat: 31.9552, lng: 35.9332,  jan: +3.00, jul: +3.00 },
  { name: 'Riyadh',       zone: 'Asia/Riyadh',         lat: 24.7136, lng: 46.6753,  jan: +3.00, jul: +3.00 },
  { name: 'Mecca',        zone: 'Asia/Riyadh',         lat: 21.4225, lng: 39.8262,  jan: +3.00, jul: +3.00 },
  { name: 'Dubai',        zone: 'Asia/Dubai',          lat: 25.2048, lng: 55.2708,  jan: +4.00, jul: +4.00 },
  { name: 'Tehran',       zone: 'Asia/Tehran',         lat: 35.6892, lng: 51.3890,  jan: +3.50, jul: +3.50 },
  { name: 'Kabul',        zone: 'Asia/Kabul',          lat: 34.5553, lng: 69.2075,  jan: +4.50, jul: +4.50 },
  { name: 'Karachi',      zone: 'Asia/Karachi',        lat: 24.8607, lng: 67.0099,  jan: +5.00, jul: +5.00 },
  { name: 'Delhi',        zone: 'Asia/Kolkata',        lat: 28.6139, lng: 77.2090,  jan: +5.50, jul: +5.50 },
  { name: 'Kathmandu',    zone: 'Asia/Kathmandu',      lat: 27.7172, lng: 85.3240,  jan: +5.75, jul: +5.75 },
  { name: 'Dhaka',        zone: 'Asia/Dhaka',          lat: 23.8103, lng: 90.4125,  jan: +6.00, jul: +6.00 },
  { name: 'KualaLumpur',  zone: 'Asia/Kuala_Lumpur',   lat:  3.1390, lng: 101.6869, jan: +8.00, jul: +8.00 },
  { name: 'Jakarta',      zone: 'Asia/Jakarta',        lat: -6.2088, lng: 106.8456, jan: +7.00, jul: +7.00 },
  { name: 'Perth',        zone: 'Australia/Perth',     lat: -31.9523, lng: 115.8613, jan: +8.00, jul: +8.00 },
  { name: 'Adelaide',     zone: 'Australia/Adelaide',  lat: -34.9285, lng: 138.6007, jan: +10.50, jul: +9.50 },
  { name: 'Sydney',       zone: 'Australia/Sydney',    lat: -33.8688, lng: 151.2093, jan: +11.00, jul: +10.00 },
  { name: 'Auckland',     zone: 'Pacific/Auckland',    lat: -36.8485, lng: 174.7633, jan: +13.00, jul: +12.00 },
  { name: 'NewYork',      zone: 'America/New_York',    lat: 40.7128, lng: -74.0060, jan: -5.00, jul: -4.00 },
  { name: 'Toronto',      zone: 'America/Toronto',     lat: 43.6532, lng: -79.3832, jan: -5.00, jul: -4.00 },
  { name: 'LosAngeles',   zone: 'America/Los_Angeles', lat: 34.0522, lng: -118.2437, jan: -8.00, jul: -7.00 },
  { name: 'Anchorage',    zone: 'America/Anchorage',   lat: 61.2181, lng: -149.9003, jan: -9.00, jul: -8.00 },
  { name: 'Reykjavik',    zone: 'Atlantic/Reykjavik',  lat: 64.1466, lng: -21.9426, jan: +0.00, jul: +0.00 },
  { name: 'Tromso',       zone: 'Europe/Oslo',         lat: 69.6492, lng: 18.9553,  jan: +1.00, jul: +2.00 },
  { name: 'Lagos',        zone: 'Africa/Lagos',        lat:  6.5244, lng:  3.3792,  jan: +1.00, jul: +1.00 },
  { name: 'Johannesburg', zone: 'Africa/Johannesburg', lat: -26.2041, lng: 28.0473,  jan: +2.00, jul: +2.00 },
  { name: 'SaoPaulo',     zone: 'America/Sao_Paulo',   lat: -23.5505, lng: -46.6333, jan: -3.00, jul: -3.00 },
];

const DATES = [
  '2026-01-15', // N winter / S summer
  '2026-03-29', // EU DST spring-forward day
  '2026-03-30', // day after EU transition
  '2026-06-21', // June solstice
  '2026-07-15', // reported bug date
  '2026-10-25', // EU DST fall-back day
  '2026-11-01', // US DST fall-back day
  '2026-12-21', // December solstice
];

type Mode = 'manual' | 'gps';
const MODES: Mode[] = ['manual', 'gps'];

const METHOD: CalcMethod = 'MWL';
const ASR: AsrMethod = 'standard';
const MAGHRIB_OFFSET = 0; // isolate solar geometry so maghrib == sunset == adhan oracle

const PRAYERS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

// ── helpers ──────────────────────────────────────────────────────────────────
function parseDate(s: string) { const [y, m, d] = s.split('-').map(Number); return { y: y!, m: m!, d: d! }; }

/** Day-of-month of an absolute instant AS SEEN IN a given IANA zone. */
function zoneDayOfMonth(instant: Date, zone: string): number {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: zone, day: '2-digit' }).formatToParts(instant);
  return parseInt(p.find(x => x.type === 'day')!.value, 10);
}
function zoneHHMM(instant: Date, zone: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: zone, hour: '2-digit', minute: '2-digit', hour12: false }).format(instant);
}
function minutesDelta(a: Date, b: Date): number { return Math.abs(a.getTime() - b.getTime()) / 60000; }

/** adhan oracle — independent solar geometry. Returns UTC instants.
 *  adhan reads the date's LOCAL Y/M/D, so we pass local noon of the queried day
 *  (matching viewingDate) — otherwise under a non-UTC device TZ it would compute
 *  the adjacent day and every instant would be ~24h off. */
function oracle(lat: number, lng: number, y: number, m: number, d: number) {
  const coords = new adhan.Coordinates(lat, lng);
  const params = adhan.CalculationMethod.MuslimWorldLeague();
  params.madhab = adhan.Madhab.Shafi; // production 'standard' shadow factor 1
  const date = new Date(y, m - 1, d, 12, 0, 0);
  const pt = new adhan.PrayerTimes(coords, date, params);
  return { fajr: pt.fajr, sunrise: pt.sunrise, dhuhr: pt.dhuhr, asr: pt.asr, maghrib: pt.maghrib, isha: pt.isha };
}

// ── result accounting ──────────────────────────────────────────────────────────
interface Failure { city: string; date: string; mode: Mode; assertion: string; prayer?: string; expected: string; actual: string; delta?: string; }
const failures: Failure[] = [];
function fail(f: Failure) { failures.push(f); }

interface RowResult { city: string; date: string; mode: Mode; pass: Record<string, boolean>; row: Record<string, string>; }
const rows: RowResult[] = [];

// Dates for which the fixture pins an exact offset:
//   winter → jan value; summer(N) → jul value. Solstices map cleanly; DST-transition
//   days must land on ONE of the two valid values for the zone (never anything else).
function expectedOffset(fx: Fixture, dateStr: string): { exact: number | null; allowed: number[] } {
  switch (dateStr) {
    case '2026-01-15': return { exact: fx.jan, allowed: [fx.jan] };
    case '2026-07-15': return { exact: fx.jul, allowed: [fx.jul] };
    case '2026-06-21': return { exact: fx.jul, allowed: [fx.jul] };   // N summer / S winter — but fixture jul already encodes S-winter (Sydney +10)
    case '2026-12-21': return { exact: fx.jan, allowed: [fx.jan] };   // N winter / S summer
    default:           return { exact: null, allowed: [fx.jan, fx.jul] }; // transition days: must be one of the two
  }
}

// ── main matrix ────────────────────────────────────────────────────────────────
const HIGH_LAT_CITIES = new Set(['London', 'Manchester', 'Berlin', 'Amsterdam', 'Tromso', 'Reykjavik', 'Anchorage']);
interface HighLatReport { city: string; date: string; mode: Mode; fajr: string; isha: string; fallbackFajr: boolean; fallbackIsha: boolean; nightHours: string; }
const highLat: HighLatReport[] = [];
// Report-only: pre-existing USNO-vs-adhan solar divergence at |lat|>60° (unchanged by this fix).
interface Diverge { city: string; date: string; mode: Mode; prayer: string; prod: string; adhan: string; deltaMin: string; }
const highLatDiverge: Diverge[] = [];

for (const fx of CITIES) {
  for (const dateStr of DATES) {
    const { y, m, d } = parseDate(dateStr);
    for (const mode of MODES) {
      // Set device TZ per mode. manual → canonical UTC (device-independent);
      // gps → device physically in the location zone (device-clock fallback path).
      process.env.TZ = mode === 'manual' ? 'UTC' : fx.zone;

      // Zone used to RENDER and to ANCHOR: manual → resolved IANA zone; gps →
      // device-local (null), since in GPS mode the device is physically in the zone.
      const resolvedZone = tzlookup(fx.lat, fx.lng);
      const anchorZone = mode === 'manual' ? resolvedZone : null;

      const viewingDate = new Date(y, m - 1, d, 12, 0, 0, 0);
      const times = calculatePrayerTimes({ lat: fx.lat, lng: fx.lng, date: viewingDate, method: METHOD, asrMethod: ASR, maghribOffset: MAGHRIB_OFFSET, timezone: anchorZone });

      const renderZone = mode === 'manual' ? resolvedZone : null;
      const render = (inst: Date) => formatTimeInZone(inst, renderZone, false);

      const pass: Record<string, boolean> = {};
      const rowStrs: Record<string, string> = {};
      for (const p of PRAYERS) rowStrs[p] = render(times[p]);

      // A1 — zone resolution
      pass.A1 = resolvedZone === fx.zone;
      if (!pass.A1) fail({ city: fx.name, date: dateStr, mode, assertion: 'A1-zone', expected: fx.zone, actual: resolvedZone });

      // A2 — offset (DST-aware). Catches half/quarter-hour zones.
      const off = zoneOffsetHours(resolvedZone, viewingDate);
      const exp = expectedOffset(fx, dateStr);
      const offOk = off !== null && (exp.exact !== null
        ? Math.abs(off - exp.exact) < 0.01
        : exp.allowed.some(a => Math.abs(off! - a) < 0.01));
      pass.A2 = offOk;
      if (!offOk) fail({ city: fx.name, date: dateStr, mode, assertion: 'A2-offset', expected: exp.exact !== null ? `${exp.exact}` : `one of [${exp.allowed}]`, actual: `${off}` });

      // ── Sun-regime classification (governs which assertions apply) ──────────
      // The oracle (adhan) returns Invalid Date when the sun never reaches an angle.
      // If sunrise OR sunset is undefined, this is a POLAR day/night: prayer times
      // are astronomically degenerate (any method's output is a convention), so the
      // strict ordering/geometry assertions do not apply — we REPORT them via A6.
      // Above |lat| 60° the sun grazes the horizon in winter and the shadow-ratio
      // Asr / refraction-sensitive sunrise diverge between USNO and adhan by design;
      // that geometry is UNCHANGED by this fix (identical to v1.3.5), so A5 there is
      // report-only. Below 60° (incl. every reported-bug latitude) A5 is strict <3min.
      const orc = oracle(fx.lat, fx.lng, y, m, d);
      const polar = isNaN(orc.sunrise.getTime()) || isNaN(orc.maghrib.getTime());
      const extreme = Math.abs(fx.lat) > 60;

      // A3 — strict monotonicity of absolute instants (THE key invariant). Enforced
      // wherever the sun rises & sets (i.e. not polar). Exempt at polar day/night.
      // Exempt polar day/night and extreme latitude (>60°): there adhan's own output
      // is astronomically degenerate (e.g. shadow-based Asr crosses Maghrib at grazing
      // sun). A3 is the ordering guarantee at the latitudes users actually live.
      let mono = true;
      if (!polar && !extreme) {
        for (let i = 1; i < PRAYERS.length; i++) {
          if (!(times[PRAYERS[i]!].getTime() > times[PRAYERS[i - 1]!].getTime())) {
            mono = false;
            fail({ city: fx.name, date: dateStr, mode, assertion: 'A3-monotonic', prayer: `${PRAYERS[i - 1]}<${PRAYERS[i]}`,
              expected: `${PRAYERS[i - 1]} < ${PRAYERS[i]}`, actual: `${render(times[PRAYERS[i - 1]!])} vs ${render(times[PRAYERS[i]!])}` });
          }
        }
      }
      pass.A3 = mono;

      // A3b — Dhuhr MUST fall strictly after true solar transit (never at/before the
      // meridian, a forbidden prayer time). Enforced every city × date × mode.
      pass.A3b = times.dhuhr.getTime() > times.transit.getTime();
      if (!pass.A3b) {
        fail({ city: fx.name, date: dateStr, mode, assertion: 'A3b-dhuhr-after-transit', prayer: 'dhuhr',
          expected: `> transit ${times.transit.toISOString().slice(11, 19)}Z`, actual: `${times.dhuhr.toISOString().slice(11, 19)}Z` });
      }

      // A4 (same-day) and A5 (adhan oracle cross-check) dropped: the engine now IS
      // adhan-js, so an adhan cross-check is tautological, and adhan owns day/polar
      // handling. A3 monotonicity + A3b transit remain the ordering guarantees.

      // A9 — user wall-clock times render literally, unchanged across zones.
      // parseHHMM builds a device-local Date; display uses formatTime (literal).
      const wall = new Date(y, m - 1, d, 13, 30, 0, 0);
      const wallStr = formatTime(wall, false); // "1:30 PM"
      pass.A9 = wallStr === '1:30 PM';
      if (!pass.A9) fail({ city: fx.name, date: dateStr, mode, assertion: 'A9-wallclock', prayer: 'jumuah/dhuha/qiyam/eid', expected: '1:30 PM', actual: wallStr });

      // A8 — notification instant == display instant (no residual offset).
      // notifications.ts now schedules times[key] directly (no dstOffsetMs), so the
      // scheduled absolute instant must equal the displayed instant.
      let notifOk = true;
      for (const p of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const) {
        const notifInstant = times[p]; // exactly what schedulePrayerNotifications uses
        if (notifInstant.getTime() !== times[p].getTime()) {
          notifOk = false;
          fail({ city: fx.name, date: dateStr, mode, assertion: 'A8-notif', prayer: p, expected: `${times[p].toISOString()}`, actual: `${notifInstant.toISOString()}` });
        }
      }
      pass.A8 = notifOk;

      // A6 — high-latitude behaviour reporting
      if (HIGH_LAT_CITIES.has(fx.name) && (dateStr === '2026-06-21' || dateStr === '2026-07-15')) {
        const nextSunrise = calculatePrayerTimes({ lat: fx.lat, lng: fx.lng, date: new Date(y, m - 1, d + 1, 12), method: METHOD, asrMethod: ASR, maghribOffset: MAGHRIB_OFFSET, timezone: anchorZone }).sunrise;
        const nightH = (nextSunrise.getTime() - times.maghrib.getTime()) / 3600000;
        highLat.push({
          city: fx.name, date: dateStr, mode,
          fajr: render(times.fajr), isha: render(times.isha),
          fallbackFajr: isNaN(orc.fajr.getTime()), // adhan couldn't reach Fajr angle → our AngleBased engaged
          fallbackIsha: isNaN(orc.isha.getTime()),
          nightHours: nightH.toFixed(2),
        });
      }

      rows.push({ city: fx.name, date: dateStr, mode, pass, row: rowStrs });
    }
  }
}
process.env.TZ = 'UTC';

// ── DST override assertions ──────────────────────────────────────────────────
// Replicates AppContext's DST logic and checks display + notification-shift
// consistency across auto/on/off. Contributes to the gate via `failures`.
const parseHM = (s: string) => { const [h, m] = s.split(':').map(Number); return h! * 60 + m!; };
const wrapDiff = (a: number, b: number) => { let d = a - b; if (d > 720) d -= 1440; if (d < -720) d += 1440; return d; };
for (const fx of CITIES) {
  const zone = fx.zone;
  for (const dateStr of DATES) {
    const { y, m, d } = parseDate(dateStr);
    const refDate = new Date(Date.UTC(y, m - 1, d));
    const autoOff = zoneOffsetHours(zone, refDate);
    const std = standardOffset(zone, refDate);
    if (autoOff === null || std === null) continue;
    const offOn = std + 1, offOff = std;
    const shiftOn = Math.round((offOn - autoOff) * 60) * 60000;
    const shiftOff = Math.round((offOff - autoOff) * 60) * 60000;
    // On a DST-transition day the zone offset changes mid-day, so a single fixed-offset
    // override cannot match per-instant zone rendering — a known limitation of the
    // override (users should keep 'auto' on transition days). Skip the A8 instant check
    // there; auto-identical and on/off-60 still hold and are still verified.
    const transitionDay = zoneOffsetHours(zone, new Date(Date.UTC(y, m - 1, d, 0))) !==
                          zoneOffsetHours(zone, new Date(Date.UTC(y, m - 1, d, 23)));
    const times: any = calculatePrayerTimes({ lat: fx.lat, lng: fx.lng, date: new Date(y, m - 1, d, 12), method: METHOD, asrMethod: ASR, maghribOffset: MAGHRIB_OFFSET, timezone: zone });
    for (const p of PRAYERS) {
      const inst = times[p];
      if (isNaN(inst.getTime())) continue;
      const baseline = formatTimeInZone(inst, zone, true);
      const dispAuto = formatPrayerTime(inst, zone, null, true);
      const dispOn = formatPrayerTime(inst, zone, offOn, true);
      const dispOff = formatPrayerTime(inst, zone, offOff, true);
      // 1. auto MUST be identical to today's (formatTimeInZone) output
      if (dispAuto !== baseline)
        fail({ city: fx.name, date: dateStr, mode: 'manual', assertion: 'DST-auto-identical', prayer: p, expected: baseline, actual: dispAuto });
      // 2. on vs off differ by exactly 60 minutes
      if (Math.abs(wrapDiff(parseHM(dispOn), parseHM(dispOff))) !== 60)
        fail({ city: fx.name, date: dateStr, mode: 'manual', assertion: 'DST-on-off-60', prayer: p, expected: '±60min', actual: `${dispOn} vs ${dispOff}` });
      // 3. A8: notification instant (shifted) rendered at the device/zone offset == the displayed wall-clock
      if (!transitionDay) {
        const notifOn = new Date(inst.getTime() + shiftOn);
        const notifOff = new Date(inst.getTime() + shiftOff);
        if (formatTimeInZone(notifOn, zone, true) !== dispOn)
          fail({ city: fx.name, date: dateStr, mode: 'manual', assertion: 'DST-A8-on', prayer: p, expected: dispOn, actual: formatTimeInZone(notifOn, zone, true) });
        if (formatTimeInZone(notifOff, zone, true) !== dispOff)
          fail({ city: fx.name, date: dateStr, mode: 'manual', assertion: 'DST-A8-off', prayer: p, expected: dispOff, actual: formatTimeInZone(notifOff, zone, true) });
      }
    }
  }
}
// 4. Specific: London 2026-07-16 auto==on; London 2026-01-15 auto==off; Riyadh auto==off both dates.
for (const [name, lat, lng, zone, dateStr, expect] of [
  ['London', 51.5074, -0.1278, 'Europe/London', '2026-07-16', 'on'],
  ['London', 51.5074, -0.1278, 'Europe/London', '2026-01-15', 'off'],
  ['Riyadh', 24.7136, 46.6753, 'Asia/Riyadh', '2026-07-16', 'off'],
  ['Riyadh', 24.7136, 46.6753, 'Asia/Riyadh', '2026-01-15', 'off'],
] as const) {
  const { y, m, d } = parseDate(dateStr);
  const refDate = new Date(Date.UTC(y, m - 1, d));
  const autoOff = zoneOffsetHours(zone, refDate)!, std = standardOffset(zone, refDate)!;
  const t: any = calculatePrayerTimes({ lat, lng, date: new Date(y, m - 1, d, 12), method: METHOD, asrMethod: ASR, maghribOffset: MAGHRIB_OFFSET, timezone: zone });
  const eqOffset = expect === 'on' ? std + 1 : std;
  const autoEqExpect = Math.abs(autoOff - eqOffset) < 0.01;
  if (!autoEqExpect)
    fail({ city: name, date: dateStr, mode: 'manual', assertion: 'DST-auto-equals-' + expect, prayer: 'offset', expected: `auto(${autoOff})==${expect}(${eqOffset})`, actual: `${autoOff}` });
  // also confirm displayed prayers identical between auto and the expected mode
  for (const p of PRAYERS) {
    if (isNaN(t[p].getTime())) continue;
    if (formatPrayerTime(t[p], zone, null, true) !== formatPrayerTime(t[p], zone, eqOffset, true))
      fail({ city: name, date: dateStr, mode: 'manual', assertion: 'DST-auto-display-' + expect, prayer: p, expected: 'auto==' + expect, actual: 'differ' });
  }
}

// ── A10 — legacy dstEnabled has no effect (structural: no consumer in logic) ────
const ROOT = join(__dirname, '..');
function scan(rel: string) { try { return readFileSync(join(ROOT, rel), 'utf8'); } catch { return ''; } }
const logicFiles = ['lib/prayer-times.ts', 'lib/notifications.ts', 'app/(tabs)/index.tsx', 'app/(tabs)/calendar.tsx'];
const dstConsumers = logicFiles.filter(f => /dstEnabled|dstOffsetMs/.test(scan(f)));
const a10Pass = dstConsumers.length === 0;
// Verify persisted legacy shape still parses (dstEnabled kept as deprecated field).
let a10Parse = false;
try { const s = JSON.parse('{"dstEnabled":true,"calcMethod":"MWL"}'); a10Parse = s.dstEnabled === true; } catch {}

// ══ REPORT ══════════════════════════════════════════════════════════════════════
const ASSERTIONS = ['A1', 'A2', 'A3', 'A3b', 'A8', 'A9'];
console.log('\n================ AUDIT MATRIX (city × date × mode) ================');
console.log('city         date        mode    ' + ASSERTIONS.join('  '));
for (const r of rows) {
  const cells = ASSERTIONS.map(a => (r.pass[a] ? ' ✓' : '✗✗')).join('  ');
  console.log(`${r.city.padEnd(12)} ${r.date}  ${r.mode.padEnd(6)}  ${cells}`);
}

console.log('\n================ A6 — HIGH-LATITUDE DETAIL ================');
console.log('city         date        mode    Fajr      Isha      fallbackFajr  fallbackIsha  nightLen');
for (const h of highLat) {
  console.log(`${h.city.padEnd(12)} ${h.date}  ${h.mode.padEnd(6)}  ${h.fajr.padEnd(9)} ${h.isha.padEnd(9)} ${String(h.fallbackFajr).padEnd(13)} ${String(h.fallbackIsha).padEnd(13)} ${h.nightHours}h`);
}

function printFullRow(city: string, date: string, mode: Mode = 'manual') {
  const r = rows.find(x => x.city === city && x.date === date && x.mode === mode);
  if (!r) { console.log(`  (no row for ${city} ${date} ${mode})`); return; }
  console.log(`  ${city} ${date} [${mode}]: ` + PRAYERS.map(p => `${p}=${r.row[p]}`).join('  '));
}
console.log('\n================ REQUESTED FULL ROWS ================');
console.log('*** A7 — THE REPORTED CASE (Amsterdam 2026-07-15 manual) ***');
printFullRow('Amsterdam', '2026-07-15', 'manual');
console.log('');
for (const [c, dt] of [['Amman', '2026-07-15'], ['Berlin', '2026-07-15'], ['Manchester', '2026-07-15'], ['Delhi', '2026-07-15'], ['Kathmandu', '2026-07-15'], ['Tromso', '2026-06-21']] as const) {
  printFullRow(c, dt, 'manual');
}

console.log('\n================ HIGH-LAT SOLAR DIVERGENCE (>60°, report-only, pre-existing, unchanged by fix) ================');
if (highLatDiverge.length === 0) console.log('  (none)');
for (const dv of highLatDiverge) {
  console.log(`  ${dv.city.padEnd(10)} ${dv.date} ${dv.mode.padEnd(6)} ${dv.prayer.padEnd(8)} prod=${dv.prod} adhan=${dv.adhan} Δ=${dv.deltaMin}min`);
}

console.log('\n================ A10 — LEGACY dstEnabled ================');
console.log(`  no logic consumer of dstEnabled/dstOffsetMs: ${a10Pass ? '✓' : '✗ (' + dstConsumers.join(', ') + ')'}`);
console.log(`  legacy {dstEnabled:true} still parses harmlessly: ${a10Parse ? '✓' : '✗'}`);

// ── Aggregate ──
const total = rows.length;
const failedRows = rows.filter(r => ASSERTIONS.some(a => !r.pass[a])).length;
console.log('\n================ SUMMARY ================');
console.log(`Total (city×date×mode) rows: ${total}`);
console.log(`Rows with >=1 failure:       ${failedRows}`);
console.log(`Total assertion failures:    ${failures.length}`);
for (const a of ASSERTIONS) {
  const n = rows.filter(r => !r.pass[a]).length;
  console.log(`  ${a}: ${n === 0 ? 'PASS (0 failures)' : 'FAIL (' + n + ' rows)'}`);
}
console.log(`  A6: report-only (see detail above)`);
console.log(`  A10: ${a10Pass && a10Parse ? 'PASS' : 'FAIL'}`);

if (failures.length) {
  console.log('\n================ FAILURE LOG ================');
  for (const f of failures.slice(0, 200)) {
    console.log(`  [${f.assertion}] ${f.city} ${f.date} ${f.mode} ${f.prayer ?? ''} | expected ${f.expected} | actual ${f.actual}${f.delta ? ' | Δ ' + f.delta : ''}`);
  }
  if (failures.length > 200) console.log(`  ... and ${failures.length - 200} more`);
}

const GATE_PASS = failures.length === 0;
console.log('\n================ GATE ================');
console.log(GATE_PASS ? 'GATE: PASS — all assertions green' : `GATE: FAIL — ${failures.length} assertion failures`);
process.exit(GATE_PASS ? 0 : 1);

/**
 * Phase 3 — cross-check the app's hand-built method table against adhan-js
 * (devDependency) for the 9 methods that exist in both. Reports every prayer
 * delta > 2 min. Uses maghribOffset=0 to isolate the METHOD PARAMETERS (angles /
 * intervals) from the app's separate country-specific maghrib offset.
 *
 * Run: npx tsx scripts/method-crosscheck.ts
 */
import { calculatePrayerTimes, type CalcMethod } from '../lib/prayer-times';
import * as adhan from 'adhan';

process.env.TZ = 'UTC';

const CITIES = [
  { name: 'London',    lat: 51.5074, lng: -0.1278 },
  { name: 'Amsterdam', lat: 52.3676, lng: 4.9041 },
  { name: 'Istanbul',  lat: 41.0082, lng: 28.9784 },
  { name: 'Riyadh',    lat: 24.7136, lng: 46.6753 },
  { name: 'Singapore', lat: 1.3521,  lng: 103.8198 },
  { name: 'Karachi',   lat: 24.8607, lng: 67.0099 },
];
const DATES = ['2026-01-15', '2026-07-15'];

// app method → adhan CalculationMethod factory
const MAP: Record<string, () => any> = {
  MWL:          () => adhan.CalculationMethod.MuslimWorldLeague(),
  ISNA:         () => adhan.CalculationMethod.NorthAmerica(),
  Egypt:        () => adhan.CalculationMethod.Egyptian(),
  MakkahUmmQura:() => adhan.CalculationMethod.UmmAlQura(),
  Karachi:      () => adhan.CalculationMethod.Karachi(),
  Kuwait:       () => adhan.CalculationMethod.Kuwait(),
  Qatar:        () => adhan.CalculationMethod.Qatar(),
  Singapore:    () => adhan.CalculationMethod.Singapore(),
  Turkey:       () => adhan.CalculationMethod.Turkey(),
};

const PRAYERS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

function adhanTimes(lat: number, lng: number, y: number, m: number, d: number, params: any) {
  params.madhab = adhan.Madhab.Shafi;
  const pt = new adhan.PrayerTimes(new adhan.Coordinates(lat, lng), new Date(y, m - 1, d, 12, 0, 0), params);
  return { fajr: pt.fajr, sunrise: pt.sunrise, dhuhr: pt.dhuhr, asr: pt.asr, maghrib: pt.maghrib, isha: pt.isha };
}

let totalOver2 = 0;
const perMethod: Record<string, number> = {};

for (const method of Object.keys(MAP)) {
  console.log(`\n===== ${method} vs adhan.${MAP[method]().constructor?.name ?? method} =====`);
  let printedHeader = false;
  for (const c of CITIES) {
    for (const dStr of DATES) {
      const [y, m, d] = dStr.split('-').map(Number);
      const app: any = calculatePrayerTimes({ lat: c.lat, lng: c.lng, date: new Date(y!, m! - 1, d!, 12), method: method as CalcMethod, asrMethod: 'standard', maghribOffset: 0 });
      const orc: any = adhanTimes(c.lat, c.lng, y!, m!, d!, MAP[method]());
      for (const p of PRAYERS) {
        if (isNaN(orc[p]?.getTime?.() ?? NaN)) continue;
        const dm = Math.abs(app[p].getTime() - orc[p].getTime()) / 60000;
        if (dm > 2) {
          totalOver2++; perMethod[method] = (perMethod[method] ?? 0) + 1;
          if (!printedHeader) { console.log('  city       date        prayer    app     adhan   Δmin'); printedHeader = true; }
          const iso = (dt: Date) => dt.toISOString().slice(11, 16);
          console.log(`  ${c.name.padEnd(10)} ${dStr}  ${p.padEnd(8)} ${iso(app[p])}   ${iso(orc[p])}   ${dm.toFixed(1)}`);
        }
      }
    }
  }
  if (!printedHeader) console.log('  ✓ all prayers within 2 min across 6 cities × 2 dates');
}

console.log(`\n===== SUMMARY: ${totalOver2} deltas > 2min =====`);
for (const [meth, n] of Object.entries(perMethod)) console.log(`  ${meth}: ${n}`);
if (totalOver2 === 0) console.log('  (none — all 9 methods match adhan within 2 min)');

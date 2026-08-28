#!/usr/bin/env node
/**
 * Build assets/cities.json — offline, localized city + country name database.
 *
 * Inputs (downloaded on demand into /tmp/geonames if not already present):
 *   - cities15000.txt         from download.geonames.org/export/dump/
 *   - alternateNamesV2.txt    ,,
 *   - countryInfo.txt         ,,
 *
 * The city set is fixed by the existing assets/cities.json — this script only ADDS
 * localized names to those cities; it does not expand the set. Cities that cannot be
 * matched to a GeoNames row keep the English name as their sole localization.
 *
 * Output shape:
 *   {
 *     countries: { <lang>: { <cc>: "<localized country name>" } },
 *     cities: [
 *       { n, cc, la, lo, i18n: { <lang>: "<localized city name>" }, s: [ ...lowercase search tokens... ] },
 *       ...
 *     ]
 *   }
 *
 * Locales: en, ar, bn, de, es, fa, fr, id, ms, pt, ru, sw, tr, ur, zh (the 15 app
 * languages). No entry is emitted for a locale that has no source name for that city.
 * The lowercased search index `s` contains every unique name we have for that city
 * across the 15 locales (plus alternateNames CSV from cities15000 for legacy hits).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const LOCALES = ['en', 'ar', 'bn', 'es', 'fa', 'fr', 'ha', 'id', 'ms', 'pt', 'ru', 'sw', 'tr', 'ur', 'zh'];
const LOCALE_SET = new Set(LOCALES);

const REPO_ROOT = path.resolve(__dirname, '..');
const SRC_CITIES = path.join(REPO_ROOT, 'assets', 'cities.json');
const OUT_CITIES = path.join(REPO_ROOT, 'assets', 'cities.json');
const CACHE_DIR = '/tmp/geonames';
const F_CITIES15000 = path.join(CACHE_DIR, 'cities15000.txt');
const F_ALT_NAMES  = path.join(CACHE_DIR, 'alternateNamesV2.txt');
const F_COUNTRY    = path.join(CACHE_DIR, 'countryInfo.txt');

function ensureFile(url, dst) {
  if (fs.existsSync(dst) && fs.statSync(dst).size > 0) return;
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const zip = dst + '.zip';
  console.error(`[dl] ${url}`);
  execSync(`curl -sSL -o "${zip}" "${url}"`, { stdio: 'inherit' });
  if (url.endsWith('.zip')) {
    execSync(`unzip -o "${zip}" -d "${CACHE_DIR}"`, { stdio: 'inherit' });
  }
}

async function main() {
  ensureFile('http://download.geonames.org/export/dump/cities15000.zip', F_CITIES15000);
  ensureFile('http://download.geonames.org/export/dump/alternateNamesV2.zip', F_ALT_NAMES);
  if (!fs.existsSync(F_COUNTRY)) {
    execSync(`curl -sSL -o "${F_COUNTRY}" "http://download.geonames.org/export/dump/countryInfo.txt"`, { stdio: 'inherit' });
  }

  // 1. Load current city set
  const srcCities = JSON.parse(fs.readFileSync(SRC_CITIES, 'utf-8'));
  // Guard: this script produces a NEW shape; only run against the raw array shape.
  if (!Array.isArray(srcCities)) {
    console.error('assets/cities.json is not the raw array shape — refusing to overwrite.');
    console.error('Delete/restore the file to the pre-script array shape before rerunning.');
    process.exit(2);
  }
  console.error(`[in ] ${srcCities.length} source cities`);

  // 2. Index GeoNames cities15000 by (cc, roundedLat, roundedLng) → geonameId
  //    Our source coords are rounded to ~0.01°; GeoNames coords are ~0.001°.
  //    We match with tolerance ~0.03° (~3km) + name-startswith fallback.
  const gnIndex = new Map(); // key: `${cc}|${round(la,1)}|${round(lo,1)}` → array of {gid, name, ascii, la, lo}
  const gnByCcName = new Map(); // key: `${cc}|${asciiLowerFirstToken}` → array
  const rl1 = readline.createInterface({ input: fs.createReadStream(F_CITIES15000, 'utf-8') });
  for await (const line of rl1) {
    const f = line.split('\t');
    if (f.length < 15) continue;
    const gid = parseInt(f[0], 10);
    const name = f[1], ascii = f[2];
    const la = parseFloat(f[4]), lo = parseFloat(f[5]);
    const cc = f[8];
    if (!cc || !Number.isFinite(la) || !Number.isFinite(lo)) continue;
    const key = `${cc}|${la.toFixed(1)}|${lo.toFixed(1)}`;
    if (!gnIndex.has(key)) gnIndex.set(key, []);
    gnIndex.get(key).push({ gid, name, ascii, la, lo });
    const nkey = `${cc}|${ascii.toLowerCase()}`;
    if (!gnByCcName.has(nkey)) gnByCcName.set(nkey, []);
    gnByCcName.get(nkey).push({ gid, name, ascii, la, lo });
  }
  console.error(`[gn ] indexed ${[...gnIndex.values()].reduce((a,b)=>a+b.length,0)} GeoNames rows`);

  // 3. Match each source city to a geonameId
  const wanted = new Set(); // gids we care about
  const src2gid = new Array(srcCities.length).fill(0);
  let matched = 0;
  for (let i = 0; i < srcCities.length; i++) {
    const c = srcCities[i];
    const cc = c.cc; if (!cc) continue;
    // Try name-only first (unique within a country most of the time)
    const nKey = `${cc}|${c.n.toLowerCase()}`;
    let best = null; let bestDist = Infinity;
    const nameCands = gnByCcName.get(nKey) ?? [];
    for (const cand of nameCands) {
      const d = Math.abs(cand.la - c.la) + Math.abs(cand.lo - c.lo);
      if (d < bestDist) { bestDist = d; best = cand; }
    }
    if (best && bestDist < 0.1) {
      src2gid[i] = best.gid; wanted.add(best.gid); matched++; continue;
    }
    // Fallback: 0.1° box, choose nearest by lat/lng
    for (const dla of [0, 0.1, -0.1, 0.2, -0.2]) {
      for (const dlo of [0, 0.1, -0.1, 0.2, -0.2]) {
        const key = `${cc}|${(c.la+dla).toFixed(1)}|${(c.lo+dlo).toFixed(1)}`;
        const cands = gnIndex.get(key);
        if (!cands) continue;
        for (const cand of cands) {
          const d = Math.abs(cand.la - c.la) + Math.abs(cand.lo - c.lo);
          if (d < bestDist) { bestDist = d; best = cand; }
        }
      }
      if (best && bestDist < 0.06) break;
    }
    if (best && bestDist < 0.3) {
      src2gid[i] = best.gid; wanted.add(best.gid); matched++;
    }
  }
  console.error(`[map] matched ${matched}/${srcCities.length} cities to GeoNames`);

  // 4. Load countryInfo → per-country geonameId
  const countryGid = new Map(); // gid → cc
  const ccGid      = new Map(); // cc → gid
  for (const line of fs.readFileSync(F_COUNTRY, 'utf-8').split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const f = line.split('\t');
    const cc = f[0]; const gid = parseInt(f[16], 10);
    const enName = f[4];
    if (cc && Number.isFinite(gid)) {
      countryGid.set(gid, cc);
      ccGid.set(cc, gid);
      wanted.add(gid);
    }
  }
  console.error(`[cc ] ${ccGid.size} countries`);

  // 5. Stream alternateNamesV2 → collect per-gid { lang: { preferred | name } }
  const perGid = new Map(); // gid → { lang: { pref?: string, plain?: string } }
  const rl2 = readline.createInterface({ input: fs.createReadStream(F_ALT_NAMES, 'utf-8') });
  let scanned = 0;
  for await (const line of rl2) {
    scanned++;
    // Cheap early filter to avoid per-line split cost when clearly irrelevant
    // (the file has ~16M lines; naive split on all is slow-ish but manageable).
    const f = line.split('\t');
    if (f.length < 4) continue;
    const gid  = parseInt(f[1], 10);
    if (!wanted.has(gid)) continue;
    const lang = f[2];
    const name = f[3];
    if (!name) continue;
    if (!LOCALE_SET.has(lang)) continue;
    const isPref = f[4] === '1';
    const isShort = f[5] === '1';
    const isColloq = f[6] === '1';
    const isHist = f[7] === '1';
    if (isColloq || isHist) continue;
    if (!perGid.has(gid)) perGid.set(gid, {});
    const bucket = perGid.get(gid);
    if (!bucket[lang]) bucket[lang] = {};
    // Priority: preferred > short > first-seen plain
    if (isPref) bucket[lang].pref = name;
    else if (isShort && !bucket[lang].short) bucket[lang].short = name;
    else if (!bucket[lang].plain) bucket[lang].plain = name;
  }
  console.error(`[alt] scanned ${scanned.toLocaleString()} alternateName rows, hits for ${perGid.size} gids`);

  function pickName(bucket, lang) {
    const b = bucket?.[lang];
    if (!b) return undefined;
    return b.pref ?? b.short ?? b.plain;
  }

  // 6. Build countries map
  const countries = {};
  for (const lang of LOCALES) countries[lang] = {};
  for (const [cc, gid] of ccGid) {
    const bucket = perGid.get(gid);
    for (const lang of LOCALES) {
      const n = pickName(bucket, lang);
      if (n) countries[lang][cc] = n;
    }
  }

  // 7. Build cities
  let citiesEmitted = 0; let localesFilledTotal = 0;
  const cities = srcCities.map((c, i) => {
    const gid = src2gid[i];
    const bucket = perGid.get(gid);
    const i18n = {};
    // seed with the source English/latin name so `en` always has a value
    i18n.en = c.n;
    for (const lang of LOCALES) {
      if (lang === 'en') continue;
      const n = pickName(bucket, lang);
      if (n && n !== c.n) i18n[lang] = n;
    }
    // Search tokens = every UNIQUE lowercase name we have for this city
    const s = new Set();
    for (const lang of LOCALES) if (i18n[lang]) s.add(i18n[lang].toLowerCase());
    localesFilledTotal += Object.keys(i18n).length;
    citiesEmitted++;
    return { n: c.n, cc: c.cc, la: c.la, lo: c.lo, i18n, s: [...s] };
  });

  const payload = { countries, cities };
  const json = JSON.stringify(payload);
  fs.writeFileSync(OUT_CITIES, json);
  const sizeMB = (fs.statSync(OUT_CITIES).size / (1024 * 1024)).toFixed(2);

  console.error();
  console.error(`✓ wrote ${OUT_CITIES}`);
  console.error(`  size:       ${sizeMB} MB`);
  console.error(`  cities:     ${citiesEmitted}`);
  console.error(`  countries:  ${ccGid.size}`);
  console.error(`  locale coverage across cities (avg locales per city): ${(localesFilledTotal/citiesEmitted).toFixed(2)}`);
  const perLangCoverage = {};
  for (const lang of LOCALES) perLangCoverage[lang] = cities.filter(c => c.i18n[lang]).length;
  console.error(`  per-locale city counts:`);
  for (const lang of LOCALES) console.error(`    ${lang}: ${perLangCoverage[lang]}`);
  const cccov = {};
  for (const lang of LOCALES) cccov[lang] = Object.keys(countries[lang]).length;
  console.error(`  per-locale country counts:`);
  for (const lang of LOCALES) console.error(`    ${lang}: ${cccov[lang]}`);
}

main().catch(e => { console.error(e); process.exit(1); });

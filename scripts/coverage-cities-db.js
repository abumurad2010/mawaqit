#!/usr/bin/env node
/**
 * Read-only coverage report for assets/cities.json.
 *
 * The raw "N cities have an Arabic name" count is misleading — a lot of that N is
 * villages nobody searches for. Report, for each target locale, what fraction of the
 * TOP 1,000 and TOP 5,000 cities by population have a localized name. Then list
 * any city in the TOP 200 with NO localized name — that's actionable.
 *
 * Population source: the app's assets/cities.json was originally sorted by
 * population descending. We assume that ordering is preserved as "rank 0 = highest".
 */
'use strict';

const path = require('path');
const fs = require('fs');

const DB = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'assets', 'cities.json'), 'utf-8'));
const cities = DB.cities;
const TARGET_LOCALES = ['ar', 'fa', 'ur', 'bn', 'ru', 'zh'];

function coverageAt(rank, lang) {
  let filled = 0;
  const slice = cities.slice(0, rank);
  for (const c of slice) if (c.i18n[lang]) filled++;
  return { filled, of: slice.length, pct: (100 * filled / slice.length).toFixed(1) };
}

console.log('COVERAGE: top-1000 and top-5000 by population\n');
console.log('locale | top-1000            | top-5000');
console.log('-------|---------------------|-------------------');
for (const lang of TARGET_LOCALES) {
  const c1 = coverageAt(1000, lang);
  const c5 = coverageAt(5000, lang);
  console.log(`${lang.padEnd(6)} | ${(c1.filled + '/' + c1.of + ' (' + c1.pct + '%)').padEnd(19)} | ${c5.filled}/${c5.of} (${c5.pct}%)`);
}

console.log('\nTOP-200 cities with NO localized name, per target locale (actionable list):\n');
for (const lang of TARGET_LOCALES) {
  const top = cities.slice(0, 200);
  const missing = top.filter(c => !c.i18n[lang]);
  console.log(`\n[${lang}]  missing: ${missing.length}/200`);
  if (missing.length === 0) continue;
  for (const c of missing) {
    console.log(`  ${c.n.padEnd(28)} ${c.cc}   (${c.la.toFixed(2)}, ${c.lo.toFixed(2)})`);
  }
}

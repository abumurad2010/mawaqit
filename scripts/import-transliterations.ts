/**
 * import-transliterations.ts — re-import externally-written transliterations for
 * the newly-imported athkar into constants/athkar-data.ts.
 *
 * Reads a filled file (default: scripts/transliterations-filled.json):
 *   { "<translationKey>": "Transliteration string", … }
 *
 * VALIDATION (fails loudly and writes NOTHING if any check fails):
 *   1. every key is a real thikr translationKey present in athkar-data.ts;
 *   2. every key required by scripts/translit-to-write.json is present & non-blank;
 *   3. no blank values.
 *
 * On success it sets each entry's `transliteration: ''` to the provided string
 * (matched on the entry's translationKey line) and prints a summary.
 *
 * Usage:  npx tsx scripts/import-transliterations.ts [filledPath]
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import cats from '../constants/athkar-data';

const ROOT = join(__dirname, '..');
const DATA = join(ROOT, 'constants/athkar-data.ts');
const EXPORT = join(ROOT, 'scripts/translit-to-write.json');
const FILLED = process.argv[2] ?? join(ROOT, 'scripts/transliterations-filled.json');

function die(msg: string): never { console.error('✗ ' + msg); process.exit(1); }

const realKeys = new Set<string>();
for (const c of cats) for (const t of c.adhkar) realKeys.add(t.translationKey);

const exportManifest: { entries: Array<{ key: string }> } = JSON.parse(readFileSync(EXPORT, 'utf8'));
const requiredKeys = exportManifest.entries.map(e => e.key);

let filled: Record<string, string>;
try { filled = JSON.parse(readFileSync(FILLED, 'utf8')); }
catch { die(`cannot read filled file: ${FILLED}`); }

// ── validate ──────────────────────────────────────────────────────────────
const errors: string[] = [];
for (const [key, val] of Object.entries(filled)) {
  if (!realKeys.has(key)) errors.push(`unknown key (not a thikr): ${key}`);
  if (typeof val !== 'string' || val.trim() === '') errors.push(`${key}: blank transliteration`);
}
for (const key of requiredKeys) {
  if (!(key in filled) || String(filled[key]).trim() === '') errors.push(`missing required key: ${key}`);
}
if (errors.length) {
  console.error(`Validation failed with ${errors.length} error(s):`);
  errors.slice(0, 40).forEach(e => console.error('  ✗ ' + e));
  die('nothing written.');
}

// ── write into athkar-data.ts ───────────────────────────────────────────────
const lines = readFileSync(DATA, 'utf8').split('\n');
function esc(v: string) { return v.includes('"') ? `'${v.replace(/'/g, "\\'")}'` : `"${v}"`; }
let written = 0;
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/translationKey:\s*"([^"]+)"/);
  if (!m || !(m[1] in filled)) continue;
  if (!lines[i].includes("transliteration: ''")) continue; // only fill empty ones
  lines[i] = lines[i].replace("transliteration: ''", `transliteration: ${esc(filled[m[1]].trim())}`);
  written++;
}
if (written !== Object.keys(filled).length) {
  die(`matched ${written} of ${Object.keys(filled).length} keys on their entry lines — aborting to avoid a partial write.`);
}
writeFileSync(DATA, lines.join('\n'));
console.log(`✓ imported ${written} transliterations. Run tsc + the app to verify.`);

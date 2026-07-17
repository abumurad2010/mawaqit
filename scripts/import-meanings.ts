/**
 * import-meanings.ts — re-import externally-filled athkar meaning translations
 * into constants/i18n.ts.
 *
 * Reads a filled file (default: scripts/meanings-filled.json) of shape:
 *   { "<translationKey>": { "ru": "…", "zh": "…", … }, … }
 *
 * VALIDATION (fails loudly and writes NOTHING if any check fails):
 *   1. every key is a real thikr translationKey present in athkar-data.ts;
 *   2. for every key, every language listed under that key in the ORIGINAL export
 *      (scripts/meanings-to-translate.json → `needs`) is present and non-blank;
 *   3. no unknown language codes.
 *
 * On success it inserts `key: '…',` into each target language block in i18n.ts
 * (order within a block is irrelevant) and prints a summary.
 *
 * Usage:  npx tsx scripts/import-meanings.ts [filledPath]
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import cats from '../constants/athkar-data';

const ROOT = join(__dirname, '..');
const I18N = join(ROOT, 'constants/i18n.ts');
const EXPORT = join(ROOT, 'scripts/meanings-to-translate.json');
const FILLED = process.argv[2] ?? join(ROOT, 'scripts/meanings-filled.json');

const ALL_LANGS = ['en','ar','fr','es','ru','zh','tr','ur','id','bn','fa','ms','pt','sw','ha'];

function die(msg: string): never { console.error('✗ ' + msg); process.exit(1); }

// Real thikr keys (the only keys we will accept).
const realKeys = new Set<string>();
for (const c of cats) for (const t of c.adhkar) realKeys.add(t.translationKey);

// Required (key → languages that must be filled), from the export manifest.
const manifest: Array<{ key: string; needs: string[] }> = JSON.parse(readFileSync(EXPORT, 'utf8'));
const required = new Map<string, string[]>();
for (const row of manifest) required.set(row.key, row.needs);

let filled: Record<string, Record<string, string>>;
try { filled = JSON.parse(readFileSync(FILLED, 'utf8')); }
catch { die(`cannot read filled file: ${FILLED}`); }

// ── validate ──────────────────────────────────────────────────────────────
const errors: string[] = [];
for (const [key, langs] of Object.entries(filled)) {
  if (!realKeys.has(key)) { errors.push(`unknown key (not a thikr): ${key}`); continue; }
  for (const [lang, val] of Object.entries(langs)) {
    if (!ALL_LANGS.includes(lang)) errors.push(`${key}: unknown language "${lang}"`);
    if (typeof val !== 'string' || val.trim() === '') errors.push(`${key}: blank meaning for "${lang}"`);
  }
}
for (const [key, needs] of Array.from(required)) {
  const got = filled[key] ?? {};
  for (const lang of needs) {
    if (!(lang in got) || String(got[lang]).trim() === '') errors.push(`${key}: missing required language "${lang}"`);
  }
}
if (errors.length) {
  console.error(`Validation failed with ${errors.length} error(s):`);
  errors.slice(0, 40).forEach(e => console.error('  ✗ ' + e));
  die('nothing written.');
}

// ── insert into i18n.ts ─────────────────────────────────────────────────────
const lines = readFileSync(I18N, 'utf8').split('\n');
// language block starts inside `const translations = { … }` are `  ar: {` etc. (2-space indent).
const blockStart: Record<string, number> = {};
const startRe = /^  ([a-z]{2}): \{\s*$/;
let seenTranslations = false;
for (let i = 0; i < lines.length; i++) {
  // `en` is `en: base` (a reference) — its keys live in the `const base = {` object,
  // so English insertions (e.g. the newly-imported keys) go there, not in a partial.
  if (lines[i].startsWith('const base = {') || lines[i].startsWith('const base: ')) blockStart['en'] = i;
  if (lines[i].startsWith('const translations')) seenTranslations = true;
  if (!seenTranslations) continue;
  const m = lines[i].match(startRe);
  if (m && ALL_LANGS.includes(m[1]) && m[1] !== 'en' && !(m[1] in blockStart)) blockStart[m[1]] = i;
}
function esc(v: string) { return v.includes("'") ? `"${v.replace(/"/g, '\\"')}"` : `'${v}'`; }
// Build per-language insertions.
const perLang: Record<string, string[]> = {};
for (const [key, langs] of Object.entries(filled)) {
  for (const [lang, val] of Object.entries(langs)) {
    (perLang[lang] ??= []).push(`    ${key}: ${esc(val.trim())},`);
  }
}
// Insert after each block's opening line (descending line order so indices stay valid).
const langsByLine = Object.keys(perLang).filter(l => l in blockStart).sort((a, b) => blockStart[b] - blockStart[a]);
let inserted = 0;
for (const lang of langsByLine) {
  const at = blockStart[lang] + 1;
  lines.splice(at, 0, ...perLang[lang]);
  inserted += perLang[lang].length;
}
writeFileSync(I18N, lines.join('\n'));
console.log(`✓ imported ${inserted} meaning strings across ${langsByLine.length} language(s).`);
console.log(`  keys: ${Object.keys(filled).length}. Run tsc + the app to verify.`);

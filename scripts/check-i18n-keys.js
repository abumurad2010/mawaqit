#!/usr/bin/env node
// Reports keys present in the base English block of constants/i18n.ts that
// are NOT translated in each of the 14 other locale blocks.
//
// Note on severity: at runtime, `t(lang)` at constants/i18n.ts returns
// `{ ...base, ...overrides }`, so a missing override falls back to the
// English string — a UI element becomes readable but not localised. That is
// a soft failure, not blank text, when the read goes through `t()`. The
// harder case is keys read outside `t()` (e.g. help-popup dicts that
// fall back to English themselves) — the pattern this file guards is:
// a base-block key added for a 1.3.8 feature whose translations were not
// backfilled into the other 14 locales.
//
// The rule is one-way (English → others). Extra keys in a locale that are
// not in the base are reported but do not fail.
//
// Exits 1 if any base key is missing in any locale.
'use strict';

const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, '..', 'constants', 'i18n.ts');
const src = fs.readFileSync(p, 'utf8');

const LANGS = ['ar','fr','es','ru','zh','tr','ur','id','bn','fa','ms','pt','sw','ha'];

// Given the SLICE of source between an object's opening `{` and closing `}`,
// return the set of keys defined at THAT object's top level. Walk char-by-char,
// tracking string state (' or "), single-line and block comments, and brace
// depth; when depth === 0 and we see `identifier :`, record the identifier.
function extractTopLevelKeys(body) {
  const keys = new Set();
  let i = 0, depth = 0, inStr = null;
  const isIdStart = c => (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
  const isIdCont  = c => isIdStart(c) || (c >= '0' && c <= '9');
  while (i < body.length) {
    const c = body[i];
    // Strings
    if (inStr) {
      if (c === '\\') { i += 2; continue; }
      if (c === inStr) inStr = null;
      i++; continue;
    }
    if (c === '"' || c === "'") { inStr = c; i++; continue; }
    // Comments
    if (c === '/' && body[i + 1] === '/') {
      while (i < body.length && body[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && body[i + 1] === '*') {
      i += 2;
      while (i + 1 < body.length && !(body[i] === '*' && body[i + 1] === '/')) i++;
      i += 2; continue;
    }
    if (c === '{') { depth++; i++; continue; }
    if (c === '}') { depth--; i++; continue; }
    if (depth === 0 && isIdStart(c)) {
      let j = i + 1;
      while (j < body.length && isIdCont(body[j])) j++;
      const id = body.slice(i, j);
      // Skip whitespace
      let k = j;
      while (k < body.length && (body[k] === ' ' || body[k] === '\t')) k++;
      if (body[k] === ':') keys.add(id);
      i = j; continue;
    }
    i++;
  }
  return keys;
}

// Given a source index for `{`, return [openAfterBrace, closeAtBrace].
function scanBraces(src, openIdx) {
  let depth = 1, i = openIdx + 1, inStr = null;
  while (i < src.length && depth) {
    const c = src[i];
    if (inStr) {
      if (c === '\\') { i += 2; continue; }
      if (c === inStr) inStr = null;
      i++; continue;
    }
    if (c === '"' || c === "'") { inStr = c; i++; continue; }
    if (c === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') depth--;
    if (depth === 0) return [openIdx + 1, i];
    i++;
  }
  return null;
}

function findBaseBody() {
  const m = src.match(/const\s+base\s*=\s*\{/);
  if (!m) throw new Error('base const not found');
  const open = src.indexOf('{', m.index);
  const [a, b] = scanBraces(src, open);
  return src.slice(a, b);
}

function findLocaleBody(lang) {
  // Anchor on the `const translations` declaration so we skip LANG_META / LANG_FLAG
  // objects at the top of the file that share `<lang>:` shape.
  const anchor = src.search(/const\s+translations\s*:/);
  if (anchor < 0) throw new Error('translations const not found');
  const slice = src.slice(anchor);
  const re = new RegExp(`(^|\\n)\\s{2,4}${lang}\\s*:\\s*\\{`);
  const m = slice.match(re);
  if (!m) return null;
  const openInSlice = slice.indexOf('{', m.index);
  const openAbs = anchor + openInSlice;
  const [a, b] = scanBraces(src, openAbs);
  return src.slice(a, b);
}

const baseKeys = extractTopLevelKeys(findBaseBody());

let hadMissing = false;
const report = {};
for (const lang of LANGS) {
  const body = findLocaleBody(lang);
  if (!body) { console.error(`FATAL: locale ${lang} not found`); process.exit(2); }
  const keys = extractTopLevelKeys(body);
  const missing = [...baseKeys].filter(k => !keys.has(k)).sort();
  const extra   = [...keys].filter(k => !baseKeys.has(k)).sort();
  report[lang] = { missing, extra };
  if (missing.length) hadMissing = true;
}

console.log(`base: ${baseKeys.size} keys`);
let printed = false;
for (const lang of LANGS) {
  const r = report[lang];
  if (r.missing.length || r.extra.length) {
    console.log(`\n[${lang}]`);
    if (r.missing.length) {
      console.log(`  MISSING in this locale (${r.missing.length}):`);
      for (const k of r.missing) console.log(`    - ${k}`);
      printed = true;
    }
    if (r.extra.length) {
      console.log(`  extra (${r.extra.length}): ${r.extra.join(', ')}`);
      printed = true;
    }
  }
}
if (!printed) console.log(`OK: all ${baseKeys.size} base keys present in all 14 other locales.`);
process.exit(hadMissing ? 1 : 0);

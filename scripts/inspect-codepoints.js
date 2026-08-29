#!/usr/bin/env node
// Read-only inspector. Prints a string as [index, codepoint, unicode name]
// so mangled terminal output cannot lie to us.
//
// Usage:
//   node scripts/inspect-codepoints.js <file> <locale> <key>
//   node scripts/inspect-codepoints.js constants/i18n.ts bn adjustAllPrayerTimes
//   node scripts/inspect-codepoints.js constants/athkar-data.ts _ athkar_morning_i11
//     (for athkar-data.ts, pass `_` as locale — arabic values are looked up by
//      translationKey, not by locale.)
//
// The Unicode name table is bundled via unicode-name.json (not included) — we
// fall back to Unicode block bucketing when a per-codepoint name isn't
// available, which is enough to distinguish "spurious Latin/ASCII inside a
// non-Latin word" from "legitimate script token."
'use strict';

const fs = require('fs');
const path = require('path');

function blockName(cp) {
  if (cp <= 0x007F) return 'ASCII';
  if (cp >= 0x0080 && cp <= 0x00FF) return 'Latin-1 Supplement';
  if (cp >= 0x0100 && cp <= 0x017F) return 'Latin Extended-A';
  if (cp >= 0x0180 && cp <= 0x024F) return 'Latin Extended-B';
  if (cp >= 0x0300 && cp <= 0x036F) return 'Combining Diacritical Marks';
  if (cp >= 0x0400 && cp <= 0x04FF) return 'Cyrillic';
  if (cp >= 0x0500 && cp <= 0x052F) return 'Cyrillic Supplement';
  if (cp >= 0x0590 && cp <= 0x05FF) return 'Hebrew';
  if (cp >= 0x0600 && cp <= 0x06FF) return 'Arabic';
  if (cp >= 0x0700 && cp <= 0x074F) return 'Syriac';
  if (cp >= 0x0750 && cp <= 0x077F) return 'Arabic Supplement';
  if (cp >= 0x0780 && cp <= 0x07BF) return 'Thaana';
  if (cp >= 0x0900 && cp <= 0x097F) return 'Devanagari';
  if (cp >= 0x0980 && cp <= 0x09FF) return 'Bengali';
  if (cp >= 0x0A00 && cp <= 0x0A7F) return 'Gurmukhi';
  if (cp >= 0x0A80 && cp <= 0x0AFF) return 'Gujarati';
  if (cp >= 0x0B00 && cp <= 0x0B7F) return 'Oriya';
  if (cp >= 0x0B80 && cp <= 0x0BFF) return 'Tamil';
  if (cp >= 0x0C00 && cp <= 0x0C7F) return 'Telugu';
  if (cp >= 0x0E00 && cp <= 0x0E7F) return 'Thai';
  if (cp >= 0x2000 && cp <= 0x206F) return 'General Punctuation';
  if (cp >= 0x2070 && cp <= 0x209F) return 'Superscripts and Subscripts';
  if (cp >= 0x20A0 && cp <= 0x20CF) return 'Currency Symbols';
  if (cp >= 0x2100 && cp <= 0x214F) return 'Letterlike Symbols';
  if (cp >= 0x2200 && cp <= 0x22FF) return 'Mathematical Operators';
  if (cp >= 0x3000 && cp <= 0x303F) return 'CJK Symbols and Punctuation';
  if (cp >= 0x3040 && cp <= 0x309F) return 'Hiragana';
  if (cp >= 0x30A0 && cp <= 0x30FF) return 'Katakana';
  if (cp >= 0x4E00 && cp <= 0x9FFF) return 'CJK Unified Ideographs';
  if (cp >= 0xAC00 && cp <= 0xD7AF) return 'Hangul Syllables';
  if (cp >= 0xFB50 && cp <= 0xFDFF) return 'Arabic Presentation Forms-A';
  if (cp >= 0xFE70 && cp <= 0xFEFF) return 'Arabic Presentation Forms-B';
  if (cp >= 0xFF00 && cp <= 0xFFEF) return 'Halfwidth and Fullwidth Forms';
  return `Block U+${cp.toString(16).toUpperCase().padStart(4, '0').slice(0, 2)}xx`;
}

function isCombining(cp) {
  return (cp >= 0x0300 && cp <= 0x036F)
      || (cp >= 0x0610 && cp <= 0x061A)
      || (cp >= 0x064B && cp <= 0x065F)
      || cp === 0x0670
      || (cp >= 0x06D6 && cp <= 0x06ED)
      || (cp >= 0x0900 && cp <= 0x0903)     // Devanagari signs
      || (cp >= 0x093A && cp <= 0x094F)     // Devanagari vowel signs / virama
      || (cp >= 0x0951 && cp <= 0x0957)
      || (cp >= 0x0962 && cp <= 0x0963)
      || (cp >= 0x0981 && cp <= 0x0983)     // Bengali signs
      || (cp >= 0x09BC && cp <= 0x09C4)     // Bengali vowel signs
      || (cp >= 0x09C7 && cp <= 0x09C8)
      || (cp >= 0x09CB && cp <= 0x09CD)
      || (cp >= 0x09D7 && cp <= 0x09D7)
      || (cp >= 0x09E2 && cp <= 0x09E3);
}

function coarseScript(cp) {
  if (cp < 0x80) {
    if ((cp >= 0x41 && cp <= 0x5A) || (cp >= 0x61 && cp <= 0x7A)) return 'LATIN';
    if (cp >= 0x30 && cp <= 0x39) return 'DIGIT';
    if (cp === 0x20 || cp === 0x09 || cp === 0x0A) return 'WS';
    return 'ASCII';
  }
  if (cp >= 0x0180 && cp <= 0x024F) return 'LATIN';
  if (cp >= 0x0400 && cp <= 0x052F) return 'CYRILLIC';
  if ((cp >= 0x0600 && cp <= 0x06FF) || (cp >= 0x0750 && cp <= 0x077F)
      || (cp >= 0xFB50 && cp <= 0xFDFF) || (cp >= 0xFE70 && cp <= 0xFEFF)) return 'ARABIC';
  if (cp >= 0x0900 && cp <= 0x097F) return 'DEVANAGARI';
  if (cp >= 0x0980 && cp <= 0x09FF) return 'BENGALI';
  if (cp >= 0x4E00 && cp <= 0x9FFF) return 'CJK';
  return 'OTHER';
}

function dump(s, label) {
  console.log(`\n=== ${label} (length ${[...s].length} codepoints) ===`);
  console.log(`raw string: ${JSON.stringify(s)}`);
  console.log(`index | codepoint | script      | block`);
  console.log(`------+-----------+-------------+-------------------------`);
  let i = 0;
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    const script = coarseScript(cp);
    const block = blockName(cp);
    const chDisplay = cp <= 0x1F || cp === 0x7F ? '·' : ch;
    console.log(`${String(i).padStart(5)} | U+${cp.toString(16).toUpperCase().padStart(4, '0')} | ${script.padEnd(11)} | ${block}${isCombining(cp) ? ' [combining]' : ''}   ${chDisplay}`);
    i++;
  }
}

function scanForSplice(s) {
  // Emit hits where a LATIN/DIGIT/ASCII-punct sits ADJACENT (no whitespace)
  // to a non-Latin script letter (i.e. inside a word). Escapes like \n are
  // treated as whitespace here.
  const NON_LATIN = new Set(['ARABIC','BENGALI','CYRILLIC','CJK','DEVANAGARI']);
  const chars = [...s];
  const hits = [];
  for (let i = 1; i < chars.length; i++) {
    const prev = chars[i - 1];
    const cur  = chars[i];
    const pcp = prev.codePointAt(0);
    const ccp = cur.codePointAt(0);
    // treat a two-char backslash escape as a break
    if (prev === '\\' && (cur === 'n' || cur === 't' || cur === 'r')) continue;
    // skip if the "prev" is actually the 'n' of an escape
    if (i >= 2 && chars[i - 2] === '\\' && (prev === 'n' || prev === 't' || prev === 'r')) continue;
    const ps = coarseScript(pcp);
    const cs = coarseScript(ccp);
    if ((ps === 'LATIN' && NON_LATIN.has(cs)) ||
        (NON_LATIN.has(ps) && cs === 'LATIN')) {
      hits.push({ idx: i, prev, cur, pcp, ccp });
    }
  }
  return hits;
}

function findInI18n(text, locale, key) {
  // Anchor at `const translations` so we skip LANG_META / LANG_FLAG blocks that
  // share the `<lang>:` shape.
  const anchor = text.search(/const\s+translations\s*:/);
  if (anchor < 0) return null;
  const slice = text.slice(anchor);
  const re = new RegExp(String.raw`\n  ` + locale + String.raw`:\s*\{`);
  const m = slice.match(re);
  if (!m) return null;
  const localOpen = slice.indexOf('{', m.index);
  // Walk the block body only (stop at matching close brace) to avoid picking
  // up the same key from the NEXT locale block.
  let depth = 1, i = localOpen + 1, inStr = null;
  while (i < slice.length && depth) {
    const c = slice[i];
    if (inStr) {
      if (c === '\\') { i += 2; continue; }
      if (c === inStr) inStr = null;
      i++; continue;
    }
    if (c === '"' || c === "'") { inStr = c; i++; continue; }
    if (c === '{') depth++;
    else if (c === '}') depth--;
    if (depth === 0) break;
    i++;
  }
  const body = slice.slice(localOpen + 1, i);
  const keyRe = new RegExp(String.raw`\n\s+` + key + String.raw`:\s*(['"])((?:\\.|(?!\1).)*)\1`);
  const km = body.match(keyRe);
  return km ? km[2] : null;
}

function findBaseKey(text, key) {
  const m = text.match(/const\s+base\s*=\s*\{/);
  if (!m) return null;
  const start = m.index + m[0].length;
  const rest = text.slice(start);
  const keyRe = new RegExp(String.raw`\n\s+` + key + String.raw`:\s*(['"])((?:\\.|(?!\1).)*)\1`);
  const km = rest.match(keyRe);
  return km ? km[2] : null;
}

function findAthkarByTranslationKey(text, key) {
  const re = new RegExp(String.raw`arabic: "([^"]+)"[^{}]*?translationKey: "` + key + String.raw`"`, 's');
  const m = text.match(re);
  return m ? m[1] : null;
}

// For settings.tsx HELP dict: HELP: Record<...> = { ar: {...}, en: {...}, ... }
function findInSettingsHelp(text, locale, key) {
  const anchor = text.search(/HELP\s*:\s*Record</);
  if (anchor < 0) return null;
  const slice = text.slice(anchor);
  const re = new RegExp(String.raw`\n    ` + locale + String.raw`:\s*\{`);
  const m = slice.match(re);
  if (!m) return null;
  const openIdx = slice.indexOf('{', m.index);
  let depth = 1, i = openIdx + 1, inStr = null;
  while (i < slice.length && depth) {
    const c = slice[i];
    if (inStr) {
      if (c === '\\') { i += 2; continue; }
      if (c === inStr) inStr = null;
      i++; continue;
    }
    if (c === '"' || c === "'") { inStr = c; i++; continue; }
    if (c === '{') depth++;
    else if (c === '}') depth--;
    if (depth === 0) break;
    i++;
  }
  const body = slice.slice(openIdx + 1, i);
  const keyRe = new RegExp(String.raw`\n\s+` + key + String.raw`:\s*(['"])((?:\\.|(?!\1).)*)\1`);
  const km = body.match(keyRe);
  return km ? km[2] : null;
}

// CLI
if (require.main === module) {
  const [file, locale, key] = process.argv.slice(2);
  if (!file || !key) {
    console.error('usage: inspect-codepoints.js <file> <locale-or-_> <key>');
    process.exit(2);
  }
  const abs = path.resolve(process.cwd(), file);
  const text = fs.readFileSync(abs, 'utf8');
  let value = null;
  if (file.endsWith('i18n.ts')) {
    value = locale === '_' || locale === 'en' ? findBaseKey(text, key) : findInI18n(text, locale, key);
  } else if (file.endsWith('settings.tsx')) {
    // HELP dict is per-locale; require a locale.
    value = findInSettingsHelp(text, locale, key);
  } else {
    value = findAthkarByTranslationKey(text, key);
  }
  if (value === null) {
    console.error(`key not found: ${locale}.${key}`);
    process.exit(1);
  }
  // decode common escape sequences so we inspect the actual runtime string
  const decoded = value.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  dump(decoded, `${file} [${locale}] ${key}`);
  const splices = scanForSplice(decoded);
  console.log(`\nsplice-adjacency hits: ${splices.length}`);
  for (const h of splices.slice(0, 20)) {
    console.log(`  idx ${h.idx}: ${coarseScript(h.pcp)}(U+${h.pcp.toString(16).toUpperCase()}) → ${coarseScript(h.ccp)}(U+${h.ccp.toString(16).toUpperCase()})`);
  }
}

module.exports = { dump, scanForSplice, coarseScript, blockName, findInI18n, findBaseKey, findAthkarByTranslationKey };

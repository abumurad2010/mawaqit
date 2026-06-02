/**
 * Fully offline Quran translation & transliteration loader.
 * All 14 language translations and the full Roman transliteration
 * are bundled in constants/quran-translations/ — zero network calls.
 *
 * Key format: "surahNumber_ayahNumber"  e.g. "2_255"
 */

const _translit = require('../constants/quran-translations/translit.json') as Record<string, string>;
const _en = require('../constants/quran-translations/en.json') as Record<string, string>;
const _fr = require('../constants/quran-translations/fr.json') as Record<string, string>;
const _es = require('../constants/quran-translations/es.json') as Record<string, string>;
const _ru = require('../constants/quran-translations/ru.json') as Record<string, string>;
const _zh = require('../constants/quran-translations/zh.json') as Record<string, string>;
const _tr = require('../constants/quran-translations/tr.json') as Record<string, string>;
const _ur = require('../constants/quran-translations/ur.json') as Record<string, string>;
const _id = require('../constants/quran-translations/id.json') as Record<string, string>;
const _bn = require('../constants/quran-translations/bn.json') as Record<string, string>;
const _fa = require('../constants/quran-translations/fa.json') as Record<string, string>;
const _ms = require('../constants/quran-translations/ms.json') as Record<string, string>;
const _pt = require('../constants/quran-translations/pt.json') as Record<string, string>;
const _sw = require('../constants/quran-translations/sw.json') as Record<string, string>;
const _ha = require('../constants/quran-translations/ha.json') as Record<string, string>;

const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: _en, fr: _fr, es: _es, ru: _ru, zh: _zh,
  tr: _tr, ur: _ur, id: _id, bn: _bn, fa: _fa,
  ms: _ms, pt: _pt, sw: _sw, ha: _ha,
};

/**
 * Returns the translation for a specific ayah in the requested language.
 * Falls back to English if the language or verse is unavailable.
 */
export function getTranslation(
  lang: string,
  surahNumber: number,
  ayahNumber: number,
): string {
  const key = `${surahNumber}_${ayahNumber}`;
  return TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS['en']?.[key] ?? '';
}

/**
 * Returns the Roman transliteration for a specific ayah.
 * Always available — data is fully bundled offline.
 */
export function getTransliteration(
  surahNumber: number,
  ayahNumber: number,
): string {
  return _translit[`${surahNumber}_${ayahNumber}`] ?? '';
}

export interface CrossMatch {
  surahNum: number;
  ayahNum: number;
  transliteration: string;
  translation: string;
}

// Pre-built lowercase transliteration index (built once, reused on every keystroke).
type CrossEntry = { surahNum: number; ayahNum: number; key: string; translit: string; translitLower: string };
let _crossIndex: CrossEntry[] | null = null;
function getCrossIndex(): CrossEntry[] {
  if (_crossIndex) return _crossIndex;
  const idx: CrossEntry[] = [];
  for (const key of Object.keys(_translit)) {
    const [s, a] = key.split('_');
    const tl = _translit[key] ?? '';
    idx.push({ surahNum: Number(s), ayahNum: Number(a), key, translit: tl, translitLower: tl.toLowerCase() });
  }
  _crossIndex = idx;
  return idx;
}

// Per-language lowercase translation cache (built lazily, once per language).
const _transLowerCache: Record<string, Record<string, string>> = {};
function getLowerTranslations(lang: string): Record<string, string> {
  if (_transLowerCache[lang]) return _transLowerCache[lang];
  const srcMap = TRANSLATIONS[lang] ?? TRANSLATIONS['en'] ?? {};
  const out: Record<string, string> = {};
  for (const k in srcMap) out[k] = srcMap[k].toLowerCase();
  _transLowerCache[lang] = out;
  return out;
}

/**
 * Case-insensitive substring search across the Roman transliteration corpus and
 * the given language's translation (falling back to English per-ayah). Lets a
 * user find ayat by typing Latin words ("riba", "moses") or translated words
 * ("interest") regardless of how the Arabic is spelled.
 */
export function searchTranslations(query: string, lang: string, limit = 200): CrossMatch[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const idx = getCrossIndex();
  const lower = getLowerTranslations(lang);
  const enLower = getLowerTranslations('en');
  const langMap = TRANSLATIONS[lang] ?? TRANSLATIONS['en'] ?? {};
  const enMap = TRANSLATIONS['en'] ?? {};
  const out: CrossMatch[] = [];
  for (const e of idx) {
    const transLower = lower[e.key] ?? enLower[e.key] ?? '';
    if (e.translitLower.includes(q) || transLower.includes(q)) {
      out.push({
        surahNum: e.surahNum,
        ayahNum: e.ayahNum,
        transliteration: e.translit,
        translation: langMap[e.key] ?? enMap[e.key] ?? '',
      });
      if (out.length >= limit) break;
    }
  }
  return out;
}

/** All language codes that have a bundled translation. */
export const translationsAvailable = Object.keys(TRANSLATIONS);

/** Always true — all translations are offline. */
export const isOffline = true as const;

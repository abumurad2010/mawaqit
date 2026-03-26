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

/** All language codes that have a bundled translation. */
export const translationsAvailable = Object.keys(TRANSLATIONS);

/** Always true — all translations are offline. */
export const isOffline = true as const;

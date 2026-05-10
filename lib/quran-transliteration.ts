/**
 * Lightweight surah-names helper + lang constants.
 * Verse transliteration and translation are now handled by lib/quran-translations.ts.
 */

import type { Lang } from '@/constants/i18n';

const SURAH_NAMES_DATA = require('../assets/quran-surah-names.json') as Record<string, Record<string, string>>;

export const BUNDLED_LANGS: Lang[] = ['en', 'fr', 'es', 'ur', 'ru', 'zh', 'tr', 'id', 'bn', 'fa', 'ms', 'pt', 'sw', 'ha'];
export const DOWNLOADABLE_LANGS: Lang[] = [];

// fa and ur use Arabic script natively — no Latin transliteration is offered for them.
export const SUPPORTED_TRANSLIT_LANGS: Lang[] = ['en', 'fr', 'es', 'ru', 'zh', 'tr', 'id', 'bn', 'ms', 'pt', 'sw', 'ha'];

export async function fetchSurahNamesByLang(lang: Lang): Promise<Record<number, string>> {
  const langKey = lang in SURAH_NAMES_DATA ? lang : 'en';
  const names = SURAH_NAMES_DATA[langKey] ?? {};
  const result: Record<number, string> = {};
  for (const [k, v] of Object.entries(names)) {
    result[Number(k)] = v;
  }
  return result;
}

export function isLangBundled(_lang: Lang): boolean {
  return true;
}

export function getTranslationEdition(lang: Lang): string {
  const EDITION_MAP: Partial<Record<Lang, string>> = {
    en: 'en.sahih', fr: 'fr.hamidullah', es: 'es.cortes', ru: 'ru.kuliev',
    zh: 'zh.jian', tr: 'tr.diyanet', ur: 'ur.junagarhi', id: 'id.indonesian',
    bn: 'bn.bengali', fa: 'fa.makarem', ms: 'ms.basmeih', pt: 'pt.nasr',
    sw: 'sw.barwani', ha: 'ha.gumi',
  };
  return EDITION_MAP[lang] ?? 'en.sahih';
}

// ---------------------------------------------------------------------------
// Script conversion: Latin Arabic transliteration → native Cyrillic (ru)
// ---------------------------------------------------------------------------

// Ordered so multi-char sequences are matched before their component letters.
const LATIN_TO_CYRILLIC: ReadonlyArray<readonly [string, string]> = [
  // Digraphs — must precede single-char entries
  ['sh', 'ш'],  ['Sh', 'Ш'],  ['SH', 'Ш'],
  ['kh', 'х'],  ['Kh', 'Х'],  ['KH', 'Х'],
  ['gh', 'г'],  ['Gh', 'Г'],  ['GH', 'Г'],
  ['th', 'с'],  ['Th', 'С'],  ['TH', 'С'],
  ['dh', 'з'],  ['Dh', 'З'],  ['DH', 'З'],
  // Long vowels (macron)
  ['ā', 'а'],   ['Ā', 'А'],
  ['ī', 'и'],   ['Ī', 'И'],
  ['ū', 'у'],   ['Ū', 'У'],
  // Emphatic consonants (with underdot)
  ['ḥ', 'х'],   ['Ḥ', 'Х'],
  ['ṣ', 'с'],   ['Ṣ', 'С'],
  ['ḍ', 'д'],   ['Ḍ', 'Д'],
  ['ṭ', 'т'],   ['Ṭ', 'Т'],
  ['ẓ', 'з'],   ['Ẓ', 'З'],
  // Ayin and hamza → hard sign (marks a glottal/pharyngeal break)
  ['ʿ', 'ъ'],
  ['ʾ', 'ъ'],
  // ج → дж (Jim — two-char Cyrillic output)
  ['j', 'дж'],  ['J', 'Дж'],
  // Regular consonants
  ['b', 'б'],   ['B', 'Б'],
  ['t', 'т'],   ['T', 'Т'],
  ['d', 'д'],   ['D', 'Д'],
  ['r', 'р'],   ['R', 'Р'],
  ['z', 'з'],   ['Z', 'З'],
  ['s', 'с'],   ['S', 'С'],
  ['f', 'ф'],   ['F', 'Ф'],
  ['q', 'к'],   ['Q', 'К'],
  ['k', 'к'],   ['K', 'К'],
  ['l', 'л'],   ['L', 'Л'],
  ['m', 'м'],   ['M', 'М'],
  ['n', 'н'],   ['N', 'Н'],
  ['h', 'х'],   ['H', 'Х'],
  ['w', 'в'],   ['W', 'В'],
  ['y', 'й'],   ['Y', 'Й'],
  // Vowels
  ['a', 'а'],   ['A', 'А'],
  ['i', 'и'],   ['I', 'И'],
  ['u', 'у'],   ['U', 'У'],
  ['e', 'э'],   ['E', 'Э'],
  ['o', 'о'],   ['O', 'О'],
];

function latinToCyrillic(text: string): string {
  let result = '';
  let i = 0;
  while (i < text.length) {
    let matched = false;
    for (const [lat, cyr] of LATIN_TO_CYRILLIC) {
      if (text.startsWith(lat, i)) {
        result += cyr;
        i += lat.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      result += text[i]!;
      i++;
    }
  }
  return result;
}

/**
 * Converts a Latin-script Arabic transliteration string to the user's native
 * script where a non-Latin rendering is defined.
 *
 * Currently handles:
 *   ru → Cyrillic via a standard Arabic-phoneme mapping
 *   all other langs → returned unchanged (Latin is appropriate)
 */
export function transliterateToScript(text: string, lang: Lang): string {
  if (!text) return text;
  if (lang === 'ru') return latinToCyrillic(text);
  return text;
}

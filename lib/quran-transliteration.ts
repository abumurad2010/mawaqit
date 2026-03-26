/**
 * Lightweight surah-names helper + lang constants.
 * Verse transliteration and translation are now handled by lib/quran-translations.ts.
 */

import type { Lang } from '@/constants/i18n';

const SURAH_NAMES_DATA = require('../assets/quran-surah-names.json') as Record<string, Record<string, string>>;

export const BUNDLED_LANGS: Lang[] = ['en', 'fr', 'es', 'ur', 'ru', 'zh', 'tr', 'id', 'bn', 'fa', 'ms', 'pt', 'sw', 'ha'];
export const DOWNLOADABLE_LANGS: Lang[] = [];
export const SUPPORTED_TRANSLIT_LANGS: Lang[] = [...BUNDLED_LANGS];

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

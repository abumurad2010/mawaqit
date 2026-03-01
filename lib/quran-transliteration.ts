import type { Lang } from '@/constants/i18n';

type SurahIndex = Record<string, string[]>;

const TRANSLIT_DATA = require('../assets/quran-translit.json') as SurahIndex;
const TRANSLATION_DATA = require('../assets/quran-translations.json') as Record<string, SurahIndex>;
const SURAH_NAMES_DATA = require('../assets/quran-surah-names.json') as Record<string, Record<string, string>>;

export const SUPPORTED_TRANSLIT_LANGS: Lang[] = [
  'en', 'fr', 'es', 'ru', 'zh', 'tr', 'ur', 'id', 'bn', 'fa', 'ms', 'pt', 'sw', 'ha',
];

export interface TranslitAyah {
  number: number;
  transliteration: string;
  translation: string;
}

export function fetchSurahTransliteration(
  surahNum: number,
  lang: Lang,
): Promise<TranslitAyah[]> {
  const key = String(surahNum);
  const translitAyahs = TRANSLIT_DATA[key] ?? [];
  const translationLang = TRANSLATION_DATA[lang] ?? TRANSLATION_DATA['en'];
  const translationAyahs = translationLang[key] ?? [];

  const result: TranslitAyah[] = translitAyahs.map((text, i) => ({
    number: i + 1,
    transliteration: text,
    translation: translationAyahs[i] ?? '',
  }));

  return Promise.resolve(result);
}

export function fetchSurahNamesByLang(lang: Lang): Promise<Record<number, string>> {
  const langKey = lang in SURAH_NAMES_DATA ? lang : 'en';
  const names = SURAH_NAMES_DATA[langKey] ?? {};
  const result: Record<number, string> = {};
  for (const [k, v] of Object.entries(names)) {
    result[Number(k)] = v;
  }
  return Promise.resolve(result);
}

export function getTranslationEdition(lang: Lang): string {
  const EDITION_MAP: Partial<Record<Lang, string>> = {
    en: 'en.sahih', fr: 'fr.hamidullah', es: 'es.cortes', ru: 'ru.kuliev',
    zh: 'zh.jian', tr: 'tr.yazir', ur: 'ur.ahmedali', id: 'id.indonesian',
    bn: 'bn.bengali', fa: 'fa.ghomshei', ms: 'ms.basmeih', pt: 'pt.elhayek',
    sw: 'sw.barwani', ha: 'ha.gumi',
  };
  return EDITION_MAP[lang] ?? 'en.sahih';
}

import type { Lang } from '@/constants/i18n';

type SurahIndex = Record<string, string[]>;

const TRANSLIT_DATA = require('../assets/quran-translit.json') as SurahIndex;
const SURAH_NAMES_DATA = require('../assets/quran-surah-names.json') as Record<string, Record<string, string>>;

// Bundled translations — all 14 languages, fully offline, zero network calls.
const _bundledMulti = require('../assets/quran-translations.json') as Record<string, SurahIndex>;
const _zh = require('../assets/quran-zh.json') as SurahIndex;
const _tr = require('../assets/quran-tr.json') as SurahIndex;
const _id = require('../assets/quran-id.json') as SurahIndex;
const _bn = require('../assets/quran-bn.json') as SurahIndex;
const _fa = require('../assets/quran-fa.json') as SurahIndex;
const _ms = require('../assets/quran-ms.json') as SurahIndex;
const _pt = require('../assets/quran-pt.json') as SurahIndex;
const _sw = require('../assets/quran-sw.json') as SurahIndex;
const _ha = require('../assets/quran-ha.json') as SurahIndex;

const ALL_TRANSLATIONS: Record<string, SurahIndex> = {
  en: _bundledMulti['en'] ?? {},
  fr: _bundledMulti['fr'] ?? {},
  es: _bundledMulti['es'] ?? {},
  ur: _bundledMulti['ur'] ?? {},
  ru: _bundledMulti['ru'] ?? {},
  zh: _zh,
  tr: _tr,
  id: _id,
  bn: _bn,
  fa: _fa,
  ms: _ms,
  pt: _pt,
  sw: _sw,
  ha: _ha,
};

// All languages are now fully bundled — no network calls, no downloads.
export const BUNDLED_LANGS: Lang[] = ['en', 'fr', 'es', 'ur', 'ru', 'zh', 'tr', 'id', 'bn', 'fa', 'ms', 'pt', 'sw', 'ha'];
export const DOWNLOADABLE_LANGS: Lang[] = [];
export const SUPPORTED_TRANSLIT_LANGS: Lang[] = [...BUNDLED_LANGS];

export interface TranslitAyah {
  number: number;
  transliteration: string;
  translation: string;
}

export async function fetchSurahTransliteration(
  surahNum: number,
  lang: Lang,
): Promise<TranslitAyah[]> {
  const key = String(surahNum);
  const translitAyahs = TRANSLIT_DATA[key] ?? [];
  const translationData = ALL_TRANSLATIONS[lang] ?? ALL_TRANSLATIONS['en'] ?? {};
  const translationAyahs = translationData[key] ?? [];

  return translitAyahs.map((text, i) => ({
    number: i + 1,
    transliteration: text,
    translation: translationAyahs[i] ?? '',
  }));
}

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

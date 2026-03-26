import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Lang } from '@/constants/i18n';
import { getApiUrl } from '@/lib/query-client';

type SurahIndex = Record<string, string[]>;

const TRANSLIT_DATA = require('../assets/quran-translit.json') as SurahIndex;
const BUNDLED_TRANSLATIONS = require('../assets/quran-translations.json') as Record<string, SurahIndex>;
const SURAH_NAMES_DATA = require('../assets/quran-surah-names.json') as Record<string, Record<string, string>>;

export const BUNDLED_LANGS: Lang[] = ['en', 'fr', 'es', 'ur', 'ru'];

export const DOWNLOADABLE_LANGS: Lang[] = ['zh', 'tr', 'id', 'bn', 'fa', 'ms', 'pt', 'sw', 'ha'];

export const SUPPORTED_TRANSLIT_LANGS: Lang[] = [...BUNDLED_LANGS, ...DOWNLOADABLE_LANGS];

export interface TranslitAyah {
  number: number;
  transliteration: string;
  translation: string;
}

const memCache: Record<string, SurahIndex> = {};

async function getTranslationData(lang: Lang): Promise<SurahIndex> {
  if (BUNDLED_LANGS.includes(lang)) {
    return BUNDLED_TRANSLATIONS[lang] ?? BUNDLED_TRANSLATIONS['en'] ?? {};
  }

  if (memCache[lang]) return memCache[lang];

  const cacheKey = `@translit_cache_${lang}`;
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as SurahIndex;
      memCache[lang] = parsed;
      return parsed;
    }
  } catch {}

  try {
    const base = getApiUrl();
    const url = new URL(`/api/translations/${lang}`, base).toString();
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch translation for ${lang}: ${res.status}`);
    const data = await res.json() as SurahIndex;
    memCache[lang] = data;
    try {
      await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
    } catch {}
    return data;
  } catch {
    // Network unavailable or server error — return empty so transliteration
    // (which is always bundled) can still be displayed offline.
    return {};
  }
}

export async function fetchSurahTransliteration(
  surahNum: number,
  lang: Lang,
): Promise<TranslitAyah[]> {
  const key = String(surahNum);
  const translitAyahs = TRANSLIT_DATA[key] ?? [];
  const translationLang = await getTranslationData(lang);
  const translationAyahs = translationLang[key] ?? [];

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

export function isLangBundled(lang: Lang): boolean {
  return BUNDLED_LANGS.includes(lang);
}

export async function clearTranslationCache(lang: Lang): Promise<void> {
  delete memCache[lang];
  try {
    await AsyncStorage.removeItem(`@translit_cache_${lang}`);
  } catch {}
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

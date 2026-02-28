import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Lang } from '@/constants/i18n';

export interface TranslitAyah {
  number: number;
  transliteration: string;
  translation: string;
}

const EDITION_MAP: Partial<Record<Lang, string>> = {
  en: 'en.sahih',
  fr: 'fr.hamidullah',
  es: 'es.cortes',
  ru: 'ru.kuliev',
  zh: 'zh.jian',
  tr: 'tr.yazir',
  ur: 'ur.ahmedali',
  id: 'id.indonesian',
  bn: 'bn.bengali',
  fa: 'fa.ghomshei',
  ms: 'ms.basmeih',
  pt: 'pt.elhayek',
  sw: 'sw.barwani',
  ha: 'ha.gumi',
};

export function getTranslationEdition(lang: Lang): string {
  return EDITION_MAP[lang] ?? 'en.sahih';
}

export const SUPPORTED_TRANSLIT_LANGS: Lang[] = [
  'en', 'fr', 'es', 'ru', 'zh', 'tr', 'ur', 'id', 'bn', 'fa', 'ms', 'pt', 'sw', 'ha',
];

const CACHE_VERSION = 'v1';

function cacheKey(surahNum: number, lang: Lang): string {
  return `quran_translit_${CACHE_VERSION}_${surahNum}_${lang}`;
}

export async function fetchSurahTransliteration(
  surahNum: number,
  lang: Lang,
): Promise<TranslitAyah[]> {
  const key = cacheKey(surahNum, lang);

  const cached = await AsyncStorage.getItem(key);
  if (cached) {
    return JSON.parse(cached) as TranslitAyah[];
  }

  const translationEdition = getTranslationEdition(lang);
  const url =
    `https://api.alquran.cloud/v1/surah/${surahNum}/editions/en.transliteration,${translationEdition}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Quran API error: ${res.status}`);

  const json = await res.json() as { code: number; data: { ayahs: { numberInSurah: number; text: string }[] }[] };
  if (json.code !== 200) throw new Error('Quran API returned non-200');

  const [translitEdition, translationData] = json.data;

  const result: TranslitAyah[] = translitEdition.ayahs.map((a, i) => ({
    number: a.numberInSurah,
    transliteration: a.text,
    translation: translationData.ayahs[i]?.text ?? '',
  }));

  await AsyncStorage.setItem(key, JSON.stringify(result));
  return result;
}

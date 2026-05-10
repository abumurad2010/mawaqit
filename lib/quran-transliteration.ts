/**
 * Lightweight surah-names helper + lang constants.
 * Verse transliteration and translation are now handled by lib/quran-translations.ts.
 */

import type { Lang } from '@/constants/i18n';

const SURAH_NAMES_DATA = require('../assets/quran-surah-names.json') as Record<string, Record<string, string>>;

export const BUNDLED_LANGS: Lang[] = ['en', 'fr', 'es', 'ur', 'ru', 'zh', 'tr', 'id', 'bn', 'fa', 'ms', 'pt', 'sw', 'ha'];
export const DOWNLOADABLE_LANGS: Lang[] = [];

// fa and ur use Arabic script natively — no Latin transliteration is offered for them.
// ar is excluded — Arabic speakers read the original.
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
// Shared greedy Latin→target converter
// ---------------------------------------------------------------------------

function applyMapping(text: string, map: ReadonlyArray<readonly [string, string]>): string {
  let result = '';
  let i = 0;
  while (i < text.length) {
    let matched = false;
    for (const [lat, native] of map) {
      if (text.startsWith(lat, i)) {
        result += native;
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

// ---------------------------------------------------------------------------
// Russian — Latin Arabic transliteration → Cyrillic
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
  // Ayin and hamza → hard sign
  ['ʿ', 'ъ'],
  ['ʾ', 'ъ'],
  // ج → дж
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

// ---------------------------------------------------------------------------
// Chinese — Latin Arabic transliteration → Chinese phonetic characters
// Based on the Hui Muslim transliteration tradition used in Chinese Islamic texts.
// Word-level entries cover common Quran words; CV pairs improve syllable quality;
// single-phoneme entries handle everything else.
// ---------------------------------------------------------------------------

const LATIN_TO_CHINESE: ReadonlyArray<readonly [string, string]> = [
  // ── Common Quran words (word-level, highest priority) ─────────────────────
  ['Allāhu', '安拉胡'],  ['allāhu', '安拉胡'],
  ['Allāhi', '安拉希'],  ['allāhi', '安拉希'],
  ['Allāh',  '安拉'],    ['allāh',  '安拉'],
  ['raḥmāni','拉赫曼尼'],['raḥmān', '拉赫曼'],
  ['raḥīmi', '拉希姆'],  ['raḥīm',  '拉希姆'],
  ['Bismi',  '比斯密'],  ['bismi',  '比斯密'],

  // ── Digraphs ──────────────────────────────────────────────────────────────
  ['sh', '示'],  ['Sh', '示'],  ['SH', '示'],
  ['kh', '哈'],  ['Kh', '哈'],  ['KH', '哈'],
  ['gh', '嘎'],  ['Gh', '嘎'],  ['GH', '嘎'],
  ['th', '斯'],  ['Th', '斯'],  ['TH', '斯'],
  ['dh', '则'],  ['Dh', '则'],  ['DH', '则'],

  // ── Long vowels (macron) ──────────────────────────────────────────────────
  ['ā', '啊'],  ['Ā', '啊'],
  ['ī', '伊'],  ['Ī', '伊'],
  ['ū', '乌'],  ['Ū', '乌'],

  // ── Emphatic consonants ───────────────────────────────────────────────────
  ['ḥ', '哈'],  ['Ḥ', '哈'],
  ['ṣ', '斯'],  ['Ṣ', '斯'],
  ['ḍ', '达'],  ['Ḍ', '达'],
  ['ṭ', '塔'],  ['Ṭ', '塔'],
  ['ẓ', '扎'],  ['Ẓ', '扎'],

  // ── Ayin / hamza — elided ─────────────────────────────────────────────────
  ['ʿ', ''],
  ['ʾ', ''],

  // ── CV syllable pairs (produce more natural output than single chars) ──────
  ['bā', '巴'],  ['Bā', '巴'],  ['bi', '比'],  ['Bi', '比'],
  ['ba', '巴'],  ['Ba', '巴'],  ['bū', '布'],  ['Bū', '布'],
  ['lā', '拉'],  ['Lā', '拉'],  ['la', '拉'],  ['La', '拉'],
  ['li', '里'],  ['Li', '里'],  ['lī', '里'],  ['Lī', '里'],
  ['lu', '卢'],  ['Lu', '卢'],  ['lū', '卢'],  ['Lū', '卢'],
  ['rā', '热'],  ['Rā', '热'],  ['ra', '热'],  ['Ra', '热'],
  ['ri', '热'],  ['Ri', '热'],
  ['mā', '玛'],  ['Mā', '玛'],  ['ma', '马'],  ['Ma', '马'],
  ['mi', '密'],  ['Mi', '密'],  ['mī', '密'],  ['Mī', '密'],
  ['mu', '姆'],  ['Mu', '姆'],  ['mū', '姆'],  ['Mū', '姆'],
  ['nā', '纳'],  ['Nā', '纳'],  ['na', '纳'],  ['Na', '纳'],
  ['ni', '尼'],  ['Ni', '尼'],  ['nī', '尼'],  ['Nī', '尼'],
  ['nu', '奴'],  ['Nu', '奴'],  ['nū', '奴'],  ['Nū', '奴'],
  ['hā', '哈'],  ['Hā', '哈'],  ['ha', '哈'],  ['Ha', '哈'],
  ['hi', '希'],  ['Hi', '希'],  ['hī', '希'],  ['Hī', '希'],
  ['hu', '胡'],  ['Hu', '胡'],  ['hū', '胡'],  ['Hū', '胡'],
  ['wā', '瓦'],  ['Wā', '瓦'],  ['wa', '瓦'],  ['Wa', '瓦'],
  ['wi', '维'],  ['Wi', '维'],
  ['yā', '亚'],  ['Yā', '亚'],  ['ya', '亚'],  ['Ya', '亚'],
  ['yi', '伊'],  ['Yi', '伊'],
  ['sā', '萨'],  ['Sā', '萨'],  ['sa', '萨'],  ['Sa', '萨'],
  ['si', '斯'],  ['Si', '斯'],  ['sū', '苏'],  ['Sū', '苏'],
  ['su', '苏'],  ['Su', '苏'],
  ['fā', '法'],  ['Fā', '法'],  ['fa', '法'],  ['Fa', '法'],
  ['fi', '菲'],  ['Fi', '菲'],  ['fu', '福'],  ['Fu', '福'],
  ['kā', '卡'],  ['Kā', '卡'],  ['ka', '卡'],  ['Ka', '卡'],
  ['ki', '基'],  ['Ki', '基'],  ['ku', '库'],  ['Ku', '库'],
  ['kū', '库'],  ['Kū', '库'],
  ['tā', '塔'],  ['Tā', '塔'],  ['ta', '塔'],  ['Ta', '塔'],
  ['ti', '提'],  ['Ti', '提'],  ['tu', '图'],  ['Tu', '图'],
  ['dā', '达'],  ['Dā', '达'],  ['da', '达'],  ['Da', '达'],
  ['di', '迪'],  ['Di', '迪'],  ['du', '杜'],  ['Du', '杜'],
  ['ja', '贾'],  ['Ja', '贾'],  ['ji', '吉'],  ['Ji', '吉'],
  ['ju', '居'],  ['Ju', '居'],
  ['qā', '嘎'],  ['Qā', '嘎'],  ['qa', '嘎'],  ['Qa', '嘎'],
  ['qi', '格'],  ['Qi', '格'],  ['qu', '格'],  ['Qu', '格'],

  // ── Single consonants (fallback) ──────────────────────────────────────────
  ['b', '百'],  ['B', '百'],
  ['t', '特'],  ['T', '特'],
  ['j', '者'],  ['J', '者'],
  ['d', '代'],  ['D', '代'],
  ['r', '热'],  ['R', '热'],
  ['z', '扎'],  ['Z', '扎'],
  ['s', '斯'],  ['S', '斯'],
  ['f', '法'],  ['F', '法'],
  ['q', '嘎'],  ['Q', '嘎'],
  ['k', '科'],  ['K', '科'],
  ['l', '拉'],  ['L', '拉'],
  ['m', '门'],  ['M', '门'],
  ['n', '奴'],  ['N', '奴'],
  ['h', '哈'],  ['H', '哈'],
  ['w', '瓦'],  ['W', '瓦'],
  ['y', '叶'],  ['Y', '叶'],

  // ── Vowels (last resort) ──────────────────────────────────────────────────
  ['a', '阿'],  ['A', '阿'],
  ['i', '伊'],  ['I', '伊'],
  ['u', '乌'],  ['U', '乌'],
  ['e', '额'],  ['E', '额'],
  ['o', '喔'],  ['O', '喔'],
];

// ---------------------------------------------------------------------------
// Bengali — Latin Arabic transliteration → Bengali script (Bangla)
// Short 'a' maps to '' (inherent vowel in Bengali abugida — the consonant
// already carries it). Long vowels and i/u use dependent vowel signs.
// ---------------------------------------------------------------------------

const LATIN_TO_BENGALI: ReadonlyArray<readonly [string, string]> = [
  // ── Digraphs ──────────────────────────────────────────────────────────────
  ['sh', 'শ'],  ['Sh', 'শ'],  ['SH', 'শ'],
  ['kh', 'খ'],  ['Kh', 'খ'],  ['KH', 'খ'],
  ['gh', 'গ'],  ['Gh', 'গ'],  ['GH', 'গ'],
  ['th', 'স'],  ['Th', 'স'],  ['TH', 'স'],   // ث approximated as স
  ['dh', 'দ'],  ['Dh', 'দ'],  ['DH', 'দ'],   // ذ approximated as দ

  // ── Long vowels — dependent forms (attach to preceding consonant) ─────────
  ['ā', 'া'],   ['Ā', 'আ'],
  ['ī', 'ী'],   ['Ī', 'ঈ'],
  ['ū', 'ূ'],   ['Ū', 'ঊ'],

  // ── Emphatic consonants ───────────────────────────────────────────────────
  ['ḥ', 'হ'],   ['Ḥ', 'হ'],
  ['ṣ', 'স'],   ['Ṣ', 'স'],
  ['ḍ', 'ড'],   ['Ḍ', 'ড'],
  ['ṭ', 'ট'],   ['Ṭ', 'ট'],
  ['ẓ', 'জ'],   ['Ẓ', 'জ'],

  // ── Ayin / hamza — silent in Bengali convention ───────────────────────────
  ['ʿ', ''],
  ['ʾ', ''],

  // ── Consonants ────────────────────────────────────────────────────────────
  ['b', 'ব'],   ['B', 'ব'],
  ['t', 'ত'],   ['T', 'ত'],
  ['j', 'জ'],   ['J', 'জ'],
  ['d', 'দ'],   ['D', 'দ'],
  ['r', 'র'],   ['R', 'র'],
  ['z', 'জ'],   ['Z', 'জ'],
  ['s', 'স'],   ['S', 'স'],
  ['f', 'ফ'],   ['F', 'ফ'],
  ['q', 'ক'],   ['Q', 'ক'],
  ['k', 'ক'],   ['K', 'ক'],
  ['l', 'ল'],   ['L', 'ল'],
  ['m', 'ম'],   ['M', 'ম'],
  ['n', 'ন'],   ['N', 'ন'],
  ['h', 'হ'],   ['H', 'হ'],
  ['w', 'ও'],   ['W', 'ও'],
  ['y', 'য'],   ['Y', 'য'],

  // ── Vowels ────────────────────────────────────────────────────────────────
  // Short 'a' is inherent in Bengali consonants — map to '' so 'ba' renders
  // as ব (reads "ba"), not বঅ. Uppercase 'A' at word-start → independent আ.
  ['a', ''],    ['A', 'আ'],
  ['i', 'ি'],   ['I', 'ই'],    // dependent i sign; uppercase → independent ই
  ['u', 'ু'],   ['U', 'উ'],    // dependent u sign; uppercase → independent উ
  ['e', 'ে'],   ['E', 'এ'],
  ['o', 'ো'],   ['O', 'ও'],
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Converts a Latin-script Arabic transliteration string to the user's native
 * script where a non-Latin rendering is defined.
 *
 *   ru → Cyrillic (standard Arabic-phoneme mapping)
 *   zh → Chinese phonetic characters (Hui Muslim tradition + CV pairs)
 *   bn → Bengali script (abugida with inherent short-a)
 *   all other langs → returned unchanged (Latin is appropriate)
 */
export function transliterateToScript(text: string, lang: Lang): string {
  if (!text) return text;
  switch (lang) {
    case 'ru': return applyMapping(text, LATIN_TO_CYRILLIC);
    case 'zh': return applyMapping(text, LATIN_TO_CHINESE);
    case 'bn': return applyMapping(text, LATIN_TO_BENGALI);
    default:   return text;
  }
}

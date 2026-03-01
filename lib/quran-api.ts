/**
 * Quran data is fully embedded — no network calls, no caching.
 * The full 114-surah Uthmani text is bundled in assets/quran.json.
 */

const QURAN_DATA = require('../assets/quran.json') as Record<
  string,
  Array<{ n: number; t: string; j: number; p: number }>
>;

export interface Surah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: 'Meccan' | 'Medinan';
}

export interface Ayah {
  number: number;
  text: string;
  numberInSurah: number;
  juz: number;
  manzil: number;
  page: number;
  ruku: number;
  hizbQuarter: number;
  sajda: boolean;
}

export interface SurahData {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
  ayahs: Ayah[];
}

function rawToAyahs(surahNum: number, raw: Array<{ n: number; t: string; j: number; p: number }>): Ayah[] {
  let globalNum = 0;
  for (let i = 1; i < surahNum; i++) {
    globalNum += SURAH_META[i - 1].ayahs;
  }
  return raw.map((a, idx) => ({
    number: globalNum + idx + 1,
    text: a.t,
    numberInSurah: a.n,
    juz: a.j,
    manzil: 0,
    page: a.p,
    ruku: 0,
    hizbQuarter: 0,
    sajda: false,
  }));
}

export function getSurahList(): Surah[] {
  return SURAH_META.map(m => ({
    number: m.number,
    name: m.arabic,
    englishName: m.transliteration,
    englishNameTranslation: m.english,
    numberOfAyahs: m.ayahs,
    revelationType: m.type,
  }));
}

export function getSurah(number: number): SurahData {
  const meta = SURAH_META[number - 1];
  if (!meta) throw new Error(`Invalid surah number: ${number}`);
  const raw = QURAN_DATA[String(number)];
  if (!raw) throw new Error(`Surah ${number} not found in bundled data`);
  return {
    number: meta.number,
    name: meta.arabic,
    englishName: meta.transliteration,
    englishNameTranslation: meta.english,
    numberOfAyahs: meta.ayahs,
    revelationType: meta.type,
    ayahs: rawToAyahs(number, raw),
  };
}

export function fetchSurah(number: number): Promise<SurahData> {
  return Promise.resolve(getSurah(number));
}

function stripArabicDiacritics(text: string): string {
  return text
    .replace(/[\u064B-\u065F\u0670\u0610-\u061A]/g, '')
    .replace(/[أإآٱ]/g, 'ا');
}

function normalizeForSearch(text: string): string {
  return stripArabicDiacritics(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

type NormEntry = { surahNum: number; ayahNum: number; text: string; norm: string };
let _normalizedIndex: NormEntry[] | null = null;

function getNormalizedIndex(): NormEntry[] {
  if (_normalizedIndex) return _normalizedIndex;
  const idx: NormEntry[] = [];
  for (let s = 1; s <= 114; s++) {
    const raw = QURAN_DATA[String(s)];
    if (!raw) continue;
    for (const a of raw) {
      idx.push({ surahNum: s, ayahNum: a.n, text: a.t, norm: normalizeForSearch(a.t) });
    }
  }
  _normalizedIndex = idx;
  return idx;
}

export function searchQuran(query: string): { surahNum: number; ayahNum: number; text: string }[] {
  if (!query.trim()) return [];
  const q = normalizeForSearch(query);
  if (!q) return [];
  const results: { surahNum: number; ayahNum: number; text: string }[] = [];
  const index = getNormalizedIndex();
  for (const entry of index) {
    if (entry.norm.includes(q)) {
      results.push({ surahNum: entry.surahNum, ayahNum: entry.ayahNum, text: entry.text });
      if (results.length >= 200) return results;
    }
  }
  return results;
}

export const SURAH_META: Array<{
  number: number;
  arabic: string;
  transliteration: string;
  english: string;
  ayahs: number;
  type: 'Meccan' | 'Medinan';
  hasBismillah: boolean;
}> = [
  { number: 1,   arabic: 'الْفَاتِحَة',       transliteration: 'Al-Fātiḥah',      english: 'The Opening',           ayahs: 7,   type: 'Meccan',  hasBismillah: true },
  { number: 2,   arabic: 'الْبَقَرَة',         transliteration: "Al-Baqarah",       english: 'The Cow',               ayahs: 286, type: 'Medinan', hasBismillah: true },
  { number: 3,   arabic: 'آلِ عِمْرَان',       transliteration: "Āl 'Imrān",        english: 'Family of Imran',       ayahs: 200, type: 'Medinan', hasBismillah: true },
  { number: 4,   arabic: 'النِّسَاء',          transliteration: 'An-Nisā',          english: 'The Women',             ayahs: 176, type: 'Medinan', hasBismillah: true },
  { number: 5,   arabic: 'الْمَائِدَة',        transliteration: 'Al-Māʾidah',       english: 'The Table Spread',      ayahs: 120, type: 'Medinan', hasBismillah: true },
  { number: 6,   arabic: 'الْأَنْعَام',        transliteration: 'Al-Anʿām',         english: 'The Cattle',            ayahs: 165, type: 'Meccan',  hasBismillah: true },
  { number: 7,   arabic: 'الْأَعْرَاف',        transliteration: 'Al-Aʿrāf',         english: 'The Heights',           ayahs: 206, type: 'Meccan',  hasBismillah: true },
  { number: 8,   arabic: 'الْأَنْفَال',        transliteration: 'Al-Anfāl',         english: 'The Spoils of War',     ayahs: 75,  type: 'Medinan', hasBismillah: true },
  { number: 9,   arabic: 'التَّوْبَة',         transliteration: 'At-Tawbah',        english: 'The Repentance',        ayahs: 129, type: 'Medinan', hasBismillah: false },
  { number: 10,  arabic: 'يُونُس',             transliteration: 'Yūnus',            english: 'Jonah',                 ayahs: 109, type: 'Meccan',  hasBismillah: true },
  { number: 11,  arabic: 'هُود',               transliteration: 'Hūd',              english: 'Hud',                   ayahs: 123, type: 'Meccan',  hasBismillah: true },
  { number: 12,  arabic: 'يُوسُف',             transliteration: 'Yūsuf',            english: 'Joseph',                ayahs: 111, type: 'Meccan',  hasBismillah: true },
  { number: 13,  arabic: 'الرَّعْد',           transliteration: 'Ar-Raʿd',          english: 'The Thunder',           ayahs: 43,  type: 'Medinan', hasBismillah: true },
  { number: 14,  arabic: 'إِبْرَاهِيم',        transliteration: 'Ibrāhīm',          english: 'Ibrahim',               ayahs: 52,  type: 'Meccan',  hasBismillah: true },
  { number: 15,  arabic: 'الْحِجْر',           transliteration: 'Al-Ḥijr',          english: 'The Rocky Tract',       ayahs: 99,  type: 'Meccan',  hasBismillah: true },
  { number: 16,  arabic: 'النَّحْل',           transliteration: 'An-Naḥl',          english: 'The Bee',               ayahs: 128, type: 'Meccan',  hasBismillah: true },
  { number: 17,  arabic: 'الْإِسْرَاء',        transliteration: 'Al-Isrāʾ',         english: 'The Night Journey',     ayahs: 111, type: 'Meccan',  hasBismillah: true },
  { number: 18,  arabic: 'الْكَهْف',           transliteration: 'Al-Kahf',          english: 'The Cave',              ayahs: 110, type: 'Meccan',  hasBismillah: true },
  { number: 19,  arabic: 'مَرْيَم',            transliteration: 'Maryam',           english: 'Mary',                  ayahs: 98,  type: 'Meccan',  hasBismillah: true },
  { number: 20,  arabic: 'طه',                 transliteration: 'Ṭā-Hā',            english: 'Ta-Ha',                 ayahs: 135, type: 'Meccan',  hasBismillah: true },
  { number: 21,  arabic: 'الْأَنبِيَاء',       transliteration: 'Al-Anbiyāʾ',       english: 'The Prophets',          ayahs: 112, type: 'Meccan',  hasBismillah: true },
  { number: 22,  arabic: 'الْحَج',             transliteration: 'Al-Ḥajj',          english: 'The Pilgrimage',        ayahs: 78,  type: 'Medinan', hasBismillah: true },
  { number: 23,  arabic: 'الْمُؤْمِنُون',      transliteration: 'Al-Muʾminūn',      english: 'The Believers',         ayahs: 118, type: 'Meccan',  hasBismillah: true },
  { number: 24,  arabic: 'النُّور',            transliteration: 'An-Nūr',           english: 'The Light',             ayahs: 64,  type: 'Medinan', hasBismillah: true },
  { number: 25,  arabic: 'الْفُرْقَان',        transliteration: 'Al-Furqān',        english: 'The Criterion',         ayahs: 77,  type: 'Meccan',  hasBismillah: true },
  { number: 26,  arabic: 'الشُّعَرَاء',        transliteration: 'Ash-Shuʿarāʾ',    english: 'The Poets',             ayahs: 227, type: 'Meccan',  hasBismillah: true },
  { number: 27,  arabic: 'النَّمْل',           transliteration: 'An-Naml',          english: 'The Ant',               ayahs: 93,  type: 'Meccan',  hasBismillah: true },
  { number: 28,  arabic: 'الْقَصَص',           transliteration: 'Al-Qaṣaṣ',         english: 'The Stories',           ayahs: 88,  type: 'Meccan',  hasBismillah: true },
  { number: 29,  arabic: 'الْعَنكَبُوت',       transliteration: 'Al-ʿAnkabūt',      english: 'The Spider',            ayahs: 69,  type: 'Meccan',  hasBismillah: true },
  { number: 30,  arabic: 'الرُّوم',            transliteration: 'Ar-Rūm',           english: 'The Romans',            ayahs: 60,  type: 'Meccan',  hasBismillah: true },
  { number: 31,  arabic: 'لُقْمَان',           transliteration: 'Luqmān',           english: 'Luqman',                ayahs: 34,  type: 'Meccan',  hasBismillah: true },
  { number: 32,  arabic: 'السَّجْدَة',         transliteration: 'As-Sajdah',        english: 'The Prostration',       ayahs: 30,  type: 'Meccan',  hasBismillah: true },
  { number: 33,  arabic: 'الْأَحْزَاب',        transliteration: 'Al-Aḥzāb',         english: 'The Combined Forces',   ayahs: 73,  type: 'Medinan', hasBismillah: true },
  { number: 34,  arabic: 'سَبَأ',              transliteration: 'Sabaʾ',            english: 'Sheba',                 ayahs: 54,  type: 'Meccan',  hasBismillah: true },
  { number: 35,  arabic: 'فَاطِر',             transliteration: 'Fāṭir',            english: 'Originator',            ayahs: 45,  type: 'Meccan',  hasBismillah: true },
  { number: 36,  arabic: 'يس',                 transliteration: 'Yā-Sīn',           english: 'Ya Sin',                ayahs: 83,  type: 'Meccan',  hasBismillah: true },
  { number: 37,  arabic: 'الصَّافَّات',        transliteration: 'Aṣ-Ṣāffāt',       english: 'Those Who Set the Ranks', ayahs: 182, type: 'Meccan', hasBismillah: true },
  { number: 38,  arabic: 'ص',                  transliteration: 'Ṣād',              english: 'The Letter Sad',        ayahs: 88,  type: 'Meccan',  hasBismillah: true },
  { number: 39,  arabic: 'الزُّمَر',           transliteration: 'Az-Zumar',         english: 'The Troops',            ayahs: 75,  type: 'Meccan',  hasBismillah: true },
  { number: 40,  arabic: 'غَافِر',             transliteration: 'Ghāfir',           english: 'The Forgiver',          ayahs: 85,  type: 'Meccan',  hasBismillah: true },
  { number: 41,  arabic: 'فُصِّلَت',           transliteration: 'Fuṣṣilat',         english: 'Explained in Detail',   ayahs: 54,  type: 'Meccan',  hasBismillah: true },
  { number: 42,  arabic: 'الشُّورَى',          transliteration: 'Ash-Shūrā',        english: 'The Consultation',      ayahs: 53,  type: 'Meccan',  hasBismillah: true },
  { number: 43,  arabic: 'الزُّخْرُف',         transliteration: 'Az-Zukhruf',       english: 'The Ornaments of Gold', ayahs: 89,  type: 'Meccan',  hasBismillah: true },
  { number: 44,  arabic: 'الدُّخَان',          transliteration: 'Ad-Dukhān',        english: 'The Smoke',             ayahs: 59,  type: 'Meccan',  hasBismillah: true },
  { number: 45,  arabic: 'الْجَاثِيَة',        transliteration: 'Al-Jāthiyah',      english: 'The Crouching',         ayahs: 37,  type: 'Meccan',  hasBismillah: true },
  { number: 46,  arabic: 'الْأَحْقَاف',        transliteration: 'Al-Aḥqāf',         english: 'The Wind-Curved Sandhills', ayahs: 35, type: 'Meccan', hasBismillah: true },
  { number: 47,  arabic: 'مُحَمَّد',           transliteration: 'Muḥammad',         english: 'Muhammad',              ayahs: 38,  type: 'Medinan', hasBismillah: true },
  { number: 48,  arabic: 'الْفَتْح',           transliteration: 'Al-Fatḥ',          english: 'The Victory',           ayahs: 29,  type: 'Medinan', hasBismillah: true },
  { number: 49,  arabic: 'الْحُجُرَات',        transliteration: 'Al-Ḥujurāt',       english: 'The Rooms',             ayahs: 18,  type: 'Medinan', hasBismillah: true },
  { number: 50,  arabic: 'ق',                  transliteration: 'Qāf',              english: 'The Letter Qaf',        ayahs: 45,  type: 'Meccan',  hasBismillah: true },
  { number: 51,  arabic: 'الذَّارِيَات',       transliteration: 'Adh-Dhāriyāt',     english: 'The Winnowing Winds',   ayahs: 60,  type: 'Meccan',  hasBismillah: true },
  { number: 52,  arabic: 'الطُّور',            transliteration: 'Aṭ-Ṭūr',          english: 'The Mount',             ayahs: 49,  type: 'Meccan',  hasBismillah: true },
  { number: 53,  arabic: 'النَّجْم',           transliteration: 'An-Najm',          english: 'The Star',              ayahs: 62,  type: 'Meccan',  hasBismillah: true },
  { number: 54,  arabic: 'الْقَمَر',           transliteration: 'Al-Qamar',         english: 'The Moon',              ayahs: 55,  type: 'Meccan',  hasBismillah: true },
  { number: 55,  arabic: 'الرَّحْمَن',         transliteration: 'Ar-Raḥmān',        english: 'The Beneficent',        ayahs: 78,  type: 'Medinan', hasBismillah: true },
  { number: 56,  arabic: 'الْوَاقِعَة',        transliteration: 'Al-Wāqiʿah',       english: 'The Inevitable',        ayahs: 96,  type: 'Meccan',  hasBismillah: true },
  { number: 57,  arabic: 'الْحَدِيد',          transliteration: 'Al-Ḥadīd',         english: 'The Iron',              ayahs: 29,  type: 'Medinan', hasBismillah: true },
  { number: 58,  arabic: 'الْمُجَادَلَة',      transliteration: 'Al-Mujādilah',     english: 'The Pleading Woman',    ayahs: 22,  type: 'Medinan', hasBismillah: true },
  { number: 59,  arabic: 'الْحَشْر',           transliteration: 'Al-Ḥashr',         english: 'The Exile',             ayahs: 24,  type: 'Medinan', hasBismillah: true },
  { number: 60,  arabic: 'الْمُمْتَحَنَة',     transliteration: 'Al-Mumtaḥanah',    english: 'She That Is To Be Examined', ayahs: 13, type: 'Medinan', hasBismillah: true },
  { number: 61,  arabic: 'الصَّف',             transliteration: 'Aṣ-Ṣaf',           english: 'The Ranks',             ayahs: 14,  type: 'Medinan', hasBismillah: true },
  { number: 62,  arabic: 'الْجُمُعَة',         transliteration: 'Al-Jumuʿah',       english: 'Friday',                ayahs: 11,  type: 'Medinan', hasBismillah: true },
  { number: 63,  arabic: 'الْمُنَافِقُون',     transliteration: 'Al-Munāfiqūn',     english: 'The Hypocrites',        ayahs: 11,  type: 'Medinan', hasBismillah: true },
  { number: 64,  arabic: 'التَّغَابُن',        transliteration: 'At-Taghābun',      english: 'The Mutual Disillusion', ayahs: 18, type: 'Medinan', hasBismillah: true },
  { number: 65,  arabic: 'الطَّلَاق',          transliteration: 'Aṭ-Ṭalāq',        english: 'The Divorce',           ayahs: 12,  type: 'Medinan', hasBismillah: true },
  { number: 66,  arabic: 'التَّحْرِيم',        transliteration: 'At-Taḥrīm',        english: 'The Prohibition',       ayahs: 12,  type: 'Medinan', hasBismillah: true },
  { number: 67,  arabic: 'الْمُلْك',           transliteration: 'Al-Mulk',          english: 'The Sovereignty',       ayahs: 30,  type: 'Meccan',  hasBismillah: true },
  { number: 68,  arabic: 'الْقَلَم',           transliteration: 'Al-Qalam',         english: 'The Pen',               ayahs: 52,  type: 'Meccan',  hasBismillah: true },
  { number: 69,  arabic: 'الْحَاقَّة',         transliteration: 'Al-Ḥāqqah',        english: 'The Reality',           ayahs: 52,  type: 'Meccan',  hasBismillah: true },
  { number: 70,  arabic: 'الْمَعَارِج',        transliteration: 'Al-Maʿārij',       english: 'The Ascending Stairways', ayahs: 44, type: 'Meccan', hasBismillah: true },
  { number: 71,  arabic: 'نُوح',               transliteration: 'Nūḥ',              english: 'Noah',                  ayahs: 28,  type: 'Meccan',  hasBismillah: true },
  { number: 72,  arabic: 'الْجِن',             transliteration: 'Al-Jinn',          english: 'The Jinn',              ayahs: 28,  type: 'Meccan',  hasBismillah: true },
  { number: 73,  arabic: 'الْمُزَّمِّل',       transliteration: 'Al-Muzzammil',     english: 'The Enshrouded One',    ayahs: 20,  type: 'Meccan',  hasBismillah: true },
  { number: 74,  arabic: 'الْمُدَّثِّر',       transliteration: 'Al-Muddaththir',   english: 'The Cloaked One',       ayahs: 56,  type: 'Meccan',  hasBismillah: true },
  { number: 75,  arabic: 'الْقِيَامَة',        transliteration: 'Al-Qiyāmah',       english: 'The Resurrection',      ayahs: 40,  type: 'Meccan',  hasBismillah: true },
  { number: 76,  arabic: 'الْإِنسَان',         transliteration: 'Al-Insān',         english: 'The Man',               ayahs: 31,  type: 'Medinan', hasBismillah: true },
  { number: 77,  arabic: 'الْمُرْسَلَات',      transliteration: 'Al-Mursalāt',      english: 'The Emissaries',        ayahs: 50,  type: 'Meccan',  hasBismillah: true },
  { number: 78,  arabic: 'النَّبَأ',           transliteration: "An-Nabaʾ",         english: 'The Tidings',           ayahs: 40,  type: 'Meccan',  hasBismillah: true },
  { number: 79,  arabic: 'النَّازِعَات',       transliteration: 'An-Nāziʿāt',       english: 'Those Who Drag Forth',  ayahs: 46,  type: 'Meccan',  hasBismillah: true },
  { number: 80,  arabic: 'عَبَسَ',             transliteration: 'ʿAbasa',           english: 'He Frowned',            ayahs: 42,  type: 'Meccan',  hasBismillah: true },
  { number: 81,  arabic: 'التَّكْوِير',        transliteration: 'At-Takwīr',        english: 'The Overthrowing',      ayahs: 29,  type: 'Meccan',  hasBismillah: true },
  { number: 82,  arabic: 'الْإِنفِطَار',       transliteration: 'Al-Infiṭār',       english: 'The Cleaving',          ayahs: 19,  type: 'Meccan',  hasBismillah: true },
  { number: 83,  arabic: 'الْمُطَفِّفِين',     transliteration: 'Al-Muṭaffifīn',    english: 'The Defrauding',        ayahs: 36,  type: 'Meccan',  hasBismillah: true },
  { number: 84,  arabic: 'الْإِنشِقَاق',       transliteration: 'Al-Inshiqāq',      english: 'The Sundering',         ayahs: 25,  type: 'Meccan',  hasBismillah: true },
  { number: 85,  arabic: 'الْبُرُوج',          transliteration: 'Al-Burūj',         english: 'The Mansions of the Stars', ayahs: 22, type: 'Meccan', hasBismillah: true },
  { number: 86,  arabic: 'الطَّارِق',          transliteration: 'Aṭ-Ṭāriq',        english: 'The Nightcommer',       ayahs: 17,  type: 'Meccan',  hasBismillah: true },
  { number: 87,  arabic: 'الْأَعْلَى',         transliteration: 'Al-Aʿlā',          english: 'The Most High',         ayahs: 19,  type: 'Meccan',  hasBismillah: true },
  { number: 88,  arabic: 'الْغَاشِيَة',        transliteration: 'Al-Ghāshiyah',     english: 'The Overwhelming',      ayahs: 26,  type: 'Meccan',  hasBismillah: true },
  { number: 89,  arabic: 'الْفَجْر',           transliteration: 'Al-Fajr',          english: 'The Dawn',              ayahs: 30,  type: 'Meccan',  hasBismillah: true },
  { number: 90,  arabic: 'الْبَلَد',           transliteration: 'Al-Balad',         english: 'The City',              ayahs: 20,  type: 'Meccan',  hasBismillah: true },
  { number: 91,  arabic: 'الشَّمْس',           transliteration: 'Ash-Shams',        english: 'The Sun',               ayahs: 15,  type: 'Meccan',  hasBismillah: true },
  { number: 92,  arabic: 'اللَّيْل',           transliteration: 'Al-Layl',          english: 'The Night',             ayahs: 21,  type: 'Meccan',  hasBismillah: true },
  { number: 93,  arabic: 'الضُّحَى',           transliteration: 'Ad-Duḥā',          english: 'The Morning Hours',     ayahs: 11,  type: 'Meccan',  hasBismillah: true },
  { number: 94,  arabic: 'الشَّرْح',           transliteration: 'Ash-Sharḥ',        english: 'The Relief',            ayahs: 8,   type: 'Meccan',  hasBismillah: true },
  { number: 95,  arabic: 'التِّين',            transliteration: 'At-Tīn',           english: 'The Fig',               ayahs: 8,   type: 'Meccan',  hasBismillah: true },
  { number: 96,  arabic: 'الْعَلَق',           transliteration: 'Al-ʿAlaq',         english: 'The Clot',              ayahs: 19,  type: 'Meccan',  hasBismillah: true },
  { number: 97,  arabic: 'الْقَدْر',           transliteration: 'Al-Qadr',          english: 'The Power',             ayahs: 5,   type: 'Meccan',  hasBismillah: true },
  { number: 98,  arabic: 'الْبَيِّنَة',        transliteration: 'Al-Bayyinah',      english: 'The Clear Proof',       ayahs: 8,   type: 'Medinan', hasBismillah: true },
  { number: 99,  arabic: 'الزَّلْزَلَة',       transliteration: 'Az-Zalzalah',      english: 'The Earthquake',        ayahs: 8,   type: 'Medinan', hasBismillah: true },
  { number: 100, arabic: 'الْعَادِيَات',       transliteration: 'Al-ʿĀdiyāt',       english: 'The Courser',           ayahs: 11,  type: 'Meccan',  hasBismillah: true },
  { number: 101, arabic: 'الْقَارِعَة',        transliteration: 'Al-Qāriʿah',       english: 'The Calamity',          ayahs: 11,  type: 'Meccan',  hasBismillah: true },
  { number: 102, arabic: 'التَّكَاثُر',        transliteration: 'At-Takāthur',      english: 'The Rivalry in World Increase', ayahs: 8, type: 'Meccan', hasBismillah: true },
  { number: 103, arabic: 'الْعَصْر',           transliteration: 'Al-ʿAṣr',          english: 'The Declining Day',     ayahs: 3,   type: 'Meccan',  hasBismillah: true },
  { number: 104, arabic: 'الْهُمَزَة',         transliteration: 'Al-Humazah',       english: 'The Traducer',          ayahs: 9,   type: 'Meccan',  hasBismillah: true },
  { number: 105, arabic: 'الْفِيل',            transliteration: 'Al-Fīl',           english: 'The Elephant',          ayahs: 5,   type: 'Meccan',  hasBismillah: true },
  { number: 106, arabic: 'قُرَيْش',            transliteration: 'Quraysh',          english: 'Quraysh',               ayahs: 4,   type: 'Meccan',  hasBismillah: true },
  { number: 107, arabic: 'الْمَاعُون',         transliteration: 'Al-Māʿūn',         english: 'The Small Kindnesses',  ayahs: 7,   type: 'Meccan',  hasBismillah: true },
  { number: 108, arabic: 'الْكَوْثَر',         transliteration: 'Al-Kawthar',       english: 'The Abundance',         ayahs: 3,   type: 'Meccan',  hasBismillah: true },
  { number: 109, arabic: 'الْكَافِرُون',       transliteration: 'Al-Kāfirūn',       english: 'The Disbelievers',      ayahs: 6,   type: 'Meccan',  hasBismillah: true },
  { number: 110, arabic: 'النَّصْر',           transliteration: 'An-Naṣr',          english: 'The Divine Support',    ayahs: 3,   type: 'Medinan', hasBismillah: true },
  { number: 111, arabic: 'الْمَسَد',           transliteration: 'Al-Masad',         english: 'The Palm Fiber',        ayahs: 5,   type: 'Meccan',  hasBismillah: true },
  { number: 112, arabic: 'الْإِخْلَاص',        transliteration: 'Al-Ikhlāṣ',        english: 'The Sincerity',         ayahs: 4,   type: 'Meccan',  hasBismillah: true },
  { number: 113, arabic: 'الْفَلَق',           transliteration: 'Al-Falaq',         english: 'The Daybreak',          ayahs: 5,   type: 'Meccan',  hasBismillah: true },
  { number: 114, arabic: 'النَّاس',            transliteration: 'An-Nās',           english: 'Mankind',               ayahs: 6,   type: 'Meccan',  hasBismillah: true },
];

export interface PageAyah {
  surahNum: number;
  ayahNum: number;
  text: string;
  juz: number;
}

// Build page index at module load time — synchronous, from bundled data
const PAGE_INDEX_RAW: PageAyah[][] = Array.from({ length: 604 }, () => []);
const SURAH_START_PAGES_RAW: Record<number, number> = {};

for (let s = 1; s <= 114; s++) {
  const raw = QURAN_DATA[String(s)];
  if (!raw || raw.length === 0) continue;
  SURAH_START_PAGES_RAW[s] = raw[0].p;
  for (const a of raw) {
    const pi = a.p - 1;
    if (pi >= 0 && pi < 604) {
      PAGE_INDEX_RAW[pi].push({ surahNum: s, ayahNum: a.n, text: a.t, juz: a.j });
    }
  }
}

export const PAGE_INDEX: PageAyah[][] = PAGE_INDEX_RAW;
export const SURAH_START_PAGES: Record<number, number> = SURAH_START_PAGES_RAW;

export function getQuranPage(pageNum: number): PageAyah[] {
  if (pageNum < 1 || pageNum > 604) return [];
  return PAGE_INDEX[pageNum - 1];
}

export const BISMILLAH_TEXT: string = (QURAN_DATA['1']?.[0]?.t) ?? 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';

/** Returns the Quran page number for a given surah+ayah */
export function getAyahPage(surahNum: number, ayahNum: number): number {
  const raw = QURAN_DATA[String(surahNum)];
  if (!raw) return 1;
  const found = raw.find(a => a.n === ayahNum);
  return found?.p ?? raw[0]?.p ?? 1;
}

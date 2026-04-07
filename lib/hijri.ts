export interface HijriDate {
  year: number;
  month: number; // 1-12
  day: number;
}

export const LANG_LOCALE: Record<string, string> = {
  ar: 'ar-SA', zh: 'zh-CN', fr: 'fr-FR', tr: 'tr-TR',
  ur: 'ur-PK', bn: 'bn-BD', ru: 'ru-RU', id: 'id-ID',
  ms: 'ms-MY', fa: 'fa-IR', sw: 'sw-TZ', ha: 'ha-NG',
  es: 'es-ES', pt: 'pt-PT', en: 'en-US',
};

export const HIJRI_MONTHS_AR = [
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني',
  'جمادى الأولى', 'جمادى الثانية', 'رجب', 'شعبان',
  'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة',
];

export const HIJRI_MONTHS_EN = [
  'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani",
  'Jumada al-Ula', 'Jumada al-Thaniyah', 'Rajab', "Sha'ban",
  'Ramadan', 'Shawwal', 'Dhul Qadah', 'Dhul Hijjah',
];

const HIJRI_MONTHS: Record<string, string[]> = {
  ar: HIJRI_MONTHS_AR,
  en: HIJRI_MONTHS_EN,
  fr: ['Mouharram','Safar','Rabî al-Awwal','Rabî al-Thânî','Joumâdâ al-Ûlâ','Joumâdâ al-Thâniyya','Rajab','Chaâbân','Ramadân','Chawwâl','Dhû al-Qaâda','Dhû al-Hijja'],
  tr: ['Muharrem','Safer','Rebiülevvel','Rebiülahir','Cemaziyelevvel','Cemaziyelahir','Recep','Şaban','Ramazan','Şevval','Zilkade','Zilhicce'],
  ur: ['محرم','صفر','ربیع الاول','ربیع الثانی','جمادی الاول','جمادی الثانی','رجب','شعبان','رمضان','شوال','ذوالقعدہ','ذوالحجہ'],
  fa: ['محرم','صفر','ربیع‌الاول','ربیع‌الثانی','جمادی‌الاول','جمادی‌الثانی','رجب','شعبان','رمضان','شوال','ذیقعده','ذیحجه'],
  bn: ['মুহররম','সফর','রবিউল আউয়াল','রবিউস সানি','জমাদিউল আউয়াল','জমাদিউস সানি','রজব','শাবান','রমজান','শাওয়াল','জিলকদ','জিলহজ'],
  ru: ['Мухаррам','Сафар','Раби аль-Авваль','Раби аль-Ахир','Джумада аль-Уля','Джумада аль-Ахира','Раджаб','Шаабан','Рамадан','Шавваль','Зуль-Каада','Зуль-Хиджа'],
  zh: ['穆哈兰姆月','色法尔月','赖比尔·敖外鲁月','赖比尔·阿希尔月','主马达·敖外鲁月','主马达·阿希尔月','赖哲卜月','舍尔邦月','赖买丹月','闪瓦鲁月','都尔·盖尔达月','都尔·黑哲月'],
  id: ['Muharram','Safar','Rabiul Awal','Rabiul Akhir','Jumadil Awal','Jumadil Akhir','Rajab',"Sya'ban",'Ramadan','Syawal',"Dzulqa'dah",'Dzulhijjah'],
  ms: ['Muharram','Safar','Rabiulawal','Rabiulakhir','Jamadilawak','Jamadilakhir','Rejab','Syaaban','Ramadan','Syawal','Zulkaedah','Zulhijjah'],
  es: ['Muharram','Safar','Rabí al-Awwal','Rabí al-Thani','Jumada al-Ula','Jumada al-Thaniyya','Rajab','Shaabán','Ramadán','Shawwal','Dhul Qada','Dhul Hijja'],
  pt: ['Muharram','Safar','Rabi al-Awwal','Rabi al-Thani','Jumada al-Ula','Jumada al-Thaniya','Rajab',"Sha'ban",'Ramadão','Shawwal','Dhul Qadah','Dhul Hijjah'],
  sw: ['Muharamu','Safar','Rabii al-Awwal','Rabii al-Thani','Jumada al-Ula','Jumada al-Thaniyya','Rajab','Shaabani','Ramadhan','Shawwal','Dhul Qadah','Dhul Hijjah'],
  ha: ['Muharram','Safar',"Rabi'ul Awwal","Rabi'ul Akhir",'Jumada Awwal','Jumada Akhir','Rajab',"Sha'aban",'Ramadan','Shawwal',"Dhul Qa'da",'Dhul Hijja'],
};

function jdnFromGregorian(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

function hijriFromJdn(jdn: number): HijriDate {
  let l = jdn - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) +
    Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l =
    l -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;
  const year = 30 * n + j - 30;
  const month = Math.floor((24 * l) / 709);
  const day = l - Math.floor((709 * month) / 24);
  return { year, month, day };
}

export function gregorianToHijri(year: number, month: number, day: number): HijriDate {
  try {
    const date = new Date(year, month - 1, day);
    const fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
    const parts = fmt.formatToParts(date);
    const hy = parseInt(parts.find(p => p.type === 'year')!.value, 10);
    const hm = parseInt(parts.find(p => p.type === 'month')!.value, 10);
    const hd = parseInt(parts.find(p => p.type === 'day')!.value, 10);
    if (hy > 1000 && hm >= 1 && hm <= 12 && hd >= 1 && hd <= 30) {
      return { year: hy, month: hm, day: hd };
    }
  } catch (_) {}
  return hijriFromJdn(jdnFromGregorian(year, month, day));
}

export function hijriMonthName(month: number, lang: string): string {
  const idx = Math.max(0, Math.min(11, month - 1));
  const months = HIJRI_MONTHS[lang] ?? HIJRI_MONTHS_EN;
  return months[idx];
}

export function formatHijriDate(h: HijriDate, lang: string, eraSuffix?: string): string {
  const monthName = hijriMonthName(h.month, lang);
  const suffix = eraSuffix ?? (lang === 'ar' || lang === 'ur' || lang === 'fa' ? 'هـ' : 'AH');
  return `${h.day} ${monthName} ${h.year} ${suffix}`;
}

export function getDaysInGregorianMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

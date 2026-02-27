export interface HijriDate {
  year: number;
  month: number; // 1-12
  day: number;
}

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

export function gregorianToHijri(year: number, month: number, day: number): HijriDate {
  const jdn =
    Math.floor((1461 * (year + 4800 + Math.floor((month - 14) / 12))) / 4) +
    Math.floor((367 * (month - 2 - 12 * Math.floor((month - 14) / 12))) / 12) -
    Math.floor((3 * Math.floor((year + 4900 + Math.floor((month - 14) / 12)) / 100)) / 4) +
    day - 32075;

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

  const hy = 30 * n + j - 30;
  const hm = Math.floor((24 * (l - 1)) / 709);
  const hd = l - Math.floor((709 * hm) / 24);

  return { year: hy, month: hm + 1, day: hd };
}

export function hijriMonthName(month: number, lang: 'ar' | 'en'): string {
  const idx = Math.max(0, Math.min(11, month - 1));
  return lang === 'ar' ? HIJRI_MONTHS_AR[idx] : HIJRI_MONTHS_EN[idx];
}

export function formatHijriDate(h: HijriDate, lang: 'ar' | 'en'): string {
  const monthName = hijriMonthName(h.month, lang);
  if (lang === 'ar') {
    return `${h.day} ${monthName} ${h.year} هـ`;
  }
  return `${h.day} ${monthName} ${h.year} AH`;
}

export function getDaysInGregorianMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

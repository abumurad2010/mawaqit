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

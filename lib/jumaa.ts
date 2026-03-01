export type JumaaMode = 'auto' | 'dhuhr' | '1200' | '1215' | '1230' | '1300' | '1315' | '1330';

const DHUHR_COUNTRIES = new Set([
  'SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'YE', 'IQ', 'IR', 'AF',
  'EG', 'LY', 'DZ', 'TN', 'MA', 'JO', 'SY', 'LB', 'PS',
  'TR', 'AZ', 'KZ', 'UZ', 'TM', 'KG', 'TJ',
  'PK', 'BD', 'MY', 'ID', 'BN',
  'SD', 'SO', 'DJ', 'ER', 'ML', 'NE', 'MR', 'SN', 'GN', 'BF', 'NG',
  'TD', 'CM', 'KM', 'SL', 'GM', 'GW', 'MZ',
]);

export function resolveJumaaMode(
  mode: JumaaMode,
  countryCode: string | null,
): Exclude<JumaaMode, 'auto'> {
  if (mode !== 'auto') return mode;
  if (countryCode && DHUHR_COUNTRIES.has(countryCode)) return 'dhuhr';
  return '1300';
}

export function getJumaaTime(
  resolvedMode: Exclude<JumaaMode, 'auto'>,
  dhuhrDate: Date,
  locationUtcOffset: number | null,
): Date {
  if (resolvedMode === 'dhuhr') return dhuhrDate;

  const hour = parseInt(resolvedMode.slice(0, 2), 10);
  const minute = parseInt(resolvedMode.slice(2), 10);

  if (locationUtcOffset !== null) {
    const utcDecimalHours = hour + minute / 60 - locationUtcOffset;
    const utcMidnight = Date.UTC(
      dhuhrDate.getFullYear(),
      dhuhrDate.getMonth(),
      dhuhrDate.getDate(),
    );
    return new Date(utcMidnight + utcDecimalHours * 3600 * 1000);
  }

  return new Date(
    dhuhrDate.getFullYear(),
    dhuhrDate.getMonth(),
    dhuhrDate.getDate(),
    hour,
    minute,
    0,
    0,
  );
}

export function jumaaLabel(mode: JumaaMode): string {
  if (mode === 'auto') return 'Auto';
  if (mode === 'dhuhr') return 'Dhuhr';
  const h = parseInt(mode.slice(0, 2), 10);
  const m = mode.slice(2);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${period}`;
}

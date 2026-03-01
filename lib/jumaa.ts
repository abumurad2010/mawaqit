export type JumaaMode = 'auto' | 'offset';

const DHUHR_COUNTRIES = new Set([
  'SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'YE', 'IQ', 'IR', 'AF',
  'EG', 'LY', 'DZ', 'TN', 'MA', 'JO', 'SY', 'LB', 'PS',
  'TR', 'AZ', 'KZ', 'UZ', 'TM', 'KG', 'TJ',
  'PK', 'BD', 'MY', 'ID', 'BN',
  'SD', 'SO', 'DJ', 'ER', 'ML', 'NE', 'MR', 'SN', 'GN', 'BF', 'NG',
  'TD', 'CM', 'KM', 'SL', 'GM', 'GW', 'MZ',
]);

export function resolveJumaaOffset(
  mode: JumaaMode,
  offsetMinutes: number,
  countryCode: string | null,
): number {
  if (mode === 'offset') return offsetMinutes;
  if (countryCode && DHUHR_COUNTRIES.has(countryCode)) return 0;
  return 30;
}

export function getJumaaTime(
  offsetMinutes: number,
  dhuhrDate: Date,
): Date {
  return new Date(dhuhrDate.getTime() + offsetMinutes * 60 * 1000);
}

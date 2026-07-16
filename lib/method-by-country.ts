import type { CalcMethod } from './prayer-times';

const COUNTRY_METHODS: Record<string, CalcMethod> = {
  // North Africa
  EG: 'Egypt',
  DZ: 'Algeria',
  MA: 'Morocco',
  TN: 'Egypt',
  LY: 'Egypt',
  SD: 'Egypt',
  // Arabian Peninsula
  SA: 'MakkahUmmQura',
  AE: 'MakkahUmmQura',
  KW: 'Kuwait',
  QA: 'Qatar',
  BH: 'MakkahUmmQura',
  OM: 'MakkahUmmQura',
  YE: 'MakkahUmmQura',
  // Levant & Jordan
  JO: 'Jordan',
  SY: 'Jordan',
  IQ: 'MWL',
  PS: 'Jordan',
  LB: 'Jordan',
  // South & Southeast Asia
  PK: 'Karachi',
  AF: 'Karachi',
  BD: 'Karachi',
  IN: 'Karachi',
  SG: 'Singapore',
  MY: 'Singapore',
  ID: 'MWL',
  // Turkey & Central Asia
  TR: 'Turkey',
  AZ: 'Turkey',
  // North America
  US: 'ISNA',
  CA: 'ISNA',
  // Europe
  FR: 'France',
  BE: 'France',
  DE: 'MWL',
  GB: 'MWL',
  NL: 'MWL',
  CH: 'MWL',
  AT: 'MWL',
  SE: 'MWL',
  NO: 'MWL',
  DK: 'MWL',
  ES: 'MWL',
  IT: 'MWL',
  // Russia & Central Asia
  RU: 'Russia',
  KZ: 'Russia',
  UZ: 'Russia',
  TJ: 'Russia',
  TM: 'Russia',
  KG: 'Russia',
};

export function getMethodForCountry(countryCode: string | null): CalcMethod {
  if (!countryCode) return 'MWL';
  return COUNTRY_METHODS[countryCode.toUpperCase()] ?? 'MWL';
}

/**
 * Recommended (and default) method for a location. The Moonsighting Committee
 * Worldwide model (basis of the London Unified Prayer Timetable) is recommended
 * for the UK and for any location above ~48° latitude, where it carries its own
 * high-latitude handling — so no twilight-rule choice is needed. Everywhere else
 * falls back to the per-country default.
 */
export function getRecommendedMethod(countryCode: string | null, lat: number | null): CalcMethod {
  const cc = countryCode?.toUpperCase() ?? null;
  if (cc === 'GB' || (lat !== null && Math.abs(lat) > 48)) return 'Moonsighting';
  return getMethodForCountry(cc);
}

export const ALL_CALC_METHODS: CalcMethod[] = [
  'MWL', 'ISNA', 'Egypt', 'MakkahUmmQura', 'Karachi',
  'Jordan', 'Kuwait', 'Qatar', 'Algeria', 'Morocco',
  'Singapore', 'Turkey', 'France', 'Russia', 'Moonsighting', 'Custom',
];

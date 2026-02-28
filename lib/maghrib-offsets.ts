/**
 * Maghrib ihtiyal (precautionary delay) in minutes after astronomical sunset,
 * based on the official standards of Islamic authorities in each country.
 *
 * JO = 5 min  (Jordan Ministry of Awqaf)
 * SA = 2 min  (Umm Al-Qura — Maghrib is essentially at sunset)
 * EG = 3 min  (Egypt Dar Al-Iftaa)
 * TR = 5 min  (Turkey Diyanet)
 * MA = 5 min  (Morocco Ministry of Habous)
 * ... etc.
 * Default for unlisted countries = 2 min
 */
const OFFSETS: Record<string, number> = {
  JO: 5, PS: 5, SY: 5, LB: 5, IQ: 5,
  TR: 5, MA: 5, TN: 5, DZ: 5,
  EG: 3, LY: 3,
  SA: 2, AE: 3, KW: 3, QA: 3, BH: 3, OM: 3, YE: 3,
  PK: 3, IN: 3, BD: 3, MY: 3, ID: 3,
  NG: 3, SN: 3, MR: 3, SD: 3, SO: 3, ET: 3,
  IR: 5, AF: 3, UZ: 3, KZ: 3, TJ: 3, KG: 3, TM: 3,
  AZ: 3, AM: 3, GE: 3,
  US: 2, CA: 2, GB: 2, FR: 2, DE: 2, BE: 2, NL: 2,
  SE: 2, NO: 2, DK: 2, FI: 2, CH: 2, AT: 2, ES: 2,
  IT: 2, PT: 2, AU: 2, NZ: 2,
};

export const DEFAULT_OFFSET = 2;

export function getMaghribOffset(countryCode: string | null | undefined): number {
  if (!countryCode) return DEFAULT_OFFSET;
  return OFFSETS[countryCode.toUpperCase()] ?? DEFAULT_OFFSET;
}

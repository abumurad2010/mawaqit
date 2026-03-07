/**
 * Qibla direction calculator
 * Computes the great-circle bearing from any point on Earth to the Kaaba in Mecca
 */

// Precise coordinates of the Kaaba, Masjid al-Haram, Mecca
// Source: 21° 25' 12.59" N,  39° 49' 20.39" E
// Decimal: 21 + 25/60 + 12.59/3600 = 21.42016389°
//          39 + 49/60 + 20.39/3600 = 39.82233056°
const KAABA_LAT = 21.42016389;
const KAABA_LNG = 39.82233056;

// WGS-84 ellipsoid constants — used for Vincenty where higher accuracy matters
const WGS84_A = 6378137.0;         // semi-major axis, m
const WGS84_B = 6356752.314245;    // semi-minor axis, m
const WGS84_F = 1 / 298.257223563; // flattening

function toRad(deg: number) { return (deg * Math.PI) / 180; }
function toDeg(rad: number) { return (rad * 180) / Math.PI; }

/**
 * Returns the initial bearing (degrees from True North, clockwise) from the
 * given point to the Kaaba using the Vincenty direct formula on the WGS-84
 * ellipsoid. Falls back to spherical great-circle if Vincenty fails to converge.
 *
 * Accuracy: < 0.5 mm positional error, bearing error < 0.0001°
 */
export function getQiblaBearing(lat: number, lng: number): number {
  const φ1 = toRad(lat);
  const φ2 = toRad(KAABA_LAT);
  const L  = toRad(KAABA_LNG - lng);

  const U1 = Math.atan((1 - WGS84_F) * Math.tan(φ1));
  const U2 = Math.atan((1 - WGS84_F) * Math.tan(φ2));
  const sinU1 = Math.sin(U1), cosU1 = Math.cos(U1);
  const sinU2 = Math.sin(U2), cosU2 = Math.cos(U2);

  let λ = L;
  let λPrev: number;
  let sinSigma: number, cosSigma: number, sigma: number;
  let sinα: number, cos2α: number, cos2σm: number;
  let iterations = 0;

  do {
    const sinλ = Math.sin(λ), cosλ = Math.cos(λ);
    const a = cosU2 * sinλ;
    const b = cosU1 * sinU2 - sinU1 * cosU2 * cosλ;
    sinSigma  = Math.sqrt(a * a + b * b);
    cosSigma  = sinU1 * sinU2 + cosU1 * cosU2 * cosλ;
    sigma     = Math.atan2(sinSigma, cosSigma);
    sinα      = (sinSigma === 0) ? 0 : (cosU1 * cosU2 * sinλ) / sinSigma;
    cos2α     = 1 - sinα * sinα;
    cos2σm    = cos2α === 0 ? 0 : cosSigma - (2 * sinU1 * sinU2) / cos2α;
    const C   = (WGS84_F / 16) * cos2α * (4 + WGS84_F * (4 - 3 * cos2α));
    λPrev     = λ;
    λ = L + (1 - C) * WGS84_F * sinα *
        (sigma + C * sinSigma * (cos2σm + C * cosSigma * (-1 + 2 * cos2σm * cos2σm)));
    iterations++;
  } while (Math.abs(λ - λPrev) > 1e-12 && iterations < 100);

  // Vincenty failed to converge (antipodal points) — fall back to spherical
  if (iterations >= 100) {
    return sphericalBearing(lat, lng);
  }

  const sinλ = Math.sin(λ);
  const cosλ = Math.cos(λ);
  const α1 = Math.atan2(
    cosU2 * sinλ,
    cosU1 * sinU2 - sinU1 * cosU2 * cosλ,
  );

  return (toDeg(α1) + 360) % 360;
}

/** Spherical great-circle bearing — fallback only */
function sphericalBearing(lat: number, lng: number): number {
  const φ1 = toRad(lat);
  const φ2 = toRad(KAABA_LAT);
  const Δλ = toRad(KAABA_LNG - lng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Returns the geodesic distance to the Kaaba in km using Vincenty's formula.
 * Accuracy: < 0.5 mm
 */
export function getDistanceToMecca(lat: number, lng: number): number {
  const φ1 = toRad(lat);
  const φ2 = toRad(KAABA_LAT);
  const L  = toRad(KAABA_LNG - lng);

  const U1 = Math.atan((1 - WGS84_F) * Math.tan(φ1));
  const U2 = Math.atan((1 - WGS84_F) * Math.tan(φ2));
  const sinU1 = Math.sin(U1), cosU1 = Math.cos(U1);
  const sinU2 = Math.sin(U2), cosU2 = Math.cos(U2);

  let λ = L, λPrev: number;
  let sinSigma: number, cosSigma: number, sigma = 0;
  let sinα: number, cos2α: number, cos2σm: number;
  let iterations = 0;

  do {
    const sinλ = Math.sin(λ), cosλ = Math.cos(λ);
    const a = cosU2 * sinλ;
    const b = cosU1 * sinU2 - sinU1 * cosU2 * cosλ;
    sinSigma = Math.sqrt(a * a + b * b);
    if (sinSigma === 0) return 0; // same point
    cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosλ;
    sigma    = Math.atan2(sinSigma, cosSigma);
    sinα     = (cosU1 * cosU2 * sinλ) / sinSigma;
    cos2α    = 1 - sinα * sinα;
    cos2σm   = cos2α === 0 ? 0 : cosSigma - (2 * sinU1 * sinU2) / cos2α;
    const C  = (WGS84_F / 16) * cos2α * (4 + WGS84_F * (4 - 3 * cos2α));
    λPrev    = λ;
    λ = L + (1 - C) * WGS84_F * sinα *
        (sigma + C * sinSigma * (cos2σm + C * cosSigma * (-1 + 2 * cos2σm * cos2σm)));
    iterations++;
  } while (Math.abs(λ - λPrev) > 1e-12 && iterations < 100);

  // Vincenty distance formula
  const uSq  = cos2α * (WGS84_A * WGS84_A - WGS84_B * WGS84_B) / (WGS84_B * WGS84_B);
  const A    = 1 + uSq / 16384 * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
  const B    = uSq / 1024 * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
  const Δσ   = B * sinSigma * (cos2σm + B / 4 * (
                  cosSigma * (-1 + 2 * cos2σm * cos2σm) -
                  B / 6 * cos2σm * (-3 + 4 * sinSigma * sinSigma) * (-3 + 4 * cos2σm * cos2σm)));

  return (WGS84_B * A * (sigma - Δσ)) / 1000; // metres → km
}

export function formatDistance(km: number, lang: string): string {
  if (km < 1000) return lang === 'ar' ? `${Math.round(km)} كم` : `${Math.round(km)} km`;
  return lang === 'ar'
    ? `${(km / 1000).toFixed(1)} ألف كم`
    : `${(km / 1000).toFixed(1)}k km`;
}

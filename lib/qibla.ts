/**
 * Qibla direction calculator
 * Computes the great-circle bearing from any point on Earth to the Kaaba in Mecca
 */

// Coordinates of the Kaaba, Masjid al-Haram, Mecca
const KAABA_LAT = 21.4225;
const KAABA_LNG = 39.8262;

function toRad(deg: number) { return (deg * Math.PI) / 180; }
function toDeg(rad: number) { return (rad * 180) / Math.PI; }

/**
 * Returns the bearing (degrees from North, clockwise) to Mecca
 * from the given coordinates.
 */
export function getQiblaBearing(lat: number, lng: number): number {
  const φ1 = toRad(lat);
  const φ2 = toRad(KAABA_LAT);
  const Δλ = toRad(KAABA_LNG - lng);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  const bearing = toDeg(Math.atan2(y, x));
  return (bearing + 360) % 360;
}

/**
 * Returns the great-circle distance to Mecca in km
 */
export function getDistanceToMecca(lat: number, lng: number): number {
  const R = 6371; // Earth radius in km
  const φ1 = toRad(lat);
  const φ2 = toRad(KAABA_LAT);
  const Δφ = toRad(KAABA_LAT - lat);
  const Δλ = toRad(KAABA_LNG - lng);

  const a = Math.sin(Δφ / 2) ** 2 +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(km: number, lang: string): string {
  if (km < 1000) return lang === 'ar' ? `${Math.round(km)} كم` : `${Math.round(km)} km`;
  return lang === 'ar'
    ? `${(km / 1000).toFixed(1)} ألف كم`
    : `${(km / 1000).toFixed(1)}k km`;
}

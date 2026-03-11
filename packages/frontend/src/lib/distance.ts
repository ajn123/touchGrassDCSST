/**
 * Haversine distance calculation and coordinate parsing utilities.
 */

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Calculates the great-circle distance between two points using the Haversine formula.
 * Returns distance in miles.
 */
export function haversineDistanceMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Parses a "lat,lng" coordinate string (DynamoDB format) into an object.
 * Returns null if invalid.
 */
export function parseCoordinates(
  coords: string
): { lat: number; lng: number } | null {
  const parts = coords.split(",").map((c) => c.trim());
  if (parts.length !== 2) return null;
  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);
  if (isNaN(lat) || isNaN(lng)) return null;
  return { lat, lng };
}

/**
 * Formats a distance in miles for display: "< 0.1 mi", "0.3 mi", "2.1 mi", "12 mi"
 */
export function formatDistance(miles: number): string {
  if (miles < 0.1) return "< 0.1 mi";
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

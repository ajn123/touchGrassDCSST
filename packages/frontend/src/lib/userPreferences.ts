/**
 * Client-side user preference helpers.
 * Reads personalization signals from localStorage for the recommendations engine.
 */

const CATEGORY_PREFS_KEY = "touchgrass_category_prefs";
const CLICK_HISTORY_KEY = "touchgrass_click_history";

interface ClickHistoryEntry {
  eventId: string;
  category?: string;
  timestamp: number;
}

interface UserLocation {
  lat: number;
  lng: number;
}

export function getCategoryPreferences(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(CATEGORY_PREFS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function getClickHistory(): ClickHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(CLICK_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export async function getUserLocation(): Promise<UserLocation | null> {
  if (typeof window === "undefined" || !navigator.geolocation) return null;

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }),
      () => resolve(null),
      { timeout: 5000, maximumAge: 300000 }
    );
  });
}

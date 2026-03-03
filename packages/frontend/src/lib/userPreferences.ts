/**
 * Client-side user preference helpers.
 * Reads and writes personalization signals from localStorage for the recommendations engine.
 */

const CATEGORY_PREFS_KEY = "touchgrass_category_prefs";
const CLICK_HISTORY_KEY = "touchgrass_click_history";
const MAX_CLICK_HISTORY = 50;

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

export function setCategoryPreferences(categories: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CATEGORY_PREFS_KEY, JSON.stringify(categories));
  } catch {
    // ignore storage errors
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

export function addToClickHistory(eventId: string, category?: string): void {
  if (typeof window === "undefined") return;
  try {
    const current = getClickHistory();
    // Move to front if already exists, otherwise prepend
    const filtered = current.filter((c) => c.eventId !== eventId);
    const updated = [
      { eventId, category, timestamp: Date.now() },
      ...filtered,
    ].slice(0, MAX_CLICK_HISTORY);
    localStorage.setItem(CLICK_HISTORY_KEY, JSON.stringify(updated));
  } catch {
    // ignore storage errors
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

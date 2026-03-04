/**
 * Client-side quiz preference helpers.
 * Reads and writes "Find My Group" quiz answers from localStorage.
 */

const QUIZ_PREFS_KEY = "touchgrass_group_quiz";

export interface QuizPreferences {
  categories: string[];
  scheduleDays: string[];
  timePreference: "morning" | "evening" | "none";
  costPreference: "free" | "any" | "none";
}

export function getQuizPreferences(): QuizPreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(QUIZ_PREFS_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function saveQuizPreferences(prefs: QuizPreferences): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(QUIZ_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore storage errors
  }
}

export function clearQuizPreferences(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(QUIZ_PREFS_KEY);
  } catch {
    // ignore
  }
}

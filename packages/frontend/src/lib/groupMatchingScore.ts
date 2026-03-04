/**
 * Pure scoring functions for the "Find My Group" quiz.
 * Scores groups against user-selected preferences.
 */

import type { QuizPreferences } from "./groupQuizPreferences";

interface GroupLike {
  category: string;
  scheduleDay?: string;
  scheduleTime?: string;
  cost?: string;
  schedules?: any[];
}

export interface ScoreResult {
  score: number;
  reasons: string[];
}

export function scoreGroup(group: GroupLike, prefs: QuizPreferences): ScoreResult {
  let score = 0;
  const reasons: string[] = [];

  const groupCategories = group.category
    .split(",")
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);

  // --- Category Match (0–60 points, primary signal) ---
  const selectedLower = prefs.categories.map((c) => c.toLowerCase());
  const matchedCategories = selectedLower.filter((sel) =>
    groupCategories.includes(sel)
  );

  if (matchedCategories.length > 0) {
    const overlapRatio = matchedCategories.length / Math.max(groupCategories.length, 1);
    score += 30 + Math.round(overlapRatio * 30);
    const displayNames = matchedCategories.map(
      (c) => c.charAt(0).toUpperCase() + c.slice(1)
    );
    reasons.push(`Matches: ${displayNames.join(", ")}`);
  }

  // --- Schedule Match (0–20 points) ---
  if (prefs.scheduleDays.length > 0) {
    const groupDays = extractGroupDays(group);
    const dayMatches = prefs.scheduleDays.filter((d) =>
      groupDays.map((gd) => gd.toLowerCase()).includes(d.toLowerCase())
    );
    if (dayMatches.length > 0) {
      score += 15 + Math.min(dayMatches.length * 2, 5);
      reasons.push(`Meets ${dayMatches.join(", ")}`);
    } else if (groupDays.length === 0) {
      score += 5; // benefit of the doubt
    }
  } else {
    score += 10; // no day preference — partial credit
  }

  // --- Time Match (0–10 points) ---
  if (prefs.timePreference !== "none") {
    const groupTimes = extractGroupTimes(group);
    if (groupTimes.length > 0) {
      const hasMorning = groupTimes.some(isMorningTime);
      const hasEvening = groupTimes.some(isEveningTime);
      if (
        (prefs.timePreference === "morning" && hasMorning) ||
        (prefs.timePreference === "evening" && hasEvening)
      ) {
        score += 10;
        reasons.push(
          prefs.timePreference === "morning" ? "Morning schedule" : "Evening schedule"
        );
      }
    } else {
      score += 5; // benefit of the doubt
    }
  } else {
    score += 5; // no preference — partial credit
  }

  // --- Cost Match (0–10 points) ---
  if (prefs.costPreference === "free") {
    const costType = parseCost(group.cost);
    if (costType === "free") {
      score += 10;
      reasons.push("Free to join");
    } else if (costType === "variable") {
      score += 3;
    }
  } else {
    score += 5; // no preference — partial credit
  }

  return { score: Math.min(score, 100), reasons };
}

function extractGroupDays(group: GroupLike): string[] {
  if (group.scheduleDay) return [group.scheduleDay];
  if (group.schedules && Array.isArray(group.schedules)) {
    return group.schedules.flatMap((s: any) => s.days || []);
  }
  return [];
}

function extractGroupTimes(group: GroupLike): string[] {
  if (group.scheduleTime) return [group.scheduleTime];
  if (group.schedules && Array.isArray(group.schedules)) {
    return group.schedules.map((s: any) => s.time).filter(Boolean);
  }
  return [];
}

function isMorningTime(timeStr: string): boolean {
  const match = timeStr.match(/(\d{1,2}):?\d{0,2}\s*(AM|PM)/i);
  if (!match) return false;
  const period = match[2].toUpperCase();
  if (period === "AM") return true;
  const hour = parseInt(match[1]);
  if (period === "PM" && hour === 12) return true;
  return false;
}

function isEveningTime(timeStr: string): boolean {
  const match = timeStr.match(/(\d{1,2}):?\d{0,2}\s*(AM|PM)/i);
  if (!match) return false;
  const hour = parseInt(match[1]);
  const period = match[2].toUpperCase();
  return period === "PM" && hour >= 5;
}

function parseCost(cost: any): "free" | "variable" | "unknown" {
  if (!cost) return "unknown";
  if (typeof cost === "string") {
    if (cost.toLowerCase().includes("free") || cost === "0") return "free";
    return "variable";
  }
  if (typeof cost === "object") {
    if (cost.type === "free" || cost.amount === 0 || cost.amount === "0") return "free";
    return "variable";
  }
  return "unknown";
}

/**
 * Event importance scoring algorithm.
 * Computes a 0–100 score for each event using venue prestige,
 * title keywords, seasonal calendar, and other signals.
 */

// ── Venue Tiers ──────────────────────────────────────────────

const VENUE_TIER_1 = [
  "capital one arena",
  "convention center",
  "walter e. washington convention center",
  "national mall",
  "nationals park",
  "audi field",
  "the anthem",
  "kennedy center",
  "rfk stadium",
  "northwest stadium",
  "fedex field",
];

const VENUE_TIER_2 = [
  "9:30 club",
  "dar constitution hall",
  "echostage",
  "warner theatre",
  "mgm national harbor",
  "the fillmore",
  "merriweather post pavilion",
  "jiffy lube live",
  "wolf trap",
];

const VENUE_TIER_3 = [
  "lincoln theatre",
  "howard theatre",
  "black cat",
  "union stage",
  "songbyrd",
  "pie shop",
  "dc improv",
  "the hamilton",
  "city winery",
];

function getVenueScore(venue?: string): number {
  if (!venue) return 0;
  const v = venue.toLowerCase();
  if (VENUE_TIER_1.some((t) => v.includes(t))) return 30;
  if (VENUE_TIER_2.some((t) => v.includes(t))) return 20;
  if (VENUE_TIER_3.some((t) => v.includes(t))) return 10;
  return 0;
}

// ── Title Keywords ───────────────────────────────────────────

const TITLE_BOOST_HIGH: [RegExp, number][] = [
  [/\b(festival|championship|finals|playoffs|march madness)\b/i, 25],
  [/\b(world series|super bowl|inaugurat)\b/i, 25],
];

const TITLE_BOOST_MED: [RegExp, number][] = [
  [/\b(concert|tour|live|gala|marathon|expo|parade|rally)\b/i, 15],
  [/\b(ncaa|hyrox|cherry blossom|national|all[- ]?star)\b/i, 15],
];

const TITLE_PENALTY: [RegExp, number][] = [
  [/\b(open mic|trivia|happy hour|meetup|karaoke)\b/i, -5],
];

function getTitleKeywordScore(title?: string): number {
  if (!title) return 0;
  let score = 0;
  let matched = false;

  for (const [re, pts] of TITLE_BOOST_HIGH) {
    if (re.test(title)) {
      score = Math.max(score, pts);
      matched = true;
    }
  }
  if (!matched) {
    for (const [re, pts] of TITLE_BOOST_MED) {
      if (re.test(title)) {
        score = Math.max(score, pts);
        break;
      }
    }
  }

  for (const [re, pts] of TITLE_PENALTY) {
    if (re.test(title)) {
      score += pts;
      break;
    }
  }

  return score;
}

// ── Seasonal Calendar ────────────────────────────────────────

interface SeasonalPattern {
  pattern: RegExp;
  months: number[]; // 1-indexed
  points: number;
}

const SEASONAL_PATTERNS: SeasonalPattern[] = [
  { pattern: /cherry blossom/i, months: [3, 4], points: 20 },
  { pattern: /march madness|ncaa/i, months: [3, 4], points: 15 },
  { pattern: /fourth of july|july 4|independence day|4th of july/i, months: [6, 7], points: 20 },
  { pattern: /inaugurat/i, months: [1], points: 25 },
  { pattern: /halloween/i, months: [10], points: 15 },
  { pattern: /new year/i, months: [12, 1], points: 15 },
  { pattern: /memorial day/i, months: [5], points: 15 },
  { pattern: /thanksgiving/i, months: [11], points: 10 },
  { pattern: /christmas|holiday market/i, months: [11, 12], points: 15 },
];

function getSeasonalScore(title?: string, startDate?: string): number {
  if (!title || !startDate) return 0;
  const month = parseInt(startDate.split("-")[1], 10);
  if (!month) return 0;

  for (const sp of SEASONAL_PATTERNS) {
    if (sp.pattern.test(title) && sp.months.includes(month)) {
      return sp.points;
    }
  }
  return 0;
}

// ── Multi-day Duration ───────────────────────────────────────

function getDurationScore(startDate?: string, endDate?: string): number {
  if (!startDate || !endDate || startDate === endDate) return 0;
  const s = new Date(startDate + "T00:00:00");
  const e = new Date(endDate + "T00:00:00");
  const days = (e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24);
  if (days >= 3) return 10;
  if (days >= 2) return 5;
  return 0;
}

// ── Description Signals ──────────────────────────────────────

const DESC_KEYWORDS: [RegExp, number][] = [
  [/\b(sold out|selling fast|limited tickets)\b/i, 15],
  [/\b(national|international|world)\b/i, 10],
  [/\b(championship|tournament|competition)\b/i, 10],
  [/\b(thousand|10,?000|20,?000|50,?000)\b/i, 10],
];

function getDescriptionScore(description?: string): number {
  if (!description) return 0;
  let score = 0;
  for (const [re, pts] of DESC_KEYWORDS) {
    if (re.test(description)) {
      score += pts;
    }
  }
  return Math.min(score, 15);
}

// ── Cost Signal ──────────────────────────────────────────────

function getCostScore(cost?: { type?: string; amount?: string | number }): number {
  if (!cost) return 0;
  const amount = typeof cost.amount === "string" ? parseFloat(cost.amount) : cost.amount;
  if (!amount || isNaN(amount)) return 0;
  if (amount >= 100) return 10;
  if (amount >= 50) return 5;
  return 0;
}

// ── Main Scoring Function ────────────────────────────────────

export interface ScoredEvent {
  pk?: string;
  title?: string;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  venue?: string;
  image_url?: string;
  category?: string | string[];
  description?: string;
  cost?: { type?: string; amount?: string | number };
  [key: string]: any;
}

export function computeEventImportanceScore(event: ScoredEvent): number {
  const venue = getVenueScore(event.venue);
  const title = getTitleKeywordScore(event.title);
  const seasonal = getSeasonalScore(event.title, event.start_date);
  const duration = getDurationScore(event.start_date, event.end_date);
  const desc = getDescriptionScore(event.description);
  const cost = getCostScore(event.cost);

  return Math.min(100, Math.max(0, venue + title + seasonal + duration + desc + cost));
}

const BIG_EVENT_THRESHOLD = 40;
const MAX_BIG_EVENTS = 4;

/**
 * Filter weekend events to find "big" ones worth highlighting.
 * Returns top-scored events above threshold, capped at MAX_BIG_EVENTS.
 */
export function getBigEvents(events: ScoredEvent[]): ScoredEvent[] {
  const scored = events
    .map((e) => ({ event: e, score: computeEventImportanceScore(e) }))
    .filter((s) => s.score >= BIG_EVENT_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_BIG_EVENTS);

  return scored.map((s) => s.event);
}

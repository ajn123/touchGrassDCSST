export interface ItinerarySlot {
  timeSlot: "morning" | "lunch" | "afternoon" | "dinner" | "evening" | "night";
  time: string;
  type: "event" | "restaurant";
  title: string;
  venue: string;
  description: string;
  url?: string;
  image_url?: string;
  eventId?: string;
  category?: string;
  cost?: string;
  // Restaurant-specific
  rating?: number;
  address?: string;
}

export interface Itinerary {
  date: string;
  title: string;
  slots: ItinerarySlot[];
  tips: string;
}

export interface PerfectDayPreferences {
  date: string;
  categories: string[];
  budget: "free" | "moderate" | "any";
}

export interface EventForBucketing {
  pk: string;
  title: string;
  start_time?: string;
  start_date?: string;
  venue?: string;
  location?: string;
  category?: string | string[];
  description?: string;
  url?: string;
  image_url?: string;
  cost?: any;
}

/**
 * Parse a time string like "7:30pm", "7:30 PM", "10am" into hours (0-23)
 */
function parseTimeToHour(timeStr: string): number | null {
  if (!timeStr) return null;
  const cleaned = timeStr.trim().toLowerCase();

  const match = cleaned.match(/(\d{1,2})(?::(\d{2}))?\s*([ap]m)/);
  if (!match) return null;

  let hour = parseInt(match[1]);
  const period = match[3];

  if (period === "pm" && hour !== 12) hour += 12;
  if (period === "am" && hour === 12) hour = 0;

  return hour;
}

type TimeSlot = "morning" | "afternoon" | "evening" | "night";

export function bucketEventsByTime(events: EventForBucketing[]): Record<TimeSlot, EventForBucketing[]> {
  const buckets: Record<TimeSlot, EventForBucketing[]> = {
    morning: [],
    afternoon: [],
    evening: [],
    night: [],
  };

  for (const event of events) {
    const hour = parseTimeToHour(event.start_time || "");

    if (hour === null) {
      // No time — put in afternoon as a safe default
      buckets.afternoon.push(event);
    } else if (hour < 12) {
      buckets.morning.push(event);
    } else if (hour < 17) {
      buckets.afternoon.push(event);
    } else if (hour < 20) {
      buckets.evening.push(event);
    } else {
      buckets.night.push(event);
    }
  }

  return buckets;
}

export function formatEventsForPrompt(
  buckets: Record<TimeSlot, EventForBucketing[]>,
): string {
  const sections: string[] = [];

  for (const [slot, events] of Object.entries(buckets)) {
    if (events.length === 0) continue;
    const lines = events.slice(0, 8).map((e) => {
      const category = Array.isArray(e.category) ? e.category[0] : e.category;
      const cost = typeof e.cost === "object" ? e.cost?.amount : e.cost;
      return `- "${e.title}" at ${e.venue || "TBD"} (${category || "General"})${cost ? ` — ${cost}` : ""}${e.start_time ? ` at ${e.start_time}` : ""}`;
    });
    sections.push(`### ${slot.charAt(0).toUpperCase() + slot.slice(1)} Events\n${lines.join("\n")}`);
  }

  return sections.length > 0
    ? sections.join("\n\n")
    : "No events found for this date.";
}

export function buildItineraryPrompt(
  eventsText: string,
  restaurantsText: string,
  foodEvents: EventForBucketing[],
  preferences: PerfectDayPreferences,
): string {
  const dateObj = new Date(preferences.date + "T12:00:00");
  const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const foodEventsSection = foodEvents.length > 0
    ? `\n\nFOOD & DRINK EVENTS (prefer these over restaurants when they fit):\n${foodEvents.map((e) => `- "${e.title}" at ${e.venue || "TBD"}${e.start_time ? ` at ${e.start_time}` : ""}`).join("\n")}`
    : "";

  return `You are a fun, opinionated DC local planning the perfect day out. Given these REAL events and restaurants, create a cohesive day itinerary for ${dayName}.

AVAILABLE EVENTS BY TIME:
${eventsText}
${foodEventsSection}

RESTAURANT OPTIONS (from Google Places):
${restaurantsText}

USER PREFERENCES:
- Interests: ${preferences.categories.length > 0 ? preferences.categories.join(", ") : "open to anything"}
- Budget: ${preferences.budget}

INSTRUCTIONS:
- Pick 4-6 slots that create a fun, varied day from morning to night
- Include 1-2 dining breaks (use food events if available, otherwise restaurants)
- Each activity should flow naturally to the next (consider neighborhoods/proximity)
- Add personality — explain WHY each pick is great
- Be specific with times
- Only use events and restaurants from the lists above — do NOT invent places

Return ONLY valid JSON (no markdown fences) with this structure:
{
  "title": "A catchy title for this day plan (e.g., 'Arts, Eats & Beats: Your Perfect Saturday')",
  "slots": [
    {
      "timeSlot": "morning|lunch|afternoon|dinner|evening|night",
      "time": "10:00 AM",
      "type": "event|restaurant",
      "title": "Event or restaurant name",
      "venue": "Venue name",
      "description": "2-3 sentences about why this is great and what to expect. Be specific and fun.",
      "category": "category name",
      "cost": "free or price"
    }
  ],
  "tips": "1-2 practical tips for the day (transit, what to wear, etc.)"
}

CRITICAL: Use single quotes for any quotes inside string values. Output must be parseable by JSON.parse().`;
}

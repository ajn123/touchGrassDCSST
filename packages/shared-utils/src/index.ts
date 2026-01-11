/**
 * Shared utility functions for event processing across the TouchGrass DC application
 * This package provides consistent date parsing, event normalization, and other utilities
 * that are used across different parts of the application.
 */

// ============================================================================
// DATE PARSING UTILITIES
// ============================================================================

// Standardized event interface
export interface NormalizedEvent {
  // Core fields
  title: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;

  // Location fields
  location?: string;
  venue?: string;
  coordinates?: string; // "lat,lng" format

  // Categorization
  category?: string | string[];

  // Media & Links
  image_url?: string;
  url?: string;
  socials?: {
    website?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };

  // Cost information
  cost?: {
    type: "free" | "fixed" | "variable";
    currency: string;
    amount: string | number;
  };

  // Metadata
  source?: string;
  external_id?: string;
  isPublic?: boolean;
  is_virtual?: boolean;

  // Optional fields for specific sources
  publisher?: string;
  ticket_links?: string[];
  confidence?: number;
  extractionMethod?: string;
}

/**
 * Generate a consistent event ID
 */
export function generateEventId(
  event: NormalizedEvent,
  source?: string
): string {
  // Handle undefined or invalid title
  const title = event.title || "untitled-event";
  const titleSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const sourcePrefix = source ? `${source.toUpperCase()}-` : "";
  // Use start_date as part of the deterministic ID, but don't use any timestamp
  const startDatePart = event.start_date ? `-${event.start_date}` : "";
  return `EVENT-${sourcePrefix}${titleSlug}${startDatePart}`;
}

/**
 * Normalize date strings to consistent format
 */
export function normalizeDate(dateStr?: string): string | undefined {
  if (!dateStr) return undefined;

  try {
    // Handle various date formats
    let date: Date;

    if (dateStr.includes("T")) {
      // Already has time component
      date = new Date(dateStr);
    } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // YYYY-MM-DD format
      date = new Date(dateStr + "T00:00:00");
    } else {
      // Try to parse as-is
      date = new Date(dateStr);
    }

    if (isNaN(date.getTime())) return undefined;

    return date.toISOString().split("T")[0]; // Return YYYY-MM-DD
  } catch {
    return undefined;
  }
}

/**
 * Normalize time strings to consistent format
 */
export function normalizeTime(timeStr?: string): string | undefined {
  if (!timeStr) return undefined;

  try {
    // Handle various time formats
    const time = timeStr.trim();

    // If it's already in HH:MM format
    if (time.match(/^\d{1,2}:\d{2}$/)) {
      return time;
    }

    // If it has AM/PM
    if (time.match(/\d{1,2}:\d{2}\s*(AM|PM)/i)) {
      return time;
    }

    // Try to parse and format
    const date = new Date(`2000-01-01T${time}`);
    if (!isNaN(date.getTime())) {
      return date.toTimeString().split(" ")[0].substring(0, 5);
    }

    return time;
  } catch {
    return timeStr;
  }
}

/**
 * Normalize category to consistent format
 */
export function normalizeCategory(category?: string | string[]): string {
  if (!category) return "General";

  const categories = Array.isArray(category) ? category : [category];
  const normalizedCategories = categories.map((cat) => {
    const normalized = cat.toLowerCase().trim();

    // Map common variations to standard categories
    const categoryMap: { [key: string]: string } = {
      music: "Music",
      concert: "Music",
      jazz: "Music",
      festival: "Festival",
      parade: "Festival",
      sports: "Sports",
      soccer: "Sports",
      museum: "Museum",
      art: "Arts & Culture",
      culture: "Arts & Culture",
      food: "Food & Drink",
      drink: "Food & Drink",
      networking: "Networking",
      business: "Networking",
      education: "Education",
      workshop: "Education",
      community: "Community",
      volunteer: "Community",
      general: "General",
    };

    return categoryMap[normalized] || cat;
  });

  return normalizedCategories.join(",");
}

/**
 * Normalize cost information
 */
export function normalizeCost(cost?: any): NormalizedEvent["cost"] {
  if (!cost) return undefined;

  if (typeof cost === "string") {
    const costStr = cost.toLowerCase();
    if (costStr.includes("free")) {
      return { type: "free", currency: "USD", amount: 0 };
    }

    // Try to extract amount from string
    const amountMatch = costStr.match(/\$?(\d+(?:\.\d{2})?)/);
    if (amountMatch) {
      return {
        type: "fixed",
        currency: "USD",
        amount: parseFloat(amountMatch[1]),
      };
    }
  }

  if (typeof cost === "object") {
    return {
      type: cost.type || "fixed",
      currency: cost.currency || "USD",
      amount: cost.amount || 0,
    };
  }

  return undefined;
}

/**
 * Normalize coordinates
 */
export function normalizeCoordinates(coordinates?: any): string | undefined {
  if (!coordinates) return undefined;

  if (typeof coordinates === "string") {
    return coordinates;
  }

  if (Array.isArray(coordinates) && coordinates.length >= 2) {
    return `${coordinates[0]},${coordinates[1]}`;
  }

  if (coordinates.latitude && coordinates.longitude) {
    return `${coordinates.latitude},${coordinates.longitude}`;
  }

  return undefined;
}

/**
 * Parse various date formats into a consistent YYYY-MM-DD string format
 * Handles multiple input formats including ISO strings, date objects, and various text formats
 */
export function parseDate(dateValue: any): string | undefined {
  if (!dateValue) return undefined;

  try {
    let date: Date;

    if (typeof dateValue === "string") {
      // Handle various string formats
      if (dateValue.includes("T")) {
        // Already has time component (ISO format)
        date = new Date(dateValue);
      } else if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // YYYY-MM-DD format
        date = new Date(dateValue + "T00:00:00");
      } else {
        // Try to parse as-is
        date = new Date(dateValue);
      }
    } else if (dateValue instanceof Date) {
      date = dateValue;
    } else if (typeof dateValue === "number") {
      // Unix timestamp
      date = new Date(dateValue);
    } else {
      return undefined;
    }

    // Validate the date
    if (isNaN(date.getTime())) {
      return undefined;
    }

    // Return in YYYY-MM-DD format
    return date.toISOString().split("T")[0];
  } catch {
    return undefined;
  }
}

/**
 * Parse date with time into ISO string format
 * Useful for events that need precise timing
 */
export function parseDateTime(dateValue: any): string | undefined {
  if (!dateValue) return undefined;

  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      return undefined;
    }
    return date.toISOString();
  } catch {
    return undefined;
  }
}

/**
 * Advanced date parsing for crawler data with multiple formats
 * Handles complex date strings from web scraping
 */
export function parseComplexDate(dateText: string): string | null {
  if (!dateText || dateText.trim() === "") return null;

  // Common date patterns found in event listings
  const patterns = [
    // "January 15, 2024 at 7:00 PM"
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\s+at\s+(\d{1,2}):(\d{2})\s+(AM|PM)/i,

    // "Jan 15, 2024 at 7:00 PM"
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})\s+at\s+(\d{1,2}):(\d{2})\s+(AM|PM)/i,

    // "January 15, 2024"
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/i,

    // "Jan 15, 2024"
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})/i,

    // ISO format
    /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/,

    // Simple date format
    /(\d{4}-\d{2}-\d{2})/,
  ];

  for (const pattern of patterns) {
    const match = dateText.match(pattern);
    if (match) {
      try {
        if (pattern.source.includes("at")) {
          // Handle date with time
          const month = match[1];
          const day = match[2];
          const year = match[3];
          const hour = parseInt(match[4]);
          const minute = match[5];
          const ampm = match[6];

          let hour24 = hour;
          if (ampm.toLowerCase() === "pm" && hour !== 12) hour24 += 12;
          if (ampm.toLowerCase() === "am" && hour === 12) hour24 = 0;

          const date = new Date(
            parseInt(year),
            getMonthIndex(month),
            parseInt(day),
            hour24,
            parseInt(minute)
          );
          return date.toISOString();
        } else if (pattern.source.includes("January|February|March")) {
          // Handle full month names
          const month = match[1];
          const day = match[2];
          const year = match[3];
          const date = new Date(
            parseInt(year),
            getMonthIndex(month),
            parseInt(day)
          );
          return date.toISOString();
        } else if (pattern.source.includes("Jan|Feb|Mar")) {
          // Handle short month names
          const month = match[1];
          const day = match[2];
          const year = match[3];
          const date = new Date(
            parseInt(year),
            getMonthIndex(month),
            parseInt(day)
          );
          return date.toISOString();
        } else {
          // ISO format or simple date
          return new Date(match[1]).toISOString();
        }
      } catch (error) {
        console.error("Error parsing complex date:", error);
      }
    }
  }

  return null;
}

/**
 * Helper function to get month index from month name
 */
function getMonthIndex(month: string): number {
  const months: { [key: string]: number } = {
    january: 0,
    jan: 0,
    february: 1,
    feb: 1,
    march: 2,
    mar: 2,
    april: 3,
    apr: 3,
    may: 4,
    june: 5,
    jun: 5,
    july: 6,
    jul: 6,
    august: 7,
    aug: 7,
    september: 8,
    sep: 8,
    october: 9,
    oct: 9,
    november: 10,
    nov: 10,
    december: 11,
    dec: 11,
  };

  return months[month.toLowerCase()] ?? 0;
}

// ============================================================================
// EVENT NORMALIZATION UTILITIES
// ============================================================================

/**
 * Standardized event interface used across the application
 */
export interface NormalizedEvent {
  // Core fields
  title: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;

  // Location fields
  location?: string;
  venue?: string;
  coordinates?: string; // "lat,lng" format

  // Categorization
  category?: string | string[];

  // Media & Links
  image_url?: string;
  url?: string;
  socials?: {
    website?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };

  // Cost information
  cost?: {
    type: "free" | "fixed" | "variable";
    currency: string;
    amount: string | number;
  };

  // Metadata
  source?: string;
  external_id?: string;
  isPublic?: boolean;
  is_virtual?: boolean;

  // Optional fields for specific sources
  publisher?: string;
  ticket_links?: string[];
  confidence?: number;
  extractionMethod?: string;
}

/**
 * Parse cost amount from various formats
 */
export function parseCostAmount(amount: any): number {
  if (typeof amount === "number") return amount;
  if (typeof amount === "string") {
    const parsed = parseFloat(amount);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * Parse categories from various formats (string, array, etc.)
 */
export function parseCategories(category: any): string[] {
  if (!category) return [];
  if (Array.isArray(category)) return category;
  if (typeof category === "string") {
    return category
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
  }
  return [];
}

// ============================================================================
// TRANSFORMATION UTILITIES
// ============================================================================

/**
 * Transform DynamoDB event to OpenSearch format
 */
export function transformEventForOpenSearch(event: any): any {
  const eventId = event.pk || `event-${Date.now()}-${Math.random()}`;

  return {
    id: eventId,
    type: "event",
    title: event.title || "",
    description: event.description || "",
    category: parseCategories(event.category),
    location: event.location || "",
    venue: event.venue || "",
    cost: {
      type: event.cost?.type || "unknown",
      amount: parseCostAmount(event.cost?.amount),
      currency: event.cost?.currency || "USD",
    },
    image_url: event.image_url || "",
    socials: event.socials || {},
    isPublic: event.isPublic === "true" || event.isPublic === true,
    createdAt: event.createdAt || Date.now(),
    date: parseDate(event.date || event.start_date),
    start_date: parseDate(event.start_date || event.date),
    end_date: parseDate(event.end_date),
  };
}

/**
 * Transform OpenWebNinja event to normalized format
 */
export function transformOpenWebNinjaEvent(event: any): NormalizedEvent {
  return {
    title: event.name || event.title || "",
    description: event.description || "",
    start_date: event.start_time
      ? parseDate(event.start_time.split(" ")[0])
      : undefined,
    start_time: event.start_time
      ? event.start_time.split(" ")[1] || ""
      : undefined,
    end_date: event.end_time
      ? parseDate(event.end_time.split(" ")[0])
      : undefined,
    end_time: event.end_time ? event.end_time.split(" ")[1] || "" : undefined,
    location: event.venue?.address || "",
    venue: event.venue?.name || "",
    coordinates: event.venue?.coordinates
      ? `${event.venue.coordinates.lat},${event.venue.coordinates.lng}`
      : undefined,
    category: "General",
    image_url: event.thumbnail || undefined,
    url: event.link || undefined,
    cost: {
      type: "unknown" as "free" | "fixed" | "variable",
      currency: "USD",
      amount: 0,
    },
    source: "openwebninja",
    external_id: event.event_id,
    isPublic: true,
    is_virtual: event.is_virtual || false,
    publisher: event.publisher,
    ticket_links: event.ticket_links?.map((t: any) => t.link) || [],
  };
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validate if an event has required fields
 */
export function validateEvent(event: any): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!event.title || event.title.trim() === "") {
    errors.push("Title is required");
  }

  if (!event.start_date && !event.start_time) {
    errors.push("Start date or time is required");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize event data for safe storage
 */
export function sanitizeEvent(event: any): any {
  return {
    ...event,
    title: event.title?.trim() || "",
    description:
      event.description
        ?.trim()
        ?.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") ||
      "",
    location: event.location?.trim() || "",
    venue: event.venue?.trim() || "",
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Date utilities
  parseDate,
  parseDateTime,
  parseComplexDate,

  // Event utilities
  parseCostAmount,
  parseCategories,
  generateEventId,
  transformEventForOpenSearch,
  transformOpenWebNinjaEvent,
  validateEvent,
  sanitizeEvent,
};

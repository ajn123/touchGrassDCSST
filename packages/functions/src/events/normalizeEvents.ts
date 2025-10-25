import { Handler } from "aws-lambda";
import { Resource } from "sst";

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});

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
  is_public?: boolean;
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
  const timestamp = Date.now();

  // Handle undefined or invalid title
  const title = event.title || "untitled-event";
  const titleSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const sourcePrefix = source ? `${source.toUpperCase()}-` : "";
  return `EVENT-${sourcePrefix}${titleSlug}-${timestamp}`;
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
 * Transform OpenWebNinja event to normalized format
 */
export function transformOpenWebNinjaEvent(event: any): NormalizedEvent {
  const startDate = event.start_time
    ? event.start_time.split(" ")[0]
    : undefined;
  const startTime = event.start_time
    ? event.start_time.split(" ")[1]
    : undefined;
  const endDate = event.end_time ? event.end_time.split(" ")[0] : undefined;
  const endTime = event.end_time ? event.end_time.split(" ")[1] : undefined;

  return {
    title: event.name,
    description: event.description,
    start_date: normalizeDate(startDate),
    end_date: normalizeDate(endDate),
    start_time: normalizeTime(startTime),
    end_time: normalizeTime(endTime),
    location: event.venue?.address || event.venue?.name,
    venue: event.venue?.name,
    coordinates: normalizeCoordinates(event.venue?.coordinates),
    is_virtual: event.is_virtual,
    url: event.link,
    image_url: event.thumbnail,
    publisher: event.publisher,
    source: "openwebninja",
    external_id: event.event_id,
    is_public: true,
  };
}

/**
 * Transform Washingtonian event to normalized format
 */
export function transformWashingtonianEvent(event: any): NormalizedEvent {
  return {
    title: event.title,
    description: event.description,
    start_date: normalizeDate(event.date),
    start_time: normalizeTime(event.time),
    location: event.location || event.venue,
    venue: event.venue,
    url: event.url,
    image_url: event.image_url,
    source: "washingtonian",
    is_public: true,
  };
}

/**
 * Transform crawler event to normalized format
 */
export function transformCrawlerEvent(event: any): NormalizedEvent {
  return {
    title: event.title,
    description: event.description,
    start_date: normalizeDate(event.start_date || event.date),
    end_date: normalizeDate(event.end_date),
    location: event.location,
    venue: event.venue,
    category: normalizeCategory(event.category),
    image_url: event.image_url,
    cost: normalizeCost(event.cost),
    socials: event.socials,
    is_public: event.is_public ?? true,
    source: "crawler",
  };
}

// Dummy saveEvents function to mimic member function, you will need to implement it or import if defined elsewhere.
export async function saveEvents(
  normalizedEvents: NormalizedEvent[],
  source?: string
): Promise<{ eventIds: string[]; savedEvents: NormalizedEvent[] }> {
  // Placeholder implementation, real save logic to be provided elsewhere.
  // This should insert to DynamoDB and return eventIds and savedEvents.
  // Implement or import this as needed.
  return {
    eventIds: normalizedEvents.map((ev) => generateEventId(ev, source)),
    savedEvents: normalizedEvents,
  };
}

export const callReindexEvents = async (events: NormalizedEvent[]) => {
  for (const event of events) {
    console.log(`🔄 Reindexing event: ${event.title}`);
    const response = await fetch(`${Resource.Api.url}/events/reindex`, {
      method: "POST",
      body: JSON.stringify(event),
    });
    if (!response.ok) {
      throw new Error(`Failed to reindex event: ${response.statusText}`);
    }
    const result = await response.json();
    console.log(`✅ Successfully reindexed event: ${event.title}`);
    console.log(`⏱️ Execution time: ${result.executionTime}ms`);
    console.log(
      `📊 Event IDs: ${result.eventIds.slice(0, 3).join(", ")}${
        result.eventIds.length > 3 ? "..." : ""
      }`
    );
  }
};

// Lambda handler for event normalization
export const handler: Handler = async (event) => {
  const startTime = Date.now();

  try {
    console.log("🚀 Lambda normalizeEvents handler started");
    console.log("📦 Event body:", JSON.stringify(event.body, null, 2));

    // Parse the request body
    const body =
      typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    const { events, source, eventType } = body;

    // Validate input
    if (!events || !Array.isArray(events)) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          error: "Events array is required",
          received: typeof events,
        }),
      };
    }

    console.log(
      `📊 Processing ${events.length} events from source: ${
        source || "unknown"
      }`
    );

    const normalizedEvents: NormalizedEvent[] = [];

    // Transform events based on type
    for (const rawEvent of events) {
      let normalizedEvent: NormalizedEvent;

      try {
        switch (eventType) {
          case "openwebninja":
            normalizedEvent = transformOpenWebNinjaEvent(rawEvent);
            break;
          case "washingtonian":
            normalizedEvent = transformWashingtonianEvent(rawEvent);
            break;
          case "crawler":
            normalizedEvent = transformCrawlerEvent(rawEvent);
            break;
          default:
            // Assume it's already in normalized format
            normalizedEvent = rawEvent;
        }

        normalizedEvents.push(normalizedEvent);
      } catch (transformError) {
        console.error(`❌ Error transforming event:`, transformError);
        console.error(`📄 Raw event:`, JSON.stringify(rawEvent, null, 2));
        // Continue with other events even if one fails
      }
    }

    console.log(`✅ Successfully normalized ${normalizedEvents.length} events`);

    // Save all events
    const saveResult = await saveEvents(normalizedEvents, source)
      .then(async (result) => {
        await callReindexEvents(result.savedEvents);
        return result;
      })
      .catch((error) => {
        console.error(`❌ Error saving events:`, error);
        throw error;
      });

    const totalTime = Date.now() - startTime;
    console.log(`⏱️ Lambda completed in ${totalTime}ms`);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        success: true,
        savedCount: saveResult.eventIds.length,
        normalizedCount: normalizedEvents.length,
        eventIds: saveResult.eventIds,
        savedEvents: saveResult.savedEvents,
        message: `Successfully normalized and saved ${saveResult.eventIds.length} events`,
        executionTime: totalTime,
        source: source || "unknown",
        eventType: eventType || "unknown",
      }),
    };
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(
      `❌ Error in normalizeEvents Lambda after ${totalTime}ms:`,
      error
    );

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: "Failed to normalize and save events",
        details: error instanceof Error ? error.message : "Unknown error",
        executionTime: totalTime,
      }),
    };
  }
};

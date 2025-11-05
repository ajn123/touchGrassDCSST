import {
  NormalizedEvent,
  generateEventId,
  normalizeCategory,
  normalizeCoordinates,
  normalizeCost,
  normalizeDate,
  normalizeTime,
} from "@touchgrass/shared-utils";
import { Handler } from "aws-lambda";
import { Resource } from "sst";

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
    socials: event.link ? { website: event.link } : undefined,
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
    socials: event.url ? { website: event.url } : undefined,
    image_url: event.image_url,
    source: "washingtonian",
    is_public: true,
  };
}

/**
 * Transform ClockOut DC event to normalized format
 */
export function transformClockOutEvent(event: any): NormalizedEvent {
  // Parse time range like "10am-2pm" into start_time and end_time
  let start_time: string | undefined = undefined;
  let end_time: string | undefined = undefined;

  if (event.time) {
    const timeStr = event.time.toLowerCase();

    // Handle keyword times
    if (timeStr.includes("sunset")) {
      start_time = "sunset";
    }
    // Handle time ranges like "10am-2pm", "7-11pm"
    else if (timeStr.includes("-")) {
      const timeMatch = timeStr.match(
        /^(\d{1,2}(?::\d{2})?)([ap]m)?\s*-\s*(\d{1,2}(?::\d{2})?)([ap]m)$/
      );
      if (timeMatch) {
        const [, start, startPeriod, end, endPeriod] = timeMatch;
        start_time = normalizeTime(start + (startPeriod || endPeriod || ""));
        end_time = normalizeTime(end + endPeriod);
      } else {
        // Fallback: split on dash
        const parts = timeStr.split("-");
        if (parts.length === 2) {
          start_time = normalizeTime(parts[0].trim());
          end_time = normalizeTime(parts[1].trim());
        }
      }
    }
    // Single time like "7pm", "10am"
    else {
      start_time = normalizeTime(event.time);
    }
  }

  return {
    title: event.title,
    description: event.description,
    start_date: normalizeDate(event.date),
    start_time: start_time,
    end_time: end_time,
    location: event.location,
    venue: event.venue,
    category: normalizeCategory(event.category),
    url: event.url,
    cost: normalizeCost(event.price),
    socials: event.url ? { website: event.url } : undefined,
    is_public: true,
    source: "clockoutdc",
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
    socials: event.socials ?? (event.url ? { website: event.url } : undefined),
    is_public: event.is_public ?? true,
    source: "crawler",
  };
}

/**
 * Transform Eventbrite event to normalized format
 */
export function transformEventbriteEvent(event: any): NormalizedEvent {
  // Parse time range like "7:30 PM - 9:30 PM" into start_time and end_time
  let start_time: string | undefined = undefined;
  let end_time: string | undefined = undefined;

  if (event.time) {
    const timeStr = event.time.toLowerCase();

    // Handle time ranges like "7:30 PM - 9:30 PM", "7-11pm"
    if (timeStr.includes("-")) {
      const timeMatch = timeStr.match(
        /^(\d{1,2}(?::\d{2})?)\s*([ap]m)?\s*-\s*(\d{1,2}(?::\d{2})?)\s*([ap]m)$/
      );
      if (timeMatch) {
        const [, start, startPeriod, end, endPeriod] = timeMatch;
        start_time = normalizeTime(start + (startPeriod || endPeriod || ""));
        end_time = normalizeTime(end + endPeriod);
      } else {
        // Fallback: split on dash
        const parts = timeStr.split("-");
        if (parts.length === 2) {
          start_time = normalizeTime(parts[0].trim());
          end_time = normalizeTime(parts[1].trim());
        }
      }
    }
    // Single time like "7:30 PM", "7pm"
    else {
      start_time = normalizeTime(event.time);
    }
  }

  return {
    title: event.title,
    description: event.description,
    start_date: normalizeDate(event.start_date || event.date),
    end_date: normalizeDate(event.end_date),
    start_time: start_time,
    end_time: end_time,
    location: event.location,
    venue: event.venue,
    category: normalizeCategory(event.category),
    url: event.url,
    cost: normalizeCost(event.price),
    image_url: event.image_url,
    socials: event.url ? { website: event.url } : undefined,
    is_public: true,
    source: "eventbrite",
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
export const handler: Handler = async (event, context, callback) => {
  const startTime = Date.now();

  try {
    console.log("🚀 Lambda normalizeEvents handler started");

    console.log("📦 Event body:", JSON.stringify(event));

    // Parse the request body - handle both API Gateway and Step Functions formats
    let body;
    if (event.body) {
      // API Gateway format
      body =
        typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    } else {
      // Step Functions format - data is passed directly in the event
      body = event;
    }

    console.log("📦 Parsed body:", JSON.stringify(body));

    const { events, source, eventType, testMode } = body;

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
          case "clockoutdc":
            normalizedEvent = transformClockOutEvent(rawEvent);
            break;
          case "eventbrite":
            normalizedEvent = transformEventbriteEvent(rawEvent);
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

    return JSON.stringify({
      success: true,
      events: normalizedEvents,
      source: source || "unknown",
      eventType: eventType || "unknown",
    });
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

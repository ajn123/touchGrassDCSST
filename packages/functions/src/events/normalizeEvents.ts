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
 * Static venue-to-coordinates map for known DC-area venues.
 * Keys are lowercase for case-insensitive matching.
 */
const VENUE_COORDINATES: Record<string, string> = {
  // Music Venues
  "9:30 club": "38.9198,-77.0236",
  "the anthem": "38.8782,-77.0232",
  "the fillmore silver spring": "38.9951,-77.0293",
  "echostage": "38.9186,-76.9726",
  "the howard theatre": "38.9162,-77.0193",
  "dc9 nightclub": "38.9157,-77.0236",
  "pearl street warehouse": "38.8785,-77.0237",
  "union stage": "38.8781,-77.0234",
  "pie shop": "38.9229,-77.0024",
  "songbyrd": "38.9224,-77.0418",
  "black cat": "38.9145,-77.0354",
  "jammin java": "38.8946,-77.1349",
  "the hamilton live": "38.8976,-77.0323",
  "blues alley": "38.9047,-77.0604",
  "wolf trap": "38.9364,-77.2654",
  "jiffy lube live": "38.9129,-77.5455",
  "merriweather post pavilion": "39.2101,-76.8619",
  "capital one hall": "38.9533,-77.3490",

  // Comedy
  "dc improv": "38.9068,-77.0416",
  "the comedy loft of dc": "38.9006,-77.0356",
  "drafthouse comedy theater": "38.8892,-77.0917",

  // Sports
  "capital one arena": "38.8981,-77.0209",
  "nationals park": "38.8730,-77.0074",
  "audi field": "38.8686,-77.0128",
  "northwestern stadium": "38.8253,-76.8708",

  // Theaters & Performing Arts
  "arena stage": "38.8690,-77.0245",
  "kennedy center": "38.8957,-77.0556",
  "the john f. kennedy center for the performing arts": "38.8957,-77.0556",
  "national theatre": "38.8953,-77.0289",
  "warner theatre": "38.8966,-77.0263",
  "ford's theatre": "38.8967,-77.0256",
  "woolly mammoth theatre": "38.8971,-77.0224",
  "shakespeare theatre company": "38.8943,-77.0239",
  "atlas performing arts center": "38.8942,-76.9942",
  "studio theatre": "38.9124,-77.0285",
  "folger theatre": "38.8887,-77.0028",
  "signature theatre": "38.8617,-77.0622",

  // Museums & Galleries
  "national museum of american history": "38.8912,-77.0300",
  "national air and space museum": "38.8882,-77.0199",
  "national gallery of art": "38.8913,-77.0199",
  "smithsonian national zoo": "38.9296,-77.0497",
  "hirshhorn museum": "38.8883,-77.0228",
  "national museum of natural history": "38.8913,-77.0259",
  "national museum of african american history and culture": "38.8910,-77.0326",
  "artechouse": "38.8867,-77.0231",
  "the phillips collection": "38.9115,-77.0468",
  "renwick gallery": "38.8997,-77.0393",

  // Event Spaces & Hotels
  "the wharf": "38.8782,-77.0235",
  "the yards": "38.8768,-77.0033",
  "city winery dc": "38.9024,-77.0032",
  "the line hotel dc": "38.9225,-77.0418",
  "eaton dc": "38.9050,-77.0232",
  "dupont circle": "38.9096,-77.0434",
  "the park at fourteenth": "38.9056,-77.0322",
  "long view gallery": "38.9035,-77.0127",
  "dock5 at union market": "38.9085,-76.9949",
  "union market": "38.9085,-76.9949",

  // Parks & Outdoor
  "the national mall": "38.8893,-77.0281",
  "rock creek park": "38.9582,-77.0498",
  "anacostia park": "38.8734,-76.9671",
  "theodore roosevelt island": "38.8958,-77.0631",
  "east potomac park": "38.8649,-77.0282",
  "meridian hill park": "38.9213,-77.0358",

  // Community & Other
  "busboys and poets": "38.9053,-77.0422",
  "politics and prose": "38.9567,-77.0697",
  "kramerbooks": "38.9109,-77.0440",
  "the dc eagle": "38.9060,-77.0142",
  "pitchers dc": "38.9325,-77.0314",
  "nellie's sports bar": "38.9165,-77.0324",
  "workbox washington dc - dupont circle": "38.9087,-77.0428",
  "capitol view neighborhood library": "38.8318,-76.9965",
  "bender jcc of greater washington": "39.0840,-77.1530",

  // Volunteer Organizations (as venues)
  "love in action dc": "38.9072,-77.0369",
  "anacostia watershed society": "38.8629,-76.9858",
  "potomac conservancy": "38.9072,-77.0369",
};

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
    isPublic: true,
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
    isPublic: true,
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
    isPublic: true,
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
    // Always set to true for mined/crawled events - they should be public by default
    isPublic: true,
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
    isPublic: true,
    source: "eventbrite",
  };
}

/**
 * Transform Kennedy Center event to normalized format
 */
export function transformKennedyCenterEvent(event: any): NormalizedEvent {
  return {
    title: event.title,
    description: event.description,
    start_date: normalizeDate(event.date),
    start_time: normalizeTime(event.time),
    location: event.location || "2700 F Street NW, Washington, DC 20566",
    venue: event.venue || "Kennedy Center",
    category: normalizeCategory(event.category),
    url: event.url,
    cost: normalizeCost(event.price),
    image_url: event.image_url,
    socials: event.url ? { website: event.url } : undefined,
    isPublic: true,
    source: "kennedycenter",
  };
}

/**
 * Transform 9:30 Club / The Anthem event to normalized format
 */
export function transformNineThirtyClubEvent(event: any): NormalizedEvent {
  return {
    title: event.title,
    description: event.description,
    start_date: normalizeDate(event.date),
    start_time: normalizeTime(event.time),
    location: event.location,
    venue: event.venue,
    category: normalizeCategory(event.category || "Music"),
    url: event.url,
    cost: normalizeCost(event.price),
    image_url: event.image_url,
    socials: event.url ? { website: event.url } : undefined,
    isPublic: true,
    source: "ninethirtyclub",
  };
}

/**
 * Transform Smithsonian event to normalized format
 */
export function transformSmithsonianEvent(event: any): NormalizedEvent {
  return {
    title: event.title,
    description: event.description,
    start_date: normalizeDate(event.date),
    start_time: normalizeTime(event.time),
    location: event.location || "National Mall, Washington, DC",
    venue: event.venue || "Smithsonian Institution",
    category: normalizeCategory(event.category || "Free"),
    url: event.url,
    cost: normalizeCost(event.price || "free"),
    image_url: event.image_url,
    socials: event.url ? { website: event.url } : undefined,
    isPublic: true,
    source: "smithsonian",
  };
}

/**
 * Transform Meetup DC event to normalized format
 */
export function transformMeetupDCEvent(event: any): NormalizedEvent {
  return {
    title: event.title,
    description: event.description,
    start_date: normalizeDate(event.date),
    start_time: normalizeTime(event.time),
    location: event.location,
    venue: event.venue,
    category: normalizeCategory(event.category),
    url: event.url,
    cost: normalizeCost(event.price),
    image_url: event.image_url,
    socials: event.url ? { website: event.url } : undefined,
    isPublic: true,
    source: "meetupdc",
  };
}

/**
 * Transform Ticketmaster concert event to normalized format
 */
export function transformTicketmasterEvent(event: any): NormalizedEvent {
  return {
    title: event.title,
    description: event.description,
    start_date: normalizeDate(event.date),
    start_time: normalizeTime(event.time),
    location: event.location,
    venue: event.venue,
    category: normalizeCategory(event.category || "Music"),
    url: event.url,
    cost: normalizeCost(event.price),
    image_url: event.image_url,
    socials: event.url ? { website: event.url } : undefined,
    isPublic: true,
    source: "ticketmaster",
  };
}

/**
 * Transform indie venue event to normalized format
 */
export function transformIndieVenueEvent(event: any): NormalizedEvent {
  return {
    title: event.title,
    description: event.description,
    start_date: normalizeDate(event.date),
    start_time: normalizeTime(event.time),
    location: event.location,
    venue: event.venue,
    category: normalizeCategory(event.category || "Music"),
    url: event.url,
    cost: normalizeCost(event.price),
    image_url: event.image_url,
    socials: event.url ? { website: event.url } : undefined,
    isPublic: true,
    source: "indievenue",
  };
}

/**
 * Transform DC Bar Event to normalized format
 */
export function transformDCBarEvent(event: any): NormalizedEvent {
  return {
    title: event.title,
    description: event.description,
    start_date: normalizeDate(event.date),
    start_time: normalizeTime(event.time),
    location: event.location,
    venue: event.venue,
    category: normalizeCategory(event.category || "Food & Drink"),
    url: event.url,
    cost: normalizeCost(event.price),
    image_url: event.image_url,
    socials: event.url ? { website: event.url } : undefined,
    isPublic: true,
    source: "dcbarevents",
  };
}

/**
 * Transform DC Sports event to normalized format
 */
export function transformDCSportsEvent(event: any): NormalizedEvent {
  return {
    title: event.title,
    description: event.description,
    start_date: normalizeDate(event.date),
    start_time: normalizeTime(event.time),
    location: event.location,
    venue: event.venue,
    category: normalizeCategory(event.category || "Sports"),
    url: event.url,
    cost: normalizeCost(event.price),
    image_url: event.image_url,
    socials: event.url ? { website: event.url } : undefined,
    isPublic: true,
    source: "dcsports",
  };
}

/**
 * Transform DC Improv event to normalized format
 */
export function transformDCImprovEvent(event: any): NormalizedEvent {
  return {
    title: event.title,
    description: event.description,
    start_date: normalizeDate(event.date || event.start_date),
    start_time: normalizeTime(event.time || event.start_time),
    location: event.location,
    venue: event.venue || "DC Improv",
    category: normalizeCategory(event.category || "comedy"),
    url: event.url,
    image_url: event.image_url,
    cost: normalizeCost(event.price || event.cost),
    socials: event.url ? { website: event.url } : undefined,
    isPublic: true,
    source: "dcimprov",
  };
}

/**
 * Transform DC Comedy Loft event to normalized format
 */
export function transformDCComedyLoftEvent(event: any): NormalizedEvent {
  return {
    title: event.title,
    description: event.description,
    start_date: normalizeDate(event.date || event.start_date),
    start_time: normalizeTime(event.time || event.start_time),
    location: event.location,
    venue: event.venue || "The Comedy Loft of DC",
    category: normalizeCategory(event.category || "comedy"),
    url: event.url,
    image_url: event.image_url,
    cost: normalizeCost(event.price || event.cost),
    socials: event.url ? { website: event.url } : undefined,
    isPublic: true,
    source: "dccomedyloft",
  };
}

export function transformLoveInActionDCEvent(event: any): NormalizedEvent {
  return {
    title: event.title,
    description: event.description,
    start_date: normalizeDate(event.date),
    start_time: normalizeTime(event.time),
    end_time: normalizeTime(event.end_time),
    location: event.location,
    venue: event.venue || "Love In Action DC",
    category: "Volunteer",
    url: event.url,
    image_url: event.image_url,
    isPublic: true,
    source: "loveinactiondc",
  };
}

export function transformPotomacConservancyEvent(event: any): NormalizedEvent {
  return {
    title: event.title,
    description: event.description,
    start_date: normalizeDate(event.date),
    start_time: normalizeTime(event.time),
    end_time: normalizeTime(event.end_time),
    location: event.location,
    venue: event.venue || "Potomac Conservancy",
    category: "Volunteer",
    url: event.url,
    image_url: event.image_url,
    isPublic: true,
    source: "potomacconservancy",
  };
}

export function transformAnacostiaWSEvent(event: any): NormalizedEvent {
  return {
    title: event.title,
    description: event.description,
    start_date: normalizeDate(event.date),
    start_time: normalizeTime(event.time),
    end_time: normalizeTime(event.end_time),
    location: event.location,
    venue: event.venue || "Anacostia Watershed Society",
    category: "Volunteer",
    url: event.url,
    isPublic: true,
    source: "anacostiaws",
  };
}

export function transformNovaCleanupEvent(event: any): NormalizedEvent {
  return {
    title: event.title,
    description: event.description,
    start_date: normalizeDate(event.date),
    start_time: normalizeTime(event.time),
    location: event.location,
    venue: event.venue || "NOVA Cleanups",
    category: "Volunteer",
    url: event.url,
    image_url: event.image_url,
    isPublic: true,
    source: "novacleanups",
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

// Safe JSON stringify that handles circular references and non-serializable values
function safeStringify(obj: any): string {
  const seen = new WeakSet();
  const result = JSON.stringify(obj, (key, value) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return "[Circular]";
      }
      seen.add(value);
    }
    // Handle non-serializable values
    if (value === undefined) {
      return null;
    }
    if (typeof value === "function") {
      return "[Function]";
    }
    if (value instanceof Error) {
      return { message: value.message, name: value.name, stack: value.stack };
    }
    return value;
  });

  // Validate the JSON is parseable
  try {
    JSON.parse(result);
  } catch (parseError) {
    console.error("❌ Generated JSON is invalid:", {
      error:
        parseError instanceof Error ? parseError.message : String(parseError),
      jsonPreview: result.substring(0, 300),
      jsonLength: result.length,
    });
    throw new Error(
      `Failed to generate valid JSON: ${
        parseError instanceof Error ? parseError.message : String(parseError)
      }`
    );
  }

  return result;
}

// Lambda handler for event normalization
export const handler: Handler = async (event, context, callback) => {
  const startTime = Date.now();

  try {
    console.log("🚀 Lambda normalizeEvents handler started");

    // Detailed logging of the incoming event
    console.log("📦 [NORMALIZE DEBUG] Raw event structure:", {
      hasBody: "body" in event,
      hasEvents: "events" in event,
      hasSource: "source" in event,
      eventKeys: Object.keys(event),
      eventType: typeof event,
      bodyType: typeof (event as any).body,
      bodyIsString: typeof (event as any).body === "string",
    });

    // Log the raw event (truncated if too long)
    const eventString = JSON.stringify(event);
    console.log(
      "📦 [NORMALIZE DEBUG] Raw event (first 500 chars):",
      eventString.substring(0, 500)
    );
    if (eventString.length > 500) {
      console.log(
        "📦 [NORMALIZE DEBUG] Raw event (last 200 chars):",
        eventString.substring(eventString.length - 200)
      );
    }

    // Helper function to try to fix common JSON syntax errors
    function tryFixJSON(jsonString: string): string {
      // Remove trailing commas before } or ]
      let fixed = jsonString.replace(/,(\s*[}\]])/g, "$1");
      // Remove trailing commas in objects/arrays
      fixed = fixed.replace(/,(\s*})/g, "$1");
      fixed = fixed.replace(/,(\s*])/g, "$1");
      return fixed;
    }

    // Parse the request body - handle both API Gateway and Step Functions formats
    let body;
    try {
      console.log("📦 [NORMALIZE DEBUG] Starting body parsing...");

      if (event.body) {
        console.log(
          "📦 [NORMALIZE DEBUG] event.body exists, type:",
          typeof event.body
        );

        // API Gateway format
        if (typeof event.body === "string") {
          console.log(
            "📦 [NORMALIZE DEBUG] event.body is a string, length:",
            event.body.length
          );
          console.log(
            "📦 [NORMALIZE DEBUG] event.body preview (first 300 chars):",
            event.body.substring(0, 300)
          );
          console.log(
            "📦 [NORMALIZE DEBUG] event.body preview (last 200 chars):",
            event.body.substring(Math.max(0, event.body.length - 200))
          );

          // Check if it's double-stringified (starts with escaped quotes)
          const isDoubleStringified =
            event.body.trim().startsWith('"') &&
            event.body.trim().endsWith('"') &&
            event.body.includes('\\"');

          if (isDoubleStringified) {
            console.log(
              "📦 [NORMALIZE DEBUG] Detected potentially double-stringified JSON, attempting to parse twice"
            );
            try {
              const firstParse = JSON.parse(event.body);
              if (typeof firstParse === "string") {
                body = JSON.parse(firstParse);
                console.log(
                  "📦 [NORMALIZE DEBUG] Successfully parsed double-stringified JSON"
                );
              } else {
                body = firstParse;
                console.log(
                  "📦 [NORMALIZE DEBUG] First parse was not a string, using it directly"
                );
              }
            } catch (doubleParseError) {
              console.log(
                "📦 [NORMALIZE DEBUG] Double-stringified parse failed, trying normal parse"
              );
              // Try to fix common JSON issues before parsing
              const fixed = tryFixJSON(event.body);
              body = JSON.parse(fixed);
            }
          } else {
            try {
              body = JSON.parse(event.body);
              console.log(
                "📦 [NORMALIZE DEBUG] Successfully parsed event.body as JSON"
              );
            } catch (initialParseError) {
              // Try to fix common JSON syntax errors
              console.log(
                "📦 [NORMALIZE DEBUG] Initial parse failed, attempting to fix common JSON issues"
              );
              const fixed = tryFixJSON(event.body);
              body = JSON.parse(fixed);
              console.log(
                "📦 [NORMALIZE DEBUG] Successfully parsed after fixing JSON syntax"
              );
            }
          }

          console.log("📦 [NORMALIZE DEBUG] Parsed body structure:", {
            hasEvents: "events" in body,
            hasSource: "source" in body,
            hasEventType: "eventType" in body,
            bodyKeys: Object.keys(body),
            eventsIsArray: Array.isArray(body.events),
            eventsLength: Array.isArray(body.events)
              ? body.events.length
              : "N/A",
          });
        } else {
          // Body is not a string, use it directly
          console.log(
            "📦 [NORMALIZE DEBUG] event.body is not a string, using as-is"
          );
          body = event.body;
        }
      } else {
        // Step Functions format - data might be passed directly in the event
        // But Step Functions wraps it in a body field, so check if body exists but is an object
        if ((event as any).body && typeof (event as any).body === "object") {
          console.log(
            "📦 [NORMALIZE DEBUG] event.body exists as object (Step Functions format)"
          );
          body = (event as any).body;
        } else {
          console.log(
            "📦 [NORMALIZE DEBUG] No event.body found, using event directly (Step Functions format)"
          );
          body = event;
        }
        console.log("📦 [NORMALIZE DEBUG] Direct event structure:", {
          hasEvents: "events" in body,
          hasSource: "source" in body,
          hasEventType: "eventType" in body,
          bodyKeys: Object.keys(body),
          eventsIsArray: Array.isArray((body as any).events),
          eventsLength: Array.isArray((body as any).events)
            ? (body as any).events.length
            : "N/A",
        });
      }
    } catch (parseError) {
      // This catch block handles JSON parsing errors
      if (event.body && typeof event.body === "string") {
        const errorPosition =
          parseError instanceof SyntaxError &&
          parseError.message.includes("position")
            ? parseInt(parseError.message.match(/position (\d+)/)?.[1] || "0")
            : 0;

        const start = Math.max(0, errorPosition - 100);
        const end = Math.min(event.body.length, errorPosition + 100);
        const context = event.body.substring(start, end);

        // Show the exact character at the error position
        const charAtPosition = event.body[errorPosition];
        const charCode = charAtPosition ? charAtPosition.charCodeAt(0) : null;

        console.error(
          "📦 [NORMALIZE DEBUG] Failed to parse event.body as JSON:",
          {
            error:
              parseError instanceof Error
                ? parseError.message
                : String(parseError),
            errorName:
              parseError instanceof Error ? parseError.name : "Unknown",
            bodyLength: event.body.length,
            errorPosition: errorPosition,
            charAtPosition: charAtPosition,
            charCode: charCode,
            charHex: charAtPosition ? `0x${charCode?.toString(16)}` : null,
            contextAroundError: context,
            contextWithMarkers: event.body.substring(
              Math.max(0, errorPosition - 20),
              Math.min(event.body.length, errorPosition + 20)
            ),
            bodyPreview: event.body.substring(
              0,
              Math.min(500, errorPosition + 50)
            ),
          }
        );

        // Try to find the problematic character or structure
        if (errorPosition > 0 && errorPosition < event.body.length) {
          const beforeError = event.body.substring(
            Math.max(0, errorPosition - 10),
            errorPosition
          );
          const atError = event.body[errorPosition];
          const afterError = event.body.substring(
            errorPosition + 1,
            Math.min(event.body.length, errorPosition + 11)
          );
          console.error("📦 [NORMALIZE DEBUG] Character analysis:", {
            before: beforeError,
            atError: atError,
            after: afterError,
            beforeCharCodes: beforeError
              .split("")
              .map((c: string) => c.charCodeAt(0)),
            atErrorCharCode: atError ? atError.charCodeAt(0) : null,
            afterCharCodes: afterError
              .split("")
              .map((c: string) => c.charCodeAt(0)),
          });
        }
      }

      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          error: "Invalid request body format",
          message:
            parseError instanceof Error
              ? parseError.message
              : String(parseError),
        }),
      };
    }

    // Try to stringify to validate the body is serializable
    try {
      JSON.stringify(body);
      console.log("📦 [NORMALIZE DEBUG] Body is JSON-serializable");
    } catch (stringifyError) {
      console.error(
        "📦 [NORMALIZE DEBUG] Body contains non-serializable data:",
        {
          error:
            stringifyError instanceof Error
              ? stringifyError.message
              : String(stringifyError),
          bodyKeys: Object.keys(body || {}),
        }
      );
    }

    console.log("📦 [NORMALIZE DEBUG] Body parsing completed successfully");

    console.log(
      "📦 [NORMALIZE DEBUG] Extracting events, source, eventType from body..."
    );
    const { events, source, eventType, testMode } = body;

    console.log("📦 [NORMALIZE DEBUG] Extracted values:", {
      hasEvents: !!events,
      eventsType: typeof events,
      eventsIsArray: Array.isArray(events),
      eventsLength: Array.isArray(events) ? events.length : "N/A",
      source: source,
      eventType: eventType,
      testMode: testMode,
    });

    // Validate input
    if (!events || !Array.isArray(events)) {
      console.error(
        "📦 [NORMALIZE DEBUG] Validation failed - events is not an array:",
        {
          events: events,
          eventsType: typeof events,
          eventsIsArray: Array.isArray(events),
          bodyKeys: Object.keys(body),
        }
      );
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          error: "Events array is required",
          received: typeof events,
          isArray: Array.isArray(events),
          bodyKeys: Object.keys(body),
        }),
      };
    }

    console.log(
      "📦 [NORMALIZE DEBUG] Validation passed - events is an array with",
      events.length,
      "items"
    );

    // Check if these are groups
    const isGroup =
      eventType === "group" ||
      events.some((item: any) => item.isGroup || item.type === "group");

    if (isGroup) {
      // Groups don't need normalization, just pass them through
      console.log(
        `📋 Processing ${events.length} groups from source: ${
          source || "unknown"
        }`
      );

      // Log GROUP_INFO items to verify they're being passed through
      const groupInfoItems = events.filter(
        (item: any) => item.sk === "GROUP_INFO"
      );
      console.log(
        `🔍 Normalize step: ${groupInfoItems.length} GROUP_INFO items detected`
      );
      if (groupInfoItems.length > 0) {
        console.log(
          `   - Sample GROUP_INFO: pk=${groupInfoItems[0].pk}, sk=${groupInfoItems[0].sk}`
        );
      }

      try {
        return safeStringify({
          success: true,
          events: events, // Pass groups through as-is
          source: source || "unknown",
          eventType: "group",
        });
      } catch (stringifyError) {
        console.error("❌ Error stringifying groups response:", stringifyError);
        // Fallback to basic stringify with error handling
        return JSON.stringify({
          success: true,
          events: events.map((e: any) => {
            try {
              return JSON.parse(JSON.stringify(e));
            } catch {
              return { error: "Failed to serialize event" };
            }
          }),
          source: source || "unknown",
          eventType: "group",
        });
      }
    }

    console.log(
      `📊 Processing ${events.length} events from source: ${
        source || "unknown"
      }`
    );

    // Log sample of first event to verify structure
    if (events.length > 0) {
      console.log("📦 [NORMALIZE DEBUG] Sample first event:", {
        title: events[0]?.title,
        date: events[0]?.date,
        time: events[0]?.time,
        location: events[0]?.location,
        venue: events[0]?.venue,
        keys: Object.keys(events[0] || {}),
      });
    }

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
          case "kennedycenter":
            normalizedEvent = transformKennedyCenterEvent(rawEvent);
            break;
          case "ninethirtyclub":
            normalizedEvent = transformNineThirtyClubEvent(rawEvent);
            break;
          case "smithsonian":
            normalizedEvent = transformSmithsonianEvent(rawEvent);
            break;
          case "meetupdc":
            normalizedEvent = transformMeetupDCEvent(rawEvent);
            break;
          case "ticketmaster":
            normalizedEvent = transformTicketmasterEvent(rawEvent);
            break;
          case "indievenue":
            normalizedEvent = transformIndieVenueEvent(rawEvent);
            break;
          case "dcsports":
            normalizedEvent = transformDCSportsEvent(rawEvent);
            break;
          case "dcimprov":
            normalizedEvent = transformDCImprovEvent(rawEvent);
            break;
          case "dccomedyloft":
            normalizedEvent = transformDCComedyLoftEvent(rawEvent);
            break;
          case "dcbarevents":
            normalizedEvent = transformDCBarEvent(rawEvent);
            break;
          case "loveinactiondc":
            normalizedEvent = transformLoveInActionDCEvent(rawEvent);
            break;
          case "potomacconservancy":
            normalizedEvent = transformPotomacConservancyEvent(rawEvent);
            break;
          case "anacostiaws":
            normalizedEvent = transformAnacostiaWSEvent(rawEvent);
            break;
          case "novacleanups":
            normalizedEvent = transformNovaCleanupEvent(rawEvent);
            break;
          default: {
            // Assume it's already in normalized format
            normalizedEvent = rawEvent;
            // Ensure isPublic is set for events that don't go through a transform
            // Check both is_public (snake_case) and isPublic (camelCase) for backward compatibility
            const rawEventAny = rawEvent as any;
            if (
              normalizedEvent.isPublic === undefined &&
              rawEventAny.is_public === undefined
            ) {
              normalizedEvent.isPublic = true;
            } else if (
              rawEventAny.is_public !== undefined &&
              normalizedEvent.isPublic === undefined
            ) {
              // Convert snake_case is_public to camelCase isPublic for backward compatibility
              normalizedEvent.isPublic =
                rawEventAny.is_public === true ||
                rawEventAny.is_public === "true";
            }
          }
        }

        // Backfill coordinates from known venue map if missing
        if (!normalizedEvent.coordinates && normalizedEvent.venue) {
          const venueKey = normalizedEvent.venue.toLowerCase().trim();
          // Try exact match first
          if (VENUE_COORDINATES[venueKey]) {
            normalizedEvent.coordinates = VENUE_COORDINATES[venueKey];
          } else {
            // Try partial match (venue name contains a known key)
            for (const [known, coords] of Object.entries(VENUE_COORDINATES)) {
              if (venueKey.includes(known) || known.includes(venueKey)) {
                normalizedEvent.coordinates = coords;
                break;
              }
            }
          }
        }

        // Log isPublic value for debugging
        console.log(
          `🔒 Normalized event "${normalizedEvent.title}": isPublic = ${normalizedEvent.isPublic}`
        );

        normalizedEvents.push(normalizedEvent);
      } catch (transformError) {
        console.error(`❌ Error transforming event:`, transformError);
        console.error(`📄 Raw event:`, JSON.stringify(rawEvent, null, 2));
        // Continue with other events even if one fails
      }
    }

    console.log(`✅ Successfully normalized ${normalizedEvents.length} events`);

    try {
      return safeStringify({
        success: true,
        events: normalizedEvents,
        source: source || "unknown",
        eventType: eventType || "unknown",
      });
    } catch (stringifyError) {
      console.error(
        "❌ Error stringifying normalized events response:",
        stringifyError
      );
      // Fallback to basic stringify with error handling
      return JSON.stringify({
        success: true,
        events: normalizedEvents.map((e) => {
          try {
            return JSON.parse(JSON.stringify(e));
          } catch {
            return { error: "Failed to serialize event" };
          }
        }),
        source: source || "unknown",
        eventType: eventType || "unknown",
      });
    }
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

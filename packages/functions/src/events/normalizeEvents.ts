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
    console.log("📦 [NORMALIZE DEBUG] Raw event (first 500 chars):", 
      eventString.substring(0, 500));
    if (eventString.length > 500) {
      console.log("📦 [NORMALIZE DEBUG] Raw event (last 200 chars):", 
        eventString.substring(eventString.length - 200));
    }

    // Parse the request body - handle both API Gateway and Step Functions formats
    let body;
    try {
      console.log("📦 [NORMALIZE DEBUG] Starting body parsing...");
      
      if (event.body) {
        console.log("📦 [NORMALIZE DEBUG] event.body exists, type:", typeof event.body);
        
        // API Gateway format
        if (typeof event.body === "string") {
          console.log("📦 [NORMALIZE DEBUG] event.body is a string, length:", event.body.length);
          console.log("📦 [NORMALIZE DEBUG] event.body preview (first 300 chars):", 
            event.body.substring(0, 300));
          console.log("📦 [NORMALIZE DEBUG] event.body preview (last 200 chars):", 
            event.body.substring(Math.max(0, event.body.length - 200)));
          
          // Check if it's double-stringified (starts with escaped quotes)
          const isDoubleStringified = event.body.trim().startsWith('"') && 
            event.body.trim().endsWith('"') &&
            event.body.includes('\\"');
          
          if (isDoubleStringified) {
            console.log("📦 [NORMALIZE DEBUG] Detected potentially double-stringified JSON, attempting to parse twice");
            try {
              const firstParse = JSON.parse(event.body);
              if (typeof firstParse === "string") {
                body = JSON.parse(firstParse);
                console.log("📦 [NORMALIZE DEBUG] Successfully parsed double-stringified JSON");
              } else {
                body = firstParse;
                console.log("📦 [NORMALIZE DEBUG] First parse was not a string, using it directly");
              }
            } catch (doubleParseError) {
              console.log("📦 [NORMALIZE DEBUG] Double-stringified parse failed, trying normal parse");
              body = JSON.parse(event.body);
            }
          } else {
            body = JSON.parse(event.body);
            console.log("📦 [NORMALIZE DEBUG] Successfully parsed event.body as JSON");
          }
          
          console.log("📦 [NORMALIZE DEBUG] Parsed body structure:", {
            hasEvents: "events" in body,
            hasSource: "source" in body,
            hasEventType: "eventType" in body,
            bodyKeys: Object.keys(body),
            eventsIsArray: Array.isArray(body.events),
            eventsLength: Array.isArray(body.events) ? body.events.length : "N/A",
          });
        } else {
          // Body is not a string, use it directly
          console.log("📦 [NORMALIZE DEBUG] event.body is not a string, using as-is");
          body = event.body;
        }
      } else {
        // Step Functions format - data might be passed directly in the event
        // But Step Functions wraps it in a body field, so check if body exists but is an object
        if ((event as any).body && typeof (event as any).body === "object") {
          console.log("📦 [NORMALIZE DEBUG] event.body exists as object (Step Functions format)");
          body = (event as any).body;
        } else {
          console.log("📦 [NORMALIZE DEBUG] No event.body found, using event directly (Step Functions format)");
          body = event;
        }
        console.log("📦 [NORMALIZE DEBUG] Direct event structure:", {
          hasEvents: "events" in body,
          hasSource: "source" in body,
          hasEventType: "eventType" in body,
          bodyKeys: Object.keys(body),
          eventsIsArray: Array.isArray((body as any).events),
          eventsLength: Array.isArray((body as any).events) ? (body as any).events.length : "N/A",
        });
      }
    } catch (parseError) {
      // This catch block handles JSON parsing errors
      if (event.body && typeof event.body === "string") {
            const errorPosition = parseError instanceof SyntaxError && parseError.message.includes("position") 
              ? parseInt(parseError.message.match(/position (\d+)/)?.[1] || "0")
              : 0;
            
            const start = Math.max(0, errorPosition - 100);
            const end = Math.min(event.body.length, errorPosition + 100);
            const context = event.body.substring(start, end);
            
            // Show the exact character at the error position
            const charAtPosition = event.body[errorPosition];
            const charCode = charAtPosition ? charAtPosition.charCodeAt(0) : null;
            
            console.error("📦 [NORMALIZE DEBUG] Failed to parse event.body as JSON:", {
              error: parseError instanceof Error ? parseError.message : String(parseError),
              errorName: parseError instanceof Error ? parseError.name : "Unknown",
              bodyLength: event.body.length,
              errorPosition: errorPosition,
              charAtPosition: charAtPosition,
              charCode: charCode,
              charHex: charAtPosition ? `0x${charCode?.toString(16)}` : null,
              contextAroundError: context,
              contextWithMarkers: event.body.substring(Math.max(0, errorPosition - 20), Math.min(event.body.length, errorPosition + 20)),
              bodyPreview: event.body.substring(0, Math.min(500, errorPosition + 50)),
            });
            
            // Try to find the problematic character or structure
            if (errorPosition > 0 && errorPosition < event.body.length) {
              const beforeError = event.body.substring(Math.max(0, errorPosition - 10), errorPosition);
              const atError = event.body[errorPosition];
              const afterError = event.body.substring(errorPosition + 1, Math.min(event.body.length, errorPosition + 11));
              console.error("📦 [NORMALIZE DEBUG] Character analysis:", {
                before: beforeError,
                atError: atError,
                after: afterError,
                beforeCharCodes: beforeError.split('').map(c => c.charCodeAt(0)),
                atErrorCharCode: atError ? atError.charCodeAt(0) : null,
                afterCharCodes: afterError.split('').map(c => c.charCodeAt(0)),
              });
            }
            
            throw parseError;
          }
        } else {
          console.log("📦 [NORMALIZE DEBUG] event.body is not a string, using as-is");
          body = event.body;
        }
      } else {
        // Step Functions format - data might be passed directly in the event
        // But Step Functions wraps it in a body field, so check if body exists but is an object
        if ((event as any).body && typeof (event as any).body === "object") {
          console.log("📦 [NORMALIZE DEBUG] event.body exists as object (Step Functions format)");
          body = (event as any).body;
        } else {
          console.log("📦 [NORMALIZE DEBUG] No event.body found, using event directly (Step Functions format)");
          body = event;
        }
        console.log("📦 [NORMALIZE DEBUG] Direct event structure:", {
          hasEvents: "events" in body,
          hasSource: "source" in body,
          hasEventType: "eventType" in body,
          bodyKeys: Object.keys(body),
          eventsIsArray: Array.isArray((body as any).events),
          eventsLength: Array.isArray((body as any).events) ? (body as any).events.length : "N/A",
        });
      }

      // Try to stringify to validate the body is serializable
      try {
        JSON.stringify(body);
        console.log("📦 [NORMALIZE DEBUG] Body is JSON-serializable");
      } catch (stringifyError) {
        console.error("📦 [NORMALIZE DEBUG] Body contains non-serializable data:", {
          error: stringifyError instanceof Error ? stringifyError.message : String(stringifyError),
          bodyKeys: Object.keys(body || {}),
        });
      }
      
      console.log("📦 [NORMALIZE DEBUG] Body parsing completed successfully");
    } catch (error) {
      console.error("📦 [NORMALIZE DEBUG] Error parsing request body:", error);
      console.error("📦 [NORMALIZE DEBUG] Error details:", {
        name: error instanceof Error ? error.name : "Unknown",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          error: "Invalid request body format",
          message: error instanceof Error ? error.message : String(error),
        }),
      };
    }

    console.log("📦 [NORMALIZE DEBUG] Extracting events, source, eventType from body...");
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
      console.error("📦 [NORMALIZE DEBUG] Validation failed - events is not an array:", {
        events: events,
        eventsType: typeof events,
        eventsIsArray: Array.isArray(events),
        bodyKeys: Object.keys(body),
      });
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

    console.log("📦 [NORMALIZE DEBUG] Validation passed - events is an array with", events.length, "items");

    // Check if these are groups
    const isGroup = eventType === "group" || events.some((item: any) => item.isGroup || item.type === "group");

    if (isGroup) {
      // Groups don't need normalization, just pass them through
      console.log(
        `📋 Processing ${events.length} groups from source: ${
          source || "unknown"
        }`
      );
      
      // Log GROUP_INFO items to verify they're being passed through
      const groupInfoItems = events.filter((item: any) => item.sk === "GROUP_INFO");
      console.log(`🔍 Normalize step: ${groupInfoItems.length} GROUP_INFO items detected`);
      if (groupInfoItems.length > 0) {
        console.log(`   - Sample GROUP_INFO: pk=${groupInfoItems[0].pk}, sk=${groupInfoItems[0].sk}`);
      }
      
      return JSON.stringify({
        success: true,
        events: events, // Pass groups through as-is
        source: source || "unknown",
        eventType: "group",
      });
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

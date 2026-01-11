import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import {
  NormalizedEvent,
  generateEventId,
  normalizeCategory,
} from "@touchgrass/shared-utils";
import { Handler } from "aws-lambda";
import { Resource } from "sst";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});

/**
 * Get the DynamoDB table name from Resource.Db
 */
function getTableName(): string {
  if (!Resource.Db?.name) {
    throw new Error(
      "DynamoDB table name is not available. Resource.Db.name is undefined. " +
        "Make sure the function is properly linked to the db resource."
    );
  }
  return Resource.Db.name;
}

/**
 * Save normalized event to DynamoDB
 */
export async function saveEvent(
  event: NormalizedEvent,
  source?: string
): Promise<{
  eventId: string;
  savedEvent: any;
}> {
  // Validate required fields
  if (!event.title || typeof event.title !== "string") {
    throw new Error(
      `Event title is required and must be a string. Received: ${typeof event.title}`
    );
  }

  const eventId = generateEventId(event, source);
  const timestamp = Date.now();

  // Log isPublic values for debugging
  console.log(`🔒 Event isPublic check for "${event.title}":`, {
    isPublic: event.isPublic,
    isPublicType: typeof event.isPublic,
    source: source || event.source,
  });

  const item = {
    pk: eventId,
    sk: eventId,
    createdAt: timestamp,
    updatedAt: timestamp,

    // Core fields
    title: event.title,
    description: event.description,
    start_date: event.start_date,
    end_date: event.end_date,
    start_time: event.start_time,
    end_time: event.end_time,

    // Location fields
    location: event.location,
    venue: event.venue,
    coordinates: event.coordinates,

    // Categorization
    category: normalizeCategory(event.category),
    // Ensure isPublic is always set correctly - default to true for mined/crawled events
    // Check both is_public (snake_case) and isPublic (camelCase) for backward compatibility
    isPublic: (() => {
      if (event.isPublic !== undefined) {
        // Handle boolean or string "true"/"false"
        if (typeof event.isPublic === "boolean") {
          return event.isPublic.toString();
        } else if (typeof event.isPublic === "string") {
          return event.isPublic; // Already a string
        }
        return "true"; // Fallback for unexpected types
      }
      // Check for legacy is_public field
      const legacyIsPublic = (event as any).is_public;
      if (legacyIsPublic !== undefined) {
        if (typeof legacyIsPublic === "boolean") {
          return legacyIsPublic.toString();
        } else if (typeof legacyIsPublic === "string") {
          return legacyIsPublic;
        }
      }
      return "true"; // Default to true
    })(),

    // Media & Links
    image_url: event.image_url,
    url: event.url,
    socials: event.socials,

    // Cost information
    cost: event.cost,

    // Metadata
    source: event.source || source,
    external_id: event.external_id,
    is_virtual: event.is_virtual,
    publisher: event.publisher,
    ticket_links: event.ticket_links,
    confidence: event.confidence,
    extractionMethod: event.extractionMethod,

    // ISO timestamps for compatibility
    created_at: new Date(timestamp).toISOString(),
    updated_at: new Date(timestamp).toISOString(),

    // Add titlePrefix for efficient searches
    titlePrefix: (event.title || "untitled")
      .trim()
      .toLowerCase()
      .substring(0, 3),
  };

  try {
    const tableName = getTableName();
    console.log(
      `💾 Attempting to save event "${event.title}" to table: ${tableName}`
    );
    console.log(`   Region: ${process.env.AWS_REGION || "us-east-1"}`);
    console.log(`   Event ID: ${eventId}`);

    const command = new PutItemCommand({
      TableName: tableName,
      Item: marshall(item, { removeUndefinedValues: true }),
      ConditionExpression: "attribute_not_exists(pk)", // Ensure idempotency
    });

    await client.send(command);
    console.log(`✅ Successfully saved normalized event: ${event.title}`);

    // Return both the event ID and the saved event data
    return {
      eventId,
      savedEvent: item,
    };
  } catch (error: any) {
    const tableName = getTableName();
    if (error.name === "ConditionalCheckFailedException") {
      console.log(`Event already exists: ${event.title}`);
      return {
        eventId,
        savedEvent: item,
      };
    } else {
      console.error("❌ Error saving normalized event:", error);
      console.error("   Error name:", error.name);
      console.error("   Error message:", error.message);
      console.error("   Table name used:", tableName);
      console.error("   Region:", process.env.AWS_REGION || "us-east-1");
      console.error("   Event ID:", eventId);
      console.error("   Event title:", event.title);
      if (error.$metadata) {
        console.error(
          "   AWS Metadata:",
          JSON.stringify(error.$metadata, null, 2)
        );
      }
      throw error;
    }
  }
}
/**
 * Batch save multiple events
 */
export async function saveEvents(
  events: NormalizedEvent[],
  source?: string
): Promise<{
  eventIds: string[];
  savedEvents: any[];
}> {
  const eventIds: string[] = [];
  const savedEvents: any[] = [];

  for (const event of events) {
    try {
      // Validate event before processing
      if (!event.title || typeof event.title !== "string") {
        console.warn(`Skipping event without valid title:`, event);
        continue;
      }

      const result = await saveEvent(event, source);
      eventIds.push(result.eventId);
      savedEvents.push(result.savedEvent);

      // Add delay between saves to avoid throttling
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error saving event ${event.title || "unknown"}:`, error);
    }
  }

  return { eventIds, savedEvents };
}

/**
 * Save a group item to DynamoDB (groups already have pk/sk set)
 */
async function saveGroup(group: any): Promise<{
  eventId: string;
  savedEvent: any;
}> {
  // Groups already have pk and sk set, use them directly
  if (!group.pk || !group.sk) {
    throw new Error(
      `Group must have pk and sk. Received: pk=${group.pk}, sk=${group.sk}`
    );
  }

  // Log the group being saved (especially GROUP_INFO)
  if (group.sk === "GROUP_INFO") {
    console.log(`🔍 saveGroup() called for GROUP_INFO:`, {
      pk: group.pk,
      sk: group.sk,
      title: group.title,
      hasDescription: !!group.description,
      category: group.category,
    });
  }

  const timestamp = group.createdAt || Date.now();
  const item = {
    pk: group.pk,
    sk: group.sk, // ← Critical: preserve sk value
    createdAt: timestamp,
    updatedAt: timestamp,

    // Core fields
    title: group.title || "",
    description: group.description || "",
    category: group.category || "Uncategorized",
    image_url: group.image_url || "",
    socials: group.socials || {},
    isPublic: group.isPublic || "true",

    // Group-specific fields (only for SCHEDULE items)
    scheduleDay: group.scheduleDay,
    scheduleTime: group.scheduleTime,
    scheduleLocation: group.scheduleLocation,
  };

  // Verify GROUP_INFO items have correct sk
  if (group.sk === "GROUP_INFO" && item.sk !== "GROUP_INFO") {
    console.error(
      `❌ CRITICAL: GROUP_INFO sk was lost! Original: ${group.sk}, Item: ${item.sk}`
    );
    throw new Error(`GROUP_INFO sk was not preserved: ${item.sk}`);
  }

  try {
    const tableName = getTableName();
    console.log(
      `💾 Attempting to save group "${group.title}" (${group.pk}/${group.sk}) to table: ${tableName}`
    );
    console.log(`   Region: ${process.env.AWS_REGION || "us-east-1"}`);

    const command = new PutItemCommand({
      TableName: tableName,
      Item: marshall(item, { removeUndefinedValues: true }),
      // For composite keys, DynamoDB checks the full key (pk+sk) combination
      // This allows multiple items with same pk but different sk values
      // Remove condition to allow updates, or use a more specific check if needed
    });

    await client.send(command);

    // Log what was actually saved (especially for GROUP_INFO)
    if (group.sk === "GROUP_INFO") {
      console.log(`✅ Successfully saved GROUP_INFO to DynamoDB:`, {
        pk: item.pk,
        sk: item.sk,
        title: item.title,
        category: item.category,
      });
    } else {
      console.log(
        `✅ Successfully saved group: ${group.title} (${group.pk}/${group.sk})`
      );
    }

    return {
      eventId: group.pk,
      savedEvent: item,
    };
  } catch (error: any) {
    const tableName = getTableName();
    if (error.name === "ConditionalCheckFailedException") {
      console.log(
        `Group item already exists: ${group.title} (${group.pk}/${group.sk})`
      );
      return {
        eventId: group.pk,
        savedEvent: item,
      };
    } else {
      console.error("❌ Error saving group:", error);
      console.error("   Error name:", error.name);
      console.error("   Error message:", error.message);
      console.error("   Table name used:", tableName);
      console.error("   Region:", process.env.AWS_REGION || "us-east-1");
      console.error("   Group pk:", group.pk);
      console.error("   Group sk:", group.sk);
      console.error("   Group title:", group.title);
      if (error.$metadata) {
        console.error(
          "   AWS Metadata:",
          JSON.stringify(error.$metadata, null, 2)
        );
      }
      throw error;
    }
  }
}

export const handler: Handler = async (
  event: { body: any },
  context: any,
  callback: any
) => {
  // Handle Step Functions payload format
  // Step Functions wraps the previous step's output in a body property
  // The normalize step returns a JSON string like: '{"success":true,"events":[...],"source":"...","eventType":"group"}'
  // Step Functions parses this JSON string and passes the parsed object to the next step
  // So event.body will be the parsed object from the normalize step
  let payload;

  if (event.body) {
    if (typeof event.body === "string") {
      // Body is a JSON string, parse it
      try {
        payload = JSON.parse(event.body);
      } catch (e) {
        console.error("Failed to parse event.body as JSON:", {
          error: e instanceof Error ? e.message : String(e),
          bodyPreview: event.body.substring(0, 500),
          bodyLength: event.body.length,
          position:
            e instanceof SyntaxError && e.message.includes("position")
              ? e.message.match(/position (\d+)/)?.[1]
              : undefined,
          bodyAroundPosition:
            e instanceof SyntaxError && e.message.includes("position")
              ? (() => {
                  const pos = parseInt(
                    e.message.match(/position (\d+)/)?.[1] || "0"
                  );
                  const start = Math.max(0, pos - 50);
                  const end = Math.min(event.body.length, pos + 50);
                  return event.body.substring(start, end);
                })()
              : undefined,
        });
        // Try to parse as nested JSON (in case it's double-encoded)
        try {
          payload = JSON.parse(JSON.parse(event.body));
        } catch (e2) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          throw new Error(`Invalid payload format: ${errorMessage}`);
        }
      }
    } else if (event.body.Payload) {
      // API Gateway format with Payload wrapper
      try {
        payload =
          typeof event.body.Payload === "string"
            ? JSON.parse(event.body.Payload)
            : event.body.Payload;
      } catch (e) {
        console.error("Failed to parse event.body.Payload as JSON:", {
          error: e instanceof Error ? e.message : String(e),
          payloadPreview:
            typeof event.body.Payload === "string"
              ? event.body.Payload.substring(0, 500)
              : String(event.body.Payload).substring(0, 500),
          payloadType: typeof event.body.Payload,
        });
        throw e;
      }
    } else {
      // Body is already the parsed object (Step Functions format)
      payload = event.body;
    }
  } else {
    // No body, event itself might be the payload (direct invocation)
    payload = event;
  }

  // The normalize step returns: { success: true, events: [...], source: "...", eventType: "group" }
  // Extract events array and metadata
  let items = payload.events || payload;
  const eventType = payload.eventType;
  const source = payload.source || "unknown";

  // Log for debugging
  console.log(`📦 Parsed payload:`, {
    hasEvents: !!payload.events,
    eventsCount: Array.isArray(payload.events) ? payload.events.length : 0,
    eventType,
    source,
    payloadKeys: Object.keys(payload),
  });

  // Ensure items is an array
  if (!Array.isArray(items)) {
    console.error("❌ Items is not an array:", typeof items, items);
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Items must be an array",
        received: typeof items,
      }),
    };
  }

  // Check if these are groups
  const isGroup =
    eventType === "group" ||
    items.some((item: any) => item.isGroup || item.type === "group");

  if (isGroup) {
    // Handle groups
    console.log(`📋 Processing ${items.length} group items`);

    // Log GROUP_INFO items specifically
    const groupInfoItems = items.filter(
      (item: any) => item.sk === "GROUP_INFO"
    );
    const scheduleItems = items.filter((item: any) =>
      item.sk?.startsWith("SCHEDULE#")
    );
    console.log(`📊 Received items breakdown:`);
    console.log(`   - GROUP_INFO items: ${groupInfoItems.length}`);
    console.log(`   - SCHEDULE items: ${scheduleItems.length}`);
    console.log(`   - Total items: ${items.length}`);

    if (groupInfoItems.length > 0) {
      console.log(
        `   - Sample GROUP_INFO item received:`,
        JSON.stringify(
          {
            pk: groupInfoItems[0].pk,
            sk: groupInfoItems[0].sk,
            title: groupInfoItems[0].title,
            hasDescription: !!groupInfoItems[0].description,
          },
          null,
          2
        )
      );
    } else {
      console.warn(
        `⚠️  WARNING: No GROUP_INFO items found in ${items.length} items!`
      );
      console.log(
        `   - Sample items:`,
        items.slice(0, 3).map((item: any) => ({
          pk: item.pk,
          sk: item.sk,
          title: item.title,
        }))
      );
    }

    const eventIds: string[] = [];
    const savedEvents: any[] = [];

    for (const group of items) {
      try {
        if (!group.title || typeof group.title !== "string") {
          console.warn(`Skipping group without valid title:`, group);
          continue;
        }

        // Log GROUP_INFO items before saving
        if (group.sk === "GROUP_INFO") {
          console.log(
            `💾 Saving GROUP_INFO item: pk=${group.pk}, sk=${group.sk}, title=${group.title}`
          );
        }

        const result = await saveGroup(group);
        eventIds.push(result.eventId);
        savedEvents.push(result.savedEvent);

        // Log successful GROUP_INFO saves
        if (group.sk === "GROUP_INFO") {
          console.log(
            `✅ Successfully processed GROUP_INFO: ${group.title} (${result.eventId})`
          );
        }

        // Add delay between saves to avoid throttling
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error saving group ${group.title || "unknown"}:`, error);
        if (group.sk === "GROUP_INFO") {
          console.error(`❌ Failed to save GROUP_INFO item:`, {
            pk: group.pk,
            sk: group.sk,
            title: group.title,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    // Final summary
    const savedGroupInfo = savedEvents.filter(
      (item: any) => item.sk === "GROUP_INFO"
    );
    const savedSchedules = savedEvents.filter((item: any) =>
      item.sk?.startsWith("SCHEDULE#")
    );
    console.log(`📊 Final summary:`);
    console.log(`   - Total items processed: ${items.length}`);
    console.log(`   - GROUP_INFO items saved: ${savedGroupInfo.length}`);
    console.log(`   - SCHEDULE items saved: ${savedSchedules.length}`);
    console.log(`   - Total items saved: ${savedEvents.length}`);

    if (savedGroupInfo.length === 0 && groupInfoItems.length > 0) {
      console.error(
        `❌ WARNING: No GROUP_INFO items were saved despite ${groupInfoItems.length} being received!`
      );
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ eventIds, savedEvents }),
    };
  } else {
    // Handle events (existing logic)
    const { eventIds, savedEvents } = await saveEvents(items, source);
    return {
      statusCode: 200,
      body: JSON.stringify({ eventIds, savedEvents }),
    };
  }
};

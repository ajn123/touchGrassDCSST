import { DynamoDBClient, PutItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
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
 * Check if a duplicate event already exists from a different source.
 * Queries eventTitleIndex for exact title match, then filters by same start_date.
 */
async function findDuplicate(
  event: NormalizedEvent,
  source?: string
): Promise<{ pk: string; source: string } | null> {
  if (!event.title || !event.start_date) return null;

  try {
    const tableName = getTableName();
    const command = new QueryCommand({
      TableName: tableName,
      IndexName: "eventTitleIndex",
      KeyConditionExpression: "#title = :title",
      ExpressionAttributeNames: { "#title": "title" },
      ExpressionAttributeValues: { ":title": { S: event.title } },
      Limit: 10,
    });

    const result = await client.send(command);
    if (!result.Items || result.Items.length === 0) return null;

    const eventSource = source || event.source || "unknown";
    for (const item of result.Items) {
      const existing = unmarshall(item);
      if (
        existing.start_date === event.start_date &&
        existing.source !== eventSource &&
        typeof existing.pk === "string" &&
        existing.pk.startsWith("EVENT")
      ) {
        return { pk: existing.pk, source: existing.source || "unknown" };
      }
    }

    return null;
  } catch (error) {
    // Don't block insertion if dedup check fails
    console.warn("⚠️ Dedup check failed, proceeding with insert:", error);
    return null;
  }
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

  // Cross-source dedup: skip if same title + date exists from another source
  const duplicate = await findDuplicate(event, source);
  if (duplicate) {
    console.log(
      `🔄 Duplicate skipped: "${event.title}" (${event.start_date}) — already exists as ${duplicate.pk} from ${duplicate.source}`
    );
    return { eventId, savedEvent: { pk: duplicate.pk, title: event.title, skipped: true } };
  }

  const timestamp = Date.now();

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

    const command = new PutItemCommand({
      TableName: tableName,
      Item: marshall(item, { removeUndefinedValues: true }),
      ConditionExpression: "attribute_not_exists(pk)",
    });

    await client.send(command);

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
      console.error(`Error saving event "${event.title}" (${eventId}):`, error.message);
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

  try {
    const tableName = getTableName();

    const command = new PutItemCommand({
      TableName: tableName,
      Item: marshall(item, { removeUndefinedValues: true }),
    });

    await client.send(command);

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
      console.error(`Error saving group "${group.title}" (${group.pk}/${group.sk}):`, error.message);
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
      try {
        payload = JSON.parse(event.body);
      } catch (e) {
        try {
          payload = JSON.parse(JSON.parse(event.body));
        } catch (e2) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          throw new Error(`Invalid payload format: ${errorMessage}`);
        }
      }
    } else if (event.body.Payload) {
      payload =
        typeof event.body.Payload === "string"
          ? JSON.parse(event.body.Payload)
          : event.body.Payload;
    } else {
      payload = event.body;
    }
  } else {
    payload = event;
  }

  const items = payload.events || payload;
  const eventType = payload.eventType;
  const source = payload.source || "unknown";

  if (!Array.isArray(items)) {
    console.error("Items is not an array:", typeof items);
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Items must be an array",
        received: typeof items,
      }),
    };
  }

  const isGroup =
    eventType === "group" ||
    items.some((item: any) => item.isGroup || item.type === "group");

  if (isGroup) {
    console.log(`Processing ${items.length} group items`);

    const eventIds: string[] = [];
    const savedEvents: any[] = [];

    for (const group of items) {
      try {
        if (!group.title || typeof group.title !== "string") {
          continue;
        }

        const result = await saveGroup(group);
        eventIds.push(result.eventId);
        savedEvents.push(result.savedEvent);

        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error saving group "${group.title || "unknown"}":`, error instanceof Error ? error.message : String(error));
      }
    }

    console.log(`Saved ${savedEvents.length}/${items.length} group items`);

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

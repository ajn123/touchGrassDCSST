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
 * Get the DynamoDB table name with validation
 */
function getTableName(): string {
  try {
    // Log what we're trying to access for debugging
    console.log("🔍 Attempting to get table name from Resource.Db...");
    console.log("   Resource.Db exists:", !!Resource.Db);

    // Try to access the table name (use direct access like other functions)
    let tableName: string | undefined;
    try {
      // Try direct access first (matching pattern in api.ts and openWeb.ts)
      tableName = Resource.Db.name;
    } catch (resourceError: any) {
      console.error(
        "❌ Error accessing Resource.Db.name:",
        resourceError.message
      );
      console.error("   Error type:", resourceError.name);
      // Try optional chaining as fallback
      try {
        tableName = Resource.Db?.name;
      } catch (fallbackError: any) {
        console.error("❌ Fallback also failed:", fallbackError.message);
      }
    }

    // Also check environment variables as fallback
    const envTableName =
      process.env.SST_Resource_Db_name ||
      process.env.DB_NAME ||
      process.env.TABLE_NAME;

    console.log("   Resource.Db?.name:", tableName);
    console.log(
      "   Environment variable (SST_Resource_Db_name):",
      envTableName
    );
    console.log(
      "   All DB-related env vars:",
      Object.keys(process.env).filter(
        (k) => k.includes("DB") || k.includes("TABLE")
      )
    );
    // Log all SST-related env vars to see what SST injects
    const sstEnvVars = Object.keys(process.env)
      .filter((k) => k.startsWith("SST_") || k.includes("Resource"))
      .reduce((acc, key) => {
        acc[key] = process.env[key];
        return acc;
      }, {} as Record<string, string | undefined>);
    console.log(
      "   All SST-related env vars:",
      JSON.stringify(sstEnvVars, null, 2)
    );

    if (!tableName && envTableName) {
      console.log("⚠️  Using table name from environment variable as fallback");
      tableName = envTableName;
    }

    if (!tableName) {
      const errorMsg =
        "DynamoDB table name is not available. Resource.Db.name is undefined. " +
        "Make sure the function is properly linked to the db resource. " +
        `Resource.Db exists: ${!!Resource.Db}, Env vars checked: ${!!envTableName}`;
      console.error("❌", errorMsg);
      throw new Error(errorMsg);
    }

    console.log("✅ Using table name:", tableName);
    return tableName;
  } catch (error: any) {
    console.error("❌ Failed to get table name:", error.message);
    console.error("   Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    throw error;
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
    isPublic: (event.is_public ?? true).toString(),

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
        console.error("Failed to parse event.body as JSON:", e);
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
      payload =
        typeof event.body.Payload === "string"
          ? JSON.parse(event.body.Payload)
          : event.body.Payload;
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

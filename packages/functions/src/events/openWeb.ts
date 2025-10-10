import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { Client } from "@opensearch-project/opensearch";
import axios from "axios";
import { Resource } from "sst";

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: "us-east-1",
});
const docClient = DynamoDBDocumentClient.from(client);

// Initialize OpenSearch client
const openSearchClient = new Client({
  node: Resource.MySearch.url,
  auth: {
    username: Resource.MySearch.username,
    password: Resource.MySearch.password,
  },
});

// OpenWebNinja API configuration
const OPENWEBNINJA_CONFIG = {
  apiKey: Resource.OPENWEBNINJA_API_KEY.value,
  baseUrl: "https://api.openwebninja.com/realtime-events-data",
};

interface OpenWebNinjaEvent {
  event_id: string;
  name: string;
  description: string;
  start_time: string;
  end_time?: string;
  link: string;
  thumbnail?: string;
  publisher: string;
  is_virtual: boolean;
  venue?: {
    name?: string;
    address?: string;
    google_id?: string;
  };
  ticket_links?: Array<{
    source: string;
    link: string;
  }>;
}

interface OpenWebNinjaResponse {
  status: string;
  request_id: string;
  parameters: {
    query: string;
    date: string;
  };
  data: OpenWebNinjaEvent[];
}

// Transform OpenWebNinja event to our internal format
function transformOpenWebNinjaEvent(event: OpenWebNinjaEvent) {
  const startDate = event.start_time ? event.start_time.split(" ")[0] : "";
  const startTime = event.start_time
    ? event.start_time.split(" ")[1] || ""
    : "";
  const endDate = event.end_time ? event.end_time.split(" ")[0] : null;
  const endTime = event.end_time ? event.end_time.split(" ")[1] || "" : null;

  return {
    title: event.name,
    description: event.description,
    location: event.venue?.name || "Washington, DC",
    start_date: startDate,
    end_date: endDate,
    start_time: startTime,
    end_time: endTime,
    category: ["General"], // Default category since not provided by API
    image_url: event.thumbnail || null,
    socials: {
      website: event.link,
    },
    isPublic: true,
    cost: {
      type: "unknown",
      currency: "USD",
      amount: 0,
    },
    source: "openwebninja",
    external_id: event.event_id,
    publisher: event.publisher,
    is_virtual: event.is_virtual,
    ticket_links: event.ticket_links || [],
  };
}

// Generate a unique ID for the event based on external_id, title, date, and location
function generateEventId(event: any): string {
  // Use external_id if available (from OpenWebNinja API)
  if (event.external_id) {
    return event.external_id;
  }

  // Fallback to title, date, and location
  const title = event.title.toLowerCase().replace(/[^a-z0-9]/g, "");
  const date = event.start_date || "";
  const location = event.location.toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${title}_${date}_${location}`.substring(0, 100);
}

// Check if event already exists in DynamoDB
async function eventExists(
  eventId: string,
  tableName: string
): Promise<boolean> {
  try {
    const command = new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: {
        ":pk": `EVENT#${eventId}`,
      },
      Limit: 1,
    });

    const result = await docClient.send(command);
    return result.Items && result.Items.length > 0;
  } catch (error) {
    console.error("Error checking if event exists:", error);
    return false;
  }
}

// Insert event into DynamoDB
async function insertEvent(event: any, tableName: string): Promise<void> {
  const eventId = generateEventId(event);

  // Check if event already exists
  if (await eventExists(eventId, tableName)) {
    console.log(`Event already exists, skipping: ${event.title}`);
    return;
  }

  const now = Date.now();
  const categoryString = Array.isArray(event.category)
    ? event.category.join(",")
    : event.category || "General";

  const item = {
    pk: `EVENT#${eventId}`,
    sk: `EVENT#${eventId}`,
    createdAt: now,
    title: event.title,
    category: categoryString,
    isPublic: "true",

    // Store all event fields at the same level
    description: event.description,
    location: event.location,
    start_date: event.start_date,
    end_date: event.end_date,
    start_time: event.start_time,
    end_time: event.end_time,
    image_url: event.image_url,
    socials: event.socials,
    cost: event.cost,
    source: event.source,
    external_id: event.external_id,
    publisher: event.publisher,
    is_virtual: event.is_virtual,
    ticket_links: event.ticket_links,
    id: eventId,
    created_at: new Date(now).toISOString(),
    updated_at: new Date(now).toISOString(),
  };

  try {
    const command = new PutCommand({
      TableName: tableName,
      Item: item,
      ConditionExpression: "attribute_not_exists(pk)", // Ensure idempotency
    });

    await docClient.send(command);
    console.log(`Successfully inserted event: ${event.title}`);
  } catch (error: any) {
    if (error.name === "ConditionalCheckFailedException") {
      console.log(
        `Event already exists (conditional check failed): ${event.title}`
      );
    } else {
      console.error("Error inserting event:", error);
      throw error;
    }
  }
}

// Query OpenWebNinja API for events
async function queryOpenWebNinjaEvents(
  query: string,
  limit: number = 50
): Promise<OpenWebNinjaEvent[]> {
  try {
    const params = new URLSearchParams({
      query: query,
      limit: limit.toString(),
    });

    const response = await axios.get(
      `${OPENWEBNINJA_CONFIG.baseUrl}/search-events?${params.toString()}`,
      {
        headers: {
          "x-api-key": OPENWEBNINJA_CONFIG.apiKey,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.data || [];
  } catch (error) {
    console.error("Error querying OpenWebNinja API:", error);
    throw error;
  }
}

// Parse categories from DynamoDB format
function parseCategories(category: any): string[] {
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

// Parse cost amount
function parseCostAmount(amount: any): number {
  if (typeof amount === "number") return amount;
  if (typeof amount === "string") {
    const parsed = parseFloat(amount);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

// Parse date fields
function parseDate(dateValue: any): string | undefined {
  if (!dateValue) return undefined;
  if (typeof dateValue === "string") {
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split("T")[0]; // YYYY-MM-DD format
    }
  }
  return undefined;
}

// Transform DynamoDB event to OpenSearch format
function transformEventForOpenSearch(event: any): any {
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

// Index a single event to OpenSearch
async function indexEventToOpenSearch(event: any): Promise<void> {
  try {
    const searchableEvent = transformEventForOpenSearch(event);

    // Use the event's primary key as the document ID to prevent duplicates
    const eventId =
      event.pk || event.id || `event-${Date.now()}-${Math.random()}`;

    await openSearchClient.index({
      index: "events-groups-index",
      id: eventId, // Explicitly set the document ID
      body: searchableEvent,
    });

    console.log(
      `✅ Indexed event to OpenSearch: ${event.title} (ID: ${eventId})`
    );
  } catch (error) {
    console.error(
      `❌ Error indexing event to OpenSearch: ${event.title}`,
      error
    );
    // Don't throw - we don't want OpenSearch errors to break the main flow
  }
}

// Reindex all events to OpenSearch (for new events)
async function reindexNewEvents(tableName: string): Promise<void> {
  try {
    console.log("🔄 Starting OpenSearch reindexing for new events...");

    // Fetch only recent events (last 24 hours)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    const command = new ScanCommand({
      TableName: tableName,
      FilterExpression:
        "begins_with(pk, :eventPrefix) AND createdAt > :recentTime",
      ExpressionAttributeValues: {
        ":eventPrefix": "EVENT#",
        ":recentTime": oneDayAgo,
      },
    });

    const result = await docClient.send(command);

    if (!result.Items || result.Items.length === 0) {
      console.log("ℹ️ No recent events found for reindexing");
      return;
    }

    console.log(`📝 Reindexing ${result.Items.length} recent events...`);

    let successCount = 0;
    for (const event of result.Items) {
      await indexEventToOpenSearch(event);
      successCount++;
    }

    console.log(
      `✅ OpenSearch reindexing completed: ${successCount} events indexed`
    );
  } catch (error) {
    console.error("❌ Error during OpenSearch reindexing:", error);
    // Don't throw - we don't want OpenSearch errors to break the main flow
  }
}

export const handler = async (event: any) => {
  console.log("OpenWebNinja handler started");

  try {
    // Get table name from environment
    const tableName = Resource.Db.name;
    if (!tableName) {
      throw new Error("DB_NAME environment variable not set");
    }

    // Make a single API call for Washington DC events
    const query = "Events in Washington DC";
    console.log(`Making API call for: "${query}"`);

    const events = await queryOpenWebNinjaEvents(query, 50);
    console.log(`✅ API call successful! Found ${events.length} events`);

    let totalEventsProcessed = 0;
    let totalEventsInserted = 0;

    // Process each event
    for (const rawEvent of events) {
      totalEventsProcessed++;

      try {
        const transformedEvent = transformOpenWebNinjaEvent(rawEvent);
        await insertEvent(transformedEvent, tableName);
        totalEventsInserted++;
        console.log(`✅ Inserted event: ${transformedEvent.title}`);
      } catch (error) {
        console.error(`❌ Error processing event: ${rawEvent.name}`, error);
      }
    }

    console.log(
      `OpenWebNinja handler completed. Processed: ${totalEventsProcessed}, Inserted: ${totalEventsInserted}`
    );

    // Trigger OpenSearch reindexing for new events
    if (totalEventsInserted > 0) {
      console.log("🔄 Triggering OpenSearch reindexing for new events...");
      await reindexNewEvents(tableName);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "OpenWebNinja events processed successfully",
        processed: totalEventsProcessed,
        inserted: totalEventsInserted,
        reindexed: totalEventsInserted > 0,
      }),
    };
  } catch (error) {
    console.error("OpenWebNinja handler error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error processing OpenWebNinja events",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};

import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { Client } from "@opensearch-project/opensearch";
import { Resource } from "sst";

async function fixDuplicates() {
  console.log("🔧 Fixing duplicate results in OpenSearch...");

  const client = new Client({
    node: Resource.MySearch.url,
    auth: {
      username: Resource.MySearch.username,
      password: Resource.MySearch.password,
    },
  });

  const db = new DynamoDBClient({
    region: "us-east-1",
  });

  try {
    // Step 1: Delete the existing index
    console.log("🗑️ Deleting existing index...");
    try {
      await client.indices.delete({
        index: "events-groups-index",
      });
      console.log("✅ Index deleted successfully");
    } catch (error: any) {
      if (error.meta?.statusCode === 404) {
        console.log("ℹ️ Index doesn't exist, continuing...");
      } else {
        throw error;
      }
    }

    // Step 2: Recreate the index with proper mapping
    console.log("📝 Creating new index...");
    const indexBody = {
      settings: {
        analysis: {
          analyzer: {
            text_analyzer: {
              type: "custom",
              tokenizer: "standard",
              filter: ["lowercase", "stop", "snowball"],
            },
          },
        },
      },
      mappings: {
        properties: {
          id: { type: "keyword" },
          type: { type: "keyword" },
          title: {
            type: "text",
            analyzer: "text_analyzer",
            fields: {
              keyword: { type: "keyword" },
            },
          },
          description: { type: "text", analyzer: "text_analyzer" },
          category: {
            type: "keyword",
            fields: {
              text: { type: "text", analyzer: "text_analyzer" },
              keyword: { type: "keyword" },
            },
          },
          location: { type: "text", analyzer: "text_analyzer" },
          venue: { type: "text", analyzer: "text_analyzer" },
          date: { type: "date" },
          start_date: { type: "date" },
          end_date: { type: "date" },
          cost: { type: "object" },
          image_url: { type: "keyword" },
          socials: { type: "object" },
          isPublic: { type: "boolean" },
          createdAt: { type: "long" },
          scheduleDay: { type: "keyword" },
          scheduleTime: { type: "keyword" },
          scheduleLocation: { type: "text", analyzer: "text_analyzer" },
          schedules: { type: "object" },
        },
      },
    };

    await client.indices.create({
      index: "events-groups-index",
      body: indexBody,
    });
    console.log("✅ Index created successfully");

    // Step 3: Fetch only the main group info items (not schedules)
    console.log("📊 Fetching groups (main info only)...");
    const groupsCommand = new ScanCommand({
      TableName: Resource.Db.name,
      FilterExpression: "begins_with(pk, :groupPrefix) AND sk = :groupInfo",
      ExpressionAttributeValues: {
        ":groupPrefix": { S: "GROUP#" },
        ":groupInfo": { S: "GROUP_INFO" },
      },
    });
    const groupsResult = await db.send(groupsCommand);
    const groups = groupsResult.Items?.map((item) => unmarshall(item)) || [];
    console.log(`📊 Found ${groups.length} unique groups`);

    // Step 4: Fetch events
    // console.log("📊 Fetching events...");
    const eventsCommand = new ScanCommand({
      TableName: Resource.Db.name,
      FilterExpression:
        "(begins_with(pk, :eventPrefixNew) OR begins_with(pk, :eventPrefixOld))",
      ExpressionAttributeValues: {
        ":eventPrefixNew": { S: "EVENT-" },
        ":eventPrefixOld": { S: "EVENT#" },
      },
    });
    const eventsResult = await db.send(eventsCommand);
    const events = eventsResult.Items?.map((item) => unmarshall(item)) || [];
    console.log(`📊 Found ${events.length} events`);

    // Step 5: Index groups (only main info items)
    console.log("📝 Indexing groups...");
    for (const group of groups) {
      const searchableGroup: any = {
        id: group.pk || `group-${Date.now()}`,
        type: "group",
        title: group.title || "",
        description: group.description || "",
        category: parseCategories(group.category),
        location: group.location || "",
        venue: group.venue || "",
        cost: {
          type: group.cost?.type || "unknown",
          amount: parseCostAmount(group.cost?.amount),
          currency: group.cost?.currency || "USD",
        },
        image_url: group.image_url || "",
        socials: group.socials || {},
        isPublic: group.isPublic === "true" || group.isPublic === true,
        createdAt: group.createdAt || Date.now(),
        scheduleDay: group.scheduleDay || "",
        scheduleTime: group.scheduleTime || "",
        scheduleLocation: group.scheduleLocation || "",
        schedules: group.schedules || [],
      };

      await client.index({
        index: "events-groups-index",
        id: group.pk || `group-${Date.now()}`,
        body: searchableGroup,
      });
    }
    console.log("✅ Groups indexed successfully");

    // Step 6: Index events
    console.log("📝 Indexing events...");
    for (const event of events) {
      const searchableEvent: any = {
        id: event.pk || `event-${Date.now()}`,
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

      await client.index({
        index: "events-groups-index",
        id: event.pk || `event-${Date.now()}`,
        body: searchableEvent,
      });
    }
    console.log("✅ Events indexed successfully");

    console.log("🎉 Duplicate fix completed successfully!");
    console.log(
      `📊 Indexed ${events.length} events and ${groups.length} groups`
    );
  } catch (error) {
    console.error("❌ Error fixing duplicates:", error);
    throw error;
  }
}

// Helper functions
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

function parseCostAmount(amount: any): number {
  if (typeof amount === "number") return amount;
  if (typeof amount === "string") {
    const parsed = parseFloat(amount);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function parseDate(dateStr: any): string | undefined {
  if (!dateStr) return undefined;
  try {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? undefined : date.toISOString();
  } catch {
    return undefined;
  }
}

// Run the fix
fixDuplicates()
  .then(() => {
    console.log("✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });

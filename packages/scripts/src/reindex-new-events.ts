import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
// import { Client } from "@opensearch-project/opensearch";
import { Resource } from "sst";

interface SearchableEvent {
  id: string;
  type: "event";
  title: string;
  description: string;
  category: string[];
  location: string;
  venue: string;
  cost: {
    type: string;
    amount: number;
    currency: string;
  };
  image_url: string;
  socials: any;
  isPublic: boolean;
  createdAt: number;
  date?: string;
  start_date?: string;
  end_date?: string;
}

class EventReindexer {
  // private client: Client;
  private db: DynamoDBClient;

  constructor() {
    // OpenSearch indexing disabled - using DynamoDB with frontend filtering instead
    // this.client = new Client({
    //   node: Resource.MySearch.url,
    //   auth: {
    //     username: Resource.MySearch.username,
    //     password: Resource.MySearch.password,
    //   },
    // });

    this.db = new DynamoDBClient({
      region: "us-east-1",
    });
  }

  // Parse categories from DynamoDB format
  private parseCategories(category: any): string[] {
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
  private parseCostAmount(amount: any): number {
    if (typeof amount === "number") return amount;
    if (typeof amount === "string") {
      const parsed = parseFloat(amount);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  // Parse date fields
  private parseDate(dateValue: any): string | undefined {
    if (!dateValue) return undefined;
    if (typeof dateValue === "string") {
      // Handle various date formats
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split("T")[0]; // YYYY-MM-DD format
      }
    }
    return undefined;
  }

  // Fetch all events from DynamoDB
  async fetchAllEvents(): Promise<any[]> {
    console.log("📊 Fetching all events from DynamoDB...");

    const events: any[] = [];
    let lastEvaluatedKey: any = undefined;

    do {
      const command = new ScanCommand({
        TableName: Resource.Db.name,
        FilterExpression:
          "(begins_with(pk, :eventPrefixNew) OR begins_with(pk, :eventPrefixOld))",
        ExpressionAttributeValues: {
          ":eventPrefixNew": { S: "EVENT-" },
          ":eventPrefixOld": { S: "EVENT#" },
        },
        ExclusiveStartKey: lastEvaluatedKey,
      });

      const result = await this.db.send(command);

      if (result.Items) {
        const batchEvents = result.Items.map((item) => unmarshall(item));
        events.push(...batchEvents);
        console.log(
          `📦 Fetched batch of ${batchEvents.length} events (total: ${events.length})`
        );
      }

      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    console.log(`✅ Total events fetched: ${events.length}`);
    return events;
  }

  // Transform DynamoDB event to OpenSearch format
  private transformEvent(event: any): SearchableEvent {
    const eventId = event.pk || `event-${Date.now()}-${Math.random()}`;

    return {
      id: eventId,
      type: "event",
      title: event.title || "",
      description: event.description || "",
      category: this.parseCategories(event.category),
      location: event.location || "",
      venue: event.venue || "",
      cost: {
        type: event.cost?.type || "unknown",
        amount: this.parseCostAmount(event.cost?.amount),
        currency: event.cost?.currency || "USD",
      },
      image_url: event.image_url || "",
      socials: event.socials || {},
      isPublic: event.isPublic === "true" || event.isPublic === true,
      createdAt: event.createdAt || Date.now(),
      date: this.parseDate(event.date || event.start_date),
      start_date: this.parseDate(event.start_date || event.date),
      end_date: this.parseDate(event.end_date),
    };
  }

  // Index events into OpenSearch - DISABLED: Using DynamoDB with frontend filtering instead
  async indexEvents(events: any[]): Promise<void> {
    console.log(`⚠️ OpenSearch indexing is disabled. Skipping indexing of ${events.length} events.`);
    console.log(`ℹ️ Events are now searched directly from DynamoDB with frontend filtering.`);
    return;
    
    /* OpenSearch indexing code commented out
    console.log(`📝 Indexing ${events.length} events into OpenSearch...`);

    const indexedIds = new Set<string>();
    let successCount = 0;
    let skipCount = 0;

    for (const event of events) {
      const eventId = event.pk || `event-${Date.now()}-${Math.random()}`;

      // Skip if already indexed in this batch
      if (indexedIds.has(eventId)) {
        console.log(`⏭️ Skipping duplicate event: ${eventId}`);
        skipCount++;
        continue;
      }
      indexedIds.add(eventId);

      try {
        const searchableEvent = this.transformEvent(event);

        await this.client.index({
          index: "events-groups-index",
          id: eventId, // Explicitly set the document ID to prevent duplicates
          body: searchableEvent,
        });

        successCount++;
        if (successCount % 10 === 0) {
          console.log(`📝 Indexed ${successCount}/${events.length} events...`);
        }
      } catch (error) {
        console.error(`❌ Error indexing event ${event.title}:`, error);
      }
    }

    console.log(`✅ Indexing completed!`);
    console.log(`📊 Successfully indexed: ${successCount} events`);
    console.log(`⏭️ Skipped duplicates: ${skipCount} events`);
    */
  }

  // Check if index exists - DISABLED: OpenSearch indexing removed
  async indexExists(): Promise<boolean> {
    // OpenSearch indexing disabled
    return false;
    
    /* OpenSearch code commented out
    try {
      await this.client.indices.get({
        index: "events-groups-index",
      });
      return true;
    } catch (error: any) {
      if (error.meta?.statusCode === 404) {
        return false;
      }
      throw error;
    }
    */
  }

  // Create index if it doesn't exist - DISABLED: OpenSearch indexing removed
  async ensureIndex(): Promise<void> {
    console.log("⚠️ OpenSearch indexing is disabled. Skipping index creation.");
    return;
    
    /* OpenSearch code commented out
    if (await this.indexExists()) {
      console.log("✅ OpenSearch index already exists");
      return;
    }

    console.log("📝 Creating OpenSearch index...");

    const indexBody = {
      settings: {
        number_of_shards: 1,
        number_of_replicas: 0,
        analysis: {
          analyzer: {
            custom_analyzer: {
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
            analyzer: "custom_analyzer",
            fields: {
              keyword: { type: "keyword" },
            },
          },
          description: {
            type: "text",
            analyzer: "custom_analyzer",
          },
          category: { type: "keyword" },
          location: {
            type: "text",
            analyzer: "custom_analyzer",
            fields: {
              keyword: { type: "keyword" },
            },
          },
          venue: {
            type: "text",
            analyzer: "custom_analyzer",
            fields: {
              keyword: { type: "keyword" },
            },
          },
          cost: {
            properties: {
              type: { type: "keyword" },
              amount: { type: "float" },
              currency: { type: "keyword" },
            },
          },
          image_url: { type: "keyword" },
          socials: { type: "object" },
          isPublic: { type: "boolean" },
          createdAt: { type: "long" },
          date: { type: "date" },
          start_date: { type: "date" },
          end_date: { type: "date" },
        },
      },
    };

    await this.client.indices.create({
      index: "events-groups-index",
      body: indexBody,
    });

    console.log("✅ OpenSearch index created successfully");
    */
  }

  // Main reindexing function - DISABLED: OpenSearch indexing removed
  async reindex(): Promise<void> {
    try {
      console.log("⚠️ OpenSearch reindexing is disabled.");
      console.log("ℹ️ Events are now searched directly from DynamoDB with frontend filtering.");
      console.log(`📊 Table: ${Resource.Db.name}`);

      // Fetch all events from DynamoDB (for verification/debugging)
      const events = await this.fetchAllEvents();

      if (events.length === 0) {
        console.log("ℹ️ No events found in DynamoDB");
        return;
      }

      console.log(`📊 Total events in DynamoDB: ${events.length}`);
      console.log("ℹ️ OpenSearch indexing skipped - using DynamoDB with frontend filtering instead");

      // OpenSearch indexing disabled
      // await this.ensureIndex();
      // await this.indexEvents(events);

      console.log("✅ Event count verification completed!");
    } catch (error) {
      console.error("❌ Error during reindexing:", error);
      throw error;
    }
  }
}

// Main execution
async function main() {
  const reindexer = new EventReindexer();
  await reindexer.reindex();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default EventReindexer;

import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { Client } from "@opensearch-project/opensearch";
import { Resource } from "sst";

interface OpenSearchConfig {
  endpoint: string;
  region: string;
  indexName: string;
  username?: string;
  password?: string;
  tableName?: string;
}

interface SearchableItem {
  id: string;
  type: "event" | "group";
  title: string;
  description?: string;
  category: string[];
  location?: string;
  venue?: string;
  date?: string;
  start_date?: string;
  end_date?: string;
  cost?: {
    type: string;
    amount: number | string;
    currency: string;
  };
  image_url?: string;
  socials?: any;
  isPublic: boolean;
  createdAt: number;
  // Group-specific fields
  scheduleDay?: string;
  scheduleTime?: string;
  scheduleLocation?: string;
  schedules?: any[];
}

class OpenSearchMigrator {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  async migrateData() {
    const db = new DynamoDBClient({
      region: "us-east-1",
    });

    const events = await this.fetchEvents(db);
    const groups = await this.fetchGroups(db);
    await this.indexEvents(events);
    await this.indexGroups(groups);
  }

  async createIndex() {
    try {
      // First, delete existing index if it exists
      console.log("🗑️ Deleting existing index if it exists...");
      try {
        await this.client.indices.delete({ index: "events-groups-index" });
        console.log("✅ Existing index deleted successfully");
      } catch (error: any) {
        if (error.statusCode === 404) {
          console.log("ℹ️ No existing index found, skipping deletion");
        } else {
          console.log("⚠️ Error deleting existing index:", error.message);
        }
      }

      console.log("🔧 Creating OpenSearch index...");

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
          index: {
            number_of_shards: 1,
            number_of_replicas: 1,
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

      const response = await this.client.indices.create({
        index: "events-groups-index",
        body: indexBody,
      });

      console.log(
        "✅ Index created successfully with correct category mapping"
      );
      return true;
    } catch (error: any) {
      console.error("❌ Error creating index:", error);
      return false;
    }
  }

  async fetchEvents(db: DynamoDBClient): Promise<any[]> {
    const command = new ScanCommand({
      TableName: Resource.Db.name,
      FilterExpression: "begins_with(pk, :eventPrefix)",
      ExpressionAttributeValues: {
        ":eventPrefix": { S: "EVENT#" },
      },
    });
    const result = await db.send(command);
    return result.Items?.map((item) => unmarshall(item)) || [];
  }

  async fetchGroups(db: DynamoDBClient): Promise<any[]> {
    const command = new ScanCommand({
      TableName: Resource.Db.name,
      FilterExpression: "begins_with(pk, :groupPrefix) AND sk = :groupInfo",
      ExpressionAttributeValues: {
        ":groupPrefix": { S: "GROUP#" },
        ":groupInfo": { S: "GROUP_INFO" },
      },
    });
    const result = await db.send(command);
    return result.Items?.map((item) => unmarshall(item)) || [];
  }

  async indexEvents(events: any[]) {
    try {
      console.log(`📝 Indexing ${events.length} events...`);
      const indexedIds = new Set<string>();

      for (const event of events) {
        const eventId = event.pk || `event-${Date.now()}-${Math.random()}`;

        // Skip if already indexed
        if (indexedIds.has(eventId)) {
          console.log(`⏭️ Skipping duplicate event: ${eventId}`);
          continue;
        }
        indexedIds.add(eventId);
        // Transform DynamoDB event to OpenSearch format
        const searchableEvent: any = {
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
        };

        // Only add date fields if they have valid values
        const dateValue = this.parseDate(event.date || event.start_date);
        if (dateValue) {
          searchableEvent.date = dateValue;
        }

        const startDateValue = this.parseDate(event.start_date || event.date);
        if (startDateValue) {
          searchableEvent.start_date = startDateValue;
        }

        const endDateValue = this.parseDate(event.end_date);
        if (endDateValue) {
          searchableEvent.end_date = endDateValue;
        }

        await this.client.index({
          index: "events-groups-index",
          body: searchableEvent,
        });
      }

      console.log("✅ Events indexed successfully");
    } catch (error) {
      console.error("❌ Error indexing events:", error);
      throw error;
    }
  }

  async indexGroups(groups: any[]) {
    try {
      console.log(`📝 Indexing ${groups.length} groups...`);
      const indexedIds = new Set<string>();

      for (const group of groups) {
        const groupId = group.pk || `group-${Date.now()}-${Math.random()}`;

        // Skip if already indexed
        if (indexedIds.has(groupId)) {
          console.log(`⏭️ Skipping duplicate group: ${groupId}`);
          continue;
        }
        indexedIds.add(groupId);
        // Transform DynamoDB group to OpenSearch format
        const searchableGroup: any = {
          id: groupId,
          type: "group",
          title: group.title || "",
          description: group.description || "",
          category: this.parseCategories(group.category),
          location: group.location || "",
          venue: group.venue || "",
          cost: {
            type: group.cost?.type || "unknown",
            amount: this.parseCostAmount(group.cost?.amount),
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

        // Only add date fields if they have valid values
        const dateValue = this.parseDate(group.date || group.start_date);
        if (dateValue) {
          searchableGroup.date = dateValue;
        }

        const startDateValue = this.parseDate(group.start_date || group.date);
        if (startDateValue) {
          searchableGroup.start_date = startDateValue;
        }

        const endDateValue = this.parseDate(group.end_date);
        if (endDateValue) {
          searchableGroup.end_date = endDateValue;
        }

        await this.client.index({
          index: "events-groups-index",
          body: searchableGroup,
        });
      }

      console.log("✅ Groups indexed successfully");
    } catch (error) {
      console.error("❌ Error indexing groups:", error);
      throw error;
    }
  }

  private generateSearchText(item: any): string {
    return item.title + " " + item.description + " " + item.category.join(" ");
  }

  private async bulkIndex(bulkBody: any[]) {
    await this.client.bulk({
      index: "events-groups-index",
      body: bulkBody,
    });
  }

  private parseCostAmount(amount: string | number | undefined): number {
    if (typeof amount === "string") {
      const match = amount.match(/(\d+)-(\d+)/);
      if (match) {
        const min = parseInt(match[1], 10);
        const max = parseInt(match[2], 10);
        return (min + max) / 2; // Average for range
      }
      return parseFloat(amount);
    }
    return typeof amount === "number" ? amount : 0;
  }

  private parseCategories(categories: string | string[] | undefined): string[] {
    if (typeof categories === "string") {
      return categories
        .split(",")
        .map((cat) => cat.trim())
        .filter(Boolean);
    }
    if (Array.isArray(categories)) {
      return categories.map((cat) => cat.trim()).filter(Boolean);
    }
    return [];
  }

  private parseDate(dateValue: string | undefined): string | undefined {
    if (!dateValue || dateValue.trim() === "") {
      return undefined;
    }

    // Try to parse the date to validate it
    const parsedDate = new Date(dateValue);
    if (isNaN(parsedDate.getTime())) {
      return undefined;
    }

    return dateValue;
  }

  async getIndexStats() {
    try {
      const response = await this.client.indices.stats({
        index: "events-groups-index",
      });
      return response.body;
    } catch (error) {
      console.error("❌ Error getting index stats:", error);
      return null;
    }
  }

  async search(query: string, filters: any = {}) {
    try {
      const searchBody: any = {
        query: {
          bool: {
            must: [
              {
                multi_match: {
                  query: query,
                  fields: ["title^3", "description^2", "category.text^2"],
                  type: "best_fields",
                  fuzziness: "AUTO",
                },
              },
            ],
            filter: [],
          },
        },
      };

      // Add type filter
      if (filters.type) {
        searchBody.query.bool.filter.push({
          term: { type: filters.type },
        });
      }

      // Add category filter
      if (filters.categories && filters.categories.length > 0) {
        searchBody.query.bool.filter.push({
          terms: { "category.keyword": filters.categories },
        });
      }

      // Add public filter
      if (filters.isPublic !== undefined) {
        searchBody.query.bool.filter.push({
          term: { isPublic: filters.isPublic },
        });
      }

      const response = await this.client.search({
        index: "events-groups-index",
        body: searchBody,
        size: filters.limit || 20,
      });

      return response.body;
    } catch (error) {
      console.error("❌ Search failed:", error);
      throw error;
    }
  }
}

export default OpenSearchMigrator;

// Main execution
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  async function main() {
    // Configuration for OpenSearch using SST resources

    const client = new Client({
      node: Resource.MySearch.url,
      auth: {
        username: Resource.MySearch.username,
        password: Resource.MySearch.password,
      },
    });
    const migrator = new OpenSearchMigrator(client);

    try {
      console.log("🚀 Starting OpenSearch migration...");
      console.log(`📊 Endpoint: ${Resource.MySearch.url}`);
      console.log(`📊 Index: events-groups-index`);
      console.log(`📊 Table: ${Resource.Db.name}`);
      console.log(`📊 Region: us-east-1`);

      // Create index first
      await migrator.createIndex();

      // Migrate all data
      await migrator.migrateData();

      console.log("✅ Migration completed successfully!");
    } catch (err) {
      console.error("❌ Error during migration:", err);
      process.exit(1);
    }
  }

  main().catch(console.error);
}

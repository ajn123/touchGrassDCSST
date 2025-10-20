#!/usr/bin/env tsx

import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { Resource } from "sst";

interface SavedEvent {
  pk: string;
  sk: string;
  createdAt: number;
  title: string;
  category?: string;
  isPublic: string;
  description?: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  time?: string;
  eventDate?: string;
  image_url?: string;
  socials?: any;
  cost?: string;
  source?: string;
  external_id?: string;
  publisher?: string;
  is_virtual?: boolean;
  ticket_links?: any;
  id?: string;
  created_at?: string;
  updated_at?: string;
  updatedAt?: number;
  titlePrefix?: string;
}

class EventQueryService {
  private client: DynamoDBClient;

  constructor() {
    this.client = new DynamoDBClient({
      region: process.env.AWS_REGION || "us-east-1",
    });
  }

  async getAllEvents(): Promise<SavedEvent[]> {
    console.log("🔍 Fetching all events from DynamoDB...");
    console.log("📊 Table name:", Resource.Db.name);

    try {
      // Query for all events with different prefixes
      const command = new ScanCommand({
        TableName: Resource.Db.name,
        FilterExpression:
          "(begins_with(#pk, :eventPrefixNew) OR begins_with(#pk, :eventPrefixOld) OR begins_with(#pk, :washingtonianPrefixNew) OR begins_with(#pk, :washingtonianPrefixOld)) AND #isPublic = :isPublic",
        ExpressionAttributeNames: {
          "#pk": "pk",
          "#isPublic": "isPublic",
        },
        ExpressionAttributeValues: {
          ":eventPrefixNew": { S: "EVENT-" },
          ":eventPrefixOld": { S: "EVENT#" },
          ":washingtonianPrefixNew": { S: "EVENT-WASHINGTONIAN-" },
          ":washingtonianPrefixOld": { S: "EVENT#WASHINGTONIAN#" },
          ":isPublic": { S: "true" },
        },
      });

      const result = await this.client.send(command);
      console.log(`✅ Found ${result.Items?.length || 0} events`);

      const events =
        result.Items?.map((item) => unmarshall(item) as SavedEvent) || [];
      return events.sort((a, b) => b.createdAt - a.createdAt); // Sort by newest first
    } catch (error) {
      console.error("❌ Error fetching events:", error);
      return [];
    }
  }

  async getEventsBySource(source: string): Promise<SavedEvent[]> {
    console.log(`🔍 Fetching events from source: ${source}...`);

    try {
      const command = new ScanCommand({
        TableName: Resource.Db.name,
        FilterExpression:
          "(begins_with(#pk, :eventPrefixNew) OR begins_with(#pk, :eventPrefixOld) OR begins_with(#pk, :washingtonianPrefixNew) OR begins_with(#pk, :washingtonianPrefixOld)) AND #isPublic = :isPublic AND #source = :source",
        ExpressionAttributeNames: {
          "#pk": "pk",
          "#isPublic": "isPublic",
          "#source": "source",
        },
        ExpressionAttributeValues: {
          ":eventPrefixNew": { S: "EVENT-" },
          ":eventPrefixOld": { S: "EVENT#" },
          ":washingtonianPrefixNew": { S: "EVENT-WASHINGTONIAN-" },
          ":washingtonianPrefixOld": { S: "EVENT#WASHINGTONIAN#" },
          ":isPublic": { S: "true" },
          ":source": { S: source },
        },
      });

      const result = await this.client.send(command);
      console.log(
        `✅ Found ${result.Items?.length || 0} events from ${source}`
      );

      const events =
        result.Items?.map((item) => unmarshall(item) as SavedEvent) || [];
      return events.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error(`❌ Error fetching events from ${source}:`, error);
      return [];
    }
  }

  displayEventDetails(event: SavedEvent, index: number): void {
    console.log(`\n📅 Event #${index + 1}`);
    console.log("=".repeat(50));
    console.log(`🆔 ID: ${event.pk}`);
    console.log(`📝 Title: ${event.title}`);
    console.log(
      `📅 Date: ${event.start_date || event.eventDate || "Not specified"}`
    );
    console.log(
      `⏰ Time: ${event.start_time || event.time || "Not specified"}`
    );
    console.log(`📍 Location: ${event.location || "Not specified"}`);
    console.log(`🏷️  Category: ${event.category || "Not specified"}`);
    console.log(`💰 Cost: ${event.cost || "Not specified"}`);
    console.log(`🌐 Source: ${event.source || "Not specified"}`);
    console.log(`📅 Created: ${new Date(event.createdAt).toLocaleString()}`);

    if (event.description) {
      console.log(
        `📄 Description: ${event.description.substring(0, 100)}${
          event.description.length > 100 ? "..." : ""
        }`
      );
    }

    if (event.image_url) {
      console.log(`🖼️  Image: ${event.image_url}`);
    }

    if (event.socials) {
      console.log(`🔗 Socials: ${JSON.stringify(event.socials)}`);
    }

    if (event.ticket_links) {
      console.log(`🎫 Ticket Links: ${JSON.stringify(event.ticket_links)}`);
    }

    console.log(`👁️  Public: ${event.isPublic}`);
    console.log(`🆔 External ID: ${event.external_id || "Not specified"}`);
    console.log(`📰 Publisher: ${event.publisher || "Not specified"}`);
    console.log(`💻 Virtual: ${event.is_virtual ? "Yes" : "No"}`);
  }

  displaySummary(events: SavedEvent[]): void {
    console.log("\n📊 EVENT SUMMARY");
    console.log("=".repeat(50));
    console.log(`📈 Total Events: ${events.length}`);

    // Group by source
    const bySource = events.reduce((acc, event) => {
      const source = event.source || "Unknown";
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log("\n📊 Events by Source:");
    Object.entries(bySource).forEach(([source, count]) => {
      console.log(`  ${source}: ${count} events`);
    });

    // Group by category
    const byCategory = events.reduce((acc, event) => {
      const category = event.category || "Uncategorized";
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log("\n🏷️  Events by Category:");
    Object.entries(byCategory).forEach(([category, count]) => {
      console.log(`  ${category}: ${count} events`);
    });

    // Recent events
    const recentEvents = events.slice(0, 5);
    console.log("\n🕒 Most Recent Events:");
    recentEvents.forEach((event, index) => {
      console.log(
        `  ${index + 1}. ${event.title} (${
          event.source || "Unknown"
        }) - ${new Date(event.createdAt).toLocaleDateString()}`
      );
    });
  }
}

async function main() {
  console.log("🔍 Event Query Service");
  console.log("=".repeat(50));

  const queryService = new EventQueryService();

  // Get command line arguments
  const args = process.argv.slice(2);
  const command = args[0];
  const source = args[1];

  try {
    let events: SavedEvent[] = [];

    if (command === "source" && source) {
      events = await queryService.getEventsBySource(source);
    } else {
      events = await queryService.getAllEvents();
    }

    if (events.length === 0) {
      console.log("❌ No events found in the database");
      return;
    }

    // Display summary
    queryService.displaySummary(events);

    // Display detailed information for each event
    console.log("\n📋 DETAILED EVENT INFORMATION");
    console.log("=".repeat(50));

    events.forEach((event, index) => {
      queryService.displayEventDetails(event, index);
    });

    console.log("\n✅ Event query completed successfully!");
  } catch (error) {
    console.error("❌ Error in main:", error);
    process.exit(1);
  }
}

// Usage examples:
// tsx show-saved-events.ts                    # Show all events
// tsx show-saved-events.ts source washingtonian  # Show only Washingtonian events

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { EventQueryService };

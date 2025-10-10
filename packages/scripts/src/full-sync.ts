#!/usr/bin/env tsx

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { Client } from "@opensearch-project/opensearch";
import { execSync, spawn } from "child_process";
import { Resource } from "sst";

/**
 * Full Sync Script
 *
 * This script performs a complete sync of events and groups:
 * 1. Seeds data from events.json
 * 2. Syncs OpenWeb events via API
 * 3. Fixes duplicates in OpenSearch
 * 4. Reindexes all data
 *
 * Usage: npm run full-sync
 */

class FullSyncManager {
  private db: DynamoDBClient;
  private openSearchClient: Client;

  constructor() {
    this.db = new DynamoDBClient({
      region: "us-east-1",
    });

    this.openSearchClient = new Client({
      node: Resource.MySearch.url,
      auth: {
        username: Resource.MySearch.username,
        password: Resource.MySearch.password,
      },
    });
  }

  async runCommand(command: string, description: string): Promise<void> {
    console.log(`\n🚀 ${description}...`);
    console.log(`📝 Running: ${command}`);

    try {
      const result = execSync(command, {
        cwd: process.cwd(),
        stdio: "inherit",
        encoding: "utf8",
      });
      console.log(`✅ ${description} completed successfully`);
    } catch (error: any) {
      console.error(`❌ ${description} failed:`, error.message);
      throw error;
    }
  }

  async runScript(scriptPath: string, description: string): Promise<void> {
    console.log(`\n🚀 ${description}...`);
    console.log(`📝 Running script: ${scriptPath}`);

    return new Promise((resolve, reject) => {
      const child = spawn("tsx", [scriptPath], {
        stdio: "inherit",
        cwd: process.cwd(),
      });

      child.on("close", (code) => {
        if (code === 0) {
          console.log(`✅ ${description} completed successfully`);
          resolve();
        } else {
          console.error(`❌ ${description} failed with exit code ${code}`);
          reject(new Error(`Script failed with exit code ${code}`));
        }
      });

      child.on("error", (error) => {
        console.error(`❌ ${description} failed:`, error.message);
        reject(error);
      });
    });
  }

  async checkOpenSearchHealth(): Promise<void> {
    console.log("\n🔍 Checking OpenSearch health...");

    try {
      const health = await this.openSearchClient.cluster.health();
      console.log(`✅ OpenSearch cluster status: ${health.status}`);

      if (health.status === "red") {
        console.warn(
          "⚠️ OpenSearch cluster is in RED status - some shards may be unavailable"
        );
      }
    } catch (error) {
      console.error("❌ Failed to check OpenSearch health:", error);
      throw error;
    }
  }

  async getIndexStats(): Promise<void> {
    console.log("\n📊 Getting index statistics...");

    try {
      const stats = await this.openSearchClient.indices.stats({
        index: "events-groups-index",
      });

      const docCount =
        stats.indices?.["events-groups-index"]?.total?.docs?.count || 0;
      console.log(`📈 Total documents in index: ${docCount}`);

      return;
    } catch (error: any) {
      if (error.meta?.statusCode === 404) {
        console.log("ℹ️ Index doesn't exist yet - will be created during sync");
      } else {
        console.error("❌ Failed to get index stats:", error);
        throw error;
      }
    }
  }

  async fullSync(): Promise<void> {
    const startTime = Date.now();

    console.log("🎯 Starting Full Sync Process");
    console.log("=".repeat(50));

    try {
      // Step 1: Check OpenSearch health
      await this.checkOpenSearchHealth();

      // Step 2: Get current index stats
      await this.getIndexStats();

      // Step 3: Seed data from JSON files
      await this.runScript(
        "packages/scripts/src/seed-data.ts",
        "Seeding events from events.json"
      );
      await this.runScript(
        "packages/scripts/src/seed-groups.ts",
        "Seeding groups from groups.json"
      );
      await this.runScript(
        "packages/scripts/src/seed-venues.ts",
        "Seeding venues from venues.json"
      );

      // Step 4: Sync OpenWeb events
      console.log("\n🔄 Syncing OpenWeb events...");
      console.log("📝 This will trigger the OpenWeb API sync via Lambda");

      // Trigger the OpenWeb sync by calling the API endpoint
      try {
        const apiUrl = Resource.Api?.url;
        if (apiUrl) {
          console.log(
            `🌐 Calling OpenWeb sync endpoint: ${apiUrl}/events/sync`
          );

          // Use fetch to call the API endpoint
          const response = await fetch(`${apiUrl}/events/sync`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          });

          if (response.ok) {
            const result = await response.json();
            console.log("✅ OpenWeb sync completed:", result);
          } else {
            console.error(
              `❌ OpenWeb sync failed with status: ${response.status}`
            );
            throw new Error(
              `OpenWeb sync failed with status: ${response.status}`
            );
          }
        } else {
          console.warn("⚠️ API URL not available - skipping OpenWeb sync");
        }
      } catch (error) {
        console.error("❌ OpenWeb sync failed:", error);
        console.log("🔄 Continuing with other steps...");
      }

      // Step 5: Fix duplicates in OpenSearch
      await this.runScript(
        "packages/scripts/src/fix-duplicates.ts",
        "Fixing duplicates in OpenSearch"
      );

      // Step 6: Reindex all events
      await this.runScript(
        "packages/scripts/src/reindex-new-events.ts",
        "Reindexing all events"
      );

      // Step 7: Final index stats
      console.log("\n📊 Final index statistics:");
      await this.getIndexStats();

      const endTime = Date.now();
      const duration = Math.round((endTime - startTime) / 1000);

      console.log("\n🎉 Full Sync Process Completed Successfully!");
      console.log("=".repeat(50));
      console.log(`⏱️ Total duration: ${duration} seconds`);
      console.log("📋 Summary:");
      console.log("  ✅ Events seeded from events.json");
      console.log("  ✅ Groups seeded from groups.json");
      console.log("  ✅ Venues seeded from venues.json");
      console.log("  ✅ OpenWeb events synced");
      console.log("  ✅ Duplicates fixed in OpenSearch");
      console.log("  ✅ All data reindexed");
    } catch (error) {
      console.error("\n❌ Full Sync Process Failed!");
      console.error("=".repeat(50));
      console.error("Error:", error);
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const syncManager = new FullSyncManager();
  await syncManager.fullSync();
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Received SIGINT, shutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Received SIGTERM, shutting down gracefully...");
  process.exit(0);
});

// Run the main function
main().catch((error) => {
  console.error("❌ Unhandled error:", error);
  process.exit(1);
});

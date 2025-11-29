#!/usr/bin/env tsx
/**
 * Script to wipe EVERYTHING from DynamoDB
 * Usage: npm run shell tsx src/wipe-db.ts [--confirm]
 * 
 * WARNING: This will permanently delete ALL items from the database!
 * This includes groups, events, venues, and any other data.
 */

import {
  DynamoDBClient,
  ScanCommand,
  BatchWriteItemCommand,
} from "@aws-sdk/client-dynamodb";
import { Resource } from "sst";
import * as readline from "readline";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const tableName = Resource.Db.name;

interface WipeStats {
  totalScanned: number;
  totalDeleted: number;
  errors: number;
  itemTypes: Record<string, number>;
}

async function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${question} (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "yes" || answer.toLowerCase() === "y");
    });
  });
}

function getItemType(pk: string): string {
  if (pk.startsWith("GROUP#")) return "GROUP";
  if (pk.startsWith("EVENT-")) return "EVENT";
  if (pk.startsWith("VENUE#")) return "VENUE";
  if (pk.startsWith("USER#")) return "USER";
  return "OTHER";
}

async function wipeDatabase(confirmed: boolean) {
  console.log("🗑️  Database Wipe Script");
  console.log("=".repeat(80));
  
  // Check which stage/environment we're using
  const stage = process.env.SST_STAGE || process.env.STAGE || "unknown";
  const region = process.env.AWS_REGION || "us-east-1";
  
  console.log(`Stage: ${stage}`);
  console.log(`Region: ${region}`);
  console.log(`Table: ${tableName}`);
  console.log("=".repeat(80));
  
  // Warn if using development table when stage is production
  if (tableName.includes("alexandernorton") && stage === "production") {
    console.log("\n⚠️  WARNING: You appear to be using a DEVELOPMENT table!");
    console.log("   The table name contains 'alexandernorton' which suggests it's a dev table.");
    console.log("   Make sure you're running with the correct stage:");
    console.log("   npm run wipe:db:prod");
    console.log("\n");
  }

  if (!confirmed) {
    console.log("\n⚠️  WARNING: This will permanently delete:");
    console.log("   - ALL items from the database");
    console.log("   - Groups, Events, Venues, Users, and any other data");
    console.log("\nThis action CANNOT be undone!\n");

    const confirmed = await askConfirmation("Are you absolutely sure you want to wipe the entire database?");
    if (!confirmed) {
      console.log("\n❌ Wipe cancelled.");
      process.exit(0);
    }
  }

  const stats: WipeStats = {
    totalScanned: 0,
    totalDeleted: 0,
    errors: 0,
    itemTypes: {},
  };

  try {
    console.log("\n📊 Step 1: Scanning entire table...");
    console.log("-".repeat(80));

    // First, scan to get all items and categorize them
    let allItems: any[] = [];
    let lastEvaluatedKey: any = undefined;
    let scanCount = 0;

    do {
      scanCount++;
      const scanCommand = new ScanCommand({
        TableName: tableName,
        ExclusiveStartKey: lastEvaluatedKey,
      });

      const result = await client.send(scanCommand);
      const items = result.Items || [];

      if (items.length > 0) {
        allItems.push(...items);
        stats.totalScanned += items.length;

        // Categorize items
        items.forEach((item) => {
          const pk = item.pk?.S || "UNKNOWN";
          const itemType = getItemType(pk);
          stats.itemTypes[itemType] = (stats.itemTypes[itemType] || 0) + 1;
        });

        console.log(`   Scan ${scanCount}: Found ${items.length} items (${allItems.length} total)`);
      }

      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    console.log(`\n📊 Scan Complete:`);
    console.log(`   Total items found: ${allItems.length}`);
    console.log(`   Item breakdown:`);
    Object.entries(stats.itemTypes)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`      - ${type}: ${count}`);
      });

    if (allItems.length === 0) {
      console.log("\n✅ Database is already empty!");
      return;
    }

    console.log("\n🗑️  Step 2: Deleting all items...");
    console.log("-".repeat(80));

    // Delete items in batches of 25 (DynamoDB batch limit)
    for (let i = 0; i < allItems.length; i += 25) {
      const batch = allItems.slice(i, i + 25);
      const deleteRequests = batch.map((item) => ({
        DeleteRequest: {
          Key: {
            pk: item.pk!,
            sk: item.sk!,
          },
        },
      }));

      try {
        const batchCommand = new BatchWriteItemCommand({
          RequestItems: {
            [tableName]: deleteRequests,
          },
        });

        let batchResult = await client.send(batchCommand);

        // Handle unprocessed items with retry logic
        let retryCount = 0;
        while (
          batchResult.UnprocessedItems &&
          Object.keys(batchResult.UnprocessedItems).length > 0 &&
          retryCount < 5
        ) {
          const unprocessedCount = Object.keys(batchResult.UnprocessedItems[tableName] || {}).length;
          console.log(`   ⚠️  ${unprocessedCount} items not processed, retrying (attempt ${retryCount + 1}/5)...`);
          await new Promise((resolve) => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff

          const retryCommand = new BatchWriteItemCommand({
            RequestItems: batchResult.UnprocessedItems,
          });
          batchResult = await client.send(retryCommand);
          retryCount++;
        }

        if (batchResult.UnprocessedItems && Object.keys(batchResult.UnprocessedItems).length > 0) {
          const failedCount = Object.keys(batchResult.UnprocessedItems[tableName] || {}).length;
          stats.errors += failedCount;
          console.log(`   ❌ ${failedCount} items failed after retries`);
        }

        const deletedInBatch = batch.length - (batchResult.UnprocessedItems?.[tableName]?.length || 0);
        stats.totalDeleted += deletedInBatch;

        const progress = ((i + batch.length) / allItems.length * 100).toFixed(1);
        console.log(`   ✅ Deleted batch ${Math.floor(i / 25) + 1} (${stats.totalDeleted}/${allItems.length} items, ${progress}%)`);

        // Small delay to avoid throttling
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        stats.errors += batch.length;
        console.error(`   ❌ Error deleting batch:`, error instanceof Error ? error.message : String(error));
      }
    }

    // Verify deletion
    console.log("\n🔍 Step 3: Verifying deletion...");
    console.log("-".repeat(80));

    let remainingItems: any[] = [];
    lastEvaluatedKey = undefined;

    do {
      const verifyScan = new ScanCommand({
        TableName: tableName,
        ExclusiveStartKey: lastEvaluatedKey,
      });

      const verifyResult = await client.send(verifyScan);
      if (verifyResult.Items) {
        remainingItems.push(...verifyResult.Items);
      }
      lastEvaluatedKey = verifyResult.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    // Summary
    console.log("\n" + "=".repeat(80));
    console.log("📊 Wipe Summary:");
    console.log("=".repeat(80));
    console.log(`Items scanned: ${stats.totalScanned}`);
    console.log(`Items deleted: ${stats.totalDeleted}`);
    console.log(`Items remaining: ${remainingItems.length}`);
    console.log(`Errors: ${stats.errors}`);

    if (remainingItems.length > 0) {
      console.log("\n⚠️  WARNING: Some items still remain in the database:");
      const remainingByType: Record<string, number> = {};
      remainingItems.forEach((item) => {
        const pk = item.pk?.S || "UNKNOWN";
        const itemType = getItemType(pk);
        remainingByType[itemType] = (remainingByType[itemType] || 0) + 1;
      });

      Object.entries(remainingByType).forEach(([type, count]) => {
        console.log(`   - ${type}: ${count} items`);
      });
      console.log("\n💡 You may need to run this script again or check for errors above.");
    } else {
      console.log("\n✅ Database wipe completed successfully!");
      console.log("   The database is now empty.");
    }

    if (stats.errors > 0) {
      console.log(`\n⚠️  ${stats.errors} items failed to delete. Check errors above.`);
    }

  } catch (error) {
    console.error("\n❌ Error during wipe:", error);
    throw error;
  }
}

// Check for --confirm flag
const args = process.argv.slice(2);
const confirmed = args.includes("--confirm") || args.includes("-y");

wipeDatabase(confirmed)
  .then(() => {
    console.log("\n✅ Wipe script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Wipe failed:", error);
    process.exit(1);
  });


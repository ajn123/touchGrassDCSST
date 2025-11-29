#!/usr/bin/env tsx
/**
 * Script to remove all groups and events from DynamoDB
 * Usage: npm run shell tsx src/cleanup-db.ts [--confirm]
 * 
 * WARNING: This will permanently delete all groups and events!
 */

import {
  DynamoDBClient,
  ScanCommand,
  DeleteItemCommand,
  BatchWriteItemCommand,
} from "@aws-sdk/client-dynamodb";
import { Resource } from "sst";
import * as readline from "readline";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const tableName = Resource.Db.name;

interface DeleteStats {
  groups: { info: number; schedules: number; total: number };
  events: number;
  errors: number;
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

async function scanAndDelete(
  filterExpression: string,
  expressionAttributeValues: Record<string, any>,
  itemType: string
): Promise<{ deleted: number; errors: number }> {
  let deleted = 0;
  let errors = 0;
  let lastEvaluatedKey: any = undefined;

  console.log(`   Scanning for ${itemType} items...`);

  do {
    const scanCommand = new ScanCommand({
      TableName: tableName,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ExclusiveStartKey: lastEvaluatedKey,
    });

    const result = await client.send(scanCommand);
    const items = result.Items || [];

    if (items.length === 0) {
      if (!lastEvaluatedKey) {
        console.log(`   No ${itemType} items found`);
      }
      break;
    }

    console.log(`   Found ${items.length} ${itemType} items in this batch`);
    
    // Log first few items for debugging
    if (items.length > 0) {
      console.log(`   Sample items:`);
      items.slice(0, 3).forEach((item, idx) => {
        console.log(`     ${idx + 1}. pk: ${item.pk?.S}, sk: ${item.sk?.S}`);
      });
    }

    // Delete items in batches of 25 (DynamoDB batch limit)
    for (let i = 0; i < items.length; i += 25) {
      const batch = items.slice(i, i + 25);
      const deleteRequests = batch.map((item) => {
        const pk = item.pk!;
        const sk = item.sk!;
        
        // Log what we're deleting
        if (i === 0 && batch.indexOf(item) < 3) {
          console.log(`   Deleting: pk=${pk.S}, sk=${sk.S}`);
        }
        
        return {
          DeleteRequest: {
            Key: {
              pk,
              sk,
            },
          },
        };
      });

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
          retryCount < 3
        ) {
          console.log(`   ⚠️  ${Object.keys(batchResult.UnprocessedItems[tableName] || {}).length} items not processed, retrying...`);
          await new Promise((resolve) => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
          
          const retryCommand = new BatchWriteItemCommand({
            RequestItems: batchResult.UnprocessedItems,
          });
          batchResult = await client.send(retryCommand);
          retryCount++;
        }

        if (batchResult.UnprocessedItems && Object.keys(batchResult.UnprocessedItems).length > 0) {
          errors += Object.keys(batchResult.UnprocessedItems[tableName] || {}).length;
          console.log(`   ⚠️  ${errors} items failed after retries`);
        }

        deleted += batch.length - (batchResult.UnprocessedItems?.[tableName]?.length || 0);
        console.log(`   ✅ Deleted ${batch.length} items (${deleted} total ${itemType} items deleted)`);

        // Small delay to avoid throttling
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        errors += batch.length;
        console.error(`   ❌ Error deleting batch:`, error instanceof Error ? error.message : String(error));
      }
    }

    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return { deleted, errors };
}

async function cleanupDatabase(confirmed: boolean) {
  console.log("🗑️  Database Cleanup Script");
  console.log("=".repeat(80));
  console.log(`Table: ${tableName}`);
  console.log("=".repeat(80));

  if (!confirmed) {
    console.log("\n⚠️  WARNING: This will permanently delete:");
    console.log("   - All GROUP# items (GROUP_INFO and SCHEDULE items)");
    console.log("   - All EVENT# items");
    console.log("\nThis action cannot be undone!\n");

    const confirmed = await askConfirmation("Are you sure you want to proceed?");
    if (!confirmed) {
      console.log("\n❌ Cleanup cancelled.");
      process.exit(0);
    }
  }

  const stats: DeleteStats = {
    groups: { info: 0, schedules: 0, total: 0 },
    events: 0,
    errors: 0,
  };

  try {
    // Delete all GROUP# items
    console.log("\n📋 Step 1: Deleting all GROUP# items...");
    console.log("-".repeat(80));

    // First, scan to find all groups and log them
    console.log(`   First, scanning to find all GROUP# items...`);
    let allGroupItems: any[] = [];
    let lastKey: any = undefined;
    
    do {
      const scanCommand = new ScanCommand({
        TableName: tableName,
        FilterExpression: "begins_with(pk, :groupPrefix)",
        ExpressionAttributeValues: {
          ":groupPrefix": { S: "GROUP#" },
        },
        ExclusiveStartKey: lastKey,
      });
      
      const scanResult = await client.send(scanCommand);
      if (scanResult.Items) {
        allGroupItems.push(...scanResult.Items);
        console.log(`   Found ${scanResult.Items.length} items in this batch (${allGroupItems.length} total so far)`);
      }
      lastKey = scanResult.LastEvaluatedKey;
    } while (lastKey);
    
    console.log(`   📊 Total GROUP# items found: ${allGroupItems.length}`);
    
    if (allGroupItems.length > 0) {
      // Log all groups found
      const uniqueGroups = new Set(allGroupItems.map(item => item.pk?.S).filter(Boolean));
      console.log(`   📋 Unique groups found: ${uniqueGroups.size}`);
      uniqueGroups.forEach((pk) => {
        const itemsForGroup = allGroupItems.filter(item => item.pk?.S === pk);
        console.log(`      - ${pk}: ${itemsForGroup.length} items (${itemsForGroup.filter(i => i.sk?.S === "GROUP_INFO").length} GROUP_INFO, ${itemsForGroup.filter(i => i.sk?.S?.startsWith("SCHEDULE#")).length} SCHEDULE)`);
      });
    }

    // Now delete all found items
    const groupResult = await scanAndDelete(
      "begins_with(pk, :groupPrefix)",
      {
        ":groupPrefix": { S: "GROUP#" },
      },
      "GROUP#"
    );

    stats.groups.total = groupResult.deleted;
    stats.errors += groupResult.errors;

    console.log(`   ✅ Deleted ${groupResult.deleted} GROUP# items (includes both GROUP_INFO and SCHEDULE items)`);
    
    // Verify no groups remain - do a full scan, not just limit 10
    console.log(`\n🔍 Verifying all groups are deleted (full scan)...`);
    let remainingGroups: any[] = [];
    lastKey = undefined;
    
    do {
      const verifyGroupScan = new ScanCommand({
        TableName: tableName,
        FilterExpression: "begins_with(pk, :groupPrefix)",
        ExpressionAttributeValues: {
          ":groupPrefix": { S: "GROUP#" },
        },
        ExclusiveStartKey: lastKey,
      });
      
      const verifyResult = await client.send(verifyGroupScan);
      if (verifyResult.Items) {
        remainingGroups.push(...verifyResult.Items);
      }
      lastKey = verifyResult.LastEvaluatedKey;
    } while (lastKey);
    
    if (remainingGroups.length > 0) {
      console.log(`   ⚠️  WARNING: ${remainingGroups.length} GROUP# items still remain:`);
      const remainingGroupsByPk = new Map<string, any[]>();
      remainingGroups.forEach((item) => {
        const pk = item.pk?.S || "unknown";
        if (!remainingGroupsByPk.has(pk)) {
          remainingGroupsByPk.set(pk, []);
        }
        remainingGroupsByPk.get(pk)!.push(item);
      });
      
      remainingGroupsByPk.forEach((items, pk) => {
        console.log(`      - ${pk}: ${items.length} items`);
        items.forEach((item) => {
          console.log(`         * sk: ${item.sk?.S}`);
        });
      });
      console.log(`   💡 Try running: npm run shell tsx src/delete-specific-group.ts "North East Track Club"`);
    } else {
      console.log(`   ✅ Verified: No GROUP# items remain`);
    }

    // Delete all EVENT items
    // Events have pk = eventId where eventId starts with "EVENT-"
    console.log("\n📅 Step 2: Deleting all EVENT items...");
    console.log("-".repeat(80));

    const eventResult = await scanAndDelete(
      "begins_with(pk, :eventPrefix)",
      {
        ":eventPrefix": { S: "EVENT-" },
      },
      "EVENT"
    );

    stats.events = eventResult.deleted;
    stats.errors += eventResult.errors;

    // Summary
    console.log("\n" + "=".repeat(80));
    console.log("📊 Cleanup Summary:");
    console.log("=".repeat(80));
    console.log(`Groups deleted: ${stats.groups.total}`);
    console.log(`Events deleted: ${stats.events}`);
    console.log(`Errors: ${stats.errors}`);
    console.log(`Total items deleted: ${stats.groups.total + stats.events}`);

    if (stats.errors > 0) {
      console.log("\n⚠️  Some items failed to delete. Check errors above.");
    } else {
      console.log("\n✅ Cleanup completed successfully!");
    }

  } catch (error) {
    console.error("\n❌ Error during cleanup:", error);
    throw error;
  }
}

// Check for --confirm flag
const args = process.argv.slice(2);
const confirmed = args.includes("--confirm") || args.includes("-y");

cleanupDatabase(confirmed)
  .then(() => {
    console.log("\n✅ Cleanup script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Cleanup failed:", error);
    process.exit(1);
  });


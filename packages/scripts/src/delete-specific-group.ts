#!/usr/bin/env tsx
/**
 * Script to delete a specific group from DynamoDB
 * Usage: npm run shell tsx src/delete-specific-group.ts "North East Track Club"
 */

import {
  DynamoDBClient,
  QueryCommand,
  DeleteItemCommand,
  BatchWriteItemCommand,
} from "@aws-sdk/client-dynamodb";
import { Resource } from "sst";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const tableName = Resource.Db.name;

async function deleteSpecificGroup(groupTitle: string) {
  const groupPk = `GROUP#${groupTitle}`;

  // Check which stage/environment we're using
  const stage = process.env.SST_STAGE || process.env.STAGE || "unknown";
  const region = process.env.AWS_REGION || "us-east-1";

  console.log(`🗑️  Deleting group: "${groupTitle}"`);
  console.log(`   pk: ${groupPk}`);
  console.log("=".repeat(80));
  console.log(`Stage: ${stage}`);
  console.log(`Region: ${region}`);
  console.log(`Table: ${tableName}`);
  console.log("=".repeat(80));
  
  // Warn if using development table when stage is production
  if (tableName.includes("alexandernorton") && stage === "production") {
    console.log("\n⚠️  WARNING: You appear to be using a DEVELOPMENT table!");
    console.log("   The table name contains 'alexandernorton' which suggests it's a dev table.");
    console.log("   Make sure you're running with the correct stage:");
    console.log("   npm run delete:group:prod \"Group Name\"");
    console.log("\n");
  }

  try {
    // First, query for all items with this pk
    console.log("\n🔍 Finding all items for this group...");
    const queryCommand = new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: {
        ":pk": { S: groupPk },
      },
    });

    const result = await client.send(queryCommand);
    const items = result.Items || [];

    if (items.length === 0) {
      console.log("❌ No items found with this pk!");
      return;
    }

    console.log(`✅ Found ${items.length} items to delete:`);
    items.forEach((item, index) => {
      console.log(`   ${index + 1}. pk: ${item.pk?.S}, sk: ${item.sk?.S}`);
    });

    // Delete all items
    console.log(`\n🗑️  Deleting ${items.length} items...`);

    // Use batch delete for efficiency
    const deleteRequests = items.map((item) => ({
      DeleteRequest: {
        Key: {
          pk: item.pk!,
          sk: item.sk!,
        },
      },
    }));

    // Delete in batches of 25
    let deleted = 0;
    let errors = 0;

    for (let i = 0; i < deleteRequests.length; i += 25) {
      const batch = deleteRequests.slice(i, i + 25);

      try {
        const batchCommand = new BatchWriteItemCommand({
          RequestItems: {
            [tableName]: batch,
          },
        });

        let batchResult = await client.send(batchCommand);

        // Handle unprocessed items with retry
        let retryCount = 0;
        while (
          batchResult.UnprocessedItems &&
          Object.keys(batchResult.UnprocessedItems).length > 0 &&
          retryCount < 3
        ) {
          console.log(`   ⚠️  ${Object.keys(batchResult.UnprocessedItems[tableName] || {}).length} items not processed, retrying...`);
          await new Promise((resolve) => setTimeout(resolve, 1000 * (retryCount + 1)));
          
          const retryCommand = new BatchWriteItemCommand({
            RequestItems: batchResult.UnprocessedItems,
          });
          batchResult = await client.send(retryCommand);
          retryCount++;
        }

        if (batchResult.UnprocessedItems && Object.keys(batchResult.UnprocessedItems).length > 0) {
          errors += Object.keys(batchResult.UnprocessedItems[tableName] || {}).length;
        }

        deleted += batch.length - (batchResult.UnprocessedItems?.[tableName]?.length || 0);
        console.log(`   ✅ Deleted batch ${Math.floor(i / 25) + 1} (${deleted}/${items.length} items)`);

        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        errors += batch.length;
        console.error(`   ❌ Error deleting batch:`, error instanceof Error ? error.message : String(error));
      }
    }

    // Verify deletion
    console.log(`\n🔍 Verifying deletion...`);
    const verifyCommand = new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: {
        ":pk": { S: groupPk },
      },
    });

    const verifyResult = await client.send(verifyCommand);
    const remainingItems = verifyResult.Items || [];

    console.log("\n" + "=".repeat(80));
    if (remainingItems.length === 0) {
      console.log("✅ Successfully deleted all items!");
      console.log(`   Deleted: ${deleted} items`);
      if (errors > 0) {
        console.log(`   Errors: ${errors} items`);
      }
    } else {
      console.log(`⚠️  ${remainingItems.length} items still remain:`);
      remainingItems.forEach((item) => {
        console.log(`   - pk: ${item.pk?.S}, sk: ${item.sk?.S}`);
      });
      console.log("\n💡 Try running the cleanup script again or delete these manually.");
    }

  } catch (error) {
    console.error("❌ Error deleting group:", error);
    throw error;
  }
}

const groupTitle = process.argv[2] || "North East Track Club";

deleteSpecificGroup(groupTitle)
  .then(() => {
    console.log("\n✅ Deletion complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Deletion failed:", error);
    process.exit(1);
  });


#!/usr/bin/env tsx
/**
 * Script to verify the database is actually empty
 * Usage: npm run shell tsx src/verify-db-empty.ts
 */

import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { Resource } from "sst";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const tableName = Resource.Db.name;

async function verifyDatabaseEmpty() {
  console.log("🔍 Verifying Database State");
  console.log("=".repeat(80));

  // Check which stage/environment we're using
  const stage = process.env.SST_STAGE || process.env.STAGE || "unknown";
  const region = process.env.AWS_REGION || "us-east-1";

  console.log(`Stage: ${stage}`);
  console.log(`Region: ${region}`);
  console.log(`Table: ${tableName}`);
  console.log("=".repeat(80));

  // Warn if using development table in production
  if (tableName.includes("alexandernorton") && stage === "production") {
    console.log("\n⚠️  WARNING: You appear to be using a DEVELOPMENT table!");
    console.log(
      "   The table name contains 'alexandernorton' which suggests it's a dev table."
    );
    console.log("   Make sure you're running with the correct stage:");
    console.log(
      "   npm run shell -- --stage production tsx src/verify-db-empty.ts"
    );
    console.log("\n");
  }

  // Scan entire table
  console.log("\n📊 Scanning entire table...");
  let allItems: any[] = [];
  let lastKey: any = undefined;
  let scanCount = 0;

  do {
    scanCount++;
    const scanCommand = new ScanCommand({
      TableName: tableName,
      ExclusiveStartKey: lastKey,
    });

    const result = await client.send(scanCommand);
    const items = result.Items || [];

    if (items.length > 0) {
      allItems.push(...items);
      console.log(
        `   Scan ${scanCount}: Found ${items.length} items (${allItems.length} total)`
      );
    }

    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  console.log(`\n📊 Total items in database: ${allItems.length}`);

  if (allItems.length === 0) {
    console.log("\n✅ Database is completely empty!");
    return;
  }

  // Categorize items
  const itemsByType = new Map<string, any[]>();
  allItems.forEach((item) => {
    const pk = item.pk?.S || "UNKNOWN";
    let type = "OTHER";

    if (pk.startsWith("GROUP#")) {
      const sk = item.sk?.S || "";
      if (sk === "GROUP_INFO") {
        type = "GROUP_INFO";
      } else if (sk.startsWith("SCHEDULE#")) {
        type = "GROUP_SCHEDULE";
      } else {
        type = "GROUP_OTHER";
      }
    } else if (pk.startsWith("EVENT-")) {
      type = "EVENT";
    } else if (pk.startsWith("VENUE#")) {
      type = "VENUE";
    } else if (pk.startsWith("USER#")) {
      type = "USER";
    }

    if (!itemsByType.has(type)) {
      itemsByType.set(type, []);
    }
    itemsByType.get(type)!.push(item);
  });

  console.log("\n📋 Items by type:");
  itemsByType.forEach((items, type) => {
    console.log(`   ${type}: ${items.length} items`);
  });

  // Show details of GROUP items
  const groupInfoItems = itemsByType.get("GROUP_INFO") || [];
  if (groupInfoItems.length > 0) {
    console.log("\n⚠️  GROUP_INFO items found:");
    groupInfoItems.forEach((item) => {
      const pk = item.pk?.S || "unknown";
      const title = item.title?.S || "N/A";
      const isPublic = item.isPublic?.S || "N/A";
      console.log(`   - ${pk}`);
      console.log(`     Title: ${title}`);
      console.log(`     isPublic: ${isPublic}`);
      console.log(`     Full item keys: ${Object.keys(item).join(", ")}`);
    });
  }

  // Show details of GROUP_SCHEDULE items
  const groupScheduleItems = itemsByType.get("GROUP_SCHEDULE") || [];
  if (groupScheduleItems.length > 0) {
    console.log(
      `\n⚠️  GROUP_SCHEDULE items found: ${groupScheduleItems.length}`
    );
    const schedulesByGroup = new Map<string, number>();
    groupScheduleItems.forEach((item) => {
      const pk = item.pk?.S || "unknown";
      schedulesByGroup.set(pk, (schedulesByGroup.get(pk) || 0) + 1);
    });
    schedulesByGroup.forEach((count, pk) => {
      console.log(`   - ${pk}: ${count} schedule items`);
    });
  }

  // Show any other GROUP items
  const groupOtherItems = itemsByType.get("GROUP_OTHER") || [];
  if (groupOtherItems.length > 0) {
    console.log(`\n⚠️  GROUP_OTHER items found: ${groupOtherItems.length}`);
    groupOtherItems.forEach((item) => {
      const pk = item.pk?.S || "unknown";
      const sk = item.sk?.S || "unknown";
      console.log(`   - ${pk} / ${sk}`);
    });
  }

  // Summary
  console.log("\n" + "=".repeat(80));
  console.log("📊 Summary:");
  console.log("=".repeat(80));
  console.log(`Total items: ${allItems.length}`);

  if (groupInfoItems.length > 0) {
    console.log(
      `\n⚠️  WARNING: ${groupInfoItems.length} GROUP_INFO item(s) still exist!`
    );
    console.log("   These will show up in the frontend.");
    console.log("\n💡 To delete them, run:");
    groupInfoItems.forEach((item) => {
      const pk = item.pk?.S || "";
      const title = pk.replace("GROUP#", "");
      console.log(`   npm run delete:group "${title}"`);
    });
  } else {
    console.log(
      "\n✅ No GROUP_INFO items found - database should appear empty for groups."
    );
  }
}

verifyDatabaseEmpty()
  .then(() => {
    console.log("\n✅ Verification complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Verification failed:", error);
    process.exit(1);
  });

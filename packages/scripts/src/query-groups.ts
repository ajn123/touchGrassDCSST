#!/usr/bin/env tsx
/**
 * Script to query production DynamoDB for all groups
 * Usage: npm run shell tsx src/query-groups.ts
 */

import {
  DynamoDBClient,
  ScanCommand,
  QueryCommand,
} from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { Resource } from "sst";

async function queryGroups() {
  const client = new DynamoDBClient({
    region: process.env.AWS_REGION || "us-east-1",
  });
  const tableName = Resource.Db.name;

  console.log("🔍 Querying DynamoDB for groups...");
  console.log(`Table: ${tableName}`);
  console.log("=".repeat(80));

  try {
    // Query for all GROUP_INFO items
    console.log("\n📋 Scanning for all GROUP_INFO items...");
    const scanCommand = new ScanCommand({
      TableName: tableName,
      FilterExpression: "begins_with(pk, :groupPrefix) AND sk = :groupInfo",
      ExpressionAttributeValues: {
        ":groupPrefix": { S: "GROUP#" },
        ":groupInfo": { S: "GROUP_INFO" },
      },
    });

    const result = await client.send(scanCommand);
    const groups = result.Items || [];

    console.log(`\n✅ Found ${groups.length} GROUP_INFO items\n`);

    if (groups.length > 0) {
      console.log("📊 All Groups:");
      console.log("=".repeat(80));

      groups.forEach((item, index) => {
        const group = unmarshall(item);
        console.log(`\n${index + 1}. ${group.title || group.pk}`);
        console.log(`   pk: ${group.pk}`);
        console.log(`   sk: ${group.sk}`);
        console.log(`   Category: ${group.category || "N/A"}`);
        console.log(`   isPublic: ${group.isPublic} (type: ${typeof group.isPublic})`);
        console.log(`   Created: ${group.createdAt ? new Date(Number(group.createdAt)).toISOString() : "N/A"}`);
        
        if (group.description) {
          const desc = group.description.length > 100 
            ? group.description.substring(0, 100) + "..." 
            : group.description;
          console.log(`   Description: ${desc}`);
        }

        // Check for schedules
        const groupPk = group.pk;
        if (groupPk) {
          // Query for schedules (async, but we'll do it sequentially for now)
          // For now, just note that schedules exist
          console.log(`   Schedules: (check with query for pk="${groupPk}")`);
        }
      });

      // Summary by category
      console.log("\n" + "=".repeat(80));
      console.log("📊 Summary by Category:");
      console.log("=".repeat(80));
      
      const categoryCount: Record<string, number> = {};
      groups.forEach((item) => {
        const group = unmarshall(item);
        const categories = group.category 
          ? group.category.split(",").map((c: string) => c.trim())
          : ["Uncategorized"];
        categories.forEach((cat: string) => {
          categoryCount[cat] = (categoryCount[cat] || 0) + 1;
        });
      });

      Object.entries(categoryCount)
        .sort(([, a], [, b]) => b - a)
        .forEach(([category, count]) => {
          console.log(`   ${category}: ${count}`);
        });

      // Check isPublic values
      console.log("\n" + "=".repeat(80));
      console.log("🔒 isPublic Value Analysis:");
      console.log("=".repeat(80));
      
      const publicCount = groups.filter((item) => {
        const group = unmarshall(item);
        return group.isPublic === "true" || group.isPublic === true;
      }).length;

      const privateCount = groups.length - publicCount;
      
      console.log(`   Public (isPublic = "true" or true): ${publicCount}`);
      console.log(`   Private/Other: ${privateCount}`);
      console.log(`   Total: ${groups.length}`);

      // Show groups that might not show up due to isPublic
      const nonPublicGroups = groups
        .map((item) => unmarshall(item))
        .filter((group) => group.isPublic !== "true" && group.isPublic !== true);
      
      if (nonPublicGroups.length > 0) {
        console.log(`\n⚠️  Groups that won't show in public list (${nonPublicGroups.length}):`);
        nonPublicGroups.forEach((group) => {
          console.log(`   - ${group.title}: isPublic = "${group.isPublic}"`);
        });
      }

    } else {
      console.log("❌ No GROUP_INFO items found in DynamoDB!");
      console.log("\n💡 Try running: npm run shell tsx src/seed-groups.ts");
    }

    // Also check for any items with GROUP# prefix (including schedules)
    console.log("\n" + "=".repeat(80));
    console.log("📋 Checking for all GROUP# items (including schedules)...");
    console.log("=".repeat(80));
    
    const allGroupsScan = new ScanCommand({
      TableName: tableName,
      FilterExpression: "begins_with(pk, :groupPrefix)",
      ExpressionAttributeValues: {
        ":groupPrefix": { S: "GROUP#" },
      },
    });

    const allGroupsResult = await client.send(allGroupsScan);
    const allGroupItems = allGroupsResult.Items || [];
    
    const groupInfoCount = allGroupItems.filter(
      (item) => item.sk?.S === "GROUP_INFO"
    ).length;
    const scheduleCount = allGroupItems.filter((item) =>
      item.sk?.S?.startsWith("SCHEDULE#")
    ).length;

    console.log(`   Total GROUP# items: ${allGroupItems.length}`);
    console.log(`   - GROUP_INFO items: ${groupInfoCount}`);
    console.log(`   - SCHEDULE items: ${scheduleCount}`);

  } catch (error) {
    console.error("❌ Error querying groups:", error);
    throw error;
  }
}

queryGroups()
  .then(() => {
    console.log("\n✅ Query complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Query failed:", error);
    process.exit(1);
  });


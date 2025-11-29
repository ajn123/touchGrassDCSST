#!/usr/bin/env tsx
/**
 * Script to verify if groups are actually in DynamoDB
 * Usage: npm run shell tsx src/verify-groups.ts
 */

import { DynamoDBClient, QueryCommand, ScanCommand } from "@aws-sdk/client-dynamodb";
import { Resource } from "sst";

async function verifyGroups() {
  const client = new DynamoDBClient({
    region: process.env.AWS_REGION || "us-east-1",
  });
  const tableName = Resource.Db.name;

  console.log("🔍 Verifying groups in DynamoDB...\n");
  console.log(`Table: ${tableName}`);
  console.log("=".repeat(80));

  try {
    // Scan for all GROUP_INFO items
    console.log("\n📋 Scanning for GROUP_INFO items...");
    const scanCommand = new ScanCommand({
      TableName: tableName,
      FilterExpression: "sk = :groupInfo",
      ExpressionAttributeValues: {
        ":groupInfo": { S: "GROUP_INFO" },
      },
    });

    const result = await client.send(scanCommand);
    const groupInfoItems = result.Items || [];

    console.log(`\n✅ Found ${groupInfoItems.length} GROUP_INFO items in DynamoDB\n`);

    if (groupInfoItems.length > 0) {
      console.log("📊 Sample GROUP_INFO items:");
      groupInfoItems.slice(0, 5).forEach((item, index) => {
        console.log(`\n${index + 1}. ${item.pk?.S || "N/A"}`);
        console.log(`   Title: ${item.title?.S || "N/A"}`);
        console.log(`   Category: ${item.category?.S || "N/A"}`);
        console.log(`   Created: ${item.createdAt ? new Date(Number(item.createdAt.N)).toISOString() : "N/A"}`);
      });

      // Check for schedules for the first group
      if (groupInfoItems.length > 0) {
        const firstGroupPk = groupInfoItems[0].pk?.S;
        if (firstGroupPk) {
          console.log(`\n📅 Checking schedules for: ${firstGroupPk}`);
          const queryCommand = new QueryCommand({
            TableName: tableName,
            KeyConditionExpression: "pk = :pk AND begins_with(sk, :schedulePrefix)",
            ExpressionAttributeValues: {
              ":pk": { S: firstGroupPk },
              ":schedulePrefix": { S: "SCHEDULE#" },
            },
          });

          const scheduleResult = await client.send(queryCommand);
          const schedules = scheduleResult.Items || [];
          console.log(`   Found ${schedules.length} schedule items`);
          
          if (schedules.length > 0) {
            schedules.slice(0, 3).forEach((schedule, index) => {
              console.log(`   ${index + 1}. ${schedule.sk?.S || "N/A"}`);
              console.log(`      Day: ${schedule.scheduleDay?.S || "N/A"}`);
              console.log(`      Time: ${schedule.scheduleTime?.S || "N/A"}`);
              console.log(`      Location: ${schedule.scheduleLocation?.S || "N/A"}`);
            });
          }
        }
      }
    } else {
      console.log("❌ No GROUP_INFO items found in DynamoDB!");
      console.log("\n💡 This could mean:");
      console.log("   1. Groups haven't been seeded yet");
      console.log("   2. Step Functions failed to save groups");
      console.log("   3. Groups were saved with a different sk value");
      console.log("\n🔍 Checking for any items with pk starting with 'GROUP#'...");
      
      // Check for any GROUP# items
      const anyGroupScan = new ScanCommand({
        TableName: tableName,
        FilterExpression: "begins_with(pk, :groupPrefix)",
        ExpressionAttributeValues: {
          ":groupPrefix": { S: "GROUP#" },
        },
      });

      const anyGroupResult = await client.send(anyGroupScan);
      const anyGroupItems = anyGroupResult.Items || [];
      
      if (anyGroupItems.length > 0) {
        console.log(`\n⚠️  Found ${anyGroupItems.length} items with pk starting with 'GROUP#' but sk != 'GROUP_INFO':`);
        anyGroupItems.slice(0, 5).forEach((item, index) => {
          console.log(`   ${index + 1}. pk: ${item.pk?.S}, sk: ${item.sk?.S}`);
        });
      } else {
        console.log("\n❌ No items found with pk starting with 'GROUP#' at all!");
      }
    }

    // Check Step Functions executions
    console.log("\n" + "=".repeat(80));
    console.log("📋 Next Steps:");
    console.log("=".repeat(80));
    console.log("1. Check Step Functions executions:");
    console.log("   - Go to AWS Console → Step Functions");
    console.log("   - Find 'normaizeEventStepFunction'");
    console.log("   - Look for executions starting with 'seed-groups-'");
    console.log("   - Check if they succeeded or failed");
    console.log("\n2. Check Lambda logs:");
    console.log("   - CloudWatch → Log Groups");
    console.log("   - Find '/aws/lambda/addEventToDBFunction'");
    console.log("   - Look for 'Successfully saved GROUP_INFO' messages");
    console.log("\n3. If groups aren't there, try re-seeding:");
    console.log("   npm run shell tsx src/seed-groups.ts");

  } catch (error) {
    console.error("❌ Error verifying groups:", error);
    throw error;
  }
}

verifyGroups()
  .then(() => {
    console.log("\n✅ Verification complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Verification failed:", error);
    process.exit(1);
  });


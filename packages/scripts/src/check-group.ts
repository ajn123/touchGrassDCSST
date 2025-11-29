#!/usr/bin/env tsx
/**
 * Script to check if a specific group exists in DynamoDB
 * Usage: npm run shell tsx src/check-group.ts "The Ballston Runaways"
 */

import { DynamoDBClient, GetItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { Resource } from "sst";

async function checkGroup(groupTitle: string) {
  const client = new DynamoDBClient({
    region: process.env.AWS_REGION || "us-east-1",
  });
  const tableName = Resource.Db.name;

  const groupPk = `GROUP#${groupTitle}`;
  const groupSk = "GROUP_INFO";

  console.log(`🔍 Checking for group: "${groupTitle}"`);
  console.log(`   pk: ${groupPk}`);
  console.log(`   sk: ${groupSk}`);
  console.log("=".repeat(80));

  try {
    // Check for GROUP_INFO item
    console.log("\n📋 Checking for GROUP_INFO item...");
    const getCommand = new GetItemCommand({
      TableName: tableName,
      Key: {
        pk: { S: groupPk },
        sk: { S: groupSk },
      },
    });

    const result = await client.send(getCommand);

    if (result.Item) {
      const group = unmarshall(result.Item);
      console.log("✅ GROUP_INFO item found!");
      console.log("\n📊 Group Details:");
      console.log(JSON.stringify(group, null, 2));
      
      // Check isPublic
      console.log(`\n🔒 isPublic value: "${group.isPublic}" (type: ${typeof group.isPublic})`);
      if (group.isPublic !== "true") {
        console.log("⚠️  WARNING: isPublic is not 'true', so it won't show in public groups list!");
      }
    } else {
      console.log("❌ GROUP_INFO item NOT found!");
      
      // Check if there are any items with this pk at all
      console.log("\n🔍 Checking for any items with this pk...");
      const queryCommand = new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: "pk = :pk",
        ExpressionAttributeValues: {
          ":pk": { S: groupPk },
        },
      });

      const queryResult = await client.send(queryCommand);
      if (queryResult.Items && queryResult.Items.length > 0) {
        console.log(`⚠️  Found ${queryResult.Items.length} items with pk="${groupPk}" but none with sk="GROUP_INFO":`);
        queryResult.Items.forEach((item, index) => {
          const unmarshalled = unmarshall(item);
          console.log(`   ${index + 1}. sk: "${unmarshalled.sk}"`);
        });
      } else {
        console.log("❌ No items found with this pk at all!");
      }
    }

    // Check for schedules
    console.log("\n📅 Checking for schedule items...");
    const scheduleQuery = new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :schedulePrefix)",
      ExpressionAttributeValues: {
        ":pk": { S: groupPk },
        ":schedulePrefix": { S: "SCHEDULE#" },
      },
    });

    const scheduleResult = await client.send(scheduleQuery);
    if (scheduleResult.Items && scheduleResult.Items.length > 0) {
      console.log(`✅ Found ${scheduleResult.Items.length} schedule items`);
      scheduleResult.Items.slice(0, 3).forEach((item, index) => {
        const schedule = unmarshall(item);
        console.log(`   ${index + 1}. ${schedule.sk}`);
        console.log(`      Day: ${schedule.scheduleDay}, Time: ${schedule.scheduleTime}`);
      });
    } else {
      console.log("⚠️  No schedule items found");
    }

  } catch (error) {
    console.error("❌ Error checking group:", error);
    throw error;
  }
}

const groupTitle = process.argv[2] || "The Ballston Runaways";

checkGroup(groupTitle)
  .then(() => {
    console.log("\n✅ Check complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Check failed:", error);
    process.exit(1);
  });


#!/usr/bin/env tsx
/**
 * Script to check if the DynamoDB table exists
 * Usage: tsx src/check-db-table.ts
 */

import {
  DescribeTableCommand,
  DynamoDBClient,
  ListTablesCommand,
} from "@aws-sdk/client-dynamodb";
import { Resource } from "sst";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});

async function checkTableExists() {
  try {
    // First, list all tables to see what exists
    console.log("🔍 Listing all tables in the region...");
    const listCommand = new ListTablesCommand({});
    const listResponse = await client.send(listCommand);

    let productionTables: string[] = [];

    if (listResponse.TableNames && listResponse.TableNames.length > 0) {
      console.log(`\n📋 Found ${listResponse.TableNames.length} table(s):`);
      productionTables = listResponse.TableNames.filter(
        (name) => name.includes("touchgrassdcsst") && name.includes("DbTable")
      );

      if (productionTables.length > 0) {
        console.log(
          `\n🎯 Production DbTable(s) found (${productionTables.length}):`
        );
        productionTables.forEach((name) => {
          console.log(`   - ${name}`);
        });
      }

      console.log(`\n📋 All tables:`);
      listResponse.TableNames.forEach((name) => {
        console.log(`   - ${name}`);
      });
    } else {
      console.log("   No tables found in this region.");
      return;
    }

    // Try to get table name from Resource (may fail if not in sst shell)
    let tableName: string | undefined;
    try {
      tableName = Resource.Db?.name;
    } catch (e) {
      console.log("\n⚠️  Could not access Resource.Db.name (not in sst shell)");
      console.log("   Checking production tables instead...\n");
    }

    if (!tableName) {
      // If we can't get from Resource, check the production tables we found
      if (productionTables.length > 0) {
        console.log("=".repeat(80));
        console.log(`🔍 Checking production tables...`);
        for (const table of productionTables) {
          await checkSpecificTable(table);
        }
      }
      return;
    }

    console.log(`\n🔍 Checking if DynamoDB table exists: ${tableName}`);
    console.log("=".repeat(80));

    try {
      const command = new DescribeTableCommand({
        TableName: tableName,
      });

      const response = await client.send(command);

      if (response.Table) {
        console.log("✅ Table exists!");
        console.log(`\n📊 Table Details:`);
        console.log(`   Table Name: ${response.Table.TableName}`);
        console.log(`   Table Status: ${response.Table.TableStatus}`);
        console.log(`   Table ARN: ${response.Table.TableArn}`);
        console.log(
          `   Creation Date: ${response.Table.CreationDateTime?.toISOString()}`
        );

        if (response.Table.KeySchema) {
          console.log(`\n🔑 Key Schema:`);
          response.Table.KeySchema.forEach((key) => {
            console.log(`   - ${key.AttributeName} (${key.KeyType})`);
          });
        }

        if (
          response.Table.GlobalSecondaryIndexes &&
          response.Table.GlobalSecondaryIndexes.length > 0
        ) {
          console.log(
            `\n📇 Global Secondary Indexes (${response.Table.GlobalSecondaryIndexes.length}):`
          );
          response.Table.GlobalSecondaryIndexes.forEach((gsi) => {
            console.log(`   - ${gsi.IndexName} (Status: ${gsi.IndexStatus})`);
          });
        }

        if (response.Table.ItemCount !== undefined) {
          console.log(
            `\n📦 Item Count: ${response.Table.ItemCount.toLocaleString()}`
          );
        }

        if (response.Table.TableSizeBytes !== undefined) {
          const sizeMB = (response.Table.TableSizeBytes / 1024 / 1024).toFixed(
            2
          );
          console.log(`💾 Table Size: ${sizeMB} MB`);
        }

        console.log("\n" + "=".repeat(80));
        console.log("✅ Table is accessible and ready to use!");
      }
    } catch (error: any) {
      if (error.name === "ResourceNotFoundException") {
        console.log("❌ Table does NOT exist!");
        console.log(`   Table Name: ${tableName}`);
        console.log("\n💡 This is the problem! The table needs to be created.");
        console.log("   Run: sst deploy");
      } else {
        throw error;
      }
    }
  } catch (error: any) {
    console.error("❌ Error checking table:", error.message);
    throw error;
  }
}

async function checkSpecificTable(tableName: string) {
  try {
    const command = new DescribeTableCommand({
      TableName: tableName,
    });

    const response = await client.send(command);

    if (response.Table) {
      console.log(`\n✅ Table exists: ${tableName}`);
      console.log(`   Status: ${response.Table.TableStatus}`);
      console.log(`   ARN: ${response.Table.TableArn}`);
      if (response.Table.ItemCount !== undefined) {
        console.log(
          `   Item Count: ${response.Table.ItemCount.toLocaleString()}`
        );
      }
      return true;
    }
  } catch (error: any) {
    if (error.name === "ResourceNotFoundException") {
      console.log(`\n❌ Table does NOT exist: ${tableName}`);
      return false;
    } else {
      console.error(`   Error checking ${tableName}:`, error.message);
      return false;
    }
  }
  return false;
}

async function main() {
  console.log("🔍 Checking DynamoDB table existence...\n");
  await checkTableExists();
}

main().catch(console.error);

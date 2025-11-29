#!/usr/bin/env tsx
/**
 * Script to print the DynamoDB table name
 * Usage: npm run shell tsx src/print-table-name.ts
 */

import { Resource } from "sst";

async function printTableName() {
  try {
    const tableName = Resource.Db.name;
    console.log("📊 DynamoDB Table Name:");
    console.log("=".repeat(80));
    console.log(tableName);
    console.log("=".repeat(80));
    console.log(`\nTable name length: ${tableName.length} characters`);
    console.log(`AWS Region: ${process.env.AWS_REGION || "us-east-1"}`);
  } catch (error) {
    console.error("❌ Error getting table name:", error);
    throw error;
  }
}

printTableName()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  });


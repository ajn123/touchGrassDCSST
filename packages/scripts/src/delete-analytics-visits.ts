#!/usr/bin/env tsx

/**
 * One-off script to delete all ANALYTICS#USER_VISIT records from DynamoDB
 *
 * Usage:
 *   npx tsx packages/scripts/src/delete-analytics-visits.ts
 *
 * This script will:
 * 1. Query all records with pk = "ANALYTICS#USER_VISIT"
 * 2. Delete them in batches
 * 3. Show progress and final count
 */

import {
  BatchWriteItemCommand,
  DynamoDBClient,
  QueryCommand,
} from "@aws-sdk/client-dynamodb";
import { Resource } from "sst";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const TABLE_NAME = Resource.Db.name;
const ANALYTICS_PK = "ANALYTICS#USER_VISIT";

interface AnalyticsRecord {
  pk: string;
  sk: string;
}

async function getAllAnalyticsVisits(): Promise<AnalyticsRecord[]> {
  console.log(
    `🔍 Querying all ANALYTICS#USER_VISIT records from table: ${TABLE_NAME}`
  );

  const records: AnalyticsRecord[] = [];
  let lastEvaluatedKey: any = undefined;

  do {
    const command = new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: {
        ":pk": { S: ANALYTICS_PK },
      },
      ProjectionExpression: "pk, sk",
      ExclusiveStartKey: lastEvaluatedKey,
    });

    const result = await client.send(command);

    if (result.Items) {
      for (const item of result.Items) {
        records.push({
          pk: item.pk?.S || "",
          sk: item.sk?.S || "",
        });
      }
    }

    lastEvaluatedKey = result.LastEvaluatedKey;
    console.log(`📊 Found ${records.length} records so far...`);
  } while (lastEvaluatedKey);

  return records;
}

async function deleteRecordsInBatches(
  records: AnalyticsRecord[]
): Promise<void> {
  const BATCH_SIZE = 25; // DynamoDB batch write limit
  let deletedCount = 0;

  console.log(
    `🗑️  Starting deletion of ${records.length} records in batches of ${BATCH_SIZE}...`
  );

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    const deleteRequests = batch.map((record) => ({
      DeleteRequest: {
        Key: {
          pk: { S: record.pk },
          sk: { S: record.sk },
        },
      },
    }));

    const command = new BatchWriteItemCommand({
      RequestItems: {
        [TABLE_NAME]: deleteRequests,
      },
    });

    try {
      await client.send(command);
      deletedCount += batch.length;
      console.log(
        `✅ Deleted batch ${Math.floor(i / BATCH_SIZE) + 1}: ${deletedCount}/${
          records.length
        } records`
      );
    } catch (error) {
      console.error(
        `❌ Error deleting batch ${Math.floor(i / BATCH_SIZE) + 1}:`,
        error
      );
      throw error;
    }
  }

  console.log(
    `🎉 Successfully deleted ${deletedCount} ANALYTICS#USER_VISIT records`
  );
}

async function main() {
  try {
    console.log("🚀 Starting ANALYTICS#USER_VISIT cleanup script...");
    console.log(`📋 Table: ${TABLE_NAME}`);
    console.log(`🎯 Target: ${ANALYTICS_PK}`);
    console.log("");

    // Step 1: Get all records
    const records = await getAllAnalyticsVisits();

    if (records.length === 0) {
      console.log(
        "✨ No ANALYTICS#USER_VISIT records found. Nothing to delete."
      );
      return;
    }

    console.log(
      `📊 Found ${records.length} ANALYTICS#USER_VISIT records to delete`
    );
    console.log("");

    // Step 2: Confirm deletion
    const readline = await import("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question(
        `⚠️  Are you sure you want to delete ${records.length} records? (yes/no): `,
        resolve
      );
    });

    rl.close();

    if (answer.toLowerCase() !== "yes") {
      console.log("❌ Deletion cancelled by user");
      return;
    }

    console.log("");

    // Step 3: Delete records
    await deleteRecordsInBatches(records);

    console.log("");
    console.log("🎉 Cleanup completed successfully!");
  } catch (error) {
    console.error("💥 Script failed:", error);
    process.exit(1);
  }
}

// Run the script
main();

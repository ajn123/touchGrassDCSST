#!/usr/bin/env tsx

/**
 * One-off script to transform analytics data in DynamoDB
 *
 * This script:
 * 1. Scans records with pk: "USER", pk: "SEARCH", and pk: "EVENT_PAGE_VISIT"
 * 2. Transforms USER records to ANALYTICS#USER_VISIT
 * 3. Transforms SEARCH records to ANALYTICS#SEARCH
 * 4. Transforms EVENT_PAGE_VISIT records to ANALYTICS#EVENT_PAGE_VISIT
 * 5. Updates the records in DynamoDB
 *
 * Usage: npx tsx packages/scripts/src/transform-analytics-data.ts
 */

import {
  DeleteItemCommand,
  DynamoDBClient,
  PutItemCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import { Resource } from "sst";

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});

// Analytics action types to transform
const ANALYTICS_ACTIONS = [
  "USER",
  "SEARCH",
  "EVENT_PAGE_VISIT",
  "EMAIL_SIGNUP_SUBMISSION",
  "EMAIL_SIGNUP",
] as const;

// Mapping for action transformations
const ACTION_TRANSFORMATIONS: Record<string, string> = {
  USER: "USER_VISIT",
  SEARCH: "SEARCH",
  EVENT_PAGE_VISIT: "EVENT_PAGE_VISIT",
  EMAIL_SIGNUP_SUBMISSION: "EMAIL_SIGNUP_SUBMISSION",
  EMAIL_SIGNUP: "EMAIL_SIGNUP",
};

type AnalyticsAction = (typeof ANALYTICS_ACTIONS)[number];

interface AnalyticsRecord {
  pk: string;
  sk: string;
  properties: any;
  action: string;
  userId?: string;
  [key: string]: any;
}

interface TransformedRecord {
  pk: string; // ANALYTICS#(TYPE)
  sk: string; // Keep original sort key or create new one
  properties: any;
  action: string;
  userId?: string;
  originalPk?: string; // Keep track of original for cleanup
  transformedAt: string;
  [key: string]: any;
}

class AnalyticsTransformer {
  private processedCount = 0;
  private errorCount = 0;
  private transformedRecords: TransformedRecord[] = [];

  async scanAnalyticsRecords(): Promise<AnalyticsRecord[]> {
    console.log("🔍 Scanning for analytics records...");

    const allRecords: AnalyticsRecord[] = [];
    let lastEvaluatedKey: any = undefined;

    do {
      const scanParams = {
        TableName: Resource.Db.name,
        FilterExpression: "pk IN (:userPk, :searchPk, :eventPageVisitPk)",
        ExpressionAttributeValues: {
          ":userPk": { S: "USER" },
          ":searchPk": { S: "SEARCH" },
          ":eventPageVisitPk": { S: "EVENT_PAGE_VISIT" },
        },
        ExclusiveStartKey: lastEvaluatedKey,
      };

      const result = await client.send(new ScanCommand(scanParams));

      if (result.Items) {
        const records = result.Items.map((item) =>
          this.convertFromDynamoDB(item)
        );
        allRecords.push(...records);
        console.log(
          `📊 Found ${records.length} records in this batch (total: ${allRecords.length})`
        );
      }

      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    console.log(
      `✅ Scan complete. Found ${allRecords.length} analytics records total.`
    );
    return allRecords;
  }

  transformRecord(record: AnalyticsRecord): TransformedRecord | null {
    try {
      // Check if pk is one of the action types we want to transform
      const actionType = record.pk as AnalyticsAction;

      // Validate that this is an action we want to transform
      if (!ANALYTICS_ACTIONS.includes(actionType)) {
        console.log(`ℹ️  Skipping action type: ${actionType}`);
        return null;
      }

      // Get the transformed action type
      const transformedActionType =
        ACTION_TRANSFORMATIONS[actionType] || actionType;

      // Create new primary key: ANALYTICS#(TRANSFORMED_TYPE)
      const newPk = `ANALYTICS#${transformedActionType}`;

      // Keep the original sort key or create a new one based on timestamp
      let newSk = record.sk;
      if (!newSk || newSk === record.pk) {
        // If sort key is same as pk or empty, create a time-based one
        const timestamp = Date.now();
        newSk = `TIME#${timestamp}`;
      }

      const transformedRecord: TransformedRecord = {
        pk: newPk,
        sk: newSk,
        properties: record.properties || {},
        action: transformedActionType,
        userId: record.userId,
        originalPk: record.pk, // Keep track for cleanup
        transformedAt: new Date().toISOString(),
        // Preserve any other fields
        ...Object.fromEntries(
          Object.entries(record).filter(
            ([key]) =>
              !["pk", "sk", "properties", "action", "userId"].includes(key)
          )
        ),
      };

      return transformedRecord;
    } catch (error) {
      console.error(`❌ Error transforming record:`, error);
      this.errorCount++;
      return null;
    }
  }

  async saveTransformedRecord(record: TransformedRecord): Promise<void> {
    try {
      const dynamoItem = this.convertToDynamoDB(record);

      await client.send(
        new PutItemCommand({
          TableName: Resource.Db.name,
          Item: dynamoItem,
        })
      );

      this.processedCount++;
      if (this.processedCount % 100 === 0) {
        console.log(`💾 Processed ${this.processedCount} records...`);
      }
    } catch (error) {
      console.error(`❌ Error saving transformed record:`, error);
      this.errorCount++;
      throw error;
    }
  }

  async deleteOriginalRecord(originalPk: string, sk: string): Promise<void> {
    try {
      await client.send(
        new DeleteItemCommand({
          TableName: Resource.Db.name,
          Key: {
            pk: { S: originalPk },
            sk: { S: sk },
          },
        })
      );
    } catch (error) {
      console.error(`❌ Error deleting original record:`, error);
      // Don't throw here - we don't want to fail the whole process
    }
  }

  convertFromDynamoDB(item: any): AnalyticsRecord {
    const record: any = {};

    for (const [key, value] of Object.entries(item)) {
      if (value.S) {
        record[key] = value.S;
      } else if (value.N) {
        record[key] = parseFloat(value.N);
      } else if (value.BOOL !== undefined) {
        record[key] = value.BOOL;
      } else if (value.M) {
        record[key] = this.convertFromDynamoDB(value.M);
      } else if (value.L) {
        record[key] = value.L.map(
          (item: any) => this.convertFromDynamoDB({ item }).item
        );
      }
    }

    return record as AnalyticsRecord;
  }

  convertToDynamoDB(record: any): any {
    const item: any = {};

    for (const [key, value] of Object.entries(record)) {
      if (typeof value === "string") {
        item[key] = { S: value };
      } else if (typeof value === "number") {
        item[key] = { N: value.toString() };
      } else if (typeof value === "boolean") {
        item[key] = { BOOL: value };
      } else if (Array.isArray(value)) {
        item[key] = {
          L: value.map((v: any) => this.convertToDynamoDB({ item: v }).item),
        };
      } else if (value && typeof value === "object") {
        item[key] = { M: this.convertToDynamoDB(value) };
      }
    }

    return item;
  }

  async transformAllRecords(): Promise<void> {
    console.log("🚀 Starting analytics data transformation...");

    // Step 1: Scan all analytics records
    const records = await this.scanAnalyticsRecords();

    if (records.length === 0) {
      console.log("ℹ️  No analytics records found to transform.");
      return;
    }

    console.log(`📋 Found ${records.length} records to process.`);

    // Step 2: Transform records
    console.log("🔄 Transforming records...");
    const transformedRecords: TransformedRecord[] = [];

    for (const record of records) {
      const transformed = this.transformRecord(record);
      if (transformed) {
        transformedRecords.push(transformed);
      }
    }

    console.log(`✅ Transformed ${transformedRecords.length} records.`);

    if (transformedRecords.length === 0) {
      console.log("ℹ️  No records needed transformation.");
      return;
    }

    // Step 3: Save transformed records
    console.log("💾 Saving transformed records...");
    for (const record of transformedRecords) {
      await this.saveTransformedRecord(record);
    }

    // Step 4: Clean up original records (optional - comment out if you want to keep originals)
    console.log("🧹 Cleaning up original records...");
    for (const record of records) {
      const transformed = this.transformRecord(record);
      if (transformed && transformed.originalPk) {
        await this.deleteOriginalRecord(transformed.originalPk, record.sk);
      }
    }

    // Summary
    console.log("\n📊 Transformation Summary:");
    console.log(`✅ Successfully processed: ${this.processedCount} records`);
    console.log(`❌ Errors encountered: ${this.errorCount} records`);
    console.log(`🔄 Total records scanned: ${records.length}`);
    console.log(`✨ Transformation complete!`);
  }
}

// Main execution
async function main() {
  try {
    const transformer = new AnalyticsTransformer();
    await transformer.transformAllRecords();
  } catch (error) {
    console.error("💥 Fatal error during transformation:", error);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { AnalyticsTransformer };

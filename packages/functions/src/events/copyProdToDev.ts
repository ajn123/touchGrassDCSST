import {
  BatchWriteItemCommand,
  DynamoDBClient,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import { Handler } from "aws-lambda";
import { Resource } from "sst";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});

/**
 * Copy all items from production DynamoDB table to development table
 */
export const handler: Handler = async (event, context) => {
  const startTime = Date.now();
  console.log("🔄 Starting production to development database copy...");

  try {
    // Get table names - production table from environment, dev table from Resource
    const productionTableName = process.env.PRODUCTION_TABLE_NAME;
    const devTableName = Resource.Db.name;

    if (!productionTableName) {
      throw new Error(
        "PRODUCTION_TABLE_NAME environment variable is not set. " +
          "This function should only run in production stage."
      );
    }

    if (!devTableName) {
      throw new Error(
        "Development table name (Resource.Db.name) is not available"
      );
    }

    console.log(`📊 Source (Production): ${productionTableName}`);
    console.log(`📊 Destination (Dev): ${devTableName}`);

    // Prevent accidental copy if running in production
    const stage = process.env.SST_STAGE || process.env.STAGE;
    if (stage === "production") {
      throw new Error(
        "This function should not run in production stage. " +
          "It should run in a dev/staging environment to copy FROM production TO dev."
      );
    }

    // Calculate timestamp for 24 hours ago (in milliseconds)
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    console.log(
      `⏰ Only copying items created/updated since: ${new Date(
        twentyFourHoursAgo
      ).toISOString()}`
    );

    let totalScanned = 0;
    let totalCopied = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    let lastEvaluatedKey: any = undefined;

    // Scan production table and copy to dev (only items from last 24 hours)
    do {
      console.log(
        `\n📦 Scanning production table (scanned so far: ${totalScanned})...`
      );

      const scanCommand = new ScanCommand({
        TableName: productionTableName,
        ExclusiveStartKey: lastEvaluatedKey,
        // Filter for items created or updated in the last 24 hours
        FilterExpression:
          "(#updatedAt >= :twentyFourHoursAgo OR #createdAt >= :twentyFourHoursAgo)",
        ExpressionAttributeNames: {
          "#updatedAt": "updatedAt",
          "#createdAt": "createdAt",
        },
        ExpressionAttributeValues: {
          ":twentyFourHoursAgo": { N: twentyFourHoursAgo.toString() },
        },
        // Limit to 25 items per batch for BatchWriteItem
        Limit: 25,
      });

      const scanResult = await client.send(scanCommand);
      const items = scanResult.Items || [];

      if (items.length === 0) {
        console.log("   No items in this batch");
        lastEvaluatedKey = scanResult.LastEvaluatedKey;
        continue;
      }

      totalScanned += items.length;
      console.log(`   Found ${items.length} items in this batch`);

      // Filter items to ensure they meet the 24-hour criteria
      // (FilterExpression is applied after retrieval, so double-check)
      const recentItems = items.filter((item) => {
        const updatedAt = item.updatedAt?.N ? parseInt(item.updatedAt.N) : null;
        const createdAt = item.createdAt?.N ? parseInt(item.createdAt.N) : null;

        // Include if updatedAt or createdAt is within last 24 hours
        return (
          (updatedAt && updatedAt >= twentyFourHoursAgo) ||
          (createdAt && createdAt >= twentyFourHoursAgo)
        );
      });

      if (recentItems.length === 0) {
        console.log(
          `   ⏭️  Skipped ${items.length} items (older than 24 hours)`
        );
        totalSkipped += items.length;
        lastEvaluatedKey = scanResult.LastEvaluatedKey;
        continue;
      }

      const skipped = items.length - recentItems.length;
      if (skipped > 0) {
        totalSkipped += skipped;
        console.log(
          `   ⏭️  Skipped ${skipped} items (older than 24 hours), copying ${recentItems.length}`
        );
      }

      // Prepare batch write request
      const writeRequests = recentItems.map((item) => ({
        PutRequest: {
          Item: item,
        },
      }));

      // Write to dev table in batches
      const batchWriteCommand = new BatchWriteItemCommand({
        RequestItems: {
          [devTableName]: writeRequests,
        },
      });

      try {
        const writeResult = await client.send(batchWriteCommand);

        // Handle unprocessed items (retry if needed)
        if (
          writeResult.UnprocessedItems &&
          Object.keys(writeResult.UnprocessedItems).length > 0
        ) {
          console.log(
            `   ⚠️  ${
              Object.keys(writeResult.UnprocessedItems[devTableName] || {})
                .length
            } items not processed, retrying...`
          );

          // Retry unprocessed items
          const retryCommand = new BatchWriteItemCommand({
            RequestItems: writeResult.UnprocessedItems,
          });
          await client.send(retryCommand);
        }

        totalCopied += recentItems.length;
        console.log(`   ✅ Copied ${recentItems.length} items to dev table`);
      } catch (writeError: any) {
        totalErrors += recentItems.length;
        console.error(`   ❌ Error copying batch:`, writeError.message);
        // Continue with next batch
      }

      // Add small delay to avoid throttling
      await new Promise((resolve) => setTimeout(resolve, 100));

      lastEvaluatedKey = scanResult.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    const totalTime = Date.now() - startTime;
    console.log("\n" + "=".repeat(80));
    console.log("✅ Copy completed!");
    console.log("=".repeat(80));
    console.log(`📊 Summary:`);
    console.log(`   - Total items scanned from production: ${totalScanned}`);
    console.log(`   - Items skipped (older than 24 hours): ${totalSkipped}`);
    console.log(`   - Total items copied to dev: ${totalCopied}`);
    console.log(`   - Errors: ${totalErrors}`);
    console.log(
      `   - Execution time: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`
    );
    console.log("=".repeat(80));

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        totalScanned,
        totalSkipped,
        totalCopied,
        totalErrors,
        executionTime: totalTime,
        timeWindow: "24 hours",
        sourceTable: productionTableName,
        destinationTable: devTableName,
      }),
    };
  } catch (error: any) {
    const totalTime = Date.now() - startTime;
    console.error("❌ Error copying production to dev:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message || "Unknown error",
        executionTime: totalTime,
      }),
    };
  }
};

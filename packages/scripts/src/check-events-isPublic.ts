/**
 * Script to check the isPublic status of all events in the database
 */

import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { Resource } from "sst";

const db = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});

async function checkEventsIsPublic() {
  console.log("🔍 Checking isPublic status for all events...");
  console.log(`📊 Table: ${Resource.Db.name}\n`);

  let lastEvaluatedKey: any = undefined;
  let totalEvents = 0;
  const stats = {
    isPublicTrue: 0,
    isPublicFalse: 0,
    isPublicMissing: 0,
    isPublicInvalid: 0,
    bySource: {} as Record<string, { total: number; public: number; notPublic: number; missing: number }>,
  };

  do {
    const command = new ScanCommand({
      TableName: Resource.Db.name,
      FilterExpression:
        "(begins_with(pk, :eventPrefixNew) OR begins_with(pk, :eventPrefixOld))",
      ExpressionAttributeValues: {
        ":eventPrefixNew": { S: "EVENT-" },
        ":eventPrefixOld": { S: "EVENT#" },
      },
      ExclusiveStartKey: lastEvaluatedKey,
    });

    const result = await db.send(command);
    const items = result.Items || [];

    for (const item of items) {
      const event = unmarshall(item);
      totalEvents++;

      const source = event.source || "unknown";
      const isPublic = event.isPublic;

      // Initialize source stats if needed
      if (!stats.bySource[source]) {
        stats.bySource[source] = { total: 0, public: 0, notPublic: 0, missing: 0 };
      }
      stats.bySource[source].total++;

      // Categorize isPublic status
      if (isPublic === "true" || isPublic === true) {
        stats.isPublicTrue++;
        stats.bySource[source].public++;
      } else if (isPublic === "false" || isPublic === false) {
        stats.isPublicFalse++;
        stats.bySource[source].notPublic++;
        // Log first few examples
        if (stats.isPublicFalse <= 5) {
          console.log(`❌ Event with isPublic=false: "${event.title || event.pk}" (source: ${source})`);
        }
      } else if (isPublic === undefined || isPublic === null) {
        stats.isPublicMissing++;
        stats.bySource[source].missing++;
        // Log first few examples
        if (stats.isPublicMissing <= 5) {
          console.log(`⚠️  Event missing isPublic: "${event.title || event.pk}" (source: ${source})`);
        }
      } else {
        stats.isPublicInvalid++;
        // Log invalid values
        console.log(`⚠️  Event with invalid isPublic value: "${event.title || event.pk}" (source: ${source}, value: ${JSON.stringify(isPublic)}, type: ${typeof isPublic})`);
      }
    }

    lastEvaluatedKey = result.LastEvaluatedKey;
    
    if (totalEvents % 100 === 0) {
      console.log(`📊 Progress: Scanned ${totalEvents} events...`);
    }
  } while (lastEvaluatedKey);

  console.log("\n" + "=".repeat(80));
  console.log("📊 SUMMARY");
  console.log("=".repeat(80));
  console.log(`Total events scanned: ${totalEvents}\n`);
  
  console.log("isPublic Status Breakdown:");
  console.log(`  ✅ isPublic = "true" or true: ${stats.isPublicTrue}`);
  console.log(`  ❌ isPublic = "false" or false: ${stats.isPublicFalse}`);
  console.log(`  ⚠️  isPublic missing/null: ${stats.isPublicMissing}`);
  console.log(`  ⚠️  isPublic invalid value: ${stats.isPublicInvalid}\n`);

  console.log("Breakdown by Source:");
  for (const [source, sourceStats] of Object.entries(stats.bySource)) {
    const publicPct = sourceStats.total > 0 
      ? ((sourceStats.public / sourceStats.total) * 100).toFixed(1)
      : "0";
    console.log(`  ${source}:`);
    console.log(`    Total: ${sourceStats.total}`);
    console.log(`    Public: ${sourceStats.public} (${publicPct}%)`);
    console.log(`    Not Public: ${sourceStats.notPublic}`);
    console.log(`    Missing: ${sourceStats.missing}`);
  }

  console.log("\n" + "=".repeat(80));
  console.log("💡 Recommendations:");
  if (stats.isPublicFalse > 0 || stats.isPublicMissing > 0) {
    console.log(`  - ${stats.isPublicFalse + stats.isPublicMissing} events need to be updated`);
    console.log(`  - Run: npm run update:isPublic`);
  } else {
    console.log("  - All events have correct isPublic status! ✅");
  }
  console.log("=".repeat(80));
}

// Run the check
checkEventsIsPublic()
  .then(() => {
    console.log("\n✅ Check completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Check failed:", error);
    process.exit(1);
  });


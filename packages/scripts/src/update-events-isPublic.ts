/**
 * Migration script to update existing events to use isPublic: "true"
 * Scans ALL events in the database and updates those that need it
 */

import { DynamoDBClient, ScanCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { Resource } from "sst";

const db = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});

// Sources that should always be public (mined/crawled events)
const PUBLIC_SOURCES = [
  "openwebninja",
  "washingtonian",
  "clockoutdc",
  "eventbrite",
  "crawler",
];

// Get command line argument for update mode
const updateMode = process.argv[2] || "mined"; // "mined" or "all"

async function updateEventsIsPublic() {
  console.log("🔄 Starting migration to update isPublic for events...");
  console.log(`📊 Table: ${Resource.Db.name}`);
  console.log(`📋 Update mode: ${updateMode === "all" ? "ALL events" : "Only mined/crawled events"}\n`);

  let lastEvaluatedKey: any = undefined;
  let totalScanned = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  const updateReasons: Record<string, number> = {};

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
      totalScanned++;

      const source = event.source || "";
      const currentIsPublic = event.isPublic;
      
      // Determine if this event should be updated
      let needsUpdate = false;
      let reason = "";

      if (updateMode === "all") {
        // Update ALL events that are false or missing
        if (currentIsPublic === "false" || currentIsPublic === false) {
          needsUpdate = true;
          reason = "isPublic was false";
        } else if (currentIsPublic === undefined || currentIsPublic === null) {
          needsUpdate = true;
          reason = "isPublic was missing";
        }
      } else {
        // Only update mined/crawled events
        const shouldBePublic = PUBLIC_SOURCES.includes(source.toLowerCase());
        if (shouldBePublic) {
          if (currentIsPublic === "false" || currentIsPublic === false) {
            needsUpdate = true;
            reason = `mined event (${source}) with isPublic=false`;
          } else if (currentIsPublic === undefined || currentIsPublic === null) {
            needsUpdate = true;
            reason = `mined event (${source}) missing isPublic`;
          }
        }
      }

      if (needsUpdate) {
        try {
          const updateCommand = new UpdateItemCommand({
            TableName: Resource.Db.name,
            Key: {
              pk: { S: event.pk },
              sk: { S: event.sk || event.pk },
            },
            UpdateExpression: "SET #isPublic = :isPublic, #updatedAt = :updatedAt",
            ExpressionAttributeNames: {
              "#isPublic": "isPublic",
              "#updatedAt": "updatedAt",
            },
            ExpressionAttributeValues: {
              ":isPublic": { S: "true" },
              ":updatedAt": { N: Date.now().toString() },
            },
          });

          await db.send(updateCommand);
          totalUpdated++;
          updateReasons[reason] = (updateReasons[reason] || 0) + 1;
          
          if (totalUpdated <= 20) {
            // Log first 20 updates
            console.log(
              `✅ Updated: "${event.title || event.pk}" (source: ${source}, reason: ${reason})`
            );
          }
        } catch (error) {
          console.error(
            `❌ Failed to update ${event.pk}:`,
            error instanceof Error ? error.message : String(error)
          );
        }
      } else {
        totalSkipped++;
        if (totalScanned % 100 === 0) {
          console.log(
            `📊 Progress: Scanned ${totalScanned}, Updated ${totalUpdated}, Skipped ${totalSkipped}`
          );
        }
      }
    }

    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  console.log("\n✅ Migration completed!");
  console.log(`📊 Summary:`);
  console.log(`   - Total events scanned: ${totalScanned}`);
  console.log(`   - Events updated: ${totalUpdated}`);
  console.log(`   - Events skipped (already correct): ${totalSkipped}`);
  
  if (totalUpdated > 0) {
    console.log(`\n📋 Update reasons:`);
    for (const [reason, count] of Object.entries(updateReasons)) {
      console.log(`   - ${reason}: ${count} events`);
    }
  }
}

// Run the migration
updateEventsIsPublic()
  .then(() => {
    console.log("✅ Migration script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Migration script failed:", error);
    process.exit(1);
  });


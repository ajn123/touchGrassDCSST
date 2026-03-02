/**
 * Migration script to normalize event categories to canonical values.
 *
 * Usage:
 *   sst shell tsx src/migrate-categories.ts           # dry-run (default)
 *   sst shell tsx src/migrate-categories.ts apply      # apply changes
 */

import {
  DynamoDBClient,
  ScanCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { Resource } from "sst";
import { normalizeCategory } from "@touchgrass/shared-utils";

const db = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const dryRun = process.argv[2] !== "apply";

async function migrateCategories() {
  console.log("🔄 Starting category migration...");
  console.log(`📊 Table: ${Resource.Db.name}`);
  console.log(`📋 Mode: ${dryRun ? "DRY RUN (pass 'apply' to write)" : "APPLY"}\n`);

  let lastEvaluatedKey: any = undefined;
  let totalScanned = 0;
  let totalChanged = 0;
  let totalSkipped = 0;
  const changeSummary: Record<string, number> = {};

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

      const oldCategory = event.category ?? "";
      const newCategory = normalizeCategory(oldCategory || undefined);

      if (oldCategory === newCategory) {
        totalSkipped++;
        continue;
      }

      const changeKey = `"${oldCategory}" → "${newCategory}"`;
      changeSummary[changeKey] = (changeSummary[changeKey] || 0) + 1;
      totalChanged++;

      if (totalChanged <= 30) {
        console.log(
          `${dryRun ? "🔍" : "✅"} "${event.title || event.pk}": ${changeKey}`
        );
      }

      if (!dryRun) {
        try {
          const updateCommand = new UpdateItemCommand({
            TableName: Resource.Db.name,
            Key: {
              pk: { S: event.pk },
              sk: { S: event.sk || event.pk },
            },
            UpdateExpression:
              "SET #category = :category, #updatedAt = :updatedAt",
            ExpressionAttributeNames: {
              "#category": "category",
              "#updatedAt": "updatedAt",
            },
            ExpressionAttributeValues: {
              ":category": { S: newCategory },
              ":updatedAt": { N: Date.now().toString() },
            },
          });

          await db.send(updateCommand);
        } catch (error) {
          console.error(
            `❌ Failed to update ${event.pk}:`,
            error instanceof Error ? error.message : String(error)
          );
        }
      }
    }

    lastEvaluatedKey = result.LastEvaluatedKey;

    if (totalScanned % 200 === 0) {
      console.log(
        `📊 Progress: Scanned ${totalScanned}, Changed ${totalChanged}, Skipped ${totalSkipped}`
      );
    }
  } while (lastEvaluatedKey);

  console.log(`\n${dryRun ? "🔍 DRY RUN" : "✅"} Migration completed!`);
  console.log(`📊 Summary:`);
  console.log(`   - Total events scanned: ${totalScanned}`);
  console.log(`   - Events ${dryRun ? "that would change" : "updated"}: ${totalChanged}`);
  console.log(`   - Events skipped (already correct): ${totalSkipped}`);

  if (totalChanged > 0) {
    console.log(`\n📋 Change breakdown:`);
    const sorted = Object.entries(changeSummary).sort(
      ([, a], [, b]) => b - a
    );
    for (const [change, count] of sorted) {
      console.log(`   ${count}x  ${change}`);
    }
  }

  if (dryRun && totalChanged > 0) {
    console.log(
      `\n💡 Run with 'apply' argument to write these changes to the database.`
    );
  }
}

migrateCategories()
  .then(() => {
    console.log("\n✅ Migration script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Migration script failed:", error);
    process.exit(1);
  });

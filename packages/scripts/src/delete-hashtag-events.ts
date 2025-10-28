import {
  DeleteItemCommand,
  DynamoDBClient,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import { Resource } from "sst";

/**
 * Script to delete all events that have "EVENT#" prefix in their primary key (pk)
 * This targets old event format with "EVENT#" prefix
 */
export async function main() {
  console.log("🔍 Searching for events with EVENT# prefix in pk...");

  const client = new DynamoDBClient({
    region: process.env.AWS_REGION || "us-east-1",
  });

  try {
    // Scan for all items where pk begins with "EVENT#"
    let lastEvaluatedKey: any = undefined;
    let totalDeleted = 0;
    let totalScanned = 0;

    do {
      const scanCommand = new ScanCommand({
        TableName: Resource.Db.name,
        FilterExpression: "begins_with(#pk, :eventPrefix)",
        ExpressionAttributeNames: {
          "#pk": "pk",
        },
        ExpressionAttributeValues: {
          ":eventPrefix": { S: "EVENT#" },
        },
        ExclusiveStartKey: lastEvaluatedKey,
        Limit: 100, // Process in batches
      });

      const result = await client.send(scanCommand);
      const items = result.Items || [];
      totalScanned += items.length;

      console.log(
        `📊 Scanning batch: Found ${items.length} items with EVENT# prefix in pk`
      );

      // Delete each item
      for (const item of items) {
        const pk = item.pk?.S || "";
        const sk = item.sk?.S || "";

        if (!pk || !sk) {
          console.log(`⚠️ Skipping item with missing key: pk=${pk}, sk=${sk}`);
          continue;
        }

        try {
          const deleteCommand = new DeleteItemCommand({
            TableName: Resource.Db.name,
            Key: {
              pk: item.pk,
              sk: item.sk,
            },
          });

          await client.send(deleteCommand);
          totalDeleted++;
          console.log(`✅ Deleted item: ${pk}`);
        } catch (deleteError) {
          console.error(`❌ Error deleting item ${pk}:`, deleteError);
        }
      }

      lastEvaluatedKey = result.LastEvaluatedKey;

      if (lastEvaluatedKey) {
        console.log(
          `🔄 Continuing scan... Last evaluated key: ${lastEvaluatedKey.pk?.S}`
        );
      }
    } while (lastEvaluatedKey);

    console.log("\n📊 SUMMARY:");
    console.log(`   Total scanned: ${totalScanned} items`);
    console.log(`   Total deleted: ${totalDeleted} items`);
    console.log("✅ Cleanup complete!");
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    throw error;
  }
}

main().catch(console.error);

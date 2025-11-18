import {
  DeleteItemCommand,
  DynamoDBClient,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { Resource } from "sst";

interface DbItemRaw {
  pk: { S: string };
  sk: { S: string };
  title?: { S: string };
  source?: { S: string };
  location?: { S: string };
  venue?: { S: string };
  createdAt?: { N: string };
  start_date?: { S: string };
}

// Check if dry-run mode (--dry-run flag)
const isDryRun =
  process.argv.includes("--dry-run") || process.argv.includes("--dryrun");

export async function main() {
  console.log("🔍 Searching for duplicate events...");
  if (isDryRun) {
    console.log("⚠️  DRY RUN MODE - No items will be deleted");
  }

  const client = new DynamoDBClient({
    region: process.env.AWS_REGION || "us-east-1",
  });

  try {
    let lastEvaluatedKey: any = undefined;
    const groups = new Map<string, DbItemRaw[]>();
    let scanned = 0;

    // Scan for both EVENT- and EVENT# prefixes
    do {
      const scan = new ScanCommand({
        TableName: Resource.Db.name,
        // Limit scope to EVENT-* and EVENT#* items (both ID formats)
        FilterExpression:
          "begins_with(#pk, :eventPrefix1) OR begins_with(#pk, :eventPrefix2)",
        ExpressionAttributeNames: { "#pk": "pk" },
        ExpressionAttributeValues: {
          ":eventPrefix1": { S: "EVENT-" },
          ":eventPrefix2": { S: "EVENT#" },
        },
        ExclusiveStartKey: lastEvaluatedKey,
        Limit: 200,
      });

      const res = await client.send(scan);
      const items = (res.Items || []) as unknown as DbItemRaw[];
      scanned += items.length;

      for (const item of items) {
        const title = item.title?.S?.trim() || "";
        const source = item.source?.S?.trim() || "";
        const startDate = item.start_date?.S?.trim() || "";
        const location = item.location?.S?.trim() || "";
        const venue = item.venue?.S?.trim() || "";

        // Require title and start_date to be present to consider duplicates
        if (!title || !startDate) continue;

        // Create a more specific key: source|title|date|location|venue
        // This helps catch duplicates even if they have slightly different data
        const locationKey = (location || venue || "").toLowerCase();
        const key = `${source.toLowerCase()}|${title.toLowerCase()}|${startDate}|${locationKey}`;

        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(item);
      }

      lastEvaluatedKey = res.LastEvaluatedKey;
      if (lastEvaluatedKey) {
        console.log(`🔄 Continuing scan... (scanned ${scanned} items so far)`);
      }
    } while (lastEvaluatedKey);

    // Identify duplicates
    let deleteCount = 0;
    let groupCount = 0;
    const duplicatesToDelete: Array<{ item: DbItemRaw; reason: string }> = [];

    for (const [key, items] of groups.entries()) {
      if (items.length <= 1) continue;
      groupCount++;

      // Sort by createdAt desc (keep newest); fallback to pk lexical desc
      items.sort((a, b) => {
        const aTs = a.createdAt?.N ? Number(a.createdAt.N) : 0;
        const bTs = b.createdAt?.N ? Number(b.createdAt.N) : 0;
        if (aTs !== bTs) return bTs - aTs; // Newest first
        return (b.pk?.S || "").localeCompare(a.pk?.S || "");
      });

      // Keep first (newest), mark the rest for deletion
      const toDelete = items.slice(1);
      const kept = items[0];
      const keptPretty = unmarshall(kept as any);

      console.log(
        `\n📋 Found ${items.length} duplicates for: "${keptPretty.title}" (${keptPretty.start_date})`
      );
      console.log(
        `   ✅ Keeping: ${keptPretty.pk} (createdAt: ${keptPretty.createdAt})`
      );

      for (const d of toDelete) {
        const pretty = unmarshall(d as any);
        const reason = `Duplicate of ${keptPretty.pk} (older: createdAt=${pretty.createdAt})`;
        duplicatesToDelete.push({ item: d, reason });
        console.log(
          `   🗑️  Will delete: ${pretty.pk} (createdAt: ${pretty.createdAt})`
        );
      }
    }

    // Delete duplicates
    if (duplicatesToDelete.length > 0) {
      console.log(
        `\n🗑️  ${isDryRun ? "Would delete" : "Deleting"} ${
          duplicatesToDelete.length
        } duplicate items...`
      );

      for (const { item, reason } of duplicatesToDelete) {
        try {
          if (!isDryRun) {
            await client.send(
              new DeleteItemCommand({
                TableName: Resource.Db.name,
                Key: { pk: item.pk, sk: item.sk },
              })
            );
          }
          deleteCount++;
          const pretty = unmarshall(item as any);
          const action = isDryRun ? "Would delete" : "Deleted";
          console.log(
            `   ${action}: pk=${pretty.pk} title="${pretty.title}" source=${pretty.source}`
          );
        } catch (err) {
          console.error(`❌ Failed to delete ${item.pk?.S}:`, err);
        }

        // Add small delay to avoid throttling
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }

    console.log("\n📊 SUMMARY:");
    console.log(`   Scanned: ${scanned} items`);
    console.log(`   Duplicate groups found: ${groupCount}`);
    console.log(
      `   ${isDryRun ? "Would delete" : "Deleted"}: ${deleteCount} items`
    );
    if (isDryRun) {
      console.log(
        "\n⚠️  This was a DRY RUN. Run without --dry-run to actually delete duplicates."
      );
    } else {
      console.log("✅ Duplicate cleanup complete");
    }
  } catch (error) {
    console.error("❌ Error during duplicate cleanup:", error);
    throw error;
  }
}

// Run main function when script is executed directly
main().catch(console.error);

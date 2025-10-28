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
  createdAt?: { N: string };
  start_date?: { S: string };
}

export async function main() {
  console.log("🔍 Searching for duplicate events by source+title...");

  const client = new DynamoDBClient({
    region: process.env.AWS_REGION || "us-east-1",
  });

  try {
    let lastEvaluatedKey: any = undefined;
    const groups = new Map<string, DbItemRaw[]>();
    let scanned = 0;

    do {
      const scan = new ScanCommand({
        TableName: Resource.Db.name,
        // Limit scope to EVENT-* items (old and new IDs)
        FilterExpression: "begins_with(#pk, :eventPrefix)",
        ExpressionAttributeNames: { "#pk": "pk" },
        ExpressionAttributeValues: { ":eventPrefix": { S: "EVENT-" } },
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
        // Require title and start_date to be present to consider duplicates
        if (!title || !startDate) continue;
        const key = `${source.toLowerCase()}|${title.toLowerCase()}|${startDate}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(item);
      }

      lastEvaluatedKey = res.LastEvaluatedKey;
      if (lastEvaluatedKey) {
        console.log("🔄 Continuing scan...");
      }
    } while (lastEvaluatedKey);

    // Identify duplicates
    let deleteCount = 0;
    let groupCount = 0;

    for (const [key, items] of groups.entries()) {
      if (items.length <= 1) continue;
      groupCount++;
      // Sort by createdAt desc; fallback to pk lexical desc
      items.sort((a, b) => {
        const aTs = a.createdAt?.N ? Number(a.createdAt.N) : 0;
        const bTs = b.createdAt?.N ? Number(b.createdAt.N) : 0;
        if (aTs !== bTs) return bTs - aTs;
        return (b.pk?.S || "").localeCompare(a.pk?.S || "");
      });

      // Keep first, delete the rest
      const toDelete = items.slice(1);
      for (const d of toDelete) {
        try {
          await client.send(
            new DeleteItemCommand({
              TableName: Resource.Db.name,
              Key: { pk: d.pk, sk: d.sk },
            })
          );
          deleteCount++;
          const pretty = unmarshall(d as any);
          console.log(
            `🗑️ Deleted duplicate: pk=${pretty.pk} title="${pretty.title}" source=${pretty.source} createdAt=${pretty.createdAt}`
          );
        } catch (err) {
          console.error("❌ Failed to delete", d.pk?.S, err);
        }
      }
    }

    console.log("\n📊 SUMMARY:");
    console.log(`   Scanned: ${scanned}`);
    console.log(`   Duplicate groups: ${groupCount}`);
    console.log(`   Deleted items: ${deleteCount}`);
    console.log("✅ Duplicate cleanup complete");
  } catch (error) {
    console.error("❌ Error during duplicate cleanup:", error);
    throw error;
  }
}

main().catch(console.error);

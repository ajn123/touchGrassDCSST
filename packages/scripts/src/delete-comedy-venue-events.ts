#!/usr/bin/env tsx
/**
 * Delete all DC Improv and DC Comedy Loft events from the database.
 * These were saved without proper date fields before the normalization fix,
 * so they need to be wiped and re-crawled.
 *
 * Usage (dry-run — safe, prints what would be deleted):
 *   sst shell --stage production tsx src/delete-comedy-venue-events.ts
 *
 * Usage (delete for real):
 *   sst shell --stage production -- tsx src/delete-comedy-venue-events.ts --confirm
 */

import {
  DynamoDBClient,
  ScanCommand,
  BatchWriteItemCommand,
} from "@aws-sdk/client-dynamodb";
import { Resource } from "sst";

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const tableName = Resource.Db.name;

async function scanAllEvents(): Promise<Array<{ pk: string; sk: string; title?: string; url?: string; source?: string }>> {
  const items: Array<{ pk: string; sk: string; title?: string; url?: string; source?: string }> = [];
  let lastKey: Record<string, any> | undefined;

  do {
    const cmd = new ScanCommand({
      TableName: tableName,
      FilterExpression: "begins_with(pk, :prefix)",
      ExpressionAttributeValues: { ":prefix": { S: "EVENT-" } },
      ProjectionExpression: "pk, sk, title, #u, #s",
      ExpressionAttributeNames: { "#u": "url", "#s": "source" },
      ExclusiveStartKey: lastKey,
    });

    const result = await client.send(cmd);
    (result.Items ?? []).forEach((item) => {
      items.push({
        pk: item.pk?.S ?? "",
        sk: item.sk?.S ?? "",
        title: item.title?.S,
        url: item.url?.S,
        source: item.source?.S,
      });
    });
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return items;
}

async function batchDelete(pairs: Array<{ pk: string; sk: string }>): Promise<number> {
  let deleted = 0;

  for (let i = 0; i < pairs.length; i += 25) {
    const batch = pairs.slice(i, i + 25);

    const cmd = new BatchWriteItemCommand({
      RequestItems: {
        [tableName]: batch.map(({ pk, sk }) => ({
          DeleteRequest: { Key: { pk: { S: pk }, sk: { S: sk } } },
        })),
      },
    });

    let result = await client.send(cmd);

    let retries = 0;
    while (
      result.UnprocessedItems &&
      Object.keys(result.UnprocessedItems).length > 0 &&
      retries < 3
    ) {
      await new Promise((r) => setTimeout(r, 500 * (retries + 1)));
      result = await client.send(
        new BatchWriteItemCommand({ RequestItems: result.UnprocessedItems })
      );
      retries++;
    }

    deleted += batch.length;
    await new Promise((r) => setTimeout(r, 100));
  }

  return deleted;
}

const args = process.argv.slice(2);
const dryRun = !args.includes("--confirm");

async function main() {
  console.log("🗑️  DC Improv & DC Comedy Loft Event Cleanup");
  console.log("=".repeat(70));
  console.log(`Table : ${tableName}`);
  console.log(`Mode  : ${dryRun ? "DRY RUN (pass --confirm to delete)" : "⚠️  LIVE DELETE"}`);
  console.log("=".repeat(70));

  console.log("\n🔍 Scanning all events…");
  const all = await scanAllEvents();
  console.log(`   Found ${all.length} total events`);

  const toDelete = all.filter((e) => {
    const source = e.source ?? "";
    const url = e.url ?? "";
    return (
      source === "dcimprov" ||
      source === "dccomedyloft" ||
      url.includes("dcimprov.com") ||
      url.includes("dccomedyloft.com")
    );
  });

  const dcimprov = toDelete.filter(e => (e.source ?? "").includes("improv") || (e.url ?? "").includes("dcimprov"));
  const dccomedyloft = toDelete.filter(e => (e.source ?? "").includes("comedyloft") || (e.url ?? "").includes("dccomedyloft"));

  console.log(`   Found ${toDelete.length} events to delete:`);
  console.log(`     - DC Improv:     ${dcimprov.length}`);
  console.log(`     - DC Comedy Loft: ${dccomedyloft.length}`);

  if (toDelete.length === 0) {
    console.log("✅ Nothing to delete.");
    return;
  }

  if (dryRun) {
    console.log(`\n⚠️  DRY RUN — ${toDelete.length} events would be deleted.`);
    console.log("    Run with --confirm to actually delete them.");
    return;
  }

  console.log(`\n🗑️  Deleting ${toDelete.length} events…`);
  const deleted = await batchDelete(toDelete);
  console.log(`✅ Deleted ${deleted} events.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
  });

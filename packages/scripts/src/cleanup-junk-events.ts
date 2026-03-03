#!/usr/bin/env tsx
/**
 * Remove junk events left over from the broken DC Improv crawler.
 *
 * Bad events include:
 *   - URL contains "seatengine"  (old ticket-page URLs)
 *   - URL contains "touchgrassdc.com"  (our own frontend URL stored as event URL)
 *   - Title matches known navigation / non-event patterns
 *     (About the Show, Main Navigation, Get Tickets, DC Improv, FAQ, …)
 *
 * Usage (dry-run — safe, prints what would be deleted):
 *   sst shell --stage production tsx src/cleanup-junk-events.ts
 *
 * Usage (delete for real):
 *   sst shell --stage production tsx src/cleanup-junk-events.ts --confirm
 */

import {
  DynamoDBClient,
  ScanCommand,
  BatchWriteItemCommand,
} from "@aws-sdk/client-dynamodb";
import { Resource } from "sst";

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const tableName = Resource.Db.name;

// ── Junk-detection rules ────────────────────────────────────────────────────

const BAD_URL_SUBSTRINGS = [
  "seatengine",
  "touchgrassdc.com",       // our own frontend — never a valid event URL
  "main%20navigation",      // navigation link that snuck in
  "main-navigation",
  "get%20tickets",
  "get-tickets",
];

const BAD_TITLE_PATTERNS = [
  "about the show",
  "about the comics",
  "online showroom",
  "main navigation",
  "main nav",
  "get tickets",
  "get ticket",
  "about us",
  "contact us",
  "gift cards",
  "private events",
  "group sales",
  "faq",
  "terms of service",
  "privacy policy",
  "dc improv",              // standalone "DC Improv" title (not a show name)
  "navigation",
];

function isJunk(title: string | undefined, url: string | undefined): boolean {
  const t = (title ?? "").toLowerCase().trim();
  const u = (url ?? "").toLowerCase();

  // Exact-match or contains match on title
  if (t && BAD_TITLE_PATTERNS.some((p) => t === p || t.includes(p))) return true;

  // URL substring match
  if (u && BAD_URL_SUBSTRINGS.some((s) => u.includes(s))) return true;

  return false;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function scanAllEvents(): Promise<Array<{ pk: string; sk: string; title?: string; url?: string }>> {
  const items: Array<{ pk: string; sk: string; title?: string; url?: string }> = [];
  let lastKey: Record<string, any> | undefined;

  do {
    const cmd = new ScanCommand({
      TableName: tableName,
      FilterExpression: "begins_with(pk, :prefix)",
      ExpressionAttributeValues: { ":prefix": { S: "EVENT-" } },
      ProjectionExpression: "pk, sk, title, #u",
      ExpressionAttributeNames: { "#u": "url" },
      ExclusiveStartKey: lastKey,
    });

    const result = await client.send(cmd);
    (result.Items ?? []).forEach((item) => {
      items.push({
        pk: item.pk?.S ?? "",
        sk: item.sk?.S ?? "",
        title: item.title?.S,
        url: item.url?.S,
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

    // Retry unprocessed items with back-off
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
    await new Promise((r) => setTimeout(r, 100)); // throttle guard
  }

  return deleted;
}

// ── Main ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const dryRun = !args.includes("--confirm");

async function main() {
  console.log("🧹 DC Improv Junk Event Cleanup");
  console.log("=".repeat(70));
  console.log(`Table : ${tableName}`);
  console.log(`Mode  : ${dryRun ? "DRY RUN (pass --confirm to delete)" : "⚠️  LIVE DELETE"}`);
  console.log("=".repeat(70));

  console.log("\n🔍 Scanning all events…");
  const all = await scanAllEvents();
  console.log(`   Found ${all.length} total events`);

  const junk = all.filter((e) => isJunk(e.title, e.url));
  console.log(`   Found ${junk.length} junk events\n`);

  if (junk.length === 0) {
    console.log("✅ Nothing to delete.");
    return;
  }

  // Print every junk event so the user can review
  console.log("Junk events to delete:");
  console.log("-".repeat(70));
  junk.forEach((e, i) => {
    console.log(`  ${String(i + 1).padStart(3)}. Title : ${e.title ?? "(no title)"}`);
    console.log(`       URL   : ${e.url ?? "(no url)"}`);
    console.log(`       pk    : ${e.pk}`);
  });
  console.log("-".repeat(70));

  if (dryRun) {
    console.log(`\n⚠️  DRY RUN — ${junk.length} events would be deleted.`);
    console.log("    Run with --confirm to actually delete them.");
    return;
  }

  console.log(`\n🗑️  Deleting ${junk.length} events…`);
  const deleted = await batchDelete(junk);
  console.log(`✅ Deleted ${deleted} junk events.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
  });

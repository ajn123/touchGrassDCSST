import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { decodeHtmlEntities } from "@touchgrass/shared-utils";
import { Resource } from "sst";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const tableName = Resource.Db.name;

// Set APPLY=1 to actually write; otherwise this is a dry run that only reports.
const APPLY = process.env.APPLY === "1" || process.argv.includes("--apply");

// Matches a leftover HTML entity: named (&amp;), decimal (&#39;) or hex (&#x27;)
const ENTITY_RE = /&(?:#\d+|#x[0-9a-fA-F]+|[a-zA-Z]+);/;

const FIELDS = ["title", "venue", "location"] as const;

async function backfill() {
  console.log(
    `${APPLY ? "APPLYING" : "DRY RUN"} — decoding HTML entities in event titles/venue/location on: ${tableName}`
  );

  let lastKey: Record<string, any> | undefined;
  let scanned = 0;
  let updated = 0;
  const samples: string[] = [];

  do {
    const result = await docClient.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: "begins_with(pk, :p)",
        ExpressionAttributeValues: { ":p": "EVENT" },
        ExclusiveStartKey: lastKey,
      })
    );

    for (const item of result.Items ?? []) {
      scanned++;

      const sets: Record<string, string> = {};
      for (const field of FIELDS) {
        const val = item[field];
        if (typeof val === "string" && ENTITY_RE.test(val)) {
          const decoded = decodeHtmlEntities(val).trim();
          // `title` is the eventTitleIndex partition key — DynamoDB rejects an
          // empty string for an indexed key, so never blank it out.
          if (field === "title" && decoded === "") {
            console.warn(`  Skipping ${item.pk} — title decodes to empty: "${val}"`);
            continue;
          }
          if (decoded !== val) sets[field] = decoded;
        }
      }

      if (Object.keys(sets).length === 0) continue;

      if (samples.length < 20) {
        samples.push(`  "${item.title}" -> "${sets.title ?? item.title}"`);
      }

      if (APPLY) {
        const names: Record<string, string> = {};
        const values: Record<string, string> = {};
        const expr = Object.keys(sets).map((f, i) => {
          names[`#f${i}`] = f;
          values[`:v${i}`] = sets[f];
          return `#f${i} = :v${i}`;
        });
        try {
          await docClient.send(
            new UpdateCommand({
              TableName: tableName,
              Key: { pk: item.pk, sk: item.sk },
              UpdateExpression: `SET ${expr.join(", ")}`,
              ExpressionAttributeNames: names,
              ExpressionAttributeValues: values,
            })
          );
        } catch (err) {
          console.warn(`  Failed to update ${item.pk}:`, (err as Error).message);
          continue;
        }
      }
      updated++;
    }

    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  console.log(`\nScanned ${scanned} event items.`);
  console.log(`${APPLY ? "Updated" : "Would update"} ${updated} items with HTML entities.`);
  if (samples.length) {
    console.log(`\nSamples:`);
    samples.forEach((s) => console.log(s));
  }
  if (!APPLY && updated > 0) {
    console.log(`\nRe-run with --apply to write these changes.`);
  }
}

backfill().catch(console.error);

import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { Resource } from "sst";

const client = new DynamoDBClient({ region: "us-east-1" });

async function main() {
  const slugs = [
    "best-pizza-2026-w10",
    "best-outdoor-activities-2026-w11",
    "best-live-music-2026-w12",
  ];

  for (const slug of slugs) {
    const result = await client.send(
      new GetItemCommand({
        TableName: Resource.Db.name,
        Key: { pk: { S: `ARTICLE#${slug}` }, sk: { S: "ARTICLE_INFO" } },
        ProjectionExpression: "title, places",
      })
    );
    if (!result.Item) {
      console.log(`\n${slug}: NOT FOUND`);
      continue;
    }
    const item = unmarshall(result.Item);
    console.log(`\n${item.title}`);
    if (item.places && item.places.length > 0) {
      console.log(`  Places count: ${item.places.length}`);
      for (const p of item.places.slice(0, 5)) {
        console.log(`  - ${p.name} | ${p.address} | website: ${p.website || "none"}`);
      }
    } else {
      console.log("  No places data");
    }
  }
}

main().catch(console.error);

import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { Resource } from "sst";

const client = new DynamoDBClient({ region: "us-east-1" });

const updates = [
  { slug: "best-pizza-2026-w10", seed: "pizza-slice-neapolitan" },
  { slug: "best-outdoor-activities-2026-w11", seed: "hiking-trail-forest-river" },
  { slug: "best-live-music-2026-w12", seed: "live-concert-stage-crowd" },
];

async function main() {
  for (const { slug, seed } of updates) {
    const imageUrl = `https://picsum.photos/seed/${seed}/1200/630`;
    await client.send(new UpdateItemCommand({
      TableName: Resource.Db.name,
      Key: marshall({ pk: `ARTICLE#${slug}`, sk: "ARTICLE_INFO" }),
      UpdateExpression: "SET image_url = :url",
      ExpressionAttributeValues: marshall({ ":url": imageUrl }),
    }));
    console.log(`Updated ${slug} → ${imageUrl}`);
  }
}

main().catch(console.error);

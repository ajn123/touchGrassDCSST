/**
 * Regenerate SVG cover images for all existing articles.
 *
 * This replaces any random picsum/unsplash URLs with branded SVG images
 * that display the article title, category, and excerpt — much more
 * relevant and eye-catching than random stock photos.
 *
 * Usage: npx sst shell --stage production tsx src/regenerate-article-images.ts
 */
import {
  DynamoDBClient,
  ScanCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { generateStyledArticleSvgBuffer } from "@touchgrass/shared-utils";
import { Resource } from "sst";

const dynamoClient = new DynamoDBClient({ region: "us-east-1" });
const s3Client = new S3Client({ region: "us-east-1" });

async function main() {
  // 1. Scan for all articles
  const articles: any[] = [];
  let lastKey: any = undefined;

  do {
    const result = await dynamoClient.send(
      new ScanCommand({
        TableName: Resource.Db.name,
        FilterExpression: "begins_with(pk, :prefix) AND sk = :sk",
        ExpressionAttributeValues: marshall({
          ":prefix": "ARTICLE#",
          ":sk": "ARTICLE_INFO",
        }),
        ExclusiveStartKey: lastKey,
      })
    );

    if (result.Items) {
      articles.push(...result.Items.map((item) => unmarshall(item)));
    }
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  console.log(`Found ${articles.length} articles to update\n`);

  const bucketName = Resource.MediaBucket.name;

  for (const article of articles) {
    const slug = article.slug;
    const title = article.title || "Untitled";
    const category = article.category || "General";
    const excerpt = article.excerpt || "";

    // 2. Generate branded SVG
    const svgBuffer = generateStyledArticleSvgBuffer({
      title,
      category,
      subtitle: excerpt,
    });

    // 3. Upload to S3
    const s3Key = `article-images/${slug}.svg`;
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
        Body: svgBuffer,
        ContentType: "image/svg+xml",
        CacheControl: "public, max-age=31536000",
      })
    );

    const imageUrl = `https://${bucketName}.s3.amazonaws.com/${s3Key}`;

    // 4. Update DynamoDB
    await dynamoClient.send(
      new UpdateItemCommand({
        TableName: Resource.Db.name,
        Key: marshall({ pk: `ARTICLE#${slug}`, sk: "ARTICLE_INFO" }),
        UpdateExpression: "SET image_url = :url",
        ExpressionAttributeValues: marshall({ ":url": imageUrl }),
      })
    );

    console.log(`[OK] ${slug} — "${title}"`);
    console.log(`     → ${imageUrl}\n`);
  }

  console.log(`Done! Updated ${articles.length} articles with branded SVG covers.`);
}

main().catch(console.error);

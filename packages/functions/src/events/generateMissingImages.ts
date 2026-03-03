import {
  DynamoDBClient,
  ScanCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { generateStyledEventSvgBuffer } from "@touchgrass/shared-utils";
import { Handler } from "aws-lambda";
import { Resource } from "sst";

const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
});

export const handler: Handler = async () => {
  const tableName = Resource.Db.name;
  const bucketName = Resource.MediaBucket.name;

  // Scan for public events that have no image_url set
  const scanResult = await dynamoClient.send(
    new ScanCommand({
      TableName: tableName,
      FilterExpression:
        "begins_with(pk, :prefix) AND (attribute_not_exists(image_url) OR image_url = :empty)",
      ExpressionAttributeValues: {
        ":prefix": { S: "EVENT" },
        ":empty": { S: "" },
      },
    })
  );

  const events = (scanResult.Items || []).map((item) => unmarshall(item));
  console.log(`Found ${events.length} events without images`);

  let processed = 0;
  let failed = 0;

  for (const event of events) {
    try {
      const title = event.title;
      const category = Array.isArray(event.category)
        ? event.category[0]
        : event.category;
      const venue = event.venue;

      // Generate styled SVG
      const svgBuffer = generateStyledEventSvgBuffer({ title, category, venue });
      const eventId = event.pk.replace("EVENT#", "").replace(/[^a-zA-Z0-9-]/g, "_");
      const s3Key = `event-images/${eventId}.svg`;

      // Upload to S3
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

      // Update DynamoDB record with the new image URL
      await dynamoClient.send(
        new UpdateItemCommand({
          TableName: tableName,
          Key: {
            pk: { S: event.pk },
            sk: { S: event.sk },
          },
          UpdateExpression: "SET image_url = :url",
          ExpressionAttributeValues: {
            ":url": { S: imageUrl },
          },
        })
      );

      console.log(`Generated image for: ${title} → ${s3Key}`);
      processed++;
    } catch (error) {
      console.error(`Error generating image for event ${event.pk}:`, error);
      failed++;
    }
  }

  console.log(`Done: ${processed} generated, ${failed} failed out of ${events.length} total`);
  return { processed, failed, total: events.length };
};

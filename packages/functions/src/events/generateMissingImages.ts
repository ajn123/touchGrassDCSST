import {
  DynamoDBClient,
  ScanCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
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

// Curated Unsplash CDN images per category (no API key needed).
// Each event picks one deterministically by title hash for visual variety.
const CURATED_IMAGES: Record<string, string[]> = {
  "Arts & Culture": [
    "https://images.unsplash.com/photo-1758380742154-44738eb92832?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1577639275749-f0e71ef0db20?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1740598307395-3ccc0ec28a28?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1569409777882-7e00ad5ccc2e?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1770910195254-d0f97308c30f?w=800&h=500&fit=crop&q=80",
  ],
  Comedy: [
    "https://images.unsplash.com/photo-1631220706319-657942774d02?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1527261834078-9b37d35a4a32?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1641903806973-17eaf2d2634f?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1730724620512-0c7814610790?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800&h=500&fit=crop&q=80",
  ],
  Community: [
    "https://images.unsplash.com/photo-1593896385987-16bcbf9451e5?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1550177977-ad69e8f3cae0?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1758272133786-ee98adcc6837?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1573496529574-be85d6a60704?w=800&h=500&fit=crop&q=80",
  ],
  Education: [
    "https://images.unsplash.com/photo-1713947503297-ca19bc5b6e38?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1758270705087-76e81a5117bd?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1758270704587-43339a801396?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1758270704840-0ac001215b55?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1528087181660-fa506ef726a0?w=800&h=500&fit=crop&q=80",
  ],
  Festival: [
    "https://images.unsplash.com/photo-1761775132162-944e2bcd1a3b?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1666306775349-0646fa4c3e01?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1729467067923-78d629125e3e?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1684349080178-09bf85b33e14?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&h=500&fit=crop&q=80",
  ],
  "Food & Drink": [
    "https://images.unsplash.com/photo-1756522074787-c750cae5e6aa?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1745157723999-1b0f6fa421ea?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1586580330552-0e0d2938275c?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1647776112336-72f4c30fafc1?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1650395628468-3b833b11a835?w=800&h=500&fit=crop&q=80",
  ],
  General: [
    "https://images.unsplash.com/photo-1648135589394-6926ddf85316?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1649184046382-b815f1f43d06?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1703641853375-2253ac921275?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1711895834951-3ab62fdc13f4?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1617293541287-5530026ca9b1?w=800&h=500&fit=crop&q=80",
  ],
  Music: [
    "https://images.unsplash.com/photo-1502773860571-211a597d6e4b?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1508360566237-303a44e4d14b?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1499364615650-ec38552f4f34?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1506026667107-3350a4c8eca6?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1529916536494-0bdf14951e30?w=800&h=500&fit=crop&q=80",
  ],
  Networking: [
    "https://images.unsplash.com/photo-1758518730178-6e237bc8b87d?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1561489396-888724a1543d?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1561489413-985b06da5bee?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1654609160632-7324716196fb?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&h=500&fit=crop&q=80",
  ],
  Nightlife: [
    "https://images.unsplash.com/photo-1572327918628-bf61496743ce?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1718046254335-d9ff832c9c3c?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1506485854521-3e13d857db0b?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1511963118349-e2b22c0efcfc?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1558407483-37b8bf9bef06?w=800&h=500&fit=crop&q=80",
  ],
  "Outdoors & Recreation": [
    "https://images.unsplash.com/photo-1674085678270-275a58d3281a?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1696219364361-ba4eac9f2361?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1660994324228-e787b1219940?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1602671620470-4dd2a68172ea?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1752608578869-b68941223e6a?w=800&h=500&fit=crop&q=80",
  ],
  Sports: [
    "https://images.unsplash.com/photo-1569531955323-33c6b2dca44b?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1728188498233-da994f8cb53a?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1762013315117-1c8005ad2b41?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1502904550040-7534597429ae?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1534258698732-f4f27981a92b?w=800&h=500&fit=crop&q=80",
  ],
  Theater: [
    "https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1739994628000-456494e19e59?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1562329265-95a6d7a83440?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1713514116766-d9be318edaf8?w=800&h=500&fit=crop&q=80",
    "https://images.unsplash.com/photo-1539964604210-db87088e0c2c?w=800&h=500&fit=crop&q=80",
  ],
};

/**
 * Pick a curated image URL deterministically based on event title,
 * so different events in the same category get different photos.
 */
function pickCuratedImage(category: string, title: string): string {
  const images = CURATED_IMAGES[category] || CURATED_IMAGES["General"];
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = ((hash << 5) - hash + title.charCodeAt(i)) | 0;
  }
  return images[Math.abs(hash) % images.length];
}

/**
 * Extract a short S3-safe key from an Unsplash CDN URL.
 * e.g. "photo-1631220706319-657942774d02" from the full URL.
 */
function unsplashPhotoId(url: string): string {
  const match = url.match(/photo-([a-zA-Z0-9-]+)\?/);
  return match ? `photo-${match[1]}` : `img-${Math.abs(hashStr(url))}`;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return h;
}

/** Check if an S3 object already exists. */
async function s3ObjectExists(
  bucket: string,
  key: string
): Promise<boolean> {
  try {
    await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

export const handler: Handler = async () => {
  const tableName = Resource.Db.name;
  const bucketName = Resource.MediaBucket.name;

  // Scan for events without image_url
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

  let processedCurated = 0;
  let processedSvg = 0;
  let failed = 0;

  for (const event of events) {
    try {
      const title = event.title || "Untitled Event";
      const category = Array.isArray(event.category)
        ? event.category[0]
        : event.category || "General";
      const venue = event.venue;
      const eventId = event.pk
        .replace("EVENT#", "")
        .replace(/[^a-zA-Z0-9-]/g, "_");

      let imageUrl = "";

      // Try curated category image
      try {
        const sourceUrl = pickCuratedImage(category, title);
        const photoId = unsplashPhotoId(sourceUrl);
        const s3Key = `curated-images/${photoId}.jpg`;

        // Only download once — reuse from S3 if already cached
        const exists = await s3ObjectExists(bucketName, s3Key);
        if (!exists) {
          console.log(`Downloading curated image: ${photoId}`);
          const imageBuffer = await downloadImage(sourceUrl);
          await s3Client.send(
            new PutObjectCommand({
              Bucket: bucketName,
              Key: s3Key,
              Body: imageBuffer,
              ContentType: "image/jpeg",
              CacheControl: "public, max-age=31536000",
            })
          );
        }

        imageUrl = `https://${bucketName}.s3.amazonaws.com/${s3Key}`;
        processedCurated++;
        console.log(`Curated image for: ${title} → ${s3Key}`);
      } catch (curatedError) {
        console.error(
          `Failed curated image for "${title}":`,
          curatedError
        );
      }

      // SVG fallback
      if (!imageUrl) {
        const svgBuffer = generateStyledEventSvgBuffer({
          title,
          category,
          venue,
        });
        const s3Key = `event-images/${eventId}.svg`;

        await s3Client.send(
          new PutObjectCommand({
            Bucket: bucketName,
            Key: s3Key,
            Body: svgBuffer,
            ContentType: "image/svg+xml",
            CacheControl: "public, max-age=31536000",
          })
        );

        imageUrl = `https://${bucketName}.s3.amazonaws.com/${s3Key}`;
        processedSvg++;
        console.log(`SVG fallback for: ${title} → ${s3Key}`);
      }

      // Update DynamoDB
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
    } catch (error) {
      console.error(`Error processing event ${event.pk}:`, error);
      failed++;
    }
  }

  const summary = {
    total: events.length,
    curated: processedCurated,
    svg: processedSvg,
    failed,
  };
  console.log("Done:", summary);
  return summary;
};

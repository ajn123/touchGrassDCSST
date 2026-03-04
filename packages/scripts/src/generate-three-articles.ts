import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { marshall } from "@aws-sdk/util-dynamodb";
import { generateStyledArticleSvgBuffer } from "@touchgrass/shared-utils";
import { Resource } from "sst";
import {
  ARTICLE_TOPICS,
  getTopicForWeek,
  generateArticleSlug,
  getWeekNumber,
} from "../../functions/src/articles/topics";
import {
  gatherRedditContent,
  formatRedditContentForPrompt,
} from "../../functions/src/articles/reddit";
import {
  gatherGooglePlacesContent,
  formatGooglePlacesForPrompt,
} from "../../functions/src/articles/google-places";
import {
  callOpenRouter,
  buildPrompt,
  repairArticleJson,
} from "../../functions/src/articles/generateArticle";

const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
});

async function callWithRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000,
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      console.warn(`Attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms...`, error);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("callWithRetry: unreachable");
}

async function articleExists(slug: string): Promise<boolean> {
  const result = await dynamoClient.send(
    new GetItemCommand({
      TableName: Resource.Db.name,
      Key: marshall({ pk: `ARTICLE#${slug}`, sk: "ARTICLE_INFO" }),
    })
  );
  return !!result.Item;
}

interface ArticleOutput {
  title: string;
  content: string;
  excerpt: string;
}

async function generateArticleForDate(date: Date): Promise<void> {
  const topic = getTopicForWeek(date);
  const slug = generateArticleSlug(topic.slug, date);
  const weekNum = getWeekNumber(date);

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Week ${weekNum}: "${topic.title}" (slug: ${slug})`);
  console.log(`${"=".repeat(60)}`);

  // 1. Fetch Reddit content
  console.log(`Fetching Reddit content for: ${topic.redditQueries.join(", ")}`);
  const redditContent = await gatherRedditContent(topic.redditQueries);
  const redditPromptText = formatRedditContentForPrompt(redditContent);
  console.log(`Reddit: ${redditContent.posts.length} posts, ${redditContent.topComments.length} comments`);

  // 2. Fetch Google Places content (if applicable)
  let googlePromptText = "";
  let googlePlaces: { name: string; rating: number; address: string; website?: string }[] = [];
  if (topic.googlePlacesQuery) {
    console.log(`Fetching Google Places for: "${topic.googlePlacesQuery}"`);
    const googleContent = await gatherGooglePlacesContent(topic.googlePlacesQuery);
    googlePromptText = formatGooglePlacesForPrompt(googleContent);
    // Build a map of detailed place websites by name
    const websiteByName = new Map<string, string>();
    for (const dp of googleContent.detailedPlaces) {
      if (dp.website) websiteByName.set(dp.name, dp.website);
    }
    googlePlaces = googleContent.places.map((p) => ({
      name: p.name,
      rating: p.rating,
      address: p.address,
      website: websiteByName.get(p.name),
    }));
    console.log(`Google Places: ${googleContent.places.length} places, ${googleContent.detailedPlaces.length} with reviews`);
  }

  // 3. Build prompt and call OpenRouter (with retry)
  const prompt = buildPrompt(topic, redditPromptText, googlePromptText);
  console.log(`Calling OpenRouter (prompt length: ${prompt.length} chars)`);

  const aiResponse = await callWithRetry(() => callOpenRouter(prompt));

  // 4. Parse the article JSON
  const cleaned = aiResponse.replace(/```json\n?|\n?```/g, "").trim();
  let article: ArticleOutput;
  try {
    article = JSON.parse(cleaned);
  } catch (e) {
    console.warn("JSON.parse failed, attempting repair...", (e as Error).message);
    try {
      article = repairArticleJson(cleaned);
      console.log("JSON repair succeeded");
    } catch (repairError) {
      console.error("Failed to parse OpenRouter response:", cleaned.substring(0, 500));
      throw new Error(`Failed to parse article JSON: ${e}`);
    }
  }

  if (!article.title || !article.content || !article.excerpt) {
    throw new Error(`Article missing required fields: ${JSON.stringify(Object.keys(article))}`);
  }

  // 5. Generate SVG cover image and upload to S3
  const svgBuffer = generateStyledArticleSvgBuffer({
    title: article.title,
    category: topic.category,
    subtitle: article.excerpt,
  });
  const bucketName = Resource.MediaBucket.name;
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
  console.log(`Uploaded cover image: ${s3Key}`);

  // 6. Save to DynamoDB
  const timestamp = Date.now();
  const item = {
    pk: `ARTICLE#${slug}`,
    sk: "ARTICLE_INFO",
    title: article.title,
    slug,
    content: article.content,
    excerpt: article.excerpt,
    category: topic.category,
    topicSlug: topic.slug,
    sources: redditContent.sourceLinks,
    places: googlePlaces,
    image_url: imageUrl,
    isPublic: "true",
    publishedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await dynamoClient.send(
    new PutItemCommand({
      TableName: Resource.Db.name,
      Item: marshall(item, { removeUndefinedValues: true }),
    })
  );

  console.log(`Saved article: "${article.title}"`);
  console.log(`Slug: ${slug}`);
  console.log(`Excerpt: ${article.excerpt}`);
}

async function main() {
  console.log("Generating 3 articles for weeks 10, 11, 12 of 2026...\n");

  // Create dates that fall in weeks 10, 11, and 12 of 2026
  const dates = [
    new Date("2026-03-09"), // Week 10 → best-pizza (index 10)
    new Date("2026-03-16"), // Week 11 → best-outdoor-activities (index 11)
    new Date("2026-03-23"), // Week 12 → best-live-music (index 12)
  ];

  for (const date of dates) {
    const topic = getTopicForWeek(date);
    const weekNum = getWeekNumber(date);
    console.log(`Week ${weekNum} → ${topic.slug} (index ${weekNum % ARTICLE_TOPICS.length})`);
  }

  console.log("");

  for (const date of dates) {
    try {
      await generateArticleForDate(date);
    } catch (error) {
      console.error(`Failed to generate article for ${date.toISOString()}:`, error);
    }
  }

  console.log("\nDone!");
}

main().catch(console.error);

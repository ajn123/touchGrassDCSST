import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { generateStyledArticleSvgBuffer } from "@touchgrass/shared-utils";
import { Handler } from "aws-lambda";
import { Resource } from "sst";
import { gatherGooglePlacesContent, formatGooglePlacesForPrompt } from "./google-places";
import { gatherRedditContent, formatRedditContentForPrompt } from "./reddit";
import { getTopicForWeek, generateArticleSlug, type ArticleTopic } from "./topics";

const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
});

interface ArticleOutput {
  title: string;
  content: string;
  excerpt: string;
}

/**
 * Retry a function with exponential backoff.
 */
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

/**
 * Attempt to repair broken JSON from LLM output where HTML content
 * contains unescaped double quotes (e.g., <a href="url">).
 */
export function repairArticleJson(raw: string): { title: string; content: string; excerpt: string } {
  // Strategy: extract the three fields by finding their key positions
  // and using the next key (or closing brace) as the delimiter
  const fields = ["title", "content", "excerpt"];
  const fieldPositions: { key: string; keyIdx: number; valueStart: number }[] = [];

  for (const field of fields) {
    const pattern = `"${field}"`;
    const keyIdx = raw.indexOf(pattern);
    if (keyIdx === -1) throw new Error(`Field "${field}" not found in JSON`);
    const colonIdx = raw.indexOf(":", keyIdx + pattern.length);
    // Find the opening quote of the value
    const valueStart = raw.indexOf('"', colonIdx + 1) + 1;
    fieldPositions.push({ key: field, keyIdx, valueStart });
  }

  // Sort by position in the string
  fieldPositions.sort((a, b) => a.keyIdx - b.keyIdx);

  const result: Record<string, string> = {};

  for (let i = 0; i < fieldPositions.length; i++) {
    const { key, valueStart } = fieldPositions[i];

    let valueEnd: number;
    if (i < fieldPositions.length - 1) {
      // Find the boundary: look backwards from the next field's key for the pattern: ","
      const nextKeyIdx = fieldPositions[i + 1].keyIdx;
      // The value ends at the last " before the comma-whitespace-"nextKey" pattern
      const beforeNext = raw.substring(0, nextKeyIdx);
      // Find the comma that separates this field from the next
      const commaIdx = beforeNext.lastIndexOf(",");
      // The closing quote of the value is just before the comma (possibly with whitespace)
      const segment = raw.substring(0, commaIdx);
      valueEnd = segment.lastIndexOf('"');
    } else {
      // Last field: find the closing } and work backwards
      const closingBrace = raw.lastIndexOf("}");
      const segment = raw.substring(0, closingBrace);
      valueEnd = segment.lastIndexOf('"');
    }

    result[key] = raw.substring(valueStart, valueEnd)
      // Re-escape any unescaped quotes for clean storage
      .replace(/\\"/g, '"') // normalize escaped quotes first
      .replace(/"/g, '\\"'); // then escape all

    // For storage, we actually want the unescaped version
    result[key] = raw.substring(valueStart, valueEnd).replace(/\\"/g, '"');
  }

  return {
    title: result.title || "",
    content: result.content || "",
    excerpt: result.excerpt || "",
  };
}

/**
 * Call OpenRouter to generate article content
 */
export async function callOpenRouter(prompt: string): Promise<string> {
  const apiKey = Resource.OPENROUTER_API_KEY.value;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.0-flash-001",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${text}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * Build the article generation prompt with real human content
 */
export function buildPrompt(
  topic: ArticleTopic,
  redditContent: string,
  googleContent: string,
): string {
  return `You are a witty, opinionated DC local writing for TouchGrass DC — a fun event and lifestyle platform for the Washington, DC area. You're writing a weekly article about: "${topic.title}"

${topic.promptContext}

Here is REAL content from DC residents and review sites. Use this as your primary source material — cite specific places, quotes, and opinions from these sources. DO NOT make up places that aren't mentioned here.

${redditContent}

${googleContent}

WRITING RULES:
- Write like a local who actually lives here, not a tourist guide
- Be opinionated — pick favorites, rank things, have a take
- Name 5-10 SPECIFIC places with neighborhoods (e.g., "Compass Coffee in Shaw")
- Include practical tips: prices, best times to go, parking, what to order
- Reference what real people said ("Redditors rave about...", "One reviewer called it...")
- Use a conversational, energetic tone — like texting a friend recommendations
- Include at least one hot take or controversial opinion
- DO NOT be bland or generic — if everything is "great" then nothing is

FORMAT: Return ONLY valid JSON (no markdown fences, no extra text) with this structure:
{
  "title": "A catchy, specific title (not generic — e.g., 'The 8 Coffee Shops DC Redditors Won't Shut Up About')",
  "content": "Full article as HTML using <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em> tags. Include multiple sections. End with a <h2>The Bottom Line</h2> summary section.",
  "excerpt": "A 1-2 sentence teaser that makes people want to click (under 200 chars)"
}

CRITICAL JSON RULES:
- All double quotes inside the "content" HTML MUST be escaped as \\"
- Or better: use SINGLE QUOTES for all HTML attributes (e.g., <a href='url'> not <a href="url">)
- Do NOT use unescaped double quotes anywhere inside string values
- The output must be parseable by JSON.parse()`;
}

/**
 * Check if an article already exists for this slug
 */
async function articleExists(slug: string): Promise<boolean> {
  const pk = `ARTICLE#${slug}`;
  const result = await dynamoClient.send(
    new GetItemCommand({
      TableName: Resource.Db.name,
      Key: marshall({ pk, sk: "ARTICLE_INFO" }),
    })
  );
  return !!result.Item;
}

/**
 * Save article to DynamoDB
 */
async function saveArticle(
  slug: string,
  topic: ArticleTopic,
  article: ArticleOutput,
  sources: { title: string; url: string }[],
  places: { name: string; rating: number; address: string; website?: string }[],
  imageUrl: string,
): Promise<void> {
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
    sources: sources,
    places: places,
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

  console.log(`Saved article: ${slug} — "${article.title}"`);
}

/**
 * Main Lambda handler — generates a weekly article
 */
export const handler: Handler = async () => {
  const now = new Date();
  const topic = getTopicForWeek(now);
  const slug = generateArticleSlug(topic.slug, now);

  console.log(`Article generation starting for week topic: "${topic.title}" (slug: ${slug})`);

  // Idempotency check
  if (await articleExists(slug)) {
    console.log(`Article already exists for ${slug}, skipping`);
    return { statusCode: 200, body: JSON.stringify({ skipped: true, slug }) };
  }

  // 1. Fetch Reddit content
  console.log(`Fetching Reddit content for queries: ${topic.redditQueries.join(", ")}`);
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

  let aiResponse: string;
  try {
    aiResponse = await callWithRetry(() => callOpenRouter(prompt));
  } catch (error) {
    console.error(JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
      context: { topic: topic.slug, slug, step: "openrouter" },
      timestamp: new Date().toISOString(),
    }));
    throw error;
  }

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
  await saveArticle(slug, topic, article, redditContent.sourceLinks, googlePlaces, imageUrl);

  console.log(`Article generation complete: "${article.title}"`);

  return {
    statusCode: 200,
    body: JSON.stringify({
      slug,
      title: article.title,
      topic: topic.slug,
      redditPosts: redditContent.posts.length,
      googlePlaces: googlePlaces.length,
    }),
  };
};

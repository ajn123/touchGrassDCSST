"use server";
import {
  DynamoDBClient,
  GetItemCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { Resource } from "sst";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});

// In-memory cache to avoid full table scans on every request
let guidesCache: { data: Guide[]; expiresAt: number } | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export interface Guide {
  pk: string;
  sk: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  category: string;
  sources: { title: string; url: string }[];
  places: { name: string; rating: number; address: string; website?: string }[];
  image_url?: string;
  isPublic: string;
  publishedAt: number;
  createdAt: number;
  updatedAt?: number;
}

/**
 * Get all published guides, sorted by publishedAt descending
 */
export async function getGuides(): Promise<Guide[]> {
  // Return cached data if available and not expired
  if (guidesCache && Date.now() < guidesCache.expiresAt) {
    return guidesCache.data;
  }

  const items: any[] = [];
  let lastKey: any = undefined;

  do {
    const result = await client.send(
      new ScanCommand({
        TableName: Resource.Db.name,
        FilterExpression:
          "begins_with(pk, :prefix) AND sk = :sk AND isPublic = :pub",
        ExpressionAttributeValues: {
          ":prefix": { S: "GUIDE#" },
          ":sk": { S: "GUIDE_INFO" },
          ":pub": { S: "true" },
        },
        ExclusiveStartKey: lastKey,
      })
    );

    items.push(...(result.Items || []).map((item) => unmarshall(item)));
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  items.sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0));

  const guides = items as Guide[];
  guidesCache = { data: guides, expiresAt: Date.now() + CACHE_TTL_MS };
  return guides;
}

/**
 * Get a single guide by its slug
 */
export async function getGuide(slug: string): Promise<Guide | null> {
  const result = await client.send(
    new GetItemCommand({
      TableName: Resource.Db.name,
      Key: {
        pk: { S: `GUIDE#${slug}` },
        sk: { S: "GUIDE_INFO" },
      },
    })
  );

  if (!result.Item) return null;
  return unmarshall(result.Item) as Guide;
}

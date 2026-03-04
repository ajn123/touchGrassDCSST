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

export interface Article {
  pk: string;
  sk: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  category: string;
  topicSlug: string;
  sources: { title: string; url: string }[];
  places: { name: string; rating: number; address: string; website?: string }[];
  image_url?: string;
  isPublic: string;
  publishedAt: number;
  createdAt: number;
  updatedAt?: number;
}

/**
 * Get all published articles, sorted by publishedAt descending
 */
export async function getArticles(): Promise<Article[]> {
  const items: any[] = [];
  let lastKey: any = undefined;

  do {
    const result = await client.send(
      new ScanCommand({
        TableName: Resource.Db.name,
        FilterExpression:
          "begins_with(pk, :prefix) AND sk = :sk AND isPublic = :pub",
        ExpressionAttributeValues: {
          ":prefix": { S: "ARTICLE#" },
          ":sk": { S: "ARTICLE_INFO" },
          ":pub": { S: "true" },
        },
        ExclusiveStartKey: lastKey,
      })
    );

    items.push(...(result.Items || []).map((item) => unmarshall(item)));
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  // Sort by publishedAt descending (newest first)
  items.sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0));

  return items as Article[];
}

/**
 * Get a single article by its slug
 */
export async function getArticle(slug: string): Promise<Article | null> {
  const result = await client.send(
    new GetItemCommand({
      TableName: Resource.Db.name,
      Key: {
        pk: { S: `ARTICLE#${slug}` },
        sk: { S: "ARTICLE_INFO" },
      },
    })
  );

  if (!result.Item) return null;
  return unmarshall(result.Item) as Article;
}

/**
 * Get articles filtered by category
 */
export async function getArticlesByCategory(category: string): Promise<Article[]> {
  const articles = await getArticles();
  return articles.filter(
    (a) => a.category?.toLowerCase() === category.toLowerCase()
  );
}

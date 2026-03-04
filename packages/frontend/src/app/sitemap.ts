"use server";
import { getArticles } from "@/lib/dynamodb/dynamodb-articles";
import { getPublicGroups } from "@/lib/dynamodb/dynamodb-groups";
import { TouchGrassDynamoDB } from "@/lib/dynamodb/TouchGrassDynamoDB";
import type { MetadataRoute } from "next";
import { Resource } from "sst";

const SITE_URL = "https://touchgrassdc.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/articles`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/groups`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/comedy`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/calendar`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/find-my-group`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/about`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  // Dynamic article pages
  let articlePages: MetadataRoute.Sitemap = [];
  try {
    const articles = await getArticles();
    articlePages = articles.map((article) => ({
      url: `${SITE_URL}/articles/${encodeURIComponent(article.slug)}`,
      lastModified: new Date(article.updatedAt || article.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    }));
  } catch (e) {
    console.error("Sitemap: failed to fetch articles", e);
  }

  // Dynamic group pages
  let groupPages: MetadataRoute.Sitemap = [];
  try {
    const groups = await getPublicGroups();
    groupPages = groups.map((group) => ({
      url: `${SITE_URL}/groups/${encodeURIComponent(group.title)}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  } catch (e) {
    console.error("Sitemap: failed to fetch groups", e);
  }

  // Dynamic event pages
  let eventPages: MetadataRoute.Sitemap = [];
  try {
    const db = new TouchGrassDynamoDB(Resource.Db.name);
    const events = await db.getCurrentAndFutureEvents();
    eventPages = events.map((event) => ({
      url: `${SITE_URL}/events/${encodeURIComponent(event.pk)}`,
      lastModified: new Date(event.createdAt || Date.now()),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch (e) {
    console.error("Sitemap: failed to fetch events", e);
  }

  return [...staticPages, ...articlePages, ...groupPages, ...eventPages];
}

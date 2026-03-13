"use server";
import { getArticles } from "@/lib/dynamodb/dynamodb-articles";
import { getGuides } from "@/lib/dynamodb/dynamodb-guides";
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
      url: `${SITE_URL}/concerts`,
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
      url: `${SITE_URL}/guides`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/find-my-group`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/near-me`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/volunteer`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/venues`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/add-event`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/signup-emails`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/about`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  // Fetch all dynamic data in parallel
  const db = new TouchGrassDynamoDB(Resource.Db.name);
  const [articles, guides, groups, events] = await Promise.all([
    getArticles().catch((e) => { console.error("Sitemap: failed to fetch articles", e); return []; }),
    getGuides().catch((e) => { console.error("Sitemap: failed to fetch guides", e); return []; }),
    getPublicGroups().catch((e) => { console.error("Sitemap: failed to fetch groups", e); return []; }),
    db.getCurrentAndFutureEvents().catch((e) => { console.error("Sitemap: failed to fetch events", e); return [] as any[]; }),
  ]);

  const articlePages: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${SITE_URL}/articles/${encodeURIComponent(article.slug)}`,
    lastModified: new Date(article.updatedAt || article.publishedAt),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const guidePages: MetadataRoute.Sitemap = guides.map((guide) => ({
    url: `${SITE_URL}/guides/${encodeURIComponent(guide.slug)}`,
    lastModified: new Date(guide.updatedAt || guide.publishedAt),
    changeFrequency: "monthly" as const,
    priority: 0.85,
  }));

  const groupPages: MetadataRoute.Sitemap = groups.map((group) => ({
    url: `${SITE_URL}/groups/${encodeURIComponent(group.title)}`,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const eventPages: MetadataRoute.Sitemap = events.map((event: any) => ({
    url: `${SITE_URL}/events/${encodeURIComponent(event.pk)}`,
    lastModified: new Date(event.createdAt || Date.now()),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const venueSet = new Set<string>();
  for (const event of events) {
    if (event.venue && !event.venue.toLowerCase().includes("unknown")) {
      venueSet.add(event.venue);
    }
  }
  const venuePages: MetadataRoute.Sitemap = Array.from(venueSet).map((venue) => ({
    url: `${SITE_URL}/venues/${encodeURIComponent(venue)}`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...guidePages, ...articlePages, ...groupPages, ...eventPages, ...venuePages];
}

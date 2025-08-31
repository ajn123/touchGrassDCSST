"use server";

import { Client } from "@opensearch-project/opensearch";
import { Resource } from "sst";

// Server-side OpenSearch client
const openSearchClient = new Client({
  node: Resource.MySearch.url,
  auth: {
    username: Resource.MySearch.username,
    password: Resource.MySearch.password,
  },
});

const INDEX_NAME = "events-groups-index";

// Types for search functionality
export interface SearchFilters {
  type?: "event" | "group";
  categories?: string[];
  isPublic?: boolean;
  location?: string;
  dateRange?: {
    start?: string;
    end?: string;
  };
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  id: string;
  type: "event" | "group";
  title: string;
  description?: string;
  category: string[];
  location?: string;
  venue?: string;
  date?: string;
  start_date?: string;
  end_date?: string;
  cost?: {
    type: string;
    amount: number | string;
    currency: string;
  };
  image_url?: string;
  socials?: any;
  isPublic: boolean;
  createdAt: number;
  // Group-specific fields
  scheduleDay?: string;
  scheduleTime?: string;
  scheduleLocation?: string;
  schedules?: any[];
  // Search relevance score
  _score?: number;
}

export interface SearchResponse {
  hits: SearchResult[];
  total: number;
  aggregations?: {
    categories?: Array<{
      key: string;
      doc_count: number;
    }>;
  };
}

export interface CategoryAggregation {
  key: string;
  doc_count: number;
}

/**
 * Search for events and groups with optional filters
 */
export async function searchOpenSearch(
  query: string,
  filters: SearchFilters = {}
): Promise<SearchResponse> {
  try {
    const searchBody: any = {
      query: {
        bool: {
          must: [],
          filter: [],
        },
      },
      size: filters.limit || 20,
      from: filters.offset || 0,
      _source: {
        excludes: ["socials", "schedules"], // Exclude large objects from response
      },
    };

    // Add text search if query is provided
    if (query && query.trim()) {
      const trimmedQuery = query.trim();

      // For short queries (3 characters or less), use prefix matching
      if (trimmedQuery.length <= 3) {
        searchBody.query.bool.must.push({
          bool: {
            should: [
              // Prefix matching for short queries
              {
                multi_match: {
                  query: trimmedQuery,
                  fields: ["title^3", "description^2", "category.text^2"],
                  type: "phrase_prefix",
                },
              },
              // Also try fuzzy matching with lower fuzziness for short queries
              {
                multi_match: {
                  query: trimmedQuery,
                  fields: ["title^3", "description^2", "category.text^2"],
                  type: "best_fields",
                  fuzziness: 1, // Lower fuzziness for short queries
                },
              },
            ],
            minimum_should_match: 1,
          },
        });
      } else {
        // For longer queries, use fuzzy matching
        searchBody.query.bool.must.push({
          multi_match: {
            query: trimmedQuery,
            fields: [
              "title^3",
              "description^2",
              "category.text^2",
              "location^1.5",
              "venue^1.5",
            ],
            type: "best_fields",
            fuzziness: "AUTO",
          },
        });
      }
    } else {
      // If no query, match all documents
      searchBody.query.bool.must.push({ match_all: {} });
    }

    // Add filters
    if (filters.type) {
      searchBody.query.bool.filter.push({
        term: { type: filters.type },
      });
    }

    if (filters.categories && filters.categories.length > 0) {
      searchBody.query.bool.filter.push({
        terms: { "category.keyword": filters.categories },
      });
    }

    if (filters.isPublic !== undefined) {
      searchBody.query.bool.filter.push({
        term: { isPublic: filters.isPublic },
      });
    }

    if (filters.location) {
      searchBody.query.bool.filter.push({
        multi_match: {
          query: filters.location,
          fields: ["location", "venue", "scheduleLocation"],
          type: "phrase_prefix",
        },
      });
    }

    // Date range filter
    if (filters.dateRange) {
      const dateFilter: any = {
        range: {},
      };

      if (filters.dateRange.start) {
        dateFilter.range.start_date = { gte: filters.dateRange.start };
      }

      if (filters.dateRange.end) {
        dateFilter.range.end_date = { lte: filters.dateRange.end };
      }

      if (Object.keys(dateFilter.range).length > 0) {
        searchBody.query.bool.filter.push(dateFilter);
      }
    }

    // Add aggregations for categories
    searchBody.aggs = {
      categories: {
        terms: {
          field: "category.keyword",
          size: 50,
        },
      },
    };

    const response = await openSearchClient.search({
      index: INDEX_NAME,
      body: searchBody,
    });

    const hits = response.body.hits.hits.map((hit: any) => ({
      ...hit._source,
      _score: hit._score,
    }));

    const aggregations = response.body.aggregations
      ? {
          categories: response.body.aggregations.categories.buckets,
        }
      : undefined;

    return {
      hits,
      total: response.body.hits.total.value,
      aggregations,
    };
  } catch (error) {
    console.error("OpenSearch search failed:", error);
    throw new Error(
      `Search failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Get all unique categories with document counts
 */
export async function getOpenSearchCategories(): Promise<
  CategoryAggregation[]
> {
  try {
    const response = await openSearchClient.search({
      index: INDEX_NAME,
      body: {
        size: 0,
        aggs: {
          categories: {
            terms: {
              field: "category.keyword",
              size: 100,
            },
          },
        },
      },
    });

    return response.body.aggregations?.categories?.buckets || [];
  } catch (error) {
    console.error("Failed to get categories:", error);
    throw new Error(
      `Failed to get categories: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Search for events only
 */
export async function searchOpenSearchEvents(
  query: string,
  filters: Omit<SearchFilters, "type"> = {}
): Promise<SearchResponse> {
  return searchOpenSearch(query, { ...filters, type: "event" });
}

/**
 * Search for groups only
 */
export async function searchOpenSearchGroups(
  query: string,
  filters: Omit<SearchFilters, "type"> = {}
): Promise<SearchResponse> {
  return searchOpenSearch(query, { ...filters, type: "group" });
}

/**
 * Get popular categories (most documents)
 */
export async function getPopularOpenSearchCategories(
  limit: number = 10
): Promise<CategoryAggregation[]> {
  const categories = await getOpenSearchCategories();
  return categories.sort((a, b) => b.doc_count - a.doc_count).slice(0, limit);
}

/**
 * Search with autocomplete suggestions
 */
export async function autocompleteOpenSearch(
  query: string,
  limit: number = 5
): Promise<SearchResult[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const response = await openSearchClient.search({
      index: INDEX_NAME,
      body: {
        query: {
          bool: {
            should: [
              // Prefix matching for better short query support
              {
                multi_match: {
                  query: query.trim(),
                  fields: ["title^3", "description^1.5", "category.text^2"],
                  type: "phrase_prefix",
                },
              },
              // Fuzzy matching for typos
              {
                multi_match: {
                  query: query.trim(),
                  fields: ["title^3", "description^1.5", "category.text^2"],
                  type: "best_fields",
                  fuzziness: query.trim().length <= 3 ? 1 : "AUTO",
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
        size: limit,
        _source: ["id", "title", "type", "category", "location"],
      },
    });

    return response.body.hits.hits.map((hit: any) => ({
      ...hit._source,
      _score: hit._score,
    }));
  } catch (error) {
    console.error("Autocomplete search failed:", error);
    return [];
  }
}

/**
 * Get recent events and groups
 */
export async function getRecentOpenSearchItems(
  limit: number = 10
): Promise<SearchResult[]> {
  try {
    const response = await openSearchClient.search({
      index: INDEX_NAME,
      body: {
        query: {
          bool: {
            must: [{ match_all: {} }],
            filter: [{ term: { isPublic: true } }],
          },
        },
        sort: [{ createdAt: { order: "desc" } }],
        size: limit,
      },
    });

    return response.body.hits.hits.map((hit: any) => ({
      ...hit._source,
      _score: hit._score,
    }));
  } catch (error) {
    console.error("Failed to get recent items:", error);
    throw new Error(
      `Failed to get recent items: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Get index statistics
 */
export async function getOpenSearchStats(): Promise<{
  totalDocuments: number;
  indexSize: string;
  lastUpdated: string;
}> {
  try {
    const [statsResponse, healthResponse] = await Promise.all([
      openSearchClient.indices.stats({ index: INDEX_NAME }),
      openSearchClient.cluster.health({ index: INDEX_NAME }),
    ]);

    const stats = statsResponse.body.indices[INDEX_NAME];
    const totalDocs = stats?.total?.docs?.count || 0;
    const sizeInBytes = stats?.total?.store?.size_in_bytes || 0;
    const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);

    return {
      totalDocuments: totalDocs,
      indexSize: `${sizeInMB} MB`,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Failed to get index stats:", error);
    throw new Error(
      `Failed to get stats: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Check if the search index is healthy
 */
export async function isOpenSearchHealthy(): Promise<boolean> {
  try {
    const response = await openSearchClient.cluster.health({
      index: INDEX_NAME,
    });
    return (
      response.body.status === "green" || response.body.status === "yellow"
    );
  } catch (error) {
    console.error("Health check failed:", error);
    return false;
  }
}

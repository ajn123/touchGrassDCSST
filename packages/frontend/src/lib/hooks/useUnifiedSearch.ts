import { useCallback, useEffect, useState } from "react";

export interface SearchFilters {
  query?: string;
  categories?: string[];
  costRange?: { min?: number; max?: number; type?: string };
  location?: string[];
  dateRange?: { start?: string; end?: string };
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  limit?: number;
  isPublic?: boolean;
  fields?: string[];
  types?: ("event" | "group")[];
}

export interface SearchResult {
  events: any[];
  groups: any[];
  total: number;
}

export interface SearchMetadata {
  executionTime: number;
  searchMethod: string;
  filters: SearchFilters;
}

export interface UseUnifiedSearchReturn {
  results: SearchResult;
  metadata: SearchMetadata | null;
  isLoading: boolean;
  error: string | null;
  search: (filters: SearchFilters) => Promise<void>;
  clearResults: () => void;
  hasResults: boolean;
}

export function useUnifiedSearch(): UseUnifiedSearchReturn {
  const [results, setResults] = useState<SearchResult>({
    events: [],
    groups: [],
    total: 0,
  });
  const [metadata, setMetadata] = useState<SearchMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (filters: SearchFilters) => {
    setIsLoading(true);
    setError(null);

    try {
      // Build query string from filters
      const searchParams = new URLSearchParams();

      if (filters.query) searchParams.set("q", filters.query);
      if (filters.categories?.length)
        searchParams.set("categories", filters.categories.join(","));
      if (filters.costRange?.min !== undefined)
        searchParams.set("costMin", filters.costRange.min.toString());
      if (filters.costRange?.max !== undefined)
        searchParams.set("costMax", filters.costRange.max.toString());
      if (filters.costRange?.type)
        searchParams.set("costType", filters.costRange.type);
      if (filters.location?.length)
        searchParams.set("location", filters.location.join(","));
      if (filters.dateRange?.start)
        searchParams.set("dateStart", filters.dateRange.start);
      if (filters.dateRange?.end)
        searchParams.set("dateStart", filters.dateRange.end);
      if (filters.sortBy) searchParams.set("sortBy", filters.sortBy);
      if (filters.sortOrder) searchParams.set("sortOrder", filters.sortOrder);
      if (filters.limit) searchParams.set("limit", filters.limit.toString());
      if (filters.isPublic !== undefined)
        searchParams.set("isPublic", filters.isPublic.toString());
      if (filters.fields?.length)
        searchParams.set("fields", filters.fields.join(","));
      if (filters.types?.length)
        searchParams.set("types", filters.types.join(","));

      const response = await fetch(
        `/api/search-opensearch?${searchParams.toString()}`
      );

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();

      // OpenSearch API returns data directly, not wrapped in success/data structure
      setResults(data);
      setMetadata({
        executionTime: data.executionTime || 0,
        searchMethod: data.searchMethod || "opensearch",
        filters,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Search failed";
      setError(errorMessage);
      console.error("Search error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults({ events: [], groups: [], total: 0 });
    setMetadata(null);
    setError(null);
  }, []);

  const hasResults = results.total > 0;

  return {
    results,
    metadata,
    isLoading,
    error,
    search,
    clearResults,
    hasResults,
  };
}

// Hook for automatic search on filter changes
export function useUnifiedSearchWithAutoSearch(
  initialFilters: SearchFilters,
  autoSearch: boolean = true
): UseUnifiedSearchReturn & {
  filters: SearchFilters;
  updateFilters: (newFilters: Partial<SearchFilters>) => void;
} {
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const searchHook = useUnifiedSearch();

  const updateFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  // Auto-search when filters change
  useEffect(() => {
    if (
      autoSearch &&
      Object.keys(filters).some(
        (key) => filters[key as keyof SearchFilters] !== undefined
      )
    ) {
      searchHook.search(filters);
    }
  }, [filters, autoSearch, searchHook.search]);

  return {
    ...searchHook,
    filters,
    updateFilters,
  };
}

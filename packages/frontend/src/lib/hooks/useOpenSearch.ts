import { useCallback, useEffect, useRef, useState } from "react";
import {
  CategoryAggregation,
  openSearchClient,
  SearchFilters,
  SearchResponse,
  SearchResult,
} from "../opensearch";

// Hook for general search functionality
export function useOpenSearch() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(
    async (
      query: string,
      filters: SearchFilters = {}
    ): Promise<SearchResponse | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const results = await openSearchClient.search(query, filters);
        return results;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Search failed";
        setError(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    search,
    isLoading,
    error,
    clearError: () => setError(null),
  };
}

// Hook for search with state management
export function useSearchState(
  initialQuery: string = "",
  initialFilters: SearchFilters = {}
) {
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const search = useCallback(async () => {
    if (!query.trim() && Object.keys(filters).length === 0) {
      setResults(null);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const searchResults = await openSearchClient.search(query, filters);
      setResults(searchResults);
      setHasSearched(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Search failed";
      setError(errorMessage);
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  }, [query, filters]);

  const updateQuery = useCallback((newQuery: string) => {
    setQuery(newQuery);
  }, []);

  const updateFilters = useCallback((newFilters: SearchFilters) => {
    setFilters(newFilters);
  }, []);

  const clearSearch = useCallback(() => {
    setQuery("");
    setFilters({});
    setResults(null);
    setError(null);
    setHasSearched(false);
  }, []);

  return {
    query,
    filters,
    results,
    isLoading,
    error,
    hasSearched,
    search,
    updateQuery,
    updateFilters,
    clearSearch,
    clearError: () => setError(null),
  };
}

// Hook for autocomplete functionality
export function useAutocomplete() {
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  const getSuggestions = useCallback(
    async (query: string, limit: number = 5) => {
      // Clear previous debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      if (!query || query.trim().length < 2) {
        setSuggestions([]);
        return;
      }

      // Debounce the search
      debounceRef.current = setTimeout(async () => {
        setIsLoading(true);
        setError(null);

        try {
          const results = await openSearchClient.autocomplete(
            query.trim(),
            limit
          );
          setSuggestions(results);
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "Autocomplete failed";
          setError(errorMessage);
          setSuggestions([]);
        } finally {
          setIsLoading(false);
        }
      }, 300); // 300ms debounce
    },
    []
  );

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    suggestions,
    isLoading,
    error,
    getSuggestions,
    clearSuggestions,
    clearError: () => setError(null),
  };
}

// Hook for categories
export function useCategories() {
  const [categories, setCategories] = useState<CategoryAggregation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const results = await openSearchClient.getCategories();
      setCategories(results);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load categories";
      setError(errorMessage);
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadPopularCategories = useCallback(async (limit: number = 10) => {
    setIsLoading(true);
    setError(null);

    try {
      const results = await openSearchClient.getPopularCategories(limit);
      setCategories(results);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to load popular categories";
      setError(errorMessage);
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  return {
    categories,
    isLoading,
    error,
    loadCategories,
    loadPopularCategories,
    clearError: () => setError(null),
  };
}

// Hook for recent items
export function useRecentItems(limit: number = 10) {
  const [items, setItems] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRecent = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const results = await openSearchClient.getRecent(limit);
      setItems(results);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load recent items";
      setError(errorMessage);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  // Load recent items on mount
  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  return {
    items,
    isLoading,
    error,
    loadRecent,
    clearError: () => setError(null),
  };
}

// Hook for search health monitoring
export function useSearchHealth() {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkHealth = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const healthy = await openSearchClient.isHealthy();
      setIsHealthy(healthy);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Health check failed";
      setError(errorMessage);
      setIsHealthy(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check health on mount
  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  return {
    isHealthy,
    isLoading,
    error,
    checkHealth,
    clearError: () => setError(null),
  };
}

// Hook for search statistics
export function useSearchStats() {
  const [stats, setStats] = useState<{
    totalDocuments: number;
    indexSize: string;
    lastUpdated: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const results = await openSearchClient.getStats();
      setStats(results);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load stats";
      setError(errorMessage);
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load stats on mount
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    stats,
    isLoading,
    error,
    loadStats,
    clearError: () => setError(null),
  };
}

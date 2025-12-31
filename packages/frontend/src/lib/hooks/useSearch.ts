"use client";

import { Event } from "@/lib/dynamodb/TouchGrassDynamoDB";
import { filterEvents, FilterOptions } from "@/lib/filter-events";
import { useCallback, useEffect, useRef, useState } from "react";

export interface SearchResult {
  hits: Array<Event & { type: "event" | "group" }>;
  total: number;
}

export interface UseSearchStateReturn {
  query: string;
  results: SearchResult | null;
  isLoading: boolean;
  error: string | null;
  hasSearched: boolean;
  search: () => void;
  updateQuery: (query: string) => void;
  clearSearch: () => void;
  clearError: () => void;
}

export function useSearchState(
  initialQuery: string = ""
): UseSearchStateReturn {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch all events once on mount
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch("/api/events/all");
        if (!response.ok) {
          throw new Error("Failed to fetch events");
        }
        const data = await response.json();
        setAllEvents(data.events || []);
      } catch (err) {
        console.error("Error fetching events:", err);
        setError("Failed to load events");
      }
    };

    fetchEvents();
  }, []);

  // Perform search with debouncing
  const performSearch = useCallback(() => {
    if (!query.trim() || allEvents.length === 0) {
      setResults(null);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const filterOptions: FilterOptions = {
        query: query.trim(),
        limit: 10, // Limit results for search bar
      };

      const filtered = filterEvents(allEvents, filterOptions);

      // Convert to SearchResult format
      const searchResults: SearchResult = {
        hits: filtered.map((event) => ({
          ...event,
          type: "event" as const,
        })),
        total: filtered.length,
      };

      setResults(searchResults);
      setHasSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  }, [query, allEvents]);

  // Debounced search
  const search = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      performSearch();
    }, 300); // 300ms debounce
  }, [performSearch]);

  const updateQuery = useCallback(
    (newQuery: string) => {
      setQuery(newQuery);
      if (error) setError(null);
    },
    [error]
  );

  const clearSearch = useCallback(() => {
    setQuery("");
    setResults(null);
    setHasSearched(false);
    setError(null);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    query,
    results,
    isLoading,
    error,
    hasSearched,
    search,
    updateQuery,
    clearSearch,
    clearError,
  };
}

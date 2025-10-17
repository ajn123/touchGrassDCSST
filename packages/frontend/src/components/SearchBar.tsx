"use client";

import { useSearchState } from "@/lib/hooks/useOpenSearch";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

export default function SearchBar() {
  const [showResults, setShowResults] = useState(false);
  const router = useRouter();

  const {
    query,
    results,
    isLoading,
    error,
    hasSearched,
    search,
    updateQuery,
    clearSearch,
    clearError,
  } = useSearchState();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      // Use OpenSearch to get results (searches both events and groups)
      search();
      setShowResults(true);
    }
  };

  const handleResultClick = (item: any, type: "event" | "group") => {
    setShowResults(false);
    clearSearch();

    // Clean the ID by removing any prefixes
    const cleanId = (id: string) => {
      if (!id) return "unknown";
      return id.replace(/^(EVENT#|GROUP#)/, "");
    };

    // Navigate to the appropriate page based on type
    if (type === "event") {
      const eventId = cleanId(item.pk || item.id);
      router.push(`/events/${eventId}`);
    } else if (type === "group") {
      const groupId = cleanId(item.pk || item.id);
      router.push(`/groups/${groupId}`);
    }
  };

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      updateQuery(value);

      // Clear any previous errors
      if (error) clearError();

      // Auto-search as user types (with debouncing handled by the hook)
      if (value.trim().length >= 2) {
        // Trigger main search to show results
        search();
        setShowResults(true);
      } else {
        setShowResults(false);
      }
    },
    [updateQuery, error, clearError, search]
  );

  const handleInputFocus = () => {
    if (query.trim().length >= 2 && hasSearched) {
      setShowResults(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding results to allow clicking on them
    setTimeout(() => {
      setShowResults(false);
    }, 200);
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <form onSubmit={handleSearchSubmit} className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder="Search events and groups..."
          className="w-full px-6 py-4 rounded-full text-black text-lg bg-white/95 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-lg border border-white/20"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full transition-colors"
        >
          {isLoading ? "..." : "Search"}
        </button>
      </form>

      {/* Error Display */}
      {error && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-red-50 border border-red-200 rounded-lg p-3 z-50">
          <div className="flex items-center">
            <span className="text-red-600 text-sm">⚠️ {error}</span>
            <button
              onClick={() => {
                if (error) clearError();
              }}
              className="ml-2 text-red-600 hover:text-red-800"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Search Results Dropdown */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 max-h-96 overflow-y-auto z-50">
          {/* Search Results */}
          {results && results.hits.length > 0 && (
            <>
              {/* Events Results */}
              {results.hits.filter((item) => item.type === "event").length >
                0 && (
                <div className="p-3">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 px-2">
                    Events (
                    {
                      results.hits.filter((item) => item.type === "event")
                        .length
                    }
                    )
                  </h4>
                  {results.hits
                    .filter((item) => item.type === "event")
                    .slice(0, 5)
                    .map((event, index) => (
                      <div
                        key={`event-${index}`}
                        onClick={() => handleResultClick(event, "event")}
                        className="flex items-center p-2 theme-hover-light rounded-md cursor-pointer transition-colors"
                      >
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-blue-600 text-sm">📅</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {event.title}
                          </p>
                          {event.category && (
                            <p className="text-xs text-gray-500 truncate">
                              {Array.isArray(event.category)
                                ? event.category.join(", ")
                                : event.category}
                            </p>
                          )}
                          {event.location && (
                            <p className="text-xs text-gray-400 truncate">
                              📍 {event.location}
                            </p>
                          )}
                          {event.start_date && (
                            <p className="text-xs text-gray-400 truncate">
                              📅{" "}
                              {new Date(event.start_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* Groups Results */}
              {results.hits.filter((item) => item.type === "group").length >
                0 && (
                <div className="p-3 border-t border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 px-2">
                    Groups (
                    {
                      results.hits.filter((item) => item.type === "group")
                        .length
                    }
                    )
                  </h4>
                  {results.hits
                    .filter((item) => item.type === "group")
                    .slice(0, 5)
                    .map((group, index) => (
                      <div
                        key={`group-${index}`}
                        onClick={() => handleResultClick(group, "group")}
                        className="flex items-center p-2 theme-hover-light rounded-md cursor-pointer transition-colors"
                      >
                        <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-green-600 text-sm">👥</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {group.title}
                          </p>
                          {group.category && (
                            <p className="text-xs text-gray-500 truncate">
                              {Array.isArray(group.category)
                                ? group.category.join(", ")
                                : group.category}
                            </p>
                          )}
                          {group.description && (
                            <p className="text-xs text-gray-400 truncate">
                              {group.description}
                            </p>
                          )}
                          {group.location && (
                            <p className="text-xs text-gray-400 truncate">
                              📍 {group.location}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* Search Stats and View All Results */}
              <div className="p-3 border-t border-gray-100 space-y-2">
                <div className="text-xs text-gray-500 text-center">
                  Found {results.total} results
                </div>
                <button
                  onClick={() => {
                    setShowResults(false);
                    router.push(
                      `/search?q=${encodeURIComponent(
                        query
                      )}&types=event,group&sortBy=date&sortOrder=asc&searchMethod=opensearch`
                    );
                  }}
                  className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium py-2 hover:bg-blue-50 rounded-md transition-colors"
                >
                  View all results (OpenSearch)
                </button>
              </div>
            </>
          )}

          {/* No Results */}
          {results && results.hits.length === 0 && (
            <div className="p-4 text-center text-gray-500">
              <p>No results found for "{query}"</p>
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {isLoading && showResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Searching...</span>
          </div>
        </div>
      )}
    </div>
  );
}

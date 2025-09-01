"use client";

import { useUnifiedSearchWithAutoSearch } from "@/lib/hooks/useUnifiedSearch";
import { useState } from "react";

export function UnifiedSearch() {
  const [searchQuery, setSearchQuery] = useState("");

  const {
    results,
    metadata,
    isLoading,
    error,
    filters,
    updateFilters,
    hasResults,
  } = useUnifiedSearchWithAutoSearch({
    query: "",
    types: ["event", "group"], // Search both events and groups
    limit: 20,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      updateFilters({ query: searchQuery.trim() });
    }
  };

  const handleTypeFilter = (type: "event" | "group") => {
    const currentTypes = filters.types || ["event", "group"];
    if (currentTypes.includes(type)) {
      // Remove type if it's already selected
      updateFilters({ types: currentTypes.filter((t) => t !== type) });
    } else {
      // Add type if it's not selected
      updateFilters({ types: [...currentTypes, type] });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Search Events & Groups</h2>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for events, groups, activities..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isLoading ? "Searching..." : "Search"}
            </button>
          </div>
        </form>

        {/* Type Filters */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => handleTypeFilter("event")}
            className={`px-4 py-2 rounded-md ${
              filters.types?.includes("event")
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Events
          </button>
          <button
            onClick={() => handleTypeFilter("group")}
            className={`px-4 py-2 rounded-md ${
              filters.types?.includes("group")
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Groups
          </button>
        </div>

        {/* Search Metadata */}
        {metadata && (
          <div className="text-sm text-gray-600 mb-4">
            Found {results.total} results ({results.events.length} events,{" "}
            {results.groups.length} groups) in {metadata.executionTime}ms
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">Error: {error}</p>
        </div>
      )}

      {/* Results */}
      {hasResults && (
        <div className="space-y-6">
          {/* Events Results */}
          {results.events.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold mb-3">
                Events ({results.events.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.events.map((event, index) => (
                  <div
                    key={`event-${index}`}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <h4 className="font-medium text-lg mb-2">{event.title}</h4>
                    {event.category && (
                      <div className="mb-2">
                        <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {Array.isArray(event.category)
                            ? event.category.join(", ")
                            : event.category}
                        </span>
                      </div>
                    )}
                    {event.description && (
                      <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                        {event.description}
                      </p>
                    )}
                    {event.location && (
                      <p className="text-gray-500 text-xs">
                        📍 {event.location}
                      </p>
                    )}
                    {event.date && (
                      <p className="text-gray-500 text-xs">
                        📅 {new Date(event.date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Groups Results */}
          {results.groups.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold mb-3">
                Groups ({results.groups.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.groups.map((group, index) => (
                  <div
                    key={`group-${index}`}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <h4 className="font-medium text-lg mb-2">{group.title}</h4>
                    {group.category && (
                      <div className="mb-2">
                        <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                          {Array.isArray(group.category)
                            ? group.category.join(", ")
                            : group.category}
                        </span>
                      </div>
                    )}
                    {group.description && (
                      <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                        {group.description}
                      </p>
                    )}
                    {group.scheduleLocation && (
                      <p className="text-gray-500 text-xs">
                        📍 {group.scheduleLocation}
                      </p>
                    )}
                    {group.scheduleDay && group.scheduleTime && (
                      <p className="text-gray-500 text-xs">
                        🕒 {group.scheduleDay} {group.scheduleTime}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* No Results */}
      {!isLoading && !hasResults && searchQuery && (
        <div className="text-center py-8">
          <p className="text-gray-500">No results found for "{searchQuery}"</p>
          <p className="text-sm text-gray-400 mt-2">
            Try adjusting your search terms or filters
          </p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">Searching...</p>
        </div>
      )}
    </div>
  );
}

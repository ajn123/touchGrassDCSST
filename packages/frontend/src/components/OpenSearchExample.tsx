"use client";

import { useState } from "react";
import {
  useAutocomplete,
  useCategories,
  useSearchState,
} from "../lib/hooks/useOpenSearch";

export default function OpenSearchExample() {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchType, setSearchType] = useState<"all" | "event" | "group">(
    "all"
  );

  const {
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
  } = useSearchState();

  const { categories, isLoading: categoriesLoading } = useCategories();
  const { suggestions, getSuggestions, clearSuggestions } = useAutocomplete();

  const handleSearch = () => {
    const searchFilters = {
      ...filters,
      type: searchType === "all" ? undefined : searchType,
      categories: selectedCategory ? [selectedCategory] : undefined,
    };
    updateFilters(searchFilters);
    search();
  };

  const handleQueryChange = (newQuery: string) => {
    updateQuery(newQuery);
    getSuggestions(newQuery);
  };

  const handleSuggestionClick = (suggestion: any) => {
    updateQuery(suggestion.title);
    clearSuggestions();
    handleSearch();
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">OpenSearch Demo</h1>

      {/* Search Form */}
      <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onFocus={() => query.length >= 2 && getSuggestions(query)}
            onBlur={() => setTimeout(clearSuggestions, 200)}
            placeholder="Search events and groups..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          {/* Autocomplete Suggestions */}
          {suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <div className="font-medium">{suggestion.title}</div>
                  <div className="text-sm text-gray-600">
                    {suggestion.type} • {suggestion.category?.join(", ")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <select
            value={searchType}
            onChange={(e) =>
              setSearchType(e.target.value as "all" | "event" | "group")
            }
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All</option>
            <option value="event">Events</option>
            <option value="group">Groups</option>
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            disabled={categoriesLoading}
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.key} value={category.key}>
                {category.key} ({category.doc_count})
              </option>
            ))}
          </select>

          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Searching..." : "Search"}
          </button>

          <button
            onClick={clearSearch}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Search Results */}
      {hasSearched && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">
            Search Results {results && `(${results.total} found)`}
          </h2>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Searching...</p>
            </div>
          ) : results && results.hits.length > 0 ? (
            <div className="space-y-4">
              {results.hits.map((item, index) => (
                <div
                  key={item.id || index}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {item.title}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {item.type} • {item.category?.join(", ")}
                      </p>
                      {item.description && (
                        <p className="text-gray-700 mt-2 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      <div className="flex gap-4 mt-2 text-sm text-gray-500">
                        {item.location && <span>📍 {item.location}</span>}
                        {item.venue && <span>🏢 {item.venue}</span>}
                        {item.start_date && (
                          <span>
                            📅 {new Date(item.start_date).toLocaleDateString()}
                          </span>
                        )}
                        {item.cost && (
                          <span>
                            💰{" "}
                            {item.cost.type === "free"
                              ? "Free"
                              : `${item.cost.amount} ${item.cost.currency}`}
                          </span>
                        )}
                      </div>
                    </div>
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-20 h-20 object-cover rounded-lg ml-4"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-600">
              <p>
                No results found. Try adjusting your search terms or filters.
              </p>
            </div>
          )}

          {/* Category Aggregations */}
          {results?.aggregations?.categories &&
            results.aggregations.categories.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold mb-3">
                  Categories in Results
                </h3>
                <div className="flex flex-wrap gap-2">
                  {results.aggregations.categories.map((category) => (
                    <span
                      key={category.key}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {category.key} ({category.doc_count})
                    </span>
                  ))}
                </div>
              </div>
            )}
        </div>
      )}

      {/* Search Stats */}
      {results && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">
            Found {results.total} results in {isLoading ? "..." : "~"}ms
          </p>
        </div>
      )}
    </div>
  );
}

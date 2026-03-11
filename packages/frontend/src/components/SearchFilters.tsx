"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface SearchFilters {
  query: string;
  categories: string[];
  costRange: { min?: number; max?: number; type?: string };
  location: string[];
  dateRange: { start?: string; end?: string };
  sortBy: string;
  sortOrder: "asc" | "desc";
  includePastEvents?: boolean;
}

interface SearchFiltersProps {
  onFiltersChange: (filters: SearchFilters) => void;
  categories: string[];
  initialFilters?: Partial<SearchFilters>;
}

const LOCATION_OPTIONS = ["DC", "Maryland", "Virginia"];
const COST_TYPES = ["free", "paid", "donation"];
const SORT_OPTIONS = [
  { value: "date", label: "Date" },
  { value: "title", label: "Title" },
  { value: "cost", label: "Cost" },
  { value: "location", label: "Location" },
];

export default function SearchFilters({
  onFiltersChange,
  categories,
  initialFilters,
}: SearchFiltersProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    query: "",
    categories: [],
    costRange: {},
    location: [],
    dateRange: {},
    sortBy: "date",
    sortOrder: "asc",
    includePastEvents: false, // Default to false - only show present/future events
    ...initialFilters,
  });
  const isSearchingRef = useRef(false);

  const router = useRouter();

  // Update filters when initialFilters change (e.g., from URL params)
  useEffect(() => {
    if (initialFilters) {
      setFilters((prev) => ({
        ...prev,
        ...initialFilters,
      }));
    }
  }, [initialFilters]);

  // Auto-search whenever any filter changes (with debouncing for text input)
  useEffect(() => {
    const timeoutId = setTimeout(
      () => {
        if (!isSearchingRef.current) {
          console.log("🔄 Auto-search triggered due to filter change");
          onFiltersChange(filters);
          updateURL(filters);
        }
      },
      filters.query ? 500 : 100
    ); // Longer delay for text input, shorter for other filters

    return () => clearTimeout(timeoutId);
  }, [filters, onFiltersChange]);

  const updateURL = (currentFilters: SearchFilters) => {
    const params = new URLSearchParams();

    if (currentFilters.query) params.set("q", currentFilters.query);
    if (currentFilters.categories.length > 0)
      params.set("categories", currentFilters.categories.join(","));
    if (currentFilters.costRange.min !== undefined)
      params.set("costMin", currentFilters.costRange.min.toString());
    if (currentFilters.costRange.max !== undefined)
      params.set("costMax", currentFilters.costRange.max.toString());
    if (currentFilters.costRange.type)
      params.set("costType", currentFilters.costRange.type);
    if (currentFilters.location.length > 0)
      params.set("location", currentFilters.location.join(","));
    if (currentFilters.dateRange.start)
      params.set("dateStart", currentFilters.dateRange.start);
    if (currentFilters.dateRange.end)
      params.set("dateEnd", currentFilters.dateRange.end);
    if (currentFilters.sortBy) params.set("sortBy", currentFilters.sortBy);
    if (currentFilters.sortOrder)
      params.set("sortOrder", currentFilters.sortOrder);
    if (currentFilters.includePastEvents)
      params.set("includePastEvents", "true");

    const queryString = params.toString();
    const url = queryString ? `/search?${queryString}` : "/search";
    router.push(url, { scroll: false });
  };

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    console.log(`🔧 Filter change - ${key}:`, value);
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleCategoryToggle = (category: string) => {
    setFilters((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));
  };

  const handleLocationToggle = (location: string) => {
    setFilters((prev) => ({
      ...prev,
      location: prev.location.includes(location)
        ? prev.location.filter((l) => l !== location)
        : [...prev.location, location],
    }));
  };

  const handleCostTypeToggle = (type: string) => {
    setFilters((prev) => ({
      ...prev,
      costRange: {
        ...prev.costRange,
        type: prev.costRange.type === type ? undefined : type,
      },
    }));
  };

  const resetFilters = () => {
    const resetFilters: SearchFilters = {
      query: "",
      categories: [],
      costRange: {},
      location: [],
      dateRange: {},
      sortBy: "date",
      sortOrder: "asc" as const,
      includePastEvents: false,
    };
    setFilters(resetFilters);
    router.push("/search?sortBy=date&sortOrder=asc");
  };

  const hasActiveFilters = () => {
    return (
      filters.query ||
      filters.categories.length > 0 ||
      filters.costRange.min !== undefined ||
      filters.costRange.max !== undefined ||
      filters.costRange.type ||
      filters.location.length > 0 ||
      filters.dateRange.start ||
      filters.dateRange.end ||
      filters.includePastEvents
    );
  };

  return (
    <div className="rounded-lg shadow-md p-6 h-fit sticky top-24">
      {/* Header with mobile toggle */}
      <div className="mb-4 lg:mb-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
            Filters
            {hasActiveFilters() && (
              <span className="ml-2 w-2 h-2 bg-blue-500 rounded-full inline-block" />
            )}
          </h3>
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="lg:hidden p-1 rounded hover:bg-gray-100 transition-colors"
            aria-label={filtersOpen ? "Collapse filters" : "Expand filters"}
          >
            {filtersOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            )}
          </button>
        </div>
        {hasActiveFilters() && (
          <button
            onClick={resetFilters}
            className="mt-3 bg-red-400 hover:bg-red-600 px-4 py-2 rounded-md font-medium text-sm flex items-center transition-colors duration-200 shadow-sm hover:shadow-md"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Reset Filters
          </button>
        )}
      </div>

      {/* Search Content — collapsible on mobile, always visible on lg+ */}
      <div className={`space-y-6 ${filtersOpen ? "block" : "hidden"} lg:block`}>
        {/* Text Search */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Search Events
          </label>
          <input
            type="text"
            value={filters.query}
            onChange={(e) => handleFilterChange("query", e.target.value)}
            placeholder="Search by title, description, venue..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Categories */}
        <div>
          <label className="text-sm font-medium mb-2">
            <svg className="inline w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" /></svg>
            Categories
          </label>

          {/* Selected Categories */}
          {filters.categories.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-medium mb-2">Selected:</div>
              <div className="space-y-2">
                {filters.categories.map((category) => (
                  <label key={category} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={true}
                      onChange={() => handleCategoryToggle(category)}
                      className="mr-2 h-4 w-4 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium">{category}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Available Categories */}
          <div className="space-y-2 max-h-32 overflow-y-auto">
            <div className="text-xs font-medium mb-2">
              {filters.categories.length > 0 ? "Available:" : "All Categories:"}
            </div>
            {categories
              .filter((category) => !filters.categories.includes(category))
              .map((category) => (
                <label key={category} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => handleCategoryToggle(category)}
                    className="mr-2 h-4 w-4 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm">{category}</span>
                </label>
              ))}
          </div>
        </div>

        {/* Cost Range */}
        <div>
          <label className="block text-sm font-medium mb-2">
            <svg className="inline w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Cost Range
          </label>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Min"
                value={filters.costRange.min || ""}
                onChange={(e) =>
                  handleFilterChange("costRange", {
                    ...filters.costRange,
                    min: e.target.value
                      ? parseFloat(e.target.value)
                      : undefined,
                  })
                }
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="number"
                placeholder="Max"
                value={filters.costRange.max || ""}
                onChange={(e) =>
                  handleFilterChange("costRange", {
                    ...filters.costRange,
                    max: e.target.value
                      ? parseFloat(e.target.value)
                      : undefined,
                  })
                }
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {COST_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => handleCostTypeToggle(type)}
                  className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                    filters.costRange.type === type
                      ? "border-blue-400 bg-blue-400 text-white"
                      : "border-gray-900 theme-hover-medium"
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium mb-2">
            <svg className="inline w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Location
          </label>
          <div className="space-y-2">
            {LOCATION_OPTIONS.map((location) => (
              <label key={location} className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.location.includes(location)}
                  onChange={() => handleLocationToggle(location)}
                  className="mr-2 h-4 w-4 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm">{location}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium mb-2">
            <svg className="inline w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Date Range
          </label>
          <div className="space-y-2">
            <label className="flex items-center mb-2">
              <input
                type="checkbox"
                checked={filters.includePastEvents || false}
                onChange={(e) =>
                  handleFilterChange("includePastEvents", e.target.checked)
                }
                className="mr-2 h-4 w-4 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm">Include past events</span>
            </label>
            <input
              type="date"
              value={filters.dateRange.start || ""}
              onChange={(e) =>
                handleFilterChange("dateRange", {
                  ...filters.dateRange,
                  start: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Start date"
            />
            <input
              type="date"
              value={filters.dateRange.end || ""}
              onChange={(e) =>
                handleFilterChange("dateRange", {
                  ...filters.dateRange,
                  end: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="End date"
            />
          </div>
        </div>

        {/* Sort Options */}
        <div>
          <label className="block text-sm font-medium mb-2">
            <svg className="inline w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
            Sort By
          </label>
          <div className="space-y-2">
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange("sortBy", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="flex space-x-2">
              <button
                onClick={() => handleFilterChange("sortOrder", "asc")}
                className={`flex-1 px-3 py-2 text-xs rounded border transition-colors ${
                  filters.sortOrder === "asc"
                    ? "bg-blue-400 border-blue-400 text-white"
                    : "bg-gray-900 border-gray-900 text-white hover:bg-gray-800"
                }`}
              >
                Ascending
              </button>
              <button
                onClick={() => handleFilterChange("sortOrder", "desc")}
                className={`flex-1 px-3 py-2 text-xs rounded border transition-colors ${
                  filters.sortOrder === "desc"
                    ? "bg-blue-400 border-blue-400 text-white"
                    : "bg-gray-900 border-gray-900 text-white hover:bg-gray-800"
                }`}
              >
                Descending
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Info text */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <p className="text-sm text-center">
          Search results update automatically as you change filters
        </p>
      </div>
    </div>
  );
}

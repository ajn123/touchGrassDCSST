"use client";

import FeaturedEvent from "@/components/FeaturedEvent";
import SearchFilters from "@/components/SearchFilters";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

// Component that uses useSearchParams - wrapped in Suspense
function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [allCategories, setAllCategories] = useState<string[]>([]);

  // Memoize filters to prevent unnecessary re-renders
  const filters = useMemo(
    () => ({
      query: searchParams.get("q") || "",
      categories: searchParams.get("categories")
        ? searchParams.get("categories")!.split(",")
        : [],
      costRange: {
        min: searchParams.get("costMin")
          ? parseFloat(searchParams.get("costMin")!)
          : undefined,
        max: searchParams.get("costMax")
          ? parseFloat(searchParams.get("costMax")!)
          : undefined,
        type: searchParams.get("costType") || undefined,
      },
      location: searchParams.get("location")
        ? searchParams.get("location")!.split(",")
        : [],
      dateRange: {
        start: searchParams.get("dateStart") || undefined,
        end: searchParams.get("dateEnd") || undefined,
      },
      sortBy: searchParams.get("sortBy") || "date",
      sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "asc",
    }),
    [searchParams]
  );

  // Load data whenever filters change
  useEffect(() => {
    console.log("🔄 useEffect triggered - filters changed, reloading data");

    const loadData = async () => {
      try {
        setLoading(true);
        console.log("📡 Fetching events from API with filters:", filters);

        // Build query string for the API
        const queryParams = new URLSearchParams();

        if (filters.query) queryParams.append("q", filters.query);
        if (filters.categories.length > 0)
          queryParams.append("categories", filters.categories.join(","));
        if (filters.costRange.min !== undefined)
          queryParams.append("costMin", filters.costRange.min.toString());
        if (filters.costRange.max !== undefined)
          queryParams.append("costMax", filters.costRange.max.toString());
        if (filters.costRange.type)
          queryParams.append("costType", filters.costRange.type);
        if (filters.location.length > 0)
          queryParams.append("location", filters.location.join(","));
        if (filters.dateRange.start)
          queryParams.append("dateStart", filters.dateRange.start);
        if (filters.dateRange.end)
          queryParams.append("dateEnd", filters.dateRange.end);
        if (filters.sortBy) queryParams.append("sortBy", filters.sortBy);
        if (filters.sortOrder)
          queryParams.append("sortOrder", filters.sortOrder);

        const response = await fetch(`/api/events?${queryParams.toString()}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log(
          "📦 Retrieved",
          data.events?.length || 0,
          "events from API"
        );

        setEvents(data.events || []);
      } catch (error) {
        console.error("Error loading events:", error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [filters]); // Run whenever filters change

  // Fetch all available categories when component mounts
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/categories");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const categoryNames = data.categories.map((cat: any) => cat.category);
        setAllCategories(categoryNames);
      } catch (error) {
        console.error("Error fetching categories:", error);
        setAllCategories([]);
      }
    };

    fetchCategories();
  }, []);

  // Simple function to handle automatic search updates
  const handleSearchUpdate = useCallback((searchFilters: any) => {
    console.log("🔍 Search filters updated:", searchFilters);
    // The filtering is already handled by the useEffect above
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-center">Search Events</h1>
          {filters.query && (
            <p className="text-center text-gray-600">
              Showing results for "{filters.query}"
            </p>
          )}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Column - Search Filters */}
          <div className="lg:col-span-1">
            <SearchFilters
              onFiltersChange={handleSearchUpdate}
              categories={allCategories}
              initialFilters={filters}
            />
          </div>

          {/* Right Column - Search Results */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading events...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">
                  {filters.query
                    ? `No events found for "${filters.query}"`
                    : "No events found"}
                </p>
                <Link
                  href="/"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Return to homepage
                </Link>
              </div>
            ) : (
              <div>
                <p className="text-center text-gray-600 mb-8">
                  Found {events.length} event
                  {events.length !== 1 ? "s" : ""}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {events.map((event: any, index: number) => (
                    <FeaturedEvent key={index} event={event} index={index} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading fallback component
function SearchPageLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading search page...</p>
        </div>
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function SearchPage() {
  return (
    <Suspense fallback={<SearchPageLoading />}>
      <SearchPageContent />
    </Suspense>
  );
}

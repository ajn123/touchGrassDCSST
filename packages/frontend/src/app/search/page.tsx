"use client";

import FeaturedEvent from "@/components/FeaturedEvent";
import SearchFilters from "@/components/SearchFilters";
import { filterEvents, FilterOptions, getCategoriesFromEvents } from "@/lib/filter-events";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

// Component that uses useSearchParams - wrapped in Suspense
function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [allCategories, setAllCategories] = useState<string[]>([]);

  // Memoize filters to prevent unnecessary re-renders
  const filters = useMemo(() => {
    const includePastEvents = searchParams.get("includePastEvents") === "true";
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

    // If not including past events and no explicit dateStart, set to today
    const dateStart =
      searchParams.get("dateStart") || (!includePastEvents ? today : undefined);

    return {
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
        start: dateStart,
        end: searchParams.get("dateEnd") || undefined,
      },
      sortBy: searchParams.get("sortBy") || "date",
      sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "asc",
      types: searchParams.get("types") || "event,group",
      includePastEvents,
    };
  }, [searchParams]);

  // Load data whenever filters change
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Fetch events from DynamoDB (include past events if requested)
        const apiUrl = filters.includePastEvents 
          ? "/api/events/all?includePastEvents=true"
          : "/api/events/all";
        const response = await fetch(apiUrl);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const allEvents = data.events || [];

        // Filter out past events if not including them
        // The API should already filter, but we do it here too to be safe
        let eventsToUse = allEvents;
        if (!filters.includePastEvents) {
          const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
          const beforeCount = allEvents.length;
          eventsToUse = allEvents.filter((event: any) => {
            const eventDate = event.end_date || event.start_date;
            // Exclude events without dates when filtering out past events
            // (they might be past events with missing date info)
            if (!eventDate) return false;
            return eventDate >= today;
          });
          const afterCount = eventsToUse.length;
          if (beforeCount !== afterCount) {
            console.log(
              `📅 Filtered out ${beforeCount - afterCount} past events (${beforeCount} → ${afterCount})`
            );
          }
        }

        // Apply frontend filtering
        const filterOptions: FilterOptions = {
          query: filters.query || undefined,
          categories: filters.categories.length > 0 ? filters.categories : undefined,
          costRange: filters.costRange.min !== undefined || filters.costRange.max !== undefined || filters.costRange.type
            ? filters.costRange
            : undefined,
          location: filters.location.length > 0 ? filters.location : undefined,
          dateRange: filters.dateRange.start || filters.dateRange.end ? filters.dateRange : undefined,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
          limit: 1000, // Large limit, we'll paginate on frontend if needed
        };

        const filteredEvents = filterEvents(eventsToUse, filterOptions);

        // For now, groups are empty (can be added later if needed)
        const groups: any[] = [];

        // Extract categories from current and future events only (not past events)
        // Use the same filtered events to ensure categories match available events
        const categoriesFromEvents = getCategoriesFromEvents(eventsToUse);
        setAllCategories(categoriesFromEvents);

        console.log(
          `📦 Retrieved ${allEvents.length} events, filtered to ${filteredEvents.length} events`
        );

        setEvents(filteredEvents);
        setGroups(groups);
      } catch (error) {
        console.error("Error loading events:", error);
        setEvents([]);
        setGroups([]);
        setAllCategories([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [filters]); // Run whenever filters change

  // Simple function to handle automatic search updates
  const handleSearchUpdate = useCallback((searchFilters: any) => {
    // The filtering is already handled by the useEffect above
  }, []);

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-center">
            {filters.types === "group" ? "Search Groups" : "Search Events"}
          </h1>
          {filters.query && (
            <p className="text-center">Showing results for "{filters.query}"</p>
          )}
          {filters.types === "group" && !filters.query && (
            <p className="text-center text-gray-600">Browse all groups</p>
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
                <p className="text-gray-600">Loading events and groups...</p>
              </div>
            ) : events.length === 0 && groups.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">
                  {filters.query
                    ? `No events or groups found for "${filters.query}"`
                    : "No events or groups found"}
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
                <p className="text-center mb-8">
                  {filters.types === "group"
                    ? `Found ${groups.length} group${
                        groups.length !== 1 ? "s" : ""
                      }`
                    : `Found ${events.length} event${
                        events.length !== 1 ? "s" : ""
                      } and ${groups.length} group${
                        groups.length !== 1 ? "s" : ""
                      }`}
                </p>

                {/* Events Section */}
                {filters.types !== "group" && events.length > 0 && (
                  <div className="mb-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">
                      Events
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {events.map((event: any, index: number) => (
                        <FeaturedEvent key={`event-${index}`} event={event} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Groups Section */}
                {groups.length > 0 && (
                  <div id="groups-section">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">
                      Groups
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {groups.map((group: any, index: number) => (
                        <div
                          key={`group-${index}`}
                          className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                        >
                          <div className="p-6">
                            <div className="flex items-center mb-4">
                              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                                <span className="text-green-600 text-xl">
                                  👥
                                </span>
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {group.title}
                                </h3>
                                {group.category && (
                                  <p className="text-sm text-gray-500">
                                    {Array.isArray(group.category)
                                      ? group.category.join(", ")
                                      : group.category}
                                  </p>
                                )}
                              </div>
                            </div>

                            {group.description && (
                              <p className="text-gray-700 mb-4 line-clamp-3">
                                {group.description}
                              </p>
                            )}

                            <div className="flex flex-wrap gap-2 mb-4">
                              {group.category &&
                                Array.isArray(group.category) &&
                                group.category.map(
                                  (cat: string, catIndex: number) => (
                                    <span
                                      key={catIndex}
                                      className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                                    >
                                      {cat}
                                    </span>
                                  )
                                )}
                            </div>

                            <div className="flex justify-between items-center">
                              <Link
                                href={`/groups/${(() => {
                                  const id = group.id || group.pk;
                                  if (!id) return "unknown";
                                  return id.replace(/^(EVENT#|GROUP#)/, "");
                                })()}`}
                                className="text-green-600 hover:text-green-800 font-medium"
                              >
                                View Group →
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            Loading search page...
          </p>
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

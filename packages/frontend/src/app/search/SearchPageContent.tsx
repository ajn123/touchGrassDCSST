"use client";

import Categories from "@/components/Categories";
import FeaturedEvent from "@/components/FeaturedEvent";
import SearchFilters from "@/components/SearchFilters";
import { filterEvents, FilterOptions, getCategoriesFromEvents } from "@/lib/filter-events";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

function filterGroups(groups: any[], query: string, categories: string[]): any[] {
  let filtered = groups;

  if (query.trim()) {
    const words = query.toLowerCase().split(/\s+/);
    filtered = filtered.filter((group) => {
      const searchable = [
        group.title,
        group.description,
        Array.isArray(group.category) ? group.category.join(" ") : group.category,
        group.location,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return words.every((word) => searchable.includes(word));
    });
  }

  if (categories.length > 0) {
    filtered = filtered.filter((group) => {
      const groupCats = Array.isArray(group.category)
        ? group.category.map((c: string) => c.toLowerCase())
        : (group.category || "").toLowerCase().split(",").map((c: string) => c.trim());
      return categories.some((cat) => groupCats.includes(cat.toLowerCase()));
    });
  }

  return filtered;
}

function SearchPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [allCategories, setAllCategories] = useState<string[]>([]);

  const filters = useMemo(() => {
    const includePastEvents = searchParams.get("includePastEvents") === "true";
    const today = new Date().toISOString().split("T")[0];
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

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        const apiUrl = filters.includePastEvents
          ? "/api/events/all?includePastEvents=true"
          : "/api/events/all";

        const [eventsResponse, groupsResponse] = await Promise.all([
          fetch(apiUrl),
          fetch("/api/groups/all"),
        ]);

        // Process events
        const eventsData = eventsResponse.ok ? await eventsResponse.json() : { events: [] };
        let allEvents = eventsData.events || [];

        if (!filters.includePastEvents) {
          const today = new Date().toISOString().split("T")[0];
          allEvents = allEvents.filter((event: any) => {
            const eventDate = event.end_date || event.start_date;
            if (!eventDate) return false;
            return eventDate >= today;
          });
        }

        const filterOptions: FilterOptions = {
          query: filters.query || undefined,
          categories: filters.categories.length > 0 ? filters.categories : undefined,
          costRange:
            filters.costRange.min !== undefined ||
            filters.costRange.max !== undefined ||
            filters.costRange.type
              ? filters.costRange
              : undefined,
          location: filters.location.length > 0 ? filters.location : undefined,
          dateRange:
            filters.dateRange.start || filters.dateRange.end ? filters.dateRange : undefined,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
          limit: 1000,
        };

        const filteredEvents = filterEvents(allEvents, filterOptions);

        // Process groups
        const groupsData = groupsResponse.ok ? await groupsResponse.json() : { groups: [] };
        const allGroups = groupsData.groups || [];
        const filteredGroups = filterGroups(allGroups, filters.query, filters.categories);

        const categoriesFromEvents = getCategoriesFromEvents(allEvents);
        setAllCategories(categoriesFromEvents);
        setEvents(filteredEvents);
        setGroups(filteredGroups);
      } catch (error) {
        console.error("Error loading search data:", error);
        setEvents([]);
        setGroups([]);
        setAllCategories([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [filters]);

  const handleSearchUpdate = useCallback(() => {}, []);

  const handleReset = useCallback(() => {
    router.push("/search?sortBy=date&sortOrder=asc");
  }, [router]);

  const resultsSummary = useMemo(() => {
    const parts: string[] = [];
    if (filters.types !== "group" && events.length > 0) {
      parts.push(`${events.length} event${events.length !== 1 ? "s" : ""}`);
    }
    if (groups.length > 0) {
      parts.push(`${groups.length} group${groups.length !== 1 ? "s" : ""}`);
    }
    let summary = parts.join(" and ");
    if (filters.query) {
      summary += ` for "${filters.query}"`;
    }
    return summary;
  }, [events.length, groups.length, filters.query, filters.types]);

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-center">
            {filters.types === "group" ? "Search Groups" : "Search Events & Groups"}
          </h1>
          {filters.query && (
            <p className="text-center text-gray-600">
              Results for &ldquo;{filters.query}&rdquo;
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
                <p className="text-gray-600">Searching events and groups...</p>
              </div>
            ) : events.length === 0 && groups.length === 0 ? (
              <div className="text-center py-16">
                <svg
                  className="w-16 h-16 text-gray-300 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                  No results found
                </h2>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  {filters.query
                    ? `We couldn't find any events or groups matching "${filters.query}".`
                    : "No events or groups match your current filters."}
                </p>
                <ul className="text-sm text-gray-500 mb-6 space-y-1">
                  <li>Try broadening your date range</li>
                  <li>Remove some category filters</li>
                  <li>Check your spelling</li>
                </ul>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    Clear all filters
                  </button>
                  <Link
                    href="/"
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Go to homepage
                  </Link>
                </div>
              </div>
            ) : (
              <div>
                {resultsSummary && (
                  <p className="text-sm text-gray-500 mb-6">
                    Found {resultsSummary}
                  </p>
                )}

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
                        <Link
                          key={`group-${index}`}
                          href={`/groups/${encodeURIComponent(group.title)}`}
                          className="block"
                        >
                          <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col">
                            <div className="p-6 flex-1 flex flex-col">
                              <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2">
                                {group.title}
                              </h3>
                              {group.description && (
                                <p className="text-gray-600 mb-3 line-clamp-2 text-sm flex-1">
                                  {group.description}
                                </p>
                              )}
                              {group.category && (
                                <div className="mt-auto">
                                  <Categories
                                    displayMode="display"
                                    eventCategories={
                                      Array.isArray(group.category)
                                        ? group.category.join(",")
                                        : group.category
                                    }
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </Link>
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

function SearchPageLoading() {
  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading search...</p>
        </div>
      </div>
    </div>
  );
}

export function SearchPageContent() {
  return (
    <Suspense fallback={<SearchPageLoading />}>
      <SearchPageInner />
    </Suspense>
  );
}

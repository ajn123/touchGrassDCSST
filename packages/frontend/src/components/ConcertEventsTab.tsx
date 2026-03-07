"use client";

import FeaturedEvent from "@/components/FeaturedEvent";
import { filterEvents, FilterOptions } from "@/lib/filter-events";
import { useEffect, useState } from "react";

function groupByVenue(events: any[]): Map<string, any[]> {
  const groups = new Map<string, any[]>();
  for (const event of events) {
    const venue = event.venue || event.location || "Other";
    const clean = venue.toLowerCase().includes("unknown") ? "Other" : venue;
    if (!groups.has(clean)) groups.set(clean, []);
    groups.get(clean)!.push(event);
  }
  return new Map(
    [...groups.entries()].sort(([a], [b]) => {
      if (a === "Other") return 1;
      if (b === "Other") return -1;
      return a.localeCompare(b);
    })
  );
}

interface ConcertEventsTabProps {
  allEvents: any[];
}

export default function ConcertEventsTab({ allEvents }: ConcertEventsTabProps) {
  const [concertEvents, setConcertEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"date" | "venue">("date");
  const [selectedVenue, setSelectedVenue] = useState<string | null>(null);

  useEffect(() => {
    const today = new Date();
    const fourWeeksFromNow = new Date();
    fourWeeksFromNow.setDate(today.getDate() + 28);

    const todayStr = today.toISOString().split("T")[0];
    const fourWeeksStr = fourWeeksFromNow.toISOString().split("T")[0];

    const filterOptions: FilterOptions = {
      categories: ["music"],
      dateRange: {
        start: todayStr,
        end: fourWeeksStr,
      },
      query: searchQuery || undefined,
      sortBy: "date",
      sortOrder: "asc",
    };

    const filtered = filterEvents(allEvents, filterOptions);
    setConcertEvents(filtered);
    setLoading(false);
  }, [allEvents, searchQuery]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p>Loading concerts...</p>
      </div>
    );
  }

  const venueGroups = viewMode === "venue" ? groupByVenue(concertEvents) : null;
  const venueNames = venueGroups ? [...venueGroups.keys()] : [];
  const activeVenue = selectedVenue && venueNames.includes(selectedVenue) ? selectedVenue : venueNames[0] ?? null;
  const activeVenueEvents = activeVenue && venueGroups ? venueGroups.get(activeVenue) ?? [] : [];

  return (
    <div>
      {/* Controls row */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Toggle pills */}
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("date")}
            className={`text-sm px-4 py-1.5 rounded-full font-medium transition-colors ${
              viewMode === "date"
                ? "bg-purple-600 text-white"
                : "theme-bg-secondary theme-text-secondary border border-[var(--text-tertiary)] hover:opacity-80"
            }`}
          >
            By Date
          </button>
          <button
            onClick={() => setViewMode("venue")}
            className={`text-sm px-4 py-1.5 rounded-full font-medium transition-colors ${
              viewMode === "venue"
                ? "bg-purple-600 text-white"
                : "theme-bg-secondary theme-text-secondary border border-[var(--text-tertiary)] hover:opacity-80"
            }`}
          >
            By Venue
          </button>
        </div>

        {/* Search bar */}
        <div className="relative w-full sm:w-72">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search artists, venues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--text-tertiary)] bg-[var(--bg-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Venue selector pills */}
      {viewMode === "venue" && venueNames.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {venueNames.map((venue) => (
            <button
              key={venue}
              onClick={() => setSelectedVenue(venue)}
              className={`text-sm px-3 py-1 rounded-full font-medium transition-colors ${
                venue === activeVenue
                  ? "bg-purple-600 text-white"
                  : "theme-bg-secondary theme-text-secondary border border-[var(--text-tertiary)] hover:opacity-80"
              }`}
            >
              {venue}
            </button>
          ))}
        </div>
      )}

      {concertEvents.length === 0 ? (
        <div className="text-center py-12">
          <p>
            {searchQuery
              ? `No concerts found matching "${searchQuery}".`
              : "No concerts found for the next four weeks."}
          </p>
        </div>
      ) : viewMode === "venue" && activeVenue ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeVenueEvents.map((event: any, index: number) => (
            <FeaturedEvent key={`concert-${activeVenue}-${index}`} event={event} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {concertEvents.map((event: any, index: number) => (
            <FeaturedEvent key={`concert-event-${index}`} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}

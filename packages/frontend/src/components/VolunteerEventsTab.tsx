"use client";

import FeaturedEvent from "@/components/FeaturedEvent";
import { filterEvents, FilterOptions } from "@/lib/filter-events";
import { useMemo, useEffect, useState } from "react";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function getEventDayOfWeek(event: any): number | null {
  if (!event.start_date) return null;
  const d = new Date(event.start_date + "T00:00:00");
  return isNaN(d.getTime()) ? null : d.getDay();
}

function groupByOrganization(events: any[]): Map<string, any[]> {
  const groups = new Map<string, any[]>();
  for (const event of events) {
    const org = event.venue || event.source || "Other";
    const clean = org.toLowerCase().includes("unknown") ? "Other" : org;
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

interface VolunteerEventsTabProps {
  allEvents: any[];
}

export default function VolunteerEventsTab({ allEvents }: VolunteerEventsTabProps) {
  const [volunteerEvents, setVolunteerEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"date" | "org">("date");
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set([0,1,2,3,4,5,6]));

  useEffect(() => {
    const today = new Date();
    const eightWeeks = new Date();
    eightWeeks.setDate(today.getDate() + 56);

    const todayStr = today.toISOString().split("T")[0];
    const endStr = eightWeeks.toISOString().split("T")[0];

    const filterOptions: FilterOptions = {
      categories: ["volunteer"],
      dateRange: {
        start: todayStr,
        end: endStr,
      },
      query: searchQuery || undefined,
      sortBy: "date",
      sortOrder: "asc",
    };

    const filtered = filterEvents(allEvents, filterOptions);
    setVolunteerEvents(filtered);
    setLoading(false);
  }, [allEvents, searchQuery]);

  const availableDays = useMemo(() => {
    const days = new Set<number>();
    for (const e of volunteerEvents) {
      const d = getEventDayOfWeek(e);
      if (d !== null) days.add(d);
    }
    return days;
  }, [volunteerEvents]);

  const allDaysSelected = selectedDays.size === 7;

  const filteredByDay = useMemo(() => {
    if (allDaysSelected) return volunteerEvents;
    return volunteerEvents.filter((e) => {
      const d = getEventDayOfWeek(e);
      return d !== null && selectedDays.has(d);
    });
  }, [volunteerEvents, selectedDays, allDaysSelected]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
        <p>Loading volunteer events...</p>
      </div>
    );
  }

  function toggleDay(day: number) {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) {
        if (next.size === 1) return prev;
        next.delete(day);
      } else {
        next.add(day);
      }
      return next;
    });
  }

  function toggleAllDays() {
    if (allDaysSelected) return;
    setSelectedDays(new Set([0,1,2,3,4,5,6]));
  }

  const orgGroups = viewMode === "org" ? groupByOrganization(volunteerEvents) : null;
  const orgNames = orgGroups ? [...orgGroups.keys()] : [];
  const activeOrg = selectedOrg && orgNames.includes(selectedOrg) ? selectedOrg : orgNames[0] ?? null;
  const activeOrgEvents = activeOrg && orgGroups ? orgGroups.get(activeOrg) ?? [] : [];

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
                ? "bg-emerald-600 text-white"
                : "theme-bg-secondary theme-text-secondary border border-[var(--text-tertiary)] hover:opacity-80"
            }`}
          >
            By Date
          </button>
          <button
            onClick={() => setViewMode("org")}
            className={`text-sm px-4 py-1.5 rounded-full font-medium transition-colors ${
              viewMode === "org"
                ? "bg-emerald-600 text-white"
                : "theme-bg-secondary theme-text-secondary border border-[var(--text-tertiary)] hover:opacity-80"
            }`}
          >
            By Organization
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
            placeholder="Search events, organizations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--text-tertiary)] bg-[var(--bg-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Day-of-week filter pills (date view) */}
      {viewMode === "date" && volunteerEvents.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={toggleAllDays}
            className={`text-sm px-3 py-1 rounded-full font-medium transition-colors ${
              allDaysSelected
                ? "bg-emerald-600 text-white"
                : "theme-bg-secondary theme-text-secondary border border-[var(--text-tertiary)] hover:opacity-80"
            }`}
          >
            All
          </button>
          {DAY_LABELS.map((label, i) => (
            <button
              key={label}
              onClick={() => toggleDay(i)}
              disabled={!availableDays.has(i)}
              className={`text-sm px-3 py-1 rounded-full font-medium transition-colors ${
                !availableDays.has(i)
                  ? "opacity-30 cursor-not-allowed theme-bg-secondary theme-text-secondary border border-[var(--text-tertiary)]"
                  : selectedDays.has(i) && !allDaysSelected
                    ? "bg-emerald-600 text-white"
                    : "theme-bg-secondary theme-text-secondary border border-[var(--text-tertiary)] hover:opacity-80"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Organization selector pills */}
      {viewMode === "org" && orgNames.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {orgNames.map((org) => (
            <button
              key={org}
              onClick={() => setSelectedOrg(org)}
              className={`text-sm px-3 py-1 rounded-full font-medium transition-colors ${
                org === activeOrg
                  ? "bg-emerald-600 text-white"
                  : "theme-bg-secondary theme-text-secondary border border-[var(--text-tertiary)] hover:opacity-80"
              }`}
            >
              {org}
            </button>
          ))}
        </div>
      )}

      {volunteerEvents.length === 0 ? (
        <div className="text-center py-12">
          <p>
            {searchQuery
              ? `No volunteer events found matching "${searchQuery}".`
              : "No volunteer events found for the next 8 weeks."}
          </p>
        </div>
      ) : viewMode === "org" && activeOrg ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeOrgEvents.map((event: any, index: number) => (
            <FeaturedEvent key={`vol-${activeOrg}-${index}`} event={event} />
          ))}
        </div>
      ) : filteredByDay.length === 0 ? (
        <div className="text-center py-12">
          <p>No volunteer events on the selected days.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredByDay.map((event: any, index: number) => (
            <FeaturedEvent key={`vol-event-${index}`} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}

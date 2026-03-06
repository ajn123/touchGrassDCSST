"use client";

import {
  getCategoryPreferences,
  getClickHistory,
} from "@/lib/userPreferences";
import { useEffect, useState } from "react";
import EventCard from "./EventCard";

interface RecommendedEvent {
  pk?: string;
  title?: string;
  description?: string;
  start_date?: string;
  start_time?: string;
  location?: string;
  venue?: string;
  image_url?: string;
  category?: string | string[];
  _recommendationScore?: number;
  _recommendationReasons?: string[];
}

export default function PersonalizedEvents() {
  const [events, setEvents] = useState<RecommendedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasPersonalization, setHasPersonalization] = useState(false);

  useEffect(() => {
    async function fetchRecommendations() {
      try {
        const categoryPreferences = getCategoryPreferences();
        const clickHistory = getClickHistory();

        const response = await fetch("/api/recommendations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            categoryPreferences,
            clickHistory: clickHistory.map((c) => ({
              eventId: c.eventId,
              category: c.category,
            })),
            limit: 8,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setEvents(data.events || []);
          setHasPersonalization(data.hasPersonalization || false);
        }
      } catch (error) {
        console.error("Failed to fetch recommendations:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchRecommendations();
  }, []);

  if (!loading && events.length === 0) {
    return null;
  }

  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center gap-2 mb-6">
          <h2 className="text-2xl font-bold text-white">Upcoming Events</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="rounded-xl overflow-hidden animate-pulse bg-gray-800/60"
            >
              <div className="h-44 bg-gray-700" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-700 rounded w-3/4" />
                <div className="h-3 bg-gray-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex items-center gap-2 mb-6">
        <h2 className="text-2xl font-bold text-white">
          {hasPersonalization ? "Recommended for You" : "Upcoming Events"}
        </h2>
        {hasPersonalization && (
          <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-full">
            Personalized
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {events.map((event) => {
          const eventId = event.pk || "";
          const category = Array.isArray(event.category)
            ? event.category[0]
            : event.category;
          const venue =
            event.venue && !event.venue.toLowerCase().includes("unknown")
              ? event.venue
              : undefined;

          let dateStr: string | undefined;
          if (event.start_date) {
            dateStr = new Date(
              event.start_date + "T00:00:00"
            ).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            });
            if (event.start_time) dateStr += ` at ${event.start_time}`;
          }

          return (
            <EventCard
              key={eventId}
              href={`/events/${encodeURIComponent(eventId)}`}
              title={event.title || "Event"}
              imageUrl={event.image_url}
              category={category}
              venue={venue}
              date={dateStr}
            />
          );
        })}
      </div>
    </section>
  );
}

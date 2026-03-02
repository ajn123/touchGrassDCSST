"use client";

import { resolveImageUrl, shouldBeUnoptimized } from "@/lib/image-utils";
import {
  getCategoryPreferences,
  getClickHistory,
  getUserLocation,
} from "@/lib/userPreferences";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

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
        const location = await getUserLocation();

        // Only fetch if we have some personalization signals
        if (
          categoryPreferences.length === 0 &&
          clickHistory.length === 0 &&
          !location
        ) {
          setLoading(false);
          return;
        }

        const response = await fetch("/api/recommendations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            categoryPreferences,
            clickHistory: clickHistory.map((c) => ({
              eventId: c.eventId,
              category: c.category,
            })),
            lat: location?.lat,
            lng: location?.lng,
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

  // Don't render if no personalization data or no events
  if (!loading && (!hasPersonalization || events.length === 0)) {
    return null;
  }

  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center gap-2 mb-6">
          <h2 className="text-2xl font-bold text-white">Recommended for You</h2>
          <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-full">
            Personalized
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-gray-800 rounded-lg overflow-hidden animate-pulse"
            >
              <div className="h-40 bg-gray-700" />
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
        <h2 className="text-2xl font-bold text-white">Recommended for You</h2>
        <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-full">
          Personalized
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {events.map((event) => {
          const eventId = event.pk || "";
          const category = Array.isArray(event.category)
            ? event.category[0]
            : event.category;

          return (
            <Link
              key={eventId}
              href={`/events/${encodeURIComponent(eventId)}`}
              className="group bg-gray-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-emerald-500 transition-all"
            >
              <div className="relative h-40">
                <Image
                  src={resolveImageUrl(event.image_url, category, event.title, event.venue)}
                  alt={event.title || "Event"}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  unoptimized={shouldBeUnoptimized(
                    resolveImageUrl(event.image_url, category, event.title, event.venue)
                  )}
                />
                {category && (
                  <span className="absolute top-2 left-2 text-xs bg-black/60 text-white px-2 py-0.5 rounded">
                    {category}
                  </span>
                )}
              </div>
              <div className="p-3">
                <h3 className="text-sm font-semibold text-white line-clamp-2 group-hover:text-emerald-400 transition-colors">
                  {event.title}
                </h3>
                {event.start_date && (
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(event.start_date + "T00:00:00").toLocaleDateString(
                      "en-US",
                      {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      }
                    )}
                    {event.start_time && ` at ${event.start_time}`}
                  </p>
                )}
                {event.venue && !event.venue.toLowerCase().includes("unknown") && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {event.venue}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

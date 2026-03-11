"use client";

import { useEffect, useMemo, useState } from "react";
import EventCard from "@/components/EventCard";
import {
  haversineDistanceMiles,
  parseCoordinates,
  formatDistance,
} from "@/lib/distance";

const RADIUS_OPTIONS = [
  { label: "1 mi", value: 1 },
  { label: "5 mi", value: 5 },
  { label: "10 mi", value: 10 },
  { label: "25 mi", value: 25 },
  { label: "All", value: Infinity },
];

const DEFAULT_RADIUS = 10;
const DC_CENTER = { lat: 38.9072, lng: -77.0369 };
const DC_METRO_RADIUS = 50;

type LocationStatus =
  | "idle"
  | "loading"
  | "success"
  | "denied"
  | "unavailable"
  | "timeout";

export default function NearMeClient() {
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locationStatus, setLocationStatus] =
    useState<LocationStatus>("idle");
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [radius, setRadius] = useState(DEFAULT_RADIUS);

  // Request geolocation on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus("unavailable");
      return;
    }

    setLocationStatus("loading");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationStatus("success");
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationStatus("denied");
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationStatus("unavailable");
            break;
          case error.TIMEOUT:
            setLocationStatus("timeout");
            break;
          default:
            setLocationStatus("unavailable");
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  }, []);

  // Fetch events once location is available
  useEffect(() => {
    if (!userLocation) return;

    const fetchEvents = async () => {
      setEventsLoading(true);
      try {
        const response = await fetch("/api/events/simple");
        if (!response.ok) throw new Error("Failed to fetch");
        const data = await response.json();
        setAllEvents(data.events || []);
      } catch (error) {
        console.error("Failed to fetch events:", error);
        setAllEvents([]);
      } finally {
        setEventsLoading(false);
      }
    };

    fetchEvents();
  }, [userLocation]);

  // Calculate distances and filter/sort
  const nearbyEvents = useMemo(() => {
    if (!userLocation || allEvents.length === 0) return [];

    const withDistance: (any & { distance: number })[] = [];

    for (const event of allEvents) {
      if (!event.coordinates) continue;
      const coords = parseCoordinates(event.coordinates);
      if (!coords) continue;

      const distance = haversineDistanceMiles(
        userLocation.lat,
        userLocation.lng,
        coords.lat,
        coords.lng
      );

      if (radius !== Infinity && distance > radius) continue;

      withDistance.push({ ...event, distance });
    }

    withDistance.sort((a, b) => a.distance - b.distance);
    return withDistance;
  }, [userLocation, allEvents, radius]);

  const isOutsideDC = useMemo(() => {
    if (!userLocation) return false;
    return (
      haversineDistanceMiles(
        userLocation.lat,
        userLocation.lng,
        DC_CENTER.lat,
        DC_CENTER.lng
      ) > DC_METRO_RADIUS
    );
  }, [userLocation]);

  // Location error states
  if (
    locationStatus === "denied" ||
    locationStatus === "unavailable" ||
    locationStatus === "timeout"
  ) {
    return (
      <section className="max-w-7xl mx-auto px-4 py-12">
        <h1
          className="text-3xl font-bold mb-6"
          style={{ color: "var(--text-primary)" }}
        >
          Events Near Me
        </h1>
        <div
          className="rounded-xl p-8 text-center"
          style={{ backgroundColor: "var(--bg-secondary)" }}
        >
          <svg
            className="w-16 h-16 mx-auto mb-4"
            style={{ color: "var(--text-secondary)" }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <h2
            className="text-xl font-semibold mb-2"
            style={{ color: "var(--text-primary)" }}
          >
            {locationStatus === "denied"
              ? "Location Access Denied"
              : "Couldn't Determine Your Location"}
          </h2>
          <p
            className="mb-6"
            style={{ color: "var(--text-secondary)" }}
          >
            {locationStatus === "denied"
              ? "Enable location access in your browser settings to find events near you."
              : "We couldn't get your location. Please try again or browse events on the map."}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 rounded-lg font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
            >
              Try Again
            </button>
            <a
              href="/map"
              className="px-6 py-2 rounded-lg font-medium transition-colors"
              style={{
                backgroundColor: "var(--bg-tertiary)",
                color: "var(--text-primary)",
              }}
            >
              View Map
            </a>
          </div>
        </div>
      </section>
    );
  }

  // Loading states
  if (locationStatus === "idle" || locationStatus === "loading" || eventsLoading) {
    return (
      <section className="max-w-7xl mx-auto px-4 py-12">
        <h1
          className="text-3xl font-bold mb-6"
          style={{ color: "var(--text-primary)" }}
        >
          Events Near Me
        </h1>
        <div
          className="rounded-xl p-8 text-center mb-8"
          style={{ backgroundColor: "var(--bg-secondary)" }}
        >
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent mb-4" />
          <p style={{ color: "var(--text-secondary)" }}>
            {locationStatus !== "success"
              ? "Detecting your location..."
              : "Finding events near you..."}
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="rounded-xl overflow-hidden animate-pulse"
              style={{ backgroundColor: "var(--bg-secondary)" }}
            >
              <div
                className="h-28 sm:h-44"
                style={{ backgroundColor: "var(--border-primary)" }}
              />
              <div className="p-4 space-y-2">
                <div
                  className="h-4 rounded w-3/4"
                  style={{ backgroundColor: "var(--border-primary)" }}
                />
                <div
                  className="h-3 rounded w-1/2"
                  style={{ backgroundColor: "var(--border-primary)" }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  // Events loaded
  return (
    <section className="max-w-7xl mx-auto px-4 py-12">
      <h1
        className="text-3xl font-bold mb-6"
        style={{ color: "var(--text-primary)" }}
      >
        Events Near Me
      </h1>

      {isOutsideDC && (
        <div className="mb-6 p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm">
          You appear to be outside the DC metro area. Events are shown with distances from your current location.
        </div>
      )}

      {/* Radius filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {RADIUS_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => setRadius(option.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              radius === option.value
                ? "bg-emerald-600 text-white"
                : ""
            }`}
            style={
              radius !== option.value
                ? {
                    backgroundColor: "var(--bg-secondary)",
                    color: "var(--text-primary)",
                  }
                : undefined
            }
          >
            {option.label}
          </button>
        ))}
      </div>

      {nearbyEvents.length === 0 ? (
        <div
          className="rounded-xl p-8 text-center"
          style={{ backgroundColor: "var(--bg-secondary)" }}
        >
          <p
            className="text-lg font-medium mb-2"
            style={{ color: "var(--text-primary)" }}
          >
            No events with location data found
            {radius !== Infinity ? ` within ${radius} miles` : ""}
          </p>
          <p
            className="mb-4"
            style={{ color: "var(--text-secondary)" }}
          >
            Try expanding your search radius or browse all events.
          </p>
          <div className="flex gap-3 justify-center">
            {radius !== Infinity && (
              <button
                onClick={() => setRadius(Infinity)}
                className="px-6 py-2 rounded-lg font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
              >
                Show All Distances
              </button>
            )}
            <a
              href="/search?sortBy=date&sortOrder=asc"
              className="px-6 py-2 rounded-lg font-medium transition-colors"
              style={{
                backgroundColor: "var(--bg-tertiary)",
                color: "var(--text-primary)",
              }}
            >
              Browse All Events
            </a>
          </div>
        </div>
      ) : (
        <>
          <p
            className="text-sm mb-4"
            style={{ color: "var(--text-secondary)" }}
          >
            {nearbyEvents.length} event{nearbyEvents.length !== 1 ? "s" : ""}{" "}
            found
            {radius !== Infinity ? ` within ${radius} miles` : ""}
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {nearbyEvents.map((event) => {
              const eventId = event.pk || "";
              const category = Array.isArray(event.category)
                ? event.category[0]
                : event.category;
              const venue =
                event.venue &&
                !event.venue.toLowerCase().includes("unknown")
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
                  badge={formatDistance(event.distance)}
                />
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

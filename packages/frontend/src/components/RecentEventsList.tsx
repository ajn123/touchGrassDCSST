"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Event {
  pk: string;
  title: string;
  description?: string;
  category?: string | string[];
  location?: string;
  venue?: string;
  date?: string;
  start_date?: string;
  end_date?: string;
  createdAt?: number | string;
  isPublic?: boolean | string;
  image_url?: string;
  source?: string;
  cost?: {
    type: string;
    amount?: string | number;
    currency?: string;
  };
  [key: string]: any;
}

export function RecentEventsList() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    fetchRecentEvents();
  }, [limit]);

  const fetchRecentEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/admin/recent-events?limit=${limit}`);
      if (!response.ok) {
        throw new Error("Failed to fetch recent events");
      }
      const data = await response.json();
      setEvents(data.events || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch events");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number | string | undefined) => {
    if (!timestamp) return "N/A";
    const date = typeof timestamp === "string" ? parseInt(timestamp) : timestamp;
    return new Date(date).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatEventDate = (event: Event) => {
    const dateStr = event.start_date || event.date;
    if (!dateStr) return "TBD";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const getEventId = (event: Event) => {
    const pk = event.pk || "";
    return pk.replace(/^(EVENT-|EVENT#)/, "");
  };

  const getCategoryDisplay = (category: string | string[] | undefined) => {
    if (!category) return "Uncategorized";
    if (Array.isArray(category)) return category.join(", ");
    return category;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-2 text-gray-600">Loading recent events...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="text-red-400">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Error loading events
            </h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <button
              onClick={fetchRecentEvents}
              className="mt-2 text-sm text-red-700 hover:text-red-900 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg
            className="mx-auto h-12 w-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No events found
        </h3>
        <p className="text-gray-500">
          There are no events in the system yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with controls */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-gray-900">
                Recently Added Events ({events.length})
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Most recently added events sorted by creation date
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <label className="text-sm text-gray-600">
                Show:
                <select
                  value={limit}
                  onChange={(e) => setLimit(parseInt(e.target.value))}
                  className="ml-2 px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </label>
              <button
                onClick={fetchRecentEvents}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="bg-white shadow rounded-lg">
        <div className="divide-y divide-gray-200">
          {events.map((event) => (
            <div key={event.pk} className="px-6 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-medium text-gray-900">
                      <Link
                        href={`/events/${encodeURIComponent(getEventId(event))}`}
                        className="text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
                        title="View event details"
                      >
                        {event.title || "Untitled Event"}
                      </Link>
                    </h3>
                    <span
                      className={`inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-bold leading-none rounded-full ${
                        event.isPublic === true || event.isPublic === "true"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {event.isPublic === true || event.isPublic === "true"
                        ? "Public"
                        : "Pending"}
                    </span>
                  </div>

                  {event.description && (
                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                      {event.description}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-600">
                    {getCategoryDisplay(event.category) && (
                      <div className="flex items-center">
                        <svg
                          className="h-4 w-4 mr-1 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                          />
                        </svg>
                        <span>{getCategoryDisplay(event.category)}</span>
                      </div>
                    )}
                    {(event.location || event.venue) && (
                      <div className="flex items-center">
                        <svg
                          className="h-4 w-4 mr-1 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        <span>{event.venue || event.location}</span>
                      </div>
                    )}
                    {(event.start_date || event.date) && (
                      <div className="flex items-center">
                        <svg
                          className="h-4 w-4 mr-1 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <span>{formatEventDate(event)}</span>
                      </div>
                    )}
                    {event.cost && (
                      <div className="flex items-center">
                        <svg
                          className="h-4 w-4 mr-1 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span>
                          {event.cost.type === "free"
                            ? "Free"
                            : event.cost.amount
                            ? `$${event.cost.amount}`
                            : "Unknown"}
                        </span>
                      </div>
                    )}
                    {event.source && (
                      <div className="flex items-center">
                        <svg
                          className="h-4 w-4 mr-1 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                          />
                        </svg>
                        <span className="capitalize">{event.source}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-2 text-xs text-gray-500">
                    Added: {formatDate(event.createdAt)}
                  </div>
                </div>

                <div className="ml-6 flex items-center space-x-2">
                  <Link
                    href={`/admin/events/${getEventId(event)}`}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    title="Edit event"
                  >
                    <svg
                      className="h-4 w-4 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    Edit
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


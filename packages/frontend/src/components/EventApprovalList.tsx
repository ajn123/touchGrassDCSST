"use client";

import { approveEvent, deleteEvent } from "@/lib/dynamodb-events";
import { useEffect, useState } from "react";

interface Event {
  pk: string;
  title: string;
  description: string;
  email: string;
  category: string;
  location: string;
  eventDate: string;
  createdAt: string;
  isPublic: boolean;
}

interface EventApprovalListProps {
  onEventAction: () => void;
}

export function EventApprovalList({ onEventAction }: EventApprovalListProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingEvents();
  }, []);

  const fetchPendingEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/events?isPublic=false");
      if (!response.ok) {
        throw new Error("Failed to fetch pending events");
      }
      const data = await response.json();
      setEvents(data.events || []);
      // Update the count in the parent component
      onEventAction();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch events");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (eventId: string) => {
    try {
      const result = await approveEvent(eventId);
      if (result.includes("successfully")) {
        // Remove the approved event from the list
        setEvents((prev) => prev.filter((event) => event.pk !== eventId));
        // Show success message
        alert("Event approved successfully!");
        onEventAction(); // Call the prop to refresh the count
      } else {
        throw new Error(result);
      }
    } catch (err) {
      alert(
        `Failed to approve event: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    }
  };

  const handleDelete = async (eventId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this event? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const result = await deleteEvent(eventId);
      if (result.includes("successfully")) {
        // Remove the deleted event from the list
        setEvents((prev) => prev.filter((event) => event.pk !== eventId));
        alert("Event deleted successfully!");
        onEventAction(); // Call the prop to refresh the count
      } else {
        throw new Error(result);
      }
    } catch (err) {
      alert(
        `Failed to delete event: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-2 text-gray-600">Loading pending events...</span>
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No events pending approval
        </h3>
        <p className="text-gray-500">
          All events have been reviewed and approved.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">
          Events Pending Approval ({events.length})
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Review and approve events submitted by users
        </p>
      </div>

      <div className="divide-y divide-gray-200">
        {events.map((event) => (
          <div key={event.pk} className="px-6 py-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <h3 className="text-lg font-medium text-gray-900">
                    <a
                      href={`/items/${encodeURIComponent(event.title)}`}
                      className="text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
                      title="View event details"
                    >
                      {event.title}
                    </a>
                  </h3>
                  <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-bold leading-none text-white bg-yellow-600 rounded-full">
                    Pending
                  </span>
                </div>

                <div className="mt-2 space-y-1 text-sm text-gray-600">
                  <p>
                    <strong>Description:</strong> {event.description}
                  </p>
                  <p>
                    <strong>Category:</strong> {event.category}
                  </p>
                  <p>
                    <strong>Location:</strong> {event.location}
                  </p>
                  {event.eventDate && (
                    <p>
                      <strong>Date:</strong>{" "}
                      {new Date(event.eventDate).toLocaleDateString()}
                    </p>
                  )}
                  <p>
                    <strong>Submitted by:</strong> {event.email}
                  </p>
                  <p>
                    <strong>Submitted:</strong>{" "}
                    {new Date(parseInt(event.createdAt)).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="ml-6 flex space-x-2">
                <button
                  onClick={() => handleApprove(event.pk)}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Approve
                </button>

                <button
                  onClick={() => handleDelete(event.pk)}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
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
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

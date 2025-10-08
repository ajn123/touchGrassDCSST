"use client";

import { useUser } from "@/contexts/UserContext";
import { approveEvent, deleteEvent } from "@/lib/dynamodb/dynamodb-events";
import { useParams, useRouter } from "next/navigation";
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
  is_public: boolean;
  website?: string;
  instagram?: string;
  facebook?: string;
  cost?: any;
  image_url?: string;
  socials?: any;
}

export default function AdminEventDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading } = useUser();
  const [event, setEvent] = useState<Event | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Check if user is admin
  const isAdmin =
    user?.email &&
    [
      "hi@touchgrassdc.com",
      "hello@touchgrassdc.com",
      "admin@example.com",
    ].includes(user.email.toLowerCase());

  useEffect(() => {
    if (!loading && !user) {
      router.push("/admin");
      return;
    }

    if (!loading && !isAdmin) {
      router.push("/admin");
      return;
    }

    if (id && isAdmin) {
      fetchEvent();
    }
  }, [id, user, loading, isAdmin, router]);

  const fetchEvent = async () => {
    try {
      setLoadingEvent(true);
      const response = await fetch(`/api/events/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch event");
      }
      const data = await response.json();
      setEvent(data.event);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch event");
    } finally {
      setLoadingEvent(false);
    }
  };

  const handleApprove = async () => {
    if (!event) return;

    try {
      setActionLoading(true);
      const result = await approveEvent(event.pk);
      if (result.includes("successfully")) {
        alert("Event approved successfully!");
        router.push("/admin?tab=approve-events");
      } else {
        throw new Error(result);
      }
    } catch (err) {
      alert(
        `Failed to approve event: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;

    if (
      !confirm(
        "Are you sure you want to delete this event? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      setActionLoading(true);
      const result = await deleteEvent(event.pk);
      if (result.includes("successfully")) {
        alert("Event deleted successfully!");
        router.push("/admin?tab=approve-events");
      } else {
        throw new Error(result);
      }
    } catch (err) {
      alert(
        `Failed to delete event: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || loadingEvent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600">
            You must be an admin to view this page.
          </p>
          <button
            onClick={() => router.push("/admin")}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Return to Admin Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-900 mb-4">Error</h1>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push("/admin?tab=approve-events")}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Return to Approval List
          </button>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Event Not Found
          </h1>
          <p className="text-gray-600 mb-4">
            The event you're looking for doesn't exist.
          </p>
          <button
            onClick={() => router.push("/admin?tab=approve-events")}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Return to Approval List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push("/admin?tab=approve-events")}
                className="text-gray-600 hover:text-gray-900"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">
                Event Details
              </h1>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {actionLoading ? "Approving..." : "Approve Event"}
              </button>

              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                {actionLoading ? "Deleting..." : "Delete Event"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {/* Event Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {event.title}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Submitted by {event.email}
                </p>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                Pending Approval
              </span>
            </div>
          </div>

          {/* Event Details */}
          <div className="px-6 py-6 space-y-6">
            {/* Description */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Description
              </h3>
              <p className="text-gray-700">{event.description}</p>
            </div>

            {/* Basic Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Event Information
                </h3>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Category
                    </dt>
                    <dd className="text-gray-900">{event.category}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Location
                    </dt>
                    <dd className="text-gray-900">{event.location}</dd>
                  </div>
                  {event.eventDate && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Event Date
                      </dt>
                      <dd className="text-gray-900">
                        {new Date(event.eventDate).toLocaleDateString()}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Submitted
                    </dt>
                    <dd className="text-gray-900">
                      {new Date(parseInt(event.createdAt)).toLocaleDateString()}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Social Media & Cost */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Additional Details
                </h3>
                <dl className="space-y-2">
                  {event.website && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Website
                      </dt>
                      <dd className="text-gray-900">
                        <a
                          href={event.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-800"
                        >
                          {event.website}
                        </a>
                      </dd>
                    </div>
                  )}
                  {event.instagram && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Instagram
                      </dt>
                      <dd className="text-gray-900">{event.instagram}</dd>
                    </div>
                  )}
                  {event.facebook && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Facebook
                      </dt>
                      <dd className="text-gray-900">{event.facebook}</dd>
                    </div>
                  )}
                  {event.cost && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Cost
                      </dt>
                      <dd className="text-gray-900">
                        {event.cost.type === "free"
                          ? "Free"
                          : `$${event.cost.amount}`}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            {/* Event Image */}
            {event.image_url && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Event Image
                </h3>
                <img
                  src={event.image_url}
                  alt={event.title}
                  className="max-w-md h-auto rounded-lg shadow-sm"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

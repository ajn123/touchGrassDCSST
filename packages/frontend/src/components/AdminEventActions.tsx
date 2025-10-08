"use client";

import { approveEvent, deleteEvent } from "@/lib/dynamodb/dynamodb-events";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Event {
  pk: string;
  title: string;
  isPublic: boolean;
}

interface AdminEventActionsProps {
  event: Event;
}

export function AdminEventActions({ event }: AdminEventActionsProps) {
  const router = useRouter();
  const [actionLoading, setActionLoading] = useState(false);

  const handleApprove = async () => {
    try {
      setActionLoading(true);
      const result = await approveEvent(event.pk);
      if (result.includes("successfully")) {
        alert("Event approved successfully!");
        // Refresh the page to show updated status
        router.refresh();
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
        // Redirect to admin dashboard
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

  return (
    <div className="mt-6 p-4 bg-white rounded-lg border">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Admin Actions
      </h3>

      <div className="flex items-center space-x-4 mb-4">
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            event.isPublic
              ? "bg-green-100 text-green-800"
              : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {event.isPublic ? "Public" : "Pending Approval"}
        </span>

        {!event.isPublic && (
          <span className="text-sm text-gray-600">
            This event needs admin approval to become public
          </span>
        )}
      </div>

      <div className="flex space-x-3">
        {!event.isPublic && (
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
        )}

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

        <a
          href={`/items/${encodeURIComponent(event.title)}`}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
          View Event Page
        </a>
      </div>
    </div>
  );
}

"use client";

import { deleteGroup } from "@/lib/dynamodb/dynamodb-groups";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface AdminEntityPanelProps {
  kind: "event" | "group";
  id: string; // event pk or group title
  title: string;
  data: unknown;
}

export function AdminEntityPanel({
  kind,
  id,
  title,
  data,
}: AdminEntityPanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete this ${kind}? This action cannot be undone.`)) return;
    try {
      setLoading(true);
      if (kind === "event") {
        const response = await fetch("/api/events/delete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ eventId: id }),
        });
        const result = await response.json();

        if (result.success && result.message.includes("successfully")) {
          alert("Event deleted successfully!");
          router.push("/admin");
        } else {
          throw new Error(result.message || "Failed to delete event");
        }
      } else {
        // At this point, kind can only be "group"
        const result = await deleteGroup(title);
        if (typeof result === "string" && result.includes("successfully")) {
          alert("Group deleted successfully!");
          router.push("/admin");
        } else {
          throw new Error(
            typeof result === "string" ? result : "Unknown error"
          );
        }
      }
    } catch (err) {
      alert(
        `Failed to delete ${kind}: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold">Admin View</h2>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
        >
          {loading
            ? "Deleting..."
            : kind === "event"
            ? "Delete Event"
            : "Delete Group"}
        </button>
      </div>

      <div className="text-sm mb-2">Raw Data</div>
      <pre className="text-xs overflow-auto p-3 rounded border">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

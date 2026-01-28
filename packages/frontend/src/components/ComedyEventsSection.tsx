"use client";

import { useState } from "react";
import ComedyEventsTab from "./ComedyEventsTab";

interface ComedyEventsSectionProps {
  events: any[];
}

export default function ComedyEventsSection({ events }: ComedyEventsSectionProps) {
  const [activeTab, setActiveTab] = useState<"all" | "comedy">("all");

  return (
    <div className="w-full">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("all")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "all"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            All Events
          </button>
          <button
            onClick={() => setActiveTab("comedy")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "comedy"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Comedy Events
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-8">
        {activeTab === "comedy" ? (
          <div>
            <h2 className="text-3xl font-bold mb-6">Comedy Events - Next 2 Weeks</h2>
            <ComedyEventsTab allEvents={events} />
          </div>
        ) : (
          <div>
            <p className="text-gray-600 mb-4">
              Browse all events or use the search bar above to find specific events.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

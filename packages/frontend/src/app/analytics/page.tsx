"use client";

import { VisitsByDayChart } from "@/components/VisitsByDayChart";
import { useState } from "react";

const ANALYTICS_ACTIONS = [
  "USER_VISIT",
  "EMAIL_SIGNUP",
  "EVENT_PAGE_VISIT",
  "CONTACT_FORM_SUBMISSION",
  "SEARCH",
  "EMAIL_SIGNUP_SUBMISSION",
] as const;

export default function AnalyticsDashboard() {
  const [selectedAction, setSelectedAction] = useState<string>("USER_VISIT");
  const [chartType, setChartType] = useState<"line" | "bar">("bar");

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Analytics Dashboard
        </h1>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Analytics Action
              </label>
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ANALYTICS_ACTIONS.map((action) => (
                  <option key={action} value={action}>
                    {action.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chart Type
              </label>
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value as "line" | "bar")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="line">Line Chart</option>
                <option value="bar">Bar Chart</option>
              </select>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <VisitsByDayChart action={selectedAction} chartType={chartType} />
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">
            How to Use
          </h3>
          <ul className="text-blue-700 space-y-1">
            <li>
              • Select different analytics actions to see their daily trends
            </li>
            <li>
              • Switch between line and bar charts for different visualizations
            </li>
            <li>• The chart shows unique users (grouped by IP) per day</li>
            <li>• Summary statistics are displayed below the chart</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

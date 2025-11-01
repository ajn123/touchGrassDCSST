"use client";

import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import { useEffect, useState } from "react";
import { Bar, Line } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface VisitsByDayChartProps {
  action?: string;
  chartType?: "line" | "bar";
}

interface VisitsByDayData {
  action: string;
  visitsByDay: Record<string, number>;
}

export function VisitsByDayChart({
  action = "USER_VISIT",
  chartType = "bar",
}: VisitsByDayChartProps) {
  const [data, setData] = useState<VisitsByDayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVisitsByDay();
  }, [action]);

  const fetchVisitsByDay = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/statistics/visits-by-day?action=${action}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error("Error fetching visits by day:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading chart data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (!data || !data.visitsByDay) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">No data available</div>
      </div>
    );
  }

  // Sort dates and prepare chart data
  const sortedDates = Object.keys(data.visitsByDay).sort();
  const chartData = {
    labels: sortedDates,
    datasets: [
      {
        label: `Unique Users`,
        data: sortedDates.map((date) => data.visitsByDay[date]),
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        borderWidth: 2,
        fill: chartType === "line",
        tension: 0.1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: `${action} Unique Users by Day`,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  const ChartComponent = chartType === "line" ? Line : Bar;

  return (
    <div className="w-full h-96 p-4">
      <ChartComponent data={chartData} options={options} />

      {/* Summary stats */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div className="bg-blue-50 p-3 rounded">
          <div className="text-2xl font-bold text-blue-600">
            {Object.values(data.visitsByDay).reduce(
              (sum, count) => sum + count,
              0
            )}
          </div>
          <div className="text-sm text-gray-600">Total Unique Users</div>
        </div>
        <div className="bg-green-50 p-3 rounded">
          <div className="text-2xl font-bold text-green-600">
            {sortedDates.length}
          </div>
          <div className="text-sm text-gray-600">Days Tracked</div>
        </div>
        <div className="bg-purple-50 p-3 rounded">
          <div className="text-2xl font-bold text-purple-600">
            {Math.round(
              Object.values(data.visitsByDay).reduce(
                (sum, count) => sum + count,
                0
              ) / sortedDates.length
            ) || 0}
          </div>
          <div className="text-sm text-gray-600">Avg Unique Users/Day</div>
        </div>
      </div>
    </div>
  );
}

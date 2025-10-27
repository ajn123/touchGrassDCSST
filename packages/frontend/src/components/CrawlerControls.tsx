"use client";

import testStepFunctionsNormalization from "@/app/actions/test-step-functions";
import { useState } from "react";
interface CrawlerStatus {
  isRunning: boolean;
  lastRun?: string;
  status?: "success" | "error" | "running";
  message?: string;
  eventsAdded?: number;
  eventsFound?: number;
  savedEvents?: any[];
}

export function CrawlerControls() {
  const [washingtonianStatus, setWashingtonianStatus] = useState<CrawlerStatus>(
    {
      isRunning: false,
    }
  );

  const [openwebninjaStatus, setOpenwebninjaStatus] = useState<CrawlerStatus>({
    isRunning: false,
  });

  const [normalizeStatus, setNormalizeStatus] = useState<CrawlerStatus>({
    isRunning: false,
  });

  const triggerOpenWebNinjaCrawler = async () => {
    setOpenwebninjaStatus({ isRunning: true, status: "running" });

    try {
      const response = await fetch("/api/crawler/openwebninja", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setOpenwebninjaStatus({
          isRunning: false,
          status: "success",
          message: result.message,
          eventsAdded: result.eventsAdded,
          eventsFound: result.eventsFound,
          lastRun: result.timestamp,
        });
      } else {
        setOpenwebninjaStatus({
          isRunning: false,
          status: "error",
          message: result.error || "Unknown error occurred",
        });
      }
    } catch (error) {
      setOpenwebninjaStatus({
        isRunning: false,
        status: "error",
        message: error instanceof Error ? error.message : "Network error",
      });
    }
  };

  const triggerWashingtonianCrawler = async () => {
    setWashingtonianStatus({ isRunning: true, status: "running" });

    try {
      const response = await fetch("/api/crawler/washingtonian", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setWashingtonianStatus({
          isRunning: false,
          status: "success",
          message: result.message,
          eventsAdded: result.eventsAdded,
          eventsFound: result.eventsFound,
          lastRun: result.timestamp,
        });
      } else {
        setWashingtonianStatus({
          isRunning: false,
          status: "error",
          message: result.error || "Unknown error occurred",
        });
      }
    } catch (error) {
      setWashingtonianStatus({
        isRunning: false,
        status: "error",
        message: error instanceof Error ? error.message : "Network error",
      });
    }
  };

  const handleTestNormalizeEvents = async () => {
    setNormalizeStatus({ isRunning: true, status: "running" });

    try {
      const result = await testStepFunctionsNormalization();

      if (result.success) {
        setNormalizeStatus({
          isRunning: false,
          status: "success",
          message: result.message,
          lastRun: result.timestamp,
        });
      } else {
        setNormalizeStatus({
          isRunning: false,
          status: "error",
          message: result.message,
        });
      }
    } catch (error) {
      setNormalizeStatus({
        isRunning: false,
        status: "error",
        message: `❌ Unexpected error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "success":
        return (
          <svg
            className="w-5 h-5 text-green-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "error":
        return (
          <svg
            className="w-5 h-5 text-red-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "running":
        return (
          <svg
            className="w-5 h-5 text-blue-500 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        );
      default:
        return (
          <svg
            className="w-5 h-5 text-gray-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
              clipRule="evenodd"
            />
          </svg>
        );
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "success":
        return "bg-green-50 border-green-200";
      case "error":
        return "bg-red-50 border-red-200";
      case "running":
        return "bg-blue-50 border-blue-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Event Crawlers</h3>
          <p className="mt-1 text-sm text-gray-500">
            Manually trigger event crawlers to fetch new events from external
            sources.
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Event Normalization Test */}
          <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {getStatusIcon(normalizeStatus.status)}
                </div>
                <div>
                  <h4 className="text-lg font-medium text-gray-900">
                    Event Normalization Test
                  </h4>
                  <p className="text-sm text-gray-500">
                    Test the AWS Step Functions workflow for event normalization
                  </p>
                </div>
              </div>
              <button
                onClick={handleTestNormalizeEvents}
                disabled={normalizeStatus.isRunning}
                className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  normalizeStatus.isRunning
                    ? "bg-gray-400 cursor-not-allowed text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500"
                }`}
              >
                {normalizeStatus.isRunning ? (
                  <div className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Testing...
                  </div>
                ) : (
                  "Test Normalization"
                )}
              </button>
            </div>

            {/* Status Message */}
            {normalizeStatus.message && (
              <div
                className={`mt-3 p-3 rounded-md border ${getStatusColor(
                  normalizeStatus.status
                )}`}
              >
                <div className="flex">
                  <div className="flex-shrink-0">
                    {getStatusIcon(normalizeStatus.status)}
                  </div>
                  <div className="ml-3">
                    <p
                      className={`text-sm font-medium ${
                        normalizeStatus.status === "success"
                          ? "text-green-800"
                          : normalizeStatus.status === "error"
                          ? "text-red-800"
                          : normalizeStatus.status === "running"
                          ? "text-blue-800"
                          : "text-gray-800"
                      }`}
                    >
                      {normalizeStatus.message}
                    </p>
                    {normalizeStatus.eventsAdded !== undefined &&
                      normalizeStatus.eventsFound !== undefined && (
                        <p className="mt-1 text-sm text-gray-600">
                          📊 Normalized {normalizeStatus.eventsFound} events,
                          saved {normalizeStatus.eventsAdded} events
                        </p>
                      )}
                    {normalizeStatus.lastRun && (
                      <p className="mt-1 text-xs text-gray-600">
                        Last test:{" "}
                        {new Date(normalizeStatus.lastRun).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Saved Events Display */}
            {normalizeStatus.savedEvents &&
              normalizeStatus.savedEvents.length > 0 && (
                <div className="mt-4">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">
                    📄 Saved Events ({normalizeStatus.savedEvents.length})
                  </h5>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {normalizeStatus.savedEvents.map((event, index) => (
                      <div
                        key={index}
                        className="bg-white border rounded p-3 text-xs"
                      >
                        <div className="font-medium text-gray-900">
                          {event.title}
                        </div>
                        <div className="text-gray-600 mt-1">
                          <div>
                            <strong>ID:</strong> {event.pk}
                          </div>
                          <div>
                            <strong>Date:</strong>{" "}
                            {event.start_date || event.date || "N/A"}
                          </div>
                          <div>
                            <strong>Time:</strong>{" "}
                            {event.start_time || event.time || "N/A"}
                          </div>
                          <div>
                            <strong>Location:</strong> {event.location || "N/A"}
                          </div>
                          <div>
                            <strong>Category:</strong>{" "}
                            {Array.isArray(event.category)
                              ? event.category.join(", ")
                              : event.category || "N/A"}
                          </div>
                          <div>
                            <strong>Source:</strong> {event.source || "N/A"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Test Info */}
            <div className="mt-4 text-sm text-gray-600">
              <p>
                <strong>Test Data:</strong> 3 sample events with different
                formats (Washingtonian, OpenWebNinja, Crawler)
              </p>
              <p>
                <strong>Purpose:</strong> Test AWS Step Functions workflow for
                event normalization
              </p>
              <p>
                <strong>Method:</strong> Server Action → Direct Step Functions
                Call
              </p>
              <p>
                <strong>Workflow:</strong> Server Action → Step Functions →
                Lambda normalization → DynamoDB
              </p>
            </div>
          </div>

          {/* Washingtonian Crawler */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {getStatusIcon(washingtonianStatus.status)}
                </div>
                <div>
                  <h4 className="text-lg font-medium text-gray-900">
                    Washingtonian Events
                  </h4>
                  <p className="text-sm text-gray-500">
                    Crawls events from Washingtonian magazine's events section
                  </p>
                </div>
              </div>
              <button
                onClick={triggerWashingtonianCrawler}
                disabled={washingtonianStatus.isRunning}
                className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  washingtonianStatus.isRunning
                    ? "bg-gray-400 cursor-not-allowed text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500"
                }`}
              >
                {washingtonianStatus.isRunning ? (
                  <div className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Running...
                  </div>
                ) : (
                  "Run Crawler"
                )}
              </button>
            </div>

            {/* Status Message */}
            {washingtonianStatus.message && (
              <div
                className={`mt-3 p-3 rounded-md border ${getStatusColor(
                  washingtonianStatus.status
                )}`}
              >
                <div className="flex">
                  <div className="flex-shrink-0">
                    {getStatusIcon(washingtonianStatus.status)}
                  </div>
                  <div className="ml-3">
                    <p
                      className={`text-sm font-medium ${
                        washingtonianStatus.status === "success"
                          ? "text-green-800"
                          : washingtonianStatus.status === "error"
                          ? "text-red-800"
                          : washingtonianStatus.status === "running"
                          ? "text-blue-800"
                          : "text-gray-800"
                      }`}
                    >
                      {washingtonianStatus.message}
                    </p>
                    {washingtonianStatus.eventsAdded !== undefined &&
                      washingtonianStatus.eventsFound !== undefined && (
                        <p className="mt-1 text-sm text-gray-600">
                          📊 Found {washingtonianStatus.eventsFound} events,
                          added {washingtonianStatus.eventsAdded} new events
                          {washingtonianStatus.eventsFound >
                            washingtonianStatus.eventsAdded && (
                            <span className="text-gray-500">
                              {" "}
                              (
                              {washingtonianStatus.eventsFound -
                                washingtonianStatus.eventsAdded}{" "}
                              duplicates skipped)
                            </span>
                          )}
                        </p>
                      )}
                    {washingtonianStatus.lastRun && (
                      <p className="mt-1 text-xs text-gray-600">
                        Last run:{" "}
                        {new Date(washingtonianStatus.lastRun).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Crawler Info */}
            <div className="mt-4 text-sm text-gray-600">
              <p>
                <strong>Schedule:</strong> Runs automatically every 7 days via
                cron job
              </p>
              <p>
                <strong>Source:</strong> Washingtonian magazine events section
              </p>
              <p>
                <strong>Scope:</strong> Crawls events for the next 3 weeks (21
                days)
              </p>
              <p>
                <strong>Data:</strong> Event titles, descriptions, dates,
                locations, and categories
              </p>
            </div>
          </div>

          {/* OpenWebNinja Crawler */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {getStatusIcon(openwebninjaStatus.status)}
                </div>
                <div>
                  <h4 className="text-lg font-medium text-gray-900">
                    OpenWebNinja Events
                  </h4>
                  <p className="text-sm text-gray-500">
                    Fetches events from OpenWebNinja API for Washington DC area
                  </p>
                </div>
              </div>
              <button
                onClick={triggerOpenWebNinjaCrawler}
                disabled={openwebninjaStatus.isRunning}
                className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  openwebninjaStatus.isRunning
                    ? "bg-gray-400 cursor-not-allowed text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500"
                }`}
              >
                {openwebninjaStatus.isRunning ? (
                  <div className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Running...
                  </div>
                ) : (
                  "Run Crawler"
                )}
              </button>
            </div>

            {/* Status Message */}
            {openwebninjaStatus.message && (
              <div
                className={`mt-3 p-3 rounded-md border ${getStatusColor(
                  openwebninjaStatus.status
                )}`}
              >
                <div className="flex">
                  <div className="flex-shrink-0">
                    {getStatusIcon(openwebninjaStatus.status)}
                  </div>
                  <div className="ml-3">
                    <p
                      className={`text-sm font-medium ${
                        openwebninjaStatus.status === "success"
                          ? "text-green-800"
                          : openwebninjaStatus.status === "error"
                          ? "text-red-800"
                          : openwebninjaStatus.status === "running"
                          ? "text-blue-800"
                          : "text-gray-800"
                      }`}
                    >
                      {openwebninjaStatus.message}
                    </p>
                    {openwebninjaStatus.eventsAdded !== undefined &&
                      openwebninjaStatus.eventsFound !== undefined && (
                        <p className="mt-1 text-sm text-gray-600">
                          📊 Found {openwebninjaStatus.eventsFound} events,
                          added {openwebninjaStatus.eventsAdded} new events
                          {openwebninjaStatus.eventsFound >
                            openwebninjaStatus.eventsAdded && (
                            <span className="text-gray-500">
                              {" "}
                              (
                              {openwebninjaStatus.eventsFound -
                                openwebninjaStatus.eventsAdded}{" "}
                              duplicates skipped)
                            </span>
                          )}
                        </p>
                      )}
                    {openwebninjaStatus.lastRun && (
                      <p className="mt-1 text-xs text-gray-600">
                        Last run:{" "}
                        {new Date(openwebninjaStatus.lastRun).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Crawler Info */}
            <div className="mt-4 text-sm text-gray-600">
              <p>
                <strong>Schedule:</strong> Runs automatically via cron job
              </p>
              <p>
                <strong>Source:</strong> OpenWebNinja API realtime events data
              </p>
              <p>
                <strong>Data:</strong> Event titles, descriptions, dates,
                locations, venues, and ticket links
              </p>
            </div>
          </div>

          {/* Future Crawlers Placeholder */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h4 className="text-lg font-medium text-gray-500">
                  More Crawlers Coming Soon
                </h4>
                <p className="text-sm text-gray-400">
                  Additional event sources will be added here for manual
                  triggering
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

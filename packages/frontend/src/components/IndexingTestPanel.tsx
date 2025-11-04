"use client";

import { useState } from "react";

interface TestStep {
  step: string;
  status: "in_progress" | "success" | "error" | "warning";
  message: string;
  data?: any;
}

interface TestResult {
  steps: TestStep[];
  success: boolean;
  eventId: string | null;
  searchResults: {
    total: number;
    hits: number;
    found: boolean;
    event: any | null;
  } | null;
  searchById?: {
    found: boolean;
    document: any | null;
  };
  error?: string;
}

export function IndexingTestPanel() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [eventId, setEventId] = useState("");
  const [testTitle, setTestTitle] = useState("");

  const runTest = async (useEventId: boolean) => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/admin/test-indexing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId: useEventId ? eventId : undefined,
          testTitle: useEventId ? undefined : testTitle || undefined,
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        steps: [
          {
            step: "error",
            status: "error",
            message: `Failed to run test: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ],
        success: false,
        eventId: null,
        searchResults: null,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "text-green-600 bg-green-50 border-green-200";
      case "error":
        return "text-red-600 bg-red-50 border-red-200";
      case "warning":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "in_progress":
        return "text-blue-600 bg-blue-50 border-blue-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return (
          <svg
            className="w-5 h-5 text-green-600"
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
        );
      case "error":
        return (
          <svg
            className="w-5 h-5 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        );
      case "warning":
        return (
          <svg
            className="w-5 h-5 text-yellow-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        );
      case "in_progress":
        return (
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            OpenSearch Indexing Test
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            This tool tests if an event can be indexed to OpenSearch and then
            found in search results. You can either test with an existing event
            ID or create a new test event.
          </p>

          <div className="space-y-4">
            {/* Test with existing event */}
            <div className="border rounded-lg p-4">
              <h3 className="text-md font-medium text-gray-900 mb-3">
                Test with Existing Event
              </h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                  placeholder="Enter event ID (e.g., EVENT-123)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => runTest(true)}
                  disabled={loading || !eventId.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Testing..." : "Test Event"}
                </button>
              </div>
            </div>

            {/* Create test event */}
            <div className="border rounded-lg p-4">
              <h3 className="text-md font-medium text-gray-900 mb-3">
                Create Test Event
              </h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={testTitle}
                  onChange={(e) => setTestTitle(e.target.value)}
                  placeholder="Test event title (optional)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => runTest(false)}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Creating..." : "Create & Test"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">
                Test Results
              </h2>
              <div
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  result.success
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {result.success ? "✓ Success" : "✗ Failed"}
              </div>
            </div>

            {/* Test Steps */}
            <div className="space-y-3 mb-6">
              {result.steps.map((step, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${getStatusColor(
                    step.status
                  )}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getStatusIcon(step.status)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{step.step}</span>
                        <span className="text-xs opacity-75">
                          {step.status}
                        </span>
                      </div>
                      <p className="text-sm">{step.message}</p>
                      {step.data && (
                        <pre className="mt-2 text-xs bg-white bg-opacity-50 p-2 rounded overflow-auto">
                          {JSON.stringify(step.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            {result.searchResults && (
              <div className="border-t pt-4">
                <h3 className="text-md font-medium text-gray-900 mb-3">
                  Search Results Summary
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Total Results:</span>
                    <span className="ml-2 font-medium">
                      {result.searchResults.total}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Returned:</span>
                    <span className="ml-2 font-medium">
                      {result.searchResults.hits}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Found:</span>
                    <span
                      className={`ml-2 font-medium ${
                        result.searchResults.found
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {result.searchResults.found ? "Yes" : "No"}
                    </span>
                  </div>
                  {result.eventId && (
                    <div>
                      <span className="text-sm text-gray-600">Event ID:</span>
                      <span className="ml-2 font-mono text-xs">
                        {result.eventId}
                      </span>
                    </div>
                  )}
                </div>

                {result.searchResults.event && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      Found Event:
                    </h4>
                    <pre className="text-xs overflow-auto">
                      {JSON.stringify(result.searchResults.event, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Search by ID results */}
            {result.searchById && (
              <div className="border-t pt-4 mt-4">
                <h3 className="text-md font-medium text-gray-900 mb-3">
                  Direct ID Lookup
                </h3>
                <div>
                  <span className="text-sm text-gray-600">Found by ID:</span>
                  <span
                    className={`ml-2 font-medium ${
                      result.searchById.found
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {result.searchById.found ? "Yes" : "No"}
                  </span>
                </div>
                {result.searchById.document && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      Document:
                    </h4>
                    <pre className="text-xs overflow-auto">
                      {JSON.stringify(result.searchById.document, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


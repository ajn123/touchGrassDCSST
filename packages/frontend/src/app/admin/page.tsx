"use client";

import { AddEventForm } from "@/components/AddEventForm";
import { EventApprovalList } from "@/components/EventApprovalList";
import { useEffect, useState } from "react";
import { useUser } from "../../contexts/UserContext";
import { auth, login, logout } from "../actions";

export default function AdminPage() {
  const { user, loading, setUser } = useUser();
  const [localLoading, setLocalLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"add-event" | "approve-events">(
    "add-event"
  );
  const [pendingEventsCount, setPendingEventsCount] = useState(0);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchPendingEventsCount();
    }
  }, [user]);

  useEffect(() => {
    // Check URL parameters for tab selection on mount
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam === 'approve-events') {
      setActiveTab('approve-events');
    }
  }, []);

  const fetchPendingEventsCount = async () => {
    try {
      const response = await fetch("/api/events?is_public=false");
      if (response.ok) {
        const data = await response.json();
        setPendingEventsCount(data.count || 0);
      }
    } catch (error) {
      console.error("Failed to fetch pending events count:", error);
    }
  };

  const checkAuth = async () => {
    try {
      const userData = await auth();
      // Convert false to null for setUser
      if (userData === false) {
        setUser(null);
      } else if (
        userData &&
        typeof userData === "object" &&
        "properties" in userData
      ) {
        // Transform the subject object to match User interface
        setUser({
          id: userData.properties.id,
          email: userData.properties.id, // Use id as email since that's what we store
        });
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setUser(null);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      await login();
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      // Clear user context immediately
      setUser(null);
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (loading || localLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Admin Login
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Access restricted to administrators only
            </p>
          </div>
          <div className="mt-8 space-y-6">
            <div>
              <button
                onClick={handleLogin}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Login with Email
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Navigation */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Admin Dashboard
            </h1>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Logout
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab("add-event")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "add-event"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Add Event
            </button>
            <button
              onClick={() => setActiveTab("approve-events")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "approve-events"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Approve Events
              {pendingEventsCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                  {pendingEventsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Summary */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Add New Event
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      Create events
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div
                    className={`w-8 h-8 rounded-md flex items-center justify-center ${
                      pendingEventsCount > 0 ? "bg-yellow-500" : "bg-green-500"
                    }`}
                  >
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Pending Approval
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {pendingEventsCount} event
                      {pendingEventsCount !== 1 ? "s" : ""}
                    </dd>
                  </dl>
                </div>
                <div className="ml-4">
                  <button
                    onClick={fetchPendingEventsCount}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Refresh count"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Admin User
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {user?.email}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {activeTab === "add-event" ? (
          <AddEventForm />
        ) : (
          <EventApprovalList onEventAction={fetchPendingEventsCount} />
        )}
      </div>
    </div>
  );
}

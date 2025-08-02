"use client";

import { useEffect, useState } from "react";
import { auth, login, logout } from "../actions";
import { useUser } from "../../contexts/UserContext";
import { AddEventForm } from "@/components/AddEventForm";

export default function AdminPage() {
  const { user, loading, setUser } = useUser();
  const [localLoading, setLocalLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const userData = await auth();
      setUser(userData);
    } catch (error) {
      console.error("Auth check failed:", error);
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
      <AddEventForm />
    </div>
  );
} 
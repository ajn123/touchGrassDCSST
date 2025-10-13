"use client";

import Link from "next/link";
import { useUser } from "../contexts/UserContext";

export default function Footer() {
  const { user } = useUser();

  return (
    <footer className="">
      <div className="max-w-7xl mx-auto px-4 py-8 ">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Brand Section */}
          <div className="col-span-1 md:col-span-2 lg:col-span-1">
            <Link href="/" className="text-2xl font-bold transition-colors">
              DC Events
            </Link>
            <p className="mt-2 text-sm">
              Discover the best events happening in Washington DC
            </p>
            {user && (
              <div className="mt-3">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 border border-red-200">
                  <svg
                    className="w-3 h-3 mr-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Admin
                </span>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Navigation</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/search?sortBy=date&sortOrder=asc"
                  className="transition-colors flex items-center"
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
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  Search Events
                </Link>
              </li>
              <li>
                <Link
                  href="/calendar"
                  className="transition-colors flex items-center"
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
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  Calendar
                </Link>
              </li>
              <li>
                <Link href="/add-event" className="transition-colors">
                  Add Event
                </Link>
              </li>
              <li>
                <Link href="/signup-emails" className="transition-colors">
                  Sign up For Emails
                </Link>
              </li>
              <li>
                <Link href="/about" className="transition-colors">
                  Contact
                </Link>
              </li>
              {user && (
                <li>
                  <Link
                    href="/admin"
                    className="transition-colors font-semibold"
                  >
                    Admin
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Get in Touch</h3>
            <div className="space-y-2 text-sm">
              <p>Washington DC Events</p>
              <p>Discover what's happening in the capital</p>
              <div className="mt-4">
                <p className="text-xs">
                  © {new Date().getFullYear()} DC Events. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-300 dark:border-gray-700 mt-8 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm">Built for the DC community</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="/privacy" className="text-sm transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-sm transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

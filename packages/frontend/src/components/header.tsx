"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useUser } from "../contexts/UserContext";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, loading } = useUser();
  const { isDark, toggleTheme, mounted } = useTheme();
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  return (
    <nav
      ref={menuRef}
      className="sticky top-0 z-50 header-nav theme-transition rounded-b-lg"
    >
      <div className="flex flex-row items-center justify-between px-4 py-2">
        {/* Logo/Brand */}
        <div className="flex items-center space-x-2">
          <Link href="/" className="text-xl header-brand">
            DC Events
          </Link>
          {user && (
            <div className="flex items-center">
              <span className="admin-badge inline-flex items-center px-2 py-1 rounded-full text-xs font-medium">
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

        {/* Desktop Navigation */}
        <div className="hidden xl:flex flex-row">
          <Link
            href="/search?sortBy=date&sortOrder=asc"
            className="header-link px-10 py-2 flex items-center"
          >
            <svg
              className="w-4 h-4 mr-1"
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
            Search
          </Link>
          <Link
            href="/groups"
            className="header-link px-10 py-2 flex items-center"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            Groups
          </Link>
          <Link
            href="/calendar"
            className="header-link px-10 py-2 flex items-center"
          >
            <svg
              className="w-4 h-4 mr-1"
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
          <Link
            href="/comedy"
            className="header-link px-10 py-2 flex items-center"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Comedy
          </Link>
          <Link href="/add-event" className="header-link px-10 py-2">
            Add Event
          </Link>
          {/* <Link href="/signup-emails" className="header-link px-10 py-2">
            Sign Up For Emails
          </Link> */}
          <Link href="/about" className="header-link px-10 py-2">
            Contact
          </Link>
          {user && (
            <Link
              href="/admin"
              className="header-link px-10 py-2 font-semibold"
              style={{ color: "var(--accent-primary)" }}
            >
              Admin
            </Link>
          )}
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="header-button px-10 py-2 flex items-center"
            title={
              mounted
                ? isDark
                  ? "Switch to light mode"
                  : "Switch to dark mode"
                : "Loading theme..."
            }
          >
            {!mounted ? (
              <div className="w-4 h-4 mr-1 animate-pulse bg-gray-400 rounded"></div>
            ) : !isDark ? (
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            ) : (
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu Button */}
        <div className="xl:hidden">
          <button
            onClick={toggleMenu}
            className="header-button"
            aria-label="Toggle menu"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="lg:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 footer-border border-t">
            <Link
              href="/search?sortBy=date&sortOrder=asc"
              className="block px-3 py-2 font-medium header-link rounded-md"
              onClick={closeMenu}
            >
              <div className="flex items-center">
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
                Search
              </div>
            </Link>
            <Link
              href="/groups"
              className="block px-3 py-2 text-base font-medium header-link rounded-md"
              onClick={closeMenu}
            >
              <div className="flex items-center">
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
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                Groups
              </div>
            </Link>
            <Link
              href="/calendar"
              className="block px-3 py-2 text-base font-medium header-link rounded-md"
              onClick={closeMenu}
            >
              <div className="flex items-center">
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
              </div>
            </Link>
            <Link
              href="/comedy"
              className="block px-3 py-2 text-base font-medium header-link rounded-md"
              onClick={closeMenu}
            >
              <div className="flex items-center">
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
                    d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Comedy
              </div>
            </Link>
            <Link
              href="/add-event"
              className="block px-3 py-2 text-base font-medium header-link rounded-md"
              onClick={closeMenu}
            >
              Add Event
            </Link>
            {/* <Link
              href="/signup-emails"
              className="block px-3 py-2 text-base font-medium header-link rounded-md"
              onClick={closeMenu}
            >
              Sign Up For Emails
            </Link> */}
            <Link
              href="/about"
              className="block px-3 py-2 text-base font-medium header-link rounded-md"
              onClick={closeMenu}
            >
              Contact
            </Link>
            {user && (
              <Link
                href="/admin"
                className="block px-3 py-2 text-base font-medium header-link rounded-md font-semibold"
                style={{ color: "var(--accent-primary)" }}
                onClick={closeMenu}
              >
                Admin
              </Link>
            )}
            {/* Theme Toggle Button - Mobile */}
            <button
              onClick={toggleTheme}
              className="block px-3 py-2 text-base font-medium header-link rounded-md w-full text-left"
            >
              <div className="flex items-center">
                {!mounted ? (
                  <div className="w-4 h-4 mr-2 animate-pulse bg-gray-400 rounded"></div>
                ) : isDark ? (
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
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                ) : (
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
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    />
                  </svg>
                )}
                {!mounted ? "Loading..." : isDark ? "Light Mode" : "Dark Mode"}
              </div>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

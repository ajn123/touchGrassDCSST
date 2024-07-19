'use client';

import Link from "next/link";
import { useState } from "react";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white rounded-b-lg shadow-lg">
      <div className="flex flex-row items-center justify-between px-4 py-2">
        {/* Logo/Brand */}
        <div className="flex items-center">
          <Link href="/" className="text-xl font-bold text-gray-900">
            DC Events
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex flex-row">
          <Link href="/all-events" className="header-link">All Events</Link>
          <Link href="/add-event" className="header-link">Add Event</Link>
          <Link href="/signup-emails" className="header-link">Sign up For Emails</Link>
          <Link href="/about" className="header-link">About</Link>
          <Link href="/contact" className="header-link">Contact</Link>
        </div>

        {/* Mobile Menu Button */}
        <div className="lg:hidden">
          <button
            onClick={toggleMenu}
            className="text-gray-600 hover:text-gray-900 focus:outline-none focus:text-gray-900"
            aria-label="Toggle menu"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="lg:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 bg-white border-t border-gray-200">
            <Link 
              href="/all-events" 
              className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md"
              onClick={closeMenu}
            >
              All Events
            </Link>
            <Link 
              href="/add-event" 
              className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md"
              onClick={closeMenu}
            >
              Add Event
            </Link>
            <Link 
              href="/signup-emails" 
              className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md"
              onClick={closeMenu}
            >
              Sign up For Emails
            </Link>
            <Link 
              href="/about" 
              className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md"
              onClick={closeMenu}
            >
              About
            </Link>
            <Link 
              href="/contact" 
              className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md"
              onClick={closeMenu}
            >
              Contact
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
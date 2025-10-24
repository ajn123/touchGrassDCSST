"use client";

import {
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Event {
  pk: string;
  title: string;
  start_date?: string;
  end_date?: string;
  date?: string; // For Washingtonian events
  start_time?: string;
  end_time?: string;
  time?: string; // For Washingtonian events
  location?: string;
  category?: string;
  cost?: {
    type: string;
    amount: number | string;
    currency: string;
  };
  image_url?: string;
  description?: string;
  url?: string; // For Washingtonian events
  venue?: string; // For Washingtonian events
  source?: string; // For Washingtonian events
  [key: string]: any; // Allow additional properties from DynamoDB
}

interface CalendarDay {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: Event[];
}

interface MonthlyCalendarProps {
  variant?: "compact" | "full";
  showHeader?: boolean;
  className?: string;
}

export default function MonthlyCalendar({
  variant = "full",
  showHeader = true,
  className = "",
}: MonthlyCalendarProps) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);

  const isCompact = variant === "compact";

  // Get events from API
  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoading(true);
        const response = await fetch("/api/events/simple");
        const data = await response.json();
        setEvents(data.events as Event[]);
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, []);

  // Generate calendar days
  useEffect(() => {
    const generateCalendarDays = () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const today = new Date();

      // First day of the month
      const firstDay = new Date(year, month, 1);
      // Last day of the month
      const lastDay = new Date(year, month + 1, 0);

      // Start from the beginning of the week (Sunday = 0)
      const startDate = new Date(firstDay);
      startDate.setDate(startDate.getDate() - firstDay.getDay());

      // End at the end of the week
      const endDate = new Date(lastDay);
      endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

      const days: CalendarDay[] = [];
      const current = new Date(startDate);

      while (current <= endDate) {
        const dayEvents = events.filter((event) => {
          // Check for both start_date (internal events) and date (Washingtonian events)
          const eventDateStr = event.start_date || event.date;
          if (!eventDateStr) return false;

          // Parse date as local date to avoid timezone issues
          const eventDate = new Date(eventDateStr + "T00:00:00");
          return eventDate.toDateString() === current.toDateString();
        });

        const isToday = current.toDateString() === today.toDateString();

        days.push({
          date: new Date(current),
          dayNumber: current.getDate(),
          isCurrentMonth: current.getMonth() === month,
          isToday,
          events: dayEvents,
        });

        current.setDate(current.getDate() + 1);
      }

      setCalendarDays(days);
    };

    generateCalendarDays();
  }, [currentDate, events]);

  const goToPreviousMonth = () => {
    setCurrentDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
    );
  };

  const goToNextMonth = () => {
    setCurrentDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
    );
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = (time: string) => {
    if (!time) return "";

    // Handle different time formats
    const timeStr = time.toString();
    if (timeStr.includes(":")) {
      const [hours, minutes] = timeStr.split(":");
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? "PM" : "AM";
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    }
    return timeStr;
  };

  const getCostDisplay = (cost: any) => {
    if (!cost) return "Free";
    if (cost.type === "free") return "Free";
    if (cost.type === "unknown") return "Unknown";
    if (cost.type === "variable") return `$${cost.amount}`;
    if (typeof cost.amount === "number") return `$${cost.amount}`;
    return cost.amount || "Unknown";
  };

  const handleEventClick = (event: Event) => {
    // If this is a Washingtonian-sourced event, open the external URL instead
    if (
      typeof event.pk === "string" &&
      (event.pk.startsWith("EVENT#WASHINGTONIAN#") ||
        event.pk.startsWith("EVENT-WASHINGTONIAN-")) &&
      event.url
    ) {
      // Open external details page in a new tab
      window.open(event.url, "_blank", "noopener,noreferrer");
      return;
    }

    // Otherwise navigate to internal event route
    const eventId = event.pk.replace(/^(EVENT-|EVENT#)/, "");
    router.push(`/events/${eventId}`);
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading events...</span>
      </div>
    );
  }

  return (
    <div
      className={`${
        isCompact ? "max-w-7xl mx-auto px-4 py-16" : "max-w-7xl mx-auto p-6"
      } ${className}`}
    >
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between mb-6">
          {isCompact ? (
            <>
              <h2 className="text-4xl font-bold">Event Calendar</h2>
              <Link
                href="/calendar"
                className="hover:text-blue-300 transition-colors text-sm underline"
              >
                View Full Calendar
              </Link>
            </>
          ) : (
            <>
              <button
                onClick={goToPreviousMonth}
                className="p-2 theme-hover-light rounded-lg "
                aria-label="Previous Month"
              >
                <FontAwesomeIcon icon={faChevronLeft} className="text-lg" />
              </button>

              <h2 className="text-2xl font-bold">{formatDate(currentDate)}</h2>

              <button
                onClick={goToNextMonth}
                className="p-2 theme-hover-light rounded-lg transition-colors"
                aria-label="Next Month"
              >
                <FontAwesomeIcon icon={faChevronRight} className="text-lg" />
              </button>
            </>
          )}
        </div>
      )}

      {/* Calendar Grid */}
      <div
        className={`rounded-lg shadow-lg overflow-hidden ${
          isCompact ? "bg-white" : ""
        }`}
      >
        {/* Navigation Header for Compact */}
        {isCompact && (
          <div className="flex items-center justify-between p-4 border-b bg-gray-50">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-700 hover:text-gray-900"
              aria-label="Previous Month"
            >
              <FontAwesomeIcon icon={faChevronLeft} className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-semibold text-gray-900">
              {formatDate(currentDate)}
            </h3>

            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-700 hover:text-gray-900"
              aria-label="Next Month"
            >
              <FontAwesomeIcon icon={faChevronRight} className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Day Headers */}
        <div
          className={`grid grid-cols-7 border-b ${
            isCompact ? "bg-gray-50 border-gray-300" : "border-gray-200"
          }`}
        >
          {(isCompact
            ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
            : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
          ).map((day, index) => (
            <div
              key={index}
              className={`text-center font-medium ${
                isCompact
                  ? "p-2 text-xs text-gray-600 border-r border-gray-300"
                  : "p-3 text-sm"
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => (
            <div
              key={index}
              className={`border-r border-b ${
                isCompact ? "border-gray-300" : "border-gray-200"
              } ${isCompact ? "p-1" : "p-2"} ${
                !day.isCurrentMonth ? "bg-gray-50 text-gray-400" : "bg-white"
              } ${isCompact ? "min-h-[80px]" : "min-h-[200px]"}`}
            >
              {/* Day Number */}
              <div
                className={`font-medium ${isCompact ? "mb-1" : "mb-2"} ${
                  day.isToday
                    ? isCompact
                      ? "bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      : "bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm"
                    : day.isCurrentMonth
                    ? "text-gray-900"
                    : "text-gray-400"
                } ${isCompact ? "text-xs" : "text-sm"}`}
              >
                {day.dayNumber}
              </div>

              {/* Events */}
              <div className={`${isCompact ? "space-y-0.5" : "space-y-1"}`}>
                {day.events
                  .slice(0, isCompact ? 2 : undefined)
                  .map((event, eventIndex) => {
                    const eventId = event.pk.replace(/^(EVENT-|EVENT#)/, "");
                    return (
                      <div
                        key={event.pk}
                        className={`rounded cursor-pointer transition-colors truncate ${
                          isCompact
                            ? "text-xs bg-blue-100 text-blue-800 px-1 py-0.5 hover:bg-blue-200"
                            : "text-xs bg-blue-50 border border-blue-200 p-1 hover:bg-blue-100"
                        }`}
                        title={`${event.title} - ${
                          event.start_time
                            ? formatTime(event.start_time)
                            : event.time
                            ? formatTime(event.time)
                            : ""
                        } - ${event.location || event.venue || "Location TBD"}`}
                        onClick={() => handleEventClick(event)}
                      >
                        <div
                          className={`font-medium ${
                            isCompact ? "text-blue-800" : "text-blue-800"
                          }`}
                        >
                          {event.title}
                        </div>
                        {!isCompact && (event.start_time || event.time) && (
                          <div className="text-blue-600">
                            {formatTime((event.start_time || event.time)!)}
                          </div>
                        )}
                        {!isCompact && (event.location || event.venue) && (
                          <div className="text-blue-500 truncate">
                            {event.location || event.venue}
                          </div>
                        )}
                      </div>
                    );
                  })}

                {isCompact && day.events.length > 2 && (
                  <div className="text-xs text-gray-500 text-center">
                    +{day.events.length - 2}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer for Compact */}
        {isCompact && (
          <div className="p-3 bg-gray-50 text-center">
            <p className="text-xs text-gray-600">
              {events.length} events this month • Click events for details
            </p>
          </div>
        )}
      </div>

      {/* Event Details Modal (optional) for Full */}
      {!isCompact && (
        <div className="mt-6 text-sm">
          <p>
            Click on events to view details. Navigate between months using the
            arrow buttons.
          </p>
        </div>
      )}
    </div>
  );
}

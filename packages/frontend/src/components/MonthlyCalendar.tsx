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
  // Rolling window controls: start date (ET anchored) and window days
  const [windowStartDate, setWindowStartDate] = useState<Date | null>(null);
  const [windowDays, setWindowDays] = useState<number>(30); // initial 30 days

  const isCompact = variant === "compact";

  // Initialize windowStartDate aligned to Sunday of current week (in ET)
  useEffect(() => {
    if (windowStartDate === null) {
      const today = new Date();
      const ET_TIME_ZONE = "America/New_York";
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: ET_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        weekday: "short",
      }).formatToParts(today);

      const map: Record<string, string> = {};
      for (const p of parts) {
        if (p.type !== "literal") map[p.type] = p.value;
      }
      const weekdayMap: Record<string, number> = {
        Sun: 0,
        Mon: 1,
        Tue: 2,
        Wed: 3,
        Thu: 4,
        Fri: 5,
        Sat: 6,
      };
      const weekdayIndex =
        weekdayMap[map.weekday as keyof typeof weekdayMap] ?? 0;

      const daysToSunday = weekdayIndex;
      const alignedDate = new Date(today);
      alignedDate.setDate(alignedDate.getDate() - daysToSunday);
      setWindowStartDate(alignedDate);
    }
  }, [windowStartDate]);

  // Get events from API
  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoading(true);
        const response = await fetch("/api/events/simple");
        const data = await response.json();
        setEvents(data.events as Event[]);
      } catch (error) {
        // console.error("Error fetching events:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, []);

  // Generate calendar days (ET-based) using rolling window
  useEffect(() => {
    if (windowStartDate === null) return; // Wait for initialization

    const generateCalendarDays = () => {
      const today = new Date();
      const todayYmd = getEtYmd(today);

      // windowStartDate is already aligned to Sunday, so use it directly
      const startDate = new Date(windowStartDate);

      // Calculate end date: start from aligned startDate, add windowDays, then round up to end of week
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + (windowDays - 1));

      // Round up to Saturday to complete the week
      const endDateEt = getEtParts(endDate);
      const daysToSaturday = 6 - endDateEt.weekdayIndex;
      endDate.setDate(endDate.getDate() + daysToSaturday);

      const days: CalendarDay[] = [];
      const current = new Date(startDate);
      const currentMonthEt = getEtParts(today).month; // Use ET month for styling

      while (current <= endDate) {
        const currentYmdEt = getEtYmd(current);
        const dayEvents = events.filter((event) => {
          const eventDateStr = event.start_date || event.date; // YYYY-MM-DD
          if (!eventDateStr) return false;
          return eventDateStr === currentYmdEt;
        });

        const isToday = currentYmdEt === todayYmd;

        days.push({
          date: new Date(current),
          dayNumber: current.getDate(),
          isCurrentMonth: getEtParts(current).month === currentMonthEt,
          isToday,
          events: dayEvents,
        });

        current.setDate(current.getDate() + 1);
      }

      setCalendarDays(days);
    };

    generateCalendarDays();
  }, [events, windowStartDate, windowDays]);

  const goToPreviousMonth = () => {
    // Move window back by 4 weeks (28 days) and use 28-day windows after initial
    // windowStartDate is already aligned to Sunday, so just move back 28 days
    setWindowStartDate((prev) => {
      if (prev === null) return null;
      const d = new Date(prev);
      // Move back 28 days (4 weeks) - will still be on Sunday
      d.setDate(d.getDate() - 28);
      return d;
    });
    setWindowDays(28);
  };

  const goToNextMonth = () => {
    // Move window forward by 4 weeks (28 days) and use 28-day windows after initial
    // windowStartDate is already aligned to Sunday, so just move forward 28 days
    setWindowStartDate((prev) => {
      if (prev === null) return null;
      const d = new Date(prev);
      // Move forward 28 days (4 weeks) - will still be on Sunday
      d.setDate(d.getDate() + 28);
      return d;
    });
    setWindowDays(28);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  // Header range formatter in ET (e.g., Oct 29 – Nov 27, 2025)
  const formatEtRange = (start: Date, days: number) => {
    const end = new Date(start);
    end.setDate(end.getDate() + (days - 1));
    const startFmt = new Intl.DateTimeFormat("en-US", {
      timeZone: ET_TIME_ZONE,
      month: "short",
      day: "numeric",
    }).format(start);
    const endFmt = new Intl.DateTimeFormat("en-US", {
      timeZone: ET_TIME_ZONE,
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(end);
    return `${startFmt} – ${endFmt}`;
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

  // East Coast time zone utilities
  const ET_TIME_ZONE = "America/New_York";

  const getEtParts = (date: Date) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: ET_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    }).formatToParts(date);

    const map: Record<string, string> = {};
    for (const p of parts) {
      if (p.type !== "literal") map[p.type] = p.value;
    }
    const weekdayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    return {
      year: Number(map.year),
      month: Number(map.month),
      day: Number(map.day),
      weekdayIndex: weekdayMap[map.weekday as keyof typeof weekdayMap] ?? 0,
    };
  };

  const getEtYmd = (date: Date) => {
    const { year, month, day } = getEtParts(date);
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
      2,
      "0"
    )}`;
  };

  const formatMonthDayET = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: ET_TIME_ZONE,
      month: "short",
      day: "numeric",
    }).format(date);
  };

  const formatDateForUrlET = (date: Date) => getEtYmd(date);

  const formatMonthDay = (date: Date) => {
    // Use ET for display
    return formatMonthDayET(date);
  };

  const formatDateForUrl = (date: Date) => {
    // Format as YYYY-MM-DD in ET
    return formatDateForUrlET(date);
  };

  // const getCostDisplay = (cost: any) => {
  //   if (!cost) return "Free";
  //   if (cost.type === "free") return "Free";
  //   if (cost.type === "unknown") return "Unknown";
  //   if (cost.type === "variable") return `$${cost.amount}`;
  //   if (typeof cost.amount === "number") return `$${cost.amount}`;
  //   return cost.amount || "Unknown";
  // };

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

              <h2 className="text-2xl font-bold">
                {windowStartDate
                  ? formatEtRange(windowStartDate, windowDays)
                  : "Loading..."}
              </h2>

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
              {windowStartDate
                ? formatEtRange(windowStartDate, windowDays)
                : "Loading..."}
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
            <Link
              href={`/calendar/day/${formatDateForUrl(day.date)}`}
              className={`border-r border-b ${
                isCompact ? "border-gray-300" : "border-gray-200"
              } ${isCompact ? "p-1" : "p-2"} ${
                !day.isCurrentMonth ? "bg-gray-50 text-gray-400" : "bg-white"
              } ${isCompact ? "min-h-[80px]" : "min-h-[200px]"}`}
              key={index}
            >
              {/* Day Number */}
              <div
                className={`font-medium ${isCompact ? "mb-1" : "mb-2"} ${
                  day.isToday
                    ? "font-bold text-blue-600"
                    : day.isCurrentMonth
                    ? "text-gray-900"
                    : "text-gray-400"
                } ${isCompact ? "text-xs" : "text-sm"}`}
              >
                {formatMonthDay(day.date)}
              </div>

              {/* Events */}
              <div className={`${isCompact ? "space-y-0.5" : "space-y-1"}`}>
                {day.events
                  .slice(0, isCompact ? 2 : 5)
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

                {day.events.length > 2 && (
                  <div className="text-xs text-gray-500 text-center">
                    +{day.events.length - 2} Show More
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>

        {/* Footer for Compact */}
        {isCompact && (
          <div className="p-3 bg-gray-50 text-center">
            <p className="text-xs text-gray-600">
              Click the day to see more events • Click events for details
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

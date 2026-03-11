"use client";

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
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  // Rolling window controls: start date (ET anchored) and window days
  const [windowStartDate, setWindowStartDate] = useState<Date | null>(null);
  const [windowDays, setWindowDays] = useState<number>(30); // initial 30 days

  // Mobile 3-day view: offset from today (0 = today/tomorrow/day-after)
  const [mobileOffset, setMobileOffset] = useState(0);

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

  // Build mobile 3-day window from today + offset
  const getMobileDays = (): CalendarDay[] => {
    const today = new Date();
    const todayYmd = getEtYmd(today);
    const days: CalendarDay[] = [];

    for (let i = 0; i < 3; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + mobileOffset + i);
      const ymd = getEtYmd(d);
      const dayEvents = events.filter((event) => {
        const eventDateStr = event.start_date || event.date;
        if (!eventDateStr) return false;
        return eventDateStr === ymd;
      });

      days.push({
        date: new Date(d),
        dayNumber: d.getDate(),
        isCurrentMonth: true,
        isToday: ymd === todayYmd,
        events: dayEvents,
      });
    }
    return days;
  };

  const mobileDays = getMobileDays();

  const formatFullDay = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: ET_TIME_ZONE,
      weekday: "long",
      month: "short",
      day: "numeric",
    }).format(date);
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
        isCompact
          ? "max-w-7xl mx-auto px-2 py-8 md:px-4 md:py-16"
          : "max-w-7xl mx-auto p-3 md:p-6"
      } ${className}`}
    >
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between mb-4 md:mb-6">
          {isCompact ? (
            <>
              <h2 className="text-2xl md:text-4xl font-bold">Event Calendar</h2>
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
                className="hidden md:block p-2 theme-hover-light rounded-lg"
                aria-label="Previous Month"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>

              <h2 className="hidden md:block text-2xl font-bold text-center">
                {windowStartDate
                  ? formatEtRange(windowStartDate, windowDays)
                  : "Loading..."}
              </h2>

              <button
                onClick={goToNextMonth}
                className="hidden md:block p-2 theme-hover-light rounded-lg transition-colors"
                aria-label="Next Month"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </>
          )}
        </div>
      )}

      {/* ===== MOBILE: 3-day vertical view ===== */}
      <div className="md:hidden rounded-lg shadow-lg overflow-hidden bg-white dark:bg-gray-800">
        {/* Mobile nav header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
          <button
            onClick={() => setMobileOffset((o) => o - 3)}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-700 dark:text-gray-300"
            aria-label="Previous 3 days"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>

          <div className="text-center">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {formatFullDay(mobileDays[0].date)} – {formatFullDay(mobileDays[2].date)}
            </h3>
            {mobileOffset !== 0 && (
              <button
                onClick={() => setMobileOffset(0)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              >
                Back to today
              </button>
            )}
          </div>

          <button
            onClick={() => setMobileOffset((o) => o + 3)}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-700 dark:text-gray-300"
            aria-label="Next 3 days"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        {/* 3 day cards */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {mobileDays.map((day) => (
            <div key={getEtYmd(day.date)} className="p-3">
              {/* Day header */}
              <Link
                href={`/calendar/day/${formatDateForUrl(day.date)}`}
                className={`block text-sm font-semibold mb-2 ${
                  day.isToday ? "text-blue-600 dark:text-blue-400" : "text-gray-900 dark:text-gray-100"
                }`}
              >
                {formatFullDay(day.date)}
                {day.isToday && (
                  <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full">
                    Today
                  </span>
                )}
              </Link>

              {/* Events list */}
              {day.events.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No events</p>
              ) : (
                <div className="space-y-1.5">
                  {day.events.slice(0, 4).map((event) => (
                    <button
                      key={event.pk}
                      className="rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 p-2 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors w-full text-left"
                      onClick={() => handleEventClick(event)}
                    >
                      <div className="font-medium text-sm text-blue-900 dark:text-blue-200 truncate">
                        {event.title}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {(event.start_time || event.time) && (
                          <span className="text-xs text-blue-600 dark:text-blue-400">
                            {formatTime((event.start_time || event.time)!)}
                          </span>
                        )}
                        {(event.location || event.venue) && (
                          <span className="text-xs text-blue-500 dark:text-blue-400 truncate">
                            {event.location || event.venue}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                  {day.events.length > 4 && (
                    <Link
                      href={`/calendar/day/${formatDateForUrl(day.date)}`}
                      className="block text-xs text-blue-600 dark:text-blue-400 text-center hover:text-blue-800 dark:hover:text-blue-300"
                    >
                      +{day.events.length - 4} more events
                    </Link>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ===== DESKTOP: 7-column grid calendar ===== */}
      <div
        className={`hidden md:block rounded-lg shadow-lg overflow-hidden ${
          isCompact ? "bg-white dark:bg-gray-800" : ""
        }`}
      >
        {/* Navigation Header for Compact */}
        {isCompact && (
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-700 dark:text-gray-300"
              aria-label="Previous Month"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {windowStartDate
                ? formatEtRange(windowStartDate, windowDays)
                : "Loading..."}
            </h3>

            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-700 dark:text-gray-300"
              aria-label="Next Month"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        )}

        {/* Day Headers */}
        <div
          className={`grid grid-cols-7 border-b ${
            isCompact
              ? "bg-gray-50 dark:bg-gray-800/80 border-gray-300 dark:border-gray-700"
              : "border-gray-200 dark:border-gray-700"
          }`}
        >
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
            (day, index) => (
              <div
                key={index}
                className={`text-center font-medium ${
                  isCompact
                    ? "p-2 text-xs text-gray-600 dark:text-gray-400 border-r border-gray-300 dark:border-gray-700"
                    : "p-3 text-sm"
                }`}
              >
                {day}
              </div>
            )
          )}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => (
            <Link
              href={`/calendar/day/${formatDateForUrl(day.date)}`}
              className={`border-r border-b ${
                isCompact ? "border-gray-300 dark:border-gray-700" : "border-gray-200 dark:border-gray-700"
              } ${isCompact ? "p-1" : "p-2"} ${
                !day.isCurrentMonth
                  ? "bg-gray-50 dark:bg-gray-900/50 text-gray-400"
                  : "bg-white dark:bg-gray-800"
              } ${isCompact ? "min-h-[80px]" : "min-h-[200px]"}`}
              key={index}
            >
              {/* Day Number */}
              <div
                className={`font-medium ${isCompact ? "mb-1" : "mb-2"} ${
                  day.isToday
                    ? "font-bold text-blue-600 dark:text-blue-400"
                    : day.isCurrentMonth
                      ? "text-gray-900 dark:text-gray-100"
                      : "text-gray-400"
                } ${isCompact ? "text-xs" : "text-sm"}`}
              >
                {formatMonthDay(day.date)}
              </div>

              {/* Events */}
              <div className={`${isCompact ? "space-y-0.5" : "space-y-1"}`}>
                {day.events
                  .slice(0, isCompact ? 2 : 5)
                  .map((event) => (
                    <div
                      key={event.pk}
                      className={`rounded cursor-pointer transition-colors truncate ${
                        isCompact
                          ? "text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 px-1 py-0.5 hover:bg-blue-200 dark:hover:bg-blue-900/60"
                          : "text-xs bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 p-1 hover:bg-blue-100 dark:hover:bg-blue-900/50"
                      }`}
                      title={`${event.title} - ${
                        event.start_time
                          ? formatTime(event.start_time)
                          : event.time
                            ? formatTime(event.time)
                            : ""
                      } - ${event.location || event.venue || "Location TBD"}`}
                      onClick={(e) => {
                        e.preventDefault();
                        handleEventClick(event);
                      }}
                    >
                      <div className="font-medium text-blue-800 dark:text-blue-200">
                        {event.title}
                      </div>
                      {!isCompact && (event.start_time || event.time) && (
                        <div className="text-blue-600 dark:text-blue-400">
                          {formatTime((event.start_time || event.time)!)}
                        </div>
                      )}
                      {!isCompact && (event.location || event.venue) && (
                        <div className="text-blue-500 dark:text-blue-400 truncate">
                          {event.location || event.venue}
                        </div>
                      )}
                    </div>
                  ))}

                {day.events.length > (isCompact ? 2 : 5) && (
                  <div className="text-xs text-gray-500 text-center">
                    +{day.events.length - (isCompact ? 2 : 5)} more
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>

        {/* Footer for Compact */}
        {isCompact && (
          <div className="p-3 bg-gray-50 dark:bg-gray-800/80 text-center">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Click the day to see more events
            </p>
          </div>
        )}
      </div>

      {/* Footer for Full */}
      {!isCompact && (
        <div className="hidden md:block mt-6 text-sm">
          <p>
            Click on events to view details. Navigate between months using the
            arrow buttons.
          </p>
        </div>
      )}
    </div>
  );
}

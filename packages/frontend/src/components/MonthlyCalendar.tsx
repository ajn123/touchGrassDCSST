"use client";

import { getEvents } from "@/lib/dynamodb/dynamodb-events";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Event {
  pk: string;
  title: string;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  category?: string;
  cost?: {
    type: string;
    amount: number | string;
    currency: string;
  };
  image_url?: string;
  description?: string;
  [key: string]: any; // Allow additional properties from DynamoDB
}

interface CalendarDay {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  events: Event[];
}

export default function MonthlyCalendar() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);

  // Get events from DynamoDB
  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoading(true);
        const fetchedEvents = await getEvents();
        setEvents(fetchedEvents as Event[]);
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
          if (!event.start_date) return false;

          const eventDate = new Date(event.start_date);
          return eventDate.toDateString() === current.toDateString();
        });

        days.push({
          date: new Date(current),
          dayNumber: current.getDate(),
          isCurrentMonth: current.getMonth() === month,
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
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading events...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={goToPreviousMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {formatDate(currentDate)}
        </h2>

        <button
          onClick={goToNextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="p-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300"
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
              className={`min-h-[200px] border-r border-b border-gray-200 dark:border-gray-700 p-2 ${
                !day.isCurrentMonth
                  ? "bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
                  : "bg-white dark:bg-gray-900"
              }`}
            >
              {/* Day Number */}
              <div
                className={`text-sm font-medium mb-2 ${
                  day.isCurrentMonth
                    ? "text-gray-900 dark:text-white"
                    : "text-gray-400 dark:text-gray-500"
                }`}
              >
                {day.dayNumber}
              </div>

              {/* Events */}
              <div className="space-y-1">
                {day.events.map((event, eventIndex) => {
                  const eventId = event.pk.replace(/^(EVENT-|EVENT#)/, "");
                  return (
                    <div
                      key={event.pk}
                      className="text-xs bg-blue-50 border border-blue-200 rounded p-1 hover:bg-blue-100 transition-colors cursor-pointer"
                      title={`${event.title} - ${
                        event.start_time ? formatTime(event.start_time) : ""
                      } - ${event.location || "Location TBD"}`}
                      onClick={() => handleEventClick(event)}
                    >
                      <div className="font-medium text-blue-800 truncate">
                        {event.title}
                      </div>
                      {event.start_time && (
                        <div className="text-blue-600">
                          {formatTime(event.start_time)}
                        </div>
                      )}
                      {event.location && (
                        <div className="text-blue-500 truncate">
                          {event.location}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Event Details Modal (optional) */}
      <div className="mt-6 text-sm text-gray-600 dark:text-gray-400">
        <p>
          Click on events to view details. Navigate between months using the
          arrow buttons.
        </p>
      </div>
    </div>
  );
}

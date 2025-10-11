"use client";

import { getEvents } from "@/lib/dynamodb/dynamodb-events";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Event {
  pk: string;
  title: string;
  start_date?: string;
  start_time?: string;
  location?: string;
  [key: string]: any; // Allow additional properties from DynamoDB
}

interface CalendarDay {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: Event[];
}

export default function CompactCalendar() {
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
          if (!event.start_date) return false;

          const eventDate = new Date(event.start_date);
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

  const handleEventClick = (event: Event) => {
    // Extract the event ID from the pk (remove EVENT- or EVENT# prefix)
    const eventId = event.pk.replace(/^(EVENT-|EVENT#)/, "");
    router.push(`/events/${eventId}`);
  };

  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <span className="ml-2 text-white">Loading calendar...</span>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-7xl mx-auto px-4 py-16">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-4xl font-bold text-white">Event Calendar</h2>
        <Link
          href="/calendar"
          className="text-white hover:text-blue-300 transition-colors text-sm underline"
        >
          View Full Calendar
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
          <button
            onClick={goToPreviousMonth}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <h3 className="text-lg font-semibold text-gray-900">
            {formatDate(currentDate)}
          </h3>

          <button
            onClick={goToNextMonth}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
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
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 bg-gray-50 border-b">
          {["S", "M", "T", "W", "T", "F", "S"].map((day) => (
            <div
              key={day}
              className="p-2 text-center text-xs font-medium text-gray-600"
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
              className={`min-h-[80px] border-r border-b border-gray-200 p-1 ${
                !day.isCurrentMonth ? "bg-gray-50 text-gray-400" : "bg-white"
              }`}
            >
              {/* Day Number */}
              <div
                className={`text-xs font-medium mb-1 ${
                  day.isToday
                    ? "bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center"
                    : day.isCurrentMonth
                    ? "text-gray-900"
                    : "text-gray-400"
                }`}
              >
                {day.dayNumber}
              </div>

              {/* Events */}
              <div className="space-y-0.5">
                {day.events.slice(0, 2).map((event) => (
                  <div
                    key={event.pk}
                    className="text-xs bg-blue-100 text-blue-800 rounded px-1 py-0.5 truncate cursor-pointer hover:bg-blue-200 transition-colors"
                    title={`${event.title} - ${
                      event.start_time ? formatTime(event.start_time) : ""
                    } - ${event.location || "Location TBD"}`}
                    onClick={() => handleEventClick(event)}
                  >
                    {event.title}
                  </div>
                ))}

                {day.events.length > 2 && (
                  <div className="text-xs text-gray-500 text-center">
                    +{day.events.length - 2}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 text-center">
          <p className="text-xs text-gray-600">
            {events.length} events this month • Click events for details
          </p>
        </div>
      </div>
    </section>
  );
}

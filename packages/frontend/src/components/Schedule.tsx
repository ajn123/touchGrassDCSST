"use client";

import {
  faCalendar,
  faClock,
  faMapMarkerAlt,
  faSync,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconSection } from "./IconSection";

interface ScheduleItem {
  // For recurring events
  days?: string[];
  recurrence_type?: string;
  time: string;
  location?: string;

  // For one-time events
  date?: string;
}

interface ScheduleProps {
  schedules: ScheduleItem[];
  className?: string;
}

export function Schedule({ schedules, className = "" }: ScheduleProps) {
  if (!schedules || !Array.isArray(schedules) || schedules.length === 0) {
    return null;
  }

  const formatDays = (days: string[]) => {
    if (days.length === 1) {
      return days[0];
    }
    if (days.length === 2) {
      return `${days[0]} & ${days[1]}`;
    }
    return `${days.slice(0, -1).join(", ")} & ${days[days.length - 1]}`;
  };

  const isRecurringEvent = (schedule: ScheduleItem) => {
    return schedule.days && schedule.recurrence_type;
  };

  const isOneTimeEvent = (schedule: ScheduleItem) => {
    return schedule.date && !schedule.days;
  };

  const getRecurrenceIcon = (schedule: ScheduleItem) => {
    if (isOneTimeEvent(schedule)) {
      return <FontAwesomeIcon icon={faCalendar} className="w-4 h-4" />;
    }

    const type = schedule.recurrence_type || "";
    switch (type.toLowerCase()) {
      case "weekly":
        return <FontAwesomeIcon icon={faSync} className="w-4 h-4" />;
      case "daily":
        return <FontAwesomeIcon icon={faCalendar} className="w-4 h-4" />;
      case "monthly":
        return <FontAwesomeIcon icon={faCalendar} className="w-4 h-4" />;
      default:
        return <FontAwesomeIcon icon={faCalendar} className="w-4 h-4" />;
    }
  };

  const getRecurrenceText = (schedule: ScheduleItem) => {
    if (isOneTimeEvent(schedule)) {
      return "One-time Event";
    }

    const type = schedule.recurrence_type || "";
    switch (type.toLowerCase()) {
      case "weekly":
        return "Weekly";
      case "daily":
        return "Daily";
      case "monthly":
        return "Monthly";
      default:
        return type;
    }
  };

  return (
    <IconSection
      icon={faCalendar}
      iconClassName="text-blue-600"
      className={`my-4 ${className}`}
    >
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-semibold">Schedule</h3>
      </div>

      <div className="ml-12 space-y-4">
        {schedules.map((schedule, index) => (
          <div
            key={index}
            className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
          >
            {/* Header with days/date and recurrence */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-blue-600">
                    {getRecurrenceIcon(schedule)}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">
                      {isOneTimeEvent(schedule)
                        ? schedule.date
                        : schedule.days
                        ? formatDays(schedule.days)
                        : "Schedule"}
                    </div>
                    <div className="text-xs text-gray-600 capitalize">
                      {getRecurrenceText(schedule)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Schedule details */}
            <div className="p-4 space-y-3">
              {/* Time */}
              <div className="flex items-center gap-3">
                <FontAwesomeIcon
                  icon={faClock}
                  className="w-4 h-4 text-gray-500 flex-shrink-0"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {schedule.time}
                  </div>
                  <div className="text-xs text-gray-600">
                    {isOneTimeEvent(schedule) ? "Event Time" : "Meeting Time"}
                  </div>
                </div>
              </div>

              {/* Location */}
              {schedule.location && (
                <div className="flex items-center gap-3">
                  <FontAwesomeIcon
                    icon={faMapMarkerAlt}
                    className="w-4 h-4 text-gray-500 flex-shrink-0"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {schedule.location}
                    </div>
                    <div className="text-xs text-gray-600">
                      {isOneTimeEvent(schedule)
                        ? "Event Location"
                        : "Meeting Location"}
                    </div>
                  </div>
                </div>
              )}
              {schedule.location == null && (
                <div className="text-xs text-gray-600">
                  {isOneTimeEvent(schedule)
                    ? "Check event details for location information"
                    : "Check the group page for more information"}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="ml-12 mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-sm text-gray-600">
          <span className="font-medium">{schedules.length}</span> schedule
          {schedules.length !== 1 ? "s" : ""}
          {schedules.some(isRecurringEvent) && schedules.some(isOneTimeEvent)
            ? " (mix of recurring and one-time events)"
            : schedules.some(isRecurringEvent)
            ? " (recurring meetings)"
            : " (one-time events)"}
        </div>
      </div>
    </IconSection>
  );
}

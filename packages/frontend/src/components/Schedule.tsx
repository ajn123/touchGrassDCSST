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
  days: string[];
  recurrence_type: string;
  time: string;
  location?: string;
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

  const getRecurrenceIcon = (type: string) => {
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

  const getRecurrenceText = (type: string) => {
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
        <h3 className="text-lg font-semibold text-gray-900">Schedule</h3>
      </div>

      <div className="ml-12 space-y-4">
        {schedules.map((schedule, index) => (
          <div
            key={index}
            className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
          >
            {/* Header with days and recurrence */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-blue-600">
                    {getRecurrenceIcon(schedule.recurrence_type)}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">
                      {formatDays(schedule.days)}
                    </div>
                    <div className="text-xs text-gray-600 capitalize">
                      {getRecurrenceText(schedule.recurrence_type)}
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
                  <div className="text-xs text-gray-600">Meeting Time</div>
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
                      Meeting Location
                    </div>
                  </div>
                </div>
              )}
              {schedule.location == null && (
                <div className="text-xs text-gray-600">
                  Check the group page for more information
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="ml-12 mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-sm text-gray-600">
          <span className="font-medium">{schedules.length}</span> recurring
          meeting{schedules.length !== 1 ? "s" : ""} scheduled
        </div>
      </div>
    </IconSection>
  );
}

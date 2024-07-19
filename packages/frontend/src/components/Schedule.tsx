interface ScheduleItem {
  days: string[];
  recurrence_type: string;
  time: string;
}

interface ScheduleProps {
  schedules: ScheduleItem[];
  className?: string;
}

export function Schedule({ schedules, className = '' }: ScheduleProps) {
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
    return `${days.slice(0, -1).join(', ')} & ${days[days.length - 1]}`;
  };

  const getRecurrenceIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'weekly':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'daily':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'monthly':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div className={`space-y-2 my-2 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-700 mb-2">Schedule</h3>
      {schedules.map((schedule, index) => (
        <div key={index} className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex-shrink-0 text-green-600">
            {getRecurrenceIcon(schedule.recurrence_type)}
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-green-800">
              {formatDays(schedule.days)}
            </div>
            <div className="text-xs text-green-600 capitalize">
              {schedule.recurrence_type} • {schedule.time}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 
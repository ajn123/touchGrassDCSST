import MonthlyCalendar from "@/components/MonthlyCalendar";

export default function CalendarPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Event Calendar
          </h1>
          <p className="text-gray-600">
            Browse events by month. Click on events to view details.
          </p>
        </div>

        <MonthlyCalendar />
      </div>
    </div>
  );
}

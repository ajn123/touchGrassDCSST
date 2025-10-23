import MonthlyCalendar from "@/components/MonthlyCalendar";

export default function CalendarPage() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Event Calendar</h1>
          <p>Browse events by month. Click on events to view details.</p>
        </div>

        <MonthlyCalendar />
      </div>
    </div>
  );
}

import MonthlyCalendar from "@/components/MonthlyCalendar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Event Calendar",
  description:
    "Browse Washington DC events by month. Find concerts, comedy, theater, sports, and community events on our interactive calendar.",
  openGraph: {
    title: "Event Calendar | TouchGrass DC",
    description:
      "Browse DC events organized by date. Find something to do every day.",
    url: "https://touchgrassdc.com/calendar",
  },
};

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

"use client";

import FeaturedEvent from "@/components/FeaturedEvent";
import { filterEvents, FilterOptions } from "@/lib/filter-events";
import { useEffect, useState } from "react";

interface ComedyEventsTabProps {
  allEvents: any[];
}

export default function ComedyEventsTab({ allEvents }: ComedyEventsTabProps) {
  const [comedyEvents, setComedyEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Calculate date range for next 2 weeks
    const today = new Date();
    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(today.getDate() + 14);

    const todayStr = today.toISOString().split("T")[0];
    const twoWeeksStr = twoWeeksFromNow.toISOString().split("T")[0];

    // Filter for comedy events in the next 2 weeks
    const filterOptions: FilterOptions = {
      categories: ["comedy"],
      dateRange: {
        start: todayStr,
        end: twoWeeksStr,
      },
      sortBy: "date",
      sortOrder: "asc",
    };

    const filtered = filterEvents(allEvents, filterOptions);
    setComedyEvents(filtered);
    setLoading(false);
  }, [allEvents]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="">Loading comedy events...</p>
      </div>
    );
  }

  if (comedyEvents.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="">No comedy events found for the next two weeks.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {comedyEvents.map((event: any, index: number) => (
        <FeaturedEvent key={`comedy-event-${index}`} event={event} />
      ))}
    </div>
  );
}

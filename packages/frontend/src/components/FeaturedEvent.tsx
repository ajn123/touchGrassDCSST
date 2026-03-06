"use client";

import EventCard from "./EventCard";
import { Cost } from "./Cost";

interface Event {
  pk?: string;
  id?: string;
  title?: string;
  description?: string;
  date?: string | number;
  location?: string;
  venue?: string;
  image_url?: string;
  imageKey?: string;
  cost?: {
    type: string;
    currency?: string;
    amount?: string | number;
  };
  category?: string;
}

export default function FeaturedEvent({ event }: { event: Event }) {
  const eventTitle = event.title || "";
  const displayVenue = [event.venue, event.location].find(
    (v) => v && !v.toLowerCase().includes("unknown")
  ) || "";

  const formatDate = (date: string | number) => {
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return undefined;
      return d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    } catch {
      return undefined;
    }
  };

  return (
    <EventCard
      href={`/events/${encodeURIComponent(eventTitle)}`}
      title={eventTitle}
      imageUrl={event.image_url}
      category={event.category}
      venue={displayVenue}
      date={event.date ? formatDate(event.date) : undefined}
    >
      <Cost cost={event.cost} />
    </EventCard>
  );
}

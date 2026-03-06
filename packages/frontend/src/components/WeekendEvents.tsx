import Link from "next/link";
import EventCard from "./EventCard";

interface WeekendEvent {
  pk?: string;
  title?: string;
  start_date?: string;
  start_time?: string;
  venue?: string;
  image_url?: string;
  category?: string | string[];
}

export default function WeekendEvents({ events }: { events: WeekendEvent[] }) {
  if (events.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <svg
            className="w-6 h-6 text-amber-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <h2 className="text-2xl font-bold text-white">
            Happening This Weekend
          </h2>
        </div>
        <Link
          href="/search?sortBy=date&sortOrder=asc"
          className="text-sm font-medium flex items-center"
          style={{ color: "var(--accent-primary)" }}
        >
          View all
          <svg
            className="w-4 h-4 ml-1"
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
        </Link>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {events.map((event) => {
          const eventId = event.pk || "";
          const category = Array.isArray(event.category)
            ? event.category[0]
            : event.category;
          const venue =
            event.venue && !event.venue.toLowerCase().includes("unknown")
              ? event.venue
              : undefined;

          let dateStr: string | undefined;
          if (event.start_date) {
            dateStr = new Date(
              event.start_date + "T00:00:00"
            ).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            });
            if (event.start_time) dateStr += ` at ${event.start_time}`;
          }

          return (
            <EventCard
              key={eventId}
              href={`/events/${encodeURIComponent(eventId)}`}
              title={event.title || "Event"}
              imageUrl={event.image_url}
              category={category}
              venue={venue}
              date={dateStr}
            />
          );
        })}
      </div>
    </section>
  );
}

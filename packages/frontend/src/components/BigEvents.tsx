import Link from "next/link";
import EventCard from "./EventCard";

interface BigEvent {
  pk?: string;
  title?: string;
  start_date?: string;
  start_time?: string;
  venue?: string;
  image_url?: string;
  category?: string | string[];
}

export default function BigEvents({ events }: { events: BigEvent[] }) {
  if (events.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <svg
            className="w-6 h-6 text-orange-400"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
          <h2
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Don&apos;t Miss This Weekend
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
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
              badge="Don't Miss"
            />
          );
        })}
      </div>
    </section>
  );
}

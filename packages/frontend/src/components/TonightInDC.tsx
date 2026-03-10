import Link from "next/link";
import EventCard from "./EventCard";

interface TonightEvent {
  pk?: string;
  title?: string;
  start_date?: string;
  start_time?: string;
  venue?: string;
  image_url?: string;
  category?: string | string[];
}

export default function TonightInDC({ events }: { events: TonightEvent[] }) {
  if (events.length < 2) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <svg
            className="w-6 h-6 text-yellow-400"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z" />
          </svg>
          <h2
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Tonight in DC
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
        {events.slice(0, 8).map((event) => {
          const eventId = event.pk || "";
          const category = Array.isArray(event.category)
            ? event.category[0]
            : event.category;
          const venue =
            event.venue && !event.venue.toLowerCase().includes("unknown")
              ? event.venue
              : undefined;

          const dateStr = event.start_time
            ? `Today at ${event.start_time}`
            : "Tonight";

          return (
            <EventCard
              key={eventId}
              href={`/events/${encodeURIComponent(eventId)}`}
              title={event.title || "Event"}
              imageUrl={event.image_url}
              category={category}
              venue={venue}
              date={dateStr}
              badge="Tonight"
            />
          );
        })}
      </div>
    </section>
  );
}

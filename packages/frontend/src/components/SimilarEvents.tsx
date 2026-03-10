import EventCard from "./EventCard";

interface SimilarEvent {
  pk?: string;
  title?: string;
  start_date?: string;
  start_time?: string;
  venue?: string;
  image_url?: string;
  category?: string | string[];
}

export default function SimilarEvents({ events }: { events: SimilarEvent[] }) {
  if (events.length < 2) return null;

  return (
    <section className="mt-10 mb-6">
      <div className="flex items-center gap-2 mb-5">
        <svg
          className="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 24 24"
          style={{ color: "var(--accent-primary)" }}
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
        <h2
          className="text-xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          You Might Also Like
        </h2>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {events.slice(0, 6).map((event) => {
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

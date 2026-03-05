import { resolveImageUrl, shouldBeUnoptimized } from "@/lib/image-utils";
import Image from "next/image";
import Link from "next/link";

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {events.map((event) => {
          const eventId = event.pk || "";
          const category = Array.isArray(event.category)
            ? event.category[0]
            : event.category;

          return (
            <Link
              key={eventId}
              href={`/events/${encodeURIComponent(eventId)}`}
              className="group bg-gray-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-amber-500 transition-all"
            >
              <div className="relative h-40">
                <Image
                  src={resolveImageUrl(event.image_url, category, event.title, event.venue)}
                  alt={event.title || "Event"}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  unoptimized={shouldBeUnoptimized(
                    resolveImageUrl(event.image_url, category, event.title, event.venue)
                  )}
                />
                {category && (
                  <span className="absolute top-2 left-2 text-xs bg-black/60 text-white px-2 py-0.5 rounded">
                    {category}
                  </span>
                )}
              </div>
              <div className="p-3">
                <h3 className="text-sm font-semibold text-white line-clamp-2 group-hover:text-amber-400 transition-colors">
                  {event.title}
                </h3>
                {event.start_date && (
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(event.start_date + "T00:00:00").toLocaleDateString(
                      "en-US",
                      {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      }
                    )}
                    {event.start_time && ` at ${event.start_time}`}
                  </p>
                )}
                {event.venue && !event.venue.toLowerCase().includes("unknown") && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {event.venue}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

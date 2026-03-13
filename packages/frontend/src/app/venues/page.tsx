import { TouchGrassDynamoDB } from "@/lib/dynamodb/TouchGrassDynamoDB";
import type { Metadata } from "next";
import Link from "next/link";
import { Resource } from "sst";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Event Venues in DC",
  description:
    "Browse event venues in Washington DC. Find upcoming events at 9:30 Club, Kennedy Center, DC Improv, The Anthem, and more.",
  openGraph: {
    title: "Event Venues in DC | TouchGrass DC",
    description:
      "Browse event venues in Washington DC and see what's happening at each one.",
    url: "https://touchgrassdc.com/venues",
  },
};

interface VenueInfo {
  name: string;
  eventCount: number;
  categories: string[];
  nextDate: string | undefined;
  location: string | undefined;
}

function getUniqueVenues(events: any[]): VenueInfo[] {
  const venueMap = new Map<
    string,
    { count: number; categories: Set<string>; nextDate: string | undefined; location: string | undefined }
  >();

  for (const event of events) {
    const venue = event.venue;
    if (!venue || venue.toLowerCase().includes("unknown")) continue;

    const existing = venueMap.get(venue);
    if (existing) {
      existing.count++;
      if (event.category) {
        const cat = Array.isArray(event.category) ? event.category[0] : event.category;
        if (cat) existing.categories.add(cat);
      }
      if (event.start_date && (!existing.nextDate || event.start_date < existing.nextDate)) {
        existing.nextDate = event.start_date;
      }
      if (!existing.location && event.location) {
        existing.location = event.location;
      }
    } else {
      const cats = new Set<string>();
      if (event.category) {
        const cat = Array.isArray(event.category) ? event.category[0] : event.category;
        if (cat) cats.add(cat);
      }
      venueMap.set(venue, {
        count: 1,
        categories: cats,
        nextDate: event.start_date,
        location: event.location,
      });
    }
  }

  return Array.from(venueMap.entries())
    .map(([name, info]) => ({
      name,
      eventCount: info.count,
      categories: Array.from(info.categories).slice(0, 3),
      nextDate: info.nextDate,
      location: info.location,
    }))
    .sort((a, b) => b.eventCount - a.eventCount);
}

export default async function VenuesPage() {
  const db = new TouchGrassDynamoDB(Resource.Db.name);
  const events = await db.getCurrentAndFutureEvents();
  const venues = getUniqueVenues(events);

  return (
    <main className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-2 text-center">Event Venues</h1>
        <p className="text-center mb-8 theme-text-secondary">
          {venues.length} venues with upcoming events in DC
        </p>

        {venues.length === 0 ? (
          <p className="text-center py-12 theme-text-secondary">
            No venues with upcoming events found.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {venues.map((venue) => (
              <Link
                key={venue.name}
                href={`/venues/${encodeURIComponent(venue.name)}`}
                className="block p-5 rounded-xl border border-[var(--text-tertiary)] hover:border-emerald-500 transition-colors theme-bg-secondary"
              >
                <div className="flex items-start justify-between mb-2">
                  <h2 className="text-lg font-semibold theme-text-primary leading-tight">
                    {venue.name}
                  </h2>
                  <span className="ml-2 shrink-0 text-sm font-medium bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                    {venue.eventCount}
                  </span>
                </div>
                {venue.location && (
                  <p className="text-sm theme-text-secondary mb-2 line-clamp-1">
                    {venue.location}
                  </p>
                )}
                {venue.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {venue.categories.map((cat) => (
                      <span
                        key={cat}
                        className="text-xs px-2 py-0.5 rounded-full theme-bg-primary theme-text-secondary"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

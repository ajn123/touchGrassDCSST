export const dynamic = "force-dynamic";
export const revalidate = 0;

import EventCard from "@/components/EventCard";
import { Cost } from "@/components/Cost";
import EventMap from "@/components/EventMap";
import { TouchGrassDynamoDB } from "@/lib/dynamodb/TouchGrassDynamoDB";
import { resolveImageUrl } from "@/lib/image-utils";
import type { Metadata } from "next";
import Link from "next/link";
import { Resource } from "sst";

async function getVenueEvents(venueName: string) {
  const db = new TouchGrassDynamoDB(Resource.Db.name);
  const allEvents = await db.getCurrentAndFutureEvents();
  const nameLower = venueName.toLowerCase();
  return allEvents
    .filter((e) => e.venue?.toLowerCase() === nameLower)
    .sort((a, b) => {
      if (!a.start_date) return 1;
      if (!b.start_date) return -1;
      return a.start_date.localeCompare(b.start_date);
    });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>;
}): Promise<Metadata> {
  const awaitedParams = await params;
  const venueName = decodeURIComponent(awaitedParams.name);
  const events = await getVenueEvents(venueName);

  if (events.length === 0) {
    return { title: `${venueName} Events | TouchGrass DC` };
  }

  const description = `${events.length} upcoming event${events.length === 1 ? "" : "s"} at ${venueName} in Washington DC. Find shows, performances, and things to do.`;

  return {
    title: `${venueName} Events in DC`,
    description,
    openGraph: {
      title: `${venueName} Events | TouchGrass DC`,
      description,
      type: "website",
      url: `https://touchgrassdc.com/venues/${encodeURIComponent(venueName)}`,
      siteName: "TouchGrass DC",
    },
    twitter: {
      card: "summary",
      title: `${venueName} Events | TouchGrass DC`,
      description,
    },
  };
}

function formatDate(date: string | number | undefined) {
  if (!date) return undefined;
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
}

export default async function VenueDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const awaitedParams = await params;
  const venueName = decodeURIComponent(awaitedParams.name);
  const events = await getVenueEvents(venueName);

  const location = events.find((e) => e.location)?.location;
  const coordinates = events.find((e) => e.coordinates)?.coordinates;
  const categories = [
    ...new Set(
      events
        .map((e) => (Array.isArray(e.category) ? e.category[0] : e.category))
        .filter(Boolean)
    ),
  ];

  const placeJsonLd: any = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: venueName,
    url: `https://touchgrassdc.com/venues/${encodeURIComponent(venueName)}`,
  };
  if (location) {
    placeJsonLd.address = {
      "@type": "PostalAddress",
      streetAddress: location,
      addressLocality: "Washington",
      addressRegion: "DC",
    };
  }
  if (coordinates) {
    const [lat, lng] = coordinates.split(",").map(Number);
    if (!isNaN(lat) && !isNaN(lng)) {
      placeJsonLd.geo = {
        "@type": "GeoCoordinates",
        latitude: lat,
        longitude: lng,
      };
    }
  }

  return (
    <main className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(placeJsonLd) }}
      />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm theme-text-secondary">
          <Link href="/venues" className="hover:underline">
            Venues
          </Link>
          <span className="mx-2">/</span>
          <span className="theme-text-primary">{venueName}</span>
        </nav>

        {/* Venue header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{venueName}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 theme-text-secondary">
            {location && (
              <span className="flex items-center gap-1">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                {location}
              </span>
            )}
            <span>
              {events.length} upcoming event{events.length !== 1 && "s"}
            </span>
          </div>
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {categories.map((cat) => (
                <span
                  key={cat}
                  className="text-xs px-2.5 py-1 rounded-full theme-bg-secondary theme-text-secondary border border-[var(--text-tertiary)]"
                >
                  {cat}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Map */}
        {(coordinates || location) && (
          <div className="mb-8 rounded-xl overflow-hidden">
            <EventMap
              coordinates={coordinates}
              address={location}
              eventTitle={venueName}
              className="h-64 w-full"
            />
          </div>
        )}

        {/* Events */}
        {events.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-xl font-semibold mb-2">No upcoming events</p>
            <p className="theme-text-secondary">
              There are no upcoming events at {venueName} right now.
            </p>
            <Link
              href="/venues"
              className="inline-block mt-4 text-emerald-600 hover:underline"
            >
              Browse all venues
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => {
              const displayVenue =
                [event.venue, event.location].find(
                  (v) => v && !v.toLowerCase().includes("unknown")
                ) || "";

              return (
                <EventCard
                  key={event.pk || event.title}
                  href={`/events/${encodeURIComponent(event.title || event.pk)}`}
                  title={event.title || ""}
                  imageUrl={event.image_url}
                  category={event.category}
                  venue={displayVenue}
                  date={formatDate(event.start_date)}
                >
                  <Cost cost={event.cost} />
                </EventCard>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

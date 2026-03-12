import MapViewClient from "@/components/MapViewClient";
import { TouchGrassDynamoDB } from "@/lib/dynamodb/TouchGrassDynamoDB";
import type { Metadata } from "next";
import { Resource } from "sst";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Event Map | DC Events on a Map",
  description:
    "Explore Washington DC events on an interactive map. Find concerts, comedy, sports, community events, and more happening near you.",
  openGraph: {
    title: "Event Map | TouchGrass DC",
    description:
      "Explore DC events on an interactive map. Find what's happening near you.",
    url: "https://touchgrassdc.com/map",
  },
};

// Known DC venue coordinates for backfilling events without coordinates
const VENUE_COORDINATES: Record<string, string> = {
  "9:30 club": "38.9198,-77.0236",
  "the anthem": "38.8782,-77.0232",
  "the fillmore silver spring": "38.9951,-77.0293",
  "echostage": "38.9186,-76.9726",
  "pearl street warehouse": "38.8785,-77.0237",
  "union stage": "38.8781,-77.0234",
  "black cat": "38.9145,-77.0354",
  "the hamilton live": "38.8976,-77.0323",
  "blues alley": "38.9047,-77.0604",
  "dc improv": "38.9068,-77.0416",
  "the comedy loft of dc": "38.9006,-77.0356",
  "capital one arena": "38.8981,-77.0209",
  "nationals park": "38.8730,-77.0074",
  "audi field": "38.8686,-77.0128",
  "arena stage": "38.8690,-77.0245",
  "kennedy center": "38.8957,-77.0556",
  "national theatre": "38.8953,-77.0289",
  "warner theatre": "38.8966,-77.0263",
  "ford's theatre": "38.8967,-77.0256",
  "woolly mammoth theatre": "38.8971,-77.0224",
  "atlas performing arts center": "38.8942,-76.9942",
  "national museum of american history": "38.8912,-77.0300",
  "national air and space museum": "38.8882,-77.0199",
  "smithsonian national zoo": "38.9296,-77.0497",
  "artechouse": "38.8867,-77.0231",
  "the wharf": "38.8782,-77.0235",
  "city winery dc": "38.9024,-77.0032",
  "union market": "38.9085,-76.9949",
  "dock5 at union market": "38.9085,-76.9949",
  "the national mall": "38.8893,-77.0281",
  "busboys and poets": "38.9053,-77.0422",
  "love in action dc": "38.9072,-77.0369",
  "anacostia watershed society": "38.8629,-76.9858",
  "workbox washington dc - dupont circle": "38.9087,-77.0428",
  "capitol view neighborhood library": "38.8318,-76.9965",
  "bender jcc of greater washington": "39.0840,-77.1530",
  "wolf trap": "38.9364,-77.2654",
  "signature theatre": "38.8617,-77.0622",
  "studio theatre": "38.9124,-77.0285",
  "the phillips collection": "38.9115,-77.0468",
};

function backfillCoordinates(event: any): any {
  if (event.coordinates) return event;
  if (!event.venue) return event;
  const venueKey = event.venue.toLowerCase().trim();
  // Exact match
  if (VENUE_COORDINATES[venueKey]) {
    return { ...event, coordinates: VENUE_COORDINATES[venueKey] };
  }
  // Partial match
  for (const [known, coords] of Object.entries(VENUE_COORDINATES)) {
    if (venueKey.includes(known) || known.includes(venueKey)) {
      return { ...event, coordinates: coords };
    }
  }
  return event;
}

export default async function MapPage() {
  const db = new TouchGrassDynamoDB(Resource.Db.name);
  const events = await db.getCurrentAndFutureEvents();

  // Backfill coordinates from known venue map, then filter to events with valid coordinates
  const eventsWithCoordinates = events
    .map(backfillCoordinates)
    .filter((event: any) => {
      if (!event.coordinates) return false;
      const parts = event.coordinates.split(",").map((c: string) => c.trim());
      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      if (isNaN(lat) || isNaN(lng)) return false;
      // Only show events in the DMV area (DC / Maryland / Virginia)
      return lat >= 38.3 && lat <= 39.5 && lng >= -78.0 && lng <= -76.5;
    });

  // Extract unique categories for the filter panel
  const categories = Array.from(
    new Set(
      eventsWithCoordinates
        .map((e: any) => (Array.isArray(e.category) ? e.category[0] : e.category))
        .filter(Boolean)
    )
  ).sort() as string[];

  return (
    <main>
      <MapViewClient events={eventsWithCoordinates as any} categories={categories} />
    </main>
  );
}

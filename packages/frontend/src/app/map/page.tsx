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

export default async function MapPage() {
  const db = new TouchGrassDynamoDB(Resource.Db.name);
  const events = await db.getCurrentAndFutureEvents();

  // Pre-filter to events with valid coordinates on the server
  const eventsWithCoordinates = events.filter((event: any) => {
    if (!event.coordinates) return false;
    const parts = event.coordinates.split(",").map((c: string) => c.trim());
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    return !isNaN(lat) && !isNaN(lng);
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

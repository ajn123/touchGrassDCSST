import ComedyEventsTab from "@/components/ComedyEventsTab";
import { TouchGrassDynamoDB } from "@/lib/dynamodb/TouchGrassDynamoDB";
import type { Metadata } from "next";
import { Resource } from "sst";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Comedy Events in DC",
  description:
    "Upcoming comedy shows at DC Improv, DC Comedy Loft, and more. Find stand-up, improv, and sketch comedy events in Washington DC.",
  openGraph: {
    title: "Comedy Events in DC | TouchGrass DC",
    description:
      "Upcoming comedy shows at DC Improv, DC Comedy Loft, and more venues in Washington DC.",
    url: "https://touchgrassdc.com/comedy",
  },
};

export default async function ComedyEventsPage() {
  const db = new TouchGrassDynamoDB(Resource.Db.name);
  
  // Fetch current and future events only (not past events)
  const events = await db.getCurrentAndFutureEvents();

  return (
    <main className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-2 text-center">
          Comedy Events
        </h1>
        <p className="text-center mb-8">
          Upcoming comedy events in DC for the next two weeks
        </p>
        
        <ComedyEventsTab allEvents={events} />
      </div>
    </main>
  );
}

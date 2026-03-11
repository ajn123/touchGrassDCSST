import VolunteerEventsTab from "@/components/VolunteerEventsTab";
import { TouchGrassDynamoDB } from "@/lib/dynamodb/TouchGrassDynamoDB";
import type { Metadata } from "next";
import { Resource } from "sst";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Volunteer Events in DC",
  description:
    "Find volunteer opportunities in Washington DC. Cleanups, shelter work, garden days, outreach walks, and more from Love In Action DC and other organizations.",
  openGraph: {
    title: "Volunteer Events in DC | TouchGrass DC",
    description:
      "Volunteer opportunities in Washington DC — cleanups, shelter work, garden days, and community service.",
    url: "https://touchgrassdc.com/volunteer",
  },
};

export default async function VolunteerEventsPage() {
  const db = new TouchGrassDynamoDB(Resource.Db.name);
  const events = await db.getCurrentAndFutureEvents();

  return (
    <main className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-2 text-center">
          Volunteer Events
        </h1>
        <p className="text-center mb-8">
          Upcoming volunteer opportunities in DC for the next 8 weeks
        </p>

        <VolunteerEventsTab allEvents={events} />
      </div>
    </main>
  );
}

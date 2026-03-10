import ConcertEventsTab from "@/components/ConcertEventsTab";
import { TouchGrassDynamoDB } from "@/lib/dynamodb/TouchGrassDynamoDB";
import type { Metadata } from "next";
import { Resource } from "sst";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Concerts in DC | Live Music in Washington DC",
  description:
    "Upcoming concerts and live music events in Washington DC. Find shows at The Anthem, 9:30 Club, Kennedy Center, Echostage, and more DC venues.",
  openGraph: {
    title: "Concerts in DC | TouchGrass DC",
    description:
      "Upcoming concerts and live music at DC's best venues — The Anthem, 9:30 Club, Kennedy Center, Echostage, and more.",
    url: "https://touchgrassdc.com/concerts",
  },
};

export default async function ConcertsPage() {
  const db = new TouchGrassDynamoDB(Resource.Db.name);
  const events = await db.getCurrentAndFutureEvents();

  return (
    <main className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-2 text-center">
          Concerts & Live Music
        </h1>
        <p className="text-center mb-8">
          Upcoming concerts in DC for the next four weeks
        </p>

        <ConcertEventsTab allEvents={events} />
      </div>
    </main>
  );
}

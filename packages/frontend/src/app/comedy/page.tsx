import ComedyEventsTab from "@/components/ComedyEventsTab";
import { TouchGrassDynamoDB } from "@/lib/dynamodb/TouchGrassDynamoDB";
import { Resource } from "sst";

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

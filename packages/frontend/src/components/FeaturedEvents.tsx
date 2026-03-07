import { TouchGrassDynamoDB } from "@/lib/dynamodb/TouchGrassDynamoDB";
import { Resource } from "sst";
import FeaturedEvent from "./FeaturedEvent";

export default async function FeaturedEvents() {
  try {
    console.log("🔄 FeaturedEvents: Starting to fetch events...");
    const db = new TouchGrassDynamoDB(Resource.Db.name);
    const allEvents = await db.getEvents();
    console.log("📊 FeaturedEvents: Fetched events:", allEvents.length);

    if (allEvents.length === 0) {
      console.log("⚠️ FeaturedEvents: No events returned from getEvents()");
      return (
        <section className="max-w-7xl mx-auto px-4 py-16">
          <h2 className="text-4xl font-bold mb-8 text-center theme-text-primary">
            Featured Events
          </h2>
          <div className="text-center theme-text-secondary">
            <p>No events available at the moment.</p>
            <p className="text-sm mt-2">
              Check back later for upcoming events!
            </p>
          </div>
        </section>
      );
    }

    // Filter events that have an image_url
    const eventsWithImages = allEvents.filter((event: any) => event.image_url);
    console.log(
      "🖼️ FeaturedEvents: Events with images:",
      eventsWithImages.length
    );

    if (eventsWithImages.length === 0) {
      console.log("⚠️ FeaturedEvents: No events have image_url");
      return (
        <section className="max-w-7xl mx-auto px-4 py-16">
          <h2 className="text-4xl font-bold mb-8 text-center theme-text-primary">
            Featured Events
          </h2>
          <div className="text-center theme-text-secondary">
            <p>Events are available but images are still loading.</p>
            <p className="text-sm mt-2">Please check back soon!</p>
          </div>
        </section>
      );
    }

    // Get 5 random events from those with images
    const shuffled = eventsWithImages.sort(() => 0.5 - Math.random());
    const featuredEvents = shuffled.slice(0, 5);
    console.log(
      "🎯 FeaturedEvents: Selected featured events:",
      featuredEvents.length
    );

    return (
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-4xl font-bold mb-8 text-center theme-text-primary">
          Featured Events
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {featuredEvents.map((event: any) => (
            <FeaturedEvent key={event.eventTitle} event={event} />
          ))}
        </div>
      </section>
    );
  } catch (error) {
    console.error("❌ FeaturedEvents: Error fetching featured events:", error);
    return (
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-4xl font-bold mb-8 text-center theme-text-primary">
          Featured Events
        </h2>
        <div className="text-center theme-text-secondary">
          <p>Unable to load events at the moment.</p>
          <p className="text-sm mt-2">Please try again later.</p>
        </div>
      </section>
    );
  }
}

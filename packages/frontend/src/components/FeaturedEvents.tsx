import { getEvents } from '@/lib/dynamodb-events';
import FeaturedEvent from './FeaturedEvent';

export default async function FeaturedEvents() {
  try {
    const allEvents = await getEvents();
    
    // Filter events that have an image_url
    const eventsWithImages = allEvents.filter((event: any) => event.image_url);
    
    // Get 5 random events from those with images
    const shuffled = eventsWithImages.sort(() => 0.5 - Math.random());
    const featuredEvents = shuffled.slice(0, 5);

    if (featuredEvents.length === 0) {
      return null;
    }

    return (
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-4xl font-bold mb-8 text-center text-white">Featured Events</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {featuredEvents.map((event: any) => (
            <FeaturedEvent key={event.pk || event.id} event={event} />
          ))}
        </div>
      </section>
    );
  } catch (error) {
    console.error('Error fetching featured events:', error);
    return null;
  }
} 
import { getEvents } from '@/lib/dynamodb-events';
import Link from 'next/link';
import { DateDisplay } from '@/components/Date';
import { Cost } from '@/components/Cost';
import Image from 'next/image';
import { resolveImageUrl } from "@/lib/image-utils";

export default async function AllEventsPage() {
  const events = await getEvents();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8 text-center">All Events</h1>
        
        {events.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No events found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event: any) => (
              <Link 
                key={event.pk || event.id} 
                href={`/items/${encodeURIComponent(event.title || '')}`}
                className="block"
              >
                <div className="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                  {/* Event Image */}
                  <div className="relative h-48">
                    {event.image_url ? (
                      <Image
                        src={resolveImageUrl(event.image_url) || "/images/placeholder.jpg"}
                        alt={event.title || 'Event'}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-500">No Image</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Event Details */}
                  <div className="p-6">
                    {event.date && (
                      <div className="mb-2">
                        <DateDisplay date={event.date} />
                      </div>
                    )}
                    
                    <h3 className="text-xl font-semibold mb-2 text-black">{event.title}</h3>
                    <p className="text-gray-600 mb-4">{event.venue || event.location}</p>
                    
                    {event.cost && (
                      <div className="mb-2">
                        <Cost cost={event.cost} />
                      </div>
                    )}
                    
                    {event.category && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {Array.isArray(event.category) ? (
                          event.category.map((cat: string, index: number) => (
                            <span 
                              key={index}
                              className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                            >
                              {cat}
                            </span>
                          ))
                        ) : (
                          event.category.split(',').map((cat: string, index: number) => (
                            <span 
                              key={index}
                              className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                            >
                              {cat.trim()}
                            </span>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 
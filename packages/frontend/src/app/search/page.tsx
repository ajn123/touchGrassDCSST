import { getEvents } from '@/lib/dynamodb-events';
import Link from 'next/link';
import { DateDisplay } from '@/components/Date';
import { Cost } from '@/components/Cost';
import Image from 'next/image';
import { resolveImageUrl } from "@/lib/image-utils";

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const searchQuery = params.q || '';
  const allEvents = await getEvents();
  
  // Filter events based on search query
  const filteredEvents = allEvents.filter((event: any) => 
    event.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-4ont-bold mb-4 text-center">
          Search Results
        </h1>
        
        {searchQuery && (
          <p className="text-center text-gray-600 mb-8">
            Showing results for "{searchQuery}"
          </p>
        )}
        
        {filteredEvents.length ===0? (
          <div className="text-center py-12">
            <p className="text-gray-600">
              {searchQuery ? `No events found for "${searchQuery}"` : 'No search query provided'}
            </p>
            <Link 
              href="/"
              className="text-blue-600over:text-blue-800 underline"
            >
              Return to homepage
            </Link>
          </div>
        ) : (
          <div>
            <p className="text-center text-gray-600 mb-8">
              Found {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((event: any) => (
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
                                className="px-2 py-1 bg-green-100ext-green-80xt-xs rounded-full"
                              >
                                {cat}
                              </span>
                            ))
                          ) : (
                            event.category.split(',').map((cat: string, index: number) => (
                              <span 
                                key={index}
                                className="px-2 py-1 bg-green-100ext-green-80xt-xs rounded-full"
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
          </div>
        )}
      </div>
    </div>
  );
} 
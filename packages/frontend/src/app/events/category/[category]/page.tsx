import { getEventsByCategory } from '@/lib/dynamodb-events';
import Link from 'next/link';
import { EventItem } from '@/components/EventItem';
import { notFound } from 'next/navigation';

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;
  const decodedCategory = decodeURIComponent(category);
  
  const events = await getEventsByCategory(decodedCategory);

  if (!events || events.length === 0) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link 
          href="/" 
          className="text-blue-600 hover:text-blue-200 mb-4 inline-bloc text-white"
        >
          ← Back to All Events
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 text-white">
          Events in {decodedCategory}
        </h1>
        <p className="text-white mt-2">
          {events.length} event{events.length !== 1 ? 's' : ''} found
        </p>
      </div>

      <div className="space-y-4">
        {events.map((event: any) => (
          <EventItem 
            key={event.pk || event.id} 
            event={event}
            />
        ))}
      </div>

      {events.length === 0 && (
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            No events found in {decodedCategory}
          </h2>
          <p className="text-gray-600 mb-4">
            There are currently no events in this category.
          </p>
          <Link 
            href="/" 
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Browse All Events
          </Link>
        </div>
      )}
    </div>
  );
} 
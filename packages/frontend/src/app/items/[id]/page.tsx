import { PrivateImage } from "@/components/PrivateImage";
import { LoadingImage } from "@/components/LoadingImage";
import { getEventByTitle } from "@/lib/dynamodb-events";
import { Suspense } from "react";
import { Cost } from "@/components/Cost";
import { DateDisplay } from "@/components/Date";
import { Schedule } from "@/components/Schedule";
import { Socials } from "@/components/Socials";
import { Description } from "@/components/Description";
import EventMap from "@/components/EventMap";
import Categories from "@/components/Categories";
import { resolveImageUrl } from "@/lib/image-utils";
import { DeleteButton } from "@/components/delete-button";
import { auth } from "@/app/actions";

export default async function ItemPage({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ id: string }>;
  searchParams: Promise<{ delay?: string }>;
}) {
  const user = await auth();
  const awaitedParams = await params;

  // This runs on the server during rendering
  const item = await getEventByTitle(decodeURIComponent(awaitedParams.id));

  console.log(item);
  if (!item) {
    return <div>Item not found</div>;
  }

  // Parse delay from query parameter for testing
  const resolvedSearchParams = await searchParams;
  const artificialDelay = resolvedSearchParams.delay ? parseInt(resolvedSearchParams.delay) : 0;

  return (
    <div className="container" style={{ marginTop: '2rem', backgroundColor: 'white', padding: '2rem', borderRadius: '1rem' }}>

      {user && <DeleteButton eventId={item.pk} />}

      {artificialDelay > 0 && (
        <div style={{ marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#f0f0f0', borderRadius: '0.5rem' }}>
          <strong>Test Mode:</strong> Artificial delay of {artificialDelay}ms enabled
        </div>
      )}

      {/* Admin Mode - Show all event details */}
      {user && (
        <div className="mb-8 p-4 bg-gray-50 rounded-lg border">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Admin View - Complete Event Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Basic Information</h3>
              <div className="space-y-2 text-sm">
                <div><strong>Event ID:</strong> {item.pk}</div>
                <div><strong>Title:</strong> {item.title || 'Not specified'}</div>
                <div><strong>Email:</strong> {item.email || 'Not specified'}</div>
                <div><strong>Created:</strong> {item.createdAt ? new Date(parseInt(item.createdAt)).toLocaleString() : 'Not available'}</div>
                <div><strong>Updated:</strong> {item.updatedAt ? new Date(parseInt(item.updatedAt)).toLocaleString() : 'Not available'}</div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Event Details</h3>
              <div className="space-y-2 text-sm">
                <div><strong>Date:</strong> {item.eventDate ? new Date(item.eventDate).toLocaleDateString() : 'Not specified'}</div>
                <div><strong>Location:</strong> {item.location || 'Not specified'}</div>
                <div><strong>Coordinates:</strong> {item.coordinates || 'Not specified'}</div>
                <div><strong>Category:</strong> {item.category || 'Not specified'}</div>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <h3 className="font-semibold text-gray-700 mb-2">Description</h3>
            <div className="text-sm bg-white p-3 rounded border">
              {item.description || 'No description provided'}
            </div>
          </div>

          {item.cost && (
            <div className="mt-4">
              <h3 className="font-semibold text-gray-700 mb-2">Cost Information</h3>
              <div className="text-sm bg-white p-3 rounded border">
                <pre>{JSON.stringify(item.cost, null, 2)}</pre>
              </div>
            </div>
          )}

          {item.socials && (
            <div className="mt-4">
              <h3 className="font-semibold text-gray-700 mb-2">Social Media</h3>
              <div className="text-sm bg-white p-3 rounded border">
                <pre>{JSON.stringify(item.socials, null, 2)}</pre>
              </div>
            </div>
          )}

          {item.schedules && (
            <div className="mt-4">
              <h3 className="font-semibold text-gray-700 mb-2">Schedules</h3>
              <div className="text-sm bg-white p-3 rounded border">
                <pre>{JSON.stringify(item.schedules, null, 2)}</pre>
              </div>
            </div>
          )}

          <div className="mt-4">
            <h3 className="font-semibold text-gray-700 mb-2">All Event Data (Raw)</h3>
            <div className="text-xs bg-gray-900 text-green-400 p-3 rounded border overflow-auto max-h-96">
              <pre>{JSON.stringify(item, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Public View - Enhanced display */}
      <div className="border-t pt-6">
        <h1 className="text-3xl font-bold mb-6">{item.title}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div>
            {item.cost && <Cost cost={item.cost} />}
          </div>
          <div>
            {item.socials && <Socials socials={item.socials} />}
          </div>
          <div>
            {item.eventDate && <DateDisplay date={item.eventDate} />}
          </div>
        </div>

        {item.description && (
          <div className="mb-6">
            <Description description={item.description} />
          </div>
        )}

        {/* Categories Section */}
        {item.category && (
          <div className="mb-6">
            <Categories 
              displayMode="display" 
              eventCategories={item.category} 
            />
          </div>
        )}

        {/* Image and Map Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Image Section */}
          <div>
            <Suspense fallback={<LoadingImage size="lg" />}>
              {item.imageKey ? (
                <PrivateImage imageKey={item.imageKey} className="w-full" artificialDelay={artificialDelay} />
              ) : item.image_url ? (
                <img 
                  src={resolveImageUrl(item.image_url) || "/images/placeholder.jpg"} 
                  alt={item.title || 'Event'} 
                  className="w-full rounded-lg shadow-md" 
                />
              ) : (
                <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                  <span className="text-gray-500">No image available</span>
                </div>
              )}
            </Suspense>
          </div>

          {/* Map Section */}
          {(item.coordinates || item.location) && (
            <div>
              <h2 className="text-xl font-semibold mb-3">Location</h2>
              <EventMap 
                coordinates={item.coordinates}
                address={item.location}
                eventTitle={item.title}
                className="mb-4"
              />
            </div>
          )}
        </div>

        {/* Schedules */}
        {item.schedules && (
          <div className="mb-6">
            <Schedule schedules={item.schedules} />
          </div>
        )}

        {/* Additional Fields */}
        {Object.entries(item)
          .filter(([key]) => ![
            'pk', 'sk', 'cost', 'id', 'description', 'title', 'createdAt', 'updatedAt',
            'image_url', 'coordinates', 'location', 'socials', 'email', 'category',
            'schedules', 'eventDate'
          ].includes(key))
          .map(([key, value]) => (
            <div key={key} className="mb-2 p-3 bg-gray-50 rounded">
              <strong className="text-gray-700">{key}:</strong> {
                key === 'date' && value ? (
                  typeof value === 'string' || typeof value === 'number' || value instanceof Date ? 
                    <DateDisplay date={value} /> : 
                    `Invalid date format: ${typeof value}`
                ) :
                value === null ? 'null' :
                value === undefined ? 'undefined' :
                typeof value === 'object' ? JSON.stringify(value) :
                typeof value === 'number' && (key === 'createdAt' || key === 'updatedAt') ? 
                  new Date(value).toLocaleString() :
                String(value)
              }
            </div>
          ))}
      </div>
    </div>
  );
} 
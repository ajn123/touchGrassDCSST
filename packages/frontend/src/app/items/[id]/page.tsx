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

export default async function ItemPage({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ id: string }>;
  searchParams: Promise<{ delay?: string }>;
}) {

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

      {artificialDelay > 0 && (
        <div style={{ marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#f0f0f0', borderRadius: '0.5rem' }}>
          <strong>Test Mode:</strong> Artificial delay of {artificialDelay}ms enabled
        </div>
      )}

      {/* Title and Description */}
      {item.title && <h1 className="text-2xl font-bol my-4">{item.title}</h1>}

      <div className="flex flex-row my-4">
      {item.cost && <Cost cost={item.cost} />}
      </div>

      <div className="flex flex-row">
      {item.socials && <Socials socials={item.socials} />}
      </div>

      <div className="flex flex-row">
      {item.description && <Description description={item.description} />}
      </div>

      {/* Categories Section */}
      {item.category && (
        <Categories 
          displayMode="display" 
          eventCategories={item.category} 
        />
      )}

      {/* Image and Map Section - Horizontal on larger screens, vertical on smaller */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Image Section */}
        <div>
          <Suspense fallback={
            <LoadingImage size="lg" />
          }>
            {
              item.imageKey ? (
                <PrivateImage imageKey={item.imageKey} className="w-full" artificialDelay={artificialDelay} />
              ) : item.image_url ? (
                <img src={resolveImageUrl(item.image_url) || "/images/placeholder.jpg"} alt={item.title || 'Event'} className="w-full" />
              ) : null
            }
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

        <br />

        {item.schedules && <Schedule schedules={item.schedules} />}
      </div>

      {Object.entries(item)
        .filter(([key]) => ![
          'pk',
          'sk',
          'cost',
          'id',
          'description',
          'title',
          'createdAt',
          'updatedAt',
          'image_url',
          'coordinates',
          'location',
          'socials',
          'email',
          'category',
          'schedules'
        ].includes(key))
        .map(([key, value]) => (
        <div key={key} style={{ marginBottom: '0.5rem' }}>
          <strong>{key}:</strong> {
            key === 'date' && value ? (
              typeof value === 'string' || typeof value === 'number' || value instanceof Date ? 
                <DateDisplay date={value} /> : 
                `Invalid date format: ${typeof value}`
            ) :
            key === 'schedules' ? <Schedule schedules={value} /> :
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
  );
} 
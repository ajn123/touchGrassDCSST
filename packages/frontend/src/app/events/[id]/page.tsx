import { auth } from "@/app/actions";
import { AdminEventActions } from "@/components/AdminEventActions";
import Categories from "@/components/Categories";
import { Cost } from "@/components/Cost";
import { DateDisplay } from "@/components/Date";
import { Description } from "@/components/Description";
import EventMap from "@/components/EventMap";
import { EventPageTracker } from "@/components/EventPageTracker";
import { JsonEditor } from "@/components/JsonEditor";
import { LoadingImage } from "@/components/LoadingImage";
import { Location } from "@/components/Location";
import { PrivateImage } from "@/components/PrivateImage";
import { ReportWrongInfoButton } from "@/components/ReportWrongInfoButton";
import { Schedule } from "@/components/Schedule";
import { Socials } from "@/components/Socials";
import { getEventByTitle } from "@/lib/dynamodb/dynamodb-events";
import { resolveImageUrl } from "@/lib/image-utils";
import { Suspense } from "react";

export default async function ItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ delay?: string }>;
}) {
  const user = await auth();
  const awaitedParams = await params;

  // Check if user is admin
  const isAdmin =
    user &&
    user.properties &&
    user.properties.id &&
    [
      "hi@touchgrassdc.com",
      "hello@touchgrassdc.com",
      "admin@example.com",
    ].includes(user.properties.id.toLowerCase());

  const WHITELIST: any = [];

  // This runs on the server during rendering
  const item = await getEventByTitle(decodeURIComponent(awaitedParams.id));

  console.log(item);
  if (!item) {
    return <div>Item not found</div>;
  }

  // Check if event is public - if not, only admins can see it
  if (!(item.is_public || item.isPublic) && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Event Not Available
          </h1>
          <p className="text-gray-600 mb-4">
            This event is currently private and not available for public
            viewing.
          </p>
          <p className="text-sm text-gray-500">
            Please check back later or contact an administrator if you believe
            this is an error.
          </p>
        </div>
      </div>
    );
  }

  // Parse delay from query parameter for testing
  const resolvedSearchParams = await searchParams;
  const artificialDelay = resolvedSearchParams.delay
    ? parseInt(resolvedSearchParams.delay)
    : 0;

  return (
    <div
      className="container"
      style={{
        marginTop: "2rem",
        backgroundColor: "white",
        padding: "2rem",
        borderRadius: "1rem",
      }}
    >
      {/* Client-side analytics tracking */}
      <EventPageTracker eventId={awaitedParams.id} />
      {artificialDelay > 0 && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.5rem",
            backgroundColor: "#f0f0f0",
            borderRadius: "0.5rem",
          }}
        >
          <strong>Test Mode:</strong> Artificial delay of {artificialDelay}ms
          enabled
        </div>
      )}

      {/* Admin Mode - Show all event details */}
      {isAdmin && (
        <div className="mb-8 p-4 bg-gray-50 rounded-lg border">
          <h2 className="text-xl font-bold mb-4 text-gray-800">
            Admin View - Complete Event Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">
                Basic Information
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <strong>Event ID:</strong> {item.pk}
                </div>
                <div>
                  <strong>Title:</strong> {item.title || "Not specified"}
                </div>
                <div>
                  <strong>Email:</strong> {item.email || "Not specified"}
                </div>
                <div>
                  <strong>Created:</strong>{" "}
                  {item.createdAt
                    ? new Date(parseInt(item.createdAt)).toLocaleString()
                    : "Not available"}
                </div>
                <div>
                  <strong>Updated:</strong>{" "}
                  {item.updatedAt
                    ? new Date(parseInt(item.updatedAt)).toLocaleString()
                    : "Not available"}
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-700 mb-2">
                Event Details
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <strong>Date:</strong>{" "}
                  {item.eventDate
                    ? new Date(item.eventDate).toLocaleDateString()
                    : "Not specified"}
                </div>
                <div>
                  <strong>Location:</strong> {item.location || "Not specified"}
                </div>
                <div>
                  <strong>Coordinates:</strong>{" "}
                  {item.coordinates || "Not specified"}
                </div>
                <div>
                  <strong>Category:</strong> {item.category || "Not specified"}
                </div>
              </div>
            </div>
          </div>

          {/* Admin Actions */}
          <AdminEventActions
            event={{
              pk: item.pk,
              title: item.title,
              isPublic: item.is_public || item.isPublic || false,
            }}
          />

          {/* JSON Editor for Admins */}
          <div className="mt-6">
            <JsonEditor eventId={item.pk} initialData={item} />
          </div>
        </div>
      )}

      {/* Public View - Enhanced display */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">{item.title}</h1>
          <ReportWrongInfoButton eventTitle={item.title} eventId={item.pk} />
        </div>

        {/* Image and Map Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Image Section */}
          <Suspense fallback={<LoadingImage size="lg" />}>
            {item.imageKey ? (
              <PrivateImage
                imageKey={item.imageKey}
                className="w-full"
                artificialDelay={artificialDelay}
              />
            ) : item.image_url ? (
              <img
                src={
                  resolveImageUrl(item.image_url) || "/images/placeholder.jpg"
                }
                alt={item.title || "Event"}
                className="w-full rounded-lg shadow-md"
              />
            ) : (
              <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-gray-500">No image available</span>
              </div>
            )}
          </Suspense>

          <div className="grid grid-cols-1">
            <div className="space-y-4">
              {<Cost cost={item.cost} />}
              {item.socials && <Socials socials={item.socials} />}

              {item.eventDate && <DateDisplay date={item.eventDate} />}
              {item.location && <Location location={item.location} />}
              {item.category && (
                <Categories
                  displayMode="display"
                  eventCategories={item.category}
                />
              )}
              {item.schedules && <Schedule schedules={item.schedules} />}
            </div>
          </div>
        </div>
        <hr className="my-6 border-t border-gray-800" />

        {item.description && (
          <div className="mb-6">
            <Description description={item.description} />
          </div>
        )}

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

        {/* Additional Fields */}
        {Object.entries(item)
          .filter(([key]) => WHITELIST.includes(key))
          .map(([key, value]) => (
            <div key={key} className="mb-2 p-3 bg-gray-50 rounded">
              <strong className="text-gray-700">{key}:</strong>{" "}
              {key === "date" && value ? (
                typeof value === "string" ||
                typeof value === "number" ||
                value instanceof Date ? (
                  <DateDisplay date={value} />
                ) : (
                  `Invalid date format: ${typeof value}`
                )
              ) : value === null ? (
                "null"
              ) : value === undefined ? (
                "undefined"
              ) : typeof value === "object" ? (
                JSON.stringify(value)
              ) : typeof value === "number" &&
                (key === "createdAt" || key === "updatedAt") ? (
                new Date(value).toLocaleString()
              ) : (
                String(value) + ""
              )}
            </div>
          ))}
      </div>
    </div>
  );
}

import { auth } from "@/app/actions";
import { AdminEntityPanel } from "@/components/AdminEntityPanel";
import { DateDisplay } from "@/components/Date";
import DetailPageContainer from "@/components/DetailPageContainer";
import { EntityDetail } from "@/components/EntityDetail";
import EventMap from "@/components/EventMap";
import { ReportWrongInfoButton } from "@/components/ReportWrongInfoButton";
import { TouchGrassDynamoDB } from "@/lib/dynamodb/TouchGrassDynamoDB";
import { resolveImageUrl } from "@/lib/image-utils";
import { Resource } from "sst";

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
  const rawId = awaitedParams.id;
  const decodedId = decodeURIComponent(rawId);

  const db = new TouchGrassDynamoDB(Resource.Db.name);
  // Try by primary key/id first; if not found, try by event title
  let item = await db.getEvent(decodedId);
  if (!item) {
    item = await db.getEventByTitle(decodedId);
  }

  console.log(item);
  if (!item) {
    return <div>Item not found</div>;
  }

  // Check if event is public - if not, only admins can see it
  if (!item.isPublic && !isAdmin) {
    return (
      <div
        className="min-h-screen flex items-center justify-center mb-10
      "
      >
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
    <DetailPageContainer>
      {/* Analytics handled centrally in middleware */}
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
        <AdminEntityPanel
          kind="event"
          id={item.pk}
          title={item.title}
          data={item}
        />
      )}

      {/* Public View - Enhanced display */}
      <EntityDetail
        title={item.title}
        rightActionNode={
          <ReportWrongInfoButton eventTitle={item.title} eventId={item.pk} />
        }
        imageUrl={resolveImageUrl(item.image_url)}
        cost={item.cost}
        socials={item.socials ? item.socials : { website: item.url }}
        date={item.start_date as any}
        location={item.location}
        categories={item.category}
        description={item.description}
      />

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
    </DetailPageContainer>
  );
}

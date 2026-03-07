export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth } from "@/app/actions";
import { AdminEntityPanel } from "@/components/AdminEntityPanel";
import { DateDisplay } from "@/components/Date";
import DetailPageContainer from "@/components/DetailPageContainer";
import { EntityDetail } from "@/components/EntityDetail";
import { EventPageTracker } from "@/components/EventPageTracker";
import EventMap from "@/components/EventMap";
import { ReportWrongInfoButton } from "@/components/ReportWrongInfoButton";
import { ShareButton } from "@/components/ShareButton";
import { isAdminEmail } from "@/lib/admin-utils";
import { TouchGrassDynamoDB } from "@/lib/dynamodb/TouchGrassDynamoDB";
import { resolveImageUrl } from "@/lib/image-utils";
import type { Metadata } from "next";
import { Resource } from "sst";

async function getEvent(id: string) {
  const decodedId = decodeURIComponent(id);
  const db = new TouchGrassDynamoDB(Resource.Db.name);
  let item = await db.getEvent(decodedId);
  if (!item) {
    item = await db.getEventByTitle(decodedId);
  }
  return item;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const awaitedParams = await params;
  const item = await getEvent(awaitedParams.id);

  if (!item) {
    return { title: "Event Not Found" };
  }

  const description = item.description
    ? item.description.substring(0, 160).replace(/<[^>]*>/g, "")
    : `${item.title} in Washington DC`;
  const imageUrl = resolveImageUrl(item.image_url);

  return {
    title: item.title,
    description,
    openGraph: {
      title: item.title,
      description,
      type: "article",
      url: `https://touchgrassdc.com/events/${encodeURIComponent(awaitedParams.id)}`,
      images: imageUrl ? [{ url: imageUrl, width: 1200, height: 630 }] : [],
      siteName: "TouchGrass DC",
    },
    twitter: {
      card: "summary_large_image",
      title: item.title,
      description,
      images: imageUrl ? [imageUrl] : [],
    },
  };
}

export default async function ItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ delay?: string }>;
}) {
  const user = await auth();
  const awaitedParams = await params;

  const isAdmin = isAdminEmail(user ? user.properties?.id : undefined);

  const WHITELIST: any = [];

  const item = await getEvent(awaitedParams.id);

  if (!item) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Event Not Found</h1>
          <p className="mb-4">The event you&apos;re looking for doesn&apos;t exist or may have passed.</p>
          <a href="/events" className="text-green-400 hover:text-green-300 underline">
            Browse upcoming events
          </a>
        </div>
      </div>
    );
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

  const eventCategory = Array.isArray(item.category)
    ? item.category[0]
    : item.category;

  const eventJsonLd: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: item.title,
    description: item.description?.substring(0, 300).replace(/<[^>]*>/g, ""),
    url: `https://touchgrassdc.com/events/${encodeURIComponent(awaitedParams.id)}`,
  };
  if (item.start_date) eventJsonLd.startDate = item.start_date;
  if (item.end_date) eventJsonLd.endDate = item.end_date;
  if (item.image_url) eventJsonLd.image = resolveImageUrl(item.image_url);
  if (item.location) {
    eventJsonLd.location = {
      "@type": "Place",
      name: item.venue || item.location,
      address: item.location,
    };
  }
  if (item.cost) {
    eventJsonLd.offers = {
      "@type": "Offer",
      price: item.cost.type === "free" ? "0" : String(item.cost.amount),
      priceCurrency: item.cost.currency || "USD",
      availability: "https://schema.org/InStock",
    };
  }
  eventJsonLd.organizer = {
    "@type": "Organization",
    name: "TouchGrass DC",
    url: "https://touchgrassdc.com",
  };

  return (
    <DetailPageContainer>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }}
      />
      <EventPageTracker eventId={item.pk} category={eventCategory} />
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
          <div className="flex gap-2 flex-wrap">
            <ShareButton
              title={item.title}
              text={`Check out ${item.title} on TouchGrass DC`}
              url={`https://touchgrassdc.com/events/${encodeURIComponent(awaitedParams.id)}`}
            />
            <ReportWrongInfoButton eventTitle={item.title} eventId={item.pk} />
          </div>
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
      {(item.coordinates || (item.location && !item.location.toLowerCase().includes("unknown"))) && (
        <EventMap
          coordinates={item.coordinates}
          address={item.location}
          eventTitle={item.title}
          className="mb-4"
        />
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

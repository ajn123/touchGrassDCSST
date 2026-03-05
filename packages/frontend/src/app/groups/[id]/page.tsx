import { auth } from "@/app/actions";
import { AdminEntityPanel } from "@/components/AdminEntityPanel";
import DetailPageContainer from "@/components/DetailPageContainer";
import { EntityDetail } from "@/components/EntityDetail";
import {
  getGroup,
  getGroupSchedules,
  GroupSchedule,
  transformSchedulesForDisplay,
} from "@/lib/dynamodb/dynamodb-groups";
import { ShareButton } from "@/components/ShareButton";
import { isAdminEmail } from "@/lib/admin-utils";
import { resolveImageUrl } from "@/lib/image-utils";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const awaitedParams = await params;
  const groupTitle = decodeURIComponent(awaitedParams.id);
  const group = await getGroup(groupTitle);

  if (!group) {
    return { title: "Group Not Found" };
  }

  const categories = Array.isArray(group.category)
    ? group.category.join(", ")
    : group.category || "";
  const description = group.description
    ? group.description.substring(0, 160).replace(/<[^>]*>/g, "")
    : `${group.title} — a community group in the DC area. ${categories}`;

  const imageUrl = resolveImageUrl(
    group.image_url,
    Array.isArray(group.category) ? group.category[0] : group.category,
    group.title,
  );

  return {
    title: group.title,
    description,
    openGraph: {
      title: group.title,
      description,
      url: `https://touchgrassdc.com/groups/${encodeURIComponent(group.title)}`,
      siteName: "TouchGrass DC",
      images: imageUrl && !imageUrl.startsWith("data:") ? [{ url: imageUrl }] : [],
    },
    twitter: {
      card: "summary",
      title: group.title,
      description,
    },
  };
}

export default async function GroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await auth();
  const awaitedParams = await params;

  const isAdmin = isAdminEmail(user ? user.properties?.id : undefined);

  const groupTitle = decodeURIComponent(awaitedParams.id);
  const group = await getGroup(groupTitle);

  // Fetch schedules for this group
  let groupSchedules: GroupSchedule[] = [];
  let transformedSchedules: any[] = [];

  try {
    groupSchedules = await getGroupSchedules(groupTitle);
    transformedSchedules = await transformSchedulesForDisplay(groupSchedules);
  } catch (error) {
    console.error("Error fetching group schedules:", error);
    // Continue without schedules if there's an error
  }

  // Fallback: if no schedules found in DynamoDB, check if group has schedules in the original format
  if (transformedSchedules.length === 0 && group && group.schedules) {
    console.log("🔍 Using fallback schedules from group data");
    transformedSchedules = group.schedules;
  }

  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Group Not Found</h1>
          <p className="mb-4">The group you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  // Check if group is public - if not, only admins can see it
  if (!group.isPublic && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Group Not Available</h1>
          <p className="mb-4">
            This group is currently private and not available for public
            viewing.
          </p>
          <p className="text-sm">
            Please check back later or contact an administrator if you believe
            this is an error.
          </p>
        </div>
      </div>
    );
  }

  const groupJsonLd: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: group.title,
    description: group.description?.substring(0, 300).replace(/<[^>]*>/g, ""),
    url: `https://touchgrassdc.com/groups/${encodeURIComponent(group.title)}`,
  };
  if (group.location) {
    groupJsonLd.address = {
      "@type": "PostalAddress",
      addressLocality: group.location,
      addressRegion: "DC",
    };
  }
  if (group.socials?.website) groupJsonLd.sameAs = [group.socials.website];

  return (
    <DetailPageContainer>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(groupJsonLd) }}
      />
      {/* Admin Mode - Show all group details */}
      {isAdmin && (
        <AdminEntityPanel
          kind="group"
          id={group.pk || group.title}
          title={group.title}
          data={group}
        />
      )}

      {/* Public View - Enhanced display */}
      <EntityDetail
        title={group.title}
        rightActionNode={
          <ShareButton
            title={group.title}
            text={`Check out ${group.title} on TouchGrass DC`}
            url={`https://touchgrassdc.com/groups/${encodeURIComponent(group.title)}`}
          />
        }
        imageUrl={resolveImageUrl(
          group.image_url,
          Array.isArray(group.category) ? group.category[0] : group.category,
          group.title,
        ) || undefined}
        cost={group.cost}
        socials={group.socials}
        location={group.location}
        categories={group.category}
        schedules={transformedSchedules}
        description={group.description}
      />
    </DetailPageContainer>
  );
}

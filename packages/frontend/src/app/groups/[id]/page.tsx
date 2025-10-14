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
import { resolveImageUrl } from "@/lib/image-utils";

export default async function GroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
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

  console.log("🔍 Group ID:", decodeURIComponent(awaitedParams.id));
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

  console.log("🔍 Group:", group);
  console.log("🔍 Schedules:", groupSchedules);
  console.log("🔍 Transformed Schedules:", transformedSchedules);

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

  return (
    <DetailPageContainer>
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
        imageUrl={resolveImageUrl(group.image_url) || undefined}
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

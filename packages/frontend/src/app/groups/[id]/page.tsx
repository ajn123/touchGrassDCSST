import { auth } from "@/app/actions";
import Categories from "@/components/Categories";
import { Cost } from "@/components/Cost";
import { Description } from "@/components/Description";
import { LoadingImage } from "@/components/LoadingImage";
import { Location } from "@/components/Location";
import { Schedule } from "@/components/Schedule";
import { Socials } from "@/components/Socials";
import {
  getGroup,
  getGroupSchedules,
  GroupSchedule,
  transformSchedulesForDisplay,
} from "@/lib/dynamodb-groups";
import { resolveImageUrl } from "@/lib/image-utils";
import { Suspense } from "react";

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Group Not Found
          </h1>
          <p className="text-gray-600 mb-4">
            The group you're looking for doesn't exist.
          </p>
        </div>
      </div>
    );
  }

  // Check if group is public - if not, only admins can see it
  if (!group.isPublic && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Group Not Available
          </h1>
          <p className="text-gray-600 mb-4">
            This group is currently private and not available for public
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
      {/* Admin Mode - Show all group details */}
      {isAdmin && (
        <div className="mb-8 p-4 bg-gray-50 rounded-lg border">
          <h2 className="text-xl font-bold mb-4 text-gray-800">
            Admin View - Complete Group Details
          </h2>
          <div className="space-y-2 text-sm">
            <div>
              <strong>Title:</strong> {group.title}
            </div>
            <div>
              <strong>Public:</strong> {group.isPublic ? "Yes" : "No"}
            </div>
            <div>
              <strong>Categories:</strong>
              {group.category ? (
                <Categories
                  displayMode="display"
                  eventCategories={group.category}
                />
              ) : (
                "Uncategorized"
              )}
              <Socials socials={group.socials || {}} />
              {transformedSchedules.length > 0 ? (
                <Schedule schedules={transformedSchedules} />
              ) : (
                <div className="mt-2 p-3 bg-gray-100 rounded border">
                  <div className="text-sm text-gray-600">
                    No scheduled meetings available at this time.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Public View - Enhanced display */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">{group.title}</h1>
        </div>

        {/* Image and Details Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Image Section */}
          <Suspense fallback={<LoadingImage size="lg" />}>
            {group.image_url ? (
              <img
                src={
                  resolveImageUrl(group.image_url) || "/images/placeholder.jpg"
                }
                alt={group.title}
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
              {group.cost && <Cost cost={group.cost} />}
              {group.socials && <Socials socials={group.socials} />}
              {group.location && <Location location={group.location} />}
              {group.category && (
                <Categories
                  displayMode="display"
                  eventCategories={group.category}
                />
              )}
              {transformedSchedules.length > 0 ? (
                <Schedule schedules={transformedSchedules} />
              ) : (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-sm text-gray-600">
                    No scheduled meetings available at this time.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <hr className="my-6 border-t border-gray-800" />

        {group.description && (
          <div className="mb-6">
            <Description description={group.description} />
          </div>
        )}
      </div>
    </div>
  );
}

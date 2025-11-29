import { getPublicGroups } from "@/lib/dynamodb/dynamodb-groups";
import Link from "next/link";
import FeaturedGroup from "./FeaturedGroup";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function FeaturedGroups() {
  try {
    const allGroups = await getPublicGroups();
    // Get 5 random groups
    const shuffled = allGroups.sort(() => 0.5 - Math.random());
    const featuredGroups = shuffled.slice(0, 5);

    if (featuredGroups.length === 0) {
      return null;
    }

    return (
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-4xl font-bold ">Featured Groups</h2>
          <Link
            href="/groups"
            className="bg-white text-gray-900 px-6 py-3 rounded-lg font-semibold theme-hover-light transition-colors border border-black"
          >
            Show All Groups
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {featuredGroups.length > 0 &&
            featuredGroups.map((group: any) => (
              <FeaturedGroup key={group.pk} group={group} />
            ))}
          {featuredGroups.length === 0 && (
            <div className="text-center text-white">
              No featured groups found
            </div>
          )}
        </div>
      </section>
    );
  } catch (error) {
    console.error("Error fetching featured groups:", error);
    return null;
  }
}

import { getPublicGroups } from "@/lib/dynamodb-groups";
import FeaturedGroup from "./FeaturedGroup";

export default async function FeaturedGroups() {
  try {
    const allGroups = await getPublicGroups();

    console.log("🔍 FeaturedGroups: All groups:", allGroups);

    // Get 5 random groups
    const shuffled = allGroups.sort(() => 0.5 - Math.random());
    const featuredGroups = shuffled.slice(0, 5);

    if (featuredGroups.length === 0) {
      return null;
    }

    return (
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-4xl font-bold mb-8 text-center text-white">
          Featured Groups
        </h2>
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
